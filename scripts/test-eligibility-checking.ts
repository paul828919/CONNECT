/**
 * Test Eligibility Checking Logic (Phase 2)
 *
 * Verifies three-tier classification system with comprehensive test cases:
 * - FULLY_ELIGIBLE: Meets all hard + soft requirements
 * - CONDITIONALLY_ELIGIBLE: Meets hard requirements only
 * - INELIGIBLE: Fails any hard requirement
 *
 * Test Coverage:
 * 1. Required certifications check
 * 2. Investment threshold check
 * 3. Employee count constraints
 * 4. Revenue constraints
 * 5. Operating years requirements
 * 6. Soft requirements (preferred certs, prior grants, awards)
 * 7. Manual review triggers
 *
 * Usage: npx tsx scripts/test-eligibility-checking.ts
 */

import { checkEligibility, EligibilityLevel } from '../lib/matching/eligibility';
import { organizations, funding_programs, ConfidenceLevel } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// ============================================================================
// TEST HELPERS
// ============================================================================

interface TestCase {
  name: string;
  program: Partial<funding_programs>;
  organization: Partial<organizations>;
  expectedLevel: EligibilityLevel;
  expectedFailures?: string[]; // Substrings to check in failedRequirements
  expectedMet?: string[]; // Substrings to check in metRequirements
  expectManualReview?: boolean;
}

function runTest(testCase: TestCase): boolean {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🧪 Test: ${testCase.name}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  try {
    const program = createMockProgram(testCase.program);
    const organization = createMockOrganization(testCase.organization);

    const result = checkEligibility(program, organization);

    console.log('\n📊 Result:');
    console.log(`   Eligibility Level: ${result.level}`);
    console.log(`   Hard Requirements Met: ${result.hardRequirementsMet}`);
    console.log(`   Soft Requirements Met: ${result.softRequirementsMet}`);
    console.log(`   Manual Review Needed: ${result.needsManualReview}`);

    if (result.failedRequirements.length > 0) {
      console.log('\n❌ Failed Requirements:');
      result.failedRequirements.forEach((req) => console.log(`   - ${req}`));
    }

    if (result.metRequirements.length > 0) {
      console.log('\n✅ Met Requirements:');
      result.metRequirements.forEach((req) => console.log(`   - ${req}`));
    }

    if (result.manualReviewReason) {
      console.log(`\n⚠️  Manual Review Reason: ${result.manualReviewReason}`);
    }

    // Validate results
    let passed = true;
    const errors: string[] = [];

    if (result.level !== testCase.expectedLevel) {
      errors.push(`Expected level ${testCase.expectedLevel}, got ${result.level}`);
      passed = false;
    }

    if (testCase.expectedFailures) {
      for (const expectedFailure of testCase.expectedFailures) {
        const found = result.failedRequirements.some((req) => req.includes(expectedFailure));
        if (!found) {
          errors.push(`Expected failure message containing "${expectedFailure}" not found`);
          passed = false;
        }
      }
    }

    if (testCase.expectedMet) {
      for (const expectedMet of testCase.expectedMet) {
        const found = result.metRequirements.some((req) => req.includes(expectedMet));
        if (!found) {
          errors.push(`Expected met requirement containing "${expectedMet}" not found`);
          passed = false;
        }
      }
    }

    if (testCase.expectManualReview !== undefined && result.needsManualReview !== testCase.expectManualReview) {
      errors.push(`Expected needsManualReview=${testCase.expectManualReview}, got ${result.needsManualReview}`);
      passed = false;
    }

    if (passed) {
      console.log('\n✅ TEST PASSED');
    } else {
      console.log('\n❌ TEST FAILED');
      console.log('\n⚠️  Validation Errors:');
      errors.forEach((error) => console.log(`   - ${error}`));
    }

    return passed;
  } catch (error: any) {
    console.error('\n❌ TEST ERROR:', error.message);
    return false;
  }
}

