/**
 * Server-Side Event Logger for Recommendation Personalization
 *
 * Handles event persistence with Redis counters + Prisma createMany.
 * Uses proven patterns from active-user-tracking.ts and match-performance.ts.
 *
 * Design decisions (from ChatGPT review):
 * - Redis: Track session counts for rate limiting (O(1), no DB reads)
 * - Prisma createMany with skipDuplicates: Idempotent inserts
 * - eventId unique constraint: Prevents duplicate events from retries
 * - Silent fail: Never break user requests for analytics
 *
 * @module lib/personalization/event-logger
 */

import { createClient } from 'redis';
import { db } from '@/lib/db';
import { RecommendationEventType, Prisma } from '@prisma/client';

// ============================================================================
// Types
// ============================================================================

export interface RecommendationEventInput {
  eventId: string;         // Client-generated UUID (idempotency key)
  organizationId: string;
  programId: string;
  userId?: string;
  sessionId: string;
  eventType: RecommendationEventType;
  position: number;
  listSize: number;
  matchScore: number;
  dwellTimeMs?: number;
  visibilityRatio?: number;
  scrollDepth?: number;
  source?: string;
  deviceType?: string;
  occurredAt: string;      // ISO8601 UTC string
  clientTzOffsetMin?: number;
  batchId?: string;
}

export interface LogEventsResult {
  success: boolean;
  logged: number;
  skipped: number;
  error?: string;
}

// ============================================================================
// Redis Client (Singleton)
// ============================================================================

let eventLoggerClient: ReturnType<typeof createClient> | null = null;

async function getRedisClient() {
  if (!eventLoggerClient) {
    eventLoggerClient = createClient({
      url: process.env.REDIS_CACHE_URL || 'redis://localhost:6379',
    });

    eventLoggerClient.on('error', (err) => {
      console.error('[EVENT_LOGGER] Redis connection error:', err.message);
    });

    eventLoggerClient.on('connect', () => {
      console.log('[EVENT_LOGGER] Redis connected successfully');
    });

    // Connection timeout
    const connectPromise = eventLoggerClient.connect();
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Redis connection timeout')), 5000)
    );

    try {
      await Promise.race([connectPromise, timeoutPromise]);
    } catch (error) {
      console.error('[EVENT_LOGGER] Failed to connect to Redis:', error);
      eventLoggerClient = null;
      throw error;
    }
  }

  if (!eventLoggerClient.isOpen) {
    await eventLoggerClient.connect();
  }

  return eventLoggerClient;
}

// ============================================================================
// Rate Limiting Constants
// ============================================================================

const RATE_LIMITS = {
  // Session-level limits
  maxImpressionsPerSession: 100,   // Server-side limit (client is 30)
  maxEventsPerSession: 500,        // Total events per session

  // Time windows
  sessionTTL: 25 * 60 * 60,        // 25 hours (matches active-user-tracking)

  // Important event types (never rate limit these)
  importantTypes: ['CLICK', 'SAVE', 'UNSAVE', 'DISMISS', 'HIDE', 'VIEW'] as RecommendationEventType[],
} as const;

// ============================================================================
// Main Event Logging Function
// ============================================================================

/**
 * Log recommendation events to database
 *
 * Uses Redis counter + Prisma createMany with skipDuplicates pattern.
 * This is the proven approach from match-performance.ts.
 *
 * @param events - Array of events to log
 * @returns Result with counts of logged/skipped events
 *
 * @example
 * ```ts
 * const result = await logRecommendationEvents([
 *   { eventId: 'uuid', organizationId: '...', ... }
 * ]);
 * // { success: true, logged: 10, skipped: 2 }
 * ```
 */
export async function logRecommendationEvents(
  events: RecommendationEventInput[]
): Promise<LogEventsResult> {
  if (events.length === 0) {
    return { success: true, logged: 0, skipped: 0 };
  }

  try {
    // 1. Redis: Track session counts for rate limiting (O(1), no DB reads)
    const sessionId = events[0].sessionId;
    const filteredEvents = await filterByRateLimit(events, sessionId);

    if (filteredEvents.length === 0) {
      return { success: true, logged: 0, skipped: events.length };
    }

    // 2. DB: Prisma createMany with skipDuplicates (proven pattern)
    // Prisma handles column mapping automatically (camelCase → snake_case if needed)
    // skipDuplicates → PostgreSQL ON CONFLICT DO NOTHING
    const result = await db.recommendation_events.createMany({
      data: filteredEvents.map(e => ({
        schemaVersion: 1,
        eventId: e.eventId,
        organizationId: e.organizationId,
        programId: e.programId,
        userId: e.userId,
        sessionId: e.sessionId,
        eventType: e.eventType,
        position: e.position,
        listSize: e.listSize,
        matchScore: e.matchScore,
        dwellTimeMs: e.dwellTimeMs,
        visibilityRatio: e.visibilityRatio,
        scrollDepth: e.scrollDepth,
        source: e.source,
        deviceType: e.deviceType,
        occurredAt: new Date(e.occurredAt),
        clientTzOffsetMin: e.clientTzOffsetMin,
        batchId: e.batchId,
      })),
      skipDuplicates: true, // Idempotent: ON CONFLICT DO NOTHING
    });

    const logged = result.count;
    const skipped = events.length - logged;

    console.log(`[EVENT_LOGGER] Logged ${logged} events, skipped ${skipped} (session: ${sessionId.slice(0, 8)})`);

    return { success: true, logged, skipped };
  } catch (error) {
    // Silent fail pattern (like match-performance.ts)
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[EVENT_LOGGER] Failed to log events:', errorMsg);

    return {
      success: false,
      logged: 0,
      skipped: events.length,
      error: errorMsg,
    };
  }
}

