/**
 * v6 Korean Explanation Generator
 *
 * Generates human-readable Korean explanations for match results.
 * Includes positive reasons, negative signal warnings, and recommendations.
 *
 * Used by route.ts when MATCHING_ALGORITHM=v6.0-funnel
 */

import { organizations, funding_programs } from '@prisma/client';
import { V6MatchScore } from './types';

export interface V6MatchExplanation {
  summary: string;
  reasons: string[];
  warnings?: string[];
  recommendations?: string[];
  scoreBreakdown?: {
    keywordScore: number;
    industryScore: number;
    trlScore: number;
    typeScore: number;
    rdScore: number;
    deadlineScore: number;
  };
}

function generateSummary(score: number): string {
  if (score >= 80) return '매우 적합한 지원사업입니다. 즉시 지원을 준비하세요.';
  if (score >= 70) return '귀사와 높은 적합도를 보이는 과제입니다.';
  if (score >= 60) return '지원을 검토해볼 만한 과제입니다.';
  if (score >= 55) return '기본 요건은 충족하지만 적합도를 확인하세요.';
  return '검토가 필요한 과제입니다.';
}

/**
 * Map reason codes to Korean explanations.
 */
function reasonToKorean(reason: string): string | null {
  const map: Record<string, string> = {
    // Semantic reasons
    'SEMANTIC_PROXIMITY_USED': '이상적 지원자 프로필 기반 정밀 분석 적용',
    'SEMANTIC_KEYWORD_OVERLAP': '보유 기술 키워드와 과제 분야 일치',
    'SEMANTIC_NO_ORG_INDUSTRY': '산업분야 정보 미등록 — 프로필 업데이트 권장',
    'NEGATIVE_SIGNAL': '일부 부적합 신호가 감지되었습니다',

    // Intent reasons
    'INTENT_BASIC_MATCH': '기초연구 단계에 최적화된 조직',
    'INTENT_BASIC_PARTIAL': '기초연구 대상이나 조직 TRL과 부분 일치',
    'INTENT_BASIC_MISMATCH': '기초연구 대상이나 조직 기술 수준이 높음',
    'INTENT_APPLIED_MATCH': '응용연구 단계에 적합',
    'INTENT_APPLIED_PARTIAL': '응용연구 대상이나 TRL 범위 부분 일치',
    'INTENT_APPLIED_MISMATCH': '응용연구 대상이나 TRL 범위 불일치',
    'INTENT_COMMERCIAL_MATCH': '사업화 단계에 최적화된 조직',
    'INTENT_COMMERCIAL_PARTIAL': '사업화 대상이나 TRL 근접',
    'INTENT_COMMERCIAL_MISMATCH': '사업화 대상이나 기술 수준이 낮음',
    'INTENT_POLICY_MATCH': '인프라/정책지원 과제',
    'INTENT_UNKNOWN': '과제 목적 분류 정보 없음',

    // Practical reasons
    'TRL_COMPATIBLE': '기술성숙도(TRL) 범위 부합',
    'TRL_IN_RANGE_WITH_GRADIENT': '기술성숙도(TRL) 범위 내',
    'TRL_BELOW_MIN': '기술성숙도(TRL)가 요구 수준 미달',
    'TRL_ABOVE_MAX': '기술성숙도(TRL)가 요구 수준 초과',
    'TRL_NOT_SPECIFIED': '기술성숙도(TRL) 요건 없음',
    'TRL_ORG_NOT_SPECIFIED': '조직 TRL 정보 미등록',
    'RD_EXPERIENCE': 'R&D 수행 경험 보유',
    'COLLABORATION_EXTENSIVE': '풍부한 산학협력 경험',
    'COLLABORATION_LIMITED': '산학협력 경험 있음',
    'CERTIFICATION_BONUS': '관련 인증 보유 (가산점)',

    // Deadline reasons
    'DEADLINE_URGENT': '마감 7일 이내 — 즉시 준비 필요',
    'DEADLINE_SOON': '마감 30일 이내',
    'DEADLINE_MODERATE': '마감 60일 이내',
    'DEADLINE_FAR': '마감까지 여유 있음',
    'DEADLINE_UNKNOWN': '마감일 미공개',
    'DEADLINE_PASSED': '마감됨',
  };

  return map[reason] || null;
}

export function generateV6Explanation(
  match: V6MatchScore,
  org: organizations,
  program: funding_programs
): V6MatchExplanation {
  const reasons: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];

  const summary = generateSummary(match.score);

  if (match.v6Details) {
    const { semantic, practical } = match.v6Details;

    // Domain relevance insight
    if (semantic.breakdown.domainRelevance >= 20) {
      reasons.push('산업 분야 적합도가 매우 높습니다.');
    } else if (semantic.breakdown.domainRelevance >= 15) {
      reasons.push('산업 분야 적합도가 높습니다.');
    } else if (semantic.breakdown.domainRelevance >= 8) {
      reasons.push('산업 분야 관련성이 있습니다.');
    }

    // Capability insight
    if (semantic.breakdown.capabilityFit >= 12) {
      reasons.push('보유 역량이 프로그램 요구와 매우 잘 맞습니다.');
    } else if (semantic.breakdown.capabilityFit >= 7) {
      reasons.push('보유 역량이 프로그램 요구와 부분 일치합니다.');
    }

    // TRL insight
    if (practical.breakdown.trlAlignment >= 8) {
      reasons.push('기술 수준(TRL)이 프로그램 요구와 잘 부합합니다.');
    } else if (practical.breakdown.trlAlignment >= 5) {
      reasons.push('기술 수준(TRL)이 프로그램 요구에 근접합니다.');
    }

    // Deadline warning
    if (practical.breakdown.deadlineUrgency >= 6) {
      warnings.push('마감일이 임박했습니다. 빠른 준비가 필요합니다.');
    }

    // Negative signal warnings
    for (const signal of semantic.negativeSignals) {
      warnings.push(`주의: ${signal.detail}`);
    }
  }

  // Map coded reasons to Korean
  for (const reason of match.reasons) {
    const korean = reasonToKorean(reason);
    if (korean && !reasons.includes(korean) && !warnings.some(w => w.includes(korean))) {
      reasons.push(korean);
    }
  }

  // Eligibility warnings
  if (match.eligibilityDetails?.needsManualReview) {
    warnings.push('일부 자격요건이 확인되지 않았습니다. 공고문에서 직접 확인하세요.');
  }

  if (program.deadline === null) {
    warnings.push('마감일이 아직 공개되지 않았습니다. 공고문을 확인하세요.');
  }

  // Recommendations
  if (match.score >= 75) {
    recommendations.push('즉시 지원을 준비하는 것을 권장합니다.');
  } else if (match.score >= 60) {
    recommendations.push('공고문의 세부 요건을 확인하고 지원을 검토해보세요.');
  } else if (match.score >= 55) {
    recommendations.push('지원 자격을 면밀히 검토한 후 진행 여부를 결정하세요.');
  }

  return {
    summary,
    reasons: reasons.length > 0 ? reasons : ['매칭 세부 정보를 확인하세요.'],
    warnings: warnings.length > 0 ? warnings : undefined,
    recommendations: recommendations.length > 0 ? recommendations : undefined,
  };
}
