/**
 * Item-Item Collaborative Filtering
 *
 * Computes CF boost based on co-save patterns:
 * "Programs saved together by other organizations"
 *
 * Design decisions:
 * - Uses pre-computed co-occurrence matrix (daily batch)
 * - Top-K neighbors only (not full O(n²) matrix)
 * - Weighted by confidence (statistical significance)
 * - CF boost range: 0 to +15 points
 *
 * @module lib/personalization/item-item-cf
 */

import { db } from '@/lib/db';
import { funding_programs } from '@prisma/client';

// ============================================================================
// Types
// ============================================================================

export interface CFBoostResult {
  boost: number;
  explanation?: string;
  relatedPrograms?: string[];  // IDs of programs that triggered the boost
}

export interface CoOccurrenceStats {
  programId: string;
  coSaveCount: number;
  coViewCount: number;
  confidence: number;
}

// ============================================================================
// Constants
// ============================================================================

const CF_CONFIG = {
  maxBoost: 15,              // Maximum CF boost points
  minCoSaveCount: 2,         // Minimum co-saves to consider
  minConfidence: 0.1,        // Minimum confidence threshold
  maxCoOccurrences: 10,      // Max co-occurrences to consider per lookup
  learningWindowDays: 30,    // Days of events to consider
} as const;

// ============================================================================
// Main CF Function
// ============================================================================

/**
 * Get Item-Item CF boost for a candidate program
 *
 * Algorithm:
 * 1. Get programs the organization has saved
 * 2. Look up co-occurrences between saved programs and candidate
 * 3. Compute weighted average score
 * 4. Return boost and explanation
 *
 * @param organizationId - Organization to personalize for
 * @param candidateProgram - Program to score
 * @returns CF boost result with explanation
 *
 * @example
 * ```ts
 * const result = await getItemItemBoost('org-123', program);
 * // { boost: 8.5, explanation: '저장하신 프로그램과 함께 자주 저장되는 프로그램입니다.' }
 * ```
 */
export async function getItemItemBoost(
  organizationId: string,
  candidateProgram: funding_programs
): Promise<CFBoostResult> {
  try {
    // 1. Get programs this organization has saved (from events)
    const savedProgramIds = await getSavedProgramIds(organizationId);

    if (savedProgramIds.length === 0) {
      return { boost: 0 }; // Cold start - no CF signal
    }

    // 2. Check if candidate is already saved (no boost needed)
    if (savedProgramIds.includes(candidateProgram.id)) {
      return { boost: 0 }; // Already saved
    }

    // 3. Look up co-occurrences with candidate
    const coOccurrences = await getCoOccurrences(savedProgramIds, candidateProgram.id);

    if (coOccurrences.length === 0) {
      return { boost: 0 }; // No co-occurrence data
    }

    // 4. Compute weighted score
    const { score, relatedPrograms } = computeWeightedScore(coOccurrences);

    // 5. Generate explanation
    const explanation = score > 0
      ? '저장하신 프로그램과 함께 자주 저장되는 프로그램입니다.'
      : undefined;

    return {
      boost: score,
      explanation,
      relatedPrograms,
    };
  } catch (error) {
    console.error('[CF] Error computing item-item boost:', error);
    return { boost: 0 };
  }
}

/**
 * Get CF boost for multiple candidates (batch operation)
 * More efficient than calling getItemItemBoost repeatedly
 */
