/**
 * Test Nuclear Program Classification Debug Script
 *
 * This script tests the classification of the Nuclear Policy Research program
 * to diagnose why it's being classified as ICT instead of ENERGY
 */

import { classifyWithOfficialTaxonomy } from '../lib/scraping/parsers/official-category-mapper';

// Test cases
const testCases = [
  {
    title: '2025년도 하반기 원자력정책연구사업 재공고',
    ministry: '과학기술정보통신부',
    agency: '한국연구재단',
    expectedCategory: 'ENERGY',
  },
  {
    title: '인공지능 특화 파운데이션 모델 프로젝트 공고',
    ministry: '과학기술정보통신부',
    agency: '과학기술정보통신부',
    expectedCategory: 'ICT',
  },
];

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  Nuclear Program Classification Debug Test                 ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

for (const testCase of testCases) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📋 Title: ${testCase.title}`);
  console.log(`🏛️  Ministry: ${testCase.ministry}`);
  console.log(`🏢 Agency: ${testCase.agency}`);
  console.log(`✅ Expected: ${testCase.expectedCategory}`);
  console.log(`${'═'.repeat(60)}\n`);

  // Test 1: Title only (should work with official taxonomy)
  console.log('Test 1: Classification with title only');
  const result1 = classifyWithOfficialTaxonomy(testCase.title);
  console.log(`  Result: ${result1.category}`);
  console.log(`  Confidence: ${result1.confidence}`);
  console.log(`  Source: ${result1.source}`);
  console.log(`  Matched Keywords: ${result1.matchedKeywords.join(', ')}`);
  console.log(`  ✓ Match: ${result1.category === testCase.expectedCategory ? 'YES' : 'NO'}`);

  // Test 2: Title + Ministry + Agency
  console.log('\nTest 2: Classification with title + ministry + agency');
  const result2 = classifyWithOfficialTaxonomy(
    testCase.title,
    testCase.ministry,
    testCase.agency
  );
  console.log(`  Result: ${result2.category}`);
  console.log(`  Confidence: ${result2.confidence}`);
  console.log(`  Source: ${result2.source}`);
  console.log(`  Matched Keywords: ${result2.matchedKeywords.join(', ')}`);
  console.log(`  ✓ Match: ${result2.category === testCase.expectedCategory ? 'YES' : 'NO'}`);

  // Test 3: Manual keyword check
  console.log('\nTest 3: Manual keyword detection');
  const searchText = testCase.title.toLowerCase();
  console.log(`  Search text: "${searchText}"`);

  // Check for "원자력" keyword
  const nuclearKeyword = '원자력';
  const hasNuclear = searchText.includes(nuclearKeyword.toLowerCase());
  console.log(`  Contains "${nuclearKeyword}": ${hasNuclear}`);

  // Check for ICT keywords
  const ictKeywords = ['ICT', '정보통신', 'AI', '인공지능', '소프트웨어'];
  ictKeywords.forEach(keyword => {
    const hasKeyword = searchText.includes(keyword.toLowerCase());
    if (hasKeyword) {
      console.log(`  Contains "${keyword}": ${hasKeyword}`);
    }
  });
}

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║  Test Complete                                              ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');
