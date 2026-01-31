/**
 * Negative Signal Detection (v6.0)
 *
 * Detects active mismatches between organization profiles and funding programs.
 * Unlike the additive-only v4 scoring (where irrelevant programs could accumulate
 * 65+ points from TRL/deadline/type), negative signals explicitly penalize
 * fundamentally incompatible matches.
 *
 * Signal categories:
 * - DOMAIN_MISMATCH: Industry domain is actively wrong (ICT + 치매 임상시험)
 * - TECH_IRRELEVANT: Technology stack is incompatible (SaaS + 기초소재 양산)
 * - SCALE_INAPPROPRIATE: Company scale doesn't fit program scope
 *
 * Penalty range: -10 to 0 (capped at -10 total)
 */

import { organizations, funding_programs } from '@prisma/client';
import { classifyProgram } from '../keyword-classifier';
import { NegativeSignal } from './types';

// ═══════════════════════════════════════════════════════════════
// Domain-Specific Hard Negative Keywords
// ═══════════════════════════════════════════════════════════════
// These keywords, when present in a program title, are STRONG signals
// that the program is NOT relevant for companies in the specified sector.

/** Bio/medical clinical terms — hard negative for ICT companies */
const BIO_HARD_NEGATIVE_KEYWORDS = [
  '임상', '임상시험', '치매', '신약', '약물', '치료제',
  '세포치료', '줄기세포', '유전자치료', '백신', '항체',
  '의약품', '의료기기인허가', '독성시험', '동물실험',
  '조직공학', '재생의료', '항암', '감염병', '바이러스',
];

/** Manufacturing/materials terms — hard negative for software/SaaS */
const MANUFACTURING_HARD_NEGATIVE_KEYWORDS = [
  '양산', '제조공정', '공정개선', '소재', '부품', '소부장',
  '기초소재', '양산기술', '금형', '주조', '용접', '열처리',
  '도금', '표면처리', '소성가공',
];

/** Marine/fisheries terms — hard negative for ICT */
const MARINE_HARD_NEGATIVE_KEYWORDS = [
  '선박', '어업', '양식', '수산', '해운', '항만', '조선',
  '해양생물', '해조류', '극지', '심해',
];

/** Agriculture/forestry terms — hard negative for ICT */
const AGRICULTURE_HARD_NEGATIVE_KEYWORDS = [
  '농업', '축산', '작물', '종자', '품종', '비료', '농약',
  '산림', '임업', '목재', '산불',
];

/** Defense/military terms — hard negative for most civilian companies */
const DEFENSE_HARD_NEGATIVE_KEYWORDS = [
  '무기체계', '전투', '군사', '국방', '방위', '병기',
  '군수', '전력증강',
];

/**
 * Detect negative signals between an organization and a program.
 *
 * Each signal carries a penalty (negative number) that will be subtracted
 * from the semantic score. The total penalty is capped at -10.
 */
