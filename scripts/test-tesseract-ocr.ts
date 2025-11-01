/**
 * Test Tesseract OCR on Hancom Docs screenshot
 *
 * This script tests Korean OCR accuracy with Tesseract.js
 */

import { createWorker } from 'tesseract.js';
import * as fs from 'fs';

async function testTesseractOCR() {
  console.log('=== Testing Tesseract OCR on Hancom Docs Screenshot ===\n');

  const screenshotPath = '/tmp/hancom-page-full.png';

  if (!fs.existsSync(screenshotPath)) {
    console.error(`❌ Screenshot not found: ${screenshotPath}`);
    console.log('Please run test-hancom-screenshot-capture.ts first to generate screenshot');
    process.exit(1);
  }

  console.log(`✓ Screenshot found: ${screenshotPath}`);
  const stats = fs.statSync(screenshotPath);
  console.log(`  File size: ${(stats.size / 1024).toFixed(2)} KB\n`);

  console.log('Initializing Tesseract worker for Korean...');
  const worker = await createWorker('kor', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text') {
        process.stdout.write(`\r  Progress: ${(m.progress * 100).toFixed(1)}%`);
      }
    },
  });

  console.log('\n✓ Worker initialized\n');
  console.log('Performing OCR...');
  const startTime = Date.now();

  const { data: { text } } = await worker.recognize(screenshotPath);

  const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);

  await worker.terminate();

  if (!text || text.trim().length === 0) {
    console.error('\n❌ FAILED: No text extracted');
    process.exit(1);
  }

  console.log('\n\n=== OCR Results ===');
  console.log(`✓ Extracted ${text.length} characters`);
  console.log(`✓ Time: ${elapsedTime} seconds`);
  console.log(`✓ Korean text detected: ${/[가-힣]/.test(text) ? 'YES' : 'NO'}\n`);

  console.log('--- First 800 characters ---');
  console.log(text.substring(0, 800));
  console.log('\n--- Last 300 characters ---');
  console.log(text.substring(Math.max(0, text.length - 300)));

  const outputPath = '/tmp/tesseract-ocr-output.txt';
  fs.writeFileSync(outputPath, text);
  console.log(`\n✓ Full text saved to: ${outputPath}`);

  console.log('\n✅ TESSERACT OCR TEST PASSED');
}

testTesseractOCR().catch((error) => {
  console.error('\n❌ TEST FAILED:', error.message);
  console.error(error.stack);
  process.exit(1);
});
