/**
 * View Tracker with IntersectionObserver
 *
 * Tracks high-confidence views using IntersectionObserver API.
 * A "view" requires both visibility and dwell time thresholds.
 *
 * Design decisions:
 * - 60% visibility threshold (significant portion visible)
 * - 800ms minimum dwell time (not just scrolling past)
 * - 5 minute cap (prevents tab-left-open inflation)
 * - 30s dedupe window (same card = 1 view per 30s)
 *
 * @module lib/personalization/view-tracker
 */

import { ImpressionTracker } from './client-tracker';

// ============================================================================
// Types
// ============================================================================

export interface ViewThresholds {
  minVisibilityRatio: number;  // Minimum percentage visible (0.0-1.0)
  minDwellTimeMs: number;      // Minimum time in viewport (ms)
  maxDwellTimeMs: number;      // Cap for dwell time (ms)
  dedupeWindowMs: number;      // Same card = 1 view per window
}

export interface MatchCardData {
  programId: string;
  matchId: string;
  position: number;
  matchScore: number;
  source: string;
}

interface TrackedElement {
  element: HTMLElement;
  data: MatchCardData;
  enteredAt: number | null;
  hasLoggedView: boolean;
  lastViewAt: number;
}

// ============================================================================
// Constants
// ============================================================================

export const VIEW_THRESHOLDS: ViewThresholds = {
  minVisibilityRatio: 0.6,    // 60%+ of card visible
  minDwellTimeMs: 800,        // 800ms minimum
  maxDwellTimeMs: 300000,     // 5 min cap (tab left open)
  dedupeWindowMs: 30000,      // Same card = 1 view per 30s
};

// ============================================================================
// ViewTracker Class
// ============================================================================

/**
 * Tracks views using IntersectionObserver + dwell time
 *
 * @example
 * ```tsx
 * const viewTracker = new ViewTracker(impressionTracker, listSize);
 *
 * // In MatchCard component
 * useEffect(() => {
 *   const cleanup = viewTracker.observe(cardRef.current, {
 *     programId, matchId, position, matchScore, source: 'match_list'
 *   });
 *   return cleanup;
 * }, []);
 * ```
 */
export class ViewTracker {
  private observer: IntersectionObserver | null = null;
  private trackedElements = new Map<HTMLElement, TrackedElement>();
  private dwellTimers = new Map<HTMLElement, ReturnType<typeof setInterval>>();
  private tracker: ImpressionTracker;
  private listSize: number;
  private thresholds: ViewThresholds;

  constructor(
    tracker: ImpressionTracker,
    listSize: number,
    thresholds: ViewThresholds = VIEW_THRESHOLDS
  ) {
    this.tracker = tracker;
    this.listSize = listSize;
    this.thresholds = thresholds;
    this.initObserver();
  }

  /**
   * Start observing a match card element
   * Returns cleanup function
   */
  observe(element: HTMLElement, data: MatchCardData): () => void {
    if (!this.observer || !element) {
      return () => {};
    }

    // Store tracking data
    this.trackedElements.set(element, {
      element,
      data,
      enteredAt: null,
      hasLoggedView: false,
      lastViewAt: 0,
    });

    // Start observing
    this.observer.observe(element);

    // Return cleanup function
    return () => {
      this.unobserve(element);
    };
  }

  /**
   * Stop observing an element
   */
  unobserve(element: HTMLElement): void {
    if (this.observer) {
      this.observer.unobserve(element);
    }

    // Clear dwell timer
    const timer = this.dwellTimers.get(element);
    if (timer) {
      clearInterval(timer);
      this.dwellTimers.delete(element);
    }

    // Log partial view if element was being tracked
    const tracked = this.trackedElements.get(element);
    if (tracked?.enteredAt && !tracked.hasLoggedView) {
      const dwellTime = Date.now() - tracked.enteredAt;
      this.handlePartialView(tracked, dwellTime);
    }

    this.trackedElements.delete(element);
  }

  /**
   * Update list size (if items are added/removed)
   */
  updateListSize(newSize: number): void {
    this.listSize = newSize;
  }