function createMockProgram(partial: Partial<funding_programs>): funding_programs {
  return {
    id: 'test-program',
    agencyId: 'IITP',
    title: 'Test Program',
    description: null,
    announcementUrl: 'https://example.com',
    targetType: [],
    minTrl: null,
    maxTrl: null,
    eligibilityCriteria: null,
    budgetAmount: null,
    fundingPeriod: null,
    deadline: null,
    category: null,
    keywords: [],
    contentHash: 'test-hash',
    status: 'ACTIVE',
    publishedAt: null,
    applicationStart: null,
    scrapedAt: new Date(),
    lastCheckedAt: new Date(),
    scrapingSource: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    announcementType: 'R_D_PROJECT',
    announcingAgency: null,
    ministry: null,
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
    eligibilityConfidence: ConfidenceLevel.LOW,
    manualReviewRequired: false,
    manualReviewNotes: null,
    manualReviewCompletedAt: null,
    manualReviewCompletedBy: null,
    eligibilityLastUpdated: null,
    ...partial,
  } as funding_programs;
}

function createMockOrganization(partial: Partial<organizations>): organizations {
  return {
    id: 'test-org',
    type: 'COMPANY',
    name: 'Test Organization',
    businessNumberEncrypted: 'encrypted',
    businessNumberHash: 'hash',
    businessStructure: null,
    description: null,
    website: null,
    logoUrl: null,
    industrySector: null,
    employeeCount: null,
    revenueRange: null,
    rdExperience: false,
    technologyReadinessLevel: null,
    instituteType: null,
    researchFocusAreas: [],
    annualRdBudget: null,
    researcherCount: null,
    keyTechnologies: [],
    collaborationCount: null,
    primaryContactName: null,
    primaryContactEmail: null,
    primaryContactPhone: null,
    address: null,
    desiredConsortiumFields: [],
    desiredTechnologies: [],
    targetPartnerTRL: null,
    commercializationCapabilities: [],
    expectedTRLLevel: null,
    targetOrgScale: null,
    targetOrgRevenue: null,
    profileCompleted: false,
    profileScore: 0,
    status: 'ACTIVE',
    verifiedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    certifications: [],
    businessEstablishedDate: null,
    investmentHistory: null,
    patentCount: null,
    priorGrantWins: null,
    priorGrantTotalAmount: null,
    rdInvestmentRatio: null,
    lastFinancialYear: null,
    governmentCertifications: [],
    industryAwards: [],
    verificationDocumentsUploaded: false,
    verificationNotes: null,
    ...partial,
  } as organizations;
}

// ============================================================================
// TEST CASES
// ============================================================================

