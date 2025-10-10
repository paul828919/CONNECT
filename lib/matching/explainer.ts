/**
 * Korean Explanation Generator for Funding Matches (Enhanced v2.0)
 *
 * Converts match reasons into user-friendly Korean explanations that help
 * users understand WHY a funding program was recommended.
 *
 * v2.0 enhancements:
 * - Support for new keyword matching reason codes
 * - Graduated TRL explanations (not just compatible/incompatible)
 * - Cross-industry relevance explanations
 * - Technology keyword match explanations
 */

import { Organization, FundingProgram } from '@prisma/client';
import { MatchScore } from './algorithm';
import { getTRLDescription } from './trl';

export interface MatchExplanation {
  summary: string; // One-line summary
  reasons: string[]; // Bullet points explaining the match
  warnings?: string[]; // Potential concerns
  recommendations?: string[]; // Action items
}

/**
 * Generate comprehensive Korean explanation for a match
 */
export function generateExplanation(
  match: MatchScore,
  org: Organization,
  program: FundingProgram
): MatchExplanation {
  const reasons: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];

  // Generate summary based on score
  const summary = generateSummary(match.score, org.type);

  // Process each reason
  for (const reason of match.reasons) {
    const explanation = getReasonExplanation(reason, org, program, match);
    if (explanation) {
      if (reason.includes('MISMATCH') || reason.includes('FAR')) {
        warnings.push(explanation);
      } else {
        reasons.push(explanation);
      }
    }
  }

  // Add score-based recommendations
  if (match.score >= 80) {
    recommendations.push('이 프로그램은 귀하의 조직과 매우 적합합니다. 빠른 지원을 권장드립니다.');
  } else if (match.score >= 60) {
    recommendations.push('이 프로그램 지원을 적극 검토해보세요.');
  } else if (match.score >= 40) {
    recommendations.push('조건을 확인하신 후 지원을 고려해보세요.');
  }

  // Add deadline-based recommendations
  const daysUntil = program.deadline
    ? Math.ceil((new Date(program.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  if (daysUntil && daysUntil <= 30) {
    recommendations.push(`⚠️ 마감일이 ${daysUntil}일 남았습니다. 서류 준비를 서두르세요.`);
  }

  return {
    summary,
    reasons: reasons.length > 0 ? reasons : ['이 프로그램에 지원 가능한 조직입니다.'],
    warnings: warnings.length > 0 ? warnings : undefined,
    recommendations: recommendations.length > 0 ? recommendations : undefined,
  };
}

/**
 * Generate one-line summary based on match score
 */
function generateSummary(score: number, orgType: string): string {
  const type = orgType === 'COMPANY' ? '귀사는' : '귀 기관은';

  if (score >= 80) {
    return `${type} 이 프로그램에 매우 적합한 후보입니다.`;
  } else if (score >= 60) {
    return `${type} 이 프로그램 지원 자격을 충족합니다.`;
  } else if (score >= 40) {
    return `${type} 조건부로 이 프로그램에 지원할 수 있습니다.`;
  } else {
    return `${type} 이 프로그램에 지원 가능하나, 적합도가 낮습니다.`;
  }
}

/**
 * Get Korean explanation for each reason
 */
function getReasonExplanation(
  reason: string,
  org: Organization,
  program: FundingProgram,
  match: MatchScore
): string | null {
  const type = org.type === 'COMPANY' ? '기업' : '연구기관';

  switch (reason) {
    case 'INDUSTRY_CATEGORY_MATCH':
      const sector = org.industrySector || '해당 산업';
      return `${sector} 분야로 본 프로그램의 대상 요건에 부합합니다.`;

    case 'KEYWORD_MATCH':
      return '귀하의 기술 분야가 프로그램 키워드와 관련성이 높습니다.';

    case 'RESEARCH_FOCUS_MATCH':
      return '귀 연구소의 연구 분야가 프로그램 목표와 부합합니다.';

    case 'TRL_COMPATIBLE':
      if (org.technologyReadinessLevel) {
        return `기술성숙도(TRL ${org.technologyReadinessLevel})가 본 프로그램의 요구 수준에 적합합니다.`;
      }
      return '본 프로그램의 기술성숙도 요구사항을 충족합니다.';

    case 'TRL_TOO_LOW':
      if (org.technologyReadinessLevel && program.minTrl) {
        return `⚠️ 현재 기술성숙도(TRL ${org.technologyReadinessLevel})가 최소 요구 수준(TRL ${program.minTrl}) 미만입니다.`;
      }
      return '⚠️ 기술성숙도가 요구 수준보다 낮습니다.';

    case 'TRL_TOO_HIGH':
      if (org.technologyReadinessLevel && program.maxTrl) {
        return `⚠️ 현재 기술성숙도(TRL ${org.technologyReadinessLevel})가 최대 허용 수준(TRL ${program.maxTrl}) 초과입니다.`;
      }
      return '⚠️ 기술성숙도가 상용화 단계에 가까워 다른 프로그램이 더 적합할 수 있습니다.';

    case 'TYPE_MATCH':
      return `${type} 유형으로 본 프로그램의 지원 대상에 포함됩니다.`;

    case 'RD_EXPERIENCE':
      return '정부 R&D 과제 수행 경험이 있어 가점을 받을 수 있습니다.';

    case 'COLLABORATION_HISTORY':
      return '산학협력 이력이 있어 협력과제 선정 시 유리합니다.';

    case 'DEADLINE_URGENT':
      const urgentDays = program.deadline
        ? Math.ceil((new Date(program.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;
      if (urgentDays) {
        return `⚠️ 마감일이 ${urgentDays}일 남아 신속한 지원이 필요합니다.`;
      }
      return '⚠️ 마감일이 임박하여 신속한 지원이 필요합니다.';

    case 'DEADLINE_SOON':
      const soonDays = program.deadline
        ? Math.ceil((new Date(program.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;
      if (soonDays) {
        return `마감일이 ${soonDays}일 남았습니다. 지원 준비를 시작하세요.`;
      }
      return '마감일이 다가오고 있으니 지원 준비를 시작하세요.';

    case 'DEADLINE_MODERATE':
      return '신청 마감일까지 시간이 있어 충분히 준비할 수 있습니다.';

    case 'DEADLINE_FAR':
      return '신청 마감일까지 여유가 있으니 사전 검토 후 준비하시면 됩니다.';

    // ===== Enhanced v2.0 Reason Codes =====

    // Enhanced keyword matching
    case 'EXACT_KEYWORD_MATCH':
      return '귀하의 기술 분야와 프로그램 키워드가 정확히 일치합니다.';

    case 'SECTOR_MATCH':
      return '산업 분야가 프로그램의 주요 대상 분야와 일치합니다.';

    case 'SECTOR_KEYWORD_MATCH':
      return '귀하의 산업 분야가 프로그램 대상 분야에 포함됩니다.';

    case 'SUB_SECTOR_MATCH':
      return '귀하의 세부 산업 분야가 프로그램 목표와 부합합니다.';

    case 'CROSS_INDUSTRY_HIGH_RELEVANCE':
      return '다른 산업 분야이지만 본 프로그램과 높은 연관성이 있습니다.';

    case 'CROSS_INDUSTRY_MEDIUM_RELEVANCE':
      return '융합 기술 분야로 본 프로그램 지원이 가능합니다.';

    case 'TECHNOLOGY_KEYWORD_MATCH':
      return '귀 연구소의 핵심 기술이 프로그램 목표와 일치합니다.';

    // Enhanced TRL scoring
    case 'TRL_PERFECT_MATCH':
      if (org.technologyReadinessLevel && program.minTrl && program.maxTrl) {
        return `기술성숙도(${getTRLDescription(org.technologyReadinessLevel)})가 본 프로그램의 요구 범위(TRL ${program.minTrl}-${program.maxTrl})에 완벽히 부합합니다.`;
      }
      return '기술성숙도가 프로그램 요구사항에 완벽히 부합합니다.';

    case 'TRL_TOO_LOW_CLOSE':
      if (org.technologyReadinessLevel && program.minTrl) {
        return `기술성숙도(TRL ${org.technologyReadinessLevel})가 최소 요구 수준(TRL ${program.minTrl})에 근접합니다. 일부 지원 가능할 수 있습니다.`;
      }
      return '기술성숙도가 요구 수준에 근접하여 지원을 고려해볼 수 있습니다.';

    case 'TRL_TOO_LOW_MODERATE':
      if (org.technologyReadinessLevel && program.minTrl) {
        return `⚠️ 기술성숙도(TRL ${org.technologyReadinessLevel})가 최소 요구 수준(TRL ${program.minTrl})보다 다소 낮습니다.`;
      }
      return '⚠️ 기술성숙도가 요구 수준보다 다소 낮습니다.';

    case 'TRL_TOO_LOW_FAR':
      if (org.technologyReadinessLevel && program.minTrl) {
        return `⚠️ 기술성숙도(TRL ${org.technologyReadinessLevel})가 최소 요구 수준(TRL ${program.minTrl})보다 상당히 낮습니다. 기초연구 단계 프로그램을 먼저 검토하세요.`;
      }
      return '⚠️ 기술성숙도가 요구 수준보다 많이 낮습니다.';

    case 'TRL_TOO_HIGH_CLOSE':
      if (org.technologyReadinessLevel && program.maxTrl) {
        return `기술성숙도(TRL ${org.technologyReadinessLevel})가 최대 허용 수준(TRL ${program.maxTrl})보다 약간 높지만, 예외적으로 지원 가능할 수 있습니다.`;
      }
      return '기술성숙도가 약간 높지만 지원을 검토해볼 수 있습니다.';

    case 'TRL_TOO_HIGH_MODERATE':
      if (org.technologyReadinessLevel && program.maxTrl) {
        return `⚠️ 기술성숙도(TRL ${org.technologyReadinessLevel})가 최대 허용 수준(TRL ${program.maxTrl})을 초과합니다. 사업화 단계 프로그램을 검토하세요.`;
      }
      return '⚠️ 기술성숙도가 허용 수준을 초과합니다.';

    case 'TRL_TOO_HIGH_FAR':
      if (org.technologyReadinessLevel && program.maxTrl) {
        return `⚠️ 이미 상용화 단계로, 본 프로그램보다 시장진입 지원 프로그램이 더 적합합니다.`;
      }
      return '⚠️ 기술성숙도가 상용화 단계로, 다른 프로그램이 더 적합합니다.';

    case 'TRL_NOT_PROVIDED':
      return '기술성숙도 정보가 없어 기본 점수를 부여했습니다. 프로필에 TRL 정보를 추가하면 더 정확한 매칭이 가능합니다.';

    case 'TRL_NO_REQUIREMENT':
      return '본 프로그램은 기술성숙도 제한이 없어 모든 단계에서 지원 가능합니다.';

    default:
      return null;
  }
}

/**
 * Convert industry sector code to Korean
 */
function getIndustrySectorKorean(sector: string): string {
  const map: Record<string, string> = {
    ICT: 'ICT/정보통신',
    BIO_HEALTH: '바이오/헬스',
    MANUFACTURING: '제조업',
    ENERGY: '에너지',
    ENVIRONMENT: '환경',
    AGRICULTURE: '농업',
    MARINE: '해양수산',
    CONSTRUCTION: '건설',
    TRANSPORTATION: '교통/운송',
    OTHER: '기타',
  };

  return map[sector] || sector;
}

/**
 * Convert employee count range to Korean
 */
function getEmployeeCountKorean(count: string): string {
  const map: Record<string, string> = {
    UNDER_10: '10명 미만',
    FROM_10_TO_50: '10~50명',
    FROM_50_TO_100: '50~100명',
    FROM_100_TO_300: '100~300명',
    OVER_300: '300명 이상',
  };

  return map[count] || count;
}

/**
 * Generate detailed match analysis for display
 */
export function generateDetailedAnalysis(
  match: MatchScore,
  org: Organization,
  program: FundingProgram
): {
  scoreSummary: string;
  strengths: string[];
  concerns: string[];
  actionItems: string[];
} {
  const strengths: string[] = [];
  const concerns: string[] = [];
  const actionItems: string[] = [];

  // Analyze breakdown
  if (match.breakdown.industryScore >= 25) {
    strengths.push(`산업 분야 적합성: ${match.breakdown.industryScore}/30점`);
  } else if (match.breakdown.industryScore > 0) {
    concerns.push(`산업 분야 적합성이 다소 낮습니다 (${match.breakdown.industryScore}/30점)`);
    actionItems.push('프로그램 세부 요강을 확인하여 지원 가능 여부를 검토하세요.');
  }

  if (match.breakdown.trlScore >= 15) {
    strengths.push(`기술성숙도: ${match.breakdown.trlScore}/20점`);
  } else if (match.breakdown.trlScore === 0) {
    concerns.push('기술성숙도(TRL) 요구사항을 충족하지 못합니다.');
    actionItems.push('기술 개발 단계를 조정하거나 다른 프로그램을 검토하세요.');
  }

  if (match.breakdown.rdScore > 10) {
    strengths.push(`R&D 경험 보유로 가점 획득 (${match.breakdown.rdScore}/15점)`);
  }

  if (match.breakdown.deadlineScore <= 5) {
    concerns.push('신청 마감일이 많이 남아있어 우선순위가 낮을 수 있습니다.');
  }

  // Add default action items
  if (match.score >= 70) {
    actionItems.push('공고문을 상세히 검토하고 지원서류를 준비하세요.');
    actionItems.push('필요시 사업계획서 작성 컨설팅을 받는 것을 권장합니다.');
  }

  const scoreSummary = `종합 매칭 점수: ${match.score}/100점`;

  return {
    scoreSummary,
    strengths: strengths.length > 0 ? strengths : ['기본 지원 자격을 갖추고 있습니다.'],
    concerns: concerns.length > 0 ? concerns : [],
    actionItems: actionItems.length > 0 ? actionItems : ['공고 세부사항을 확인해주세요.'],
  };
}

/**
 * Generate simple bullet-point explanation (for API response)
 */
export function generateSimpleExplanation(
  match: MatchScore,
  org: Organization,
  program: FundingProgram
): string[] {
  const explanation = generateExplanation(match, org, program);
  const bullets: string[] = [explanation.summary, ...explanation.reasons];

  if (explanation.warnings) {
    bullets.push(...explanation.warnings);
  }

  if (explanation.recommendations && match.score >= 60) {
    bullets.push(...explanation.recommendations);
  }

  return bullets;
}
