/**
 * Enhanced Korean Explanation Generator for SME Program Matches (v2.0)
 *
 * Converts SME match results into rich, contextualized Korean explanations.
 * Unlike the R&D explainer which maps reason codes, this generator builds
 * explanations from the 12-factor score breakdown, producing domain-specific
 * insights for bizType, lifecycle, financial relevance, deadline urgency, and
 * industry content matching.
 *
 * Usage:
 *   import { generateSMEExplanation } from './sme-explainer';
 *   const explanation = generateSMEExplanation(matchResult, org, program);
 */

import { sme_programs, organizations, CompanyLocation } from '@prisma/client';
import { SMEMatchResult, SMEScoreBreakdown, SMEMatchExplanation } from './sme-algorithm';
import { getIndustryKoreanLabel, classifyProgram } from './keyword-classifier';

type SMEProgram = sme_programs;
type Organization = organizations & {
  locations?: CompanyLocation[];
};

// ============================================================================
// Main Explanation Generator
// ============================================================================

/**
 * Generate enhanced Korean explanation for an SME match result.
 *
 * Produces richer, more actionable explanations than the inline builder
 * in sme-algorithm.ts by analyzing the full score breakdown.
 *
 * @param matchResult - Match result from generateSMEMatches()
 * @param org - Organization with locations
 * @param program - SME program
 * @returns Enhanced explanation with summary, reasons, warnings, recommendations
 */
export function generateSMEExplanation(
  matchResult: SMEMatchResult,
  org: Organization,
  program: SMEProgram
): SMEMatchExplanation {
  const reasons: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];
  const { scoreBreakdown, score, eligibilityLevel } = matchResult;

  // Build summary
  const summary = buildEnhancedSummary(program, score, eligibilityLevel);

  // Generate reasons from score breakdown
  generateBizTypeReason(scoreBreakdown, program, org, reasons);
  generateIndustryContentReason(scoreBreakdown, program, reasons);
  generateDeadlineReason(scoreBreakdown, program, reasons, warnings);
  generateFinancialReason(scoreBreakdown, program, reasons);
  generateLifecycleReason(scoreBreakdown, program, org, reasons);
  generateSportTypeReason(scoreBreakdown, program, org, reasons);
  generateEligibilityReasons(scoreBreakdown, matchResult.metCriteria, reasons);

  // Generate warnings from match result + program data
  generateProgramWarnings(program, warnings);
  generateProfileWarnings(scoreBreakdown, org, warnings);

  // Generate actionable recommendations
  generateRecommendations(score, scoreBreakdown, program, org, recommendations);

  return {
    summary,
    reasons: reasons.length > 0 ? reasons : ['이 프로그램에 지원 가능한 기업입니다.'],
    warnings,
    recommendations,
  };
}

// ============================================================================
// Summary Builder
// ============================================================================

function buildEnhancedSummary(
  program: SMEProgram,
  score: number,
  eligibility: string
): string {
  const institution = program.supportInstitution || '중소벤처기업부';
  const title = program.title || '지원사업';

  if (score >= 80) {
    return `${institution}의 「${title}」은(는) 귀사에 매우 적합한 지원사업입니다. 적극적인 신청을 권장드립니다.`;
  }
  if (score >= 65) {
    return `${institution}의 「${title}」은(는) 귀사에 적합한 지원사업입니다.${eligibility === 'CONDITIONALLY_ELIGIBLE' ? ' 일부 조건 확인이 필요합니다.' : ''}`;
  }
  if (score >= 50) {
    return `${institution}의 「${title}」은(는) 귀사에 부분적으로 적합합니다. 세부 요건을 확인하세요.`;
  }
  return `${institution}의 「${title}」은(는) 적합도가 낮으나 지원 가능합니다. 프로필 업데이트로 적합도를 높일 수 있습니다.`;
}

// ============================================================================
// Reason Generators (one per scoring dimension)
// ============================================================================

/**
 * bizType match reason (25pt dimension - best differentiator)
 */
