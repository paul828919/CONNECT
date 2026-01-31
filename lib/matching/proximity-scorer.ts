/**
 * Proximity Scoring Algorithm (v5.0)
 * Phase 4.1: Ideal Profile Construction & Proximity Matching
 *
 * Measures distance between an organization profile and an ideal
 * applicant profile. Total: 100 points across 7 dimensions.
 *
 * Key difference from v4.4: This scores "how close is this org to
 * the ideal applicant?" rather than "do these fields overlap?"
 *
 * Scoring breakdown:
 *   Domain Fit:       30 pts — org domain vs ideal sub-domains
 *   Technology Fit:   20 pts — TRL distance + keyword overlap
 *   Organization Fit: 15 pts — scale, business age, stage match
 *   Capability Fit:   15 pts — expected capabilities vs org profile
 *   Compliance Fit:   10 pts — hard requirements (certs, structure)
 *   Financial Fit:     5 pts — revenue range alignment
 *   Deadline Urgency:  5 pts — deadline proximity (preserved from v4.4)
 */

import {
  organizations,
  EmployeeCountRange,
  RevenueRange,
  CompanyScaleType,
} from '@prisma/client';
import {
  IdealApplicantProfile,
  ProximityScore,
  ProximityGap,
  CompanyScalePreference,
} from './ideal-profile';
import {
  getIndustryRelevance,
  type IndustryCategory,
} from './keyword-classifier';

// ═══════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════

export const PROXIMITY_ALGORITHM_VERSION = '5.0.0';

const WEIGHTS = {
  domainFit: 30,
  technologyFit: 20,
  organizationFit: 15,
  capabilityFit: 15,
  complianceFit: 10,
  financialFit: 5,
  deadlineUrgency: 5,
} as const;

// ═══════════════════════════════════════════════════════════════
// Type Helpers
// ═══════════════════════════════════════════════════════════════

type Organization = organizations;

/** Revenue range to numeric value mapping (in 억 KRW) */
const REVENUE_MAP: Record<RevenueRange, { min: number; max: number }> = {
  NONE: { min: 0, max: 0 },
  UNDER_1B: { min: 0, max: 10 },
  FROM_1B_TO_10B: { min: 10, max: 100 },
  FROM_10B_TO_50B: { min: 100, max: 500 },
  FROM_50B_TO_100B: { min: 500, max: 1000 },
  OVER_100B: { min: 1000, max: 10000 },
};

/** Employee count range to numeric mapping */
const EMPLOYEE_MAP: Record<EmployeeCountRange, { min: number; max: number }> = {
  UNDER_10: { min: 0, max: 10 },
  FROM_10_TO_50: { min: 10, max: 50 },
  FROM_50_TO_100: { min: 50, max: 100 },
  FROM_100_TO_300: { min: 100, max: 300 },
  OVER_300: { min: 300, max: 10000 },
};

/** Map CompanyScaleType to CompanyScalePreference */
const SCALE_TYPE_MAP: Record<CompanyScaleType, CompanyScalePreference> = {
  STARTUP: 'STARTUP',
  SME: 'SMALL_MEDIUM',
  MID_SIZED: 'MEDIUM',
  LARGE_ENTERPRISE: 'LARGE',
};

/** Scale proximity — how close two scales are (0-1) */
const SCALE_ORDER: CompanyScalePreference[] = ['MICRO', 'STARTUP', 'SMALL', 'SMALL_MEDIUM', 'MEDIUM', 'LARGE'];

function scaleDistance(a: CompanyScalePreference, b: CompanyScalePreference): number {
  const idxA = SCALE_ORDER.indexOf(a);
  const idxB = SCALE_ORDER.indexOf(b);
  if (idxA === -1 || idxB === -1) return 0.5;
  const maxDist = SCALE_ORDER.length - 1;
  return 1 - Math.abs(idxA - idxB) / maxDist;
}

// ═══════════════════════════════════════════════════════════════
// Dimension Scorers
// ═══════════════════════════════════════════════════════════════

/**
 * Domain Fit (0-30): How well does the org's domain match the ideal profile?
 */
