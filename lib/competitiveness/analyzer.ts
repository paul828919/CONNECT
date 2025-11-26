/**
 * Competitiveness Analysis Module
 *
 * Analyzes an organization's profile against their matched funding programs
 * to identify improvement opportunities that would increase selection competitiveness.
 *
 * Key Concepts:
 * - Inverts eligibility checking to find "what's missing" for soft requirements
 * - Aggregates missing requirements across all matches to prioritize by impact
 * - Identifies profile gaps that prevent accurate analysis
 *
 * Usage:
 * ```typescript
 * const analysis = await analyzeCompetitiveness(organizationId);
 * console.log(analysis.improvements); // Top improvement suggestions
 * console.log(analysis.profileGaps);  // Missing profile fields
 * ```
 */

import { organizations, funding_programs, funding_matches } from '@prisma/client';
import { EligibilityLevel } from '@/lib/matching/eligibility';

// ============================================================================
// Types & Interfaces
// ============================================================================

export type ImprovementCategory =
  | 'certification'
  | 'investment'
  | 'patent'
  | 'personnel'
  | 'infrastructure'
  | 'track_record';

export type Priority = 'high' | 'medium' | 'low';

export interface ImprovementSuggestion {
  id: string;
  category: ImprovementCategory;
  title: string;
  description: string;
  detailedDescription: string;
  impactedPrograms: number;
  totalPrograms: number;
  priority: Priority;
  actionUrl?: string;
  actionLabel?: string;
  affectedProgramIds: string[];
}

export interface ProfileGap {
  field: string;
  fieldLabel: string;
  currentValue: string | null;
  recommendation: string;
  profileEditUrl: string;
}

export interface CompetitivenessAnalysisResult {
  overallScore: number;
  totalMatches: number;
  fullyEligibleCount: number;
  conditionallyEligibleCount: number;
  improvements: ImprovementSuggestion[];
  profileGaps: ProfileGap[];
  lastAnalyzedAt: string;
}

export interface CompetitivenessSummary {
  improvementCount: number;
  hasMatches: boolean;
  highPriorityCount: number;
}

// Type for match with program
type MatchWithProgram = funding_matches & {
  funding_programs: funding_programs;
};

// ============================================================================
// Improvement Suggestion Templates
// ============================================================================

interface SuggestionTemplate {
  category: ImprovementCategory;
  title: string;
  detailedDescription: string;
  actionUrl?: string;
  actionLabel?: string;
}

const SUGGESTION_TEMPLATES: Record<string, SuggestionTemplate> = {
  // Certifications
  '벤처기업': {
    category: 'certification',
    title: '벤처기업 인증 취득',
    detailedDescription:
      '벤처기업 인증을 취득하면 다수의 정부 R&D 과제에서 우대 가점을 받을 수 있습니다.',
    actionUrl: 'https://www.venturein.or.kr/',
    actionLabel: '인증 신청 안내',
  },
  'INNO-BIZ': {
    category: 'certification',
    title: '이노비즈(INNO-BIZ) 인증 취득',
    detailedDescription:
      '이노비즈 인증은 기술혁신 역량을 인정받아 R&D 과제 선정에 유리합니다.',
    actionUrl: 'https://www.innobiz.or.kr/',
    actionLabel: '인증 안내',
  },
  '메인비즈': {
    category: 'certification',
    title: '메인비즈(Main-Biz) 인증 취득',
    detailedDescription:
      '메인비즈 인증은 경영혁신 역량을 인정받아 과제 선정에 도움이 됩니다.',
    actionUrl: 'https://www.mainbiz.or.kr/',
    actionLabel: '인증 안내',
  },
  '연구개발전담부서': {
    category: 'infrastructure',
    title: '연구전담부서 등록',
    detailedDescription:
      '연구전담부서 등록으로 R&D 조직역량을 공식 인정받을 수 있습니다.',
    actionUrl: 'https://www.rnd.or.kr/',
    actionLabel: '등록 안내',
  },
  '기업부설연구소': {
    category: 'infrastructure',
    title: '기업부설연구소 등록',
    detailedDescription:
      '기업부설연구소를 보유하면 연구개발 역량 평가에서 높은 점수를 받을 수 있습니다.',
    actionUrl: 'https://www.rnd.or.kr/',
    actionLabel: '등록 안내',
  },
  '중소기업': {
    category: 'certification',
    title: '중소기업 확인서 발급',
    detailedDescription:
      '중소기업 확인서는 다수의 정부지원 사업 지원 자격 요건입니다.',
    actionUrl: 'https://www.sminfo.mss.go.kr/',
    actionLabel: '발급 안내',
  },
  '스타트업': {
    category: 'certification',
    title: '창업기업 확인',
    detailedDescription:
      '창업 7년 이내 기업 대상 우대 프로그램에 지원할 수 있습니다.',
  },
  // Track record
  priorGrantWins: {
    category: 'track_record',
    title: '정부과제 수행실적 추가',
    detailedDescription:
      '최근 3년 내 정부과제 수행실적이 있으면 과제 수행 역량 평가에서 유리합니다.',
  },
  // Patent
  patentCount: {
    category: 'patent',
    title: '특허 출원/등록',
    detailedDescription:
      '특허 보유 시 기술력 평가에서 가점을 획득할 수 있습니다.',
  },
  // Investment
  investmentHistory: {
    category: 'investment',
    title: '투자 유치 실적 입력',
    detailedDescription:
      '투자 유치 실적이 있으면 사업화 역량 평가에서 우대받을 수 있습니다.',
  },
  // Research Institute
  hasResearchInstitute: {
    category: 'infrastructure',
    title: '기업부설연구소 등록',
    detailedDescription:
      '기업부설연구소를 보유하면 연구개발 역량 평가에서 높은 점수를 받을 수 있습니다.',
    actionUrl: 'https://www.rnd.or.kr/',
    actionLabel: '등록 안내',
  },
};