const TEST_CASES: TestCase[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // Test Case 1: FULLY_ELIGIBLE - Meets all hard + soft requirements
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: 'FULLY_ELIGIBLE - All requirements met with prior grants',
    program: {
      requiredCertifications: ['INNO-BIZ', '벤처기업'],
      requiredInvestmentAmount: new Decimal('500000000'), // ₩500M
      requiredMinEmployees: 10,
      requiredMaxEmployees: 100,
      requiredMinRevenue: BigInt(1_000_000_000), // ₩1B
      requiredMaxRevenue: BigInt(50_000_000_000), // ₩50B
      requiredOperatingYears: 3,
      maxOperatingYears: 10,
      preferredCertifications: ['Main-Biz'],
    },
    organization: {
      certifications: ['INNO-BIZ', '벤처기업', 'Main-Biz'],
      investmentHistory: JSON.stringify([
        { date: '2023-10-15', amount: 600000000, source: 'VC A', verified: true },
      ]),
      employeeCount: 'FROM_50_TO_100', // Midpoint: 75
      revenueRange: 'FROM_10B_TO_50B', // Midpoint: ₩30B
      businessEstablishedDate: new Date('2018-01-01'), // 7 years ago (assuming current year 2025)
      priorGrantWins: 3,
    },
    expectedLevel: EligibilityLevel.FULLY_ELIGIBLE,
    expectedMet: [
      '필수 인증 보유',
      '투자 유치 금액 충족',
      '직원 수 충족',
      '매출액 충족',
      '업력 충족',
      '우대 인증 보유',
      '정부지원 수혜 실적',
    ],
    expectManualReview: false,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Test Case 2: CONDITIONALLY_ELIGIBLE - Meets hard requirements only
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: 'CONDITIONALLY_ELIGIBLE - Hard requirements met, no soft requirements',
    program: {
      requiredCertifications: ['INNO-BIZ'],
      requiredInvestmentAmount: new Decimal('200000000'), // ₩200M
      preferredCertifications: ['Main-Biz', '경영혁신형기업'],
    },
    organization: {
      certifications: ['INNO-BIZ'],
      investmentHistory: JSON.stringify([
        { date: '2024-05-20', amount: 300000000, source: 'Angel Investor', verified: true },
      ]),
      // No preferred certifications, no prior grants, no awards
    },
    expectedLevel: EligibilityLevel.CONDITIONALLY_ELIGIBLE,
    expectedMet: ['필수 인증 보유', '투자 유치 금액 충족'],
    expectManualReview: false,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Test Case 3: INELIGIBLE - Missing required certification
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: 'INELIGIBLE - Missing required certification',
    program: {
      requiredCertifications: ['INNO-BIZ', '벤처기업'],
    },
    organization: {
      certifications: ['INNO-BIZ'], // Missing '벤처기업'
    },
    expectedLevel: EligibilityLevel.INELIGIBLE,
    expectedFailures: ['필수 인증 미보유', '벤처기업'],
    expectManualReview: false,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Test Case 4: INELIGIBLE - Insufficient investment amount
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: 'INELIGIBLE - Investment threshold not met',
    program: {
      requiredInvestmentAmount: new Decimal('1000000000'), // ₩1B
    },
    organization: {
      investmentHistory: JSON.stringify([
        { date: '2023-03-10', amount: 500000000, source: 'VC B', verified: true },
        { date: '2024-07-15', amount: 300000000, source: 'VC C', verified: true },
      ]), // Total: ₩800M < ₩1B
    },
    expectedLevel: EligibilityLevel.INELIGIBLE,
    expectedFailures: ['투자 유치 금액 부족'],
    expectManualReview: false,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Test Case 5: INELIGIBLE + Manual Review - Missing investment history
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: 'INELIGIBLE + Manual Review - No investment history recorded',
    program: {
      requiredInvestmentAmount: new Decimal('500000000'), // ₩500M
    },
    organization: {
      investmentHistory: null, // No data
    },
    expectedLevel: EligibilityLevel.INELIGIBLE,
    expectedFailures: ['투자 유치 실적 미확인'],
    expectManualReview: true,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Test Case 6: INELIGIBLE - Employee count too low
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: 'INELIGIBLE - Employee count below minimum',
    program: {
      requiredMinEmployees: 50,
    },
    organization: {
      employeeCount: 'FROM_10_TO_50', // Midpoint: 30 < 50
    },
    expectedLevel: EligibilityLevel.INELIGIBLE,
    expectedFailures: ['최소 직원 수 미충족'],
    expectManualReview: false,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Test Case 7: INELIGIBLE - Revenue too high
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: 'INELIGIBLE - Revenue exceeds maximum (too large for SME program)',
    program: {
      requiredMaxRevenue: BigInt(50_000_000_000), // ₩50B max
    },
    organization: {
      revenueRange: 'OVER_100B', // Midpoint: ₩150B > ₩50B
    },
    expectedLevel: EligibilityLevel.INELIGIBLE,
    expectedFailures: ['최대 매출액 초과'],
    expectManualReview: false,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Test Case 8: INELIGIBLE - Operating years too high (startup program)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: 'INELIGIBLE - Operating years exceed maximum (startup program)',
    program: {
      maxOperatingYears: 7, // Startup program: 창업 7년 이내
    },
    organization: {
      businessEstablishedDate: new Date('2010-01-01'), // 15 years ago > 7
    },
    expectedLevel: EligibilityLevel.INELIGIBLE,
    expectedFailures: ['최대 업력 초과'],
    expectManualReview: false,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Test Case 9: FULLY_ELIGIBLE - With industry awards
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: 'FULLY_ELIGIBLE - Hard requirements + industry awards',
    program: {
      requiredCertifications: ['벤처기업'],
    },
    organization: {
      certifications: ['벤처기업'],
      industryAwards: ['혁신상', '우수기업상', '기술혁신상'],
    },
    expectedLevel: EligibilityLevel.FULLY_ELIGIBLE,
    expectedMet: ['필수 인증 보유', '수상 경력'],
    expectManualReview: false,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Test Case 10: INELIGIBLE + Manual Review - Multiple missing fields
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: 'INELIGIBLE + Manual Review - Multiple missing profile fields',
    program: {
      requiredInvestmentAmount: new Decimal('500000000'),
      requiredMinEmployees: 10,
      requiredMinRevenue: BigInt(1_000_000_000),
      requiredOperatingYears: 3,
    },
    organization: {
      investmentHistory: null, // Missing
      employeeCount: null, // Missing
      revenueRange: null, // Missing
      businessEstablishedDate: null, // Missing
    },
    expectedLevel: EligibilityLevel.INELIGIBLE,
    expectedFailures: [
      '투자 유치 실적 미확인',
      '직원 수 정보 없음',
      '매출액 정보 없음',
      '설립일 정보 없음',
    ],
    expectManualReview: true,
  },
];

