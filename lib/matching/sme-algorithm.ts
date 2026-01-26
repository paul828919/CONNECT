/**
 * SME Program Matching Algorithm v2.0
 *
 * Generates matches between organizations and 중소벤처24 SME support programs.
 * Uses different scoring factors than R&D matching.
 *
 * v2.0 Changes (Multi-Signal Recommendation Engine):
 * - ADDED: 6 new scoring dimensions (bizType, lifecycle, industry/content, deadline, financial, sportType)
 * - ADDED: Hard eligibility gates (isPreStartup, isRestart, isFemaleOwner, CEO age)
 * - CHANGED: Reweighted original 6 factors (total raw: 150 → normalized to 100)
 * - CHANGED: Score normalization prevents inflation from added dimensions
 *
 * Scoring breakdown (150 raw → normalized to 100):
 * Eligibility factors (70 raw max, partial credit for no-requirement):
 *   - Company scale match: 20 points (10 partial if no req, 20 if matched)
 *   - Revenue range match: 15 points (7 partial if no req, 15 if matched)
 *   - Employee count match: 10 points (5 partial if no req, 10 if matched)
 *   - Business age match: 10 points (5 partial if no req, 10 if matched)
 *   - Regional match: 10 points (7 partial if nationwide/no req, 10 if matched)
 *   - Required certifications: 5 points (이노비즈, 벤처, 메인비즈)
 *
 * Relevance factors (80 raw):
 *   - Industry/Content: 30 points (keyword classification on title+description)
 *   - bizType match: 28 points (사업유형 - 100% fill rate, best differentiator)
 *   - Deadline urgency: 15 points (마감임박 우선)
 *   - sportType match: 3 points (지원유형 - 91% "정보", low differentiation)
 *   - Lifecycle match: 2 points (생애주기 - 0% fill rate, future-proofing)
 *   - Financial relevance: 2 points (지원금액 - 0% fill rate, future-proofing)
 *
 * v2.1 Partial Credit Rationale:
 *   92.7% of programs have NO eligibility restrictions. Giving full points
 *   for "no requirement" makes 47% of the total score identical across all
 *   programs. Partial credit creates meaningful differentiation: programs
 *   that specifically match an org's profile score higher than generic ones.
 *
 * Weight calibration based on production data (818 active programs, 2026-01-26):
 *   - bizType/sportType: 100% fill → high weights
 *   - description: 99.5% fill → industry/content scoring viable
 *   - applicationEnd: 63% fill → deadline scoring viable
 *   - lifeCycle/maxSupportAmount/targetIndustry: 0% fill → reduced weights
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
  RevenueRange,
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
import {
  classifyProgram,
  getIndustryRelevance,
  getIndustryKoreanLabel,
  type ClassificationResult,
} from './keyword-classifier';

// Type aliases
type SMEProgram = sme_programs;
type Organization = organizations & {
  locations?: CompanyLocation[];
};

// Maximum raw score before normalization (sum of all factor maximums)
const MAX_RAW_SCORE = 150;

// Eligibility levels
export type SMEEligibilityLevel = 'FULLY_ELIGIBLE' | 'CONDITIONALLY_ELIGIBLE' | 'INELIGIBLE';

/**
 * Score breakdown for transparency (v2.0: 12 factors)
 * Raw points before normalization
 */
export interface SMEScoreBreakdown {
  // Eligibility factors (70 raw max, partial credit for no-requirement)
  companyScale: number;       // 0-20 (10 partial if no req)
  revenueRange: number;       // 0-15 (7 partial if no req)
  employeeCount: number;      // 0-10 (5 partial if no req)
  businessAge: number;        // 0-10 (5 partial if no req)
  region: number;             // 0-10 (7 partial if nationwide/no req)
  certifications: number;     // 0-5
  // Relevance factors (80 raw max, rebalanced for differentiation)
  bizType: number;            // 0-28 (best differentiator, 100% fill rate)
  lifecycle: number;          // 0-2  (reduced: 0% fill rate)
  industryContent: number;    // 0-30 (boosted: 99.5% description fill)
  deadline: number;           // 0-15
  financialRelevance: number; // 0-2  (reduced: 0% fill rate)
  sportType: number;          // 0-3  (reduced: 91% "정보")
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
  score: number;             // 0-100 normalized score
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

