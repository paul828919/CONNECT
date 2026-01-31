import { organizations, funding_programs } from '@prisma/client';
import { classifyProgram } from '../keyword-classifier';
import { NegativeSignal } from './types';

const BIO_HARD_NEGATIVE_KEYWORDS = [
  '임상', '임상시험', '치매', '신약', '약물', '치료제',
  '세포치료', '줄기세포', '유전자치료', '백신', '항체',
  '의약품', '의료기기인허가', '독성시험', '동물실험',
];

const MANUFACTURING_HARD_NEGATIVE_KEYWORDS = [
  '양산', '제조공정', '공정개선', '소재', '부품', '소부장',
];

export function detectNegativeSignals(
  organization: organizations,
  program: funding_programs
): NegativeSignal[] {
  const signals: NegativeSignal[] = [];
  const title = program.title || '';

  const classification = classifyProgram(program.title, null, program.ministry || null);

  if (organization.industrySector?.toUpperCase().includes('ICT')) {
    const hasBioKeywords = BIO_HARD_NEGATIVE_KEYWORDS.some(k => title.includes(k));
    if (classification.industry === 'BIO_HEALTH' && hasBioKeywords) {
      signals.push({
        code: 'DOMAIN_MISMATCH_BIO',
        penalty: -8,
        detail: '의료/임상 중심 과제는 ICT 기업에 부적합',
      });
    }
  }

  if (organization.industrySector?.toUpperCase().includes('ICT')) {
    const hasManufacturingKeywords = MANUFACTURING_HARD_NEGATIVE_KEYWORDS.some(k => title.includes(k));
    if (classification.industry === 'MANUFACTURING' && hasManufacturingKeywords) {
      signals.push({
        code: 'TECH_IRRELEVANT_MANUFACTURING',
        penalty: -5,
        detail: '제조·양산 중심 과제는 소프트웨어 조직에 부적합',
      });
    }
  }

  return signals;
}

export function sumNegativeSignalPenalty(signals: NegativeSignal[]): number {
  return signals.reduce((total, signal) => total + signal.penalty, 0);
}
