#!/usr/bin/env tsx
/**
 * Classification Logic Debug Script
 *
 * Purpose: Test the classification function directly with false negative job titles
 * to identify why R&D announcements are being classified as NOTICE.
 *
 * Usage:
 *   npx tsx scripts/test-classification-debug.ts
 */

import { classifyAnnouncement } from '../lib/scraping/classification';

console.log('═══════════════════════════════════════════════════════════════════════');
console.log('CLASSIFICATION LOGIC DEBUG');
console.log('═══════════════════════════════════════════════════════════════════════');
console.log('');

// Test cases from confirmed false negatives
const testCases = [
  {
    id: 'announcement-392',
    title: '2025년도 전자부품산업기술개발(차세대탄소중립형디지털모듈러LED제품서비스융합기술및실증) 신규지원 대상과제 공고',
    expectedType: 'R_D_PROJECT',
    reason: 'Contains: 기술개발, 대상과제, 공고',
  },
  {
    id: 'announcement-20',
    title: '2025년도 양자과학기술 플래그십 프로젝트(양자컴퓨팅) 신규과제 공고',
    expectedType: 'R_D_PROJECT',
    reason: 'Contains: 과학기술, 신규과제, 공고',
  },
  {
    id: 'announcement-599',
    title: '2025년도 소재부품기술개발사업(2차) 신규지원 대상과제 공고',
    expectedType: 'R_D_PROJECT',
    reason: 'Contains: 기술개발사업, 대상과제, 공고',
  },
  {
    id: 'collabo-rd',
    title: '2025년도 산학연 Collabo R&D사업(컨소시엄형) 시행계획 공고',
    expectedType: 'R_D_PROJECT',
    reason: 'Contains: R&D사업, but also has 시행계획 공고',
  },
];

console.log('TEST 1: Title-Only Classification (No Description)');
console.log('───────────────────────────────────────────────────────────────────────');
console.log('This tests if the title alone would be correctly classified.\n');

let titleOnlyCorrect = 0;
let titleOnlyIncorrect = 0;

testCases.forEach((testCase) => {
  const result = classifyAnnouncement({
    title: testCase.title,
    description: '', // Empty description to test title-only
    url: 'https://www.ntis.go.kr/test',
    source: 'ntis',
  });

  const isCorrect = result === testCase.expectedType;
  const icon = isCorrect ? '✅' : '❌';

  console.log(`${icon} ${testCase.id}:`);
  console.log(`   Title: ${testCase.title.substring(0, 80)}...`);
  console.log(`   Expected: ${testCase.expectedType}`);
  console.log(`   Actual: ${result}`);
  console.log(`   Reason: ${testCase.reason}`);
  console.log('');

  if (isCorrect) {
    titleOnlyCorrect++;
  } else {
    titleOnlyIncorrect++;
  }
});

console.log('───────────────────────────────────────────────────────────────────────');
console.log(`Title-Only Results: ${titleOnlyCorrect} correct, ${titleOnlyIncorrect} incorrect`);
console.log('');

console.log('TEST 2: Title + Generic Description');
console.log('───────────────────────────────────────────────────────────────────────');
console.log('This tests classification with a generic R&D-like description.\n');

const genericDescription = '연구개발과제 공모 안내. 본 공고는 신규 기술개발 과제를 지원합니다.';

let withDescCorrect = 0;
let withDescIncorrect = 0;

testCases.forEach((testCase) => {
  const result = classifyAnnouncement({
    title: testCase.title,
    description: genericDescription,
    url: 'https://www.ntis.go.kr/test',
    source: 'ntis',
  });

  const isCorrect = result === testCase.expectedType;
  const icon = isCorrect ? '✅' : '❌';

  console.log(`${icon} ${testCase.id}:`);
  console.log(`   Title: ${testCase.title.substring(0, 80)}...`);
  console.log(`   Description: ${genericDescription}`);
  console.log(`   Expected: ${testCase.expectedType}`);
  console.log(`   Actual: ${result}`);
  console.log('');

  if (isCorrect) {
    withDescCorrect++;
  } else {
    withDescIncorrect++;
  }
});

console.log('───────────────────────────────────────────────────────────────────────');
console.log(`With Description Results: ${withDescCorrect} correct, ${withDescIncorrect} incorrect`);
console.log('');

console.log('TEST 3: Title + NOTICE-Triggering Description');
console.log('───────────────────────────────────────────────────────────────────────');
console.log('This tests if NOTICE patterns in description override R&D title.\n');

const noticeDescription = '본 공고는 2025년도 사업 시행계획 안내입니다. 사업추진계획을 공지합니다.';

let noticeDescCorrect = 0;
let noticeDescIncorrect = 0;

testCases.forEach((testCase) => {
  const result = classifyAnnouncement({
    title: testCase.title,
    description: noticeDescription,
    url: 'https://www.ntis.go.kr/test',
    source: 'ntis',
  });

  const isCorrect = result === testCase.expectedType;
  const icon = isCorrect ? '✅' : '❌';
  const warning = !isCorrect ? ' ⚠️  NOTICE PATTERN OVERRIDE!' : '';

  console.log(`${icon} ${testCase.id}:${warning}`);
  console.log(`   Title: ${testCase.title.substring(0, 80)}...`);
  console.log(`   Description: ${noticeDescription}`);
  console.log(`   Expected: ${testCase.expectedType}`);
  console.log(`   Actual: ${result}`);
  console.log('');

  if (isCorrect) {
    noticeDescCorrect++;
  } else {
    noticeDescIncorrect++;
  }
});

console.log('───────────────────────────────────────────────────────────────────────');
console.log(`NOTICE Description Results: ${noticeDescCorrect} correct, ${noticeDescIncorrect} incorrect`);
console.log('');

console.log('═══════════════════════════════════════════════════════════════════════');
console.log('SUMMARY');
console.log('═══════════════════════════════════════════════════════════════════════');
console.log('');
console.log(`Total Test Cases: ${testCases.length}`);
console.log('');
console.log('Results by Test:');
console.log(`  1. Title-Only:           ${titleOnlyCorrect}/${testCases.length} correct`);
console.log(`  2. With Generic Desc:    ${withDescCorrect}/${testCases.length} correct`);
console.log(`  3. With NOTICE Desc:     ${noticeDescCorrect}/${testCases.length} correct`);
console.log('');

if (titleOnlyCorrect === testCases.length) {
  console.log('✅ TITLE-ONLY classification works correctly!');
  console.log('   → Issue is in how description/combinedText is processed');
} else {
  console.log('❌ TITLE-ONLY classification is broken!');
  console.log('   → Issue is in the pattern matching logic itself');
}
console.log('');

if (noticeDescCorrect < testCases.length) {
  console.log('🚨 CRITICAL: NOTICE patterns in description OVERRIDE R&D title patterns!');
  console.log('   → This explains the false negatives in production');
  console.log('   → Fix: Prioritize title patterns over description patterns');
} else {
  console.log('✅ Description NOTICE patterns do NOT override title R&D patterns');
}
console.log('');
console.log('═══════════════════════════════════════════════════════════════════════');
