/**
 * Eligibility Extraction Verification Script
 *
 * Purpose: Test enhanced extractEligibilityCriteria() function
 * Context: Validate Korean pattern matching for 30+ requirement types
 *
 * Test Coverage:
 * 1. Organization Requirements (operating years, org type)
 * 2. Financial Requirements (R&D investment ratio)
 * 3. Certification Requirements (INNO-BIZ, documents)
 * 4. Consortium Requirements (lead/participating organizations)
 * 5. Government Relationship (MOU/NDA, priority status)
 * 6. Industry Requirements (defense, bio, IT)
 * 7. Legacy Flags (backward compatibility)
 */

import { extractEligibilityCriteria } from '../lib/scraping/parsers/ntis-announcement-parser';

interface TestCase {
  name: string;
  input: string;
  expected: {
    organizationRequirements?: {
      operatingYears?: {
        minimum?: number;
        maximum?: number;
        description?: string;
      };
      organizationType?: string[];
    };
    financialRequirements?: {
      rdInvestmentRatio?: {
        minimum?: number;
        period?: string;
        calculationMethod?: string;
      };
    };
    certificationRequirements?: {
      required?: string[];
      documents?: string[];
    };
    consortiumRequirements?: {
      required?: boolean;
      composition?: {
        leadOrganization?: string[];
        participants?: string[];
      };
      type?: string[];
    };
    governmentRelationship?: {
      requiredAgreements?: string[];
      preferredStatus?: string[];
      targetCountry?: string;
    };
    industryRequirements?: {
      sectors?: string[];
    };
    // Legacy flags
    researchInstituteFocus?: boolean;
    smeEligible?: boolean;
    consortiumRequired?: boolean;
    commercializationFocus?: boolean;
  };
}

