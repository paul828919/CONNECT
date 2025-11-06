// Test table-aware budget parser with sample text formats
import { extractBudget } from '../lib/scraping/parsers/ntis-announcement-parser';

console.log('🧪 Testing Table-Aware Budget Parser\n');

const testCases = [
  {
    name: 'Table header format (억원)',
    text: '총연구비(억원) 48.75',
    expected: 4_875_000_000,
  },
  {
    name: 'Table header format with spacing',
    text: '총 연구비 ( 억원 )  48.75',
    expected: 4_875_000_000,
  },
  {
    name: 'Table header format (백만원)',
    text: '총연구비(백만원) 875',
    expected: 875_000_000,
  },
  {
    name: 'Inline format (control)',
    text: '총연구비 48.75억원',
    expected: 4_875_000_000,
  },
  {
    name: 'Standalone 백만원',
    text: '875백만원',
    expected: 875_000_000,
  },
  {
    name: 'Year breakdown format',
    text: '1년도 875백만원',
    expected: 875_000_000,
  },
  {
    name: 'Per-project format (from Ocean Lab)',
    text: '과제당 20백만원',
    expected: 20_000_000,
  },
  {
    name: 'Complex table with header and value separated',
    text: `
      지원규모
      구분    총연구비(억원)    비고
      과제1   48.75           연구개발
    `,
    expected: 4_875_000_000,
  },
];

let passedCount = 0;
let failedCount = 0;

for (const testCase of testCases) {
  const result = extractBudget(testCase.text);

  if (result === testCase.expected) {
    console.log(`✅ PASS: ${testCase.name}`);
    console.log(`   Input: "${testCase.text.replace(/\n/g, ' ').substring(0, 50)}..."`);
    console.log(`   Result: ${result?.toLocaleString()} won\n`);
    passedCount++;
  } else {
    console.log(`❌ FAIL: ${testCase.name}`);
    console.log(`   Input: "${testCase.text.replace(/\n/g, ' ').substring(0, 50)}..."`);
    console.log(`   Expected: ${testCase.expected.toLocaleString()} won`);
    console.log(`   Got: ${result?.toLocaleString() ?? 'null'} won\n`);
    failedCount++;
  }
}

console.log('\n' + '='.repeat(60));
console.log(`Test Results: ${passedCount} passed, ${failedCount} failed`);
console.log('='.repeat(60));
