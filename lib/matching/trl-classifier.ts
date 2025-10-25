/**
 * TRL (Technology Readiness Level) Classification Module
 *
 * Provides standardized TRL stage classification with Korean descriptions
 * for matching organizations to appropriate funding programs.
 *
 * TRL Scale (1-9):
 * - TRL 1-3: Basic Research (기초연구)
 * - TRL 4-6: Applied Research (응용연구)
 * - TRL 7-9: Commercialization (실용화/사업화)
 *
 * Usage:
 * ```typescript
 * import { getTRLStage, getTRLDescription, classifyTRL } from '@/lib/matching/trl-classifier';
 *
 * const stage = getTRLStage(5); // 'APPLIED_RESEARCH'
 * const description = getTRLDescription(5); // '응용연구 및 시제품 개발'
 * const classification = classifyTRL(4, 6); // Full classification object
 * ```
 */

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * TRL stage classification
 */
export type TRLStage = 'BASIC_RESEARCH' | 'APPLIED_RESEARCH' | 'COMMERCIALIZATION';

/**
 * TRL classification result
 */
export interface TRLClassification {
  minTRL: number;
  maxTRL: number;
  stage: TRLStage;
  stageKorean: string;
  description: string;
  keywords: string[];
}

// ============================================================================
// TRL Stage Mapping
// ============================================================================

/**
 * Map TRL level to research stage
 */
export function getTRLStage(trl: number): TRLStage {
  if (trl >= 1 && trl <= 3) return 'BASIC_RESEARCH';
  if (trl >= 4 && trl <= 6) return 'APPLIED_RESEARCH';
  if (trl >= 7 && trl <= 9) return 'COMMERCIALIZATION';

  // Default to APPLIED_RESEARCH if out of range (should not happen)
  return 'APPLIED_RESEARCH';
}

/**
 * Get Korean stage label
 */
export function getStageKorean(stage: TRLStage): string {
  switch (stage) {
    case 'BASIC_RESEARCH':
      return '기초연구';
    case 'APPLIED_RESEARCH':
      return '응용연구';
    case 'COMMERCIALIZATION':
      return '실용화/사업화';
  }
}

// ============================================================================
// TRL Level Descriptions (Korean)
// ============================================================================

/**
 * Get detailed Korean description for TRL level
 */
export function getTRLDescription(trl: number): string {
  const descriptions: Record<number, string> = {
    1: '기본 원리 관찰 및 보고 (Basic principles observed)',
    2: '기술 개념 정립 (Technology concept formulated)',
    3: '개념 증명 (Proof of concept)',
    4: '실험실 환경 검증 (Laboratory validation)',
    5: '관련 환경 검증 (Validation in relevant environment)',
    6: '시제품 제작 및 시연 (Prototype demonstration)',
    7: '실제 환경 시스템 시연 (System prototype in operational environment)',
    8: '시스템 완성 및 인증 (System complete and qualified)',
    9: '실제 운영 환경 검증 (Actual system proven through operations)',
  };

  return descriptions[trl] || '알 수 없는 기술성숙도';
}

/**
 * Get stage-level description (covers TRL range)
 */
export function getStageDescription(stage: TRLStage): string {
  switch (stage) {
    case 'BASIC_RESEARCH':
      return '기초 및 원천기술 연구 (이론 정립, 개념 증명)';
    case 'APPLIED_RESEARCH':
      return '응용연구 및 시제품 개발 (실험실 검증, 프로토타입 제작)';
    case 'COMMERCIALIZATION':
      return '실용화 및 사업화 (실증, 양산, 시장 진입)';
  }
}

// ============================================================================
// TRL Keywords (for matching)
// ============================================================================

/**
 * Get typical keywords associated with TRL stage
 */
export function getStageKeywords(stage: TRLStage): string[] {
  switch (stage) {
    case 'BASIC_RESEARCH':
      return [
        '기초연구',
        '원천기술',
        '이론연구',
        '기본원리',
        '개념정립',
        '아이디어검증',
        '연구개발',
      ];
    case 'APPLIED_RESEARCH':
      return [
        '응용연구',
        '개발연구',
        '시제품',
        '프로토타입',
        '실험실검증',
        '파일럿테스트',
        '개념실증',
        'POC',
      ];
    case 'COMMERCIALIZATION':
      return [
        '실용화',
        '사업화',
        '상용화',
        '시장진입',
        '양산',
        '제품화',
        '실증',
        '사업화지원',
        '마케팅',
      ];
  }
}

// ============================================================================
// TRL Classification (Primary API)
// ============================================================================