function generateBizTypeReason(
  breakdown: SMEScoreBreakdown,
  program: SMEProgram,
  org: Organization,
  reasons: string[]
): void {
  if (!program.bizType) return;

  const score = breakdown.bizType;
  const bizType = program.bizType;

  if (score >= 20) {
    // Strong match
    const matchDetail = getBizTypeMatchDetail(bizType, org);
    reasons.push(`✓ ${bizType} 지원 유형으로 귀사에 적합합니다.${matchDetail ? ` (${matchDetail})` : ''}`);
  } else if (score >= 13) {
    reasons.push(`${bizType} 지원 유형의 프로그램입니다.`);
  } else if (score < 10 && score > 0) {
    reasons.push(`${bizType} 지원 유형으로 귀사의 특성과 다소 차이가 있습니다.`);
  }
}

function getBizTypeMatchDetail(bizType: string, org: Organization): string | null {
  switch (bizType) {
    case '기술':
      if (org.rdExperience) return 'R&D 경험 보유';
      return null;
    case '금융':
      if (org.companyScaleType === 'STARTUP') return '창업기업 대상';
      if (org.companyScaleType === 'SME') return '중소기업 대상';
      return null;
    case '창업':
      if (org.companyScaleType === 'STARTUP') return '창업기업';
      return null;
    case '수출':
      if (org.revenueRange && org.revenueRange !== 'NONE') return '매출 보유 기업';
      return null;
    case '중견':
      if (org.companyScaleType === 'MID_SIZED') return '중견기업 대상';
      return null;
    default:
      return null;
  }
}

/**
 * Industry/content match reason (25pt dimension)
 */
function generateIndustryContentReason(
  breakdown: SMEScoreBreakdown,
  program: SMEProgram,
  reasons: string[]
): void {
  const score = breakdown.industryContent;

  if (score >= 20) {
    // Classify program to get its industry label
    const label = classifyAndGetLabel(program);
    if (label) {
      reasons.push(`✓ ${label} 분야 프로그램으로 귀사의 업종과 높은 연관성이 있습니다.`);
    } else {
      reasons.push('✓ 귀사의 업종과 높은 연관성이 있는 프로그램입니다.');
    }
  } else if (score >= 13) {
    const label = classifyAndGetLabel(program);
    if (label) {
      reasons.push(`${label} 분야 관련 프로그램입니다.`);
    }
  }
}

function classifyAndGetLabel(program: SMEProgram): string | null {
  const titleText = program.title || '';
  const descText = program.description || '';
  const contentsText = program.supportContents || '';
  const industryText = program.targetIndustry || '';

  const combinedText = [titleText, descText, contentsText, industryText].filter(Boolean).join(' ');
  if (combinedText.length < 5) return null;

  const classification = classifyProgram(
    titleText,
    [descText, contentsText, industryText].filter(Boolean).join(' ') || null,
    null
  );

  return getIndustryKoreanLabel(classification.industry);
}

/**
 * Deadline urgency reason (15pt dimension)
 */
function generateDeadlineReason(
  breakdown: SMEScoreBreakdown,
  program: SMEProgram,
  reasons: string[],
  warnings: string[]
): void {
  if (!program.applicationEnd) {
    return; // No deadline info
  }

  const deadline = new Date(program.applicationEnd);
  const now = new Date();
  const daysUntil = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const deadlineStr = deadline.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  if (daysUntil <= 0) {
    warnings.push(`마감일 경과 (${deadlineStr}) - 다음 모집 시기를 확인하세요.`);
    return;
  }

  if (daysUntil <= 7) {
    warnings.push(`⚠️ 마감 ${daysUntil}일 전 (${deadlineStr}) - 신속한 신청이 필요합니다.`);
  } else if (daysUntil <= 30) {
    reasons.push(`마감일: ${deadlineStr} (${daysUntil}일 남음) - 서류 준비를 시작하세요.`);
  } else if (daysUntil <= 60) {
    reasons.push(`마감일: ${deadlineStr} (${daysUntil}일 남음)`);
  } else {
    reasons.push(`마감일: ${deadlineStr} - 충분한 준비 기간이 있습니다.`);
  }
}

/**
 * Financial relevance reason (5pt dimension)
 */
