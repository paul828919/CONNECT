/**
 * Preference Aggregator for Recommendation Personalization
 *
 * Computes organization preferences from recommendation events.
 * Uses a 30-day learning window with recency weighting.
 *
 * Design decisions:
 * - Learning window: 30 days (R&D funding cycles are monthly)
 * - Retention window: 180 days (raw events kept for historical analysis)
 * - Recency weighting: Exponential decay (recent events weighted higher)
 * - Cold start transitions: Based on view count and category diversity
 *
 * @module lib/personalization/preference-aggregator
 */

import { db } from '@/lib/db';
import { ColdStartStatus, RecommendationEventType } from '@prisma/client';
import { computeAdjustedRate, getPositionBiasFactor } from './behavioral-scorer';

// ============================================================================
// Types
// ============================================================================

interface AggregatedPreferences {
  categoryScores: Record<string, number>;
  keywordScores: Record<string, number>;
  ministryScores: Record<string, number>;
  totalImpressions: number;
  totalViews: number;
  totalClicks: number;
  totalSaves: number;
  totalDismisses: number;
  adjustedCTR: number | null;
  adjustedSaveRate: number | null;
}

interface EventWithProgram {
  eventType: RecommendationEventType;
  position: number;
  listSize: number;
  occurredAt: Date;
  program: {
    category: string | null;
    keywords: string[];
    ministry: string | null;
  } | null;
}

// ============================================================================
// Constants
// ============================================================================

const LEARNING_WINDOW_DAYS = 30;
const RECENCY_DECAY_FACTOR = 0.05; // Higher = faster decay

// Event weights for preference calculation
const EVENT_WEIGHTS: Record<RecommendationEventType, number> = {
  IMPRESSION: 0.1,
  VIEW: 0.3,
  CLICK: 0.5,
  SAVE: 1.0,
  UNSAVE: -0.5,      // Negative signal
  DISMISS: -0.3,     // Weak negative signal
  HIDE: -1.0,        // Strong negative signal
  APPLIED: 2.0,      // Strongest positive signal (user actually applied)
  PLANNING: 0.8,     // Strong intent signal (user plans to apply)
  NOT_ELIGIBLE: -0.2, // Weak negative (not user's fault — structural mismatch)
};

// Outcome confidence weights (anti-gaming measures)
// Self-reported outcomes are weighted at 50% to prevent manipulation.
// Verified outcomes (document or system) are weighted near 100%.
// All outcomes have a 7-day reflection delay before affecting preferences.
export const OUTCOME_CONFIDENCE_WEIGHTS: Record<string, number> = {
  SELF_REPORTED: 0.5,       // User self-reported → 50% weight
  DOCUMENT_VERIFIED: 0.9,   // Evidence-backed → 90% weight
  SYSTEM_VERIFIED: 1.0,     // System-confirmed → full weight
};

// Outcomes entered within this window are not yet reflected in preferences.
// This prevents gaming via rapid false outcome reporting.
export const OUTCOME_REFLECTION_DELAY_DAYS = 7;

// Cold start thresholds
const COLD_START_THRESHOLDS = {
  fullColdMaxViews: 5,
  partialColdMaxViews: 20,
  warmMinCategories: 3,
};

// ============================================================================
// Main Aggregation Functions
// ============================================================================

/**
 * Aggregate preferences for a single organization
 *
 * @param organizationId - Organization to aggregate preferences for
 * @returns Aggregated preferences
 */
export async function aggregatePreferencesForOrganization(
  organizationId: string
): Promise<AggregatedPreferences> {
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - LEARNING_WINDOW_DAYS);

  // Fetch events with program data
  const events = await db.recommendation_events.findMany({
    where: {
      organizationId,
      occurredAt: { gte: windowStart },
    },
    select: {
      eventType: true,
      position: true,
      listSize: true,
      occurredAt: true,
      programId: true,
    },
    orderBy: { occurredAt: 'desc' },
  });

  if (events.length === 0) {
    return getEmptyPreferences();
  }

  // Fetch program data for all unique program IDs
  const programIds = [...new Set(events.map(e => e.programId))];
  const programs = await db.funding_programs.findMany({
    where: { id: { in: programIds } },
    select: {
      id: true,
      category: true,
      keywords: true,
      ministry: true,
    },
  });

  const programMap = new Map(programs.map(p => [p.id, p]));

  // Enrich events with program data
  const enrichedEvents: EventWithProgram[] = events.map(e => ({
    ...e,
    program: programMap.get(e.programId) || null,
  }));

  // Compute aggregates
  const categoryScores = computeCategoryScores(enrichedEvents);
  const keywordScores = computeKeywordScores(enrichedEvents);
  const ministryScores = computeMinistryScores(enrichedEvents);

  // Compute counts
  const counts = computeEventCounts(enrichedEvents);

  // Compute position-adjusted rates
  const adjustedCTR = computeAdjustedCTR(enrichedEvents);
  const adjustedSaveRate = computeAdjustedSaveRate(enrichedEvents);

  return {
    categoryScores,
    keywordScores,
    ministryScores,
    ...counts,
    adjustedCTR,
    adjustedSaveRate,
  };
}