  // 4. Pre-Startup Gate (v2.0)
  if (program.isPreStartup && org.businessEstablishedDate) {
    return createIneligibleResult(program, '예비창업자 전용 프로그램입니다');
  }

  // ============================================================================
  // SPECIAL WARNINGS (v2.0 - soft gates, don't block but inform)
  // ============================================================================

  // Restart program warning
  if (program.isRestart) {
    warnings.push('재창업/재기 기업 대상 프로그램입니다');
  }

  // Female owner program warning
  if (program.isFemaleOwner) {
    warnings.push('여성 대표 기업 대상 프로그램입니다');
  }

  // CEO age restriction warning
  if (program.minCeoAge || program.maxCeoAge) {
    const ageRange = program.minCeoAge && program.maxCeoAge
      ? `${program.minCeoAge}~${program.maxCeoAge}세`
      : program.minCeoAge
        ? `${program.minCeoAge}세 이상`
        : `${program.maxCeoAge}세 이하`;
    warnings.push(`대표자 연령 제한: ${ageRange}`);
  }

  // ============================================================================
  // SCORING (150 raw points → normalized to 100)
  // ============================================================================

  const scoreBreakdown: SMEScoreBreakdown = {
    // Eligibility factors
    companyScale: 0,
    revenueRange: 0,
    employeeCount: 0,
    businessAge: 0,
    region: 0,
    certifications: 0,
    // Relevance factors
    bizType: 0,
    lifecycle: 0,
    industryContent: 0,
    deadline: 0,
    financialRelevance: 0,
    sportType: 0,
  };

  // === Eligibility factors (70 raw max) ===

  // 1. Company Scale Match (20 points, was 25)
  scoreBreakdown.companyScale = scoreCompanyScale(org, program, metCriteria, failedCriteria);

  // 2. Revenue Range Match (15 points, was 20)
  scoreBreakdown.revenueRange = scoreRevenueRange(org, program, metCriteria, failedCriteria, warnings);

  // 3. Employee Count Match (10 points, was 15)
  scoreBreakdown.employeeCount = scoreEmployeeCount(org, program, metCriteria, failedCriteria);

  // 4. Business Age Match (10 points, was 15)
  scoreBreakdown.businessAge = scoreBusinessAge(org, program, metCriteria, failedCriteria);

  // 5. Regional Match (10 points, was 15)
  scoreBreakdown.region = scoreRegion(orgRegions, program, metCriteria, failedCriteria);

  // 6. Certifications (5 points, was 10)
  scoreBreakdown.certifications = scoreCertifications(org, program, metCriteria);

  // === Relevance factors (80 raw max, rebalanced v2.1) ===

  // 7. bizType Match (28 points, was 25) — best differentiator (100% fill, 10 categories)
  scoreBreakdown.bizType = scoreBizType(org, program, metCriteria);

  // 8. Lifecycle Match (2 points, was 5) — reduced: 0% fill rate
  scoreBreakdown.lifecycle = scoreLifecycle(org, program, metCriteria);

  // 9. Industry/Content Match (30 points, was 25) — boosted: 99.5% description fill
  scoreBreakdown.industryContent = scoreIndustryContent(org, program, metCriteria);

  // 10. Deadline Urgency (15 points) — unchanged
  scoreBreakdown.deadline = scoreDeadline(program, metCriteria);

  // 11. Financial Relevance (2 points, was 5) — reduced: 0% fill rate
  scoreBreakdown.financialRelevance = scoreFinancialRelevance(org, program, metCriteria);

  // 12. sportType Match (3 points, was 5) — reduced: 91% "정보"
  scoreBreakdown.sportType = scoreSportType(org, program, metCriteria);

  // Calculate raw total and normalize to 0-100
  const rawScore =
    scoreBreakdown.companyScale +
    scoreBreakdown.revenueRange +
    scoreBreakdown.employeeCount +
    scoreBreakdown.businessAge +
    scoreBreakdown.region +
    scoreBreakdown.certifications +
    scoreBreakdown.bizType +
    scoreBreakdown.lifecycle +
    scoreBreakdown.industryContent +
    scoreBreakdown.deadline +
    scoreBreakdown.financialRelevance +
    scoreBreakdown.sportType;

