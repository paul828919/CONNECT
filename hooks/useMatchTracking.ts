/**
 * useMatchTracking Hook
 *
 * React hook for integrating personalization event tracking into match lists.
 * Handles impressions, views, clicks, and save/unsave events.
 *
 * @module hooks/useMatchTracking
 */

'use client';

import { useCallback, useEffect, useRef, useMemo } from 'react';
import { ImpressionTracker, getTracker, resetTracker } from '@/lib/personalization/client-tracker';
import { ViewTracker, createViewTracker, MatchCardData } from '@/lib/personalization/view-tracker';
import { getSessionId } from '@/lib/personalization/session-manager';

// ============================================================================
// Types
// ============================================================================

interface UseMatchTrackingProps {
  organizationId: string | undefined;
  userId?: string;
  listSize: number;
  enabled?: boolean; // Allow disabling tracking (e.g., for historical matches)
}

interface UseMatchTrackingReturn {
  /**
   * Create a ref callback to attach to a match card element
   * Returns a cleanup function when the element unmounts
   */
  createCardRef: (data: MatchCardData) => (element: HTMLElement | null) => void;

  /**
   * Log a click event (when user clicks to view announcement)
   */
  logClick: (params: {
    programId: string;
    position: number;
    matchScore: number;
    source?: string;
  }) => void;

  /**
   * Log a save event (when user bookmarks a match)
   */
  logSave: (params: {
    programId: string;
    position: number;
    matchScore: number;
    source?: string;
  }) => void;

  /**
   * Log an unsave event (when user removes bookmark)
   */
  logUnsave: (params: {
    programId: string;
    position: number;
    matchScore: number;
    source?: string;
  }) => void;

  /**
   * Get current tracking stats
   */
  getStats: () => { impressionCount: number; uniquePrograms: number } | null;

  /**
   * Whether tracking is active
   */
  isTracking: boolean;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useMatchTracking({
  organizationId,
  userId,
  listSize,
  enabled = true,
}: UseMatchTrackingProps): UseMatchTrackingReturn {
  const trackerRef = useRef<ImpressionTracker | null>(null);
  const viewTrackerRef = useRef<ViewTracker | null>(null);
  const cleanupFnsRef = useRef<Map<HTMLElement, () => void>>(new Map());

  // Initialize trackers when org/user changes
  useEffect(() => {
    if (!enabled || !organizationId) {
      trackerRef.current = null;
      viewTrackerRef.current = null;
      return;
    }

    const sessionId = getSessionId(organizationId);
    trackerRef.current = getTracker(organizationId, sessionId, userId);
    viewTrackerRef.current = createViewTracker(trackerRef.current, listSize);

    console.debug('[MATCH_TRACKING] Initialized tracking', {
      organizationId: organizationId.slice(0, 8),
      sessionId: sessionId.slice(0, 8),
      listSize,
    });

    // Cleanup on unmount
    return () => {
      if (viewTrackerRef.current) {
        viewTrackerRef.current.destroy();
        viewTrackerRef.current = null;
      }

      // Flush pending events
      if (trackerRef.current) {
        trackerRef.current.flush();
      }

      // Clear cleanup functions
      cleanupFnsRef.current.forEach((cleanup) => cleanup());
      cleanupFnsRef.current.clear();
    };
  }, [organizationId, userId, enabled, listSize]);

  // Update list size in view tracker when it changes
  useEffect(() => {
    if (viewTrackerRef.current) {
      viewTrackerRef.current.updateListSize(listSize);
    }
  }, [listSize]);

  // Flush events on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (trackerRef.current) {
        trackerRef.current.flush();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  /**
   * Create a ref callback for a match card
   * This tracks both impressions and views automatically
   */
  const createCardRef = useCallback(
    (data: MatchCardData) => {
      return (element: HTMLElement | null) => {
        // Clean up previous element if exists
        const existingCleanup = cleanupFnsRef.current.get(element as HTMLElement);
        if (existingCleanup) {
          existingCleanup();
          cleanupFnsRef.current.delete(element as HTMLElement);
        }

        if (!element || !viewTrackerRef.current) {
          return;
        }

        // Start observing the element
        const cleanup = viewTrackerRef.current.observe(element, data);
        cleanupFnsRef.current.set(element, cleanup);
      };
    },
    []
  );

  /**
   * Log a click event
   */
  const logClick = useCallback(
    (params: {
      programId: string;
      position: number;
      matchScore: number;
      source?: string;
    }) => {
      if (!trackerRef.current) return;

      trackerRef.current.logClick({
        ...params,
        listSize,
        source: params.source || 'match_list',
      });
    },
    [listSize]
  );

  /**
   * Log a save event
   */
  const logSave = useCallback(
    (params: {
      programId: string;
      position: number;
      matchScore: number;
      source?: string;
    }) => {
      if (!trackerRef.current) return;

      trackerRef.current.logSave({
        ...params,
        listSize,
        source: params.source || 'match_list',
      });
    },
    [listSize]
  );

  /**
   * Log an unsave event
   */
  const logUnsave = useCallback(
    (params: {
      programId: string;
      position: number;
      matchScore: number;
      source?: string;
    }) => {
      if (!trackerRef.current) return;

      trackerRef.current.logUnsave({
        ...params,
        listSize,
        source: params.source || 'match_list',
      });
    },
    [listSize]
  );

  /**
   * Get current stats
   */
  const getStats = useCallback(() => {
    if (!trackerRef.current) return null;
    return trackerRef.current.getStats();
  }, []);

  return {
    createCardRef,
    logClick,
    logSave,
    logUnsave,
    getStats,
    isTracking: enabled && !!organizationId && !!trackerRef.current,
  };
}

export default useMatchTracking;
