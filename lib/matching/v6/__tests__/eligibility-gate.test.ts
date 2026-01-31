import { ProgramStatus, OrganizationType } from '@prisma/client';
import { evaluateEligibilityGate } from '../eligibility-gate';

const baseProgram = {
  id: 'p1',
  agencyId: 'NTIS',
  title: 'AI 인공지능 기술개발 사업',
  description: null,
  announcementUrl: 'https://example.com',
  targetType: [OrganizationType.COMPANY],
  minTrl: null,
  maxTrl: null,
  eligibilityCriteria: null,
  budgetAmount: BigInt(100000000),
  fundingPeriod: null,
  deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
  category: 'ICT',
  keywords: ['AI', '인공지능'],
  contentHash: 'hash',
  status: ProgramStatus.ACTIVE,
  publishedAt: null,
  applicationStart: new Date(),
  scrapedAt: new Date(),
  lastCheckedAt: new Date(),
  scrapingSource: 'TEST',
  createdAt: new Date(),
  updatedAt: new Date(),
  announcementType: 'R_D_PROJECT',
  announcingAgency: null,
  ministry: '과학기술정보통신부',
  trlClassification: null,
  trlConfidence: null,
  allowedBusinessStructures: [],
  attachmentUrls: [],
  trlInferred: false,
  requiredCertifications: [],
  preferredCertifications: [],
  requiredMinEmployees: null,
  requiredMaxEmployees: null,
  requiredMinRevenue: null,
  requiredMaxRevenue: null,
  requiredInvestmentAmount: null,
  requiredOperatingYears: null,
  maxOperatingYears: null,
  requiresResearchInstitute: false,
  eligibilityConfidence: 'LOW',
  manualReviewRequired: false,
  manualReviewNotes: null,
  manualReviewCompletedAt: null,
  manualReviewCompletedBy: null,
  eligibilityLastUpdated: null,
  primaryTargetIndustry: null,
  secondaryTargetIndustries: [],
  semanticSubDomain: null,
  technologyDomainsSpecific: [],
  targetCompanyProfile: null,
  programIntent: null,
  semanticConfidence: 0,
  semanticEnrichedAt: null,
  semanticEnrichmentModel: null,
  idealApplicantProfile: null,
  idealProfileGeneratedAt: null,
  idealProfileVersion: null,
} as any;

const baseOrg = {
  id: 'o1',
  type: OrganizationType.COMPANY,
  name: 'Test ICT Corp',
  industrySector: 'ICT',
  businessNumberEncrypted: 'x',
  businessNumberHash: 'y',
  profileCompleted: true,
  rdExperience: true,
  certifications: [],
  governmentCertifications: [],
  keyTechnologies: ['AI', '데이터분석'],
  technologyDomainsSpecific: ['인공지능'],
  researchFocusAreas: ['머신러닝'],
  createdAt: new Date(),
  updatedAt: new Date(),
} as any;

