/**
 * SME Program Matching Algorithm
 *
 * Generates matches between organizations and 중소벤처24 SME support programs.
 * Uses different scoring factors than R&D matching:
 *
 * Scoring breakdown (100 points total):
 * - Company scale match: 25 points (STARTUP, SME, MID_SIZED)
 * - Revenue range match: 20 points (based on program requirements)
 * - Employee count match: 15 points (based on program requirements)
 * - Business age match: 15 points (업력)
 * - Regional match: 15 points (소재지)
 * - Required certifications: 10 points (이노비즈, 벤처, 메인비즈)
 *
 * Eligibility Levels:
 * - FULLY_ELIGIBLE: All hard requirements met, can apply immediately
 * - CONDITIONALLY_ELIGIBLE: Mostly eligible, minor issues (e.g., cert expiring)
 * - INELIGIBLE: Hard requirement failed (excluded from results)
 */

import {
  sme_programs,
  organizations,
  CompanyLocation,
  KoreanRegion,
  SMEProgramStatus,
} from '@prisma/client';
import {
  mapCompanyScaleToCode,
  mapRevenueToCode,
  mapEmployeeCountToCode,
  mapCertificationsToCode,
  mapRegionToCode,
  checkCertificationEligibility,
  checkRegionEligibility,
  checkRevenueEligibility,
  calculateBusinessAge,
  mapBusinessAgeToCode,
} from '@/lib/sme24-api/mappers/code-mapper';

// Type aliases
type SMEProgram = sme_programs;
type Organization = organizations & {
  locations?: CompanyLocation[];
};

// Eligibility levels
export type SMEEligibilityLevel = 'FULLY_ELIGIBLE' | 'CONDITIONALLY_ELIGIBLE' | 'INELIGIBLE';

/**
 * Score breakdown for transparency
 */
export interface SMEScoreBreakdown {
  companyScale: number;    // 0-25
  revenueRange: number;    // 0-20
  employeeCount: number;   // 0-15
  businessAge: number;     // 0-15
  region: number;          // 0-15
  certifications: number;  // 0-10
}

/**
 * Match explanation for user display
 */
export interface SMEMatchExplanation {
  summary: string;           // Korean summary
  reasons: string[];         // Why it's a good match
  warnings: string[];        // Potential issues
  recommendations: string[]; // Action items
}

/**
 * Complete match result
 */
export interface SMEMatchResult {
  program: SMEProgram;
  score: number;             // 0-100 total score
  eligibilityLevel: SMEEligibilityLevel;
  explanation: SMEMatchExplanation;
  scoreBreakdown: SMEScoreBreakdown;
  failedCriteria: string[];  // List of failed checks
  metCriteria: string[];     // List of passed checks
}

/**
 * Options for match generation
 */
export interface SMEMatchOptions {
  minimumScore?: number;     // Default: 40
  includeExpired?: boolean;  // Default: false
  limit?: number;            // Default: 50
}

/**
 * Generate SME program matches for an organization
 *
 * @param organization Organization with locations
 * @param programs SME programs to match against
 * @param options Match generation options
 * @returns Sorted list of match results (highest score first)
 */
export function generateSMEMatches(
  organization: Organization,
  programs: SMEProgram[],
  options: SMEMatchOptions = {}
): SMEMatchResult[] {
  const { minimumScore = 40, includeExpired = false, limit = 50 } = options;

  if (!organization || !programs || programs.length === 0) {
    return [];
  }

  const matches: SMEMatchResult[] = [];

  for (const program of programs) {
    // Skip inactive programs unless explicitly included
    if (!includeExpired && program.status !== SMEProgramStatus.ACTIVE) {
      continue;
    }

    // Skip programs with past deadlines
    if (!includeExpired && program.applicationEnd && new Date(program.applicationEnd) < new Date()) {
      continue;
    }

    // Score the program
    const matchResult = scoreProgram(program, organization);

    // Skip INELIGIBLE programs
    if (matchResult.eligibilityLevel === 'INELIGIBLE') {
      continue;
    }

    // Skip low-score matches
    if (matchResult.score < minimumScore) {
      continue;
    }

    matches.push(matchResult);
  }

  // Sort by eligibility level first (FULLY_ELIGIBLE > CONDITIONALLY_ELIGIBLE), then by score
  return matches
    .sort((a, b) => {
      // Primary sort: Eligibility level
      if (a.eligibilityLevel !== b.eligibilityLevel) {
        if (a.eligibilityLevel === 'FULLY_ELIGIBLE') return -1;
        if (b.eligibilityLevel === 'FULLY_ELIGIBLE') return 1;
      }
      // Secondary sort: Score (highest first)
      return b.score - a.score;
    })
    .slice(0, limit);
}

