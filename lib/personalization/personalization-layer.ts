/**
 * Personalization Layer
 *
 * Integrates all personalization signals into the match generation pipeline:
 * 1. Base Score (v4.0 algorithm)
 * 2. Behavioral Boost (from preferences)
 * 3. CF Boost (item-item collaborative filtering)
 * 4. Contextual Boost (deadline, freshness, trending)
 * 5. Exploration Slots (for unbiased learning)
 *
 * Final Score Formula:
 * FinalScore = clamp(
 *   w0 * BaseScore +       // Default: 0.55
 *   w1 * BehavioralBoost + // Default: 0.25
 *   w2 * CFBoost +         // Default: 0.10
 *   w3 * ContextualBoost,  // Default: 0.10
 *   0, 100
 * )
 *
 * @module lib/personalization/personalization-layer
 */

import { funding_programs } from '@prisma/client';
import { db } from '@/lib/db';

import {
  computeBehavioralBoost,
  getOrganizationPreferences,
  getColdStartStatus,
  getItemItemBoostBatch,
  formatReason,
  getCategoryKoreanLabel,
  type OrganizationPreferences,
  type BehavioralBoostResult,
  type CFBoostResult,
} from './index';

import {
  computeContextualBoost,
  type ContextualBoostResult,
} from './contextual-scorer';

import {
  injectExplorationSlots,
  type ExplorationConfig,
  DEFAULT_EXPLORATION_CONFIG,
  type PersonalizedMatch,
} from './exploration';

import { ColdStartStatus } from '@prisma/client';

// ============================================================================
// Types
// ============================================================================

export interface PersonalizationConfig {
  // Weights (should sum to 1.0)
  baseScoreWeight: number;
  behavioralWeight: number;
  cfWeight: number;
  contextualWeight: number;

  // Feature flags
  enableBehavioral: boolean;
  enableCF: boolean;
  enableContextual: boolean;

  // Exploration
  explorationConfig: ExplorationConfig;
}

export interface MatchWithScore {
  program: funding_programs;
  baseScore: number;  // From v4.0 algorithm (0-100)
}

export interface PersonalizedMatchResult {
  program: funding_programs;
  baseScore: number;
  personalizedScore: number;
  personalizationBreakdown: {
    behavioral: number;
    cf: number;
    contextual: number;
  };
  reasons: string[];
  reasonsKorean: string[];
  isExploration?: boolean;
}

