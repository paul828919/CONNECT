/**
 * Eligibility Checking Module (Phase 2)
 *
 * Three-tier classification system for funding program eligibility:
 * - FULLY_ELIGIBLE: Meets all hard requirements + soft requirements
 * - CONDITIONALLY_ELIGIBLE: Meets hard requirements only (can apply, not preferred)
 * - INELIGIBLE: Fails any hard requirement (hidden from results)
 *
 * Hard Requirements (필수조건): Absolute disqualifiers
 * - Required certifications (e.g., INNO-BIZ, 벤처기업)
 * - Investment thresholds (e.g., ₩200M, ₩500M, ₩1B+ received investment)
 * - Employee count constraints (min/max employees)
 * - Revenue constraints (min/max revenue)
 * - Operating years requirements (min/max years in business)
 *
 * Soft Requirements (우대조건): Preferences, not disqualifiers
 * - Preferred certifications
 * - Prior grant wins
 * - Government certifications
 * - Industry awards
 *
 * Usage:
 * ```typescript
 * const result = checkEligibility(program, organization);
 * if (result.level === EligibilityLevel.INELIGIBLE) {
 *   // Skip program entirely
 * } else if (result.level === EligibilityLevel.FULLY_ELIGIBLE) {
 *   // Prioritize this match
 * }
 * ```
 */

import { organizations, funding_programs } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

type Organization = organizations;
type FundingProgram = funding_programs;

/**
 * Three-tier eligibility classification
 */
export enum EligibilityLevel {
  FULLY_ELIGIBLE = 'FULLY_ELIGIBLE',
  CONDITIONALLY_ELIGIBLE = 'CONDITIONALLY_ELIGIBLE',
  INELIGIBLE = 'INELIGIBLE',
}

/**
 * Result of eligibility check with detailed reasoning
 */
export interface EligibilityCheckResult {
  level: EligibilityLevel;
  hardRequirementsMet: boolean;
  softRequirementsMet: boolean;
  failedRequirements: string[]; // Korean descriptions of failed requirements
  metRequirements: string[]; // Korean descriptions of met requirements
  needsManualReview: boolean;
  manualReviewReason?: string;
}

/**
 * Investment history entry structure
 */
interface InvestmentHistoryEntry {
  date: string; // ISO date string
  amount: number; // KRW amount
  source: string; // VC name, government program, corporate investor, etc.
  verified: boolean; // Whether this investment has been verified by Connect team
}

/**
 * Main eligibility checking function
 *
 * Checks both hard requirements (disqualifiers) and soft requirements (preferences)
 * Returns three-tier classification with detailed reasoning for transparency
 */
