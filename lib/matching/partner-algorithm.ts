/**
 * Partner Compatibility Algorithm (v1.0)
 *
 * Complementary matching system for consortium formation.
 * Pairs organizations based on capability gaps and complementary strengths.
 *
 * Scoring breakdown (0-100):
 * - Complementary TRL Fit: 40 points (TRL gaps create opportunities)
 * - Industry/Technology Alignment: 30 points (shared domain expertise)
 * - Organization Scale Match: 15 points (compatible size/resources)
 * - R&D Experience: 15 points (proven collaboration capability)
 *
 * Key Concept: Unlike R&D program matching, this algorithm seeks
 * complementary partnerships where:
 * - Low-TRL research institutes (1-4) pair with high-TRL companies (5-9)
 * - Early-stage tech meets commercialization capability
 * - Academic research meets industry application
 */

import { organizations, EmployeeCountRange, RevenueRange } from '@prisma/client';
import {
  findIndustrySector,
  calculateIndustryRelevance,
  normalizeKoreanKeyword,
  matchTechnologyKeyword,
} from './taxonomy';

// Type aliases
type Organization = organizations;

export interface PartnerMatchResult {
  partnerId: string;
  partner: Organization;
  score: number;
  breakdown: {
    trlFitScore: number;
    industryScore: number;
    scaleScore: number;
    experienceScore: number;
  };
  reasons: string[];
  explanation: string; // Human-readable summary
}

/**
 * Calculate compatibility score between two organizations
 *
 * @param userOrg - The user's organization (seeking partners)
 * @param candidateOrg - Candidate partner organization
 * @returns Match result with score breakdown
 */
export function calculatePartnerCompatibility(
  userOrg: Organization,
  candidateOrg: Organization
): PartnerMatchResult {
  const reasons: string[] = [];

  // 1. Complementary TRL Fit (40 points) - Core differentiator
  const trlFitScore = scoreComplementaryTRL(userOrg, candidateOrg, reasons);

  // 2. Industry/Technology Alignment (30 points) - Shared domain
  const industryScore = scoreIndustryAlignment(userOrg, candidateOrg, reasons);

  // 3. Organization Scale Match (15 points) - Resource compatibility
  const scaleScore = scoreScaleCompatibility(userOrg, candidateOrg, reasons);

  // 4. R&D Experience (15 points) - Collaboration capability
  const experienceScore = scoreRDExperience(userOrg, candidateOrg, reasons);

  const totalScore = trlFitScore + industryScore + scaleScore + experienceScore;

  return {
    partnerId: candidateOrg.id,
    partner: candidateOrg,
    score: Math.round(totalScore),
    breakdown: {
      trlFitScore,
      industryScore,
      scaleScore,
      experienceScore,
    },
    reasons,
    explanation: generateExplanation(userOrg, candidateOrg, reasons),
  };
}

/**
 * Generate match scores for multiple candidate partners
 *
 * @param userOrg - The user's organization
 * @param candidates - Array of candidate partner organizations
 * @param limit - Maximum number of matches to return
 * @returns Sorted array of partner matches (highest scores first)
 */
export function generatePartnerMatches(
  userOrg: Organization,
  candidates: Organization[],
  limit: number = 10
): PartnerMatchResult[] {
  if (!userOrg || !candidates || candidates.length === 0) {
    return [];
  }

  const matches: PartnerMatchResult[] = [];

  for (const candidate of candidates) {
    // Skip self
    if (candidate.id === userOrg.id) {
      continue;
    }

    // Skip if same organization type (unless both seeking same type partnerships)
    // This can be relaxed based on consortium preferences
    if (!shouldConsiderPartner(userOrg, candidate)) {
      continue;
    }

    const matchResult = calculatePartnerCompatibility(userOrg, candidate);
    matches.push(matchResult);
  }

  // Sort by score (highest first) and limit results
  return matches.sort((a, b) => b.score - a.score).slice(0, limit);
}

