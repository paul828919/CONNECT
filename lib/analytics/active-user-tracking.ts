/**
 * Active User Tracking Service (PIPA-Compliant)
 *
 * Tracks logged-in users (via NextAuth session tokens) for platform analytics.
 *
 * Architecture:
 * - Redis Set for real-time deduplication (daily session tokens)
 * - PostgreSQL for permanent aggregated statistics (daily counts)
 * - Cron job aggregates Redis → PostgreSQL hourly
 *
 * Privacy:
 * - Only tracks logged-in users (already consented via NextAuth)
 * - Stores only aggregated daily counts (no individual user tracking)
 * - Redis keys auto-expire after 25 hours
 *
 * Performance:
 * - Non-blocking: Silent fail pattern (doesn't affect user requests)
 * - Efficient: Redis Set for automatic deduplication
 * - Scalable: O(1) operations for tracking, hourly aggregation
 */

import { createClient } from 'redis';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Redis client singleton for tracking
let trackingClient: ReturnType<typeof createClient> | null = null;

/**
 * Get Redis tracking client (singleton)
 */
async function getTrackingClient() {
  if (!trackingClient) {
    trackingClient = createClient({
      url: process.env.REDIS_CACHE_URL || 'redis://localhost:6379',
    });

    trackingClient.on('error', (err) => {
      console.error('[TRACKING] Redis connection error:', err.message);
    });

    trackingClient.on('connect', () => {
      console.log('[TRACKING] Redis connected successfully');
    });

    // Connection timeout to prevent indefinite hangs
    const CONNECTION_TIMEOUT = 5000; // 5 seconds
    const connectPromise = trackingClient.connect();
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Redis connection timeout after 5s')), CONNECTION_TIMEOUT)
    );

    try {
      await Promise.race([connectPromise, timeoutPromise]);
    } catch (error) {
      console.error('[TRACKING] Failed to connect to Redis:', error instanceof Error ? error.message : error);
      // Clean up failed client
      trackingClient = null;
      throw error;
    }
  }

  return trackingClient;
}

/**
 * Track active user page view (called from middleware)
 *
 * @param sessionToken - NextAuth session token from cookie
 *
 * Design:
 * - Redis Set automatically deduplicates session tokens per day
 * - Increments total page views counter
 * - Silent fail: Returns immediately on error (doesn't block user requests)
 *
 * @example
 * // In middleware.ts
 * trackActiveUser(sessionToken).catch(console.error);
 */
export async function trackActiveUser(sessionToken: string): Promise<void> {
  try {
    if (!sessionToken) {
      return; // Skip if no session token (shouldn't happen in protected routes)
    }

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const activeUsersKey = `active_users:${today}`;
    const pageViewsKey = `page_views:${today}`;

    const redis = await getTrackingClient();

    // Add session token to Set (automatic deduplication)
    // Multiple page views by same user = counted once
    await redis.sAdd(activeUsersKey, sessionToken);

    // Increment total page views counter
    await redis.incr(pageViewsKey);

    // Set 25-hour TTL (ensures data survives until cron runs next day)
    const TTL_SECONDS = 25 * 60 * 60; // 25 hours
    await redis.expire(activeUsersKey, TTL_SECONDS);
    await redis.expire(pageViewsKey, TTL_SECONDS);

    // Silent success (no console.log to avoid spam)
  } catch (error) {
    // Silent fail: Log error but don't throw (mustn't block user requests)
    console.error('[TRACKING] Failed to track active user:', error instanceof Error ? error.message : error);
  }
}

/**
 * Aggregation result interface
 */
export interface TrackingResult {
  date: string;
  uniqueUsers: number;
  totalPageViews: number;
  success: boolean;
  error?: string;
}

/**
 * Aggregate active user statistics from Redis to PostgreSQL
 *
 * Called by cron job hourly at :05
 *
 * Process:
 * 1. Get yesterday's data from Redis (avoid race conditions with today's tracking)
 * 2. Count unique users from Set
 * 3. Get total page views from counter
 * 4. Upsert to PostgreSQL active_user_stats table
 * 5. Redis keys expire automatically after 25 hours
 *
 * @returns Aggregation result with counts
 *
 * @example
 * // Cron job endpoint
 * const result = await aggregateActiveUserStats();
 */
export async function aggregateActiveUserStats(): Promise<TrackingResult> {
  try {
    // Use yesterday's date to avoid race conditions with ongoing tracking
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0]; // YYYY-MM-DD

    const activeUsersKey = `active_users:${dateStr}`;
    const pageViewsKey = `page_views:${dateStr}`;

    const redis = await getTrackingClient();

    // Get unique user count from Set
    const uniqueUsers = await redis.sCard(activeUsersKey);

    // Get total page views from counter
    const pageViewsStr = await redis.get(pageViewsKey);
    const totalPageViews = pageViewsStr ? parseInt(pageViewsStr, 10) : 0;

    console.log(`[TRACKING] Aggregating ${dateStr}: ${uniqueUsers} unique users, ${totalPageViews} page views`);

    // Upsert to PostgreSQL (update if exists, create if not)
    await prisma.active_user_stats.upsert({
      where: { date: yesterday },
      update: {
        uniqueUsers,
        totalPageViews,
        updatedAt: new Date(),
      },
      create: {
        date: yesterday,
        uniqueUsers,
        totalPageViews,
      },
    });

    console.log(`[TRACKING] ✓ Aggregated ${dateStr} to PostgreSQL`);

    return {
      date: dateStr,
      uniqueUsers,
      totalPageViews,
      success: true,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[TRACKING] Aggregation failed:', errorMsg);

    return {
      date: new Date().toISOString().split('T')[0],
      uniqueUsers: 0,
      totalPageViews: 0,
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * Get active user statistics for a date range
 *
 * @param startDate - Start date (inclusive)
 * @param endDate - End date (inclusive)
 * @returns Array of daily active user stats
 *
 * @example
 * const stats = await getActiveUserStats(
 *   new Date('2025-01-01'),
 *   new Date('2025-01-31')
 * );
 */
export async function getActiveUserStats(
  startDate: Date,
  endDate: Date
): Promise<Array<{
  date: Date;
  uniqueUsers: number;
  totalPageViews: number;
}>> {
  try {
    const stats = await prisma.active_user_stats.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        date: 'asc',
      },
      select: {
        date: true,
        uniqueUsers: true,
        totalPageViews: true,
      },
    });

    return stats;
  } catch (error) {
    console.error('[TRACKING] Failed to get stats:', error instanceof Error ? error.message : error);
    return [];
  }
}

/**
 * Graceful shutdown - close Redis connection
 */
export async function closeTrackingConnection(): Promise<void> {
  if (trackingClient) {
    try {
      await trackingClient.quit();
      console.log('[TRACKING] Redis connection closed');
    } catch (error) {
      console.error('[TRACKING] Error closing connection:', error instanceof Error ? error.message : error);
    }
    trackingClient = null;
  }
}
