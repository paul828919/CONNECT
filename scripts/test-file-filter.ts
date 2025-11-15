#!/usr/bin/env tsx
/**
 * Test announcement file filter on specific filename
 */

import { filterAnnouncementFiles } from '../lib/scraping/announcement-file-filter';

const testFilename = '붙임1. 25-1차 글로벌 방위산업 강소기업 육성사업 지원과제 및 주관기업 모집 공고문.hwp';

console.log('Testing announcement file filter:');
console.log('');
console.log(`Filename: ${testFilename}`);
console.log('');

const result = filterAnnouncementFiles([testFilename]);

if (result.length > 0) {
  console.log('✅ CLASSIFIED AS: Announcement file');
  console.log('   → Would be processed for text extraction');
} else {
  console.log('❌ CLASSIFIED AS: Other file');
  console.log('   → Would be skipped (NOT processed for extraction)');
}

console.log('');
