#!/usr/bin/env tsx
/**
 * HWP Text Extraction Diagnostic Script
 *
 * Purpose: Debug why the process worker failed to extract text from a specific HWP file
 * despite marking the job as COMPLETED.
 *
 * Usage:
 *   NODE_ENV=development npx tsx scripts/test-hwp-extraction-debug.ts <hwp-file-path>
 *
 * Example:
 *   NODE_ENV=development npx tsx scripts/test-hwp-extraction-debug.ts \
 *     "data/scraper/scraper/ntis-attachments/.../announcement-290/붙임1. 25-1차....hwp"
 */

import * as fs from 'fs';
import * as path from 'path';
import { extractTextFromAttachment } from '../lib/scraping/utils/attachment-parser';

async function main() {
  const targetFile = process.argv[2];

  if (!targetFile) {
    console.error('❌ Error: Please provide HWP file path as argument');
    console.error('Usage: npx tsx scripts/test-hwp-extraction-debug.ts <hwp-file-path>');
    process.exit(1);
  }

  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('HWP TEXT EXTRACTION DIAGNOSTIC');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('');
  console.log(`Target file: ${targetFile}`);
  console.log('');

  // Check file existence
  if (!fs.existsSync(targetFile)) {
    console.error(`❌ File not found: ${targetFile}`);
    process.exit(1);
  }

  const stats = fs.statSync(targetFile);
  const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

  console.log('───────────────────────────────────────────────────────────────────────');
  console.log('FILE INFORMATION');
  console.log('───────────────────────────────────────────────────────────────────────');
  console.log(`File name:    ${path.basename(targetFile)}`);
  console.log(`File size:    ${fileSizeMB} MB (${stats.size.toLocaleString()} bytes)`);
  console.log(`File exists:  ✅ Yes`);
  console.log(`Permissions:  ✅ Readable`);
  console.log('');

  // Read file buffer
  console.log('───────────────────────────────────────────────────────────────────────');
  console.log('EXTRACTION TEST');
  console.log('───────────────────────────────────────────────────────────────────────');
  console.log('');

  let fileBuffer: Buffer;
  try {
    fileBuffer = fs.readFileSync(targetFile);
    console.log(`✓ File buffer loaded: ${fileBuffer.length.toLocaleString()} bytes`);
  } catch (error: any) {
    console.error(`❌ Failed to read file buffer: ${error.message}`);
    process.exit(1);
  }

  // Extract text using the same function as the process worker
  console.log('');
  console.log('Starting text extraction (same logic as process worker)...');
  console.log('');

  const startTime = Date.now();
  let extractedText: string | null = null;

  try {
    extractedText = await extractTextFromAttachment(path.basename(targetFile), fileBuffer);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('');
    console.log('───────────────────────────────────────────────────────────────────────');
    console.log('EXTRACTION RESULTS');
    console.log('───────────────────────────────────────────────────────────────────────');

    if (extractedText && extractedText.length > 0) {
      console.log(`✅ SUCCESS: Extracted ${extractedText.length.toLocaleString()} characters`);
      console.log(`⏱️  Duration: ${duration} seconds`);
      console.log('');
      console.log('───────────────────────────────────────────────────────────────────────');
      console.log('TEXT PREVIEW (First 500 characters)');
      console.log('───────────────────────────────────────────────────────────────────────');
      console.log(extractedText.substring(0, 500));
      console.log('');
      console.log('[... remainder truncated ...]');
      console.log('');
    } else {
      console.log(`❌ FAILURE: Extraction returned ${extractedText === null ? 'NULL' : 'empty string'}`);
      console.log(`⏱️  Duration: ${duration} seconds`);
      console.log('');
      console.log('───────────────────────────────────────────────────────────────────────');
      console.log('POSSIBLE CAUSES');
      console.log('───────────────────────────────────────────────────────────────────────');
      console.log('1. File is encrypted/password-protected');
      console.log('2. File is legacy HWP 3.0 format (pre-2010)');
      console.log('3. File is corrupted or not a valid HWP file');
      console.log('4. pyhwp extraction failed AND Hancom Tesseract OCR fallback failed');
      console.log('5. File contains only images (no extractable text)');
      console.log('');
      console.log('Check console output above for detailed error messages from:');
      console.log('  - [ATTACHMENT-PARSER] pyhwp extraction logs');
      console.log('  - [HANCOM-TESSERACT] fallback OCR logs');
      console.log('');
    }

    console.log('═══════════════════════════════════════════════════════════════════════');
    console.log('DIAGNOSTIC COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════════════');
  } catch (error: any) {
    console.error('');
    console.error('❌ UNEXPECTED ERROR during extraction:');
    console.error(error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