/**
 * Update cold start status for an organization
 */
export async function updateColdStartStatus(
  organizationId: string
): Promise<ColdStartStatus> {
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - LEARNING_WINDOW_DAYS);

  // Count high-confidence views
  const viewCount = await db.recommendation_events.count({
    where: {
      organizationId,
      eventType: 'VIEW',
      occurredAt: { gte: windowStart },
    },
  });

  // Count unique categories viewed
  const categoryStats = await db.recommendation_events.findMany({
    where: {
      organizationId,
      eventType: { in: ['VIEW', 'CLICK', 'SAVE'] },
      occurredAt: { gte: windowStart },
    },
    select: { programId: true },
    distinct: ['programId'],
  });

  // Get unique categories
  const programIds = categoryStats.map(s => s.programId);
  const programs = await db.funding_programs.findMany({
    where: { id: { in: programIds } },
    select: { category: true },
  });

  const uniqueCategories = new Set(programs.map(p => p.category).filter(Boolean)).size;

  // Determine status
  let status: ColdStartStatus;
  if (viewCount < COLD_START_THRESHOLDS.fullColdMaxViews) {
    status = 'FULL_COLD';
  } else if (
    viewCount < COLD_START_THRESHOLDS.partialColdMaxViews ||
    uniqueCategories < COLD_START_THRESHOLDS.warmMinCategories
  ) {
    status = 'PARTIAL_COLD';
  } else {
    status = 'WARM';
  }

  // Get first and last event timestamps
  const [firstEvent, lastEvent] = await Promise.all([
    db.recommendation_events.findFirst({
      where: { organizationId },
      orderBy: { occurredAt: 'asc' },
      select: { occurredAt: true },
    }),
    db.recommendation_events.findFirst({
      where: { organizationId },
      orderBy: { occurredAt: 'desc' },
      select: { occurredAt: true },
    }),
  ]);

  // Upsert status
  await db.organization_personalization_status.upsert({
    where: { organizationId },
    create: {
      organizationId,
      status,
      totalViews: viewCount,
      uniqueCategories,
      firstEventAt: firstEvent?.occurredAt,
      lastEventAt: lastEvent?.occurredAt,
    },
    update: {
      status,
      totalViews: viewCount,
      uniqueCategories,
      lastEventAt: lastEvent?.occurredAt,
    },
  });

  return status;
}

/**
 * Get cold start status for an organization
 */
export async function getColdStartStatus(
  organizationId: string
): Promise<ColdStartStatus> {
  const status = await db.organization_personalization_status.findUnique({
    where: { organizationId },
    select: { status: true },
  });

  return status?.status ?? 'FULL_COLD';
}

// ============================================================================
// Score Computation Functions
// ============================================================================

function computeCategoryScores(events: EventWithProgram[]): Record<string, number> {
  const scores: Record<string, { weightedSum: number; totalWeight: number }> = {};
  const now = Date.now();

  for (const event of events) {
    const category = event.program?.category;
    if (!category) continue;

    // Recency weight (exponential decay)
    const daysSinceEvent = (now - event.occurredAt.getTime()) / (1000 * 60 * 60 * 24);
    const recencyWeight = Math.exp(-RECENCY_DECAY_FACTOR * daysSinceEvent);

    // Event type weight
    const eventWeight = EVENT_WEIGHTS[event.eventType];

    // Position bias correction
    const positionFactor = getPositionBiasFactor(event.position, event.listSize);

    // Combined weight
    const weight = recencyWeight * Math.abs(eventWeight) * positionFactor;
    const signedWeight = eventWeight >= 0 ? weight : -weight;

    if (!scores[category]) {
      scores[category] = { weightedSum: 0, totalWeight: 0 };
    }

    scores[category].weightedSum += signedWeight;
    scores[category].totalWeight += weight;
  }

  // Normalize to 0-1 range
  const result: Record<string, number> = {};
  for (const [category, { weightedSum, totalWeight }] of Object.entries(scores)) {
    if (totalWeight > 0) {
      // Sigmoid normalization to 0-1
      const rawScore = weightedSum / totalWeight;
      result[category] = 1 / (1 + Math.exp(-rawScore * 3)); // Steepness factor
    }
  }

  return result;
}

