/**
 * Attachment Parser Integration Test
 *
 * Tests that attachment-parser.ts correctly routes HWP files
 * to the Hancom Docs + Tesseract converter
 */

import fs from 'fs';
import path from 'path';
import { extractTextFromAttachment } from '../lib/scraping/utils/attachment-parser';

async function testAttachmentParser() {
  console.log('=== Attachment Parser HWP Integration Test ===\n');

  const testFilePath = path.join(process.cwd(), 'test-hwp-upload.hwp');

  if (!fs.existsSync(testFilePath)) {
    console.error('❌ Test file not found:', testFilePath);
    process.exit(1);
  }

  const fileBuffer = fs.readFileSync(testFilePath);
  const fileName = 'test-document.hwp';

  console.log(`✓ Test file loaded: ${fileName}`);
  console.log(`  Size: ${(fileBuffer.length / 1024).toFixed(2)} KB\n`);

  try {
    console.log('🚀 Testing attachment parser with HWP file...\n');
    const startTime = Date.now();

    // This should automatically route to convertHWPViaHancomTesseract
    const result = await extractTextFromAttachment(fileName, fileBuffer);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    if (!result || result.length === 0) {
      console.error('❌ FAILED: attachment-parser returned no text');
      process.exit(1);
    }

    console.log('✅ SUCCESS: Attachment parser integration working\n');
    console.log('📊 Results:');
    console.log(`  Characters extracted: ${result.length}`);
    console.log(`  Duration: ${duration} seconds`);
    console.log(`\n📝 Sample (first 150 chars):`);
    console.log(`  ${result.substring(0, 150)}...\n`);

    // Verify Korean text is present
    const koreanChars = (result.match(/[\uAC00-\uD7AF]/g) || []).length;
    if (koreanChars > 0) {
      console.log(`✅ Korean text detected: ${koreanChars} characters`);
    } else {
      console.warn('⚠️  WARNING: No Korean characters in result');
    }

    console.log('\n✅ Attachment parser integration test passed!');
    process.exit(0);

  } catch (error) {
    console.error('❌ FAILED: Error in attachment parser');
    console.error(error);
    process.exit(1);
  }
}

testAttachmentParser();
