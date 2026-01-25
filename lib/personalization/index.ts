/**
 * Personalization Module
 *
 * This module provides recommendation personalization infrastructure for Connect.
 * It includes event logging, view tracking, and session management.
 *
 * Architecture (Three-Layer Personalization):
 * 1. Event Logging SSOT - Append-only event log for all user interactions
 * 2. Derived Aggregations - Preferences computed from events (Phase 2)
 * 3. Personalized Scoring - Re-ranking based on behavior (Phase 5)
 *
 * @module lib/personalization
 */

// Client-side tracking (browser)
export {
  ImpressionTracker,
  getTracker,
  resetTracker,
  type RecommendationEvent,
  type RecommendationEventType,
} from './client-tracker';

// Session management
export {
  getSessionId,
  invalidateSession,
  getSessionMetadata,
  isCurrentSessionValid,
  refreshSession,
} from './session-manager';

// View tracking with IntersectionObserver
export {
  ViewTracker,
  createViewTracker,
  isHighConfidenceView,
  VIEW_THRESHOLDS,
  type ViewThresholds,
  type MatchCardData,
} from './view-tracker';

// Server-side event logging
export {
  logRecommendationEvents,
  getSessionEventCount,
  validateEventInput,
  closeEventLoggerConnection,
  type RecommendationEventInput,
  type LogEventsResult,
} from './event-logger';
