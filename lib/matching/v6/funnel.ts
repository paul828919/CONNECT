import { funding_programs, ProgramStatus, CompanyLocation, organizations } from '@prisma/client';
import { IdealApplicantProfile } from '../ideal-profile';
import { evaluateEligibilityGate } from './eligibility-gate';
import { scoreSemanticRelevance } from './semantic-scorer';
import { scorePracticalFit } from './practical-scorer';
import { V6MatchScore } from './types';

export type OrganizationWithLocations = organizations & { locations?: CompanyLocation[] };

export interface GenerateMatchesV6Options {
  includeExpired?: boolean;
  minimumScore?: number;
}

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

export function generateMatchesV6(
  organization: OrganizationWithLocations,
  programs: funding_programs[],
  limit: number = 3,
  options?: GenerateMatchesV6Options
): V6MatchScore[] {
  if (!organization || !programs || programs.length === 0) {
    return [];
  }

  const deduplicatedPrograms = deduplicateProgramsByTitle(programs);
  const matches: V6MatchScore[] = [];

  for (const program of deduplicatedPrograms) {
    if (!options?.includeExpired && program.status !== ProgramStatus.ACTIVE) {
      continue;
    }

    if (!options?.includeExpired && program.deadline && new Date(program.deadline) < new Date()) {
      continue;
    }

    const gate = evaluateEligibilityGate(program, organization, { includeExpired: options?.includeExpired });
    if (!gate.passed) {
      continue;
    }

    const idealProfile = program.idealApplicantProfile as unknown as IdealApplicantProfile | null;
    const semantic = scoreSemanticRelevance(organization, program, idealProfile);
    const practical = scorePracticalFit(organization, program, idealProfile);

    const totalScore = semantic.score + practical.score;

    const reasons = [
      ...semantic.reasons,
      ...practical.reasons,
      ...semantic.negativeSignals.map(s => s.code),
    ];

    const matchScore: V6MatchScore = {
      programId: program.id,
      program,
      score: Math.round(Math.max(0, totalScore)),
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

  const minimumScore = options?.minimumScore ?? 55;

  return matches
    .filter(m => m.score >= minimumScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