/**
 * Score a single program for an organization
 */
function scoreProgram(program: SMEProgram, org: Organization): SMEMatchResult {
  const failedCriteria: string[] = [];
  const metCriteria: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];

  // ============================================================================
  // HARD REQUIREMENTS (Result in INELIGIBLE if failed)
  // ============================================================================

  // 1. Company Scale Check (Most Critical)
  const orgScaleCode = mapCompanyScaleToCode(org.companyScaleType);

  if (program.targetCompanyScaleCd && program.targetCompanyScaleCd.length > 0) {
    // Large enterprises are not eligible for SME programs
    if (org.companyScaleType === 'LARGE_ENTERPRISE') {
      return createIneligibleResult(program, '대기업은 중소기업 지원사업에 지원할 수 없습니다');
    }

    if (orgScaleCode && !program.targetCompanyScaleCd.includes(orgScaleCode)) {
      // Check if it's a hard requirement (startup-only programs)
      const isStartupOnly = program.targetCompanyScaleCd.length === 1 &&
        program.targetCompanyScaleCd.includes('CC60');

      if (isStartupOnly && org.companyScaleType !== 'STARTUP') {
        return createIneligibleResult(program, '창업기업 전용 프로그램입니다');
      }
    }
  }

  // 2. Required Certifications Check
  if (program.requiredCertsCd && program.requiredCertsCd.length > 0) {
    const certCheck = checkCertificationEligibility(
      org.certifications || [],
      program.requiredCertsCd
    );

    if (!certCheck.eligible) {
      return createIneligibleResult(
        program,
        `필요 인증 미보유: ${certCheck.missing.join(', ')}`
      );
    }
    metCriteria.push(`필요 인증 보유: ${certCheck.met.join(', ')}`);
  }

  // 3. Regional Requirement Check
  const orgRegions: KoreanRegion[] = org.locations?.map(l => l.region) || [];

  if (program.targetRegionCodes && program.targetRegionCodes.length > 0) {
    const regionCheck = checkRegionEligibility(orgRegions, program.targetRegionCodes);

    if (!regionCheck.eligible) {
      // Check if it's a hard regional requirement (non-nationwide)
      if (!program.targetRegionCodes.includes('1000')) {
        return createIneligibleResult(program, '지역 제한 미충족');
      }
    }
    if (regionCheck.eligible) {
      metCriteria.push(regionCheck.reason);
    }
  }

  // ============================================================================
  // SCORING (100 points total)
  // ============================================================================

  const scoreBreakdown: SMEScoreBreakdown = {
    companyScale: 0,
    revenueRange: 0,
    employeeCount: 0,
    businessAge: 0,
    region: 0,
    certifications: 0,
  };

  // 1. Company Scale Match (25 points)
  scoreBreakdown.companyScale = scoreCompanyScale(org, program, metCriteria, failedCriteria);

  // 2. Revenue Range Match (20 points)
  scoreBreakdown.revenueRange = scoreRevenueRange(org, program, metCriteria, failedCriteria, warnings);

  // 3. Employee Count Match (15 points)
  scoreBreakdown.employeeCount = scoreEmployeeCount(org, program, metCriteria, failedCriteria);

  // 4. Business Age Match (15 points)
  scoreBreakdown.businessAge = scoreBusinessAge(org, program, metCriteria, failedCriteria);

  // 5. Regional Match (15 points)
  scoreBreakdown.region = scoreRegion(orgRegions, program, metCriteria, failedCriteria);

  // 6. Certifications (10 points bonus)
  scoreBreakdown.certifications = scoreCertifications(org, program, metCriteria);

  // Calculate total score
  const totalScore = Math.round(
    scoreBreakdown.companyScale +
    scoreBreakdown.revenueRange +
    scoreBreakdown.employeeCount +
    scoreBreakdown.businessAge +
    scoreBreakdown.region +
    scoreBreakdown.certifications
  );

  // ============================================================================
  // DETERMINE ELIGIBILITY LEVEL
  // ============================================================================

  let eligibilityLevel: SMEEligibilityLevel = 'FULLY_ELIGIBLE';

  // Check for soft failures that make it CONDITIONALLY_ELIGIBLE
  if (failedCriteria.length > 0 || warnings.length > 0) {
    eligibilityLevel = 'CONDITIONALLY_ELIGIBLE';
  }

  // Generate recommendations
  if (failedCriteria.length > 0) {
    recommendations.push('프로필 정보를 업데이트하여 적합성을 향상시킬 수 있습니다');
  }

  // Build explanation
  const explanation: SMEMatchExplanation = {
    summary: buildSummary(program, totalScore, eligibilityLevel),
    reasons: buildReasons(metCriteria, program),
    warnings,
    recommendations,
  };

  return {
    program,
    score: totalScore,
    eligibilityLevel,
    explanation,
    scoreBreakdown,
    failedCriteria,
    metCriteria,
  };
}

