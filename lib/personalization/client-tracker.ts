/**
 * Client-Side Impression Tracker for Recommendation Personalization
 *
 * This module provides client-side throttling to prevent DB read explosion.
 * The primary throttling happens in the browser, reducing server calls significantly.
 *
 * Design decisions (from ChatGPT review):
 * - Client-side throttling: 30 impressions/session max, 30s dedupe per program
 * - No server calls needed for dedupe decisions (handled locally)
 * - Batched event sending: Accumulate events, send in batches
 * - Silent fail: Never break user experience for analytics
 *
 * @module lib/personalization/client-tracker
 */

import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// Types
// ============================================================================

export type RecommendationEventType =
  | 'IMPRESSION'
  | 'VIEW'
  | 'CLICK'
  | 'SAVE'
  | 'UNSAVE'
  | 'DISMISS'
  | 'HIDE';

export interface RecommendationEvent {
  eventId: string;         // Client-generated UUID for idempotency
  organizationId: string;
  programId: string;
  userId?: string;
  sessionId: string;
  eventType: RecommendationEventType;
  position: number;        // 0-indexed position in list
  listSize: number;        // Total items when event occurred
  matchScore: number;      // Algorithm score (0-100)
  dwellTimeMs?: number;    // Time spent viewing
  visibilityRatio?: number; // 0.0-1.0
  scrollDepth?: number;    // Page scroll depth 0.0-1.0
  source?: string;         // "match_list", "historical", "search"
  deviceType?: string;     // "desktop", "mobile", "tablet"
  occurredAt: string;      // ISO8601 UTC timestamp
  clientTzOffsetMin?: number; // Timezone offset in minutes
  batchId?: string;        // API batch identifier (set by sendBatch)
}

// ============================================================================
// Constants
// ============================================================================

const THROTTLE_CONFIG = {
  maxImpressionsPerSession: 30,   // Limit impressions per session
  dedupeWindowMs: 30000,          // 30 seconds between same program impressions
  batchSize: 10,                  // Send events in batches of 10
  batchDelayMs: 2000,             // Wait 2s before sending batch
  maxRetries: 3,                  // Retry failed batches
  apiEndpoint: '/api/events/track',
} as const;

// ============================================================================
// ImpressionTracker Class
// ============================================================================

/**
 * Client-side impression tracker with built-in throttling
 *
 * @example
 * ```tsx
 * const tracker = new ImpressionTracker(organizationId, sessionId);
 *
 * // Track impression when card becomes visible
 * if (tracker.shouldLogImpression(programId)) {
 *   tracker.logImpression({ programId, position, listSize, matchScore });
 * }
 *
 * // Track click (always allowed)
 * tracker.logClick({ programId, position, listSize, matchScore });
 * ```
 */
export class ImpressionTracker {
  private sessionImpressions = new Map<string, number>(); // programId → timestamp
  private sessionCount = 0;
  private pendingEvents: RecommendationEvent[] = [];
  private batchTimeout: ReturnType<typeof setTimeout> | null = null;
  private isSending = false;
  private organizationId: string;
  private sessionId: string;
  private userId?: string;

  constructor(organizationId: string, sessionId: string, userId?: string) {
    this.organizationId = organizationId;
    this.sessionId = sessionId;
    this.userId = userId;
  }

  /**
   * Check if an impression should be logged (throttling logic)
   * Call this BEFORE logging to prevent redundant events
   */
  shouldLogImpression(programId: string): boolean {
    // Limit 1: Max impressions per session
    if (this.sessionCount >= THROTTLE_CONFIG.maxImpressionsPerSession) {
      return false;
    }

    // Limit 2: Same program dedupe within 30 seconds
    const lastSeen = this.sessionImpressions.get(programId);
    if (lastSeen && Date.now() - lastSeen < THROTTLE_CONFIG.dedupeWindowMs) {
      return false;
    }

    return true;
  }

  /**
   * Log an impression event (check shouldLogImpression first)
   */
  logImpression(params: {
    programId: string;
    position: number;
    listSize: number;
    matchScore: number;
    source?: string;
    visibilityRatio?: number;
  }): void {
    const { programId, position, listSize, matchScore, source, visibilityRatio } = params;

    // Double-check throttling (in case caller forgot)
    if (!this.shouldLogImpression(programId)) {
      return;
    }

    // Update tracking state
    this.sessionImpressions.set(programId, Date.now());
    this.sessionCount++;

    // Create event
    this.queueEvent({
      eventType: 'IMPRESSION',
      programId,
      position,
      listSize,
      matchScore,
      source,
      visibilityRatio,
    });
  }

  /**
   * Log a high-confidence view event
   * Called when visibility + dwell time thresholds are met
   */
  logView(params: {
    programId: string;
    position: number;
    listSize: number;
    matchScore: number;
    dwellTimeMs: number;
    visibilityRatio: number;
    scrollDepth?: number;
    source?: string;
  }): void {
    this.queueEvent({
      eventType: 'VIEW',
      ...params,
    });
  }

  /**
   * Log a click event (always allowed, no throttling)
   */
  logClick(params: {
    programId: string;
    position: number;
    listSize: number;
    matchScore: number;
    source?: string;
  }): void {
    this.queueEvent({
      eventType: 'CLICK',
      ...params,
    });
  }

  /**
   * Log a save/bookmark event
   */
  logSave(params: {
    programId: string;
    position: number;
    listSize: number;
    matchScore: number;
    source?: string;
  }): void {
    this.queueEvent({
      eventType: 'SAVE',
      ...params,
    });
  }