/**
 * Score complementary TRL fit (0-40 points)
 *
 * COMPLEMENTARY LOGIC (not similarity):
 * - Companies with high target TRL (7-9) matched with research institutes at low current TRL (1-4)
 * - Research institutes expecting high TRL (7-9) matched with companies needing innovation
 *
 * Perfect complementary fit: 40 points
 * Good complementary fit: 25-35 points
 * Moderate fit: 15-24 points
 * Poor fit: 0-14 points
 */
function scoreComplementaryTRL(
  userOrg: Organization,
  candidateOrg: Organization,
  reasons: string[]
): number {
  let score = 0;

  // Case 1: User is COMPANY seeking RESEARCH_INSTITUTE
  if (userOrg.type === 'COMPANY' && candidateOrg.type === 'RESEARCH_INSTITUTE') {
    const companyTargetTRL = userOrg.targetPartnerTRL; // What TRL they want in partners
    const companyCurrentTRL = userOrg.technologyReadinessLevel;
    const instituteCurrentTRL = candidateOrg.technologyReadinessLevel;
    const instituteExpectedTRL = candidateOrg.expectedTRLLevel;

    // Company wants early-stage innovation (target TRL 1-4) + Institute has early-stage tech
    if (companyTargetTRL && companyTargetTRL <= 4 && instituteCurrentTRL && instituteCurrentTRL <= 4) {
      const trlDiff = Math.abs(companyTargetTRL - instituteCurrentTRL);
      if (trlDiff === 0) {
        score = 40;
        reasons.push('PERFECT_TRL_COMPLEMENT_EARLY');
      } else if (trlDiff <= 1) {
        score = 35;
        reasons.push('STRONG_TRL_COMPLEMENT_EARLY');
      } else if (trlDiff <= 2) {
        score = 28;
        reasons.push('GOOD_TRL_COMPLEMENT_EARLY');
      }
    }
    // Company wants commercialization partner (target TRL 7-9) + Institute can reach high TRL
    else if (companyTargetTRL && companyTargetTRL >= 7 && instituteExpectedTRL && instituteExpectedTRL >= 7) {
      const trlDiff = Math.abs(companyTargetTRL - instituteExpectedTRL);
      if (trlDiff === 0) {
        score = 40;
        reasons.push('PERFECT_TRL_COMPLEMENT_COMMERCIAL');
      } else if (trlDiff <= 1) {
        score = 35;
        reasons.push('STRONG_TRL_COMPLEMENT_COMMERCIAL');
      } else if (trlDiff <= 2) {
        score = 28;
        reasons.push('GOOD_TRL_COMPLEMENT_COMMERCIAL');
      }
    }
    // Company has mid-stage tech (TRL 4-6) + Institute has early tech (TRL 1-3) = Innovation opportunity
    else if (companyCurrentTRL && companyCurrentTRL >= 4 && companyCurrentTRL <= 6 &&
             instituteCurrentTRL && instituteCurrentTRL <= 3) {
      score = 32;
      reasons.push('TRL_GAP_INNOVATION_OPPORTUNITY');
    }
    // Fallback: Moderate TRL compatibility
    else if (companyCurrentTRL && instituteCurrentTRL) {
      const gap = Math.abs(companyCurrentTRL - instituteCurrentTRL);
      if (gap >= 3 && gap <= 5) {
        score = 20;
        reasons.push('TRL_GAP_MODERATE');
      } else if (gap <= 2) {
        score = 15;
        reasons.push('TRL_SIMILAR');
      }
    }
  }

  // Case 2: User is RESEARCH_INSTITUTE seeking COMPANY
  else if (userOrg.type === 'RESEARCH_INSTITUTE' && candidateOrg.type === 'COMPANY') {
    const instituteCurrentTRL = userOrg.technologyReadinessLevel;
    const instituteExpectedTRL = userOrg.expectedTRLLevel;
    const companyCurrentTRL = candidateOrg.technologyReadinessLevel;
    const companyTargetTRL = candidateOrg.targetPartnerTRL;

    // Institute has early-stage tech (TRL 1-4) + Company has commercialization capability (TRL 7-9)
    if (instituteCurrentTRL && instituteCurrentTRL <= 4 &&
        companyCurrentTRL && companyCurrentTRL >= 7) {
      const trlGap = companyCurrentTRL - instituteCurrentTRL;
      if (trlGap >= 4 && trlGap <= 6) {
        score = 40;
        reasons.push('PERFECT_TRL_COMPLEMENT_COMMERCIALIZATION');
      } else if (trlGap >= 3) {
        score = 32;
        reasons.push('STRONG_TRL_COMPLEMENT_COMMERCIALIZATION');
      }
    }
    // Institute can reach high TRL (7-9) + Company needs that level
    else if (instituteExpectedTRL && instituteExpectedTRL >= 7 &&
             companyTargetTRL && companyTargetTRL >= 7) {
      const trlDiff = Math.abs(instituteExpectedTRL - companyTargetTRL);
      if (trlDiff === 0) {
        score = 38;
        reasons.push('PERFECT_TRL_TARGET_MATCH');
      } else if (trlDiff <= 1) {
        score = 30;
        reasons.push('STRONG_TRL_TARGET_MATCH');
      }
    }
    // Fallback: Moderate TRL compatibility
    else if (instituteCurrentTRL && companyCurrentTRL) {
      const gap = Math.abs(instituteCurrentTRL - companyCurrentTRL);
      if (gap >= 3 && gap <= 5) {
        score = 22;
        reasons.push('TRL_GAP_MODERATE');
      } else if (gap <= 2) {
        score = 12;
        reasons.push('TRL_SIMILAR');
      }
    }
  }

  // No TRL data available
  if (score === 0) {
    score = 10; // Default modest score when no TRL data
    reasons.push('TRL_DATA_MISSING');
  }

  return Math.min(40, score);
}