  const totalScore = Math.round((rawScore / MAX_RAW_SCORE) * 100);

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
// ELIGIBILITY SCORING FUNCTIONS (reweighted from v1.0)
// ============================================================================

function scoreCompanyScale(
  org: Organization,
  program: SMEProgram,
  metCriteria: string[],
  failedCriteria: string[]
): number {
  // No scale requirement — partial credit (open to all ≠ specifically matched)
  // 92.7% of programs have no restriction; full points here kills differentiation
  if (!program.targetCompanyScaleCd || program.targetCompanyScaleCd.length === 0) {
    return 10;
  }

  // No org data - give partial points
  if (!org.companyScaleType) {
    failedCriteria.push('기업규모 정보 필요');
    return 8;
  }

  const orgScaleCode = mapCompanyScaleToCode(org.companyScaleType);
  if (!orgScaleCode) {
    return 8;
  }

  if (program.targetCompanyScaleCd.includes(orgScaleCode)) {
    metCriteria.push('기업규모 조건 충족');
    return 20;
  }

  // Partial match - similar scale
  failedCriteria.push('기업규모 조건 부분 충족');
  return 10;
}

function scoreRevenueRange(
  org: Organization,
  program: SMEProgram,
  metCriteria: string[],
  failedCriteria: string[],
  warnings: string[]
): number {
  // No revenue requirement — partial credit
  if (!program.targetSalesRangeCd || program.targetSalesRangeCd.length === 0) {
    return 7;
  }

  // No org data
  if (!org.revenueRange) {
    warnings.push('매출액 정보가 없어 일부 조건을 확인할 수 없습니다');
    return 8;
  }

  const revenueCheck = checkRevenueEligibility(org.revenueRange, program.targetSalesRangeCd);

  if (revenueCheck.eligible) {
    metCriteria.push('매출액 조건 충족');
    return 15;
  }

  failedCriteria.push('매출액 조건 미충족');
  return 4;
}

function scoreEmployeeCount(
  org: Organization,
  program: SMEProgram,
  metCriteria: string[],
  failedCriteria: string[]
): number {
  // No employee requirement — partial credit
  if (!program.targetEmployeeRangeCd || program.targetEmployeeRangeCd.length === 0) {
    return 5;
  }

  // No org data
  if (!org.employeeCount) {
    return 5;
  }

  const orgCode = mapEmployeeCountToCode(org.employeeCount);
  if (!orgCode) {
    return 5;
  }

  if (program.targetEmployeeRangeCd.includes(orgCode)) {
    metCriteria.push('종업원수 조건 충족');
    return 10;
  }

  failedCriteria.push('종업원수 조건 부분 충족');
  return 3;
}

function scoreBusinessAge(
  org: Organization,
  program: SMEProgram,
  metCriteria: string[],
  failedCriteria: string[]
): number {
  // No age requirement — partial credit
  if (!program.targetBusinessAgeCd || program.targetBusinessAgeCd.length === 0) {
    return 5;
  }

  // No org data (businessEstablishedDate)
  if (!org.businessEstablishedDate) {
    return 5;
  }

  const businessAge = calculateBusinessAge(org.businessEstablishedDate);
  if (businessAge === null) {
    return 5;
  }

  const orgAgeCode = mapBusinessAgeToCode(businessAge);
  if (!orgAgeCode) {
    return 5;
  }

  if (program.targetBusinessAgeCd.includes(orgAgeCode)) {
    metCriteria.push('업력 조건 충족');
    return 10;
  }

  // Check numeric min/max if available
  if (program.minBusinessAge !== null && businessAge < program.minBusinessAge) {
    failedCriteria.push(`최소 업력 ${program.minBusinessAge}년 필요`);
    return 2;
  }

  if (program.maxBusinessAge !== null && businessAge > program.maxBusinessAge) {
    failedCriteria.push(`업력 ${program.maxBusinessAge}년 이하 기업 대상`);
    return 2;
  }

  failedCriteria.push('업력 조건 부분 충족');
  return 5;
}

function scoreRegion(
  orgRegions: KoreanRegion[],
  program: SMEProgram,
  metCriteria: string[],
  failedCriteria: string[]
): number {
  // No regional requirement or nationwide (1000) — partial credit
  // Nationwide is still accessible, but less signal than a specific regional match
  if (!program.targetRegionCodes ||
      program.targetRegionCodes.length === 0 ||
      program.targetRegionCodes.includes('1000')) {
    metCriteria.push('전국 대상 프로그램');
    return 7;
  }

  // No org location data
  if (orgRegions.length === 0) {
    failedCriteria.push('소재지 정보 필요');
    return 3;
  }

  const regionCheck = checkRegionEligibility(orgRegions, program.targetRegionCodes);

  if (regionCheck.eligible) {
    metCriteria.push('지역 조건 충족');
    return 10;
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
    score = Math.min(5, matchingCerts.length * 2);
    metCriteria.push(`인증 보유: ${matchingCerts.length}개`);
  }

  return score;
}

// ============================================================================
// NEW RELEVANCE SCORING FUNCTIONS (v2.0)
// ============================================================================

/**
 * Score bizType match (0-28 points, was 0-25)
 *
 * Maps program bizType (사업유형) to organization characteristics.
 * Production data: 100% fill rate, 10 distinct categories.
 * Top categories: 경영(28%), 기술(20%), 금융(16%), 수출(13%)
 *
 * v2.1: Widened scoring ranges for better differentiation.
 * Strong match: 24-28, moderate: 14-20, weak: 4-10, mismatch: 0-6
 */
function scoreBizType(
  org: Organization,
  program: SMEProgram,
  metCriteria: string[]
): number {
  if (!program.bizType) return 8; // Default low score (was 13) — no signal

  const bizType = program.bizType;

  switch (bizType) {
    case '기술': {
      // Technology programs → favor R&D-experienced and tech-sector companies
      if (org.rdExperience) {
        metCriteria.push('R&D 경험 보유 - 기술지원사업 적합');
        return 28;
      }
      const techSectors = ['ICT', 'BIO_HEALTH', 'MANUFACTURING', 'ENERGY'];
      if (org.industrySector && techSectors.includes(org.industrySector.toUpperCase())) {
        metCriteria.push('기술 분야 기업 - 기술지원사업 적합');
        return 22;
      }
      return 6; // No tech signal — weak match (was 12)
    }

    case '금융': {
      // Financial programs → favor smaller companies needing capital
      if (org.companyScaleType === 'STARTUP') {
        metCriteria.push('창업기업 - 금융지원사업 적합');
        return 28;
      }
      if (org.companyScaleType === 'SME') {
        metCriteria.push('중소기업 - 금융지원사업 적합');
        return 22;
      }
      if (org.revenueRange === 'NONE' || org.revenueRange === 'UNDER_1B') {
        return 22;
      }
      return 8; // Larger companies: less need for SME financing (was 12)
    }

    case '창업': {
      // Startup programs → strongly favor startups and young companies
      if (org.companyScaleType === 'STARTUP') {
        metCriteria.push('창업기업 - 창업지원사업 적합');
        return 28;
      }
      // Young companies (< 3 years)
      if (org.businessEstablishedDate) {
        const age = calculateBusinessAge(org.businessEstablishedDate);
        if (age !== null && age < 3) {
          metCriteria.push('업력 3년 미만 - 창업지원사업 적합');
          return 22;
        }
        if (age !== null && age < 7) {
          return 14; // Still somewhat relevant for younger companies
        }
      }
      return 3; // Established companies: very low relevance (was 5)
    }

    case '수출': {
      // Export programs → favor companies with revenue (they have products to export)
      if (org.revenueRange && org.revenueRange !== 'NONE') {
        metCriteria.push('매출 보유 - 수출지원사업 적합');
        return 24;
      }
      return 6; // No revenue → nothing to export yet (was 10)
    }

    case '인력': {
      // Manpower programs → moderate universal benefit
      return 14; // Broadly applicable but not specifically matched (was 18)
    }

    case '경영': {
      // Management programs → moderate universal benefit
      return 14; // Broadly applicable but not specifically matched (was 18)
    }

    case '내수': {
      // Domestic market programs → favor companies with revenue
      if (org.revenueRange && org.revenueRange !== 'NONE') {
        return 22;
      }
      return 8; // No revenue (was 12)
    }

    case '중견': {
      // Mid-sized company programs
      if (org.companyScaleType === 'MID_SIZED') {
        metCriteria.push('중견기업 대상 사업 적합');
        return 28;
      }
      if (org.companyScaleType === 'SME') {
        return 14; // SMEs can benefit from growth programs (was 15)
      }
      return 3; // Startups: not ready for mid-sized programs (was 5)
    }

    case '소상공인': {
      // Small business programs
      if (org.companyScaleType === 'STARTUP' || org.revenueRange === 'NONE' || org.revenueRange === 'UNDER_1B') {
        metCriteria.push('소상공인 지원사업 적합');
        return 24;
      }
      return 4; // Larger companies: poor fit (was 8)
    }

    default:
      return 8; // 기타 or unknown (was 13)
  }
}

/**
 * Score lifecycle match (0-2 points, was 0-5)
 *
 * Maps program lifeCycle to org's derived lifecycle stage.
 * Production data: 0% fill rate for lifeCycle field → derive from bizType as fallback.
 * v2.1: Reduced from 5pts to 2pts — 0% fill rate means this never differentiates.
 */
function scoreLifecycle(
  org: Organization,
  program: SMEProgram,
  metCriteria: string[]
): number {
  // Primary: Use program's lifeCycle field if available
  if (program.lifeCycle && program.lifeCycle.length > 0) {
    const orgLifecycle = deriveOrgLifecycle(org);
    if (!orgLifecycle) return 1; // No org data

    for (const lc of program.lifeCycle) {
      if (lc.includes('창업') && orgLifecycle === 'startup') {
        metCriteria.push('생애주기 부합: 창업기');
        return 2;
      }
      if (lc.includes('성장') && orgLifecycle === 'growth') {
        metCriteria.push('생애주기 부합: 성장기');
        return 2;
      }
      if (lc.includes('폐업') || lc.includes('재기')) {
        return 1;
      }
    }
    return 0; // Lifecycle exists but doesn't match
  }

  // Fallback: Derive lifecycle from bizType
  if (program.bizType === '창업') {
    const orgLifecycle = deriveOrgLifecycle(org);
    if (orgLifecycle === 'startup') return 2;
    if (orgLifecycle === 'growth') return 0;
    return 1;
  }

  return 1; // No lifecycle data → minimal neutral score
}

/**
 * Score industry/content match (0-30 points, was 0-25)
 *
 * Classifies program by title+description using keyword-classifier,
 * then measures relevance against org's industrySector.
 * Production data: 99.5% description fill rate → strong signal.
 *
 * v2.1: Boosted from 25pts to 30pts — one of only two high-signal
 * relevance factors (along with bizType). 72% of programs have
 * industry-specific keywords that enable real differentiation.
 */
function scoreIndustryContent(
  org: Organization,
  program: SMEProgram,
  metCriteria: string[]
): number {
  // Build text for classification from available fields
  const titleText = program.title || '';
  const descText = program.description || '';
  const contentsText = program.supportContents || '';
  const industryText = program.targetIndustry || '';

  // Combine text for classification (title is most important)
  const classificationText = [titleText, descText, contentsText, industryText]
    .filter(Boolean)
    .join(' ');

  if (!classificationText || classificationText.length < 5) {
    return 8; // Default low score — no text to classify (was 13)
  }

  // Classify program using keyword-classifier
  // Pass combined description+contents as programName for keyword matching
  const classification: ClassificationResult = classifyProgram(
    titleText,
    [descText, contentsText, industryText].filter(Boolean).join(' ') || null,
    null // No ministry for SME programs (all from 중소벤처기업부)
  );

  // Get relevance between org industry and program classification
  const relevance = getIndustryRelevance(
    org.industrySector || null,
    classification.industry
  );

  // Scale relevance (0.0-1.0) to points (0-30)
  const score = Math.round(relevance * 30);

  if (relevance >= 0.8) {
    const label = getIndustryKoreanLabel(classification.industry);
    metCriteria.push(`업종 일치: ${label}`);
  } else if (relevance >= 0.5) {
    const label = getIndustryKoreanLabel(classification.industry);
    metCriteria.push(`관련 업종: ${label}`);
  }

  return score;
}

/**
 * Score deadline urgency (0-15 points)
 *
 * Ported from R&D matcher: closer deadlines get higher scores
 * to surface time-sensitive opportunities.
 * Production data: 63% fill rate for applicationEnd.
 */
function scoreDeadline(
  program: SMEProgram,
  metCriteria: string[]
): number {
  if (!program.applicationEnd) {
    return 5; // Default score if no deadline (37% of programs)
  }

  const now = new Date();
  const deadline = new Date(program.applicationEnd);
  const daysUntil = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntil < 0) {
    return 0; // Expired
  }