  /**
   * Log an unsave event
   */
  logUnsave(params: {
    programId: string;
    position: number;
    listSize: number;
    matchScore: number;
    source?: string;
  }): void {
    this.queueEvent({
      eventType: 'UNSAVE',
      ...params,
    });
  }

  /**
   * Log a dismiss event (user explicitly dismissed)
   */
  logDismiss(params: {
    programId: string;
    position: number;
    listSize: number;
    matchScore: number;
    source?: string;
  }): void {
    this.queueEvent({
      eventType: 'DISMISS',
      ...params,
    });
  }

  /**
   * Log a hide event ("don't show again")
   */
  logHide(params: {
    programId: string;
    position: number;
    listSize: number;
    matchScore: number;
    source?: string;
  }): void {
    this.queueEvent({
      eventType: 'HIDE',
      ...params,
    });
  }

  /**
   * Force flush pending events (call on page unload)
   */
  async flush(): Promise<void> {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    if (this.pendingEvents.length > 0) {
      await this.sendBatch();
    }
  }

  /**
   * Get current session statistics
   */
  getStats(): { impressionCount: number; uniquePrograms: number } {
    return {
      impressionCount: this.sessionCount,
      uniquePrograms: this.sessionImpressions.size,
    };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private queueEvent(params: {
    eventType: RecommendationEventType;
    programId: string;
    position: number;
    listSize: number;
    matchScore: number;
    dwellTimeMs?: number;
    visibilityRatio?: number;
    scrollDepth?: number;
    source?: string;
  }): void {
    const now = new Date();

    const event: RecommendationEvent = {
      eventId: uuidv4(),
      organizationId: this.organizationId,
      programId: params.programId,
      userId: this.userId,
      sessionId: this.sessionId,
      eventType: params.eventType,
      position: params.position,
      listSize: params.listSize,
      matchScore: params.matchScore,
      dwellTimeMs: params.dwellTimeMs,
      visibilityRatio: params.visibilityRatio,
      scrollDepth: params.scrollDepth,
      source: params.source,
      deviceType: this.detectDeviceType(),
      occurredAt: now.toISOString(),
      clientTzOffsetMin: now.getTimezoneOffset(),
    };

    this.pendingEvents.push(event);

    // Schedule batch send
    this.scheduleBatchSend();
  }

  private scheduleBatchSend(): void {
    // Clear existing timeout
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }

    // Check if we have enough events for immediate send
    if (this.pendingEvents.length >= THROTTLE_CONFIG.batchSize) {
      this.sendBatch();
      return;
    }

    // Schedule delayed send
    this.batchTimeout = setTimeout(() => {
      this.sendBatch();
    }, THROTTLE_CONFIG.batchDelayMs);
  }

  private async sendBatch(retryCount = 0): Promise<void> {
    if (this.isSending || this.pendingEvents.length === 0) {
      return;
    }

    this.isSending = true;

    // Extract batch to send
    const batch = this.pendingEvents.splice(0, THROTTLE_CONFIG.batchSize);
    const batchId = uuidv4();

    // Add batchId to all events
    batch.forEach(event => {
      event.batchId = batchId;
    });

    try {
      // Use sendBeacon for reliability (works during page unload)
      const useBeacon = typeof navigator !== 'undefined' && navigator.sendBeacon;

      if (useBeacon && document.visibilityState === 'hidden') {
        // Page is being unloaded, use sendBeacon
        const blob = new Blob([JSON.stringify({ events: batch })], {
          type: 'application/json',
        });
        navigator.sendBeacon(THROTTLE_CONFIG.apiEndpoint, blob);
      } else {
        // Normal fetch request
        const response = await fetch(THROTTLE_CONFIG.apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ events: batch }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
      }

      // Success - events sent
      console.debug(`[TRACKER] Sent ${batch.length} events (batch: ${batchId.slice(0, 8)})`);
    } catch (error) {
      // Retry logic
      if (retryCount < THROTTLE_CONFIG.maxRetries) {
        console.warn(`[TRACKER] Retry ${retryCount + 1}/${THROTTLE_CONFIG.maxRetries}`, error);
        // Put events back at the front of the queue
        this.pendingEvents.unshift(...batch);
        // Exponential backoff
        setTimeout(() => {
          this.isSending = false;
          this.sendBatch(retryCount + 1);
        }, Math.pow(2, retryCount) * 1000);
        return;
      }

      // Give up after max retries (silent fail - don't break UX)
      console.error(`[TRACKER] Failed to send events after ${THROTTLE_CONFIG.maxRetries} retries`, error);
    } finally {
      this.isSending = false;
    }

    // Continue sending if more events pending
    if (this.pendingEvents.length > 0) {
      this.scheduleBatchSend();
    }
  }

  private detectDeviceType(): string {
    if (typeof window === 'undefined') return 'unknown';

    const ua = navigator.userAgent;
    if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
    if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return 'mobile';
    return 'desktop';
  }
}

// ============================================================================
// Singleton Instance (for convenience)
// ============================================================================

let trackerInstance: ImpressionTracker | null = null;

/**
 * Get or create the global tracker instance
 * Call this once when the user session is established
 */
export function getTracker(
  organizationId: string,
  sessionId: string,
  userId?: string
): ImpressionTracker {
  if (!trackerInstance || trackerInstance['organizationId'] !== organizationId) {
    trackerInstance = new ImpressionTracker(organizationId, sessionId, userId);
  }
  return trackerInstance;
}

/**
 * Reset the tracker (for testing or session change)
 */
export function resetTracker(): void {
  if (trackerInstance) {
    trackerInstance.flush();
    trackerInstance = null;
  }
}
