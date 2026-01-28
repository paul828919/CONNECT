/**
 * Contextual Scoring Module
 *
 * Computes contextual boosts based on:
 * - Deadline urgency (programs closing soon)
 * - Freshness (recently added programs)
 * - Trending (popular in the last week)
 *
 * Contextual boost range: -5 to +10 points
 *
 * @module lib/personalization/contextual-scorer
 */

import { funding_programs, ProgramStatus } from '@prisma/client';
import { db } from '@/lib/db';

// ============================================================================
// Types
// ============================================================================

export interface ContextualBoostResult {
  boost: number;
  breakdown: {
    deadlineBoost: number;
    freshnessBoost: number;
    trendingBoost: number;
  };
  reasons: string[];
}

// ============================================================================
// Constants
// ============================================================================

const CONTEXTUAL_CONFIG = {
  // Deadline urgency thresholds (days until deadline)
  urgentDeadlineDays: 7,      // < 7 days = urgent
  soonDeadlineDays: 14,       // < 14 days = soon
  maxDeadlineBoost: 5,

  // Freshness thresholds (days since creation)
  freshDays: 7,               // < 7 days = fresh
  recentDays: 14,             // < 14 days = recent
  maxFreshnessBoost: 3,

  // Trending (high engagement in last week)
  trendingThreshold: 10,      // Min views to be trending
  maxTrendingBoost: 2,

  // Total contextual range
  minTotal: -5,
  maxTotal: 10,
} as const;

// Cache for trending programs (refreshed every hour)
let trendingCache: Map<string, number> = new Map();
let trendingCacheExpiry = 0;
const TRENDING_CACHE_TTL = 60 * 60 * 1000; // 1 hour

// ============================================================================
// Main Contextual Scoring Function
// ============================================================================

/**
 * Compute contextual boost for a program
 *
 * @param program - Funding program to score
 * @returns Contextual boost with breakdown
 *
 * @example
 * ```ts
 * const result = computeContextualBoost(program);
 * // { boost: 6.5, breakdown: { deadline: 5, freshness: 1.5, trending: 0 }, reasons: [...] }
 * ```
 */
export function computeContextualBoost(
  program: funding_programs
): ContextualBoostResult {
  const reasons: string[] = [];

  // 1. Deadline urgency boost
  const deadlineBoost = computeDeadlineBoost(program, reasons);

  // 2. Freshness boost
  const freshnessBoost = computeFreshnessBoost(program, reasons);

  // 3. Trending boost
  const trendingBoost = computeTrendingBoost(program, reasons);

  // Total (clamped)
  const totalBoost = clamp(
    deadlineBoost + freshnessBoost + trendingBoost,
    CONTEXTUAL_CONFIG.minTotal,
    CONTEXTUAL_CONFIG.maxTotal
  );

  return {
    boost: totalBoost,
    breakdown: {
      deadlineBoost,
      freshnessBoost,
      trendingBoost,
    },
    reasons,
  };
}

/**
 * Compute contextual boost for multiple programs (batch)
 */
export async function computeContextualBoostBatch(
  programs: funding_programs[]
): Promise<Map<string, ContextualBoostResult>> {
  const results = new Map<string, ContextualBoostResult>();

  // Refresh trending cache if needed
  await refreshTrendingCache();

  for (const program of programs) {
    results.set(program.id, computeContextualBoost(program));
  }

  return results;
}

// ============================================================================
// Component Scoring Functions
// ============================================================================

/**
 * Compute deadline urgency boost
 * Range: 0 to +5 points
 */