export async function getItemItemBoostBatch(
  organizationId: string,
  candidatePrograms: funding_programs[]
): Promise<Map<string, CFBoostResult>> {
  const results = new Map<string, CFBoostResult>();

  try {
    // 1. Get saved programs once
    const savedProgramIds = await getSavedProgramIds(organizationId);

    if (savedProgramIds.length === 0) {
      // Cold start - return 0 for all
      candidatePrograms.forEach(p => results.set(p.id, { boost: 0 }));
      return results;
    }

    // 2. Get all co-occurrences in one query
    const candidateIds = candidatePrograms
      .filter(p => !savedProgramIds.includes(p.id))
      .map(p => p.id);

    if (candidateIds.length === 0) {
      candidatePrograms.forEach(p => results.set(p.id, { boost: 0 }));
      return results;
    }

    const allCoOccurrences = await getCoOccurrencesBatch(savedProgramIds, candidateIds);

    // 3. Compute scores for each candidate
    for (const program of candidatePrograms) {
      if (savedProgramIds.includes(program.id)) {
        results.set(program.id, { boost: 0 });
        continue;
      }

      const coOccurrences = allCoOccurrences.get(program.id) || [];
      const { score, relatedPrograms } = computeWeightedScore(coOccurrences);

      results.set(program.id, {
        boost: score,
        explanation: score > 0
          ? '저장하신 프로그램과 함께 자주 저장되는 프로그램입니다.'
          : undefined,
        relatedPrograms,
      });
    }

    return results;
  } catch (error) {
    console.error('[CF] Error computing batch item-item boost:', error);
    candidatePrograms.forEach(p => results.set(p.id, { boost: 0 }));
    return results;
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get program IDs that an organization has saved
 */
async function getSavedProgramIds(organizationId: string): Promise<string[]> {
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - CF_CONFIG.learningWindowDays);

  const saveEvents = await db.recommendation_events.findMany({
    where: {
      organizationId,
      eventType: 'SAVE',
      occurredAt: { gte: windowStart },
    },
    select: { programId: true },
    distinct: ['programId'],
  });

  return saveEvents.map(e => e.programId);
}

/**
 * Get co-occurrences between saved programs and a candidate
 */
async function getCoOccurrences(
  savedProgramIds: string[],
  candidateId: string
): Promise<CoOccurrenceStats[]> {
  // Query co-occurrence table
  // Note: programId1 < programId2 in the table (lexicographic order)
  const coOccurrences = await db.program_co_occurrence.findMany({
    where: {
      OR: [
        {
          programId1: { in: savedProgramIds },
          programId2: candidateId,
        },
        {
          programId1: candidateId,
          programId2: { in: savedProgramIds },
        },
      ],
      coSaveCount: { gte: CF_CONFIG.minCoSaveCount },
      confidence: { gte: CF_CONFIG.minConfidence },
    },
    orderBy: { coSaveCount: 'desc' },
    take: CF_CONFIG.maxCoOccurrences,
  });

  return coOccurrences.map(co => ({
    programId: co.programId1 === candidateId ? co.programId2 : co.programId1,
    coSaveCount: co.coSaveCount,
    coViewCount: co.coViewCount,
    confidence: co.confidence,
  }));
}

/**
 * Get co-occurrences for multiple candidates (batch)
 */
async function getCoOccurrencesBatch(
  savedProgramIds: string[],
  candidateIds: string[]
): Promise<Map<string, CoOccurrenceStats[]>> {
  const result = new Map<string, CoOccurrenceStats[]>();
  candidateIds.forEach(id => result.set(id, []));

  const coOccurrences = await db.program_co_occurrence.findMany({
    where: {
      OR: [
        {
          programId1: { in: savedProgramIds },
          programId2: { in: candidateIds },
        },
        {
          programId1: { in: candidateIds },
          programId2: { in: savedProgramIds },
        },
      ],
      coSaveCount: { gte: CF_CONFIG.minCoSaveCount },
      confidence: { gte: CF_CONFIG.minConfidence },
    },
    orderBy: { coSaveCount: 'desc' },
  });

  // Group by candidate
  for (const co of coOccurrences) {
    const candidateId = candidateIds.includes(co.programId1)
      ? co.programId1
      : co.programId2;
    const savedId = co.programId1 === candidateId ? co.programId2 : co.programId1;

    const existing = result.get(candidateId) || [];
    if (existing.length < CF_CONFIG.maxCoOccurrences) {
      existing.push({
        programId: savedId,
        coSaveCount: co.coSaveCount,
        coViewCount: co.coViewCount,
        confidence: co.confidence,
      });
      result.set(candidateId, existing);
    }
  }

  return result;
}

/**
 * Compute weighted CF score from co-occurrences
 */
function computeWeightedScore(coOccurrences: CoOccurrenceStats[]): {
  score: number;
  relatedPrograms: string[];
} {
  if (coOccurrences.length === 0) {
    return { score: 0, relatedPrograms: [] };
  }

  // Weighted average by confidence
  let totalWeight = 0;
  let weightedSum = 0;
  const relatedPrograms: string[] = [];

  for (const co of coOccurrences) {
    const weight = co.confidence;
    totalWeight += weight;
    weightedSum += co.coSaveCount * weight;
    relatedPrograms.push(co.programId);
  }

  if (totalWeight === 0) {
    return { score: 0, relatedPrograms: [] };
  }

  // Normalize to 0-maxBoost range
  // Higher coSaveCount = higher score
  // Using log scale to prevent outliers from dominating
  const avgCoSave = weightedSum / totalWeight;
  const normalizedScore = Math.log(1 + avgCoSave) * 3; // Scale factor

  const score = Math.min(normalizedScore, CF_CONFIG.maxBoost);

  return {
    score: Math.round(score * 100) / 100, // Round to 2 decimals
    relatedPrograms,
  };
}

/**
 * Get similar programs based on co-occurrence
 * Useful for "You might also like" recommendations
 */
export async function getSimilarPrograms(
  programId: string,
  limit: number = 5
): Promise<Array<{ programId: string; coSaveCount: number; confidence: number }>> {
  const coOccurrences = await db.program_co_occurrence.findMany({
    where: {
      OR: [
        { programId1: programId },
        { programId2: programId },
      ],
      coSaveCount: { gte: CF_CONFIG.minCoSaveCount },
    },
    orderBy: { coSaveCount: 'desc' },
    take: limit,
  });

  return coOccurrences.map(co => ({
    programId: co.programId1 === programId ? co.programId2 : co.programId1,
    coSaveCount: co.coSaveCount,
    confidence: co.confidence,
  }));
}