// ============================================================================
// MAIN VERIFICATION
// ============================================================================

async function verifyEligibilityChecking() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('  Eligibility Checking Logic Verification (Phase 2)');
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('');
  console.log(`Running ${TEST_CASES.length} test cases...`);

  const results = TEST_CASES.map(runTest);

  // Summary
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 VERIFICATION SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  const passed = results.filter((r) => r).length;
  const failed = results.filter((r) => !r).length;

  console.log(`Total Tests:     ${TEST_CASES.length}`);
  console.log(`✅ Passed:        ${passed}`);
  console.log(`❌ Failed:        ${failed}`);
  console.log(`Success Rate:    ${((passed / TEST_CASES.length) * 100).toFixed(1)}%`);
  console.log('');

  // Test coverage breakdown
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 TEST COVERAGE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('✓ Required Certifications (필수 인증)');
  console.log('✓ Investment Thresholds (투자 유치 금액)');
  console.log('✓ Employee Count Constraints (직원 수)');
  console.log('✓ Revenue Constraints (매출액)');
  console.log('✓ Operating Years Requirements (업력)');
  console.log('✓ Soft Requirements (우대 조건)');
  console.log('✓ Manual Review Triggers (수동 검토)');
  console.log('');

  // Final verdict
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎯 FINAL RESULT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  if (failed === 0) {
    console.log('✅ ALL TESTS PASSED');
    console.log('');
    console.log('   Three-tier eligibility checking is working correctly.');
    console.log('   INELIGIBLE programs are filtered out before scoring.');
    console.log('   FULLY_ELIGIBLE programs are prioritized over CONDITIONALLY_ELIGIBLE.');
    console.log('');
    console.log('💡 Next Steps:');
    console.log('   1. Commit and push eligibility checking implementation');
    console.log('   2. Proceed with Phase 3: Enhanced regex extraction (NO AI)');
    console.log('   3. Phase 4: Progressive profiling UI with investment history form');
  } else {
    console.log('❌ SOME TESTS FAILED');
    console.log('');
    console.log('   Please review the failed test cases above.');
    console.log('   Fix the eligibility checking logic before proceeding.');
  }

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  if (failed > 0) {
    process.exit(1);
  }
}

// Run verification
verifyEligibilityChecking()
  .then(() => {
    console.log('Verification completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Verification failed:', error);
    process.exit(1);
  });