function computeDeadlineBoost(
  program: funding_programs,
  reasons: string[]
): number {
  if (!program.deadline || program.status !== 'ACTIVE') {
    return 0;
  }

  const now = new Date();
  const daysUntilDeadline = Math.floor(
    (new Date(program.deadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Past deadline = no boost
  if (daysUntilDeadline < 0) {
    return 0;
  }

  // Urgent: < 7 days
  if (daysUntilDeadline <= CONTEXTUAL_CONFIG.urgentDeadlineDays) {
    reasons.push('DEADLINE_URGENT');
    // Linear boost: 7 days = 2.5, 1 day = 5
    return CONTEXTUAL_CONFIG.maxDeadlineBoost *
      (1 - daysUntilDeadline / CONTEXTUAL_CONFIG.urgentDeadlineDays / 2);
  }

  // Soon: < 14 days
  if (daysUntilDeadline <= CONTEXTUAL_CONFIG.soonDeadlineDays) {
    reasons.push('DEADLINE_SOON');
    // Smaller boost: 14 days = 1, 8 days = 2
    return 1 + (CONTEXTUAL_CONFIG.soonDeadlineDays - daysUntilDeadline) /
      (CONTEXTUAL_CONFIG.soonDeadlineDays - CONTEXTUAL_CONFIG.urgentDeadlineDays);
  }

  return 0;
}

/**
 * Compute freshness boost for new programs
 * Range: 0 to +3 points
 */
function computeFreshnessBoost(
  program: funding_programs,
  reasons: string[]
): number {
  const now = new Date();
  const daysSinceCreation = Math.floor(
    (now.getTime() - new Date(program.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  // Fresh: < 7 days
  if (daysSinceCreation <= CONTEXTUAL_CONFIG.freshDays) {
    reasons.push('NEW_PROGRAM');
    // Linear decay: 0 days = 3, 7 days = 1.5
    return CONTEXTUAL_CONFIG.maxFreshnessBoost *
      (1 - daysSinceCreation / CONTEXTUAL_CONFIG.freshDays / 2);
  }

  // Recent: < 14 days
  if (daysSinceCreation <= CONTEXTUAL_CONFIG.recentDays) {
    // Smaller boost: 8 days = 1, 14 days = 0.5
    return 0.5 + 0.5 * (CONTEXTUAL_CONFIG.recentDays - daysSinceCreation) /
      (CONTEXTUAL_CONFIG.recentDays - CONTEXTUAL_CONFIG.freshDays);
  }

  return 0;
}

/**
 * Compute trending boost based on recent engagement
 * Range: 0 to +2 points
 */
function computeTrendingBoost(
  program: funding_programs,
  reasons: string[]
): number {
  const trendingScore = trendingCache.get(program.id) || 0;

  if (trendingScore >= CONTEXTUAL_CONFIG.trendingThreshold) {
    reasons.push('TRENDING');
    // Log scale to prevent outliers
    return Math.min(
      CONTEXTUAL_CONFIG.maxTrendingBoost,
      Math.log(trendingScore / CONTEXTUAL_CONFIG.trendingThreshold + 1)
    );
  }

  return 0;
}

// ============================================================================
// Trending Cache Management
// ============================================================================

/**
 * Refresh trending cache from events
 */
async function refreshTrendingCache(): Promise<void> {
  if (Date.now() < trendingCacheExpiry) {
    return; // Cache still valid
  }

  try {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Count views per program in last week
    const trendingStats = await db.recommendation_events.groupBy({
      by: ['programId'],
      where: {
        eventType: { in: ['VIEW', 'CLICK'] },
        occurredAt: { gte: oneWeekAgo },
      },
      _count: { programId: true },
    });

    // Update cache
    trendingCache = new Map(
      trendingStats.map(stat => [stat.programId, stat._count.programId])
    );

    trendingCacheExpiry = Date.now() + TRENDING_CACHE_TTL;
  } catch (error) {
    console.error('[CONTEXTUAL] Failed to refresh trending cache:', error);
    // Keep using old cache
  }
}

/**
 * Force refresh trending cache (for testing)
 */
export async function forceRefreshTrendingCache(): Promise<void> {
  trendingCacheExpiry = 0;
  await refreshTrendingCache();
}

// ============================================================================
// Utility Functions
// ============================================================================

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Get days until deadline for a program
 */
export function getDaysUntilDeadline(program: funding_programs): number | null {
  if (!program.deadline) return null;

  const now = new Date();
  return Math.floor(
    (new Date(program.deadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
}

/**
 * Check if a program is considered "urgent"
 */
export function isUrgentDeadline(program: funding_programs): boolean {
  const days = getDaysUntilDeadline(program);
  return days !== null && days >= 0 && days <= CONTEXTUAL_CONFIG.urgentDeadlineDays;
}

/**
 * Check if a program is "new"
 */
export function isNewProgram(program: funding_programs): boolean {
  const now = new Date();
  const daysSinceCreation = Math.floor(
    (now.getTime() - new Date(program.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  );
  return daysSinceCreation <= CONTEXTUAL_CONFIG.freshDays;
}