function generateFinancialReason(
  breakdown: SMEScoreBreakdown,
  program: SMEProgram,
  reasons: string[]
): void {
  if (!program.maxSupportAmount) return;

  const amount = Number(program.maxSupportAmount);
  if (amount <= 0) return;

  const amountText = formatKRWAmount(amount);
  const score = breakdown.financialRelevance;

  if (score >= 4) {
    reasons.push(`💰 최대 ${amountText} 지원 가능 (귀사 매출 규모 대비 적정)`)
  } else {
    reasons.push(`💰 최대 ${amountText} 지원 가능`);
  }

  // Add interest rate info if available
  if (program.minInterestRate !== null || program.maxInterestRate !== null) {
    const minRate = program.minInterestRate !== null ? Number(program.minInterestRate) : null;
    const maxRate = program.maxInterestRate !== null ? Number(program.maxInterestRate) : null;
    const rateText = formatInterestRate(minRate, maxRate);
    if (rateText) {
      reasons.push(`금리: ${rateText}`);
    }
  }
}

/**
 * Lifecycle match reason (5pt dimension)
 */
function generateLifecycleReason(
  breakdown: SMEScoreBreakdown,
  program: SMEProgram,
  org: Organization,
  reasons: string[]
): void {
  const score = breakdown.lifecycle;
  if (score < 4) return; // Only show for strong matches

  const hasLifecycle = program.lifeCycle && program.lifeCycle.length > 0;
  const fromBizType = !hasLifecycle && program.bizType === '창업';

  if (score >= 4) {
    if (org.companyScaleType === 'STARTUP' || fromBizType) {
      reasons.push('창업기 기업 대상 프로그램으로 귀사의 생애주기에 부합합니다.');
    } else if (hasLifecycle) {
      const lifecycleText = program.lifeCycle!
        .map(lc => lc.includes('창업') ? '창업기' : lc.includes('성장') ? '성장기' : lc)
        .join(', ');
      reasons.push(`기업 생애주기(${lifecycleText}) 대상 프로그램입니다.`);
    }
  }
}

/**
 * sportType match reason (5pt dimension)
 */
function generateSportTypeReason(
  breakdown: SMEScoreBreakdown,
  program: SMEProgram,
  org: Organization,
  reasons: string[]
): void {
  if (!program.sportType || program.sportType === '정보') return; // Skip generic '정보'
  if (breakdown.sportType < 4) return; // Only show for matches

  const sportTypeLabels: Record<string, string> = {
    '기술개발': '기술개발 지원',
    '창업': '창업 지원',
    '수출지원': '수출 지원',
    '정책자금': '정책자금 지원',
    '인력지원': '인력 지원',
    '스마트공장': '스마트공장 구축 지원',
    '소상공인': '소상공인 지원',
  };

  const label = sportTypeLabels[program.sportType] || program.sportType;
  reasons.push(`${label} 유형의 프로그램입니다.`);
}

/**
 * Eligibility factor reasons (from metCriteria)
 */
function generateEligibilityReasons(
  breakdown: SMEScoreBreakdown,
  metCriteria: string[],
  reasons: string[]
): void {
  // Add key eligibility met-criteria not already covered
  const eligibilityItems = metCriteria.filter(c =>
    c.includes('기업규모') ||
    c.includes('매출액') ||
    c.includes('종업원수') ||
    c.includes('업력') ||
    c.includes('지역') ||
    c.includes('인증')
  );

  for (const item of eligibilityItems) {
    reasons.push(`✓ ${item}`);
  }
}

// ============================================================================
// Warning Generators
// ============================================================================

function generateProgramWarnings(program: SMEProgram, warnings: string[]): void {
  if (program.isRestart) {
    warnings.push('재창업/재기 기업 대상 프로그램입니다. 해당 여부를 확인하세요.');
  }

  if (program.isFemaleOwner) {
    warnings.push('여성 대표 기업 대상 프로그램입니다. 해당 여부를 확인하세요.');
  }

  if (program.minCeoAge || program.maxCeoAge) {
    const ageRange = program.minCeoAge && program.maxCeoAge
      ? `${program.minCeoAge}~${program.maxCeoAge}세`
      : program.minCeoAge
        ? `${program.minCeoAge}세 이상`
        : `${program.maxCeoAge}세 이하`;
    warnings.push(`대표자 연령 제한이 있습니다: ${ageRange}`);
  }

  // Application URL availability
  if (!program.applicationUrl && !program.detailUrl) {
    warnings.push('온라인 신청 링크가 없습니다. 지원기관에 직접 문의가 필요할 수 있습니다.');
  }
}