function computeKeywordScores(events: EventWithProgram[]): Record<string, number> {
  const scores: Record<string, { weightedSum: number; totalWeight: number }> = {};
  const now = Date.now();

  for (const event of events) {
    const keywords = event.program?.keywords || [];
    if (keywords.length === 0) continue;

    // Recency weight
    const daysSinceEvent = (now - event.occurredAt.getTime()) / (1000 * 60 * 60 * 24);
    const recencyWeight = Math.exp(-RECENCY_DECAY_FACTOR * daysSinceEvent);

    // Event type weight
    const eventWeight = EVENT_WEIGHTS[event.eventType];

    // Position bias correction
    const positionFactor = getPositionBiasFactor(event.position, event.listSize);

    // Combined weight (distributed across keywords)
    const weight = (recencyWeight * Math.abs(eventWeight) * positionFactor) / keywords.length;
    const signedWeight = eventWeight >= 0 ? weight : -weight;

    for (const keyword of keywords) {
      const normalizedKeyword = normalizeKeyword(keyword);

      if (!scores[normalizedKeyword]) {
        scores[normalizedKeyword] = { weightedSum: 0, totalWeight: 0 };
      }

      scores[normalizedKeyword].weightedSum += signedWeight;
      scores[normalizedKeyword].totalWeight += weight;
    }
  }

  // Normalize and filter (keep top 50 keywords)
  const result: Record<string, number> = {};
  const entries = Object.entries(scores)
    .map(([keyword, { weightedSum, totalWeight }]) => ({
      keyword,
      score: totalWeight > 0 ? 1 / (1 + Math.exp(-(weightedSum / totalWeight) * 3)) : 0.5,
    }))
    .sort((a, b) => Math.abs(b.score - 0.5) - Math.abs(a.score - 0.5))
    .slice(0, 50);

  for (const { keyword, score } of entries) {
    result[keyword] = score;
  }

  return result;
}

function computeMinistryScores(events: EventWithProgram[]): Record<string, number> {
  const scores: Record<string, { weightedSum: number; totalWeight: number }> = {};
  const now = Date.now();

  for (const event of events) {
    const ministry = event.program?.ministry;
    if (!ministry) continue;

    // Recency weight
    const daysSinceEvent = (now - event.occurredAt.getTime()) / (1000 * 60 * 60 * 24);
    const recencyWeight = Math.exp(-RECENCY_DECAY_FACTOR * daysSinceEvent);

    // Event type weight
    const eventWeight = EVENT_WEIGHTS[event.eventType];

    // Position bias correction
    const positionFactor = getPositionBiasFactor(event.position, event.listSize);

    // Combined weight
    const weight = recencyWeight * Math.abs(eventWeight) * positionFactor;
    const signedWeight = eventWeight >= 0 ? weight : -weight;

    if (!scores[ministry]) {
      scores[ministry] = { weightedSum: 0, totalWeight: 0 };
    }

    scores[ministry].weightedSum += signedWeight;
    scores[ministry].totalWeight += weight;
  }

  // Normalize
  const result: Record<string, number> = {};
  for (const [ministry, { weightedSum, totalWeight }] of Object.entries(scores)) {
    if (totalWeight > 0) {
      result[ministry] = 1 / (1 + Math.exp(-(weightedSum / totalWeight) * 3));
    }
  }

  return result;
}

