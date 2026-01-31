import { OrganizationType } from '@prisma/client';
import { scoreSemanticRelevance } from '../semantic-scorer';

const ictOrg = {
  id: 'o1',
  type: OrganizationType.COMPANY,
  industrySector: 'ICT',
  keyTechnologies: ['AI', '데이터분석', '클라우드'],
  technologyDomainsSpecific: ['인공지능', 'SaaS'],
  researchFocusAreas: ['머신러닝', '자연어처리'],
  technologyReadinessLevel: 6,
  targetResearchTRL: null,
  rdExperience: true,
  companyScaleType: 'SME',
} as any;

describe('Semantic Scorer', () => {
  test('scores high for ICT org + ICT program', () => {
    const program = {
      title: 'AI 데이터 플랫폼 기술개발사업',
      ministry: '과학기술정보통신부',
      keywords: ['AI', '데이터', '플랫폼'],
      programIntent: null,
      deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    } as any;

    const result = scoreSemanticRelevance(ictOrg, program, null);
    expect(result.score).toBeGreaterThanOrEqual(30);
    expect(result.breakdown.domainRelevance).toBeGreaterThanOrEqual(20);
    expect(result.breakdown.capabilityFit).toBeGreaterThanOrEqual(6);
    expect(result.negativeSignals.length).toBe(0);
  });

  test('scores low for ICT org + BIO_HEALTH dementia program', () => {
    const program = {
      title: '치매의료기술연구개발사업',
      ministry: '보건복지부',
      keywords: ['치매', '의료', '임상'],
      programIntent: null,
      deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    } as any;

    const result = scoreSemanticRelevance(ictOrg, program, null);
    // Should have domain mismatch penalty
    expect(result.breakdown.negativeSignals).toBeLessThan(0);
    // ICT → BIO_HEALTH relevance = 0.4 → domainRelevance = 10/25
    expect(result.breakdown.domainRelevance).toBeLessThanOrEqual(13);
    // Combined score should be low
    expect(result.score).toBeLessThan(40);
  });

  test('scores zero keyword overlap for unrelated program', () => {
    const program = {
      title: '선박 구조물 안전성 평가',
      ministry: '해양수산부',
      keywords: ['선박', '구조물', '안전'],
      programIntent: null,
      deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    } as any;

    const result = scoreSemanticRelevance(ictOrg, program, null);
    expect(result.breakdown.capabilityFit).toBeLessThanOrEqual(3);
  });

  test('intent alignment rewards matching TRL-to-intent', () => {
    const program = {
      title: '응용연구 기술개발',
      ministry: '과학기술정보통신부',
      keywords: [],
      programIntent: 'APPLIED_RESEARCH',
      deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    } as any;

    // ictOrg has TRL 6, which matches APPLIED_RESEARCH (TRL 4-6)
    const result = scoreSemanticRelevance(ictOrg, program, null);
    expect(result.breakdown.intentAlignment).toBeGreaterThanOrEqual(5);
  });

  test('total score is capped at 65', () => {
    const program = {
      title: 'AI 인공지능 머신러닝 데이터분석 클라우드 SaaS 플랫폼',
      ministry: '과학기술정보통신부',
      keywords: ['AI', '인공지능', '머신러닝', '데이터분석', '클라우드', 'SaaS'],
      programIntent: 'APPLIED_RESEARCH',
      deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    } as any;

    const result = scoreSemanticRelevance(ictOrg, program, null);
    expect(result.score).toBeLessThanOrEqual(65);
  });
});
