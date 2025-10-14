/**
 * Funding Match Generation Algorithm (Enhanced v2.0)
 *
 * Rule-based matching system with advanced Korean language support.
 *
 * Scoring breakdown (0-100):
 * - Industry/keyword alignment: 30 points (enhanced with taxonomy)
 * - TRL compatibility: 20 points (graduated scoring)
 * - Organization type match: 20 points
 * - R&D experience match: 15 points
 * - Deadline proximity: 15 points
 *
 * Enhancements in v2.0:
 * - Korean keyword normalization and synonym matching
 * - Hierarchical industry taxonomy with cross-industry relevance
 * - Graduated TRL scoring instead of binary pass/fail
 * - Technology keyword matching for research institutes
 */

import { organizations, funding_programs, ProgramStatus, EmployeeCountRange } from '@prisma/client';
import { scoreIndustryKeywordsEnhanced } from './keywords';
import { scoreTRLEnhanced } from './trl';

// Type aliases for cleaner code
type Organization = organizations;
type FundingProgram = funding_programs;

export interface MatchScore {
  programId: string;
  program: FundingProgram;
  score: number;
  breakdown: {
    industryScore: number;
    trlScore: number;
    typeScore: number;
    rdScore: number;
    deadlineScore: number;
  };
  reasons: string[]; // Keys for explanation generator
}

/**
 * Generate match scores for an organization against funding programs
 */
export function generateMatches(
  organization: Organization,
  programs: FundingProgram[],
  limit: number = 3
): MatchScore[] {
  if (!organization || !programs || programs.length === 0) {
    return [];
  }

  const matches: MatchScore[] = [];

  for (const program of programs) {
    // Skip inactive or expired programs
    if (program.status !== ProgramStatus.ACTIVE) {
      continue;
    }

    // Skip programs with past deadlines
    if (program.deadline && new Date(program.deadline) < new Date()) {
      continue;
    }

    // Skip if program doesn't target this organization type
    if (program.targetType && !program.targetType.includes(organization.type)) {
      continue;
    }

    const matchScore = calculateMatchScore(organization, program);
    matches.push(matchScore);
  }

  // Sort by score (highest first) and limit results
  return matches.sort((a, b) => b.score - a.score).slice(0, limit);
}

/**
 * Calculate match score between organization and program
 */
export function calculateMatchScore(
  organization: Organization,
  program: FundingProgram
): MatchScore {
  if (!organization || !program) {
    return {
      programId: program?.id || '',
      program: program,
      score: 0,
      breakdown: {
        industryScore: 0,
        trlScore: 0,
        typeScore: 0,
        rdScore: 0,
        deadlineScore: 0,
      },
      reasons: [],
    };
  }

  const reasons: string[] = [];

  // 1. Industry/Keyword alignment (30 points) - ENHANCED
  const industryResult = scoreIndustryKeywordsEnhanced(organization, program);
  const industryScore = industryResult.score;
  reasons.push(...industryResult.reasons);

  // 2. TRL compatibility (20 points) - ENHANCED
  const trlResult = scoreTRLEnhanced(organization, program);
  const trlScore = trlResult.score;
  reasons.push(trlResult.reason);

  // 3. Organization type match (20 points)
  const typeScore = scoreOrganizationType(organization, program, reasons);

  // 4. R&D experience (15 points)
  const rdScore = scoreRDExperience(organization, program, reasons);

  // 5. Deadline proximity (15 points)
  const deadlineScore = scoreDeadline(program, reasons);

  const totalScore = industryScore + trlScore + typeScore + rdScore + deadlineScore;

  return {
    programId: program.id,
    program,
    score: Math.round(totalScore),
    breakdown: {
      industryScore,
      trlScore,
      typeScore,
      rdScore,
      deadlineScore,
    },
    reasons,
  };
}

/**
 * Score industry/keyword alignment (0-30 points)
 * @deprecated Use scoreIndustryKeywordsEnhanced() from './keywords' instead
 *
 * This function is kept for reference but no longer used in v2.0.
 * The enhanced version provides:
 * - Korean keyword normalization
 * - Hierarchical industry taxonomy
 * - Cross-industry relevance scoring
 * - Technology keyword matching
 */
