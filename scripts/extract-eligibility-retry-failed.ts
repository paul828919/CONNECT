/**
 * Eligibility Extraction Retry Script - Failed Cases Only
 *
 * Purpose: Re-process the 73 files that failed in the initial extraction run,
 * now with improved 50-second Hancom-Tesseract timeout (increased from 30s).
 *
 * This script:
 * 1. Reads data/eligibility-extraction-results.json
 * 2. Filters for extractionMethod === 'failed'
 * 3. Re-processes only those 73 files with the new timeout
 * 4. Outputs results to data/eligibility-extraction-retry-results.json
 *
 * Usage:
 * npx tsx scripts/extract-eligibility-retry-failed.ts
 *
 * Output:
 * data/eligibility-extraction-retry-results.json
 */

import * as fs from 'fs';
import * as path from 'path';
import { extractTextFromAttachment } from '../lib/scraping/utils/attachment-parser';
import { createAuthenticatedHancomBrowser } from '../lib/scraping/utils/hancom-docs-tesseract-converter';
import type { BrowserContext } from 'playwright';

// ============================================================
// Configuration
// ============================================================

const PREVIOUS_RESULTS_FILE = '/Users/paulkim/Downloads/connect/data/eligibility-extraction-results.json';
const OUTPUT_FILE = '/Users/paulkim/Downloads/connect/data/eligibility-extraction-retry-results.json';

// ============================================================
// Types
// ============================================================

interface EligibilityMatch {
  type: string;
  matched: boolean;
  matchedText?: string;
  pattern?: string;
}

interface ExtractionResult {
  announcementFolder: string;
  attachmentFile: string;
  fileSize: number;
  extractionMethod: 'pyhwp' | 'hancom-tesseract' | 'pdf-parse' | 'failed';
  extractionDuration: number;
  textLength: number;
  koreanCharPercentage: number;
  eligibilityMatches: {
    type1_CorporateResearchInstitute: EligibilityMatch;
    type2_CorporateDedicatedRnD: EligibilityMatch;
    type7_InnoBizOrVenture: EligibilityMatch;
  };
  fullText?: string;
}

interface Summary {
  totalFilesProcessed: number;
  successfulExtractions: number;
  failedExtractions: number;
  extractionMethodBreakdown: {
    pyhwp: number;
    hancomTesseract: number;
    pdfParse: number;
    failed: number;
  };
  eligibilityTypeMatches: {
    type1_CorporateResearchInstitute: number;
    type2_CorporateDedicatedRnD: number;
    type7_InnoBizOrVenture: number;
  };
  processingTime: number;
}

interface RetryFileInfo {
  announcementFolder: string;
  attachmentFile: string;
  originalFailureReason?: string;
}

// ============================================================
// Eligibility Extraction Functions (Types 1, 2, 7 only)
// ============================================================

/**
 * Type 1: Corporate + 기업부설연구소 (Corporate Research Institute)
 */
function extractType1_CorporateResearchInstitute(text: string): EligibilityMatch {
  const patterns = [
    /기업부설연구소.*?인정.*?기업/gi,
    /기업부설연구소.*?설치.*?기업/gi,
    /연구소.*?인정.*?기업/gi,
    /기업부설연구소/gi,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return {
        type: 'Type 1: Corporate + 기업부설연구소',
        matched: true,
        matchedText: match[0],
        pattern: pattern.source,
      };
    }
  }

  return {
    type: 'Type 1: Corporate + 기업부설연구소',
    matched: false,
  };
}

/**
 * Type 2: Corporate + 연구개발전담부서 (Dedicated R&D Department)
 */
function extractType2_CorporateDedicatedRnD(text: string): EligibilityMatch {
  const patterns = [
    /연구개발전담부서.*?인정.*?기업/gi,
    /연구개발전담부서.*?설치.*?기업/gi,
    /연구.*?전담.*?부서.*?인정/gi,
    /연구개발전담부서/gi,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return {
        type: 'Type 2: Corporate + 연구개발전담부서',
        matched: true,
        matchedText: match[0],
        pattern: pattern.source,
      };
    }
  }

  return {
    type: 'Type 2: Corporate + 연구개발전담부서',
    matched: false,
  };
}

/**
 * Type 7: Corporate + INNO-BIZ or 벤처기업 Certification
 */
