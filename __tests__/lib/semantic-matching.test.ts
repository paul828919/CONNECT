/**
 * Unit Tests for Semantic Sub-Domain Matching
 *
 * Tests the scoreSemanticSubDomainMatch function which implements industry-specific
 * matching logic with hard filters for fundamentally incompatible matches.
 *
 * Algorithm v3.0 Enhancement:
 * - BIO_HEALTH: targetOrganism hard filter (HUMAN vs ANIMAL vs PLANT)
 * - ICT: targetMarket hard filter (CONSUMER vs ENTERPRISE vs GOVERNMENT)
 * - ENERGY: energySource hard filter (SOLAR vs BATTERY vs NUCLEAR)
 * - AGRICULTURE: targetSector hard filter (CROPS vs LIVESTOCK)
 * - DEFENSE: targetDomain hard filter (LAND vs NAVAL vs AEROSPACE)
 */

import { scoreSemanticSubDomainMatch } from '@/lib/matching/algorithm';
import type { organizations, funding_programs, ProgramStatus, OrganizationType } from '@prisma/client';

// Helper to create mock organization with semantic sub-domain
function createMockOrganization(
  semanticSubDomain: Record<string, string> | null,
  category: string = 'BIO_HEALTH'
): organizations {
  return {
    id: 'org-test-123',
    name: 'Test Organization',
    type: 'COMPANY' as OrganizationType,
    email: 'test@example.com',
    industrySector: category,
    semanticSubDomain: semanticSubDomain as unknown as organizations['semanticSubDomain'],
    // Required fields with default values
    businessRegistrationNumber: null,
    businessRegistrationNumberHash: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    technologyReadinessLevel: 5,
    targetResearchTRL: null,
    rdExperience: true,
    collaborationCount: 0,
    researchFocusAreas: [],
    employeeCount: null,
    annualRevenue: null,
    operatingYears: null,
    investmentReceived: null,
    businessStructure: null,
    hasCertification: false,
    isStartup: false,
    isVenture: false,
    isInnobiz: false,
    certificationType: null,
    matchNotificationsEnabled: true,
    preferredNotificationDay: 1,
    minimumMatchScore: 60,
    hasUsedFreeTrial: false,
  };
}

// Helper to create mock funding program with semantic sub-domain
function createMockProgram(
  semanticSubDomain: Record<string, string> | null,
  category: string = 'BIO_HEALTH'
): funding_programs {
  return {
    id: 'prog-test-456',
    title: 'Test Funding Program',
    category,
    semanticSubDomain: semanticSubDomain as unknown as funding_programs['semanticSubDomain'],
    // Required fields with default values
    description: 'Test description',
    status: 'ACTIVE' as ProgramStatus,
    agencyId: 'agency-test',
    sourceUrl: 'https://example.com',
    targetType: ['COMPANY'],
    keywords: [],
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    applicationStart: new Date(),
    applicationEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    budgetAmount: 1000000000,
    budgetCurrency: 'KRW',
    minTrl: 3,
    maxTrl: 7,
    scrapedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    announceType: null,
    maxFundingPerProject: null,
    governmentFundingRatio: null,
    eligibilityCriteria: null,
    requiredDocuments: [],
    contactInfo: null,
    announcementNumber: null,
    titleHash: null,
    allowedBusinessStructures: [],
    researchInstituteFocus: false,
    minOperatingYears: null,
    minAnnualRevenue: null,
    minEmployeeCount: null,
    requiredCertifications: [],
    minInvestmentReceived: null,
    documentContent: null,
    documentAttachments: null,
    documentAnalysis: null,
    documentProcessedAt: null,
    documentError: null,
    processingStatus: null,
    aiExtractedData: null,
    lastAnalyzedAt: null,
  };
}

