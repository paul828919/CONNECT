/**
 * Test Enhanced Budget Extraction Patterns
 * November 5, 2025
 *
 * Tests the updated extractBudget() function with real-world patterns from failed programs:
 * 1. "지원규모 : 총 215.6억원" (총 prefix)
 * 2. "금액 : 45,000,000원" (direct amount format)
 * 3. "'25년 256백만원" (year-based format)
 * 4. "총연구비(억원) 48.75" (table header format)
 */

import { extractBudget } from '../lib/scraping/parsers/ntis-announcement-parser';

// Test cases based on actual failed programs
const testCases = [
  {
    name: '총 prefix with 억원 (Program #12)',
    input: '지원규모 : 총 215.6억원',
    expected: 21_560_000_000, // 215.6억 = 21,560,000,000 won
  },
  {
    name: 'Direct amount format (Program #1)',
    input: '금액 : 45,000,000원',
    expected: 45_000_000,
  },
  {
    name: 'Direct amount with spacing variation',
    input: '금 액 : 45,000,000원',
    expected: 45_000_000,
  },
  {
    name: 'Year-based 백만원 format',
    input: "'25년 256백만원 지원",
    expected: 256_000_000,
  },
  {
    name: 'Year-based 억원 format',
    input: '2025년 25억원',
    expected: 2_500_000_000,
  },
  {
    name: 'Table header 억원 format',
    input: '총연구비(억원) 48.75',
    expected: 4_875_000_000,
  },
  {
    name: 'Table header 백만원 format',
    input: '지원규모(백만원) 875',
    expected: 875_000_000,
  },
  {
    name: '총 prefix with 백만원',
    input: '지원금액 : 총 500백만원',
    expected: 500_000_000,
  },
  {
    name: 'Existing pattern - 억원 with decimals',
    input: '공고금액 : 1,764.22억원',
    expected: 176_422_000_000,
  },
  {
    name: 'Existing pattern - 백만원',
    input: '연구비 300백만원',
    expected: 300_000_000,
  },
  {
    name: 'NULL case - 미정 (TBD)',
    input: '공고금액 : 미정',
    expected: null,
  },
  {
    name: 'NULL case - 0억원 (TBD)',
    input: '공고금액 : 0억원',
    expected: null,
  },
];

function formatWon(amount: number | null): string {
  if (amount === null) return 'NULL';
  if (amount >= 100_000_000) {
    return `${(amount / 100_000_000).toFixed(1)}억원`;
  }
  return `${(amount / 1_000_000).toFixed(0)}백만원`;
}

async function runTests() {
  console.log('='.repeat(80));
  console.log('ENHANCED BUDGET EXTRACTION PATTERN TESTS');
  console.log('November 5, 2025 - Testing fixes for 12 failed NTIS programs');
  console.log('='.repeat(80));
  console.log('');

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    const result = extractBudget(testCase.input);
    const isMatch = result === testCase.expected;

    if (isMatch) {
      passed++;
      console.log(`✓ PASS: ${testCase.name}`);
      console.log(`  Input:    "${testCase.input}"`);
      console.log(`  Expected: ${formatWon(testCase.expected)}`);
      console.log(`  Got:      ${formatWon(result)}`);
    } else {
      failed++;
      console.log(`✗ FAIL: ${testCase.name}`);
      console.log(`  Input:    "${testCase.input}"`);
      console.log(`  Expected: ${formatWon(testCase.expected)}`);
      console.log(`  Got:      ${formatWon(result)}`);
    }
    console.log('');
  }

  console.log('='.repeat(80));
  console.log(`RESULTS: ${passed} passed, ${failed} failed (${testCases.length} total)`);
  console.log('='.repeat(80));

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(console.error);