function scoreDomainFit(
  org: Organization,
  ideal: IdealApplicantProfile
): { score: number; explanation: string } {
  let score = 0;
  const reasons: string[] = [];

  // 1. Primary domain match (0-15)
  if (ideal.primaryDomain && org.industrySector) {
    const relevance = getIndustryRelevance(org.industrySector, ideal.primaryDomain as IndustryCategory);
    const domainScore = relevance * 15;
    score += domainScore;
    if (relevance >= 0.8) {
      reasons.push(`주요 산업분야 일치 (${ideal.primaryDomain})`);
    } else if (relevance >= 0.4) {
      reasons.push(`관련 산업분야 (${ideal.primaryDomain} ↔ ${org.industrySector})`);
    }
  } else if (!ideal.primaryDomain) {
    // No domain requirement → partial credit
    score += 7;
  }

  // 2. Sub-domain overlap (0-10)
  if (ideal.subDomains && ideal.subDomains.length > 0) {
    const orgKeywords = [
      ...(org.keyTechnologies || []),
      ...(org.technologyDomainsSpecific || []),
      ...(org.researchFocusAreas || []),
      org.primaryBusinessDomain || '',
      org.industrySector || '',
    ].map(k => k.toLowerCase());

    let subDomainMatches = 0;
    for (const sd of ideal.subDomains) {
      const sdLower = sd.toLowerCase();
      if (orgKeywords.some(k => k.includes(sdLower) || sdLower.includes(k))) {
        subDomainMatches++;
      }
    }

    const subDomainScore = (subDomainMatches / ideal.subDomains.length) * 10;
    score += subDomainScore;
    if (subDomainMatches > 0) {
      reasons.push(`세부분야 ${subDomainMatches}/${ideal.subDomains.length} 일치`);
    }
  } else {
    score += 5; // No sub-domain requirement → partial credit
  }

  // 3. Technology keyword overlap (0-5)
  if (ideal.technologyKeywords && ideal.technologyKeywords.length > 0) {
    const orgTech = [
      ...(org.keyTechnologies || []),
      ...(org.technologyDomainsSpecific || []),
      ...(org.researchFocusAreas || []),
    ].map(k => k.toLowerCase());

    let techMatches = 0;
    for (const tk of ideal.technologyKeywords) {
      if (orgTech.some(k => k.includes(tk.toLowerCase()) || tk.toLowerCase().includes(k))) {
        techMatches++;
      }
    }

    const techScore = Math.min(5, (techMatches / ideal.technologyKeywords.length) * 5);
    score += techScore;
  } else {
    score += 2.5;
  }

  const explanation = reasons.length > 0
    ? reasons.join('; ')
    : '산업분야 정보 부족';

  return { score: Math.min(WEIGHTS.domainFit, score), explanation };
}

/**
 * Technology Fit (0-20): TRL distance + technology alignment
 */
function scoreTechnologyFit(
  org: Organization,
  ideal: IdealApplicantProfile
): { score: number; explanation: string } {
  let score = 0;
  const reasons: string[] = [];

  // 1. TRL proximity (0-12)
  if (ideal.trlRange && org.technologyReadinessLevel) {
    const orgTrl = org.technologyReadinessLevel;
    const idealCenter = ideal.trlRange.idealCenter ?? Math.round(((ideal.trlRange.min ?? 1) + (ideal.trlRange.max ?? 9)) / 2);

    // Score based on distance from ideal center
    const distance = Math.abs(orgTrl - idealCenter);
    if (distance === 0) {
      score += 12;
      reasons.push(`기술성숙도(TRL ${orgTrl})가 이상적 수준과 정확히 일치`);
    } else if (distance <= 1) {
      score += 10;
      reasons.push(`기술성숙도(TRL ${orgTrl})가 이상적 수준(${idealCenter})에 근접`);
    } else if (distance <= 2) {
      score += 7;
    } else if (distance <= 3) {
      score += 4;
    } else {
      score += 1;
      reasons.push(`기술성숙도 차이가 큼 (TRL ${orgTrl} vs 이상 ${idealCenter})`);
    }

    // Also check target research TRL if available
    if (org.targetResearchTRL) {
      const targetDist = Math.abs(org.targetResearchTRL - idealCenter);
      if (targetDist <= 1) {
        score += 2; // bonus for research alignment
        reasons.push(`목표 연구 TRL도 부합`);
      }
    }
  } else if (!ideal.trlRange) {
    score += 8; // No TRL requirement → partial credit
  } else {
    score += 3; // Org missing TRL info
  }

  // 2. R&D experience alignment (0-4)
  if (ideal.programStage) {
    const isResearchStage = ['BASIC_RESEARCH', 'APPLIED_RESEARCH'].includes(ideal.programStage);
    if (isResearchStage && org.rdExperience) {
      score += 4;
      reasons.push('R&D 수행 경험 보유');
    } else if (!isResearchStage) {
      score += 2; // Non-research stages don't need R&D experience
    }
  } else {
    score += 2;
  }

  // 3. Tech keyword match bonus (0-4)
  if (ideal.technologyKeywords && ideal.technologyKeywords.length > 0 && org.keyTechnologies.length > 0) {
    const orgTechLower = org.keyTechnologies.map(k => k.toLowerCase());
    let matches = 0;
    for (const tk of ideal.technologyKeywords) {
      if (orgTechLower.some(k => k.includes(tk.toLowerCase()))) {
        matches++;
      }
    }
    score += Math.min(4, (matches / ideal.technologyKeywords.length) * 4);
  }

  return {
    score: Math.min(WEIGHTS.technologyFit, score),
    explanation: reasons.length > 0 ? reasons.join('; ') : '기술 적합성 정보 부족',
  };
}

