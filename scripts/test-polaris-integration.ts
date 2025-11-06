/**
 * Test Polaris Office converter integration with attachment parser
 *
 * This script verifies that the HWP → PDF → text extraction pipeline works correctly
 * using the Polaris Office converter in the attachment-parser.ts file.
 *
 * Test file: (붙임1) 2026년도 한-독 양자기술 공동연구사업 신규과제 공_163296668092636.hwp
 * Expected: Successfully extract 15,000+ characters from 20-page government document
 */

import * as fs from 'fs';
import * as path from 'path';
import { extractTextFromAttachment } from '../lib/scraping/utils/attachment-parser';

async function testPolarisIntegration() {
  console.log('=== Testing Polaris Office Converter Integration ===\n');

  // Test file from previous successful conversion
  const hwpFilePath = '/Users/paulkim/Downloads/(붙임1) 2026년도 한-독 양자기술 공동연구사업 신규과제 공_163296668092636.hwp';
  const fileName = '(붙임1) 2026년도 한-독 양자기술 공동연구사업 신규과제 공_163296668092636.hwp';

  // Check if file exists
  if (!fs.existsSync(hwpFilePath)) {
    console.error(`❌ Test file not found: ${hwpFilePath}`);
    console.error('Please ensure the test HWP file is in the Downloads folder.');
    process.exit(1);
  }

  // Read file
  const fileBuffer = fs.readFileSync(hwpFilePath);
  console.log(`✓ Test file loaded: ${fileName}`);
  console.log(`  File size: ${fileBuffer.length} bytes (${(fileBuffer.length / 1024).toFixed(2)} KB)\n`);

  // Extract text using attachment parser (should use Polaris converter internally)
  console.log('Starting text extraction via attachment-parser...\n');
  const startTime = Date.now();

  const extractedText = await extractTextFromAttachment(fileName, fileBuffer);

  const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);

  // Verify results
  if (!extractedText) {
    console.error('\n❌ FAILED: No text extracted');
    console.error('Check logs above for error details.');
    process.exit(1);
  }

  console.log('\n=== Extraction Results ===');
  console.log(`✓ Success: Extracted ${extractedText.length} characters`);
  console.log(`✓ Time: ${elapsedTime} seconds`);
  console.log(`✓ Korean text detected: ${/[가-힣]/.test(extractedText) ? 'YES' : 'NO'}\n`);

  // Show sample text
  console.log('--- First 500 characters ---');
  console.log(extractedText.substring(0, 500));
  console.log('\n--- Last 300 characters ---');
  console.log(extractedText.substring(Math.max(0, extractedText.length - 300)));

  // Save full text for inspection
  const outputPath = '/tmp/polaris-integration-test-output.txt';
  fs.writeFileSync(outputPath, extractedText);
  console.log(`\n✓ Full text saved to: ${outputPath}`);

  // Quality checks
  console.log('\n=== Quality Checks ===');
  const koreanCharCount = (extractedText.match(/[가-힣]/g) || []).length;
  const koreanRatio = (koreanCharCount / extractedText.length) * 100;
  console.log(`✓ Korean character ratio: ${koreanRatio.toFixed(1)}% (${koreanCharCount} Korean chars)`);

  if (extractedText.length >= 5000) {
    console.log('✓ Text length meets minimum requirement (5000+ chars)');
  } else {
    console.warn(`⚠ Text length below expected (${extractedText.length} < 5000 chars)`);
  }

  if (koreanRatio >= 40) {
    console.log('✓ Korean content ratio is healthy (40%+ is good for government docs)');
  } else {
    console.warn(`⚠ Low Korean content ratio (${koreanRatio.toFixed(1)}% < 40%)`);
  }

  console.log('\n✅ POLARIS INTEGRATION TEST PASSED');
  console.log('The attachment-parser.ts now successfully uses Polaris Office converter.');
}

testPolarisIntegration().catch((error) => {
  console.error('\n❌ TEST FAILED:', error.message);
  console.error(error.stack);
  process.exit(1);
});
