/**
 * Test Investment Threshold Extraction (Phase 3)
 *
 * This script tests the enhanced regex patterns for extracting investment requirements
 * from Korean R&D announcements WITHOUT using AI (pure pattern matching).
 *
 * Test Cases:
 * 1. "투자 유치 2억원 이상" → 200,000,000 won
 * 2. "벤처투자 5억원 이상" → 500,000,000 won
 * 3. "200만원 이상 투자" → 2,000,000 won
 * 4. "투자 실적 10억원" → 1,000,000,000 won
 * 5. "투자금 500백만원 이상" → 500,000,000 won
 * 6. Multiple patterns in same text (should use first match)
 * 7. Invalid patterns (negative amounts, unreasonable values)
 *
 * Usage: npx tsx scripts/test-investment-extraction.ts
 */

import { extractEligibilityCriteria } from '../lib/scraping/parsers/ntis-announcement-parser';

interface TestCase {
  name: string;
  text: string;
  expectedAmount: number | null; // Expected investment amount in won (null = no match expected)
  expectedDescription?: string; // Expected original matched text
}

const testCases: TestCase[] = [
  {
    name: 'Pattern 1: 투자 유치 2억원 이상',
    text: '신청자격: 최근 3년간 투자 유치 2억원 이상인 벤처기업',
    expectedAmount: 200_000_000,
    expectedDescription: '투자 유치 2억원 이상',
  },
  {
    name: 'Pattern 1: 투자 유치 금액 5억원 이상',
    text: '지원대상: 투자 유치 금액 5억원 이상의 스타트업',
    expectedAmount: 500_000_000,
    expectedDescription: '투자 유치 금액 5억원 이상',
  },
  {
    name: 'Pattern 2: 벤처투자 10억원 이상',
    text: '신청요건: 벤처투자 10억원 이상 유치 실적',
    expectedAmount: 1_000_000_000,
    expectedDescription: '벤처투자 10억원 이상',
  },
  {
    name: 'Pattern 3: 3억원 이상 투자 (reverse order)',
    text: '참여자격: 3억원 이상 투자 유치 기업',
    expectedAmount: 300_000_000,
    expectedDescription: '3억원 이상 투자',
  },
  {
    name: 'Pattern 4: 투자 실적 5억원',
    text: '지원조건: 투자 실적 5억원 필요',
    expectedAmount: 500_000_000,
    expectedDescription: '투자 실적 5억원',
  },
  {
    name: 'Pattern 5: 투자금 200백만원 이상',
    text: '응모자격: 투자금 200백만원 이상',
    expectedAmount: 200_000_000,
    expectedDescription: '투자금 200백만원 이상',
  },
  {
    name: 'Pattern 6: 투자받은 금액 1억원 이상',
    text: '신청자격: 투자받은 금액 1억원 이상',
    expectedAmount: 100_000_000,
    expectedDescription: '투자받은 금액 1억원 이상',
  },
  {
    name: 'Pattern 7: 투자 유치 실적 7억원',
    text: '참여요건: 투자 유치 실적 7억원',
    expectedAmount: 700_000_000,
    expectedDescription: '투자 유치 실적 7억원',
  },
  {
    name: 'Decimal amounts: 투자 유치 2.5억원 이상',
    text: '신청자격: 투자 유치 2.5억원 이상',
    expectedAmount: 250_000_000,
    expectedDescription: '투자 유치 2.5억원 이상',
  },
  {
    name: 'Comma-separated: 투자 유치 1,000백만원 이상',
    text: '지원대상: 투자 유치 1,000백만원 이상의 기업',
    expectedAmount: 1_000_000_000,
    expectedDescription: '투자 유치 1,000백만원 이상',
  },
  {
    name: 'Small amounts: 투자 유치 5,000만원 이상',
    text: '참여자격: 투자 유치 5,000만원 이상',
    expectedAmount: 50_000_000,
    expectedDescription: '투자 유치 5,000만원 이상',
  },
  {
    name: 'Multiple patterns in text (should use first match)',
    text: '신청자격: 투자 유치 2억원 이상 또는 벤처투자 10억원 이상',
    expectedAmount: 200_000_000, // Should match first pattern
    expectedDescription: '투자 유치 2억원 이상',
  },
  {
    name: 'No investment pattern (should return null)',
    text: '신청자격: 중소기업만 지원 가능',
    expectedAmount: null,
  },
  {
    name: 'Edge case: Very small amount (100만원 = 1M won)',
    text: '투자 유치 100만원 이상',
    expectedAmount: 1_000_000,
  },
  {
    name: 'Edge case: Very large amount (100억원 = 10B won)',
    text: '투자 유치 100억원 이상',
    expectedAmount: 10_000_000_000,
  },
];