describe('scoreSemanticSubDomainMatch', () => {
  // ═══════════════════════════════════════════════════════════════
  // No Semantic Data Scenarios
  // ═══════════════════════════════════════════════════════════════

  describe('when semantic data is missing', () => {
    it('should return NO_SEMANTIC_DATA when both org and program have no semantic data', () => {
      const org = createMockOrganization(null);
      const program = createMockProgram(null);

      const result = scoreSemanticSubDomainMatch(org, program);

      expect(result.score).toBe(0);
      expect(result.reason).toBe('NO_SEMANTIC_DATA');
      expect(result.isHardFilter).toBe(false);
      expect(result.matchingFields).toEqual([]);
      expect(result.mismatchedFields).toEqual([]);
    });

    it('should return NO_SEMANTIC_DATA when only org has semantic data', () => {
      const org = createMockOrganization({ targetOrganism: 'HUMAN', applicationArea: 'PHARMA' });
      const program = createMockProgram(null);

      const result = scoreSemanticSubDomainMatch(org, program);

      expect(result.score).toBe(0);
      expect(result.reason).toBe('NO_SEMANTIC_DATA');
      expect(result.isHardFilter).toBe(false);
    });

    it('should return NO_SEMANTIC_DATA when only program has semantic data', () => {
      const org = createMockOrganization(null);
      const program = createMockProgram({ targetOrganism: 'HUMAN', applicationArea: 'PHARMA' });

      const result = scoreSemanticSubDomainMatch(org, program);

      expect(result.score).toBe(0);
      expect(result.reason).toBe('NO_SEMANTIC_DATA');
      expect(result.isHardFilter).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // BIO_HEALTH Hard Filter: targetOrganism
  // ═══════════════════════════════════════════════════════════════

  describe('BIO_HEALTH hard filter (targetOrganism)', () => {
    it('should trigger ORGANISM_MISMATCH when animal company matches human program', () => {
      const org = createMockOrganization(
        { targetOrganism: 'ANIMAL', applicationArea: 'VETERINARY_PHARMA' },
        'BIO_HEALTH'
      );
      const program = createMockProgram(
        { targetOrganism: 'HUMAN', applicationArea: 'PHARMA' },
        'BIO_HEALTH'
      );

      const result = scoreSemanticSubDomainMatch(org, program);

      expect(result.score).toBe(0);
      expect(result.reason).toBe('ORGANISM_MISMATCH');
      expect(result.isHardFilter).toBe(true);
      expect(result.mismatchedFields).toContain('targetOrganism');
      expect(result.explanation).toContain('인체');
      expect(result.explanation).toContain('동물');
    });

    it('should trigger ORGANISM_MISMATCH when human company matches animal program', () => {
      const org = createMockOrganization(
        { targetOrganism: 'HUMAN', applicationArea: 'PHARMA' },
        'BIO_HEALTH'
      );
      const program = createMockProgram(
        { targetOrganism: 'ANIMAL', applicationArea: 'VETERINARY_PHARMA' },
        'BIO_HEALTH'
      );

      const result = scoreSemanticSubDomainMatch(org, program);

      expect(result.score).toBe(0);
      expect(result.reason).toBe('ORGANISM_MISMATCH');
      expect(result.isHardFilter).toBe(true);
    });

    it('should trigger ORGANISM_MISMATCH when plant company matches human program', () => {
      const org = createMockOrganization(
        { targetOrganism: 'PLANT', applicationArea: 'BIO_MATERIAL' },
        'BIO_HEALTH'
      );
      const program = createMockProgram(
        { targetOrganism: 'HUMAN', applicationArea: 'PHARMA' },
        'BIO_HEALTH'
      );

      const result = scoreSemanticSubDomainMatch(org, program);

      expect(result.isHardFilter).toBe(true);
      expect(result.reason).toBe('ORGANISM_MISMATCH');
    });

    it('should MATCH when both target same organism (HUMAN)', () => {
      const org = createMockOrganization(
        { targetOrganism: 'HUMAN', applicationArea: 'PHARMA' },
        'BIO_HEALTH'
      );
      const program = createMockProgram(
        { targetOrganism: 'HUMAN', applicationArea: 'MEDICAL_DEVICE' },
        'BIO_HEALTH'
      );

      const result = scoreSemanticSubDomainMatch(org, program);

      expect(result.isHardFilter).toBe(false);
      expect(result.matchingFields).toContain('targetOrganism');
      expect(result.score).toBeGreaterThan(0);
    });

    it('should MATCH when both target same organism (ANIMAL)', () => {
      const org = createMockOrganization(
        { targetOrganism: 'ANIMAL', applicationArea: 'VETERINARY_PHARMA' },
        'BIO_HEALTH'
      );
      const program = createMockProgram(
        { targetOrganism: 'ANIMAL', applicationArea: 'VETERINARY_DEVICE' },
        'BIO_HEALTH'
      );

      const result = scoreSemanticSubDomainMatch(org, program);

      expect(result.isHardFilter).toBe(false);
      expect(result.matchingFields).toContain('targetOrganism');
      expect(result.score).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // ICT Hard Filter: targetMarket
  // ═══════════════════════════════════════════════════════════════

  describe('ICT hard filter (targetMarket)', () => {
    it('should trigger MARKET_MISMATCH when consumer company matches enterprise program', () => {
      const org = createMockOrganization(
        { targetMarket: 'CONSUMER', applicationArea: 'GAMING' },
        'ICT'
      );
      const program = createMockProgram(
        { targetMarket: 'ENTERPRISE', applicationArea: 'SOFTWARE' },
        'ICT'
      );

      const result = scoreSemanticSubDomainMatch(org, program);

      expect(result.score).toBe(0);
      expect(result.reason).toBe('MARKET_MISMATCH');
      expect(result.isHardFilter).toBe(true);
      expect(result.explanation).toContain('기업');
      expect(result.explanation).toContain('소비자');
    });

    it('should trigger MARKET_MISMATCH when enterprise company matches government program', () => {
      const org = createMockOrganization(
        { targetMarket: 'ENTERPRISE', applicationArea: 'SOFTWARE' },
        'ICT'
      );
      const program = createMockProgram(
        { targetMarket: 'GOVERNMENT', applicationArea: 'PLATFORM' },
        'ICT'
      );

      const result = scoreSemanticSubDomainMatch(org, program);

      expect(result.isHardFilter).toBe(true);
      expect(result.reason).toBe('MARKET_MISMATCH');
    });

    it('should MATCH when both target same market (ENTERPRISE)', () => {
      const org = createMockOrganization(
        { targetMarket: 'ENTERPRISE', applicationArea: 'AI_ML' },
        'ICT'
      );
      const program = createMockProgram(
        { targetMarket: 'ENTERPRISE', applicationArea: 'CLOUD' },
        'ICT'
      );

      const result = scoreSemanticSubDomainMatch(org, program);

      expect(result.isHardFilter).toBe(false);
      expect(result.matchingFields).toContain('targetMarket');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // ENERGY Hard Filter: energySource
  // ═══════════════════════════════════════════════════════════════

  describe('ENERGY hard filter (energySource)', () => {
    it('should trigger ENERGY_SOURCE_MISMATCH when battery company matches nuclear program', () => {
      const org = createMockOrganization(
        { energySource: 'BATTERY', applicationArea: 'STORAGE' },
        'ENERGY'
      );
      const program = createMockProgram(
        { energySource: 'NUCLEAR', applicationArea: 'GENERATION' },
        'ENERGY'
      );

      const result = scoreSemanticSubDomainMatch(org, program);

      expect(result.score).toBe(0);
      expect(result.reason).toBe('ENERGY_SOURCE_MISMATCH');
      expect(result.isHardFilter).toBe(true);
      expect(result.explanation).toContain('원자력');
      expect(result.explanation).toContain('배터리');
    });

    it('should trigger ENERGY_SOURCE_MISMATCH when solar company matches wind program', () => {
      const org = createMockOrganization(
        { energySource: 'SOLAR', applicationArea: 'GENERATION' },
        'ENERGY'
      );
      const program = createMockProgram(
        { energySource: 'WIND', applicationArea: 'GENERATION' },
        'ENERGY'
      );

      const result = scoreSemanticSubDomainMatch(org, program);

      expect(result.isHardFilter).toBe(true);
      expect(result.reason).toBe('ENERGY_SOURCE_MISMATCH');
    });

    it('should MATCH when both focus on same energy source (HYDROGEN)', () => {
      const org = createMockOrganization(
        { energySource: 'HYDROGEN', applicationArea: 'STORAGE' },
        'ENERGY'
      );
      const program = createMockProgram(
        { energySource: 'HYDROGEN', applicationArea: 'GENERATION' },
        'ENERGY'
      );

      const result = scoreSemanticSubDomainMatch(org, program);

      expect(result.isHardFilter).toBe(false);
      expect(result.matchingFields).toContain('energySource');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // AGRICULTURE Hard Filter: targetSector
  // ═══════════════════════════════════════════════════════════════

  describe('AGRICULTURE hard filter (targetSector)', () => {
    it('should trigger SECTOR_MISMATCH when livestock company matches crops program', () => {
      const org = createMockOrganization(
        { targetSector: 'LIVESTOCK', applicationArea: 'BREEDING' },
        'AGRICULTURE'
      );
      const program = createMockProgram(
        { targetSector: 'CROPS', applicationArea: 'CULTIVATION' },
        'AGRICULTURE'
      );

      const result = scoreSemanticSubDomainMatch(org, program);

      expect(result.score).toBe(0);
      expect(result.reason).toBe('SECTOR_MISMATCH');
      expect(result.isHardFilter).toBe(true);
      expect(result.explanation).toContain('작물');
      expect(result.explanation).toContain('축산');
    });

    it('should MATCH when both focus on same sector (AQUACULTURE)', () => {
      const org = createMockOrganization(
        { targetSector: 'AQUACULTURE', applicationArea: 'BREEDING' },
        'AGRICULTURE'
      );
      const program = createMockProgram(
        { targetSector: 'AQUACULTURE', applicationArea: 'PROCESSING' },
        'AGRICULTURE'
      );

      const result = scoreSemanticSubDomainMatch(org, program);

      expect(result.isHardFilter).toBe(false);
      expect(result.matchingFields).toContain('targetSector');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // DEFENSE Hard Filter: targetDomain
  // ═══════════════════════════════════════════════════════════════

  describe('DEFENSE hard filter (targetDomain)', () => {
    it('should trigger DOMAIN_MISMATCH when land company matches naval program', () => {
      const org = createMockOrganization(
        { targetDomain: 'LAND', applicationArea: 'WEAPONS' },
        'DEFENSE'
      );
      const program = createMockProgram(
        { targetDomain: 'NAVAL', applicationArea: 'SYSTEMS' },
        'DEFENSE'
      );

      const result = scoreSemanticSubDomainMatch(org, program);

      expect(result.score).toBe(0);
      expect(result.reason).toBe('DOMAIN_MISMATCH');
      expect(result.isHardFilter).toBe(true);
      expect(result.explanation).toContain('해상');
      expect(result.explanation).toContain('지상');
    });

    it('should trigger DOMAIN_MISMATCH when aerospace company matches cyber program', () => {
      const org = createMockOrganization(
        { targetDomain: 'AEROSPACE', applicationArea: 'SYSTEMS' },
        'DEFENSE'
      );
      const program = createMockProgram(
        { targetDomain: 'CYBER', applicationArea: 'PROTECTION' },
        'DEFENSE'
      );

      const result = scoreSemanticSubDomainMatch(org, program);

      expect(result.isHardFilter).toBe(true);
      expect(result.reason).toBe('DOMAIN_MISMATCH');
    });

    it('should MATCH when both focus on same domain (AEROSPACE)', () => {
      const org = createMockOrganization(
        { targetDomain: 'AEROSPACE', applicationArea: 'SYSTEMS' },
        'DEFENSE'
      );
      const program = createMockProgram(
        { targetDomain: 'AEROSPACE', applicationArea: 'WEAPONS' },
        'DEFENSE'
      );

      const result = scoreSemanticSubDomainMatch(org, program);

      expect(result.isHardFilter).toBe(false);
      expect(result.matchingFields).toContain('targetDomain');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Industries Without Hard Filters (MANUFACTURING, ENVIRONMENT)
  // ═══════════════════════════════════════════════════════════════

  describe('industries without hard filters', () => {
    it('MANUFACTURING should not trigger hard filter even with mismatched targetIndustry', () => {
      const org = createMockOrganization(
        { targetIndustry: 'AUTOMOTIVE', applicationArea: 'PARTS' },
        'MANUFACTURING'
      );
      const program = createMockProgram(
        { targetIndustry: 'AEROSPACE', applicationArea: 'SYSTEMS' },
        'MANUFACTURING'
      );

      const result = scoreSemanticSubDomainMatch(org, program);

      // Should NOT be a hard filter - MANUFACTURING has no hard filter fields
      expect(result.isHardFilter).toBe(false);
      expect(result.mismatchedFields).toContain('targetIndustry');
    });

    it('ENVIRONMENT should not trigger hard filter even with mismatched targetArea', () => {
      const org = createMockOrganization(
        { targetArea: 'AIR', applicationArea: 'MONITORING' },
        'ENVIRONMENT'
      );
      const program = createMockProgram(
        { targetArea: 'WATER', applicationArea: 'TREATMENT' },
        'ENVIRONMENT'
      );

      const result = scoreSemanticSubDomainMatch(org, program);

      // Should NOT be a hard filter - ENVIRONMENT has no hard filter fields
      expect(result.isHardFilter).toBe(false);
      expect(result.mismatchedFields).toContain('targetArea');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Scoring Logic Tests
  // ═══════════════════════════════════════════════════════════════

  describe('scoring logic', () => {
    it('should give maximum score (25) for perfect 2-field match', () => {
      const org = createMockOrganization(
        { targetOrganism: 'HUMAN', applicationArea: 'PHARMA' },
        'BIO_HEALTH'
      );
      const program = createMockProgram(
        { targetOrganism: 'HUMAN', applicationArea: 'PHARMA' },
        'BIO_HEALTH'
      );

      const result = scoreSemanticSubDomainMatch(org, program);

      expect(result.score).toBe(25); // 2 fields * 12 + 2 bonus = 26 capped at 25
      expect(result.matchingFields).toContain('targetOrganism');
      expect(result.matchingFields).toContain('applicationArea');
      expect(result.reason).toBe('SEMANTIC_MATCH');
    });

    it('should give partial score for single field match', () => {
      const org = createMockOrganization(
        { targetOrganism: 'HUMAN', applicationArea: 'PHARMA' },
        'BIO_HEALTH'
      );
      const program = createMockProgram(
        { targetOrganism: 'HUMAN', applicationArea: 'DIAGNOSTICS' },
        'BIO_HEALTH'
      );

      const result = scoreSemanticSubDomainMatch(org, program);

      expect(result.score).toBe(10); // 1 field * 12 + 1 bonus - 3 penalty for soft mismatch = 10
      expect(result.matchingFields).toContain('targetOrganism');
      expect(result.mismatchedFields).toContain('applicationArea');
      expect(result.isHardFilter).toBe(false);
    });

    it('should apply soft penalty for non-hard-filter mismatches', () => {
      const org = createMockOrganization(
        { targetMarket: 'ENTERPRISE', applicationArea: 'AI_ML' },
        'ICT'
      );
      const program = createMockProgram(
        { targetMarket: 'ENTERPRISE', applicationArea: 'CLOUD' },
        'ICT'
      );

      const result = scoreSemanticSubDomainMatch(org, program);

      // targetMarket matches (+13), applicationArea mismatches (-3 soft penalty)
      expect(result.score).toBe(10); // 13 - 3 = 10
      expect(result.matchingFields).toContain('targetMarket');
      expect(result.mismatchedFields).toContain('applicationArea');
    });

    it('should return PARTIAL_MATCH when no fields match but no hard filter', () => {
      const org = createMockOrganization(
        { targetIndustry: 'AUTOMOTIVE', applicationArea: 'PARTS' },
        'MANUFACTURING'
      );
      const program = createMockProgram(
        { targetIndustry: 'SEMICONDUCTOR', applicationArea: 'EQUIPMENT' },
        'MANUFACTURING'
      );

      const result = scoreSemanticSubDomainMatch(org, program);

      expect(result.reason).toBe('PARTIAL_MATCH');
      expect(result.isHardFilter).toBe(false);
      expect(result.matchingFields).toHaveLength(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Edge Cases
  // ═══════════════════════════════════════════════════════════════

  describe('edge cases', () => {
    it('should handle empty semanticSubDomain objects', () => {
      const org = createMockOrganization({}, 'BIO_HEALTH');
      const program = createMockProgram({}, 'BIO_HEALTH');

      const result = scoreSemanticSubDomainMatch(org, program);

      // Empty objects are truthy, but have no fields to compare
      expect(result.score).toBe(0);
      expect(result.reason).toBe('PARTIAL_MATCH');
      expect(result.isHardFilter).toBe(false);
    });

    it('should handle unknown/null category gracefully', () => {
      const org = createMockOrganization(
        { targetOrganism: 'HUMAN' },
        'BIO_HEALTH'
      );
      const programWithNullCategory = createMockProgram(
        { targetOrganism: 'ANIMAL' },
        'BIO_HEALTH'
      );
      // Simulate null category by modifying after creation
      (programWithNullCategory as any).category = null;

      const result = scoreSemanticSubDomainMatch(org, programWithNullCategory);

      // With null category, no hard filters apply
      expect(result.isHardFilter).toBe(false);
    });

    it('should not trigger hard filter when only one party has the field', () => {
      const org = createMockOrganization(
        { targetOrganism: 'HUMAN' }, // Only org has targetOrganism
        'BIO_HEALTH'
      );
      const program = createMockProgram(
        { applicationArea: 'PHARMA' }, // Program only has applicationArea
        'BIO_HEALTH'
      );

      const result = scoreSemanticSubDomainMatch(org, program);

      // Hard filter only applies when BOTH have the field
      expect(result.isHardFilter).toBe(false);
    });

    it('should handle case-sensitive category matching', () => {
      const org = createMockOrganization(
        { targetOrganism: 'HUMAN', applicationArea: 'PHARMA' },
        'bio_health' // lowercase
      );
      const program = createMockProgram(
        { targetOrganism: 'ANIMAL', applicationArea: 'VETERINARY_PHARMA' },
        'bio_health'
      );

      const result = scoreSemanticSubDomainMatch(org, program);

      // The function converts category to uppercase, so this should still trigger hard filter
      expect(result.isHardFilter).toBe(true);
      expect(result.reason).toBe('ORGANISM_MISMATCH');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Real-World Scenario: CTC Back Case
  // ═══════════════════════════════════════════════════════════════

  describe('real-world scenario: veterinary company matching', () => {
    it('should block CTC Back (animal pharma) from matching human vaccine programs', () => {
      // CTC Back: Animal vaccine company (veterinary pharmaceutical)
      const ctcBack = createMockOrganization(
        {
          targetOrganism: 'ANIMAL',
          applicationArea: 'VETERINARY_PHARMA',
        },
        'BIO_HEALTH'
      );

      // Human vaccine development program
      const humanVaccineProgram = createMockProgram(
        {
          targetOrganism: 'HUMAN',
          applicationArea: 'PHARMA',
        },
        'BIO_HEALTH'
      );

      const result = scoreSemanticSubDomainMatch(ctcBack, humanVaccineProgram);

      // This is the exact scenario v3.0 was designed to prevent
      expect(result.isHardFilter).toBe(true);
      expect(result.reason).toBe('ORGANISM_MISMATCH');
      expect(result.explanation).toBeDefined();
    });

    it('should allow CTC Back to match animal health programs', () => {
      // CTC Back: Animal vaccine company
      const ctcBack = createMockOrganization(
        {
          targetOrganism: 'ANIMAL',
          applicationArea: 'VETERINARY_PHARMA',
        },
        'BIO_HEALTH'
      );

      // Animal disease prevention program
      const animalHealthProgram = createMockProgram(
        {
          targetOrganism: 'ANIMAL',
          applicationArea: 'VETERINARY_PHARMA',
        },
        'BIO_HEALTH'
      );

      const result = scoreSemanticSubDomainMatch(ctcBack, animalHealthProgram);

      expect(result.isHardFilter).toBe(false);
      expect(result.score).toBe(25); // Perfect match
      expect(result.reason).toBe('SEMANTIC_MATCH');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Korean Label Verification
  // ═══════════════════════════════════════════════════════════════

  describe('Korean explanations', () => {
    it('should generate correct Korean explanation for organism mismatch', () => {
      const org = createMockOrganization({ targetOrganism: 'PLANT' }, 'BIO_HEALTH');
      const program = createMockProgram({ targetOrganism: 'MARINE' }, 'BIO_HEALTH');

      const result = scoreSemanticSubDomainMatch(org, program);

      expect(result.explanation).toContain('해양생물'); // MARINE
      expect(result.explanation).toContain('식물');     // PLANT
    });

    it('should generate matching explanation when semantics align', () => {
      const org = createMockOrganization({ targetOrganism: 'HUMAN' }, 'BIO_HEALTH');
      const program = createMockProgram({ targetOrganism: 'HUMAN' }, 'BIO_HEALTH');

      const result = scoreSemanticSubDomainMatch(org, program);

      expect(result.explanation).toContain('일치');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // v3.1: Multi-Select Target Market Support
  // ═══════════════════════════════════════════════════════════════

  describe('v3.1: multi-select target market', () => {
    it('should MATCH when program market is IN org array', () => {
      // Org selects multiple markets
      const org = createMockOrganization(
        { targetMarket: ['CONSUMER', 'ENTERPRISE'] as any, applicationArea: 'SOFTWARE' },
        'ICT'
      );
      // Program targets CONSUMER (which is in org's array)
      const program = createMockProgram(
        { targetMarket: 'CONSUMER', applicationArea: 'SOFTWARE' },
        'ICT'
      );

      const result = scoreSemanticSubDomainMatch(org, program);

      expect(result.isHardFilter).toBe(false);
      expect(result.matchingFields).toContain('targetMarket');
      expect(result.score).toBeGreaterThan(0);
    });

    it('should MATCH when program market matches second item in org array', () => {
      const org = createMockOrganization(
        { targetMarket: ['CONSUMER', 'ENTERPRISE'] as any, applicationArea: 'PLATFORM' },
        'ICT'
      );
      const program = createMockProgram(
        { targetMarket: 'ENTERPRISE', applicationArea: 'PLATFORM' },
        'ICT'
      );

      const result = scoreSemanticSubDomainMatch(org, program);

      expect(result.isHardFilter).toBe(false);
      expect(result.matchingFields).toContain('targetMarket');
    });

    it('should trigger MARKET_MISMATCH when program market is NOT IN org array', () => {
      const org = createMockOrganization(
        { targetMarket: ['CONSUMER', 'ENTERPRISE'] as any, applicationArea: 'SOFTWARE' },
        'ICT'
      );
      // Program targets GOVERNMENT (not in org's array)
      const program = createMockProgram(
        { targetMarket: 'GOVERNMENT', applicationArea: 'PLATFORM' },
        'ICT'
      );

      const result = scoreSemanticSubDomainMatch(org, program);

      expect(result.isHardFilter).toBe(true);
      expect(result.reason).toBe('MARKET_MISMATCH');
    });

    it('should generate correct Korean explanation for multi-select mismatch', () => {
      const org = createMockOrganization(
        { targetMarket: ['CONSUMER', 'ENTERPRISE'] as any, applicationArea: 'SOFTWARE' },
        'ICT'
      );
      const program = createMockProgram(
        { targetMarket: 'INDUSTRIAL', applicationArea: 'IOT' },
        'ICT'
      );

      const result = scoreSemanticSubDomainMatch(org, program);

      // Explanation should list both org markets
      expect(result.explanation).toContain('일반 소비자');
      expect(result.explanation).toContain('기업');
      expect(result.explanation).toContain('산업용');
    });

    it('should handle single-value backward compatibility', () => {
      // Org has single value (legacy format)
      const org = createMockOrganization(
        { targetMarket: 'ENTERPRISE', applicationArea: 'CLOUD' },
        'ICT'
      );
      const program = createMockProgram(
        { targetMarket: 'ENTERPRISE', applicationArea: 'SOFTWARE' },
        'ICT'
      );

      const result = scoreSemanticSubDomainMatch(org, program);

      expect(result.isHardFilter).toBe(false);
      expect(result.matchingFields).toContain('targetMarket');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // v3.1: Keyword Inference for Non-Enriched Programs
  // ═══════════════════════════════════════════════════════════════

  describe('v3.1: keyword inference for ICT programs', () => {
    it('should return INFERRED_MARKET_MATCH when keywords suggest compatible market', () => {
      // Org has semantic data with ENTERPRISE target
      const org = createMockOrganization(
        { targetMarket: 'ENTERPRISE', applicationArea: 'SOFTWARE' },
        'ICT'
      );
      // Program has no semantic data but has enterprise-related keywords
      const program = createMockProgram(null, 'ICT');
      program.title = '클라우드 기반 B2B SaaS 플랫폼 개발 지원';
      program.keywords = ['클라우드', 'SaaS', '기업용', '솔루션'];

      const result = scoreSemanticSubDomainMatch(org, program);

      expect(result.reason).toBe('INFERRED_MARKET_MATCH');
      expect(result.score).toBe(10); // Reduced score for inferred match
      expect(result.isHardFilter).toBe(false);
      expect(result.explanation).toContain('키워드 분석');
    });

    it('should return INFERRED_MARKET_MISMATCH when keywords suggest incompatible market', () => {
      // Org targets CONSUMER market
      const org = createMockOrganization(
        { targetMarket: 'CONSUMER', applicationArea: 'GAMING' },
        'ICT'
      );
      // Program keywords suggest GOVERNMENT market
      const program = createMockProgram(null, 'ICT');
      program.title = '공공기관 전자정부 시스템 고도화';
      program.keywords = ['공공', '정부', '행정', '전자정부'];

      const result = scoreSemanticSubDomainMatch(org, program);

      expect(result.reason).toBe('INFERRED_MARKET_MISMATCH');
      expect(result.score).toBe(0);
      expect(result.isHardFilter).toBe(false); // Soft filter, not hard block
      expect(result.explanation).toContain('키워드 분석');
    });

    it('should return NO_SEMANTIC_DATA when cannot infer market with confidence', () => {
      const org = createMockOrganization(
        { targetMarket: 'ENTERPRISE', applicationArea: 'SOFTWARE' },
        'ICT'
      );
      // Program with generic keywords (no clear market signal)
      const program = createMockProgram(null, 'ICT');
      program.title = 'ICT 기술 개발 지원';
      program.keywords = ['기술', '개발']; // Only 0-1 matches per market

      const result = scoreSemanticSubDomainMatch(org, program);

      expect(result.reason).toBe('NO_SEMANTIC_DATA');
      expect(result.score).toBe(0);
    });

    it('should not attempt inference for non-ICT programs', () => {
      const org = createMockOrganization(
        { targetOrganism: 'HUMAN', applicationArea: 'PHARMA' },
        'BIO_HEALTH'
      );
      const program = createMockProgram(null, 'BIO_HEALTH');
      program.keywords = ['의약품', '바이오'];

      const result = scoreSemanticSubDomainMatch(org, program);

      // Should not return inferred result for BIO_HEALTH
      expect(result.reason).toBe('NO_SEMANTIC_DATA');
    });

    it('should match inferred market against multi-select org array', () => {
      const org = createMockOrganization(
        { targetMarket: ['CONSUMER', 'ENTERPRISE'] as any, applicationArea: 'PLATFORM' },
        'ICT'
      );
      // Program keywords suggest ENTERPRISE (in org's array)
      const program = createMockProgram(null, 'ICT');
      program.title = 'B2B 클라우드 솔루션 개발';
      program.keywords = ['기업', 'B2B', '클라우드', '솔루션'];

      const result = scoreSemanticSubDomainMatch(org, program);

      expect(result.reason).toBe('INFERRED_MARKET_MATCH');
      expect(result.isHardFilter).toBe(false);
    });
  });
});