  if (daysUntil <= 7) {
    metCriteria.push(`마감 ${daysUntil}일 전 - 긴급`);
    return 15;
  }

  if (daysUntil <= 30) {
    metCriteria.push(`마감 ${daysUntil}일 전`);
    return 12;
  }

  if (daysUntil <= 60) {
    return 8;
  }

  return 5;
}

/**
 * Score financial relevance (0-2 points, was 0-5)
 *
 * Compares program maxSupportAmount to org revenueRange.
 * Sweet spot: support is 1-30% of annual revenue.
 * v2.1: Reduced from 5pts to 2pts — 0% fill rate for maxSupportAmount
 * means this always returns default. Minimizes dead-weight on score.
 */
function scoreFinancialRelevance(
  org: Organization,
  program: SMEProgram,
  metCriteria: string[]
): number {
  // Both fields needed for comparison
  if (!program.maxSupportAmount || !org.revenueRange) {
    return 1; // Default minimal score (0% fill rate for amounts)
  }

  const supportAmount = Number(program.maxSupportAmount);
  const revenueMidpoint = getRevenueMidpoint(org.revenueRange);

  if (revenueMidpoint === 0 || supportAmount === 0) {
    return 1;
  }

  const ratio = supportAmount / revenueMidpoint;

  if (ratio >= 0.01 && ratio <= 0.30) {
    metCriteria.push('지원 규모 적정');
    return 2; // Sweet spot
  }
  return 1; // Outside sweet spot
}