// ============================================================================
// SCORING FUNCTIONS
// ============================================================================

function scoreCompanyScale(
  org: Organization,
  program: SMEProgram,
  metCriteria: string[],
  failedCriteria: string[]
): number {
  // No scale requirement - give full points
  if (!program.targetCompanyScaleCd || program.targetCompanyScaleCd.length === 0) {
    return 25;
  }

  // No org data - give partial points
  if (!org.companyScaleType) {
    failedCriteria.push('기업규모 정보 필요');
    return 10;
  }

  const orgScaleCode = mapCompanyScaleToCode(org.companyScaleType);
  if (!orgScaleCode) {
    return 10;
  }

  if (program.targetCompanyScaleCd.includes(orgScaleCode)) {
    metCriteria.push('기업규모 조건 충족');
    return 25;
  }

  // Partial match - similar scale
  failedCriteria.push('기업규모 조건 부분 충족');
  return 12;
}

function scoreRevenueRange(
  org: Organization,
  program: SMEProgram,
  metCriteria: string[],
  failedCriteria: string[],
  warnings: string[]
): number {
  // No revenue requirement
  if (!program.targetSalesRangeCd || program.targetSalesRangeCd.length === 0) {
    return 20;
  }

  // No org data
  if (!org.revenueRange) {
    warnings.push('매출액 정보가 없어 일부 조건을 확인할 수 없습니다');
    return 10;
  }

  const revenueCheck = checkRevenueEligibility(org.revenueRange, program.targetSalesRangeCd);

  if (revenueCheck.eligible) {
    metCriteria.push('매출액 조건 충족');
    return 20;
  }

  failedCriteria.push('매출액 조건 미충족');
  return 5;
}

function scoreEmployeeCount(
  org: Organization,
  program: SMEProgram,
  metCriteria: string[],
  failedCriteria: string[]
): number {
  // No employee requirement
  if (!program.targetEmployeeRangeCd || program.targetEmployeeRangeCd.length === 0) {
    return 15;
  }

  // No org data
  if (!org.employeeCount) {
    return 8;
  }

  const orgCode = mapEmployeeCountToCode(org.employeeCount);
  if (!orgCode) {
    return 8;
  }

  if (program.targetEmployeeRangeCd.includes(orgCode)) {
    metCriteria.push('종업원수 조건 충족');
    return 15;
  }

  failedCriteria.push('종업원수 조건 부분 충족');
  return 5;
}

function scoreBusinessAge(
  org: Organization,
  program: SMEProgram,
  metCriteria: string[],
  failedCriteria: string[]
): number {
  // No age requirement
  if (!program.targetBusinessAgeCd || program.targetBusinessAgeCd.length === 0) {
    return 15;
  }

  // No org data (businessEstablishedDate)
  if (!org.businessEstablishedDate) {
    return 8;
  }

  const businessAge = calculateBusinessAge(org.businessEstablishedDate);
  if (businessAge === null) {
    return 8;
  }

  const orgAgeCode = mapBusinessAgeToCode(businessAge);
  if (!orgAgeCode) {
    return 8;
  }

  if (program.targetBusinessAgeCd.includes(orgAgeCode)) {
    metCriteria.push('업력 조건 충족');
    return 15;
  }

  // Check numeric min/max if available
  if (program.minBusinessAge !== null && businessAge < program.minBusinessAge) {
    failedCriteria.push(`최소 업력 ${program.minBusinessAge}년 필요`);
    return 3;
  }

  if (program.maxBusinessAge !== null && businessAge > program.maxBusinessAge) {
    failedCriteria.push(`업력 ${program.maxBusinessAge}년 이하 기업 대상`);
    return 3;
  }

  failedCriteria.push('업력 조건 부분 충족');
  return 7;
}

