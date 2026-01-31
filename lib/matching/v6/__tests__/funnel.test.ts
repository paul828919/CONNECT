import { ProgramStatus, OrganizationType } from '@prisma/client';
import { generateMatchesV6 } from '../funnel';

const makeProgram = (overrides: Partial<any> = {}): any => ({
  id: 'p1',
  agencyId: 'NTIS',
  title: 'AI 데이터 플랫폼 기술개발',
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
  keywords: ['AI', '데이터'],
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
  ...overrides,
});

const ictOrg = {
  id: 'o1',
  type: OrganizationType.COMPANY,
  name: 'Innowave',
  industrySector: 'ICT',
  rdExperience: true,
  keyTechnologies: ['AI', '데이터분석'],
  technologyDomainsSpecific: ['인공지능'],
  researchFocusAreas: ['머신러닝'],
  profileCompleted: true,
  certifications: [],
  governmentCertifications: [],
  technologyReadinessLevel: 6,
  targetResearchTRL: null,
  companyScaleType: 'SME',
  collaborationCount: 3,
} as any;

describe('v6 Funnel', () => {
  test('generates match for compatible ICT program', () => {
    const results = generateMatchesV6(ictOrg, [makeProgram()], 3, { minimumScore: 0 });
    expect(results.length).toBe(1);
    expect(results[0].programId).toBe('p1');
    expect(results[0].score).toBeGreaterThan(0);
    expect(results[0].v6Details).toBeDefined();
    expect(results[0].v6Details!.semantic.score).toBeGreaterThan(0);
    expect(results[0].v6Details!.practical.score).toBeGreaterThan(0);
  });

  test('filters out designated projects', () => {
    const program = makeProgram({ title: '2026년 지정과제 연구개발' });
    const results = generateMatchesV6(ictOrg, [program], 3, { minimumScore: 0 });
    expect(results.length).toBe(0);
  });

  test('filters out demand surveys', () => {
    const program = makeProgram({ title: '2026년도 수요조사 안내' });
    const results = generateMatchesV6(ictOrg, [program], 3, { minimumScore: 0 });
    expect(results.length).toBe(0);
  });

  test('filters out expired programs by default', () => {
    const program = makeProgram({
      deadline: new Date(Date.now() - 1000 * 60 * 60 * 24), // Yesterday
    });
    const results = generateMatchesV6(ictOrg, [program], 3, { minimumScore: 0 });
    expect(results.length).toBe(0);
  });

  test('applies minimum score threshold', () => {
    const results = generateMatchesV6(ictOrg, [makeProgram()], 3, { minimumScore: 95 });
    // Very high threshold — likely no matches pass
    expect(results.every(r => r.score >= 95)).toBe(true);
  });

  test('returns v4-compatible breakdown shape', () => {
    const results = generateMatchesV6(ictOrg, [makeProgram()], 3, { minimumScore: 0 });
    expect(results.length).toBe(1);
    const breakdown = results[0].breakdown;
    expect(typeof breakdown.keywordScore).toBe('number');
    expect(typeof breakdown.industryScore).toBe('number');
    expect(typeof breakdown.trlScore).toBe('number');
    expect(typeof breakdown.typeScore).toBe('number');
    expect(typeof breakdown.rdScore).toBe('number');
    expect(typeof breakdown.deadlineScore).toBe('number');
  });

  test('deduplicates programs by title', () => {
    const p1 = makeProgram({ id: 'p1', title: 'AI 기술개발 사업' });
    const p2 = makeProgram({ id: 'p2', title: 'AI 기술개발 사업' });
    const results = generateMatchesV6(ictOrg, [p1, p2], 10, { minimumScore: 0 });
    // Should only return 1 match (deduplicated)
    expect(results.length).toBe(1);
  });

  test('치매의료기술 does NOT match ICT company above threshold', () => {
    const program = makeProgram({
      id: 'p-dementia',
      title: '치매의료기술연구개발사업',
      ministry: '보건복지부',
      category: 'BIO_HEALTH',
      keywords: ['치매', '의료', '임상'],
    });
    const results = generateMatchesV6(ictOrg, [program], 3, { minimumScore: 55 });
    // Dementia program should NOT appear for ICT company above 55 threshold
    expect(results.length).toBe(0);
  });

  test('handles empty programs array', () => {
    const results = generateMatchesV6(ictOrg, [], 3);
    expect(results).toEqual([]);
  });

  test('handles null organization', () => {
    const results = generateMatchesV6(null as any, [makeProgram()], 3);
    expect(results).toEqual([]);
  });

  test('respects limit parameter', () => {
    const programs = [
      makeProgram({ id: 'p1', title: 'AI 기술개발 A' }),
      makeProgram({ id: 'p2', title: 'AI 기술개발 B' }),
      makeProgram({ id: 'p3', title: 'AI 기술개발 C' }),
      makeProgram({ id: 'p4', title: 'AI 기술개발 D' }),
    ];
    const results = generateMatchesV6(ictOrg, programs, 2, { minimumScore: 0 });
    expect(results.length).toBeLessThanOrEqual(2);
  });
});
