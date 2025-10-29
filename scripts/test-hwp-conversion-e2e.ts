#!/usr/bin/env tsx

/**
 * End-to-End HWP Conversion Test
 *
 * Tests the complete HWP conversion flow:
 * 1. Create authenticated browser (login)
 * 2. Upload HWP file
 * 3. Wait for editor to load
 * 4. Download PDF
 * 5. Extract text
 */

import { convertHWPViaPDFHandomDocs } from '../lib/scraping/utils/hancom-docs-converter';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('🧪 Testing End-to-End HWP Conversion...\n');

  // Use a real HWP file from test data (if available)
  // For now, test with a minimal HWP file
  const testHwpPath = path.join(__dirname, '../test-data/sample.hwp');

  if (!fs.existsSync(testHwpPath)) {
    console.log('⚠️  No test HWP file found at:', testHwpPath);
    console.log('   Skipping end-to-end conversion test');
    console.log('   Upload button fix will be tested during actual scrape\n');
    process.exit(0);
  }

  try {
    const hwpBuffer = fs.readFileSync(testHwpPath);
    console.log(`📄 Test HWP file: ${path.basename(testHwpPath)} (${hwpBuffer.length} bytes)`);

    const extractedText = await convertHWPViaPDFHandomDocs(
      hwpBuffer,
      path.basename(testHwpPath)
    );

    if (extractedText && extractedText.length > 0) {
      console.log('\n✅ SUCCESS: HWP conversion completed end-to-end');
      console.log(`   Extracted ${extractedText.length} characters`);
      console.log(`   Sample: ${extractedText.substring(0, 100)}...`);
      process.exit(0);
    } else {
      console.error('\n❌ FAILURE: Text extraction returned empty');
      process.exit(1);
    }
  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
    process.exit(1);
  }
}

main();