/**
 * Score sportType match (0-3 points, was 0-5)
 *
 * Maps program sportType (지원유형) to org needs.
 * Production data: 100% fill rate but 91% is "정보" (limited differentiation).
 * v2.1: Reduced from 5pts to 3pts — 91% "정보" makes this nearly useless.
 */
function scoreSportType(
  org: Organization,
  program: SMEProgram,
  metCriteria: string[]
): number {
  if (!program.sportType) return 1;

  switch (program.sportType) {
    case '기술개발':
      if (org.rdExperience) {
        metCriteria.push('기술개발 지원유형 적합');
        return 3;
      }
      return 1;

    case '창업':
      if (org.companyScaleType === 'STARTUP') return 3;
      return 1;

    case '수출지원':
      if (org.revenueRange && org.revenueRange !== 'NONE') return 3;
      return 1;

    case '정책자금':
      return 2;

    case '인력지원':
      return 2;

    case '스마트공장':
      if (org.industrySector?.toUpperCase() === 'MANUFACTURING') {
        metCriteria.push('제조업 - 스마트공장 지원 적합');
        return 3;
      }
      return 1;

    case '소상공인':
      if (org.companyScaleType === 'STARTUP' || org.revenueRange === 'NONE' || org.revenueRange === 'UNDER_1B') {
        return 3;
      }
      return 1;

    case '정보':
      // General information (91% of programs) → minimal score
      return 1;

    default:
      return 1;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Derive organization lifecycle stage from businessEstablishedDate + companyScaleType
 */
function deriveOrgLifecycle(org: Organization): 'startup' | 'growth' | null {
  if (org.companyScaleType === 'STARTUP') return 'startup';

  if (org.businessEstablishedDate) {
    const age = calculateBusinessAge(org.businessEstablishedDate);
    if (age !== null) {
      if (age < 3) return 'startup';
      return 'growth';
    }
  }

  return null;
}

/**
 * Get approximate revenue midpoint for a RevenueRange enum value
 * Values in KRW (won)
 */
function getRevenueMidpoint(range: RevenueRange): number {
  const midpoints: Record<RevenueRange, number> = {
    NONE: 0,
    UNDER_1B: 500_000_000,          // ~5억
    FROM_1B_TO_10B: 5_000_000_000,  // ~50억
    FROM_10B_TO_50B: 30_000_000_000, // ~300억
    FROM_50B_TO_100B: 75_000_000_000, // ~750억
    OVER_100B: 150_000_000_000,     // ~1,500억
  };
  return midpoints[range] || 0;
}

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
      bizType: 0,
      lifecycle: 0,
      industryContent: 0,
      deadline: 0,
      financialRelevance: 0,
      sportType: 0,
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
  // v2.1: Lowered thresholds — partial credit scoring produces lower averages
  const scoreDesc = score >= 75 ? '매우 적합' : score >= 55 ? '적합' : '부분 적합';
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