function scoreRegion(
  orgRegions: KoreanRegion[],
  program: SMEProgram,
  metCriteria: string[],
  failedCriteria: string[]
): number {
  // No regional requirement or nationwide (1000)
  if (!program.targetRegionCodes ||
      program.targetRegionCodes.length === 0 ||
      program.targetRegionCodes.includes('1000')) {
    metCriteria.push('전국 대상 프로그램');
    return 15;
  }

  // No org location data
  if (orgRegions.length === 0) {
    failedCriteria.push('소재지 정보 필요');
    return 5;
  }

  const regionCheck = checkRegionEligibility(orgRegions, program.targetRegionCodes);

  if (regionCheck.eligible) {
    metCriteria.push('지역 조건 충족');
    return 15;
  }

  failedCriteria.push('지역 조건 미충족');
  return 0;
}

function scoreCertifications(
  org: Organization,
  program: SMEProgram,
  metCriteria: string[]
): number {
  const orgCerts = org.certifications || [];
  const orgCertCodes = mapCertificationsToCode(orgCerts);

  // Bonus points for having relevant certifications
  let score = 0;

  // Check if org has any of the preferred certifications
  const preferredCerts = ['EC06', 'EC07', 'EC08']; // 이노비즈, 메인비즈, 벤처
  const matchingCerts = orgCertCodes.filter(c => preferredCerts.includes(c));

  if (matchingCerts.length > 0) {
    score = Math.min(10, matchingCerts.length * 4);
    metCriteria.push(`인증 보유: ${matchingCerts.length}개`);
  }

  return score;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function createIneligibleResult(program: SMEProgram, reason: string): SMEMatchResult {
  return {
    program,
    score: 0,
    eligibilityLevel: 'INELIGIBLE',
    explanation: {
      summary: reason,
      reasons: [],
      warnings: [reason],
      recommendations: [],
    },
    scoreBreakdown: {
      companyScale: 0,
      revenueRange: 0,
      employeeCount: 0,
      businessAge: 0,
      region: 0,
      certifications: 0,
    },
    failedCriteria: [reason],
    metCriteria: [],
  };
}

function buildSummary(
  program: SMEProgram,
  score: number,
  eligibility: SMEEligibilityLevel
): string {
  const scoreDesc = score >= 80 ? '매우 적합' : score >= 60 ? '적합' : '부분 적합';
  const institution = program.supportInstitution || '중소벤처기업부';

  if (eligibility === 'FULLY_ELIGIBLE') {
    return `${institution}의 ${program.title}은(는) 귀사에 ${scoreDesc}한 지원사업입니다. 지원 자격을 모두 충족합니다.`;
  }

  return `${institution}의 ${program.title}은(는) 귀사에 ${scoreDesc}한 지원사업입니다. 일부 조건 확인이 필요합니다.`;
}

function buildReasons(metCriteria: string[], program: SMEProgram): string[] {
  const reasons: string[] = [...metCriteria];

  // Add program-specific reasons
  if (program.maxSupportAmount) {
    const amountText = formatAmount(Number(program.maxSupportAmount));
    reasons.push(`최대 ${amountText} 지원`);
  }

  if (program.bizType) {
    reasons.push(`${program.bizType} 지원사업`);
  }

  return reasons;
}

function formatAmount(amount: number): string {
  if (amount >= 100000000) {
    return `${Math.floor(amount / 100000000)}억원`;
  }
  if (amount >= 10000) {
    return `${Math.floor(amount / 10000)}만원`;
  }
  return `${amount}원`;
}

// Export main function for use in API routes
export { generateSMEMatches as default };
