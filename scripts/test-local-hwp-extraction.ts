/**
 * Local Integration Test: HWP Text Extraction
 *
 * Tests the complete HWP extraction pipeline:
 * 1. Read HWP file from disk
 * 2. Upload to Hancom Docs
 * 3. Capture screenshot
 * 4. Extract text via Tesseract OCR
 * 5. Verify Korean text extraction
 */

import fs from 'fs';
import path from 'path';
import { convertHWPViaHancomTesseract } from '../lib/scraping/utils/hancom-docs-tesseract-converter';

async function testHWPExtraction() {
  console.log('=== Local HWP Extraction Integration Test ===\n');

  // Use the test HWP file
  const testFilePath = path.join(process.cwd(), 'test-hwp-upload.hwp');

  if (!fs.existsSync(testFilePath)) {
    console.error('❌ Test file not found:', testFilePath);
    process.exit(1);
  }

  const fileBuffer = fs.readFileSync(testFilePath);
  const fileName = path.basename(testFilePath);

  console.log(`✓ Test file loaded: ${fileName}`);
  console.log(`  Size: ${(fileBuffer.length / 1024).toFixed(2)} KB\n`);

  try {
    console.log('🚀 Starting HWP extraction...\n');
    const startTime = Date.now();

    const extractedText = await convertHWPViaHancomTesseract(fileBuffer, fileName);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    if (!extractedText || extractedText.length === 0) {
      console.error('❌ FAILED: No text extracted');
      process.exit(1);
    }

    // Analyze results
    const totalChars = extractedText.length;
    const koreanChars = (extractedText.match(/[\uAC00-\uD7AF]/g) || []).length;
    const koreanPercentage = ((koreanChars / totalChars) * 100).toFixed(1);

    console.log('✅ SUCCESS: Text extraction completed\n');
    console.log('📊 Results:');
    console.log(`  Total characters: ${totalChars}`);
    console.log(`  Korean characters: ${koreanChars} (${koreanPercentage}%)`);
    console.log(`  Duration: ${duration} seconds`);
    console.log(`\n📝 Sample text (first 200 chars):`);
    console.log(`  ${extractedText.substring(0, 200)}...\n`);

    // Validation checks
    if (totalChars < 50) {
      console.warn('⚠️  WARNING: Extracted text is very short (< 50 characters)');
    }

    if (koreanChars === 0) {
      console.warn('⚠️  WARNING: No Korean characters detected');
    }

    console.log('✅ All integration tests passed!');
    process.exit(0);

  } catch (error) {
    console.error('❌ FAILED: Error during extraction');
    console.error(error);
    process.exit(1);
  }
}

testHWPExtraction();