function computeEventCounts(events: EventWithProgram[]): {
  totalImpressions: number;
  totalViews: number;
  totalClicks: number;
  totalSaves: number;
  totalDismisses: number;
} {
  const counts = {
    totalImpressions: 0,
    totalViews: 0,
    totalClicks: 0,
    totalSaves: 0,
    totalDismisses: 0,
  };

  for (const event of events) {
    switch (event.eventType) {
      case 'IMPRESSION':
        counts.totalImpressions++;
        break;
      case 'VIEW':
        counts.totalViews++;
        break;
      case 'CLICK':
        counts.totalClicks++;
        break;
      case 'SAVE':
        counts.totalSaves++;
        break;
      case 'DISMISS':
      case 'HIDE':
        counts.totalDismisses++;
        break;
    }
  }

  return counts;
}

function computeAdjustedCTR(events: EventWithProgram[]): number | null {
  const impressions = events.filter(e => e.eventType === 'IMPRESSION');
  const clicks = new Set(
    events.filter(e => e.eventType === 'CLICK').map(e => e.program?.category)
  );

  if (impressions.length === 0) return null;

  const engagements = impressions.map(e => ({
    position: e.position,
    listSize: e.listSize,
    engaged: clicks.has(e.program?.category),
  }));

  return computeAdjustedRate(engagements);
}

function computeAdjustedSaveRate(events: EventWithProgram[]): number | null {
  const views = events.filter(e => e.eventType === 'VIEW' || e.eventType === 'CLICK');
  const saves = new Set(
    events.filter(e => e.eventType === 'SAVE').map(e => e.program?.category)
  );

  if (views.length === 0) return null;

  const engagements = views.map(e => ({
    position: e.position,
    listSize: e.listSize,
    engaged: saves.has(e.program?.category),
  }));

  return computeAdjustedRate(engagements);
}

// ============================================================================
// Utility Functions
// ============================================================================

function normalizeKeyword(keyword: string): string {
  return keyword
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/기술$/, '')
    .replace(/산업$/, '')
    .replace(/분야$/, '');
}

function getEmptyPreferences(): AggregatedPreferences {
  return {
    categoryScores: {},
    keywordScores: {},
    ministryScores: {},
    totalImpressions: 0,
    totalViews: 0,
    totalClicks: 0,
    totalSaves: 0,
    totalDismisses: 0,
    adjustedCTR: null,
    adjustedSaveRate: null,
  };
}

/**
 * Save aggregated preferences to database
 */
export async function savePreferences(
  organizationId: string,
  preferences: AggregatedPreferences
): Promise<void> {
  await db.organization_preferences_derived.upsert({
    where: { organizationId },
    create: {
      organizationId,
      categoryScores: preferences.categoryScores,
      keywordScores: preferences.keywordScores,
      ministryScores: preferences.ministryScores,
      totalImpressions: preferences.totalImpressions,
      totalViews: preferences.totalViews,
      totalClicks: preferences.totalClicks,
      totalSaves: preferences.totalSaves,
      totalDismisses: preferences.totalDismisses,
      adjustedCTR: preferences.adjustedCTR,
      adjustedSaveRate: preferences.adjustedSaveRate,
      lastComputedAt: new Date(),
    },
    update: {
      categoryScores: preferences.categoryScores,
      keywordScores: preferences.keywordScores,
      ministryScores: preferences.ministryScores,
      totalImpressions: preferences.totalImpressions,
      totalViews: preferences.totalViews,
      totalClicks: preferences.totalClicks,
      totalSaves: preferences.totalSaves,
      totalDismisses: preferences.totalDismisses,
      adjustedCTR: preferences.adjustedCTR,
      adjustedSaveRate: preferences.adjustedSaveRate,
      lastComputedAt: new Date(),
    },
  });
}

/**
 * Get organization preferences from database
 */
export async function getOrganizationPreferences(
  organizationId: string
): Promise<AggregatedPreferences | null> {
  const prefs = await db.organization_preferences_derived.findUnique({
    where: { organizationId },
  });

  if (!prefs) return null;

  return {
    categoryScores: prefs.categoryScores as Record<string, number>,
    keywordScores: prefs.keywordScores as Record<string, number>,
    ministryScores: prefs.ministryScores as Record<string, number>,
    totalImpressions: prefs.totalImpressions,
    totalViews: prefs.totalViews,
    totalClicks: prefs.totalClicks,
    totalSaves: prefs.totalSaves,
    totalDismisses: prefs.totalDismisses,
    adjustedCTR: prefs.adjustedCTR,
    adjustedSaveRate: prefs.adjustedSaveRate,
  };
}