// ============================================================================
// Profile Gap Detection
// ============================================================================

const PROFILE_FIELDS_TO_CHECK: Array<{
  field: string;
  fieldLabel: string;
  recommendation: string;
  profileEditUrl: string;
}> = [
  {
    field: 'priorGrantWins',
    fieldLabel: '정부과제 수행실적',
    recommendation: '최근 3년 내 정부과제 수행실적을 입력하면 더 정확한 분석이 가능합니다.',
    profileEditUrl: '/dashboard/profile/edit#track-record',
  },
  {
    field: 'rdInvestmentRatio',
    fieldLabel: '연구개발 투자비율',
    recommendation: '연구개발 투자비율을 입력하면 관련 과제 매칭이 개선됩니다.',
    profileEditUrl: '/dashboard/profile/edit#rd-investment',
  },
  {
    field: 'patentCount',
    fieldLabel: '보유 특허 수',
    recommendation: '특허 보유 현황을 입력하면 기술력 평가 관련 분석이 가능합니다.',
    profileEditUrl: '/dashboard/profile/edit#patents',
  },
  {
    field: 'businessEstablishedDate',
    fieldLabel: '설립일',
    recommendation: '설립일을 입력하면 업력 기준 프로그램 적합성을 분석할 수 있습니다.',
    profileEditUrl: '/dashboard/profile/edit#basic-info',
  },
  {
    field: 'certifications',
    fieldLabel: '보유 인증',
    recommendation: '보유 인증을 입력하면 인증 우대 프로그램 분석이 가능합니다.',
    profileEditUrl: '/dashboard/profile/edit#certifications',
  },
];

// ============================================================================
// Core Analysis Functions
// ============================================================================

/**
 * Calculate priority based on number of impacted programs
 */
export function calculatePriority(impactedPrograms: number): Priority {
  if (impactedPrograms >= 5) return 'high';
  if (impactedPrograms >= 2) return 'medium';
  return 'low';
}

/**
 * Generate unique ID for suggestion
 */
function generateSuggestionId(index: number): string {
  return `imp_${String(index + 1).padStart(3, '0')}`;
}

/**
 * Get missing preferred certifications for a program
 */
export function getMissingPreferredCertifications(
  org: organizations,
  program: funding_programs
): string[] {
  const missing: string[] = [];
  const orgCerts = [...(org.certifications || []), ...(org.governmentCertifications || [])];

  // Check preferred certifications
  if (program.preferredCertifications && program.preferredCertifications.length > 0) {
    for (const cert of program.preferredCertifications) {
      if (!orgCerts.includes(cert)) {
        missing.push(cert);
      }
    }
  }

  // Check research institute requirement (as soft requirement check)
  if (program.requiresResearchInstitute && !org.hasResearchInstitute) {
    if (!missing.includes('기업부설연구소')) {
      missing.push('기업부설연구소');
    }
  }

  return missing;
}

/**
 * Detect profile gaps for better analysis
 */
