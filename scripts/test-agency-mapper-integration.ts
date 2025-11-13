/**
 * Test Agency Mapper Integration with Official Taxonomy
 *
 * Validates that the agency-mapper correctly integrates the official
 * Korean taxonomy classifier (KSIC + NSTC) for program classification.
 *
 * Tests:
 * 1. High confidence official taxonomy classification
 * 2. Medium confidence with agency validation
 * 3. Agency/taxonomy conflict resolution
 * 4. Fallback to legacy logic when title unavailable
 * 5. Cross-domain agency handling (NRF, KISTEP)
 *
 * Run: npx tsx scripts/test-agency-mapper-integration.ts
 */

import { extractCategoryFromMinistryAndAgency } from '../lib/scraping/parsers/agency-mapper';

console.log('🧪 Testing Agency Mapper Integration with Official Taxonomy\n');
console.log('='.repeat(80));

interface TestCase {
  description: string;
  ministry: string | null;
  agency: string | null;
  title: string | null;
  expectedCategory: string;
  expectedConfidence: 'high' | 'medium' | 'low' | 'none';
  expectedSource: string;
  notes?: string;
}

const testCases: TestCase[] = [
  // ═══════════════════════════════════════════════════════════════════
  // Test 1: High confidence official taxonomy (should use taxonomy directly)
  // ═══════════════════════════════════════════════════════════════════
  {
    description: 'Nuclear safety program - High confidence from taxonomy',
    ministry: '원자력안전위원회',
    agency: '한국원자력안전재단',
    title: '2024년 원자력안전연구개발사업 신규과제 공모',
    expectedCategory: 'ENERGY',
    expectedConfidence: 'high',
    expectedSource: 'both', // Agency + taxonomy both agree = cross-validated
    notes: 'Previously misclassified as ICT - should now be ENERGY',
  },
  {
    description: 'Nano/Materials program - High confidence from taxonomy',
    ministry: '과학기술정보통신부',
    agency: '한국연구재단',
    title: '2024년 나노 및 소재기술개발사업',
    expectedCategory: 'MANUFACTURING',
    expectedConfidence: 'high',
    expectedSource: 'nstc',
    notes: 'Previously misclassified as ICT - should now be MANUFACTURING',
  },
  {
    description: 'Pure ICT program - High confidence from taxonomy',
    ministry: '과학기술정보통신부',
    agency: '정보통신기획평가원',
    title: '2024년 정보통신방송기술개발사업',
    expectedCategory: 'ICT',
    expectedConfidence: 'high',
    expectedSource: 'both', // Agency + taxonomy both agree = cross-validated
    notes: 'Should correctly classify as ICT',
  },

  // ═══════════════════════════════════════════════════════════════════
  // Test 2: Medium confidence with agency validation (should boost to high)
  // ═══════════════════════════════════════════════════════════════════
  {
    description: 'Environment program with ministry alignment',
    ministry: '환경부',
    agency: '한국환경산업기술원',
    title: '2024년 친환경 저탄소 기술개발사업',
    expectedCategory: 'ENVIRONMENT',
    expectedConfidence: 'high',
    expectedSource: 'both',
    notes: 'Taxonomy medium confidence + agency validation = high confidence',
  },

  // ═══════════════════════════════════════════════════════════════════
  // Test 3: Cross-domain agency (NRF) - Should use official taxonomy
  // ═══════════════════════════════════════════════════════════════════
  {
    description: 'NRF bio/health program - Should detect from title',
    ministry: '과학기술정보통신부',
    agency: '한국연구재단',
    title: '2024년 바이오헬스 기술개발사업',
    expectedCategory: 'BIO_HEALTH',
    expectedConfidence: 'high',
    expectedSource: 'nstc',
    notes: 'NRF defaults to ICT, but title should override to BIO_HEALTH',
  },
  {
    description: 'NRF energy program - Should detect from title',
    ministry: '과학기술정보통신부',
    agency: '한국연구재단',
    title: '2024년 수소에너지 기술개발사업',
    expectedCategory: 'ENERGY',
    expectedConfidence: 'high',
    expectedSource: 'nstc',
    notes: 'NRF defaults to ICT, but title should override to ENERGY',
  },

  // ═══════════════════════════════════════════════════════════════════
  // Test 4: No title - Fallback to legacy agency/ministry logic
  // ═══════════════════════════════════════════════════════════════════
  {
    description: 'No title - Should use agency mapping',
    ministry: '환경부',
    agency: '한국환경산업기술원',
    title: null,
    expectedCategory: 'ENVIRONMENT',
    expectedConfidence: 'high',
    expectedSource: 'both',
    notes: 'Without title, should fall back to agency/ministry mappings',
  },

  // ═══════════════════════════════════════════════════════════════════
  // Test 5: Ministry/Agency conflict with taxonomy
  // ═══════════════════════════════════════════════════════════════════
  {
    description: 'Defense program under ICT ministry',
    ministry: '과학기술정보통신부',
    agency: '국방과학연구소',
    title: '2024년 국방 AI 기술개발사업',
    expectedCategory: 'DEFENSE',
    expectedConfidence: 'high', // Agency + taxonomy both agree on DEFENSE = high confidence
    expectedSource: 'both',
    notes: 'Agency-specific DEFENSE should override taxonomy ICT/AI classification',
  },
];

