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

// Behavioral scoring (Phase 2)
export {
  computeBehavioralBoost,
  getPositionBiasFactor,
  computeAdjustedRate,
  formatReason,
  getCategoryKoreanLabel,
  PERSONALIZATION_REASONS_KR,
  type OrganizationPreferences,
  type BehavioralBoostResult,
} from './behavioral-scorer';

// Preference aggregation (Phase 2)
export {
  aggregatePreferencesForOrganization,
  updateColdStartStatus,
  getColdStartStatus,
  savePreferences,
  getOrganizationPreferences,
} from './preference-aggregator';

// Item-Item Collaborative Filtering (Phase 4)
export {
  getItemItemBoost,
  getItemItemBoostBatch,
  getSimilarPrograms,
  type CFBoostResult,
  type CoOccurrenceStats,
} from './item-item-cf';

// Contextual Scoring (Phase 5)
export {
  computeContextualBoost,
  computeContextualBoostBatch,
  getDaysUntilDeadline,
  isUrgentDeadline,
  isNewProgram,
  forceRefreshTrendingCache,
  type ContextualBoostResult,
} from './contextual-scorer';

// Exploration (Phase 5)
export {
  injectExplorationSlots,
  isExplorationEnabled,
  createNoExplorationConfig,
  DEFAULT_EXPLORATION_CONFIG,
  type ExplorationConfig,
  type ExplorationStrategy,
  type ExplorationResult,
} from './exploration';

// Main Personalization Layer (Phase 5)
export {
  generatePersonalizedMatches,
  DEFAULT_PERSONALIZATION_CONFIG,
  type PersonalizationConfig,
  type MatchWithScore,
  type PersonalizedMatchResult,
  type GeneratePersonalizedMatchesResult,
} from './personalization-layer';

// Metrics Collection (Phase 6)
export {
  recordProcessingMetric,
  setActiveConfigName,
  getMetricsSnapshot,
  flushMetrics,
  getMetricsAccumulator,
  getPositionBiasFactor as getMetricsPositionBiasFactor,
  computeDebiasedRate,
  createTimer,
  withTiming,
  type ProcessingMetric,
  type ScoreDistribution,
  type MetricsSnapshot,
} from './metrics-collector';

// A/B Testing & Interleaving (Phase 6)
export {
  teamDraftInterleave,
  balancedInterleave,
  computeInterleavingMetrics,
  isInterleavingSignificant,
  isInTreatmentGroup,
  getTestVariant,
  type InterleavedMatch,
  type InterleavedResult,
  type InterleavingMetrics,
} from './interleaving';