/**
 * Score industry/technology alignment (0-30 points)
 *
 * Matches:
 * - Desired consortium fields with industry sectors
 * - Desired technologies with key technologies
 * - Research focus areas with industry domains
 */
function scoreIndustryAlignment(
  userOrg: Organization,
  candidateOrg: Organization,
  reasons: string[]
): number {
  let score = 0;

  // 1. Match desired consortium fields (0-15 points)
  if (userOrg.desiredConsortiumFields && userOrg.desiredConsortiumFields.length > 0) {
    const userFields = userOrg.desiredConsortiumFields.map(normalizeKoreanKeyword);

    // Check candidate's industry sector
    if (candidateOrg.industrySector) {
      const candidateSector = normalizeKoreanKeyword(candidateOrg.industrySector);
      const fieldMatches = userFields.filter(field =>
        field.includes(candidateSector) || candidateSector.includes(field)
      );

      if (fieldMatches.length > 0) {
        score += Math.min(10, fieldMatches.length * 5);
        reasons.push('INDUSTRY_SECTOR_MATCH');
      }
    }

    // Check candidate's research focus areas (for research institutes)
    if (candidateOrg.researchFocusAreas && candidateOrg.researchFocusAreas.length > 0) {
      const candidateFocus = candidateOrg.researchFocusAreas.map(normalizeKoreanKeyword);
      const focusMatches = userFields.filter(field =>
        candidateFocus.some(focus => field.includes(focus) || focus.includes(field))
      );

      if (focusMatches.length > 0) {
        score += Math.min(10, focusMatches.length * 4);
        reasons.push('RESEARCH_FOCUS_MATCH');
      }
    }
  }

  // 2. Match desired technologies (0-15 points)
  if (userOrg.desiredTechnologies && userOrg.desiredTechnologies.length > 0) {
    const userTechnologies = userOrg.desiredTechnologies.map(normalizeKoreanKeyword);

    // Check candidate's key technologies
    if (candidateOrg.keyTechnologies && candidateOrg.keyTechnologies.length > 0) {
      const candidateTech = candidateOrg.keyTechnologies.map(normalizeKoreanKeyword);

      const techMatches = userTechnologies.filter(tech =>
        candidateTech.some(candidateTechItem =>
          tech.includes(candidateTechItem) || candidateTechItem.includes(tech)
        )
      );

      if (techMatches.length > 0) {
        score += Math.min(15, techMatches.length * 5);
        reasons.push('TECHNOLOGY_MATCH');
      }
    }

    // Check candidate's commercialization capabilities (for research institutes)
    if (candidateOrg.commercializationCapabilities && candidateOrg.commercializationCapabilities.length > 0) {
      const candidateCapabilities = candidateOrg.commercializationCapabilities.map(normalizeKoreanKeyword);

      const capabilityMatches = userTechnologies.filter(tech =>
        candidateCapabilities.some(cap => tech.includes(cap) || cap.includes(tech))
      );

      if (capabilityMatches.length > 0) {
        score += Math.min(12, capabilityMatches.length * 4);
        reasons.push('CAPABILITY_MATCH');
      }
    }
  }

  // 3. Fallback: Basic industry sector matching (if no consortium preferences)
  if (score === 0 && userOrg.industrySector && candidateOrg.industrySector) {
    if (normalizeKoreanKeyword(userOrg.industrySector) === normalizeKoreanKeyword(candidateOrg.industrySector)) {
      score = 15;
      reasons.push('SAME_INDUSTRY');
    } else {
      // Check cross-industry relevance via taxonomy
      const sector1 = findIndustrySector(userOrg.industrySector);
      const sector2 = findIndustrySector(candidateOrg.industrySector);

      if (sector1 && sector2) {
        const relevance = calculateIndustryRelevance(sector1, sector2);
        if (relevance >= 0.5) {
          score = 10;
          reasons.push('CROSS_INDUSTRY_RELEVANT');
        }
      }
    }
  }

  return Math.min(30, score);
}