describe('Eligibility Gate', () => {
  test('passes open competition program for compatible org', () => {
    const result = evaluateEligibilityGate(baseProgram, baseOrg);
    expect(result.passed).toBe(true);
    expect(result.applicationType).toBe('OPEN_COMPETITION');
    expect(result.blockReasons).toEqual([]);
  });

  test('blocks designated projects (지정과제)', () => {
    const program = { ...baseProgram, title: '2026년 지정과제 연구개발' };
    const result = evaluateEligibilityGate(program, baseOrg);
    expect(result.passed).toBe(false);
    expect(result.blockReasons).toContain('DESIGNATED_PROJECT');
  });

  test('blocks 위탁과제', () => {
    const program = { ...baseProgram, title: '2026년도 위탁과제 공고' };
    const result = evaluateEligibilityGate(program, baseOrg);
    expect(result.passed).toBe(false);
    expect(result.blockReasons).toContain('DESIGNATED_PROJECT');
  });

  test('blocks demand surveys (수요조사)', () => {
    const program = { ...baseProgram, title: '2026년도 수요조사 안내' };
    const result = evaluateEligibilityGate(program, baseOrg);
    expect(result.passed).toBe(false);
    expect(result.blockReasons).toContain('DEMAND_SURVEY');
  });

  test('blocks institutional-only for companies', () => {
    const program = { ...baseProgram, title: '출연(연) 전용 과제' };
    const result = evaluateEligibilityGate(program, baseOrg);
    expect(result.passed).toBe(false);
    expect(result.blockReasons).toContain('INSTITUTIONAL_ONLY');
  });

  test('blocks consolidated announcements (no deadline/start/budget)', () => {
    const program = {
      ...baseProgram,
      title: '2026년도 통합 공고',
      deadline: null,
      applicationStart: null,
      budgetAmount: null,
    };
    const result = evaluateEligibilityGate(program, baseOrg);
    expect(result.passed).toBe(false);
    expect(result.blockReasons).toContain('CONSOLIDATED_ANNOUNCEMENT');
  });

  test('blocks training programs for companies', () => {
    const program = { ...baseProgram, title: '산업혁신인재성장지원(교육훈련)사업' };
    const result = evaluateEligibilityGate(program, baseOrg);
    expect(result.passed).toBe(false);
    expect(result.blockReasons).toContain('TRAINING_PROGRAM');
  });

  test('allows training programs with R&D keywords', () => {
    const program = { ...baseProgram, title: '인재성장 기술개발 과제공모' };
    const result = evaluateEligibilityGate(program, baseOrg);
    // Should NOT be blocked because 기술개발 and 과제공모 are strong R&D keywords
    expect(result.blockReasons).not.toContain('TRAINING_PROGRAM');
  });

  test('blocks hospital-only programs for companies', () => {
    const program = { ...baseProgram, title: '의사과학자 공동연구 지원' };
    const result = evaluateEligibilityGate(program, baseOrg);
    expect(result.passed).toBe(false);
    expect(result.blockReasons).toContain('HOSPITAL_ONLY');
  });

  test('blocks org type mismatch', () => {
    const program = { ...baseProgram, targetType: ['RESEARCH_INSTITUTE'] };
    const result = evaluateEligibilityGate(program, baseOrg);
    expect(result.passed).toBe(false);
    expect(result.blockReasons).toContain('ORG_TYPE_MISMATCH');
  });

  test('blocks TRL out of range', () => {
    const org = { ...baseOrg, technologyReadinessLevel: 8 };
    const program = { ...baseProgram, minTrl: 1, maxTrl: 3 };
    const result = evaluateEligibilityGate(program, org);
    expect(result.passed).toBe(false);
    expect(result.blockReasons).toContain('TRL_OUT_OF_RANGE');
  });

  test('passes TRL within range', () => {
    const org = { ...baseOrg, technologyReadinessLevel: 5 };
    const program = { ...baseProgram, minTrl: 3, maxTrl: 7 };
    const result = evaluateEligibilityGate(program, org);
    expect(result.blockReasons).not.toContain('TRL_OUT_OF_RANGE');
  });

  test('blocks cross-industry without keyword overlap', () => {
    const org = { ...baseOrg, industrySector: 'ICT', keyTechnologies: ['AI', 'SaaS'] };
    const program = {
      ...baseProgram,
      title: '치매의료기술연구개발사업',
      ministry: '보건복지부',
      category: 'BIO_HEALTH',
      keywords: ['치매', '의료'],
    };
    const result = evaluateEligibilityGate(program, org);
    expect(result.passed).toBe(false);
    // Should be blocked by industry mismatch (ICT → BIO_HEALTH = 0.5, requires keyword overlap)
  });

  test('blocks SME large enterprise from 중소벤처기업부', () => {
    const org = { ...baseOrg, companyScaleType: 'LARGE_ENTERPRISE' };
    const program = {
      ...baseProgram,
      title: '창업성장기술개발사업',
      ministry: '중소벤처기업부',
    };
    const result = evaluateEligibilityGate(program, org);
    expect(result.passed).toBe(false);
    expect(result.blockReasons).toContain('SME_SCALE_BLOCK');
  });
});