function runTests() {
  console.log('🧪 Investment Threshold Extraction Test Suite (Phase 3)\n');
  console.log('═'.repeat(80));
  console.log();

  let passed = 0;
  let failed = 0;
  const failures: string[] = [];

  for (const testCase of testCases) {
    try {
      const result = extractEligibilityCriteria(testCase.text);
      const extractedAmount = result?.financialRequirements?.investmentThreshold?.minimumAmount || null;
      const extractedDescription = result?.financialRequirements?.investmentThreshold?.description || null;

      const amountMatch = extractedAmount === testCase.expectedAmount;
      const descriptionMatch =
        !testCase.expectedDescription || extractedDescription?.includes(testCase.expectedDescription) || false;

      if (amountMatch && descriptionMatch) {
        console.log(`✅ PASS: ${testCase.name}`);
        if (extractedAmount !== null) {
          console.log(`   Expected: ₩${testCase.expectedAmount!.toLocaleString()}`);
          console.log(`   Extracted: ₩${extractedAmount.toLocaleString()}`);
          console.log(`   Original text: "${extractedDescription}"`);
        } else {
          console.log(`   Expected no match: ✓`);
        }
        passed++;
      } else {
        console.log(`❌ FAIL: ${testCase.name}`);
        console.log(`   Expected amount: ₩${testCase.expectedAmount?.toLocaleString() || 'null'}`);
        console.log(`   Extracted amount: ₩${extractedAmount?.toLocaleString() || 'null'}`);
        if (testCase.expectedDescription) {
          console.log(`   Expected description: "${testCase.expectedDescription}"`);
          console.log(`   Extracted description: "${extractedDescription}"`);
        }
        console.log(`   Input text: "${testCase.text}"`);
        failed++;
        failures.push(testCase.name);
      }
    } catch (error: any) {
      console.log(`❌ ERROR: ${testCase.name}`);
      console.log(`   Exception: ${error.message}`);
      failed++;
      failures.push(testCase.name);
    }

    console.log();
  }

  // Summary
  console.log('═'.repeat(80));
  console.log('📊 Test Summary\n');
  console.log(`Total Tests:     ${testCases.length}`);
  console.log(`✅ Passed:        ${passed}`);
  console.log(`❌ Failed:        ${failed}`);
  console.log(`Success Rate:    ${((passed / testCases.length) * 100).toFixed(1)}%`);
  console.log();

  if (failed > 0) {
    console.log('❌ Failed Tests:');
    failures.forEach((name, index) => {
      console.log(`   ${index + 1}. ${name}`);
    });
    console.log();
  }

  console.log('═'.repeat(80));

  if (failed === 0) {
    console.log('✅ All tests passed! Investment extraction patterns are working correctly.');
    console.log();
    console.log('💡 Next Steps:');
    console.log('   1. Commit and push enhanced extraction patterns');
    console.log('   2. Proceed with Phase 4: Progressive Profiling UI');
    console.log('   3. Phase 5: Manual Review Workflow');
    console.log('   4. Phase 6: Data Backfill (NO AI)');
  } else {
    console.log('⚠️  Some tests failed. Please review the regex patterns before proceeding.');
  }
}

// Execute tests
runTests();
