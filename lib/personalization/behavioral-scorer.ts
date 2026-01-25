/**
 * Behavioral Scorer for Recommendation Personalization
 *
 * Computes behavioral boost based on user preferences derived from events.
 * Uses category, keyword, and ministry affinities with position-debiasing.
 *
 * Scoring ranges:
 * - Category affinity: -10 to +10 points
 * - Keyword overlap: 0 to +10 points
 * - Ministry affinity: -2.5 to +2.5 points
 * - Total behavioral boost: -15 to +20 points (clamped)
 *
 * @module lib/personalization/behavioral-scorer
 */

import { funding_programs } from '@prisma/client';

// ============================================================================
// Types
// ============================================================================

export interface OrganizationPreferences {
  categoryScores: Record<string, number>;   // { "BIO_HEALTH": 0.72, ... }
  keywordScores: Record<string, number>;    // { "AI": 0.8, "반도체": 0.6, ... }
  ministryScores: Record<string, number>;   // { "과기부": 0.7, ... }
  totalImpressions: number;
  totalViews: number;
  totalClicks: number;
  totalSaves: number;
  totalDismisses: number;
  adjustedCTR?: number | null;
  adjustedSaveRate?: number | null;
}

export interface BehavioralBoostResult {
  boost: number;
  breakdown: {
    categoryBoost: number;
    keywordBoost: number;
    ministryBoost: number;
  };
  reasons: string[];
}

// ============================================================================
// Constants
// ============================================================================

const BOOST_WEIGHTS = {
  category: { min: -10, max: 10, neutral: 0.5 },
  keyword: { min: 0, max: 10 },
  ministry: { min: -2.5, max: 2.5, neutral: 0.5 },
  total: { min: -15, max: 20 },
} as const;

// Korean explanations for personalization reasons
export const PERSONALIZATION_REASONS_KR: Record<string, string> = {
  'CATEGORY_AFFINITY_HIGH': '최근 관심을 보인 {category} 분야 프로그램입니다.',
  'CATEGORY_AFFINITY_LOW': '{category} 분야는 최근 관심이 적은 분야입니다.',
  'KEYWORD_MATCH_STRONG': '관심 키워드 "{keyword}"와 관련된 프로그램입니다.',
  'KEYWORD_MATCH_MODERATE': '일부 관심 키워드와 관련이 있습니다.',
  'MINISTRY_PREFERENCE_HIGH': '자주 확인하시는 {ministry} 공고입니다.',
  'MINISTRY_PREFERENCE_LOW': '{ministry} 공고는 최근 관심이 적습니다.',
  'NEW_PROGRAM': '🆕 최근 등록된 신규 공고입니다.',
  'DEADLINE_URGENT': '⏰ 마감이 {days}일 남았습니다.',
};

// ============================================================================
// Main Scoring Function
// ============================================================================

/**
 * Compute behavioral boost for a candidate program
 *
 * @param program - Candidate funding program
 * @param preferences - Organization's derived preferences
 * @returns Behavioral boost result with breakdown and reasons
 *
 * @example
 * ```ts
 * const result = computeBehavioralBoost(program, preferences);
 * // { boost: 12.5, breakdown: {...}, reasons: ['CATEGORY_AFFINITY_HIGH', ...] }
 * ```
 */
export function computeBehavioralBoost(
  program: funding_programs,
  preferences: OrganizationPreferences
): BehavioralBoostResult {
  const reasons: string[] = [];

  // 1. Category affinity (from recent saves/views)
  const categoryBoost = computeCategoryBoost(program, preferences, reasons);

  // 2. Keyword overlap
  const keywordBoost = computeKeywordBoost(program, preferences, reasons);

  // 3. Ministry affinity
  const ministryBoost = computeMinistryBoost(program, preferences, reasons);

  // Total boost (clamped)
  const totalBoost = clamp(
    categoryBoost + keywordBoost + ministryBoost,
    BOOST_WEIGHTS.total.min,
    BOOST_WEIGHTS.total.max
  );

  return {
    boost: totalBoost,
    breakdown: {
      categoryBoost,
      keywordBoost,
      ministryBoost,
    },
    reasons,
  };
}

// ============================================================================
// Component Scoring Functions
// ============================================================================

/**
 * Compute category affinity boost
 * Range: -10 to +10 points
 */
function computeCategoryBoost(
  program: funding_programs,
  preferences: OrganizationPreferences,
  reasons: string[]
): number {
  const category = program.category;

  if (!category || Object.keys(preferences.categoryScores).length === 0) {
    return 0; // No category data
  }

  // Get score for this category (default 0.5 = neutral)
  const categoryScore = preferences.categoryScores[category] ?? BOOST_WEIGHTS.category.neutral;

  // Convert 0-1 score to -10 to +10 range
  // 0.5 (neutral) → 0, 1.0 → +10, 0.0 → -10
  const boost = (categoryScore - BOOST_WEIGHTS.category.neutral) *
    (BOOST_WEIGHTS.category.max - BOOST_WEIGHTS.category.min);

  // Add reason
  if (categoryScore >= 0.7) {
    reasons.push('CATEGORY_AFFINITY_HIGH');
  } else if (categoryScore <= 0.3) {
    reasons.push('CATEGORY_AFFINITY_LOW');
  }

  return clamp(boost, BOOST_WEIGHTS.category.min, BOOST_WEIGHTS.category.max);
}

