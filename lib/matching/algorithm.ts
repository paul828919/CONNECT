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
import { checkEligibility, EligibilityLevel } from './eligibility';
import { findIndustrySector, INDUSTRY_RELEVANCE } from './taxonomy';

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
  eligibilityLevel?: EligibilityLevel; // Phase 2: Three-tier eligibility
  eligibilityDetails?: {
    hardRequirementsMet: boolean;
    softRequirementsMet: boolean;
    failedRequirements: string[];
    metRequirements: string[];
    needsManualReview: boolean;
    manualReviewReason?: string;
  };
}

export interface GenerateMatchesOptions {
  includeExpired?: boolean; // Allow matching against EXPIRED programs (for historical matches)
  minimumScore?: number; // Minimum match score threshold (default: 45, user setting: 60)
}

/**
 * Generate match scores for an organization against funding programs
 */
export function generateMatches(
  organization: Organization,
  programs: FundingProgram[],
  limit: number = 3,
  options?: GenerateMatchesOptions
): MatchScore[] {
  if (!organization || !programs || programs.length === 0) {
    return [];
  }

  const matches: MatchScore[] = [];

  for (const program of programs) {
    // Skip inactive or expired programs (unless explicitly including expired for historical matches)
    if (!options?.includeExpired && program.status !== ProgramStatus.ACTIVE) {
      continue;
    }

    // Skip programs with past deadlines (unless explicitly including expired for historical matches)
    if (!options?.includeExpired && program.deadline && new Date(program.deadline) < new Date()) {
      continue;
    }

    // ============================================================================
    // Filter Consolidated Announcements (통합 공고)
    // ============================================================================
    // Consolidated announcements lack critical application details and reference
    // external websites for individual project details. These detailed projects
    // are re-announced separately with complete information.
    // Skip if ALL three critical fields are missing: deadline, applicationStart, AND budgetAmount
    if (!program.deadline && !program.applicationStart && !program.budgetAmount) {
      continue; // Consolidated announcement - lacks actionable application details
    }

    // Skip if program doesn't target this organization type
    // EXCEPTION: For historical matches (EXPIRED programs), allow all types for reference learning
    if (program.targetType && !program.targetType.includes(organization.type)) {
      if (!options?.includeExpired) {
        continue; // Strict filter for ACTIVE programs (application eligibility)
      }
      // Allow mismatch for EXPIRED programs (users want to learn from all types)
    }

    // ============================================================================
    // Eligibility-First Matching: Filter before scoring to maintain user trust
    // ============================================================================

    // Business structure requirement check (CRITICAL - prevents fatal mismatches)
    // If program specifies allowed business structures, organization must match
    if (program.allowedBusinessStructures && program.allowedBusinessStructures.length > 0) {
      const orgBusinessStructure = organization.businessStructure;

      // Skip if organization's business structure is not in allowed list
      if (orgBusinessStructure && !program.allowedBusinessStructures.includes(orgBusinessStructure)) {
        continue;
      }

      // Skip if organization has no business structure specified (NULL)
      // Conservative approach: Require explicit match when program has restrictions
      if (!orgBusinessStructure) {
        continue;
      }
    }

    // ============================================================================
    // TRL Hard Requirement Filter (기술성숙도 필수 조건)
    // ============================================================================
    // TRL (Technology Readiness Level) represents development stage maturity (1-9 scale)
    // Programs target specific TRL ranges based on research stage (basic research, applied, commercialization)
    // Organizations outside the TRL range are fundamentally incompatible - not just a scoring penalty
    // Example: Early-stage research program (TRL 1-3) cannot accept commercialization-ready company (TRL 7-9)
    //
    // DUAL-TRL SYSTEM (v2.1):
    // - Use targetResearchTRL (연구개발 희망 기술 수준) for matching if available
    // - Fall back to technologyReadinessLevel (기존 보유 기술 수준) if targetResearchTRL not set
    // - This allows companies with TRL 9 products to match TRL 3 programs if they want new R&D
    //
    // RELAXATION FOR HISTORICAL MATCHES:
    // For EXPIRED programs (historical reference), expand TRL range by ±3
    // Rationale: Users want to learn from adjacent TRL programs to understand funding landscape
    const matchingTRL = organization.targetResearchTRL || organization.technologyReadinessLevel;
    if (program.minTrl !== null && program.maxTrl !== null && matchingTRL) {
      const orgTRL = matchingTRL;

      if (options?.includeExpired) {
        // RELAXED TRL for historical reference: ±3 range
        // Example: Program TRL 4-6 → Accept org TRL 1-9 (relaxedMin=1, relaxedMax=9)
        const relaxedMin = Math.max(1, program.minTrl - 3);
        const relaxedMax = Math.min(9, program.maxTrl + 3);

        if (orgTRL < relaxedMin || orgTRL > relaxedMax) {
          continue; // Still outside extended range
        }
      } else {
        // STRICT TRL for active applications: exact range
        if (orgTRL < program.minTrl || orgTRL > program.maxTrl) {
          continue; // TRL incompatible - organization's development stage doesn't fit this program
        }
      }
    }

    // ============================================================================
    // Hospital/Medical Institution Filter (병원/의료기관 전용 프로그램 필터)
    // ============================================================================
    // Physician-scientist programs require 상급종합병원 (tertiary hospitals - only 47 in Korea)
    // and M.D.-Ph.D. researchers per 의료법 (Medical Service Act)
    // Despite having COMPANY in targetType due to extraction limitations,
    // these programs are exclusively for medical research institutions
    // Data shows: researchInstituteFocus=true is too broad (98.4% of programs)
    // Solution: Filter by hospital/medical-specific keywords in title
    const hospitalOnlyKeywords = [
      '의사과학자',      // Physician-scientist
      '상급종합병원',     // Tertiary general hospital
      'M.D.-Ph.D.',     // Medical doctor with PhD
      '의료법',         // Medical Service Act
    ];

    // Check if program title contains hospital/medical-specific keywords
    const isHospitalOnlyProgram = hospitalOnlyKeywords.some((keyword) =>
      program.title.includes(keyword)
    );

    if (isHospitalOnlyProgram) {
      // Only allow RESEARCH_INSTITUTE organizations for hospital-specific programs
      if (organization.type !== 'RESEARCH_INSTITUTE') {
        continue; // Hospital/medical-only program - companies not eligible
      }
    }

    // ============================================================================
    // Industry Category Compatibility Filter (HARD REQUIREMENT)
    // ============================================================================
    // Organizations should only match programs in compatible industry categories
    // Uses taxonomy cross-industry relevance matrix (minimum threshold: 0.3)
    //
    // RATIONALE:
    // - Prevents fundamentally incompatible matches (e.g., ICT company → DEFENSE program)
    // - Scoring-based approach alone is insufficient (weak keyword matches can accumulate points)
    // - Hard filter ensures semantic industry compatibility before any scoring occurs
    //
    // THRESHOLD: 0.3 (30% relevance) for ACTIVE programs
    // - Below 0.3: Industries are fundamentally incompatible (blocked)
    // - Above 0.3: Industries have meaningful overlap (allowed, then scored)
    //
    // RELAXATION FOR HISTORICAL MATCHES:
    // For EXPIRED programs (historical reference), BYPASS industry filter entirely
    // Rationale: Users want to learn from cross-industry examples regardless of relevance
    if (organization.industrySector && program.category) {
      const orgSector = findIndustrySector(organization.industrySector);
      const programSector = findIndustrySector(program.category);

      // Both sectors must exist in taxonomy for compatibility check
      if (orgSector && programSector) {
        // Look up cross-industry relevance score
        const relevanceScore = INDUSTRY_RELEVANCE[orgSector]?.[programSector] ?? 0;

        if (!options?.includeExpired) {
          // STRICT industry filter for ACTIVE programs (application eligibility)
          // Threshold raised from 0.3 to 0.4 to improve match quality
          if (relevanceScore < 0.4) {
            continue; // Industry mismatch - fundamentally incompatible
          }
        }
        // For EXPIRED programs: Allow all cross-industry matches for learning purposes
        // Users benefit from seeing historical programs across diverse sectors
      } else {
        // CRITICAL FIX: If either sector cannot be identified, BLOCK the match
        // This prevents bypassing industry compatibility checks with unknown categories
        // Previously this was allowing matches to proceed, causing irrelevant matches
        if (!options?.includeExpired) {
          continue; // Cannot verify industry compatibility - block for safety
        }
      }
    }

    // ============================================================================
    // Enhanced Eligibility Checking (Phase 2)
    // ============================================================================
    // Check comprehensive eligibility (certifications, investment, revenue, employees, operating years)
    // Uses three-tier classification: FULLY_ELIGIBLE, CONDITIONALLY_ELIGIBLE, INELIGIBLE
    const eligibilityResult = checkEligibility(program, organization);

    // CRITICAL: Skip INELIGIBLE programs entirely (hidden from results)
    if (eligibilityResult.level === EligibilityLevel.INELIGIBLE) {
      continue;
    }

    // NOTE: FULLY_ELIGIBLE and CONDITIONALLY_ELIGIBLE programs proceed to scoring
    // They can be distinguished later in the UI with badges/indicators

    const matchScore = calculateMatchScore(organization, program);

    // Attach eligibility information to match result (Phase 2)
    matchScore.eligibilityLevel = eligibilityResult.level;
    matchScore.eligibilityDetails = {
      hardRequirementsMet: eligibilityResult.hardRequirementsMet,
      softRequirementsMet: eligibilityResult.softRequirementsMet,
      failedRequirements: eligibilityResult.failedRequirements,
      metRequirements: eligibilityResult.metRequirements,
      needsManualReview: eligibilityResult.needsManualReview,
      manualReviewReason: eligibilityResult.manualReviewReason,
    };

    matches.push(matchScore);
  }

  // Filter out low-quality matches based on minimum score threshold
  // Default: 45 points (absolute minimum for match quality)
  // User setting: Typically 60 points (from notification settings)
  const minimumScore = options?.minimumScore ?? 45;

  // Sort by eligibility level first (FULLY_ELIGIBLE > CONDITIONALLY_ELIGIBLE), then by score
  return matches
    .filter((m) => m.score >= minimumScore)
    .sort((a, b) => {
      // Primary sort: Eligibility level
      if (a.eligibilityLevel !== b.eligibilityLevel) {
        // FULLY_ELIGIBLE ranks higher than CONDITIONALLY_ELIGIBLE
        if (a.eligibilityLevel === EligibilityLevel.FULLY_ELIGIBLE) return -1;
        if (b.eligibilityLevel === EligibilityLevel.FULLY_ELIGIBLE) return 1;
      }

      // Secondary sort: Match score (highest first)
      return b.score - a.score;
    })
    .slice(0, limit);
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
 * Enhanced with Tier 1B: Graduated collaboration scoring
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

  // Tier 1B: Graduated collaboration scoring (1=+2pts, 2-3=+4pts, 4+=+5pts)
  if (org.collaborationCount) {
    if (org.collaborationCount === 1) {
      score += 2;
      reasons.push('COLLABORATION_LIMITED');
    } else if (org.collaborationCount >= 2 && org.collaborationCount <= 3) {
      score += 4;
      reasons.push('COLLABORATION_MODERATE');
    } else if (org.collaborationCount >= 4) {
      score += 5;
      reasons.push('COLLABORATION_EXTENSIVE');
    }
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