export function detectProfileGaps(org: organizations): ProfileGap[] {
  const gaps: ProfileGap[] = [];

  for (const fieldConfig of PROFILE_FIELDS_TO_CHECK) {
    const value = (org as any)[fieldConfig.field];

    // Check if field is empty/null
    const isEmpty =
      value === null ||
      value === undefined ||
      value === '' ||
      (Array.isArray(value) && value.length === 0);

    if (isEmpty) {
      gaps.push({
        field: fieldConfig.field,
        fieldLabel: fieldConfig.fieldLabel,
        currentValue: null,
        recommendation: fieldConfig.recommendation,
        profileEditUrl: fieldConfig.profileEditUrl,
      });
    }
  }

  return gaps;
}

/**
 * Main competitiveness analysis function
 *
 * Analyzes organization's matches to find improvement opportunities
 * and profile gaps that would increase selection competitiveness.
 */
export function analyzeCompetitiveness(
  org: organizations,
  matches: MatchWithProgram[]
): CompetitivenessAnalysisResult {
  // Handle empty matches case
  if (matches.length === 0) {
    return {
      overallScore: 0,
      totalMatches: 0,
      fullyEligibleCount: 0,
      conditionallyEligibleCount: 0,
      improvements: [],
      profileGaps: detectProfileGaps(org),
      lastAnalyzedAt: new Date().toISOString(),
    };
  }

  // Aggregate soft requirements across all matches
  const softRequirementsCounts = new Map<string, Set<string>>();

  // Count eligibility levels
  let fullyEligibleCount = 0;
  let conditionallyEligibleCount = 0;

  for (const match of matches) {
    const explanation = match.explanation as any;
    const eligibilityLevel = explanation?.eligibilityLevel || null;

    if (eligibilityLevel === EligibilityLevel.FULLY_ELIGIBLE) {
      fullyEligibleCount++;
    } else {
      // Treat as CONDITIONALLY_ELIGIBLE (since INELIGIBLE matches are not shown)
      conditionallyEligibleCount++;

      // Find missing soft requirements for this match
      const missingRequirements = getMissingPreferredCertifications(
        org,
        match.funding_programs
      );

      for (const requirement of missingRequirements) {
        if (!softRequirementsCounts.has(requirement)) {
          softRequirementsCounts.set(requirement, new Set());
        }
        softRequirementsCounts.get(requirement)!.add(match.funding_programs.id);
      }
    }
  }

  // Sort by impact and create improvement suggestions
  const sortedRequirements = [...softRequirementsCounts.entries()].sort(
    (a, b) => b[1].size - a[1].size
  );

  const improvements: ImprovementSuggestion[] = sortedRequirements
    .slice(0, 7) // Limit to top 7 suggestions
    .map(([requirement, programIds], index) => {
      const template = SUGGESTION_TEMPLATES[requirement] || {
        category: 'certification' as ImprovementCategory,
        title: requirement,
        detailedDescription: `${requirement} 관련 요건을 충족하면 선정 경쟁력이 상승합니다.`,
      };

      const impactedCount = programIds.size;

      return {
        id: generateSuggestionId(index),
        category: template.category,
        title: template.title,
        description: `매칭된 ${matches.length}개 과제 중 ${impactedCount}개에서 선정 경쟁력 상승`,
        detailedDescription: template.detailedDescription,
        impactedPrograms: impactedCount,
        totalPrograms: matches.length,
        priority: calculatePriority(impactedCount),
        actionUrl: template.actionUrl,
        actionLabel: template.actionLabel,
        affectedProgramIds: [...programIds],
      };
    });

  // Calculate overall score
  const overallScore =
    matches.length > 0 ? Math.round((fullyEligibleCount / matches.length) * 100) : 0;

  // Detect profile gaps
  const profileGaps = detectProfileGaps(org);

  return {
    overallScore,
    totalMatches: matches.length,
    fullyEligibleCount,
    conditionallyEligibleCount,
    improvements,
    profileGaps,
    lastAnalyzedAt: new Date().toISOString(),
  };
}

/**
 * Generate summary for dashboard card
 */
export function generateCompetitivenessSummary(
  org: organizations,
  matches: MatchWithProgram[]
): CompetitivenessSummary {
  const analysis = analyzeCompetitiveness(org, matches);

  return {
    improvementCount: analysis.improvements.length,
    hasMatches: matches.length > 0,
    highPriorityCount: analysis.improvements.filter((imp) => imp.priority === 'high').length,
  };
}
