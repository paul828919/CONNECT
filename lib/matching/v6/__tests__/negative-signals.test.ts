import { detectNegativeSignals, sumNegativeSignalPenalty } from '../negative-signals';
import { OrganizationType } from '@prisma/client';

const ictOrg = {
  id: 'o1',
  type: OrganizationType.COMPANY,
  industrySector: 'ICT',
  companyScaleType: null,
} as any;

const startupOrg = {
  id: 'o2',
  type: OrganizationType.COMPANY,
  industrySector: 'ICT',
  companyScaleType: 'STARTUP',
} as any;

const bioOrg = {
  id: 'o3',
  type: OrganizationType.COMPANY,
  industrySector: 'BIO_HEALTH',
  companyScaleType: null,
} as any;

describe('Negative Signal Detection', () => {
  test('detects ICT + dementia clinical mismatch', () => {
    const program = {
      title: '치매 치료제 임상시험 연구개발',
      ministry: '보건복지부',
    } as any;

    const signals = detectNegativeSignals(ictOrg, program);
    expect(signals.some(s => s.code === 'DOMAIN_MISMATCH_BIO')).toBe(true);
    expect(sumNegativeSignalPenalty(signals)).toBeLessThanOrEqual(-8);
  });

  test('detects ICT + vaccine mismatch', () => {
    const program = {
      title: '신약 백신 개발 지원사업',
      ministry: '보건복지부',
    } as any;

    const signals = detectNegativeSignals(ictOrg, program);
    expect(signals.some(s => s.code === 'DOMAIN_MISMATCH_BIO')).toBe(true);
  });

  test('detects ICT + manufacturing production mismatch', () => {
    const program = {
      title: '기초소재 양산기술 개발',
      ministry: '산업통상자원부',
    } as any;

    const signals = detectNegativeSignals(ictOrg, program);
    expect(signals.some(s => s.code === 'TECH_IRRELEVANT_MANUFACTURING')).toBe(true);
  });

  test('detects ICT + marine fisheries mismatch', () => {
    const program = {
      title: '선박 양식장 관리 기술',
      ministry: '해양수산부',
    } as any;

    const signals = detectNegativeSignals(ictOrg, program);
    expect(signals.some(s => s.code === 'DOMAIN_MISMATCH_MARINE')).toBe(true);
  });

  test('detects ICT + agriculture mismatch (no smart context)', () => {
    const program = {
      title: '축산 품종 개량 연구',
      ministry: '농림축산식품부',
    } as any;

    const signals = detectNegativeSignals(ictOrg, program);
    expect(signals.some(s => s.code === 'DOMAIN_MISMATCH_AGRICULTURE')).toBe(true);
  });

  test('allows ICT + smart farm (digital agriculture)', () => {
    const program = {
      title: 'AI기반 스마트팜 데이터 농업',
      ministry: '농림축산식품부',
    } as any;

    const signals = detectNegativeSignals(ictOrg, program);
    // Smart farm with AI/digital context should NOT trigger agriculture negative signal
    expect(signals.some(s => s.code === 'DOMAIN_MISMATCH_AGRICULTURE')).toBe(false);
  });

  test('detects ICT + defense mismatch (civilian company)', () => {
    const program = {
      title: '무기체계 전투장비 개발',
      ministry: '방위사업청',
    } as any;

    const signals = detectNegativeSignals(ictOrg, program);
    expect(signals.some(s => s.code === 'DOMAIN_MISMATCH_DEFENSE')).toBe(true);
  });

  test('allows ICT + military cyber defense', () => {
    const program = {
      title: '사이버 전자전 기술 개발',
      ministry: '방위사업청',
    } as any;

    const signals = detectNegativeSignals(ictOrg, program);
    // Cyber defense is legitimate for ICT companies
    expect(signals.some(s => s.code === 'DOMAIN_MISMATCH_DEFENSE')).toBe(false);
  });

  test('detects startup + large-scale demonstration mismatch', () => {
    const program = {
      title: '대규모 실증사업 기술개발',
      ministry: '산업통상자원부',
    } as any;

    const signals = detectNegativeSignals(startupOrg, program);
    expect(signals.some(s => s.code === 'SCALE_INAPPROPRIATE')).toBe(true);
  });

  test('no signals for compatible ICT program', () => {
    const program = {
      title: 'AI 플랫폼 기술개발사업',
      ministry: '과학기술정보통신부',
    } as any;

    const signals = detectNegativeSignals(ictOrg, program);
    expect(signals.length).toBe(0);
    expect(sumNegativeSignalPenalty(signals)).toBe(0);
  });

  test('penalty sum is capped at -10 in semantic scorer', () => {
    // Even if multiple signals add up to more than -10, the semantic scorer caps at -10
    const signals = [
      { code: 'A', penalty: -8, detail: 'test' },
      { code: 'B', penalty: -5, detail: 'test' },
    ];
    const total = sumNegativeSignalPenalty(signals);
    expect(total).toBe(-13); // Raw sum; capping is done by semantic scorer
  });

  test('detects BIO + defense mismatch', () => {
    const program = {
      title: '무기체계 전력증강 개발',
      ministry: '방위사업청',
    } as any;

    const signals = detectNegativeSignals(bioOrg, program);
    expect(signals.some(s => s.code === 'DOMAIN_MISMATCH_DEFENSE')).toBe(true);
  });
});