// ============================================================================
// Rate Limiting (Redis-based)
// ============================================================================

/**
 * Filter events by rate limit using Redis counters
 *
 * - Important events (CLICK, SAVE, etc.) are never rate limited
 * - IMPRESSION events are limited per session
 * - Returns events that pass rate limiting
 */
async function filterByRateLimit(
  events: RecommendationEventInput[],
  sessionId: string
): Promise<RecommendationEventInput[]> {
  try {
    const redis = await getRedisClient();

    // Redis keys
    const impressionKey = `rec_impressions:session:${sessionId}`;
    const totalKey = `rec_events:session:${sessionId}`;

    // Get current counts
    const [impressionCount, totalCount] = await Promise.all([
      redis.get(impressionKey).then(v => parseInt(v || '0', 10)),
      redis.get(totalKey).then(v => parseInt(v || '0', 10)),
    ]);

    // Check total events limit
    if (totalCount >= RATE_LIMITS.maxEventsPerSession) {
      console.warn(`[EVENT_LOGGER] Session ${sessionId.slice(0, 8)} hit total event limit (${totalCount})`);
      // Still allow important events
      return events.filter(e => RATE_LIMITS.importantTypes.includes(e.eventType));
    }

    // Separate important vs impression events
    const important: RecommendationEventInput[] = [];
    const impressions: RecommendationEventInput[] = [];

    for (const event of events) {
      if (RATE_LIMITS.importantTypes.includes(event.eventType)) {
        important.push(event);
      } else {
        impressions.push(event);
      }
    }

    // Apply impression limit
    const remainingImpressionSlots = Math.max(
      0,
      RATE_LIMITS.maxImpressionsPerSession - impressionCount
    );
    const allowedImpressions = impressions.slice(0, remainingImpressionSlots);

    // Update Redis counters
    const pipeline = redis.multi();

    if (allowedImpressions.length > 0) {
      pipeline.incrBy(impressionKey, allowedImpressions.length);
      pipeline.expire(impressionKey, RATE_LIMITS.sessionTTL);
    }

    const totalAllowed = important.length + allowedImpressions.length;
    if (totalAllowed > 0) {
      pipeline.incrBy(totalKey, totalAllowed);
      pipeline.expire(totalKey, RATE_LIMITS.sessionTTL);
    }

    await pipeline.exec();

    return [...important, ...allowedImpressions];
  } catch (error) {
    // Redis failure: Allow all events (fail open)
    console.warn('[EVENT_LOGGER] Redis rate limit check failed, allowing all events:', error);
    return events;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get event count for a session (for debugging/monitoring)
 */
export async function getSessionEventCount(sessionId: string): Promise<{
  impressions: number;
  total: number;
}> {
  try {
    const redis = await getRedisClient();

    const [impressions, total] = await Promise.all([
      redis.get(`rec_impressions:session:${sessionId}`).then(v => parseInt(v || '0', 10)),
      redis.get(`rec_events:session:${sessionId}`).then(v => parseInt(v || '0', 10)),
    ]);

    return { impressions, total };
  } catch (error) {
    console.error('[EVENT_LOGGER] Failed to get session counts:', error);
    return { impressions: 0, total: 0 };
  }
}

/**
 * Validate event input (basic validation)
 */
export function validateEventInput(event: Partial<RecommendationEventInput>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!event.eventId) errors.push('eventId is required');
  if (!event.organizationId) errors.push('organizationId is required');
  if (!event.programId) errors.push('programId is required');
  if (!event.sessionId) errors.push('sessionId is required');
  if (!event.eventType) errors.push('eventType is required');
  if (typeof event.position !== 'number') errors.push('position must be a number');
  if (typeof event.listSize !== 'number') errors.push('listSize must be a number');
  if (typeof event.matchScore !== 'number') errors.push('matchScore must be a number');
  if (!event.occurredAt) errors.push('occurredAt is required');

  // Validate eventType enum
  const validTypes: RecommendationEventType[] = [
    'IMPRESSION', 'VIEW', 'CLICK', 'SAVE', 'UNSAVE', 'DISMISS', 'HIDE'
  ];
  if (event.eventType && !validTypes.includes(event.eventType as RecommendationEventType)) {
    errors.push(`eventType must be one of: ${validTypes.join(', ')}`);
  }

  // Validate ranges
  if (event.position !== undefined && (event.position < 0 || event.position > 1000)) {
    errors.push('position must be between 0 and 1000');
  }
  if (event.listSize !== undefined && (event.listSize < 0 || event.listSize > 1000)) {
    errors.push('listSize must be between 0 and 1000');
  }
  if (event.matchScore !== undefined && (event.matchScore < 0 || event.matchScore > 100)) {
    errors.push('matchScore must be between 0 and 100');
  }
  if (event.visibilityRatio !== undefined && (event.visibilityRatio < 0 || event.visibilityRatio > 1)) {
    errors.push('visibilityRatio must be between 0 and 1');
  }
  if (event.scrollDepth !== undefined && (event.scrollDepth < 0 || event.scrollDepth > 1)) {
    errors.push('scrollDepth must be between 0 and 1');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Close Redis connection (for graceful shutdown)
 */
export async function closeEventLoggerConnection(): Promise<void> {
  if (eventLoggerClient) {
    try {
      await eventLoggerClient.quit();
      console.log('[EVENT_LOGGER] Redis connection closed');
    } catch (error) {
      console.error('[EVENT_LOGGER] Error closing connection:', error);
    }
    eventLoggerClient = null;
  }
}
