/**
 * Interleaving Module
 *
 * Implements Team-Draft Interleaving for fair A/B comparison without
 * splitting traffic. This allows comparing two ranking algorithms by
 * interleaving their results and attributing engagement to each.
 *
 * Benefits over traditional A/B:
 * - No traffic split needed (every user sees comparison)
 * - Faster convergence (more statistical power)
 * - Controls for user-level variation
 *
 * @module lib/personalization/interleaving
 */

import type { PersonalizedMatch } from './exploration';

// ============================================================================
// Types
// ============================================================================

export interface InterleavedMatch extends PersonalizedMatch {
  team: 'A' | 'B';      // Which ranking this item came from
  sourceRank: number;   // Original rank in source list
}

export interface InterleavedResult {
  interleaved: InterleavedMatch[];
  teamAItems: string[];  // Program IDs attributed to Team A
  teamBItems: string[];  // Program IDs attributed to Team B
  startingTeam: 'A' | 'B';
}

export interface InterleavingMetrics {
  teamAClicks: number;
  teamBClicks: number;
  teamASaves: number;
  teamBSaves: number;
  teamAWins: boolean;   // More engagement for Team A
  delta: number;        // Difference in engagement rate
}

// ============================================================================
// Team-Draft Interleaving
// ============================================================================

/**
 * Team-Draft Interleaving Algorithm
 *
 * Fairly interleaves two ranked lists by having teams "draft" items
 * alternately. Each team picks their highest-ranked unpicked item.
 *
 * @param rankingA - First ranking (e.g., personalized)
 * @param rankingB - Second ranking (e.g., control/v4.0)
 * @param listSize - Maximum items in final list
 * @returns Interleaved result with team attribution
 *
 * @example
 * ```ts
 * const result = teamDraftInterleave(personalizedMatches, controlMatches, 10);
 * // result.interleaved = mixed list
 * // result.teamAItems = IDs from personalized
 * // result.teamBItems = IDs from control
 * ```
 */
export function teamDraftInterleave(
  rankingA: PersonalizedMatch[],
  rankingB: PersonalizedMatch[],
  listSize: number
): InterleavedResult {
  const result: InterleavedMatch[] = [];
  const teamAItems: string[] = [];
  const teamBItems: string[] = [];
  const seenIds = new Set<string>();

  let ptrA = 0;
  let ptrB = 0;

  // Randomly choose starting team for fairness
  let turn: 'A' | 'B' = Math.random() < 0.5 ? 'A' : 'B';
  const startingTeam = turn;

  while (result.length < listSize && (ptrA < rankingA.length || ptrB < rankingB.length)) {
    let picked = false;

    if (turn === 'A') {
      // Team A picks their top unpicked item
      while (ptrA < rankingA.length && !picked) {
        const candidate = rankingA[ptrA];
        ptrA++;

        if (!seenIds.has(candidate.programId)) {
          seenIds.add(candidate.programId);
          result.push({
            ...candidate,
            team: 'A',
            sourceRank: ptrA,
          });
          teamAItems.push(candidate.programId);
          picked = true;
        }
      }
    } else {
      // Team B picks their top unpicked item
      while (ptrB < rankingB.length && !picked) {
        const candidate = rankingB[ptrB];
        ptrB++;

        if (!seenIds.has(candidate.programId)) {
          seenIds.add(candidate.programId);
          result.push({
            ...candidate,
            team: 'B',
            sourceRank: ptrB,
          });
          teamBItems.push(candidate.programId);
          picked = true;
        }
      }
    }

    // If current team couldn't pick, try the other team
    if (!picked) {
      turn = turn === 'A' ? 'B' : 'A';
      continue;
    }

    // Alternate turns
    turn = turn === 'A' ? 'B' : 'A';
  }

  return {
    interleaved: result,
    teamAItems,
    teamBItems,
    startingTeam,
  };
}

// ============================================================================
// Balanced Interleaving (Alternative)
// ============================================================================

/**
 * Balanced Interleaving Algorithm
 *
 * A simpler variant that ensures equal representation from both lists
 * by strictly alternating between them.
 *
 * @param rankingA - First ranking
 * @param rankingB - Second ranking
 * @param listSize - Maximum items in final list
 */
export function balancedInterleave(
  rankingA: PersonalizedMatch[],
  rankingB: PersonalizedMatch[],
  listSize: number
): InterleavedResult {
  const result: InterleavedMatch[] = [];
  const teamAItems: string[] = [];
  const teamBItems: string[] = [];
  const seenIds = new Set<string>();

  let idxA = 0;
  let idxB = 0;
  const startingTeam: 'A' | 'B' = Math.random() < 0.5 ? 'A' : 'B';
  let pickFromA = startingTeam === 'A';

  while (result.length < listSize) {
    if (pickFromA && idxA < rankingA.length) {
      const candidate = rankingA[idxA++];
      if (!seenIds.has(candidate.programId)) {
        seenIds.add(candidate.programId);
        result.push({ ...candidate, team: 'A', sourceRank: idxA });
        teamAItems.push(candidate.programId);
      }
    } else if (!pickFromA && idxB < rankingB.length) {
      const candidate = rankingB[idxB++];
      if (!seenIds.has(candidate.programId)) {
        seenIds.add(candidate.programId);
        result.push({ ...candidate, team: 'B', sourceRank: idxB });
        teamBItems.push(candidate.programId);
      }
    } else if (idxA < rankingA.length) {
      // Fallback to A if B exhausted
      const candidate = rankingA[idxA++];
      if (!seenIds.has(candidate.programId)) {
        seenIds.add(candidate.programId);
        result.push({ ...candidate, team: 'A', sourceRank: idxA });
        teamAItems.push(candidate.programId);
      }
    } else if (idxB < rankingB.length) {
      // Fallback to B if A exhausted
      const candidate = rankingB[idxB++];
      if (!seenIds.has(candidate.programId)) {
        seenIds.add(candidate.programId);
        result.push({ ...candidate, team: 'B', sourceRank: idxB });
        teamBItems.push(candidate.programId);
      }
    } else {
      break; // Both exhausted
    }

    pickFromA = !pickFromA;
  }

  return {
    interleaved: result,
    teamAItems,
    teamBItems,
    startingTeam,
  };
}