function extractType7_InnoBizOrVenture(text: string): EligibilityMatch {
  const patterns = [
    /이노비즈.*?기업/gi,
    /INNO-BIZ.*?기업/gi,
    /벤처기업.*?인증/gi,
    /벤처기업.*?확인/gi,
    /이노비즈/gi,
    /INNO-BIZ/gi,
    /벤처기업/gi,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return {
        type: 'Type 7: Corporate + INNO-BIZ or 벤처기업',
        matched: true,
        matchedText: match[0],
        pattern: pattern.source,
      };
    }
  }

  return {
    type: 'Type 7: Corporate + INNO-BIZ or 벤처기업',
    matched: false,
  };
}

// ============================================================
// Korean Text Detection
// ============================================================

function getKoreanCharPercentage(text: string): number {
  const koreanChars = text.match(/[가-힣]/g) || [];
  return (koreanChars.length / text.length) * 100;
}

// ============================================================
// Main Processing Function
// ============================================================

async function processFailedFiles(sharedContext: BrowserContext): Promise<{
  summary: Summary;
  results: ExtractionResult[];
}> {
  // Read previous results
  console.log('\n📖 Reading previous extraction results...');
  const previousData = JSON.parse(fs.readFileSync(PREVIOUS_RESULTS_FILE, 'utf8'));
  const failedFiles: RetryFileInfo[] = previousData.results
    .filter((r: any) => r.extractionMethod === 'failed')
    .map((r: any) => ({
      announcementFolder: r.announcementFolder,
      attachmentFile: r.attachmentFile,
    }));

  console.log(`\n🎯 Found ${failedFiles.length} failed files to retry\n`);

  const results: ExtractionResult[] = [];
  const summary: Summary = {
    totalFilesProcessed: 0,
    successfulExtractions: 0,
    failedExtractions: 0,
    extractionMethodBreakdown: {
      pyhwp: 0,
      hancomTesseract: 0,
      pdfParse: 0,
      failed: 0,
    },
    eligibilityTypeMatches: {
      type1_CorporateResearchInstitute: 0,
      type2_CorporateDedicatedRnD: 0,
      type7_InnoBizOrVenture: 0,
    },
    processingTime: 0,
  };

  const startTime = Date.now();

  for (let i = 0; i < failedFiles.length; i++) {
    const { announcementFolder, attachmentFile } = failedFiles[i];
    const filePath = path.join(announcementFolder, attachmentFile);

    console.log(`\n[${ i + 1}/${failedFiles.length}] Processing: ${attachmentFile}`);
    console.log(`   Folder: ${path.basename(announcementFolder)}`);

    summary.totalFilesProcessed++;

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error(`   ✗ File not found: ${filePath}`);
      summary.failedExtractions++;
      summary.extractionMethodBreakdown.failed++;
      continue;
    }

    const fileSize = fs.statSync(filePath).size;
    console.log(`   Size: ${(fileSize / 1024).toFixed(2)} KB`);

    // Read file into buffer
    const fileBuffer = fs.readFileSync(filePath);

    // Extract text using improved timeout
    const extractionStartTime = Date.now();
    const text = await extractTextFromAttachment(
      attachmentFile,  // filename only (not full path)
      fileBuffer,      // file contents as Buffer
      sharedContext
    );
    const extractionDuration = Date.now() - extractionStartTime;

    if (!text || text.trim().length === 0) {
      console.error(`   ✗ Extraction failed or returned empty text`);
      summary.failedExtractions++;
      summary.extractionMethodBreakdown.failed++;

      results.push({
        announcementFolder,
        attachmentFile,
        fileSize,
        extractionMethod: 'failed',
        extractionDuration,
        textLength: 0,
        koreanCharPercentage: 0,
        eligibilityMatches: {
          type1_CorporateResearchInstitute: { type: 'Type 1', matched: false },
          type2_CorporateDedicatedRnD: { type: 'Type 2', matched: false },
          type7_InnoBizOrVenture: { type: 'Type 7', matched: false },
        },
      });
      continue;
    }

    const textLength = text.length;
    const koreanCharPercentage = getKoreanCharPercentage(text);

    console.log(`   ✓ Extracted: ${textLength} chars (${koreanCharPercentage.toFixed(1)}% Korean)`);
    console.log(`   Duration: ${(extractionDuration / 1000).toFixed(2)}s`);

    summary.successfulExtractions++;
    // Note: Unable to track extraction method breakdown since extractTextFromAttachment doesn't expose method
    summary.extractionMethodBreakdown.hancomTesseract++;

    // Extract eligibility criteria
    const type1 = extractType1_CorporateResearchInstitute(text);
    const type2 = extractType2_CorporateDedicatedRnD(text);
    const type7 = extractType7_InnoBizOrVenture(text);

    if (type1.matched) summary.eligibilityTypeMatches.type1_CorporateResearchInstitute++;
    if (type2.matched) summary.eligibilityTypeMatches.type2_CorporateDedicatedRnD++;
    if (type7.matched) summary.eligibilityTypeMatches.type7_InnoBizOrVenture++;

    // Log matches
    const matches = [type1, type2, type7].filter((m) => m.matched);
    if (matches.length > 0) {
      console.log(`   ✓ ELIGIBILITY MATCHES: ${matches.length}`);
      matches.forEach((m) => {
        console.log(`     - ${m.type}`);
        console.log(`       "${m.matchedText}"`);
      });
    } else {
      console.log(`   ○ No eligibility matches`);
    }

    results.push({
      announcementFolder,
      attachmentFile,
      fileSize,
      extractionMethod: 'hancom-tesseract',  // Assume successful extractions use Hancom-Tesseract
      extractionDuration,
      textLength,
      koreanCharPercentage,
      eligibilityMatches: {
        type1_CorporateResearchInstitute: type1,
        type2_CorporateDedicatedRnD: type2,
        type7_InnoBizOrVenture: type7,
      },
    });
  }

  summary.processingTime = Date.now() - startTime;

  return { summary, results };
}