function generateProfileWarnings(
  breakdown: SMEScoreBreakdown,
  org: Organization,
  warnings: string[]
): void {
  // Profile completeness warnings (factors where score is low due to missing data)
  const missingFields: string[] = [];

  if (!org.companyScaleType && breakdown.companyScale < 15) {
    missingFields.push('기업규모');
  }
  if (!org.revenueRange && breakdown.revenueRange < 10) {
    missingFields.push('매출액');
  }
  if (!org.employeeCount && breakdown.employeeCount < 8) {
    missingFields.push('종업원수');
  }
  if (!org.businessEstablishedDate && breakdown.businessAge < 8) {
    missingFields.push('설립일');
  }
  if (!org.industrySector && breakdown.industryContent < 15) {
    missingFields.push('업종');
  }

  if (missingFields.length > 0) {
    warnings.push(
      `프로필 미완성: ${missingFields.join(', ')} 정보를 입력하면 더 정확한 매칭이 가능합니다.`
    );
  }
}

// ============================================================================
// Recommendation Generator
// ============================================================================

function generateRecommendations(
  score: number,
  breakdown: SMEScoreBreakdown,
  program: SMEProgram,
  org: Organization,
  recommendations: string[]
): void {
  // Score-based primary recommendation
  if (score >= 80) {
    recommendations.push('이 프로그램은 귀사에 매우 적합합니다. 빠른 신청을 권장드립니다.');
  } else if (score >= 65) {
    recommendations.push('적합도가 높은 프로그램입니다. 공고문을 상세히 검토하고 지원서류를 준비하세요.');
  } else if (score >= 50) {
    recommendations.push('세부 지원 요건을 공고문에서 확인한 후 지원을 검토하세요.');
  } else {
    recommendations.push('프로필 정보를 업데이트하면 적합도가 향상될 수 있습니다.');
  }

  // Deadline-based urgency
  if (program.applicationEnd) {
    const deadline = new Date(program.applicationEnd);
    const daysUntil = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysUntil > 0 && daysUntil <= 14) {
      recommendations.push(`마감까지 ${daysUntil}일 남았습니다. 서류 준비를 서두르세요.`);
    }
  }

  // Profile improvement suggestions
  if (breakdown.industryContent < 13 && !org.industrySector) {
    recommendations.push('프로필에 업종 정보를 추가하면 업종 기반 매칭 정확도가 향상됩니다.');
  }

  if (breakdown.bizType < 13 && program.bizType === '기술' && !org.rdExperience) {
    recommendations.push('R&D 경험 정보를 프로필에 추가하면 기술지원사업 매칭이 개선됩니다.');
  }

  // Application link
  if (program.applicationUrl) {
    recommendations.push('온라인 신청이 가능합니다.');
  } else if (program.detailUrl) {
    recommendations.push('공고 상세 페이지에서 신청 방법을 확인하세요.');
  }
}

// ============================================================================
// Formatting Helpers
// ============================================================================

function formatKRWAmount(amount: number): string {
  if (amount >= 100_000_000) {
    const billions = Math.floor(amount / 100_000_000);
    const remainder = amount % 100_000_000;
    if (remainder > 0) {
      const millions = Math.floor(remainder / 10_000);
      return millions > 0 ? `${billions}억 ${millions}만원` : `${billions}억원`;
    }
    return `${billions}억원`;
  }
  if (amount >= 10_000) {
    return `${Math.floor(amount / 10_000)}만원`;
  }
  return `${amount.toLocaleString()}원`;
}

function formatInterestRate(
  min: number | null,
  max: number | null
): string | null {
  if (min !== null && max !== null) {
    if (min === max) return `${min}%`;
    return `${min}~${max}%`;
  }
  if (min !== null) return `${min}% 이상`;
  if (max !== null) return `최대 ${max}%`;
  return null;
}

// ============================================================================
// Batch Explanation Generator
// ============================================================================

/**
 * Generate explanations for a batch of match results.
 * Useful for enriching all matches after generation.
 *
 * @param matchResults - Array of match results
 * @param org - Organization
 * @returns Match results with enhanced explanations
 */
export function enrichMatchExplanations(
  matchResults: SMEMatchResult[],
  org: Organization
): SMEMatchResult[] {
  return matchResults.map(result => ({
    ...result,
    explanation: generateSMEExplanation(result, org, result.program),
  }));
}