/**
 * Score organization scale compatibility (0-15 points)
 *
 * Checks if organizations are compatible in terms of:
 * - Employee count
 * - Revenue range
 * - Target organization size preferences
 */
function scoreScaleCompatibility(
  userOrg: Organization,
  candidateOrg: Organization,
  reasons: string[]
): number {
  let score = 0;

  // If user specified target org scale/revenue (research institutes), check compatibility
  if (userOrg.type === 'RESEARCH_INSTITUTE') {
    if (userOrg.targetOrgScale && candidateOrg.employeeCount) {
      if (userOrg.targetOrgScale === candidateOrg.employeeCount) {
        score += 8;
        reasons.push('PERFECT_SCALE_MATCH');
      } else if (isAdjacentScale(userOrg.targetOrgScale, candidateOrg.employeeCount)) {
        score += 5;
        reasons.push('GOOD_SCALE_MATCH');
      }
    }

    if (userOrg.targetOrgRevenue && candidateOrg.revenueRange) {
      if (userOrg.targetOrgRevenue === candidateOrg.revenueRange) {
        score += 7;
        reasons.push('PERFECT_REVENUE_MATCH');
      } else if (isAdjacentRevenue(userOrg.targetOrgRevenue, candidateOrg.revenueRange)) {
        score += 4;
        reasons.push('GOOD_REVENUE_MATCH');
      }
    }
  }

  // If company checking research institute, score based on institute's researcher count
  if (userOrg.type === 'COMPANY' && candidateOrg.type === 'RESEARCH_INSTITUTE') {
    if (candidateOrg.researcherCount) {
      if (candidateOrg.researcherCount >= 50) {
        score += 10;
        reasons.push('LARGE_RESEARCH_CAPACITY');
      } else if (candidateOrg.researcherCount >= 20) {
        score += 7;
        reasons.push('MODERATE_RESEARCH_CAPACITY');
      } else if (candidateOrg.researcherCount >= 10) {
        score += 5;
        reasons.push('SMALL_RESEARCH_CAPACITY');
      }
    }
  }

  // Fallback: General scale compatibility (both have data)
  if (score === 0 && userOrg.employeeCount && candidateOrg.employeeCount) {
    if (userOrg.employeeCount === candidateOrg.employeeCount) {
      score = 8;
      reasons.push('SIMILAR_SIZE');
    } else if (isAdjacentScale(userOrg.employeeCount, candidateOrg.employeeCount)) {
      score = 5;
      reasons.push('COMPATIBLE_SIZE');
    }
  }

  // Default modest score if no scale data
  if (score === 0) {
    score = 5;
    reasons.push('SCALE_DATA_LIMITED');
  }

  return Math.min(15, score);
}

/**
 * Score R&D experience and collaboration capability (0-15 points)
 */