export function checkEligibility(
  program: FundingProgram,
  organization: Organization
): EligibilityCheckResult {
  const failedRequirements: string[] = [];
  const metRequirements: string[] = [];
  let needsManualReview = false;
  let manualReviewReason: string | undefined;

  // ============================================================================
  // HARD REQUIREMENTS - Any failure = INELIGIBLE
  // ============================================================================

  // 1. Required Certifications (필수 인증)
  if (program.requiredCertifications && program.requiredCertifications.length > 0) {
    const orgCertifications = organization.certifications || [];
    const missingCerts = program.requiredCertifications.filter(
      (cert) => !orgCertifications.includes(cert)
    );

    if (missingCerts.length > 0) {
      failedRequirements.push(`필수 인증 미보유: ${missingCerts.join(', ')}`);
    } else {
      metRequirements.push(`필수 인증 보유: ${program.requiredCertifications.join(', ')}`);
    }
  }

  // 2. Investment Threshold (투자 유치 금액)
  if (program.requiredInvestmentAmount) {
    const requiredAmount = decimalToNumber(program.requiredInvestmentAmount);
    const totalInvestment = calculateTotalVerifiedInvestment(organization.investmentHistory);

    if (totalInvestment === null) {
      // No investment history recorded
      failedRequirements.push(
        `투자 유치 실적 미확인 (필요: ₩${requiredAmount.toLocaleString()})`
      );
      needsManualReview = true;
      manualReviewReason = '투자 유치 실적 정보 없음 - 사용자에게 투자 이력 입력 요청 필요';
    } else if (totalInvestment < requiredAmount) {
      failedRequirements.push(
        `투자 유치 금액 부족 (보유: ₩${totalInvestment.toLocaleString()}, 필요: ₩${requiredAmount.toLocaleString()})`
      );
    } else {
      metRequirements.push(
        `투자 유치 금액 충족 (보유: ₩${totalInvestment.toLocaleString()}, 필요: ₩${requiredAmount.toLocaleString()})`
      );
    }
  }

  // 3. Employee Count Constraints (직원 수)
  if (program.requiredMinEmployees || program.requiredMaxEmployees) {
    const orgEmployeeCount = getEmployeeCountMidpoint(organization.employeeCount);

    if (orgEmployeeCount === null) {
      failedRequirements.push('직원 수 정보 없음');
      needsManualReview = true;
      manualReviewReason = manualReviewReason || '직원 수 정보 미입력';
    } else {
      // Check minimum
      if (program.requiredMinEmployees && orgEmployeeCount < program.requiredMinEmployees) {
        failedRequirements.push(
          `최소 직원 수 미충족 (보유: ${orgEmployeeCount}명, 필요: ${program.requiredMinEmployees}명 이상)`
        );
      }

      // Check maximum
      if (program.requiredMaxEmployees && orgEmployeeCount > program.requiredMaxEmployees) {
        failedRequirements.push(
          `최대 직원 수 초과 (보유: ${orgEmployeeCount}명, 필요: ${program.requiredMaxEmployees}명 이하)`
        );
      }

      // Met requirement
      if (
        (!program.requiredMinEmployees || orgEmployeeCount >= program.requiredMinEmployees) &&
        (!program.requiredMaxEmployees || orgEmployeeCount <= program.requiredMaxEmployees)
      ) {
        metRequirements.push(`직원 수 충족 (${orgEmployeeCount}명)`);
      }
    }
  }

  // 4. Revenue Constraints (매출액)
  if (program.requiredMinRevenue || program.requiredMaxRevenue) {
    const orgRevenue = getRevenueMidpoint(organization.revenueRange);

    if (orgRevenue === null) {
      failedRequirements.push('매출액 정보 없음');
      needsManualReview = true;
      manualReviewReason = manualReviewReason || '매출액 정보 미입력';
    } else {
      // Check minimum
      if (program.requiredMinRevenue && orgRevenue < program.requiredMinRevenue) {
        failedRequirements.push(
          `최소 매출액 미충족 (보유: ₩${bigIntToString(orgRevenue)}, 필요: ₩${bigIntToString(program.requiredMinRevenue)} 이상)`
        );
      }

      // Check maximum
      if (program.requiredMaxRevenue && orgRevenue > program.requiredMaxRevenue) {
        failedRequirements.push(
          `최대 매출액 초과 (보유: ₩${bigIntToString(orgRevenue)}, 필요: ₩${bigIntToString(program.requiredMaxRevenue)} 이하)`
        );
      }

      // Met requirement
      if (
        (!program.requiredMinRevenue || orgRevenue >= program.requiredMinRevenue) &&
        (!program.requiredMaxRevenue || orgRevenue <= program.requiredMaxRevenue)
      ) {
        metRequirements.push(`매출액 충족 (₩${bigIntToString(orgRevenue)})`);
      }
    }
  }

  // 5. Operating Years Requirements (업력)
  if (program.requiredOperatingYears || program.maxOperatingYears) {
    const operatingYears = calculateOperatingYears(organization.businessEstablishedDate);

    if (operatingYears === null) {
      failedRequirements.push('설립일 정보 없음');
      needsManualReview = true;
      manualReviewReason = manualReviewReason || '사업자 설립일 정보 미입력';
    } else {
      // Check minimum
      if (program.requiredOperatingYears && operatingYears < program.requiredOperatingYears) {
        failedRequirements.push(
          `최소 업력 미충족 (보유: ${operatingYears}년, 필요: ${program.requiredOperatingYears}년 이상)`
        );
      }

      // Check maximum
      if (program.maxOperatingYears && operatingYears > program.maxOperatingYears) {
        failedRequirements.push(
          `최대 업력 초과 (보유: ${operatingYears}년, 필요: ${program.maxOperatingYears}년 이하)`
        );
      }

      // Met requirement
      if (
        (!program.requiredOperatingYears || operatingYears >= program.requiredOperatingYears) &&
        (!program.maxOperatingYears || operatingYears <= program.maxOperatingYears)
      ) {
        metRequirements.push(`업력 충족 (${operatingYears}년)`);
      }
    }
  }

  // ============================================================================
  // SOFT REQUIREMENTS - Preferences, not disqualifiers
  // ============================================================================

  let softRequirementsMet = false;

  // 1. Preferred Certifications (우대 인증)
  if (program.preferredCertifications && program.preferredCertifications.length > 0) {
    const orgCertifications = [
      ...(organization.certifications || []),
      ...(organization.governmentCertifications || []),
    ];

    const matchedPreferredCerts = program.preferredCertifications.filter((cert) =>
      orgCertifications.includes(cert)
    );

    if (matchedPreferredCerts.length > 0) {
      metRequirements.push(`우대 인증 보유: ${matchedPreferredCerts.join(', ')}`);
      softRequirementsMet = true;
    }
  }

  // 2. Prior Grant Wins (정부지원 수혜 실적)
  if (organization.priorGrantWins && organization.priorGrantWins > 0) {
    metRequirements.push(`정부지원 수혜 실적: ${organization.priorGrantWins}건`);
    softRequirementsMet = true;
  }

  // 3. Industry Awards (수상 경력)
  if (organization.industryAwards && organization.industryAwards.length > 0) {
    metRequirements.push(`수상 경력: ${organization.industryAwards.length}건`);
    softRequirementsMet = true;
  }

  // ============================================================================
  // FINAL CLASSIFICATION
  // ============================================================================

  const hardRequirementsMet = failedRequirements.length === 0;

  let level: EligibilityLevel;

  if (!hardRequirementsMet) {
    level = EligibilityLevel.INELIGIBLE;
  } else if (softRequirementsMet) {
    level = EligibilityLevel.FULLY_ELIGIBLE;
  } else {
    level = EligibilityLevel.CONDITIONALLY_ELIGIBLE;
  }

  return {
    level,
    hardRequirementsMet,
    softRequirementsMet,
    failedRequirements,
    metRequirements,
    needsManualReview,
    manualReviewReason,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate total verified investment from investment history JSON
 * Returns null if no investment history recorded
 */
function calculateTotalVerifiedInvestment(
  investmentHistoryJson: any
): number | null {
  if (!investmentHistoryJson) {
    return null;
  }

  try {
    const history = Array.isArray(investmentHistoryJson)
      ? investmentHistoryJson
      : JSON.parse(investmentHistoryJson);

    if (!Array.isArray(history) || history.length === 0) {
      return null;
    }

    // Sum only verified investments
    const total = history
      .filter((entry: InvestmentHistoryEntry) => entry.verified === true)
      .reduce((sum: number, entry: InvestmentHistoryEntry) => sum + entry.amount, 0);

    return total;
  } catch (error) {
    console.error('Failed to parse investment history:', error);
    return null;
  }
}

/**
 * Calculate operating years from business establishment date
 * Returns null if date not provided
 */
function calculateOperatingYears(establishedDate: Date | null): number | null {
  if (!establishedDate) {
    return null;
  }

  const now = new Date();
  const established = new Date(establishedDate);
  const diffInMs = now.getTime() - established.getTime();
  const diffInYears = diffInMs / (1000 * 60 * 60 * 24 * 365.25);

  return Math.floor(diffInYears);
}

/**
 * Get midpoint value from employee count enum
 * Returns null if no employee count provided
 */
function getEmployeeCountMidpoint(
  employeeCount: string | null
): number | null {
  if (!employeeCount) {
    return null;
  }

  // Enum values from schema: UNDER_10, FROM_10_TO_50, FROM_50_TO_100, FROM_100_TO_300, OVER_300
  const midpoints: Record<string, number> = {
    UNDER_10: 5,
    FROM_10_TO_50: 30,
    FROM_50_TO_100: 75,
    FROM_100_TO_300: 200,
    OVER_300: 500,
  };

  return midpoints[employeeCount] || null;
}

/**
 * Get midpoint value from revenue range enum
 * Returns null if no revenue range provided
 */
function getRevenueMidpoint(
  revenueRange: string | null
): bigint | null {
  if (!revenueRange) {
    return null;
  }

  // Enum values from schema: UNDER_1B, FROM_1B_TO_10B, FROM_10B_TO_50B, FROM_50B_TO_100B, OVER_100B
  const midpoints: Record<string, bigint> = {
    UNDER_1B: BigInt(500_000_000), // 500M KRW
    FROM_1B_TO_10B: BigInt(5_000_000_000), // 5B KRW
    FROM_10B_TO_50B: BigInt(30_000_000_000), // 30B KRW
    FROM_50B_TO_100B: BigInt(75_000_000_000), // 75B KRW
    OVER_100B: BigInt(150_000_000_000), // 150B KRW
  };

  return midpoints[revenueRange] || null;
}

/**
 * Convert Prisma Decimal to number for comparison
 */
function decimalToNumber(decimal: Decimal): number {
  return parseFloat(decimal.toString());
}

/**
 * Format BigInt to readable Korean currency string
 */
function bigIntToString(value: bigint): string {
  const num = Number(value);
  if (num >= 1_000_000_000_000) {
    return `${(num / 1_000_000_000_000).toFixed(1)}조`;
  }
  if (num >= 100_000_000) {
    return `${(num / 100_000_000).toFixed(1)}억`;
  }
  return num.toLocaleString();
}