export function detectNegativeSignals(
  organization: organizations,
  program: funding_programs
): NegativeSignal[] {
  const signals: NegativeSignal[] = [];
  const title = program.title || '';
  const orgSector = organization.industrySector?.toUpperCase() || '';

  const classification = classifyProgram(program.title, null, program.ministry || null);

  // ═══════════════════════════════════════════════════════════════
  // ICT company negative signals
  // ═══════════════════════════════════════════════════════════════
  if (orgSector.includes('ICT') || orgSector.includes('SOFTWARE') || orgSector.includes('IT')) {
    // ICT + BIO_HEALTH clinical programs
    if (classification.industry === 'BIO_HEALTH') {
      const hasBioKeywords = BIO_HARD_NEGATIVE_KEYWORDS.some(k => title.includes(k));
      if (hasBioKeywords) {
        signals.push({
          code: 'DOMAIN_MISMATCH_BIO',
          penalty: -8,
          detail: '의료/임상 중심 과제는 ICT 기업에 부적합',
        });
      }
    }

    // ICT + MANUFACTURING production programs
    if (classification.industry === 'MANUFACTURING') {
      const hasManufacturingKeywords = MANUFACTURING_HARD_NEGATIVE_KEYWORDS.some(k => title.includes(k));
      if (hasManufacturingKeywords) {
        signals.push({
          code: 'TECH_IRRELEVANT_MANUFACTURING',
          penalty: -5,
          detail: '제조·양산 중심 과제는 소프트웨어 조직에 부적합',
        });
      }
    }

    // ICT + MARINE programs
    if (classification.industry === 'MARINE_FISHERIES') {
      const hasMarineKeywords = MARINE_HARD_NEGATIVE_KEYWORDS.some(k => title.includes(k));
      if (hasMarineKeywords) {
        signals.push({
          code: 'DOMAIN_MISMATCH_MARINE',
          penalty: -6,
          detail: '해양·수산 분야 과제는 ICT 기업에 부적합',
        });
      }
    }

    // ICT + AGRICULTURE/FORESTRY programs
    if (classification.industry === 'AGRICULTURE' || classification.industry === 'FORESTRY') {
      const hasAgriKeywords = AGRICULTURE_HARD_NEGATIVE_KEYWORDS.some(k => title.includes(k));
      if (hasAgriKeywords) {
        // Exception: Smart farm programs with digital/AI keywords are legitimate for ICT
        const hasDigitalContext = /디지털|AI|인공지능|스마트팜|데이터|IoT|자동화/.test(title);
        if (!hasDigitalContext) {
          signals.push({
            code: 'DOMAIN_MISMATCH_AGRICULTURE',
            penalty: -5,
            detail: '농림·축산 분야 과제는 ICT 기업에 부적합',
          });
        }
      }
    }

    // ICT + DEFENSE programs
    if (classification.industry === 'DEFENSE') {
      const hasDefenseKeywords = DEFENSE_HARD_NEGATIVE_KEYWORDS.some(k => title.includes(k));
      if (hasDefenseKeywords) {
        // Exception: Military ICT programs (C4I, cyber defense)
        const hasMilICTContext = /사이버|통신|전자전|C4I|지휘통제|정보전/.test(title);
        if (!hasMilICTContext) {
          signals.push({
            code: 'DOMAIN_MISMATCH_DEFENSE',
            penalty: -6,
            detail: '국방·무기체계 과제는 민간 ICT 기업에 부적합',
          });
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // BIO_HEALTH company negative signals
  // ═══════════════════════════════════════════════════════════════
  if (orgSector.includes('BIO') || orgSector.includes('HEALTH')) {
    // BIO + DEFENSE programs
    if (classification.industry === 'DEFENSE') {
      const hasDefenseKeywords = DEFENSE_HARD_NEGATIVE_KEYWORDS.some(k => title.includes(k));
      if (hasDefenseKeywords) {
        signals.push({
          code: 'DOMAIN_MISMATCH_DEFENSE',
          penalty: -6,
          detail: '국방·무기체계 과제는 바이오헬스 기업에 부적합',
        });
      }
    }

    // BIO + MARINE programs (unless marine bio)
    if (classification.industry === 'MARINE_FISHERIES') {
      const hasMarineKeywords = MARINE_HARD_NEGATIVE_KEYWORDS.some(k => title.includes(k));
      const hasMarineBioContext = /해양바이오|해양생명|해양생물자원/.test(title);
      if (hasMarineKeywords && !hasMarineBioContext) {
        signals.push({
          code: 'DOMAIN_MISMATCH_MARINE',
          penalty: -4,
          detail: '해양·수산 인프라 과제는 바이오헬스 기업에 부적합',
        });
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Scale mismatch signals (any sector)
  // ═══════════════════════════════════════════════════════════════
  const orgScale = organization.companyScaleType;
  if (orgScale === 'STARTUP') {
    // Startup + large-scale demonstration programs
    if (/대규모\s*실증|대형\s*실증|양산체계|대량생산/.test(title)) {
      signals.push({
        code: 'SCALE_INAPPROPRIATE',
        penalty: -4,
        detail: '대규모 실증/양산 사업은 스타트업 규모에 부적합',
      });
    }
  }

  return signals;
}

/**
 * Sum total penalty from all negative signals.
 * Result is always <= 0.
 */
export function sumNegativeSignalPenalty(signals: NegativeSignal[]): number {
  return signals.reduce((total, signal) => total + signal.penalty, 0);
}
