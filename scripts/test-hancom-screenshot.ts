/**
 * Test Hancom Docs Screenshot-Based HWP Text Extraction
 *
 * This script tests the new screenshot + GPT-4 Vision approach for extracting
 * text from HWP files, bypassing the PDF download bot detection issues.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  convertHWPViaScreenshotHancomDocs,
  canUseScreenshotConversion,
} from '../lib/scraping/utils/hancom-docs-screenshot-extractor';

async function testScreenshotConversion() {
  console.log('=== Testing Hancom Docs Screenshot-Based HWP Extraction ===\n');

  // Check prerequisites
  if (!canUseScreenshotConversion()) {
    console.error('❌ Missing required credentials:');
    console.error('   - HANCOM_EMAIL / HANCOM_DOCS_ID');
    console.error('   - HANCOM_PASSWORD / HANCOM_DOCS_PW');
    console.error('   - OPENAI_API_KEY');
    process.exit(1);
  }

  console.log('✓ All credentials configured\n');

  // Use existing test HWP file
  const testHwpPath = '/tmp/test.hwp';

  if (!fs.existsSync(testHwpPath)) {
    console.error(`❌ Test file not found: ${testHwpPath}`);
    console.error('   Please ensure test.hwp exists in /tmp/');
    process.exit(1);
  }

  const hwpBuffer = fs.readFileSync(testHwpPath);
  const fileName = path.basename(testHwpPath);

  console.log(`Test file: ${testHwpPath}`);
  console.log(`File size: ${hwpBuffer.length} bytes\n`);

  try {
    console.log('Starting conversion...\n');

    const extractedText = await convertHWPViaScreenshotHancomDocs(hwpBuffer, fileName);

    console.log('\n=== RESULTS ===\n');

    if (extractedText) {
      console.log('✅ SUCCESS - Text extracted via screenshot + GPT-4 Vision\n');
      console.log(`Extracted text length: ${extractedText.length} characters`);
      console.log(`\n--- First 500 characters ---`);
      console.log(extractedText.substring(0, 500));
      console.log(`\n--- Last 500 characters ---`);
      console.log(extractedText.substring(Math.max(0, extractedText.length - 500)));

      // Save full output to file
      const outputPath = '/tmp/hancom-screenshot-output.txt';
      fs.writeFileSync(outputPath, extractedText);
      console.log(`\n✓ Full text saved to: ${outputPath}`);
    } else {
      console.log('❌ FAILED - No text extracted');
    }
  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testScreenshotConversion()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