/**
 * Generate full TRL classification from TRL range
 *
 * @param minTRL - Minimum TRL (1-9)
 * @param maxTRL - Maximum TRL (1-9)
 * @returns Complete TRL classification object
 *
 * @example
 * ```typescript
 * const classification = classifyTRL(4, 6);
 * console.log(classification.stage); // 'APPLIED_RESEARCH'
 * console.log(classification.description); // '응용연구 및 시제품 개발...'
 * console.log(classification.keywords); // ['응용연구', '개발연구', ...]
 * ```
 */
export function classifyTRL(minTRL: number, maxTRL: number): TRLClassification {
  // Validate TRL range
  if (minTRL < 1 || minTRL > 9 || maxTRL < 1 || maxTRL > 9 || minTRL > maxTRL) {
    throw new Error(`Invalid TRL range: ${minTRL}-${maxTRL}. TRL must be between 1-9.`);
  }

  // Determine stage based on midpoint
  const midpoint = Math.floor((minTRL + maxTRL) / 2);
  const stage = getTRLStage(midpoint);

  // If TRL spans multiple stages, use keywords from all stages
  const stagesInRange = new Set<TRLStage>();
  for (let trl = minTRL; trl <= maxTRL; trl++) {
    stagesInRange.add(getTRLStage(trl));
  }

  const keywords: string[] = [];
  stagesInRange.forEach((s) => {
    keywords.push(...getStageKeywords(s));
  });

  // Deduplicate keywords
  const uniqueKeywords = Array.from(new Set(keywords));

  return {
    minTRL,
    maxTRL,
    stage,
    stageKorean: getStageKorean(stage),
    description: getStageDescription(stage),
    keywords: uniqueKeywords,
  };
}

// ============================================================================
// TRL Compatibility Checking
// ============================================================================

/**
 * Check if organization TRL is compatible with program TRL
 *
 * Compatibility rules:
 * - Exact overlap: org TRL range overlaps with program TRL range
 * - Adjacent stages: org is one stage away (e.g., org at TRL 6, program at TRL 7-9)
 * - Same stage: org and program are in the same TRL stage (broad compatibility)
 *
 * @param orgMinTRL - Organization's minimum TRL
 * @param orgMaxTRL - Organization's maximum TRL
 * @param programMinTRL - Program's minimum TRL
 * @param programMaxTRL - Program's maximum TRL
 * @returns Compatibility score (0-100)
 */
export function calculateTRLCompatibility(
  orgMinTRL: number,
  orgMaxTRL: number,
  programMinTRL: number,
  programMaxTRL: number
): number {
  // Perfect match: exact overlap
  if (orgMinTRL === programMinTRL && orgMaxTRL === programMaxTRL) {
    return 100;
  }

  // Calculate overlap
  const overlapMin = Math.max(orgMinTRL, programMinTRL);
  const overlapMax = Math.min(orgMaxTRL, programMaxTRL);

  // No overlap: check adjacency
  if (overlapMin > overlapMax) {
    // Adjacent stages (e.g., org TRL 4-6, program TRL 7-9)
    const gap = Math.min(
      Math.abs(orgMinTRL - programMaxTRL),
      Math.abs(orgMaxTRL - programMinTRL),
      Math.abs(orgMinTRL - programMinTRL),
      Math.abs(orgMaxTRL - programMaxTRL)
    );

    if (gap === 1) {
      return 60; // Adjacent stage bonus
    } else if (gap === 2) {
      return 40; // One stage away
    } else {
      return 20; // Far apart
    }
  }

  // Calculate overlap percentage
  const orgRange = orgMaxTRL - orgMinTRL + 1;
  const programRange = programMaxTRL - programMinTRL + 1;
  const overlapRange = overlapMax - overlapMin + 1;

  // Score based on overlap proportion (relative to smaller range)
  const minRange = Math.min(orgRange, programRange);
  const overlapPercent = overlapRange / minRange;

  // Convert to 0-100 scale (partial overlap = 70-95)
  return Math.round(70 + overlapPercent * 25);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if TRL is valid (1-9)
 */
export function isValidTRL(trl: number): boolean {
  return Number.isInteger(trl) && trl >= 1 && trl <= 9;
}

/**
 * Format TRL range for display
 */
export function formatTRLRange(minTRL: number, maxTRL: number): string {
  if (minTRL === maxTRL) {
    return `TRL ${minTRL}`;
  }
  return `TRL ${minTRL}-${maxTRL}`;
}

/**
 * Get all TRL stages
 */
export function getAllStages(): TRLStage[] {
  return ['BASIC_RESEARCH', 'APPLIED_RESEARCH', 'COMMERCIALIZATION'];
}
