/**
 * Test Hancom Docs screenshot-based HWP text extraction
 */

import { convertHWPViaScreenshotHancomDocs } from '../lib/scraping/utils/hancom-docs-screenshot-extractor';
import * as fs from 'fs';

async function testScreenshotExtraction() {
  console.log('=== Testing Hancom Docs Screenshot-Based Extraction ===\n');

  const hwpFilePath = '/Users/paulkim/Downloads/(붙임1) 2026년도 한-독 양자기술 공동연구사업 신규과제 공_163296668092636.hwp';
  const fileName = '(붙임1) 2026년도 한-독 양자기술 공동연구사업 신규과제 공_163296668092636.hwp';

  if (!fs.existsSync(hwpFilePath)) {
    console.error('❌ Test HWP file not found');
    process.exit(1);
  }

  const fileBuffer = fs.readFileSync(hwpFilePath);
  console.log(`✓ Test file loaded: ${fileName}`);
  console.log(`  File size: ${fileBuffer.length} bytes\n`);

  console.log('Starting screenshot-based extraction...');
  const startTime = Date.now();

  const extractedText = await convertHWPViaScreenshotHancomDocs(fileBuffer, fileName);

  const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);

  if (!extractedText) {
    console.error('\n❌ FAILED: No text extracted');
    process.exit(1);
  }

  console.log('\n=== Extraction Results ===');
  console.log(`✓ Success: Extracted ${extractedText.length} characters`);
  console.log(`✓ Time: ${elapsedTime} seconds`);
  console.log(`✓ Korean text detected: ${/[가-힣]/.test(extractedText) ? 'YES' : 'NO'}\n`);

  console.log('--- First 800 characters ---');
  console.log(extractedText.substring(0, 800));
  console.log('\n--- Last 300 characters ---');
  console.log(extractedText.substring(Math.max(0, extractedText.length - 300)));

  const outputPath = '/tmp/hancom-screenshot-extraction-output.txt';
  fs.writeFileSync(outputPath, extractedText);
  console.log(`\n✓ Full text saved to: ${outputPath}`);

  console.log('\n✅ SCREENSHOT EXTRACTION TEST PASSED');
}

testScreenshotExtraction().catch((error) => {
  console.error('\n❌ TEST FAILED:', error.message);
  console.error(error.stack);
  process.exit(1);
});
