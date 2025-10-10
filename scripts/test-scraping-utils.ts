/**
 * Scraping Utilities Test
 *
 * Tests Korean date parsing, budget parsing, and target type detection
 * without requiring full environment setup (Redis, database, etc.)
 */

import {
  parseKoreanDate,
  parseBudgetAmount,
  determineTargetType,
  extractTRLRange,
} from '../lib/scraping/utils';

console.log('\n🧪 Testing Scraping Utilities\n');
console.log('='.repeat(60));

// Test 1: Korean Date Parsing
console.log('\n📅 Test 1: Korean Date Parsing');
console.log('-'.repeat(60));

const dateTests = [
  { input: '2024년 4월 15일', expected: '2024-04-15' },
  { input: '2024.03.15', expected: '2024-03-15' },
  { input: '2024-03-15', expected: '2024-03-15' },
  { input: '2024/03/15', expected: '2024-03-15' },
  { input: '접수기간: 2024.03.15 ~ 2024.04.15', expected: '2024-04-15' },
];

let datePassCount = 0;
dateTests.forEach((test, i) => {
  const result = parseKoreanDate(test.input);
  const resultStr = result?.toISOString().split('T')[0] || 'null';
  const pass = resultStr === test.expected;
  console.log(`  ${i + 1}. Input: "${test.input}"`);
  console.log(`     Expected: ${test.expected}, Got: ${resultStr} ${pass ? '✅' : '❌'}`);
  if (pass) datePassCount++;
});

const dateAccuracy = (datePassCount / dateTests.length * 100).toFixed(0);
console.log(`\n  📊 Accuracy: ${datePassCount}/${dateTests.length} (${dateAccuracy}%)`);

// Test 2: Budget Amount Parsing
console.log('\n💰 Test 2: Budget Amount Parsing');
console.log('-'.repeat(60));

const budgetTests = [
  { input: '10억원', expected: 1000000000 },
  { input: '5백만원', expected: 5000000 },
  { input: '1.5억원', expected: 150000000 },
  { input: '3천만원', expected: 30000000 },
  { input: '지원금액: 최대 2억원', expected: 200000000 },
];

let budgetPassCount = 0;
budgetTests.forEach((test, i) => {
  const result = parseBudgetAmount(test.input);
  const pass = result === test.expected;
  console.log(`  ${i + 1}. Input: "${test.input}"`);
  console.log(`     Expected: ₩${test.expected.toLocaleString()}, Got: ₩${result?.toLocaleString() || 'null'} ${pass ? '✅' : '❌'}`);
  if (pass) budgetPassCount++;
});

const budgetAccuracy = (budgetPassCount / budgetTests.length * 100).toFixed(0);
console.log(`\n  📊 Accuracy: ${budgetPassCount}/${budgetTests.length} (${budgetAccuracy}%)`);

// Test 3: Target Type Detection
console.log('\n🎯 Test 3: Target Type Detection');
console.log('-'.repeat(60));

const targetTests = [
  { input: '중소기업을 대상으로 합니다', expected: 'COMPANY' },
  { input: '연구기관 및 대학 지원사업', expected: 'RESEARCH_INSTITUTE' },
  { input: '기업과 연구소가 공동으로 참여', expected: 'BOTH' },
  { input: '벤처기업 스타트업 지원', expected: 'COMPANY' },
];

let targetPassCount = 0;
targetTests.forEach((test, i) => {
  const result = determineTargetType(test.input);
  const pass = result === test.expected;
  console.log(`  ${i + 1}. Input: "${test.input}"`);
  console.log(`     Expected: ${test.expected}, Got: ${result} ${pass ? '✅' : '❌'}`);
  if (pass) targetPassCount++;
});

const targetAccuracy = (targetPassCount / targetTests.length * 100).toFixed(0);
console.log(`\n  📊 Accuracy: ${targetPassCount}/${targetTests.length} (${targetAccuracy}%)`);

// Test 4: TRL Range Extraction
console.log('\n🔬 Test 4: TRL Range Extraction');
console.log('-'.repeat(60));

const trlTests = [
  { input: 'TRL 4-7 단계 기술', expected: { minTRL: 4, maxTRL: 7 } },
  { input: '기술성숙도 1~3', expected: { minTRL: 1, maxTRL: 3 } },
  { input: 'TRL 5-9 수준', expected: { minTRL: 5, maxTRL: 9 } },
];

let trlPassCount = 0;
trlTests.forEach((test, i) => {
  const result = extractTRLRange(test.input);
  const pass = result?.minTRL === test.expected.minTRL && result?.maxTRL === test.expected.maxTRL;
  console.log(`  ${i + 1}. Input: "${test.input}"`);
  console.log(`     Expected: TRL ${test.expected.minTRL}-${test.expected.maxTRL}, Got: ${result ? `TRL ${result.minTRL}-${result.maxTRL}` : 'null'} ${pass ? '✅' : '❌'}`);
  if (pass) trlPassCount++;
});

const trlAccuracy = (trlPassCount / trlTests.length * 100).toFixed(0);
console.log(`\n  📊 Accuracy: ${trlPassCount}/${trlTests.length} (${trlAccuracy}%)`);

// Overall Summary
console.log('\n' + '='.repeat(60));
console.log('📊 Overall Test Results');
console.log('='.repeat(60));

const totalTests = dateTests.length + budgetTests.length + targetTests.length + trlTests.length;
const totalPass = datePassCount + budgetPassCount + targetPassCount + trlPassCount;
const overallAccuracy = (totalPass / totalTests * 100).toFixed(0);

console.log(`\n  Korean Date Parsing:     ${dateAccuracy}% (${datePassCount}/${dateTests.length})`);
console.log(`  Budget Amount Parsing:   ${budgetAccuracy}% (${budgetPassCount}/${budgetTests.length})`);
console.log(`  Target Type Detection:   ${targetAccuracy}% (${targetPassCount}/${targetTests.length})`);
console.log(`  TRL Range Extraction:    ${trlAccuracy}% (${trlPassCount}/${trlTests.length})`);
console.log(`\n  ⭐ Overall Accuracy:      ${overallAccuracy}% (${totalPass}/${totalTests})`);

if (parseInt(overallAccuracy) >= 90) {
  console.log('\n  ✅ EXCELLENT - Utilities working as expected!');
} else if (parseInt(overallAccuracy) >= 75) {
  console.log('\n  ⚠️  GOOD - Some improvements needed');
} else {
  console.log('\n  ❌ NEEDS WORK - Significant issues detected');
}

console.log('\n' + '='.repeat(60) + '\n');
