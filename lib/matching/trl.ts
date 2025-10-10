/**
 * Enhanced TRL (Technology Readiness Level) Scoring
 *
 * Provides graduated scoring instead of binary pass/fail:
 * - Perfect match: 20 points
 * - Close match (±1 TRL): 12-15 points
 * - Moderate match (±2 TRL): 6-10 points
 * - Far match (±3+ TRL): 0-5 points
 *
 * TRL Scale (1-9):
 * 1-3: Basic research (기초연구)
 * 4-6: Applied research & development (응용연구)
 * 7-9: Commercialization & deployment (상용화)
 */

import { Organization, FundingProgram } from '@prisma/client';

export interface TRLMatchResult {
  score: number; // 0-20 points
  reason: string;
  details: {
    orgTRL: number | null;
    minTRL: number | null;
    maxTRL: number | null;
    difference: number; // Distance from ideal range
    isWithinRange: boolean;
  };
}

/**
 * Enhanced TRL scoring with graduated weighting
 */
export function scoreTRLEnhanced(
  org: Organization,
  program: FundingProgram
): TRLMatchResult {
  const orgTRL = org.technologyReadinessLevel;
  const minTRL = program.minTrl;
  const maxTRL = program.maxTrl;

  const result: TRLMatchResult = {
    score: 0,
    reason: 'TRL_NO_DATA',
    details: {
      orgTRL,
      minTRL,
      maxTRL,
      difference: 0,
      isWithinRange: false,
    },
  };

  // No TRL data from organization
  if (!orgTRL) {
    result.score = 5; // Small default score (assume eligible)
    result.reason = 'TRL_NOT_PROVIDED';
    return result;
  }

  // No TRL requirement from program
  if (!minTRL && !maxTRL) {
    result.score = 15; // Good score (no restriction)
    result.reason = 'TRL_NO_REQUIREMENT';
    return result;
  }

  // Calculate ideal TRL midpoint
  const programMinTRL = minTRL || 1;
  const programMaxTRL = maxTRL || 9;
  const idealTRL = (programMinTRL + programMaxTRL) / 2;

  // Check if within range
  const withinMin = orgTRL >= programMinTRL;
  const withinMax = orgTRL <= programMaxTRL;

  if (withinMin && withinMax) {
    // Perfect fit within range
    result.score = 20;
    result.reason = 'TRL_PERFECT_MATCH';
    result.details.isWithinRange = true;
    result.details.difference = Math.abs(orgTRL - idealTRL);
    return result;
  }

  // Calculate distance from range
  let distance = 0;
  if (orgTRL < programMinTRL) {
    distance = programMinTRL - orgTRL;
    result.reason = getTRLTooLowReason(distance);
  } else if (orgTRL > programMaxTRL) {
    distance = orgTRL - programMaxTRL;
    result.reason = getTRLTooHighReason(distance);
  }

  result.details.difference = distance;

  // Graduated scoring based on distance
  if (distance === 1) {
    // Very close (±1 TRL level)
    result.score = orgTRL < programMinTRL ? 12 : 15; // Higher score if too advanced
  } else if (distance === 2) {
    // Moderate distance (±2 TRL levels)
    result.score = orgTRL < programMinTRL ? 6 : 10;
  } else if (distance === 3) {
    // Far distance (±3 TRL levels)
    result.score = orgTRL < programMinTRL ? 3 : 5;
  } else {
    // Very far distance (±4+ TRL levels)
    result.score = 0;
  }

  return result;
}

/**
 * Get reason code for TRL too low
 */
function getTRLTooLowReason(distance: number): string {
  if (distance === 1) return 'TRL_TOO_LOW_CLOSE';
  if (distance === 2) return 'TRL_TOO_LOW_MODERATE';
  return 'TRL_TOO_LOW_FAR';
}

/**
 * Get reason code for TRL too high
 */
function getTRLTooHighReason(distance: number): string {
  if (distance === 1) return 'TRL_TOO_HIGH_CLOSE';
  if (distance === 2) return 'TRL_TOO_HIGH_MODERATE';
  return 'TRL_TOO_HIGH_FAR';
}

/**
 * Get TRL stage name in Korean
 */