function scoreRDExperience(
  userOrg: Organization,
  candidateOrg: Organization,
  reasons: string[]
): number {
  let score = 0;

  // Candidate has R&D experience
  if (candidateOrg.rdExperience) {
    score += 7;
    reasons.push('CANDIDATE_HAS_RD_EXPERIENCE');
  }

  // Candidate has collaboration history
  if (candidateOrg.collaborationCount) {
    if (candidateOrg.collaborationCount >= 5) {
      score += 8;
      reasons.push('EXTENSIVE_COLLABORATION_HISTORY');
    } else if (candidateOrg.collaborationCount >= 3) {
      score += 6;
      reasons.push('MODERATE_COLLABORATION_HISTORY');
    } else if (candidateOrg.collaborationCount >= 1) {
      score += 4;
      reasons.push('LIMITED_COLLABORATION_HISTORY');
    }
  }

  // Default modest score if no experience data
  if (score === 0) {
    score = 5;
    reasons.push('EXPERIENCE_DATA_LIMITED');
  }

  return Math.min(15, score);
}

/**
 * Determine if candidate should be considered as a partner
 */
function shouldConsiderPartner(userOrg: Organization, candidateOrg: Organization): boolean {
  // Active organizations only
  if (candidateOrg.status !== 'ACTIVE') {
    return false;
  }

  // Must have completed profile
  if (!candidateOrg.profileCompleted) {
    return false;
  }

  // Generally prefer opposite org types for consortium formation
  // (Companies seek research institutes, research institutes seek companies)
  // But allow same-type if explicitly specified in consortium preferences

  return true; // For now, allow all active organizations with completed profiles
}

/**
 * Check if two employee count ranges are adjacent (within one level)
 */
function isAdjacentScale(scale1: EmployeeCountRange, scale2: EmployeeCountRange): boolean {
  const order = [
    EmployeeCountRange.UNDER_10,
    EmployeeCountRange.FROM_10_TO_50,
    EmployeeCountRange.FROM_50_TO_100,
    EmployeeCountRange.FROM_100_TO_300,
    EmployeeCountRange.OVER_300,
  ];

  const index1 = order.indexOf(scale1);
  const index2 = order.indexOf(scale2);

  return Math.abs(index1 - index2) === 1;
}

/**
 * Check if two revenue ranges are adjacent (within one level)
 */
function isAdjacentRevenue(revenue1: RevenueRange, revenue2: RevenueRange): boolean {
  // Handle NONE case - no adjacency concept for organizations without revenue
  if (revenue1 === RevenueRange.NONE || revenue2 === RevenueRange.NONE) {
    return false;
  }

  const order = [
    RevenueRange.UNDER_1B,
    RevenueRange.FROM_1B_TO_10B,
    RevenueRange.FROM_10B_TO_50B,
    RevenueRange.FROM_50B_TO_100B,
    RevenueRange.OVER_100B,
  ];

  const index1 = order.indexOf(revenue1);
  const index2 = order.indexOf(revenue2);

  return Math.abs(index1 - index2) === 1;
}

/**
 * Generate human-readable explanation for partner match
 */
function generateExplanation(
  userOrg: Organization,
  candidateOrg: Organization,
  reasons: string[]
): string {
  const explanations: string[] = [];

  if (reasons.includes('PERFECT_TRL_COMPLEMENT_EARLY') ||
      reasons.includes('PERFECT_TRL_COMPLEMENT_COMMERCIAL') ||
      reasons.includes('PERFECT_TRL_COMPLEMENT_COMMERCIALIZATION')) {
    explanations.push('완벽한 TRL 상호보완 관계');
  }

  if (reasons.includes('TECHNOLOGY_MATCH')) {
    explanations.push('기술 역량 일치');
  }

  if (reasons.includes('INDUSTRY_SECTOR_MATCH')) {
    explanations.push('산업 분야 일치');
  }

  if (reasons.includes('EXTENSIVE_COLLABORATION_HISTORY')) {
    explanations.push('풍부한 협력 경험');
  }

  if (explanations.length === 0) {
    return '컨소시엄 파트너로서 적합한 조직입니다.';
  }

  return explanations.join(', ');
}
