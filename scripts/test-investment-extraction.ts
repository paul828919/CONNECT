import { extractInvestmentRequirement } from '../lib/scraping/utils';

const tests = [
  { text: '투자 유치 20억원 이상', expected: 2000000000 },
  { text: '투자금 5억원 이상', expected: 500000000 },
  { text: '투자 실적 10억원 이상', expected: 1000000000 },
  { text: '자기자본 3억원 이상', expected: 300000000 },
  { text: '자본금 2억원 이상', expected: 200000000 },
  { text: '기업은 기술개발 역량이 있어야 함', expected: null },
];

console.log('Testing Investment Extraction:\n');

let passed = 0;
tests.forEach((test, i) => {
  const result = extractInvestmentRequirement(test.text);
  const match = result === test.expected;
  console.log((i+1) + '. ' + test.text);
  console.log('   Expected: ' + test.expected + ', Got: ' + result + ' ' + (match ? '✓' : '✗'));
  if (match) passed++;
});

console.log('\nResult: ' + passed + '/' + tests.length + ' passed');