export function getTRLStageName(trl: number): string {
  if (trl >= 1 && trl <= 3) return '기초연구';
  if (trl >= 4 && trl <= 6) return '응용연구/개발';
  if (trl >= 7 && trl <= 9) return '상용화/사업화';
  return '미분류';
}

/**
 * Get TRL description in Korean
 */
export function getTRLDescription(trl: number): string {
  const descriptions: Record<number, string> = {
    1: 'TRL 1: 기본 원리 발견',
    2: 'TRL 2: 기술 개념 정립',
    3: 'TRL 3: 개념 증명 (PoC)',
    4: 'TRL 4: 실험실 검증',
    5: 'TRL 5: 실제 환경 시험',
    6: 'TRL 6: 시제품 제작',
    7: 'TRL 7: 파일럿 생산',
    8: 'TRL 8: 실증 및 인증',
    9: 'TRL 9: 양산 및 상용화',
  };

  return descriptions[trl] || `TRL ${trl}`;
}

/**
 * Suggest appropriate TRL progression for organization
 */
export function suggestTRLProgression(currentTRL: number): {
  currentStage: string;
  nextStage: string;
  recommendation: string;
} {
  const currentStage = getTRLStageName(currentTRL);

  if (currentTRL <= 3) {
    return {
      currentStage,
      nextStage: '응용연구/개발',
      recommendation: '기초연구 단계입니다. 응용연구로 진행하기 위한 프로그램을 찾아보세요.',
    };
  } else if (currentTRL <= 6) {
    return {
      currentStage,
      nextStage: '상용화/사업화',
      recommendation: '응용연구 단계입니다. 시제품 제작 및 실증을 위한 프로그램을 찾아보세요.',
    };
  } else {
    return {
      currentStage,
      nextStage: '시장 확대',
      recommendation: '상용화 단계입니다. 시장진입 및 사업화 지원 프로그램을 찾아보세요.',
    };
  }
}

/**
 * Check if program suits organization's TRL stage
 */
export function isTRLStageCompatible(
  orgTRL: number,
  programMinTRL: number | null,
  programMaxTRL: number | null
): {
  compatible: boolean;
  compatibility: 'perfect' | 'good' | 'moderate' | 'poor';
} {
  if (!programMinTRL && !programMaxTRL) {
    return { compatible: true, compatibility: 'good' };
  }

  const minTRL = programMinTRL || 1;
  const maxTRL = programMaxTRL || 9;

  // Within range
  if (orgTRL >= minTRL && orgTRL <= maxTRL) {
    return { compatible: true, compatibility: 'perfect' };
  }

  // Close to range (±1)
  if (Math.abs(orgTRL - minTRL) <= 1 || Math.abs(orgTRL - maxTRL) <= 1) {
    return { compatible: true, compatibility: 'good' };
  }

  // Moderate distance (±2)
  if (Math.abs(orgTRL - minTRL) <= 2 || Math.abs(orgTRL - maxTRL) <= 2) {
    return { compatible: true, compatibility: 'moderate' };
  }

  // Too far
  return { compatible: false, compatibility: 'poor' };
}

/**
 * Get recommended programs by TRL stage
 */
export function getRecommendedProgramsByTRL(trl: number): {
  stage: string;
  programTypes: string[];
  examples: string[];
} {
  if (trl <= 3) {
    return {
      stage: '기초연구 (TRL 1-3)',
      programTypes: ['기초연구', '원천기술개발', '창의도전연구'],
      examples: [
        '개인기초연구지원사업',
        '창의도전연구기반지원사업',
        '기초연구실지원사업',
      ],
    };
  } else if (trl <= 6) {
    return {
      stage: '응용연구/개발 (TRL 4-6)',
      programTypes: ['응용연구', '실용화기술개발', '산학협력'],
      examples: [
        'ICT R&D 혁신 바우처',
        '산업기술 R&D',
        '중소기업 기술개발 지원',
      ],
    };
  } else {
    return {
      stage: '상용화/사업화 (TRL 7-9)',
      programTypes: ['사업화', '시장진입', '제품화'],
      examples: [
        '창업성장기술개발사업',
        '수출바우처사업',
        '기술사업화지원사업',
      ],
    };
  }
}