/**
 * Compute keyword overlap boost
 * Range: 0 to +10 points
 */
function computeKeywordBoost(
  program: funding_programs,
  preferences: OrganizationPreferences,
  reasons: string[]
): number {
  const programKeywords = program.keywords || [];

  if (programKeywords.length === 0 || Object.keys(preferences.keywordScores).length === 0) {
    return 0; // No keyword data
  }

  // Calculate weighted overlap
  let totalWeight = 0;
  let matchedKeywords: string[] = [];

  for (const keyword of programKeywords) {
    const normalizedKeyword = normalizeKoreanKeyword(keyword);
    const score = preferences.keywordScores[normalizedKeyword];

    if (score !== undefined) {
      totalWeight += score;
      if (score >= 0.6) {
        matchedKeywords.push(keyword);
      }
    }
  }

  // Normalize by number of program keywords
  const avgWeight = programKeywords.length > 0 ? totalWeight / programKeywords.length : 0;

  // Convert to 0-10 range
  const boost = avgWeight * BOOST_WEIGHTS.keyword.max;

  // Add reason
  if (matchedKeywords.length > 0) {
    if (avgWeight >= 0.5) {
      reasons.push('KEYWORD_MATCH_STRONG');
    } else {
      reasons.push('KEYWORD_MATCH_MODERATE');
    }
  }

  return clamp(boost, BOOST_WEIGHTS.keyword.min, BOOST_WEIGHTS.keyword.max);
}

/**
 * Compute ministry affinity boost
 * Range: -2.5 to +2.5 points
 */
function computeMinistryBoost(
  program: funding_programs,
  preferences: OrganizationPreferences,
  reasons: string[]
): number {
  const ministry = program.ministry;

  if (!ministry || Object.keys(preferences.ministryScores).length === 0) {
    return 0; // No ministry data
  }

  // Get score for this ministry (default 0.5 = neutral)
  const ministryScore = preferences.ministryScores[ministry] ?? BOOST_WEIGHTS.ministry.neutral;

  // Convert 0-1 score to -2.5 to +2.5 range
  const boost = (ministryScore - BOOST_WEIGHTS.ministry.neutral) *
    (BOOST_WEIGHTS.ministry.max - BOOST_WEIGHTS.ministry.min);

  // Add reason
  if (ministryScore >= 0.7) {
    reasons.push('MINISTRY_PREFERENCE_HIGH');
  } else if (ministryScore <= 0.3) {
    reasons.push('MINISTRY_PREFERENCE_LOW');
  }

  return clamp(boost, BOOST_WEIGHTS.ministry.min, BOOST_WEIGHTS.ministry.max);
}

// ============================================================================
// Position Debiasing (for computing adjusted rates)
// ============================================================================

/**
 * Position bias correction factor
 * Items shown at position 0 get more clicks due to position bias, not quality.
 * This correction normalizes engagement by position.
 *
 * Based on inverse position weighting: higher positions get less credit.
 */
export function getPositionBiasFactor(position: number, listSize: number): number {
  if (listSize <= 1) return 1.0;

  // Logarithmic position bias: position 0 has bias 1.0, later positions have less
  // This matches typical click-through curves in recommendation systems
  const normalizedPosition = position / (listSize - 1); // 0 to 1
  const biasFactor = 1 / (1 + Math.log(1 + normalizedPosition * 10));

  return biasFactor;
}

/**
 * Compute position-adjusted engagement rate
 */
export function computeAdjustedRate(
  engagements: Array<{ position: number; listSize: number; engaged: boolean }>
): number {
  if (engagements.length === 0) return 0;

  let weightedEngagements = 0;
  let totalWeight = 0;

  for (const e of engagements) {
    const weight = getPositionBiasFactor(e.position, e.listSize);
    totalWeight += weight;
    if (e.engaged) {
      weightedEngagements += weight;
    }
  }

  return totalWeight > 0 ? weightedEngagements / totalWeight : 0;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Clamp a value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Normalize Korean keyword for matching
 * - Trim whitespace
 * - Convert to lowercase
 * - Remove common suffixes
 */
function normalizeKoreanKeyword(keyword: string): string {
  return keyword
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '') // Remove spaces
    .replace(/기술$/, '') // Remove "기술" suffix
    .replace(/산업$/, '') // Remove "산업" suffix
    .replace(/분야$/, ''); // Remove "분야" suffix
}

/**
 * Format personalization reason with template variables
 */
export function formatReason(
  reasonKey: string,
  variables: Record<string, string | number>
): string {
  let template = PERSONALIZATION_REASONS_KR[reasonKey] || reasonKey;

  for (const [key, value] of Object.entries(variables)) {
    template = template.replace(`{${key}}`, String(value));
  }

  return template;
}

/**
 * Get Korean label for category
 */
export function getCategoryKoreanLabel(category: string): string {
  const labels: Record<string, string> = {
    'BIO_HEALTH': '바이오헬스',
    'ICT': 'ICT/정보통신',
    'MANUFACTURING': '제조/소재',
    'ENERGY': '에너지/환경',
    'AEROSPACE': '항공우주',
    'DEFENSE': '국방',
    'AGRICULTURE': '농림수산',
    'GENERAL': '일반',
  };
  return labels[category] || category;
}
