import { organizations, funding_programs } from '@prisma/client';
import { V6MatchScore } from './types';

export interface V6MatchExplanation {
  summary: string;
  reasons: string[];
  warnings?: string[];
  recommendations?: string[];
}

function generateSummary(score: number): string {
  if (score >= 80) return '매우 적합한 지원사업입니다.';
  if (score >= 65) return '귀사와 높은 적합도를 보입니다.';
  if (score >= 55) return '지원 가능성이 있는 과제입니다.';
  return '검토가 필요한 과제입니다.';
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

    if (semantic.breakdown.domainRelevance >= 15) {
      reasons.push('산업 분야 적합도가 높습니다.');
    }

    if (semantic.breakdown.capabilityFit >= 10) {
      reasons.push('보유 역량이 프로그램 요구와 잘 맞습니다.');
    }

    if (practical.breakdown.trlAlignment >= 7) {
      reasons.push('TRL 요구 수준과 개발 단계가 부합합니다.');
    }

    if (practical.breakdown.deadlineUrgency >= 6) {
      warnings.push('마감일이 임박했습니다. 빠른 준비가 필요합니다.');
    }

    if (semantic.negativeSignals.length > 0) {
      for (const signal of semantic.negativeSignals) {
        warnings.push(`부정 신호: ${signal.detail}`);
      }
    }
  }

  if (match.eligibilityDetails?.needsManualReview) {
    warnings.push('필수 요건 일부가 확인되지 않았습니다. 지원 자격을 재확인하세요.');
  }

  if (program.deadline === null) {
    warnings.push('마감일이 아직 공개되지 않았습니다. 공고문을 확인하세요.');
  }

  if (match.score >= 75) {
    recommendations.push('즉시 지원을 준비하는 것을 권장합니다.');
  } else if (match.score >= 60) {
    recommendations.push('요건을 확인하고 지원을 검토해보세요.');
  }

  return {
    summary,
    reasons,
    warnings: warnings.length > 0 ? warnings : undefined,
    recommendations: recommendations.length > 0 ? recommendations : undefined,
  };
}