/*
function scoreIndustryKeywords(
  org: Organization,
  program: FundingProgram,
  reasons: string[]
): number {
  const orgSector = org.industrySector?.toUpperCase() || '';
  const programKeywords = program.keywords?.map(k => k.toUpperCase()) || [];
  const programCategory = program.category?.toUpperCase() || '';

  if (!orgSector) return 0;

  let score = 0;

  // Check if org sector matches program category
  if (programCategory && orgSector.includes(programCategory)) {
    score += 15;
    reasons.push('INDUSTRY_CATEGORY_MATCH');
  } else if (programCategory && programCategory.includes(orgSector)) {
    score += 15;
    reasons.push('INDUSTRY_CATEGORY_MATCH');
  }

  // Check keyword matches
  const keywordMatches = programKeywords.filter(keyword =>
    orgSector.includes(keyword) || keyword.includes(orgSector)
  );

  if (keywordMatches.length > 0) {
    score += Math.min(15, keywordMatches.length * 5);
    reasons.push('KEYWORD_MATCH');
  }

  // If research institute, check research focus areas
  if (org.researchFocusAreas && org.researchFocusAreas.length > 0) {
    const focusMatches = org.researchFocusAreas.filter(area =>
      programKeywords.some(keyword =>
        area.toUpperCase().includes(keyword) || keyword.includes(area.toUpperCase())
      )
    );
    if (focusMatches.length > 0) {
      score += 10;
      reasons.push('RESEARCH_FOCUS_MATCH');
    }
  }

  return Math.min(30, score);
}
*/

/**
 * Score TRL compatibility (0-20 points)
 * @deprecated Use scoreTRLEnhanced() from './trl' instead
 *
 * This function is kept for reference but no longer used in v2.0.
 * The enhanced version provides:
 * - Graduated scoring (not just binary 0 or 20)
 * - Distance-based weighting (±1: 12-15 pts, ±2: 6-10 pts, ±3: 0-5 pts)
 * - TRL stage recommendations
 * - Korean descriptions and explanations
 */
/*
function scoreTRL(
  org: Organization,
  program: FundingProgram,
  reasons: string[]
): number {
  const orgTRL = org.technologyReadinessLevel;
  const minTRL = program.minTrl;
  const maxTRL = program.maxTrl;

  if (!orgTRL) return 0;
  if (!minTRL && !maxTRL) return 10; // No TRL requirement

  // Check if org TRL is within program range
  const withinMin = !minTRL || orgTRL >= minTRL;
  const withinMax = !maxTRL || orgTRL <= maxTRL;

  if (withinMin && withinMax) {
    reasons.push('TRL_COMPATIBLE');
    return 20;
  }

  if (orgTRL < minTRL!) {
    reasons.push('TRL_TOO_LOW');
    // Partial credit if close
    const diff = minTRL! - orgTRL;
    return diff === 1 ? 10 : 0;
  }

  if (orgTRL > maxTRL!) {
    reasons.push('TRL_TOO_HIGH');
    // Partial credit if close
    const diff = orgTRL - maxTRL!;
    return diff === 1 ? 10 : 0;
  }

  return 0;
}
*/

/**
 * Score organization type match (0-20 points)
 */
function scoreOrganizationType(
  org: Organization,
  program: FundingProgram,
  reasons: string[]
): number {
  if (!program.targetType || program.targetType.length === 0) {
    return 10; // No restriction
  }

  if (program.targetType.includes(org.type)) {
    reasons.push('TYPE_MATCH');
    return 20;
  }

  return 0;
}

/**
 * Score R&D experience (0-15 points)
 */
function scoreRDExperience(
  org: Organization,
  program: FundingProgram,
  reasons: string[]
): number {
  let score = 0;

  if (org.rdExperience) {
    score += 10;
    reasons.push('RD_EXPERIENCE');
  }

  // Research institutes with collaboration history get bonus
  if (org.collaborationHistory) {
    score += 5;
    reasons.push('COLLABORATION_HISTORY');
  }

  return Math.min(15, score);
}

/**
 * Score deadline proximity (0-15 points)
 */
function scoreDeadline(program: FundingProgram, reasons: string[]): number {
  if (!program.deadline) {
    return 5; // Default score if no deadline
  }

  const now = new Date();
  const deadline = new Date(program.deadline);
  const daysUntil = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntil < 0) {
    return 0; // Expired
  }

  if (daysUntil <= 7) {
    reasons.push('DEADLINE_URGENT');
    return 15;
  }

  if (daysUntil <= 30) {
    reasons.push('DEADLINE_SOON');
    return 12;
  }

  if (daysUntil <= 60) {
    reasons.push('DEADLINE_MODERATE');
    return 8;
  }

  reasons.push('DEADLINE_FAR');
  return 5;
}

/**
 * Get employee count numeric value from enum for reference
 */
export function getEmployeeCountValue(range: EmployeeCountRange | null): number | null {
  if (!range) return null;

  const ranges: Record<EmployeeCountRange, number> = {
    [EmployeeCountRange.UNDER_10]: 5,
    [EmployeeCountRange.FROM_10_TO_50]: 30,
    [EmployeeCountRange.FROM_50_TO_100]: 75,
    [EmployeeCountRange.FROM_100_TO_300]: 200,
    [EmployeeCountRange.OVER_300]: 500,
  };

  return ranges[range] || null;
}
