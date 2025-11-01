/**
 * Test Hancom Docs Tesseract Converter
 *
 * End-to-end test of production-ready HWP converter
 */

import { convertHWPViaHancomTesseract } from '../lib/scraping/utils/hancom-docs-tesseract-converter';
import * as fs from 'fs';

async function testConverter() {
  console.log('=== Testing Hancom Docs Tesseract Converter ===');
  console.log('');

  const hwpFilePath = '/Users/paulkim/Downloads/(붙임1) 2026년도 한-독 양자기술 공동연구사업 신규과제 공_163296668092636.hwp';
  const fileName = '(붙임1) 2026년도 한-독 양자기술 공동연구사업 신규과제 공_163296668092636.hwp';

  if (!fs.existsSync(hwpFilePath)) {
    console.error('ERROR: Test file not found');
    process.exit(1);
  }

  const fileBuffer = fs.readFileSync(hwpFilePath);
  console.log('Test file loaded: ' + fileName);
  console.log('  File size: ' + (fileBuffer.length / 1024).toFixed(2) + ' KB');
  console.log('');

  console.log('Starting conversion...');
  console.log('');
  const startTime = Date.now();

  const extractedText = await convertHWPViaHancomTesseract(fileBuffer, fileName);

  const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);

  if (!extractedText) {
    console.error('');
    console.error('FAILED: No text extracted');
    process.exit(1);
  }

  console.log('');
  console.log('=== Conversion Results ===');
  console.log('Success: Extracted ' + extractedText.length + ' characters');
  console.log('Total time: ' + elapsedTime + ' seconds');
  console.log('Korean text: ' + (/[가-힣]/.test(extractedText) ? 'YES' : 'NO'));
  console.log('');

  console.log('--- First 500 characters ---');
  console.log(extractedText.substring(0, 500));
  console.log('');
  console.log('--- Last 200 characters ---');
  console.log(extractedText.substring(Math.max(0, extractedText.length - 200)));

  const outputPath = '/tmp/hancom-tesseract-converter-output.txt';
  fs.writeFileSync(outputPath, extractedText);
  console.log('');
  console.log('Full text saved to: ' + outputPath);

  console.log('');
  console.log('CONVERTER TEST PASSED');
}

testConverter().catch((error) => {
  console.error('');
  console.error('TEST FAILED: ' + error.message);
  console.error(error.stack);
  process.exit(1);
});