// ============================================================================
// Metrics Computation
// ============================================================================

/**
 * Compute interleaving metrics from engagement data
 *
 * @param interleavedResult - Result from interleaving
 * @param clicks - Program IDs that were clicked
 * @param saves - Program IDs that were saved
 * @returns Metrics comparing Team A vs Team B
 */
export function computeInterleavingMetrics(
  interleavedResult: InterleavedResult,
  clicks: string[],
  saves: string[]
): InterleavingMetrics {
  const teamASet = new Set(interleavedResult.teamAItems);
  const teamBSet = new Set(interleavedResult.teamBItems);

  const teamAClicks = clicks.filter(id => teamASet.has(id)).length;
  const teamBClicks = clicks.filter(id => teamBSet.has(id)).length;
  const teamASaves = saves.filter(id => teamASet.has(id)).length;
  const teamBSaves = saves.filter(id => teamBSet.has(id)).length;

  // Compute weighted engagement (saves worth more than clicks)
  const teamAScore = teamAClicks + teamASaves * 3;
  const teamBScore = teamBClicks + teamBSaves * 3;

  const totalScore = teamAScore + teamBScore;
  const delta = totalScore > 0
    ? (teamAScore - teamBScore) / totalScore
    : 0;

  return {
    teamAClicks,
    teamBClicks,
    teamASaves,
    teamBSaves,
    teamAWins: teamAScore > teamBScore,
    delta,
  };
}

// ============================================================================
// Confidence Calculation
// ============================================================================

/**
 * Check if interleaving result is statistically significant
 *
 * Uses binomial sign test: each session is a "trial" where the team
 * with more engagement wins. Tests if win rate differs from 50%.
 *
 * @param sessionResults - Array of per-session A wins (true) vs B wins (false)
 * @param alpha - Significance level (default 0.05)
 * @returns Whether result is significant
 */
export function isInterleavingSignificant(
  sessionResults: boolean[], // true = A won, false = B won
  alpha: number = 0.05
): { significant: boolean; pValue: number; winRate: number } {
  const n = sessionResults.length;
  if (n < 10) {
    return { significant: false, pValue: 1, winRate: 0.5 };
  }

  const aWins = sessionResults.filter(r => r).length;
  const winRate = aWins / n;

  // Two-tailed binomial test approximation (normal approximation for n > 30)
  // Under null hypothesis, P(A wins) = 0.5
  const expectedWins = n * 0.5;
  const stdDev = Math.sqrt(n * 0.5 * 0.5);
  const z = Math.abs(aWins - expectedWins) / stdDev;

  // p-value from z-score (two-tailed)
  const pValue = 2 * (1 - normalCDF(z));

  return {
    significant: pValue < alpha,
    pValue,
    winRate,
  };
}

/**
 * Standard normal CDF approximation
 */
function normalCDF(z: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = z < 0 ? -1 : 1;
  z = Math.abs(z) / Math.SQRT2;

  const t = 1.0 / (1.0 + p * z);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);

  return 0.5 * (1.0 + sign * y);
}

// ============================================================================
// A/B Test Assignment
// ============================================================================

/**
 * Deterministically assign organization to A/B test bucket
 *
 * Uses consistent hashing so same org always gets same bucket.
 *
 * @param organizationId - Organization to assign
 * @param testName - Name of the test
 * @param trafficPercentage - Percentage to send to treatment (0-100)
 * @returns Whether this org is in treatment group
 */
export function isInTreatmentGroup(
  organizationId: string,
  testName: string,
  trafficPercentage: number
): boolean {
  // Simple hash based on org ID and test name
  const hashInput = `${organizationId}:${testName}`;
  let hash = 0;

  for (let i = 0; i < hashInput.length; i++) {
    const char = hashInput.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Normalize to 0-100
  const bucket = Math.abs(hash) % 100;

  return bucket < trafficPercentage;
}

/**
 * Get A/B test variant for an organization
 *
 * @param organizationId - Organization to assign
 * @param testName - Name of the test
 * @param variants - Array of variant names
 * @returns Assigned variant name
 */
export function getTestVariant(
  organizationId: string,
  testName: string,
  variants: string[]
): string {
  if (variants.length === 0) {
    throw new Error('At least one variant required');
  }

  const hashInput = `${organizationId}:${testName}`;
  let hash = 0;

  for (let i = 0; i < hashInput.length; i++) {
    const char = hashInput.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  const index = Math.abs(hash) % variants.length;
  return variants[index];
}