export interface GeneratePersonalizedMatchesResult {
  matches: PersonalizedMatchResult[];
  coldStartStatus: ColdStartStatus;
  config: PersonalizationConfig;
  explorationCount: number;
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_PERSONALIZATION_CONFIG: PersonalizationConfig = {
  baseScoreWeight: 0.55,
  behavioralWeight: 0.25,
  cfWeight: 0.10,
  contextualWeight: 0.10,

  enableBehavioral: true,
  enableCF: true,
  enableContextual: true,

  explorationConfig: DEFAULT_EXPLORATION_CONFIG,
};

// Config for cold start (no personalization data)
const COLD_START_CONFIG: PersonalizationConfig = {
  ...DEFAULT_PERSONALIZATION_CONFIG,
  baseScoreWeight: 0.80,
  behavioralWeight: 0.0,
  cfWeight: 0.0,
  contextualWeight: 0.20,
  enableBehavioral: false,
  enableCF: false,
};

// Config for partial cold start (limited data)
const PARTIAL_COLD_CONFIG: PersonalizationConfig = {
  ...DEFAULT_PERSONALIZATION_CONFIG,
  baseScoreWeight: 0.65,
  behavioralWeight: 0.15,
  cfWeight: 0.05,
  contextualWeight: 0.15,
};

// ============================================================================
// Main Personalization Function
// ============================================================================

/**
 * Generate personalized matches for an organization
 *
 * @param organizationId - Organization to personalize for
 * @param baseMatches - Matches from v4.0 algorithm (pre-filtered by eligibility)
 * @param configOverride - Optional config override
 * @returns Personalized matches with scores and explanations
 *
 * @example
 * ```ts
 * const result = await generatePersonalizedMatches(
 *   'org-123',
 *   baseMatches
 * );
 * // { matches: [...], coldStartStatus: 'WARM', explorationCount: 2 }
 * ```
 */
export async function generatePersonalizedMatches(
  organizationId: string,
  baseMatches: MatchWithScore[],
  configOverride?: Partial<PersonalizationConfig>
): Promise<GeneratePersonalizedMatchesResult> {
  try {
    // 1. Get cold start status and preferences
    const coldStartStatus = await getColdStartStatus(organizationId);
    const preferences = await getOrganizationPreferences(organizationId);

    // 2. Select config based on cold start status
    let config = selectConfigByStatus(coldStartStatus, configOverride);

    // 3. If fully cold, return base matches with contextual boost only
    if (coldStartStatus === 'FULL_COLD' || !preferences) {
      const matches = await applyContextualOnly(baseMatches, config);
      return {
        matches,
        coldStartStatus,
        config,
        explorationCount: 0,
      };
    }

    // 4. Compute personalized scores
    const programs = baseMatches.map(m => m.program);

    // Get CF boosts in batch (more efficient)
    const cfBoosts = config.enableCF
      ? await getItemItemBoostBatch(organizationId, programs)
      : new Map<string, CFBoostResult>();

    // Compute all scores
    const personalizedMatches: PersonalizedMatch[] = [];
    const matchResults: PersonalizedMatchResult[] = [];

    for (const match of baseMatches) {
      const { program, baseScore } = match;

      // Behavioral boost
      const behavioral = config.enableBehavioral
        ? computeBehavioralBoost(program, preferences)
        : { boost: 0, breakdown: { categoryBoost: 0, keywordBoost: 0, ministryBoost: 0 }, reasons: [] };

      // CF boost
      const cf = cfBoosts.get(program.id) || { boost: 0 };

      // Contextual boost
      const contextual = config.enableContextual
        ? computeContextualBoost(program)
        : { boost: 0, breakdown: { deadlineBoost: 0, freshnessBoost: 0, trendingBoost: 0 }, reasons: [] };

      // Final score
      const personalizedScore = clamp(
        config.baseScoreWeight * baseScore +
        config.behavioralWeight * normalizeBoost(behavioral.boost, -15, 20) +
        config.cfWeight * normalizeBoost(cf.boost, 0, 15) +
        config.contextualWeight * normalizeBoost(contextual.boost, -5, 10),
        0,
        100
      );

      // Collect reasons
      const allReasons = [
        ...behavioral.reasons,
        ...contextual.reasons,
        ...(cf.explanation ? ['CF_BOOST'] : []),
      ];

      // Format Korean reasons
      const reasonsKorean = allReasons.map(reason =>
        formatReasonKorean(reason, program, cf)
      );

      personalizedMatches.push({
        programId: program.id,
        score: baseScore,
        personalizedScore,
      });

      matchResults.push({
        program,
        baseScore,
        personalizedScore,
        personalizationBreakdown: {
          behavioral: behavioral.boost,
          cf: cf.boost,
          contextual: contextual.boost,
        },
        reasons: allReasons,
        reasonsKorean: reasonsKorean.filter(Boolean),
      });
    }

    // 5. Sort by personalized score
    matchResults.sort((a, b) => b.personalizedScore - a.personalizedScore);
    personalizedMatches.sort((a, b) => b.personalizedScore - a.personalizedScore);

    // 6. Inject exploration slots
    const { finalMatches, explorationCount } = injectExplorationSlots(
      personalizedMatches,
      personalizedMatches, // Use same list as pool for exploration
      config.explorationConfig
    );

    // 7. Map back to full results with exploration flag
    const explorationIds = new Set(
      finalMatches.filter(m => m.isExploration).map(m => m.programId)
    );

    const finalResults = finalMatches.map(fm => {
      const result = matchResults.find(r => r.program.id === fm.programId)!;
      return {
        ...result,
        isExploration: explorationIds.has(fm.programId),
      };
    });

    return {
      matches: finalResults,
      coldStartStatus,
      config,
      explorationCount,
    };
  } catch (error) {
    console.error('[PERSONALIZATION] Error generating personalized matches:', error);

    // Fallback: Return base matches without personalization
    const fallbackMatches = baseMatches.map(m => ({
      program: m.program,
      baseScore: m.baseScore,
      personalizedScore: m.baseScore,
      personalizationBreakdown: { behavioral: 0, cf: 0, contextual: 0 },
      reasons: [],
      reasonsKorean: [],
    }));

    return {
      matches: fallbackMatches,
      coldStartStatus: 'FULL_COLD',
      config: COLD_START_CONFIG,
      explorationCount: 0,
    };
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Select config based on cold start status
 */
function selectConfigByStatus(
  status: ColdStartStatus,
  override?: Partial<PersonalizationConfig>
): PersonalizationConfig {
  let baseConfig: PersonalizationConfig;

  switch (status) {
    case 'FULL_COLD':
      baseConfig = COLD_START_CONFIG;
      break;
    case 'PARTIAL_COLD':
      baseConfig = PARTIAL_COLD_CONFIG;
      break;
    case 'WARM':
    default:
      baseConfig = DEFAULT_PERSONALIZATION_CONFIG;
  }

  if (override) {
    return { ...baseConfig, ...override };
  }

  return baseConfig;
}

/**
 * Apply contextual boost only (for cold start)
 */
async function applyContextualOnly(
  baseMatches: MatchWithScore[],
  config: PersonalizationConfig
): Promise<PersonalizedMatchResult[]> {
  return baseMatches.map(match => {
    const contextual = computeContextualBoost(match.program);

    const personalizedScore = clamp(
      config.baseScoreWeight * match.baseScore +
      config.contextualWeight * normalizeBoost(contextual.boost, -5, 10),
      0,
      100
    );

    const reasonsKorean = contextual.reasons.map(reason =>
      formatReasonKorean(reason, match.program, { boost: 0 })
    );

    return {
      program: match.program,
      baseScore: match.baseScore,
      personalizedScore,
      personalizationBreakdown: {
        behavioral: 0,
        cf: 0,
        contextual: contextual.boost,
      },
      reasons: contextual.reasons,
      reasonsKorean: reasonsKorean.filter(Boolean),
    };
  }).sort((a, b) => b.personalizedScore - a.personalizedScore);
}

/**
 * Normalize a boost value to 0-100 scale for weighted combination
 */
function normalizeBoost(boost: number, min: number, max: number): number {
  // Map [min, max] → [0, 100]
  const range = max - min;
  return ((boost - min) / range) * 100;
}

/**
 * Clamp value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Format reason code to Korean explanation
 */
function formatReasonKorean(
  reason: string,
  program: funding_programs,
  cf: CFBoostResult
): string {
  const daysUntilDeadline = program.deadline
    ? Math.floor((new Date(program.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const categoryLabel = program.category
    ? getCategoryKoreanLabel(program.category)
    : '';

  switch (reason) {
    case 'CATEGORY_AFFINITY_HIGH':
      return `최근 관심을 보인 ${categoryLabel} 분야 프로그램입니다.`;
    case 'KEYWORD_MATCH_STRONG':
      return '관심 키워드와 관련된 프로그램입니다.';
    case 'KEYWORD_MATCH_MODERATE':
      return '일부 관심 키워드와 관련이 있습니다.';
    case 'MINISTRY_PREFERENCE_HIGH':
      return `자주 확인하시는 ${program.ministry || '부처'} 공고입니다.`;
    case 'NEW_PROGRAM':
      return '🆕 최근 등록된 신규 공고입니다.';
    case 'DEADLINE_URGENT':
      return `⏰ 마감이 ${daysUntilDeadline}일 남았습니다.`;
    case 'DEADLINE_SOON':
      return `📅 마감이 ${daysUntilDeadline}일 후입니다.`;
    case 'TRENDING':
      return '🔥 최근 많은 관심을 받고 있는 공고입니다.';
    case 'CF_BOOST':
      return cf.explanation || '저장하신 프로그램과 관련된 공고입니다.';
    default:
      return '';
  }
}

// ============================================================================
// Exports for Index
// ============================================================================

export {
  computeContextualBoost,
  type ContextualBoostResult,
} from './contextual-scorer';

export {
  injectExplorationSlots,
  DEFAULT_EXPLORATION_CONFIG,
  type ExplorationConfig,
  type ExplorationStrategy,
} from './exploration';
