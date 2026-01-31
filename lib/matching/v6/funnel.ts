/**
 * v6.0 Three-Stage Funnel Orchestrator
 *
 * Pipeline: Stage 1 (Eligibility Gate) → Stage 2 (Semantic Scorer) → Stage 3 (Practical Scorer)
 *
 * Stage 1: Binary pass/fail — filters 60-80% of programs (~0ms/program)
 * Stage 2: Semantic relevance — 0-65 points (65% of final score)
 * Stage 3: Practical fit — 0-35 points (35% of final score)
 *
 * Final score = Stage 2 + Stage 3 (0-100)
 * Display threshold: 55 (configurable via minimumScore option)
 *
 * Feature flag: MATCHING_ALGORITHM=v6.0-funnel (in route.ts)
 */

import { funding_programs, ProgramStatus, CompanyLocation, organizations } from '@prisma/client';
import { IdealApplicantProfile } from '../ideal-profile';
import { evaluateEligibilityGate } from './eligibility-gate';
import { scoreSemanticRelevance } from './semantic-scorer';
import { scorePracticalFit } from './practical-scorer';
import { EligibilityLevel } from '../eligibility';
import { V6MatchScore } from './types';

export type OrganizationWithLocations = organizations & { locations?: CompanyLocation[] };

export interface GenerateMatchesV6Options {
  includeExpired?: boolean;
  minimumScore?: number;
}

// ═══════════════════════════════════════════════════════════════
// Deduplication Helpers (same as v4 algorithm.ts)
// ═══════════════════════════════════════════════════════════════

function normalizeForDedup(title: string): string {
  return title
    .replace(/^\d{4}년도?\s*/g, '')
    .replace(/\([^)]*\)\s*$/g, '')
    .replace(/_?\(?20\d{2}\)?.*$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function generateDedupKey(program: funding_programs): string {
  const normalized = normalizeForDedup(program.title);
  return `${program.agencyId}|${normalized}`;
}

function deduplicateProgramsByTitle(programs: funding_programs[]): funding_programs[] {
  const groups = new Map<string, funding_programs[]>();

  for (const program of programs) {
    const key = generateDedupKey(program);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)?.push(program);
  }

  return Array.from(groups.values()).map(group => {
    return group.sort((a, b) => {
      if (a.deadline && !b.deadline) return -1;
      if (!a.deadline && b.deadline) return 1;
      if (a.budgetAmount && !b.budgetAmount) return -1;
      if (!a.budgetAmount && b.budgetAmount) return 1;
      return new Date(a.scrapedAt).getTime() - new Date(b.scrapedAt).getTime();
    })[0];
  });
}

// ═══════════════════════════════════════════════════════════════
// Main v6 Funnel
// ═══════════════════════════════════════════════════════════════

export function generateMatchesV6(
  organization: OrganizationWithLocations,
  programs: funding_programs[],
  limit: number = 3,
  options?: GenerateMatchesV6Options
): V6MatchScore[] {
  if (!organization || !programs || programs.length === 0) {
    return [];
  }

  // Observability counters
  let stage1Blocked = 0;
  let stage2Low = 0;
  let totalProcessed = 0;
  const blockReasonCounts: Record<string, number> = {};

  const deduplicatedPrograms = deduplicateProgramsByTitle(programs);
  const matches: V6MatchScore[] = [];

  for (const program of deduplicatedPrograms) {
    // Pre-filter: Active/expired check (same as v4)
    if (!options?.includeExpired && program.status !== ProgramStatus.ACTIVE) {
      continue;
    }
    if (!options?.includeExpired && program.deadline && new Date(program.deadline) < new Date()) {
      continue;
    }

    totalProcessed++;

    // ══════════════════════════════════════════════════
    // STAGE 1: Eligibility Gate (binary pass/fail)
    // ══════════════════════════════════════════════════
    const gate = evaluateEligibilityGate(program, organization, { includeExpired: options?.includeExpired });
    if (!gate.passed) {
      stage1Blocked++;
      for (const reason of gate.blockReasons) {
        blockReasonCounts[reason] = (blockReasonCounts[reason] || 0) + 1;
      }
      continue;
    }

    // ══════════════════════════════════════════════════
    // STAGE 2: Semantic Relevance (0-65 pts)
    // ══════════════════════════════════════════════════
    const idealProfile = program.idealApplicantProfile as unknown as IdealApplicantProfile | null;
    const semantic = scoreSemanticRelevance(organization, program, idealProfile);

    // ══════════════════════════════════════════════════
    // STAGE 3: Practical Fit (0-35 pts)
    // ══════════════════════════════════════════════════
    const practical = scorePracticalFit(organization, program, idealProfile);

    const totalScore = semantic.score + practical.score;

    // Track low semantic scores for observability
    if (semantic.score < 20) {
      stage2Low++;
    }

    const reasons = [
      ...semantic.reasons,
      ...practical.reasons,
      ...semantic.negativeSignals.map(s => s.code),
    ];

    const matchScore: V6MatchScore = {
      programId: program.id,
      program,
      score: Math.round(Math.max(0, totalScore)),
      // Map to v4-compatible breakdown shape for route.ts compatibility
      breakdown: {
        keywordScore: semantic.breakdown.domainRelevance,
        industryScore: semantic.breakdown.capabilityFit + semantic.breakdown.intentAlignment,
        trlScore: practical.breakdown.trlAlignment,
        typeScore: practical.breakdown.scaleFit,
        rdScore: practical.breakdown.rdTrack,
        deadlineScore: practical.breakdown.deadlineUrgency,
      },
      reasons,
      eligibilityLevel: gate.eligibilityLevel,
      eligibilityDetails: {
        hardRequirementsMet: gate.eligibilityResult.hardRequirementsMet,
        softRequirementsMet: gate.eligibilityResult.softRequirementsMet,
        failedRequirements: gate.eligibilityResult.failedRequirements,
        metRequirements: gate.eligibilityResult.metRequirements,
        needsManualReview: gate.eligibilityResult.needsManualReview,
        manualReviewReason: gate.eligibilityResult.manualReviewReason,
      },
      v6Details: {
        semantic,
        practical,
      },
    };

    matches.push(matchScore);
  }

  // Observability logging
  const minimumScore = options?.minimumScore ?? 55;
  const aboveThreshold = matches.filter(m => m.score >= minimumScore).length;
  console.log(
    `[matching:v6] Funnel metrics: ${totalProcessed} processed → ` +
    `${stage1Blocked} gate-blocked (${Object.entries(blockReasonCounts).map(([k, v]) => `${k}:${v}`).join(', ')}), ` +
    `${stage2Low} low-semantic → ${aboveThreshold}/${matches.length} above threshold (${minimumScore})`
  );

  return matches
    .filter(m => m.score >= minimumScore)
    .sort((a, b) => {
      // Primary: Eligibility level (FULLY_ELIGIBLE > CONDITIONALLY_ELIGIBLE)
      if (a.eligibilityLevel !== b.eligibilityLevel) {
        if (a.eligibilityLevel === EligibilityLevel.FULLY_ELIGIBLE) return -1;
        if (b.eligibilityLevel === EligibilityLevel.FULLY_ELIGIBLE) return 1;
      }
      // Secondary: Score (highest first)
      return b.score - a.score;
    })
    .slice(0, limit);
}
