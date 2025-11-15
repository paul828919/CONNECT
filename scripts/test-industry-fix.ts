import { extractEligibilityCriteria } from '../lib/scraping/parsers/ntis-announcement-parser';

/**
 * Test Script: Verify Industry Sector Over-Matching Fix
 *
 * Tests the updated extraction logic against sample announcement texts
 * to ensure industry sectors are correctly identified without over-matching.
 */

const testCases = [
  {
    name: 'Academic Research (Generic)',
    text: `
      2025년도 이공분야 학술연구지원사업(박사과정생연구장려금지원) 신규과제 공모

      지원대상
      - 국내 대학 또는 연구기관에 재학 중인 박사과정생
      - 만 40세 이하
      - 최근 3년간 연구실적 우수자

      신청자격
      - 박사과정 2년차 이상
      - 학술지 게재 논문 1편 이상
    `,
    expected: {
      sectors: [],
      reason: 'Generic academic research - no specific industry mentioned',
    },
  },
  {
    name: 'Biomedical Research',
    text: `
      2025년 바이오의료기술개발사업 제1차 신규과제 공모

      지원대상
      - 바이오 및 의료기술 분야 중소기업
      - 신약개발 또는 의료기기 제조 기업

      참여요건
      - 생명공학 관련 사업자등록증 보유
      - 제약 또는 헬스케어 분야 매출 실적
    `,
    expected: {
      sectors: ['bio'],
      reason: 'Biomedical program - should ONLY have "bio", NOT "it"',
    },
  },
  {
    name: 'ICT/Broadcasting Policy',
    text: `
      2025년 상반기 방송통신정책연구(R&D) 신규과제 공고

      지원대상
      - ICT 및 소프트웨어 분야 기업
      - AI 또는 빅데이터 기술 보유 기업

      참여요건
      - 정보통신 관련 사업자
      - SW개발 또는 클라우드 서비스 제공 실적
    `,
    expected: {
      sectors: ['it'],
      reason: 'ICT policy research - correctly tagged as "it"',
    },
  },
  {
    name: 'Defense Industry',
    text: `
      2025년 방산분야 기술개발 지원사업 공고

      지원대상
      - 방위산업체 또는 방산업체
      - 국방 관련 기술 보유 기업

      참여요건
      - 군사기술 개발 경험
      - 방산분야 매출 실적
    `,
    expected: {
      sectors: ['defense'],
      reason: 'Defense industry program - should have "defense"',
    },
  },
  {
    name: 'Infectious Disease Research (Non-IT)',
    text: `
      조달청 사전규격공개 - 감염병 임상연구(삼성기부금사업)

      지원대상
      - 의료기관 또는 대학병원
      - 감염병 연구 경험 보유 기관

      신청자격
      - 임상시험 승인 기관
      - 연구윤리 규정 준수
    `,
    expected: {
      sectors: [],
      reason: 'Clinical research - no specific industry (not IT, not bio in this context)',
    },
  },
];

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║      INDUSTRY SECTOR FIX VERIFICATION TEST                 ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

let passedTests = 0;
let failedTests = 0;

testCases.forEach((testCase, idx) => {
  console.log(`Test ${idx + 1}: ${testCase.name}`);
  console.log(`Expected: [${testCase.expected.sectors.join(', ') || 'NONE'}]`);
  console.log(`Reason: ${testCase.expected.reason}`);

  // Run extraction
  const result = extractEligibilityCriteria(testCase.text);
  const extractedSectors = result?.industryRequirements?.sectors || [];

  console.log(`Extracted: [${extractedSectors.join(', ') || 'NONE'}]`);

  // Check if result matches expected
  const expectedSet = new Set(testCase.expected.sectors);
  const extractedSet = new Set(extractedSectors);

  const isMatch =
    expectedSet.size === extractedSet.size &&
    Array.from(expectedSet).every((sector) => extractedSet.has(sector));

  if (isMatch) {
    console.log('✅ PASS\n');
    passedTests++;
  } else {
    console.log('❌ FAIL');
    console.log(`   Expected [${testCase.expected.sectors.join(', ') || 'NONE'}] but got [${extractedSectors.join(', ') || 'NONE'}]\n`);
    failedTests++;
  }
});

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║                    TEST SUMMARY                            ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

console.log(`Total Tests: ${testCases.length}`);
console.log(`Passed: ${passedTests} ✅`);
console.log(`Failed: ${failedTests} ❌`);
console.log(`Success Rate: ${((passedTests / testCases.length) * 100).toFixed(1)}%\n`);

if (failedTests === 0) {
  console.log('🎉 All tests passed! Industry sector over-matching is FIXED.');
} else {
  console.log('⚠️  Some tests failed. Review extraction logic.');
  process.exit(1);
}