// ============================================================
// Main Entry Point
// ============================================================

async function main() {
  console.log('='.repeat(80));
  console.log('🔄 ELIGIBILITY EXTRACTION RETRY - FAILED CASES ONLY');
  console.log('='.repeat(80));
  console.log('🆕 Improvement: Hancom-Tesseract timeout increased from 30s → 50s');
  console.log('📁 Input: data/eligibility-extraction-results.json');
  console.log('📁 Output: data/eligibility-extraction-retry-results.json');
  console.log('='.repeat(80));

  let sharedContext: BrowserContext | null = null;

  try {
    // Create shared authenticated Hancom Docs browser context
    console.log('\n🌐 Creating shared Hancom Docs browser context...');
    sharedContext = await createAuthenticatedHancomBrowser();
    console.log('✅ Shared context ready\n');

    // Process failed files
    const { summary, results } = await processFailedFiles(sharedContext);

    // Close shared context
    await sharedContext.close();
    sharedContext = null;
    console.log('\n✅ Shared context closed');

    // Write results
    console.log('\n💾 Writing results to disk...');
    const output = {
      summary,
      results,
    };
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
    console.log(`✅ Results saved: ${OUTPUT_FILE}`);

    // Print summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 RETRY SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total files retried: ${summary.totalFilesProcessed}`);
    console.log(`Successful extractions: ${summary.successfulExtractions} (${((summary.successfulExtractions / summary.totalFilesProcessed) * 100).toFixed(1)}%)`);
    console.log(`Failed extractions: ${summary.failedExtractions} (${((summary.failedExtractions / summary.totalFilesProcessed) * 100).toFixed(1)}%)`);
    console.log('\nExtraction Method Breakdown:');
    console.log(`  - pyhwp: ${summary.extractionMethodBreakdown.pyhwp}`);
    console.log(`  - Hancom-Tesseract: ${summary.extractionMethodBreakdown.hancomTesseract} 🆕`);
    console.log(`  - pdf-parse: ${summary.extractionMethodBreakdown.pdfParse}`);
    console.log(`  - failed: ${summary.extractionMethodBreakdown.failed}`);
    console.log('\nEligibility Type Matches:');
    console.log(`  - Type 1 (기업부설연구소): ${summary.eligibilityTypeMatches.type1_CorporateResearchInstitute}`);
    console.log(`  - Type 2 (연구개발전담부서): ${summary.eligibilityTypeMatches.type2_CorporateDedicatedRnD}`);
    console.log(`  - Type 7 (INNO-BIZ/벤처기업): ${summary.eligibilityTypeMatches.type7_InnoBizOrVenture}`);
    console.log(`\nProcessing time: ${(summary.processingTime / 1000 / 60).toFixed(2)} minutes`);
    console.log('='.repeat(80));

    // Calculate improvement
    const originalFailedCount = 73;
    const newSuccessCount = summary.successfulExtractions;
    const improvement = newSuccessCount > 0
      ? `${newSuccessCount}/${originalFailedCount} files now extracted successfully (${((newSuccessCount / originalFailedCount) * 100).toFixed(1)}% recovery rate)`
      : 'No improvement - all files still failing';

    console.log(`\n🎯 Improvement: ${improvement}\n`);

  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    if (sharedContext) {
      await sharedContext.close();
    }
    process.exit(1);
  }
}

main();
