/**
 * Test script for Hancom Docs HWP-to-PDF conversion workflow
 *
 * Tests all 17 steps specified in the user requirements:
 * - Hancom Docs login
 * - Upload Document button detection
 * - HWP file attachment upload
 * - Editor window and PDF conversion
 * - PDF text validation
 * - Data extraction and storage
 *
 * Run: docker exec connect_dev_scraper npx tsx scripts/test-hancom-docs-workflow.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { extractTextFromAttachment } from '../lib/scraping/utils/attachment-parser';
import { cleanupBrowser } from '../lib/scraping/utils/hancom-docs-converter';

async function testHancomDocsWorkflow() {
  console.log('='.repeat(80));
  console.log('Hancom Docs HWP-to-PDF Conversion Workflow Test');
  console.log('='.repeat(80));
  console.log();

  try {
    // Step 0: Find sample HWP file
    console.log('[STEP 0] Finding sample HWP file...');
    const attachmentsDir = '/app/data/ntis-attachments';

    if (!fs.existsSync(attachmentsDir)) {
      console.log(`Creating attachments directory: ${attachmentsDir}`);
      fs.mkdirSync(attachmentsDir, { recursive: true });
    }

    // Search for existing HWP files
    const files = fs.readdirSync(attachmentsDir, { recursive: true });
    const hwpFiles = files
      .filter((file) => typeof file === 'string' && (file.endsWith('.hwp') || file.endsWith('.hwpx')))
      .slice(0, 1);

    if (hwpFiles.length === 0) {
      console.error('✗ No HWP/HWPX files found in /app/data/ntis-attachments');
      console.error('Please copy a test HWP file to /app/data/ntis-attachments/ directory');
      process.exit(1);
    }

    const testFile = path.join(attachmentsDir, hwpFiles[0] as string);
    console.log(`✓ Found test file: ${testFile}`);
    console.log();

    // Step 1-17: Extract text from attachment (includes all Hancom Docs steps)
    console.log('[STEP 1-17] Starting HWP-to-PDF conversion...');
    console.log('This includes:');
    console.log('  1. Accessing Hancom Docs login page');
    console.log('  2. Logging in with credentials');
    console.log('  3. Finding Upload Document button');
    console.log('  4. Uploading HWP file');
    console.log('  5. Opening editor window');
    console.log('  6. Clicking File button');
    console.log('  7. Downloading PDF');
    console.log('  8. Validating PDF text');
    console.log('  9. Extracting text');
    console.log();

    const fileBuffer = fs.readFileSync(testFile);
    const fileName = path.basename(testFile);

    const extractedText = await extractTextFromAttachment(fileName, fileBuffer);

    console.log();
    console.log('='.repeat(80));
    console.log('Test Results');
    console.log('='.repeat(80));

    if (extractedText) {
      console.log('✓ SUCCESS: Text extraction completed');
      console.log(`✓ Extracted ${extractedText.length} characters`);
      console.log();
      console.log('First 500 characters:');
      console.log('-'.repeat(80));
      console.log(extractedText.substring(0, 500));
      console.log('-'.repeat(80));
      console.log();

      // Verify Korean text is present (not garbled)
      const hasKorean = /[가-힣]/.test(extractedText);
      if (hasKorean) {
        console.log('✓ Korean text detected (not garbled)');
      } else {
        console.warn('⚠ No Korean text detected (might be English document or garbled)');
      }

      console.log();
      console.log('✅ All workflow steps completed successfully!');
      return true;
    } else {
      console.error('✗ FAILED: Text extraction returned null');
      console.error('Check the logs above for detailed error messages');
      return false;
    }
  } catch (error: any) {
    console.error();
    console.error('✗ UNEXPECTED ERROR:', error.message);
    console.error(error.stack);
    return false;
  } finally {
    // Clean up browser resources
    console.log();
    console.log('Cleaning up browser resources...');
    await cleanupBrowser();
    console.log('✓ Cleanup complete');
  }
}

// Run the test
testHancomDocsWorkflow()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
