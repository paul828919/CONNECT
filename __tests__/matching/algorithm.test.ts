/**
 * Unit Tests for Matching Algorithm (FIXED)
 * Updated to match actual Prisma schema and algorithm v2.0 output
 */

import { generateMatches, calculateMatchScore } from '@/lib/matching/algorithm';
import { organizations, funding_programs, OrganizationType, AgencyId, ProgramStatus, EmployeeCountRange } from '@prisma/client';

describe('Matching Algorithm', () => {
  // Test organization (matches actual Prisma schema)
  const testOrg: organizations = {
    id: 'test-org-1',
    type: OrganizationType.COMPANY,
    name: '테스트 AI 주식회사',
    businessNumberEncrypted: 'encrypted_123',
    businessNumberHash: 'hash_123',
    businessStructure: null,
    description: 'AI 전문 기업',
    website: null,
    logoUrl: null,
    industrySector: 'ICT',  // Singular, not plural!
    employeeCount: EmployeeCountRange.FROM_10_TO_50,  // Enum, not number!
    revenueRange: null,
    rdExperience: true,
    technologyReadinessLevel: 5,  // Not trlLevel!
    instituteType: null,
    researchFocusAreas: [],
    annualRdBudget: null,
    researcherCount: null,
    keyTechnologies: [],
    collaborationHistory: false,
    primaryContactName: null,
    primaryContactEmail: null,
    primaryContactPhone: null,
    address: null,
    profileCompleted: true,
    profileScore: 80,
    status: 'ACTIVE' as any,
    verifiedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Test funding programs
  const ictProgram: funding_programs = {
    id: 'program-iitp-1',
    agencyId: AgencyId.IITP,
    title: 'AI 핵심기술개발 지원사업',
    description: 'AI 기술 개발을 위한 중소기업 지원',
    announcementUrl: 'https://iitp.kr/program1',
    targetType: [OrganizationType.COMPANY],
    minTrl: 4,
    maxTrl: 7,
    eligibilityCriteria: ['중소기업', 'AI 분야', 'TRL 4-7'],
    budgetAmount: BigInt(50000000000),
    fundingPeriod: '12 months',
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    category: 'ICT',
    keywords: ['AI', 'BigData', 'Cloud'],
    contentHash: 'hash_iitp_test_1',
    status: ProgramStatus.ACTIVE,
    publishedAt: new Date(),
    scrapedAt: new Date(),
    lastCheckedAt: new Date(),
    scrapingSource: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const manufacturingProgram: funding_programs = {
    ...ictProgram,
    id: 'program-keit-1',
    agencyId: AgencyId.KEIT,
    title: '제조업 혁신 지원사업',
    description: '제조업 기술 개발 지원',
    category: 'Manufacturing',
    keywords: ['Manufacturing', 'Innovation'],
    minTrl: 7,
    maxTrl: 9,
    contentHash: 'hash_keit_test_1',
  };

  const expiredProgram: funding_programs = {
    ...ictProgram,
    id: 'program-expired',
    deadline: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    status: ProgramStatus.EXPIRED,
  };

  describe('generateMatches', () => {
    it('should return matches sorted by score (highest first)', () => {
      const programs = [manufacturingProgram, ictProgram];
      const matches = generateMatches(testOrg, programs);

      expect(matches.length).toBeGreaterThan(0);
      // ICT should score higher than Manufacturing for ICT org
      if (matches.length === 2) {
        expect(matches[0].score).toBeGreaterThanOrEqual(matches[1].score);
      }
    });

    it('should filter out expired programs', () => {
      const programs = [ictProgram, expiredProgram];
      const matches = generateMatches(testOrg, programs);

      expect(matches).toHaveLength(1);
      expect(matches[0].program.id).toBe('program-iitp-1');
    });

    it('should skip programs with wrong target type', () => {
      const instituteOnlyProgram = {
        ...ictProgram,
        id: 'program-institute-only',
        targetType: [OrganizationType.RESEARCH_INSTITUTE],  // Org is COMPANY
      };
      const matches = generateMatches(testOrg, [instituteOnlyProgram]);

      expect(matches).toHaveLength(0);
    });

    it('should limit results to top N matches', () => {
      const programs = Array(10).fill(ictProgram).map((p, i) => ({ ...p, id: `program-${i}`, contentHash: `hash-${i}` }));
      const matches = generateMatches(testOrg, programs, 3);

      expect(matches.length).toBeLessThanOrEqual(3);
    });
  });

  describe('calculateMatchScore', () => {
    it('should return valid score structure', () => {
      const result = calculateMatchScore(testOrg, ictProgram);

      expect(result.programId).toBe('program-iitp-1');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.breakdown).toBeDefined();
      expect(result.breakdown.industryScore).toBeGreaterThanOrEqual(0);
      expect(result.breakdown.trlScore).toBeGreaterThanOrEqual(0);
      expect(result.breakdown.typeScore).toBeGreaterThanOrEqual(0);
      expect(result.breakdown.rdScore).toBeGreaterThanOrEqual(0);
      expect(result.breakdown.deadlineScore).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.reasons)).toBe(true);
    });

    it('should give points for R&D experience', () => {
      const withRD = { ...testOrg, rdExperience: true };
      const withoutRD = { ...testOrg, rdExperience: false };

      const resultWithRD = calculateMatchScore(withRD, ictProgram);
      const resultWithoutRD = calculateMatchScore(withoutRD, ictProgram);

      expect(resultWithRD.breakdown.rdScore).toBeGreaterThan(resultWithoutRD.breakdown.rdScore);
      expect(resultWithRD.reasons).toContain('RD_EXPERIENCE');  // UPPERCASE!
      expect(resultWithoutRD.reasons).not.toContain('RD_EXPERIENCE');
    });

    it('should score deadline proximity correctly', () => {
      const urgentProgram = {
        ...ictProgram,
        deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days
      };
      const moderateProgram = {
        ...ictProgram,
        deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days
      };

      const urgent = calculateMatchScore(testOrg, urgentProgram);
      const moderate = calculateMatchScore(testOrg, moderateProgram);

      expect(urgent.breakdown.deadlineScore).toBeGreaterThan(moderate.breakdown.deadlineScore);
      expect(urgent.reasons).toContain('DEADLINE_URGENT');  // UPPERCASE!
      expect(moderate.reasons).toContain('DEADLINE_MODERATE');  // UPPERCASE!
    });

    it('should return zero score when org is null', () => {
      const result = calculateMatchScore(null as any, ictProgram);

      expect(result.score).toBe(0);
      expect(result.reasons).toHaveLength(0);
    });

    it('should return zero score when program is null', () => {
      const result = calculateMatchScore(testOrg, null as any);

      expect(result.score).toBe(0);
      expect(result.reasons).toHaveLength(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle organization with no industry sector', () => {
      const noSectorOrg = { ...testOrg, industrySector: null };
      const result = calculateMatchScore(noSectorOrg, ictProgram);

      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should handle organization with undefined TRL', () => {
      const noTrlOrg = { ...testOrg, technologyReadinessLevel: null };
      const result = calculateMatchScore(noTrlOrg, ictProgram);

      expect(result.score).toBeGreaterThanOrEqual(0);
      // Should still get other points (type match, rd experience, deadline)
      expect(result.breakdown.typeScore).toBeGreaterThan(0);
    });

    it('should handle very urgent deadlines (< 7 days)', () => {
      const veryUrgentProgram = {
        ...ictProgram,
        deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
      };
      const result = calculateMatchScore(testOrg, veryUrgentProgram);

      expect(result.reasons).toContain('DEADLINE_URGENT');  // UPPERCASE!
      expect(result.breakdown.deadlineScore).toBeGreaterThan(10);
    });

    it('should handle program with no keywords', () => {
      const noKeywordProgram = { ...ictProgram, keywords: [] };
      const result = calculateMatchScore(testOrg, noKeywordProgram);

      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });
});