  /**
   * Cleanup all observers (call on unmount)
   */
  destroy(): void {
    // Clear all timers
    this.dwellTimers.forEach((timer) => clearInterval(timer));
    this.dwellTimers.clear();

    // Disconnect observer
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    this.trackedElements.clear();
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private initObserver(): void {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      console.warn('[VIEW_TRACKER] IntersectionObserver not supported');
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => this.handleIntersection(entry));
      },
      {
        // Trigger callback at multiple thresholds for better tracking
        threshold: [0, 0.25, 0.5, 0.6, 0.75, 1.0],
        // Use viewport as root
        root: null,
        rootMargin: '0px',
      }
    );
  }

  private handleIntersection(entry: IntersectionObserverEntry): void {
    const element = entry.target as HTMLElement;
    const tracked = this.trackedElements.get(element);

    if (!tracked) return;

    const now = Date.now();
    const isVisible = entry.isIntersecting && entry.intersectionRatio >= this.thresholds.minVisibilityRatio;

    if (isVisible && !tracked.enteredAt) {
      // Element just became visible enough
      tracked.enteredAt = now;

      // Log impression (if not already logged recently)
      if (this.tracker.shouldLogImpression(tracked.data.programId)) {
        this.tracker.logImpression({
          programId: tracked.data.programId,
          position: tracked.data.position,
          listSize: this.listSize,
          matchScore: tracked.data.matchScore,
          source: tracked.data.source,
          visibilityRatio: entry.intersectionRatio,
        });
      }

      // Start dwell time tracking
      this.startDwellTimer(element, tracked, entry.intersectionRatio);
    } else if (!isVisible && tracked.enteredAt) {
      // Element left viewport or visibility dropped
      const dwellTime = now - tracked.enteredAt;
      tracked.enteredAt = null;

      // Stop dwell timer
      const timer = this.dwellTimers.get(element);
      if (timer) {
        clearInterval(timer);
        this.dwellTimers.delete(element);
      }

      // Check if this was a qualified view
      if (dwellTime >= this.thresholds.minDwellTimeMs && !tracked.hasLoggedView) {
        this.logQualifiedView(tracked, dwellTime, entry.intersectionRatio);
      }
    }
  }

  private startDwellTimer(
    element: HTMLElement,
    tracked: TrackedElement,
    visibilityRatio: number
  ): void {
    // Clear any existing timer
    const existingTimer = this.dwellTimers.get(element);
    if (existingTimer) {
      clearInterval(existingTimer);
    }

    // Check every 100ms if threshold is met
    const timer = setInterval(() => {
      if (!tracked.enteredAt) {
        clearInterval(timer);
        this.dwellTimers.delete(element);
        return;
      }

      const dwellTime = Date.now() - tracked.enteredAt;

      // Check if qualified view threshold met
      if (
        dwellTime >= this.thresholds.minDwellTimeMs &&
        !tracked.hasLoggedView
      ) {
        this.logQualifiedView(tracked, dwellTime, visibilityRatio);
      }

      // Stop at max dwell time
      if (dwellTime >= this.thresholds.maxDwellTimeMs) {
        clearInterval(timer);
        this.dwellTimers.delete(element);
      }
    }, 100);

    this.dwellTimers.set(element, timer);
  }

  private logQualifiedView(
    tracked: TrackedElement,
    dwellTime: number,
    visibilityRatio: number
  ): void {
    const now = Date.now();

    // Dedupe: Don't log if recently viewed
    if (now - tracked.lastViewAt < this.thresholds.dedupeWindowMs) {
      return;
    }

    // Cap dwell time
    const cappedDwellTime = Math.min(dwellTime, this.thresholds.maxDwellTimeMs);

    // Log the qualified view
    this.tracker.logView({
      programId: tracked.data.programId,
      position: tracked.data.position,
      listSize: this.listSize,
      matchScore: tracked.data.matchScore,
      dwellTimeMs: cappedDwellTime,
      visibilityRatio,
      scrollDepth: this.getScrollDepth(),
      source: tracked.data.source,
    });

    // Mark as logged
    tracked.hasLoggedView = true;
    tracked.lastViewAt = now;

    console.debug(
      `[VIEW_TRACKER] Qualified view: ${tracked.data.programId.slice(0, 8)} ` +
      `(${cappedDwellTime}ms, ${Math.round(visibilityRatio * 100)}% visible)`
    );
  }

  private handlePartialView(tracked: TrackedElement, dwellTime: number): void {
    // Log partial view for analytics (below threshold but still useful)
    // This is just for debugging, not sent to server
    console.debug(
      `[VIEW_TRACKER] Partial view: ${tracked.data.programId.slice(0, 8)} ` +
      `(${dwellTime}ms, below ${this.thresholds.minDwellTimeMs}ms threshold)`
    );
  }

  private getScrollDepth(): number {
    if (typeof window === 'undefined') return 0;

    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = document.documentElement.clientHeight;
    const maxScroll = scrollHeight - clientHeight;

    if (maxScroll <= 0) return 1; // Page fits in viewport

    return Math.min(1, scrollTop / maxScroll);
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if an impression event is a high-confidence view
 */
export function isHighConfidenceView(
  visibilityRatio: number,
  dwellTimeMs: number,
  thresholds: ViewThresholds = VIEW_THRESHOLDS
): boolean {
  return (
    visibilityRatio >= thresholds.minVisibilityRatio &&
    dwellTimeMs >= thresholds.minDwellTimeMs &&
    dwellTimeMs <= thresholds.maxDwellTimeMs
  );
}

/**
 * Create a ViewTracker instance
 * Convenience function for React components
 */
export function createViewTracker(
  tracker: ImpressionTracker,
  listSize: number
): ViewTracker {
  return new ViewTracker(tracker, listSize);
}