console.log('\n📋 Running Test Cases\n');

let passed = 0;
let failed = 0;

testCases.forEach((testCase, idx) => {
  console.log(`\n${'─'.repeat(80)}`);
  console.log(`Test ${idx + 1}: ${testCase.description}`);
  console.log(`   Ministry: ${testCase.ministry || 'NULL'}`);
  console.log(`   Agency: ${testCase.agency || 'NULL'}`);
  console.log(`   Title: ${testCase.title?.substring(0, 60) || 'NULL'}${testCase.title && testCase.title.length > 60 ? '...' : ''}`);

  const result = extractCategoryFromMinistryAndAgency(
    testCase.ministry,
    testCase.agency,
    testCase.title
  );

  console.log(`\n   Result:`);
  console.log(`      Category: ${result.category}`);
  console.log(`      Confidence: ${result.confidence}`);
  console.log(`      Source: ${result.source}`);
  console.log(`      Manual Review: ${result.requiresManualReview}`);
  console.log(`      Context: ${result.context || 'N/A'}`);
  console.log(`      Keywords (first 5): ${result.keywords.slice(0, 5).join(', ')}`);

  console.log(`\n   Expected:`);
  console.log(`      Category: ${testCase.expectedCategory}`);
  console.log(`      Confidence: ${testCase.expectedConfidence}`);
  console.log(`      Source: ${testCase.expectedSource}`);

  const categoryMatch = result.category === testCase.expectedCategory;
  const confidenceMatch = result.confidence === testCase.expectedConfidence;
  const sourceMatch = result.source === testCase.expectedSource;

  const testPassed = categoryMatch && confidenceMatch && sourceMatch;

  console.log(`\n   Status: ${testPassed ? '✅ PASS' : '❌ FAIL'}`);
  if (!categoryMatch) {
    console.log(`      ❌ Category mismatch: expected ${testCase.expectedCategory}, got ${result.category}`);
  }
  if (!confidenceMatch) {
    console.log(`      ⚠️  Confidence mismatch: expected ${testCase.expectedConfidence}, got ${result.confidence}`);
  }
  if (!sourceMatch) {
    console.log(`      ⚠️  Source mismatch: expected ${testCase.expectedSource}, got ${result.source}`);
  }

  if (testCase.notes) {
    console.log(`   Notes: ${testCase.notes}`);
  }

  if (testPassed) {
    passed++;
  } else {
    failed++;
  }
});

console.log(`\n\n${'='.repeat(80)}`);
console.log('📊 TEST SUMMARY\n');
console.log(`   Total Tests: ${testCases.length}`);
console.log(`   Passed: ${passed} (${((passed / testCases.length) * 100).toFixed(1)}%)`);
console.log(`   Failed: ${failed} (${((failed / testCases.length) * 100).toFixed(1)}%)`);

if (failed === 0) {
  console.log('\n   ✅ ALL TESTS PASSED - Integration successful!');
  console.log('\n   Next Steps:');
  console.log('      1. ✅ Integration validated locally');
  console.log('      2. 📝 Commit changes to git');
  console.log('      3. 🚀 Deploy to production');
  console.log('      4. 🧪 Monitor classification quality in production');
} else {
  console.log('\n   ❌ TESTS FAILED - Review integration logic');
  console.log('\n   Action Required:');
  console.log('      1. 🔍 Review failed test cases above');
  console.log('      2. 🛠️  Fix integration logic in agency-mapper.ts');
  console.log('      3. 🔄 Re-run this test script');
}

console.log(`\n${'='.repeat(80)}\n`);

process.exit(failed === 0 ? 0 : 1);