/**
 * Organization Fit (0-15): Scale, age, stage match
 */
function scoreOrganizationFit(
  org: Organization,
  ideal: IdealApplicantProfile
): { score: number; explanation: string } {
  let score = 0;
  const reasons: string[] = [];

  // 1. Company scale match (0-6)
  if (ideal.preferredScales && ideal.preferredScales.length > 0 && org.companyScaleType) {
    const orgScale = SCALE_TYPE_MAP[org.companyScaleType];
    if (ideal.preferredScales.includes(orgScale)) {
      score += 6;
      reasons.push('기업규모 우대조건 충족');
    } else if (ideal.acceptableScales?.includes(orgScale)) {
      score += 4;
      reasons.push('기업규모 허용범위 내');
    } else {
      // Proximity-based partial credit
      const bestProximity = Math.max(
        ...ideal.preferredScales.map(ps => scaleDistance(orgScale, ps))
      );
      score += bestProximity * 3;
    }
  } else {
    score += 3; // No scale requirement
  }

  // 2. Business age match (0-5)
  if (ideal.businessAge && org.businessEstablishedDate) {
    const yearsInBusiness = Math.floor(
      (Date.now() - org.businessEstablishedDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    );

    const minAge = ideal.businessAge.minYears ?? 0;
    const maxAge = ideal.businessAge.maxYears ?? 100;

    if (yearsInBusiness >= minAge && yearsInBusiness <= maxAge) {
      score += 5;
      reasons.push(`업력 ${yearsInBusiness}년 — 요건 부합`);
    } else if (yearsInBusiness < minAge) {
      const gap = minAge - yearsInBusiness;
      score += Math.max(0, 5 - gap);
    } else {
      const gap = yearsInBusiness - maxAge;
      score += Math.max(0, 5 - gap);
    }
  } else if (!ideal.businessAge) {
    score += 3;
  }

  // 3. Organization type match (0-4)
  if (ideal.organizationTypes && ideal.organizationTypes.length > 0) {
    const orgType = String(org.type);
    if (ideal.organizationTypes.includes(orgType)) {
      score += 4;
      reasons.push('조직유형 일치');
    } else {
      score += 1;
    }
  } else {
    score += 2;
  }

  return {
    score: Math.min(WEIGHTS.organizationFit, score),
    explanation: reasons.length > 0 ? reasons.join('; ') : '조직 적합성 정보 부족',
  };
}

/**
 * Capability Fit (0-15): Expected capabilities matched by org
 */
function scoreCapabilityFit(
  org: Organization,
  ideal: IdealApplicantProfile
): { score: number; explanation: string } {
  let score = 0;
  const reasons: string[] = [];

  if (!ideal.expectedCapabilities || ideal.expectedCapabilities.length === 0) {
    return { score: 8, explanation: '특별한 역량 요건 없음' }; // Partial credit when no requirement
  }

  // Build org capability text for matching
  const orgCapabilities = [
    ...(org.keyTechnologies || []),
    ...(org.certifications || []),
    ...(org.governmentCertifications || []),
    ...(org.commercializationCapabilities || []),
    ...(org.technologyDomainsSpecific || []),
    ...(org.researchFocusAreas || []),
    org.description || '',
    org.primaryBusinessDomain || '',
  ].map(c => c.toLowerCase());

  let matched = 0;
  const matchedCaps: string[] = [];
  const missingCaps: string[] = [];

  for (const cap of ideal.expectedCapabilities) {
    const capLower = cap.toLowerCase();
    // Check if any org capability matches (fuzzy: includes check)
    const isMatched = orgCapabilities.some(oc =>
      oc.includes(capLower) || capLower.includes(oc)
    );
    if (isMatched) {
      matched++;
      matchedCaps.push(cap);
    } else {
      missingCaps.push(cap);
    }
  }

  const ratio = matched / ideal.expectedCapabilities.length;
  score = ratio * WEIGHTS.capabilityFit;

  if (matchedCaps.length > 0) {
    reasons.push(`기대역량 ${matched}/${ideal.expectedCapabilities.length} 충족 (${matchedCaps.slice(0, 3).join(', ')})`);
  }
  if (missingCaps.length > 0 && missingCaps.length <= 3) {
    reasons.push(`부족: ${missingCaps.join(', ')}`);
  }

  return {
    score: Math.min(WEIGHTS.capabilityFit, score),
    explanation: reasons.length > 0 ? reasons.join('; ') : '역량 정보 부족',
  };
}

/**
 * Compliance Fit (0-10): Hard requirements check
 */
function scoreComplianceFit(
  org: Organization,
  ideal: IdealApplicantProfile
): { score: number; explanation: string; gaps: ProximityGap[] } {
  let score = 10; // Start with full and deduct for failures
  const reasons: string[] = [];
  const gaps: ProximityGap[] = [];

  // 1. Required certifications (-5 per missing cert, max -5)
  if (ideal.requiredCertifications && ideal.requiredCertifications.length > 0) {
    const orgCerts = [
      ...(org.certifications || []),
      ...(org.governmentCertifications || []),
    ].map(c => c.toLowerCase());

    let missingCerts = 0;
    for (const cert of ideal.requiredCertifications) {
      if (!orgCerts.some(oc => oc.includes(cert.toLowerCase()))) {
        missingCerts++;
        gaps.push({
          dimension: 'complianceFit',
          description: `필수 인증 미보유: ${cert}`,
          severity: 'HIGH',
          isBlocker: true,
        });
      }
    }

    if (missingCerts > 0) {
      score -= Math.min(5, missingCerts * 5);
    } else {
      reasons.push('필수 인증 모두 보유');
    }
  }

  // 2. Research institute requirement (-3 if missing)
  if (ideal.requiresResearchInstitute && !org.hasResearchInstitute) {
    score -= 3;
    gaps.push({
      dimension: 'complianceFit',
      description: '연구기관 참여 필수이나 미확보',
      severity: 'MEDIUM',
      isBlocker: false,
    });
  }

  // 3. Business structure (-2 if mismatch)
  if (ideal.organizationTypes && ideal.organizationTypes.length > 0) {
    const orgType = String(org.type);
    if (!ideal.organizationTypes.includes(orgType)) {
      score -= 2;
      gaps.push({
        dimension: 'complianceFit',
        description: `조직유형 불일치 (${orgType} → 요구: ${ideal.organizationTypes.join(', ')})`,
        severity: 'MEDIUM',
        isBlocker: false,
      });
    }
  }

  return {
    score: Math.max(0, Math.min(WEIGHTS.complianceFit, score)),
    explanation: reasons.length > 0 ? reasons.join('; ') : gaps.length > 0 ? '일부 자격요건 미충족' : '자격요건 확인 불가',
    gaps,
  };
}

/**
 * Financial Fit (0-5): Revenue alignment
 */
function scoreFinancialFit(
  org: Organization,
  ideal: IdealApplicantProfile
): { score: number; explanation: string } {
  if (!ideal.financialProfile) {
    return { score: 3, explanation: '재무 요건 없음' };
  }

  let score = 0;
  const reasons: string[] = [];

  // Revenue alignment
  if (ideal.financialProfile.minRevenue && org.revenueRange) {
    const orgRevenue = REVENUE_MAP[org.revenueRange];
    const requiredMin = ideal.financialProfile.minRevenue / 100_000_000; // Convert to 억

    if (orgRevenue.max >= requiredMin) {
      score += 3;
      reasons.push('매출 요건 충족');
    } else {
      score += 1;
      reasons.push('매출 요건 미달');
    }
  } else {
    score += 2;
  }

  // Matching fund capability
  if (ideal.financialProfile.requiresMatchingFund) {
    if (org.revenueRange && org.revenueRange !== 'NONE') {
      score += 2;
      reasons.push('대응자금 조달 가능');
    } else {
      score += 0;
      reasons.push('대응자금 조달 능력 불확실');
    }
  } else {
    score += 2;
  }

  return {
    score: Math.min(WEIGHTS.financialFit, score),
    explanation: reasons.length > 0 ? reasons.join('; ') : '재무 정보 부족',
  };
}

/**
 * Deadline Urgency (0-5): Preserved from v4.4 algorithm
 */
function scoreDeadlineUrgency(deadline: Date | null): { score: number; explanation: string } {
  if (!deadline) {
    return { score: 2, explanation: '마감일 정보 없음' };
  }

  const daysUntilDeadline = Math.ceil(
    (deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  if (daysUntilDeadline < 0) {
    return { score: 0, explanation: '마감됨' };
  }
  if (daysUntilDeadline <= 7) {
    return { score: 5, explanation: `마감 임박 (${daysUntilDeadline}일)` };
  }
  if (daysUntilDeadline <= 14) {
    return { score: 4, explanation: `마감 2주 이내` };
  }
  if (daysUntilDeadline <= 30) {
    return { score: 3, explanation: `마감 1개월 이내` };
  }
  if (daysUntilDeadline <= 60) {
    return { score: 2, explanation: `마감 2개월 이내` };
  }
  return { score: 1, explanation: `마감까지 ${daysUntilDeadline}일` };
}

// ═══════════════════════════════════════════════════════════════
// Main Scoring Function
// ═══════════════════════════════════════════════════════════════

/**
 * Calculate proximity score between an organization and an ideal applicant profile.
 *
 * @param org - The organization to score
 * @param ideal - The ideal applicant profile for a program
 * @param deadline - Program deadline (for urgency scoring)
 * @returns Full proximity score with explanations and gap analysis
 */
export function calculateProximityScore(
  org: Organization,
  ideal: IdealApplicantProfile,
  deadline: Date | null
): ProximityScore {
  const domain = scoreDomainFit(org, ideal);
  const tech = scoreTechnologyFit(org, ideal);
  const orgFit = scoreOrganizationFit(org, ideal);
  const capability = scoreCapabilityFit(org, ideal);
  const compliance = scoreComplianceFit(org, ideal);
  const financial = scoreFinancialFit(org, ideal);
  const deadlineScore = scoreDeadlineUrgency(deadline);

  const totalScore = Math.round(
    domain.score +
    tech.score +
    orgFit.score +
    capability.score +
    compliance.score +
    financial.score +
    deadlineScore.score
  );

  // Collect all gaps
  const gaps: ProximityGap[] = [...compliance.gaps];

  // Add soft gaps for low-scoring dimensions
  if (domain.score < WEIGHTS.domainFit * 0.3) {
    gaps.push({
      dimension: 'domainFit',
      description: '산업분야 적합성 낮음',
      severity: 'HIGH',
      isBlocker: false,
    });
  }
  if (capability.score < WEIGHTS.capabilityFit * 0.3) {
    gaps.push({
      dimension: 'capabilityFit',
      description: '기대역량 대부분 미충족',
      severity: 'MEDIUM',
      isBlocker: false,
    });
  }

  // Generate summary
  const summary = generateSummary(totalScore, gaps, ideal);

  return {
    totalScore,
    dimensions: {
      domainFit: Math.round(domain.score * 10) / 10,
      technologyFit: Math.round(tech.score * 10) / 10,
      organizationFit: Math.round(orgFit.score * 10) / 10,
      capabilityFit: Math.round(capability.score * 10) / 10,
      complianceFit: Math.round(compliance.score * 10) / 10,
      financialFit: Math.round(financial.score * 10) / 10,
      deadlineUrgency: Math.round(deadlineScore.score * 10) / 10,
    },
    explanations: {
      domainFit: domain.explanation,
      technologyFit: tech.explanation,
      organizationFit: orgFit.explanation,
      capabilityFit: capability.explanation,
      complianceFit: compliance.explanation,
      financialFit: financial.explanation,
      deadlineUrgency: deadlineScore.explanation,
    },
    summary,
    gaps,
    confidence: ideal.confidence,
    algorithmVersion: PROXIMITY_ALGORITHM_VERSION,
  };
}

function generateSummary(
  totalScore: number,
  gaps: ProximityGap[],
  ideal: IdealApplicantProfile
): string {
  const blockers = gaps.filter(g => g.isBlocker);
  const softGaps = gaps.filter(g => !g.isBlocker);

  if (totalScore >= 80) {
    return '이상적 지원자 프로필과 높은 적합성을 보입니다.';
  }
  if (totalScore >= 60) {
    if (blockers.length > 0) {
      return `전반적 적합성은 양호하나, ${blockers[0].description} 확인이 필요합니다.`;
    }
    return '이상적 지원자 프로필과 양호한 적합성을 보입니다.';
  }
  if (totalScore >= 40) {
    if (softGaps.length > 0) {
      return `일부 요건 부합. ${softGaps[0].description}`;
    }
    return '부분적으로 적합한 프로그램입니다.';
  }
  return '이상적 지원자 프로필과의 적합성이 낮습니다.';
}