const TEST_CASES: TestCase[] = [
  // ═══════════════════════════════════════════════════════════════════
  // Test Case 1: Screenshot 1 - SME with operating years + documents
  // ═══════════════════════════════════════════════════════════════════
  {
    name: 'SME with 7-year limit and required documents',
    input: `
      중소기업창업 지원법 제2조에 따른 중소기업으로서 창업 7년 이내인 기업
      제출서류: 법인등기부등본, 사업자등록증, 창업기업 확인서
    `,
    expected: {
      organizationRequirements: {
        operatingYears: {
          maximum: 7,
          description: '중소기업창업 지원법 제2조'
        },
        organizationType: ['sme', 'startup']
      },
      certificationRequirements: {
        documents: ['법인등기부등본', '사업자등록증', '창업기업 확인서']
      },
      smeEligible: true
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  // Test Case 2: Screenshot 2 - Defense consortium with R&D ratio
  // ═══════════════════════════════════════════════════════════════════
  {
    name: 'Defense consortium with R&D ratio and INNO-BIZ',
    input: `
      방산분야 컨소시엄으로 중소기업이 주관기관으로 참여
      최근 3년간 매출액 대비 R&D 투자비율 2% 이상
      INNO-BIZ 또는 경영혁신형기업 인증 보유
      상대국 정부 기관 또는 방산업체와 MOU 또는 NDA 체결
      우선협상대상자로 선정된 기업 우대
    `,
    expected: {
      organizationRequirements: {
        organizationType: ['sme']
      },
      financialRequirements: {
        rdInvestmentRatio: {
          minimum: 2,
          period: '최근 3년간',
          calculationMethod: '매출액 대비 R&D 투자비율'
        }
      },
      certificationRequirements: {
        required: ['INNO-BIZ', '경영혁신형기업']
      },
      consortiumRequirements: {
        required: true,
        composition: {
          leadOrganization: ['중소기업']
        },
        type: ['방산분야 컨소시엄']
      },
      governmentRelationship: {
        requiredAgreements: ['MOU', 'NDA'],
        preferredStatus: ['우선협상대상자'],
        targetCountry: '상대국 정부 기관'
      },
      industryRequirements: {
        sectors: ['defense']
      },
      smeEligible: true,
      consortiumRequired: true
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  // Test Case 3: Research institute focus with commercialization
  // ═══════════════════════════════════════════════════════════════════
  {
    name: 'Research institute with commercialization focus',
    input: `
      대학 및 연구기관 중심의 산학연 컨소시엄
      연구 성과의 상용화 및 사업화를 목표로 함
      실증 연구를 통한 기술 이전 지원
    `,
    expected: {
      consortiumRequirements: {
        required: true,
        type: ['산학연']
      },
      researchInstituteFocus: true,
      consortiumRequired: true,
      commercializationFocus: true
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  // Test Case 4: Bio sector with minimum operating years
  // ═══════════════════════════════════════════════════════════════════
  {
    name: 'Bio sector SME with minimum operating years',
    input: `
      바이오 및 생명공학 분야 중소기업
      업력 3년 이상인 기업
      벤처기업 인증 보유 필수
    `,
    expected: {
      organizationRequirements: {
        operatingYears: {
          minimum: 3
        },
        organizationType: ['sme', 'venture']
      },
      certificationRequirements: {
        required: ['벤처기업']
      },
      industryRequirements: {
        sectors: ['bio']
      },
      smeEligible: true
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  // Test Case 5: IT sector with financial requirements
  // ═══════════════════════════════════════════════════════════════════
  {
    name: 'IT sector with R&D ratio requirement',
    input: `
      정보통신(ICT) 분야 법인사업자
      연구개발비 5% 이상 투자 기업
    `,
    expected: {
      organizationRequirements: {
        organizationType: ['corporation']
      },
      financialRequirements: {
        rdInvestmentRatio: {
          minimum: 5
        }
      },
      industryRequirements: {
        sectors: ['it']
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  // Test Case 6: Edge case - Multiple certifications
  // ═══════════════════════════════════════════════════════════════════
  {
    name: 'Multiple certifications and documents',
    input: `
      이노비즈 또는 Main-Biz 인증 보유
      제출서류: 법인등기부등본, 사업자등록증, 재무제표, 중소기업 확인서
    `,
    expected: {
      certificationRequirements: {
        required: ['이노비즈', 'Main-Biz'],
        documents: ['법인등기부등본', '사업자등록증', '재무제표', '중소기업 확인서']
      }
    }
  }
];

// ═════════════════════════════════════════════════════════════════════
// Verification Functions
// ═════════════════════════════════════════════════════════════════════

function deepEquals(actual: any, expected: any, path: string = ''): { success: boolean; errors: string[] } {
  const errors: string[] = [];

  // Handle null/undefined
  if (expected === undefined) {
    return { success: true, errors: [] };
  }
  if (actual === undefined || actual === null) {
    errors.push(`${path}: Expected value but got ${actual}`);
    return { success: false, errors };
  }

  // Handle arrays
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) {
      errors.push(`${path}: Expected array but got ${typeof actual}`);
      return { success: false, errors };
    }

    // Check that all expected items are present (order doesn't matter)
    for (const expectedItem of expected) {
      if (!actual.includes(expectedItem)) {
        errors.push(`${path}: Missing expected array item "${expectedItem}"`);
      }
    }

    return { success: errors.length === 0, errors };
  }

  // Handle objects
  if (typeof expected === 'object' && expected !== null) {
    if (typeof actual !== 'object' || actual === null) {
      errors.push(`${path}: Expected object but got ${typeof actual}`);
      return { success: false, errors };
    }

    for (const key of Object.keys(expected)) {
      const newPath = path ? `${path}.${key}` : key;
      const result = deepEquals(actual[key], expected[key], newPath);
      errors.push(...result.errors);
    }

    return { success: errors.length === 0, errors };
  }

  // Handle primitives
  if (actual !== expected) {
    errors.push(`${path}: Expected ${expected} but got ${actual}`);
    return { success: false, errors };
  }

  return { success: true, errors: [] };
}

function runTest(testCase: TestCase): { success: boolean; errors: string[] } {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🧪 Test: ${testCase.name}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  try {
    const result = extractEligibilityCriteria(testCase.input);

    if (!result) {
      console.error('❌ Extraction returned null');
      return { success: false, errors: ['Extraction returned null'] };
    }

    console.log('\n📥 Input (preview):');
    console.log('  ' + testCase.input.trim().substring(0, 100).replace(/\n/g, ' ') + '...');

    console.log('\n📊 Extracted Data:');
    console.log(JSON.stringify(result, null, 2));

    console.log('\n✓ Validating...');
    const validation = deepEquals(result, testCase.expected);

    if (validation.success) {
      console.log('✅ TEST PASSED');
      return { success: true, errors: [] };
    } else {
      console.log('❌ TEST FAILED');
      console.log('\n⚠️  Validation Errors:');
      validation.errors.forEach(error => console.log(`   - ${error}`));
      return { success: false, errors: validation.errors };
    }

  } catch (error: any) {
    console.error('❌ TEST ERROR:', error.message);
    return { success: false, errors: [error.message] };
  }
}

// ═════════════════════════════════════════════════════════════════════
// Main Verification
// ═════════════════════════════════════════════════════════════════════

async function verifyEligibilityExtraction() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('  Eligibility Extraction Verification');
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

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

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
  console.log('✓ Organization Requirements (operating years, org type)');
  console.log('✓ Financial Requirements (R&D investment ratio)');
  console.log('✓ Certification Requirements (INNO-BIZ, documents)');
  console.log('✓ Consortium Requirements (lead/participating orgs)');
  console.log('✓ Government Relationship (MOU/NDA, priority status)');
  console.log('✓ Industry Requirements (defense, bio, IT)');
  console.log('✓ Legacy Flags (backward compatibility)');
  console.log('');

  // Final verdict
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎯 FINAL RESULT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  if (failed === 0) {
    console.log('✅ ALL TESTS PASSED');
    console.log('');
    console.log('   Enhanced eligibility extraction is working correctly.');
    console.log('   All Korean patterns are matching as expected.');
    console.log('   Backward compatibility with legacy flags maintained.');
    console.log('');
    console.log('💡 Next Steps:');
    console.log('   1. Notify user that implementation is complete');
    console.log('   2. User will run discovery scraper and process worker');
    console.log('   3. Verify extracted data in funding_programs table');
    console.log('   4. Commit and push to production');
  } else {
    console.log('❌ SOME TESTS FAILED');
    console.log('');
    console.log('   Please review the failed test cases above.');
    console.log('   Fix the pattern matching issues before proceeding.');
    console.log('');
    console.log('💡 Debugging Tips:');
    console.log('   - Check regular expressions in ELIGIBILITY_PATTERNS');
    console.log('   - Verify helper function logic');
    console.log('   - Test with actual Korean text from NTIS');
  }

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  if (failed > 0) {
    process.exit(1);
  }
}

// Run verification
verifyEligibilityExtraction()
  .then(() => {
    console.log('Verification completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Verification failed:', error);
    process.exit(1);
  });
