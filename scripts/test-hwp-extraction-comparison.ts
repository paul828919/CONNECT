/**
 * HWP Text Extraction Quality Comparison Test
 *
 * Purpose:
 * Compare two methods of extracting text from Korean HWP files:
 * - Method A: Current (Hancom Docs web upload → Screenshot → Tesseract OCR)
 * - Method B: Proposed (hwp5tools native XML extraction)
 *
 * Test Strategy:
 * 1. Sample 10 real NTIS jobs from scraping_jobs (mix of completed/pending)
 * 2. Extract text from HWP attachments using BOTH methods
 * 3. Apply identical parsing logic (budget, deadline, TRL, keywords)
 * 4. Generate quality comparison report:
 *    - Character corruption rate
 *    - Field extraction accuracy
 *    - Processing time comparison
 *    - Text completeness
 * 5. Save extracted text samples for manual review
 *
 * User Decision Criteria:
 * - If hwp5tools shows <5% field extraction error vs current method → ADOPT
 * - If hwp5tools shows 5-15% error → INVESTIGATE corrections
 * - If hwp5tools shows >15% error → KEEP current method
 *
 * Usage:
 *   npx tsx scripts/test-hwp-extraction-comparison.ts
 *   npx tsx scripts/test-hwp-extraction-comparison.ts --sampleSize 20
 *   npx tsx scripts/test-hwp-extraction-comparison.ts --dateRange "2025-01-01 to 2025-03-31"
 */

import { db } from '@/lib/db';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { convertHWPViaHancomTesseract, createAuthenticatedHancomBrowser } from '@/lib/scraping/utils/hancom-docs-tesseract-converter';
import { extractBudget, extractBusinessStructures, extractEligibilityCriteria } from '@/lib/scraping/parsers/ntis-announcement-parser';
import { extractTRLRange } from '@/lib/scraping/utils';
import type { Browser } from 'playwright';

const execAsync = promisify(exec);

// CLI Arguments
const args = process.argv.slice(2);
function getArgValue(args: string[], key: string): string | null {
  const index = args.indexOf(key);
  return index !== -1 && index + 1 < args.length ? args[index + 1] : null;
}

const SAMPLE_SIZE = parseInt(getArgValue(args, '--sampleSize') || '10', 10);
const DATE_RANGE = getArgValue(args, '--dateRange');

// Output directory for test results
const TEST_OUTPUT_DIR = path.join(process.cwd(), 'test-results', 'hwp-extraction-comparison');

// Statistics
interface MethodStats {
  totalFiles: number;
  successCount: number;
  failureCount: number;
  totalTime: number;
  avgTimePerFile: number;
  totalCharacters: number;
  avgCharactersPerFile: number;
}

interface FieldComparison {
  field: string;
  hancomValue: any;
  hwp5Value: any;
  match: boolean;
  notes: string;
}

interface FileComparison {
  fileName: string;
  jobId: string;
  jobTitle: string;
  hancomMethod: {
    success: boolean;
    extractedText: string;
    extractedChars: number;
    processingTime: number;
    error?: string;
  };
  hwp5Method: {
    success: boolean;
    extractedText: string;
    extractedChars: number;
    processingTime: number;
    error?: string;
  };
  fieldComparisons: FieldComparison[];
  overallAccuracy: number; // Percentage of matching fields
}

/**
 * Extract text from HWP using hwp5tools (Python library)
 * HWP files are just zipped XML documents, no OCR needed!
 */
async function extractTextViaHwp5(hwpBuffer: Buffer, fileName: string): Promise<string | null> {
  let tempHwpPath: string | null = null;

  try {
    console.log(`[HWP5] Extracting text from ${fileName}...`);

    // Save buffer to temp file
    const tempDir = os.tmpdir();
    tempHwpPath = path.join(tempDir, `hwp5-test-${Date.now()}-${fileName}`);
    fs.writeFileSync(tempHwpPath, hwpBuffer);

    // Extract text using hwp5txt command-line tool from pyhwp
    // Note: pyhwp must be installed: pip3 install pyhwp
    const { stdout, stderr } = await execAsync(
      `hwp5txt "${tempHwpPath}"`,
      { maxBuffer: 10 * 1024 * 1024 } // 10MB buffer
    );

    if (stderr && stderr.includes('Error')) {
      console.error(`[HWP5] hwp5txt error: ${stderr}`);
      return null;
    }

    const text = stdout.trim();
    console.log(`[HWP5] ✓ Extracted ${text.length} characters`);

    return text;
  } catch (error: any) {
    console.error(`[HWP5] ✗ Failed to extract text:`, error.message);
    return null;
  } finally {
    // Cleanup
    if (tempHwpPath && fs.existsSync(tempHwpPath)) {
      fs.unlinkSync(tempHwpPath);
    }
  }
}

/**
 * Compare extracted text and parsed fields between two methods
 */
function compareExtractions(
  hancomText: string,
  hwp5Text: string,
  jobTitle: string
): FieldComparison[] {
  const comparisons: FieldComparison[] = [];

  // 1. Budget Amount
  const hancomBudget = extractBudget(hancomText);
  const hwp5Budget = extractBudget(hwp5Text);
  comparisons.push({
    field: 'budget',
    hancomValue: hancomBudget,
    hwp5Value: hwp5Budget,
    match: hancomBudget === hwp5Budget,
    notes: hancomBudget !== hwp5Budget
      ? `Hancom: ${hancomBudget?.toLocaleString() || 'NULL'} vs hwp5: ${hwp5Budget?.toLocaleString() || 'NULL'}`
      : 'Match',
  });

  // 2. TRL Range
  const hancomTRL = extractTRLRange(hancomText);
  const hwp5TRL = extractTRLRange(hwp5Text);
  const trlMatch =
    hancomTRL?.minTRL === hwp5TRL?.minTRL &&
    hancomTRL?.maxTRL === hwp5TRL?.maxTRL;
  comparisons.push({
    field: 'trlRange',
    hancomValue: hancomTRL ? `${hancomTRL.minTRL}-${hancomTRL.maxTRL}` : null,
    hwp5Value: hwp5TRL ? `${hwp5TRL.minTRL}-${hwp5TRL.maxTRL}` : null,
    match: trlMatch,
    notes: !trlMatch
      ? `Hancom: ${hancomTRL ? `${hancomTRL.minTRL}-${hancomTRL.maxTRL}` : 'NULL'} vs hwp5: ${hwp5TRL ? `${hwp5TRL.minTRL}-${hwp5TRL.maxTRL}` : 'NULL'}`
      : 'Match',
  });

  // 3. Business Structures
  const hancomStructures = extractBusinessStructures(hancomText);
  const hwp5Structures = extractBusinessStructures(hwp5Text);
  const structuresMatch = JSON.stringify(hancomStructures) === JSON.stringify(hwp5Structures);
  comparisons.push({
    field: 'businessStructures',
    hancomValue: hancomStructures,
    hwp5Value: hwp5Structures,
    match: structuresMatch,
    notes: !structuresMatch
      ? `Hancom: ${JSON.stringify(hancomStructures)} vs hwp5: ${JSON.stringify(hwp5Structures)}`
      : 'Match',
  });

  // 4. Eligibility Criteria
  const hancomEligibility = extractEligibilityCriteria(hancomText);
  const hwp5Eligibility = extractEligibilityCriteria(hwp5Text);
  const eligibilityMatch = JSON.stringify(hancomEligibility) === JSON.stringify(hwp5Eligibility);
  comparisons.push({
    field: 'eligibility',
    hancomValue: hancomEligibility,
    hwp5Value: hwp5Eligibility,
    match: eligibilityMatch,
    notes: !eligibilityMatch
      ? `Hancom: ${JSON.stringify(hancomEligibility)} vs hwp5: ${JSON.stringify(hwp5Eligibility)}`
      : 'Match',
  });

  return comparisons;
}

/**
 * Calculate character-level similarity between two texts
 * Uses simple Levenshtein distance approximation
 */
function calculateTextSimilarity(text1: string, text2: string): number {
  const len1 = text1.length;
  const len2 = text2.length;

  // Handle empty strings
  if (len1 === 0 || len2 === 0) {
    return 0;
  }

  // Calculate how much of the shorter text appears in the longer text
  const shorter = len1 < len2 ? text1 : text2;
  const longer = len1 < len2 ? text2 : text1;

  // Count matching characters in sequence
  let matchCount = 0;
  let lastIndex = 0;

  for (const char of shorter) {
    const index = longer.indexOf(char, lastIndex);
    if (index !== -1) {
      matchCount++;
      lastIndex = index + 1;
    }
  }

  return (matchCount / shorter.length) * 100;
}

/**
 * Main test execution
 */
async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║      HWP Text Extraction Quality Comparison Test              ║');
  console.log('║      Hancom Docs + Tesseract vs hwp5tools Native              ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  console.log(`📋 Test Configuration:`);
  console.log(`   Sample Size: ${SAMPLE_SIZE} jobs`);
  console.log(`   Date Range: ${DATE_RANGE || 'All dates'}`);
  console.log(`   Output Directory: ${TEST_OUTPUT_DIR}`);
  console.log('');

  // Create output directory
  if (!fs.existsSync(TEST_OUTPUT_DIR)) {
    fs.mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
  }

  // 1. Sample jobs from database
  console.log('🔍 Step 1: Sampling jobs from scraping_jobs...\n');

  const whereClause: any = {
    scrapingStatus: 'SCRAPED',
    attachmentFilenames: {
      isEmpty: false, // Has at least one attachment
    },
  };

  if (DATE_RANGE) {
    whereClause.dateRange = DATE_RANGE;
  }

  const jobs = await db.scraping_jobs.findMany({
    where: whereClause,
    select: {
      id: true,
      announcementTitle: true,
      attachmentFolder: true,
      attachmentFilenames: true,
      dateRange: true,
      processingStatus: true,
    },
    take: SAMPLE_SIZE,
    orderBy: {
      scrapedAt: 'desc',
    },
  });

  console.log(`✓ Sampled ${jobs.length} jobs\n`);

  if (jobs.length === 0) {
    console.log('❌ No jobs found matching criteria. Exiting.');
    return;
  }

  // 2. Create shared browser for Hancom Docs (reduces logins from N to 1)
  console.log('🌐 Step 2: Creating shared browser session for Hancom Docs...\n');
  let sharedBrowser: Browser | null = null;
  try {
    sharedBrowser = await createAuthenticatedHancomBrowser();
    console.log('✓ Browser authenticated\n');
  } catch (error: any) {
    console.error('❌ Failed to create browser:', error.message);
    console.error('   Continuing without browser (Hancom method will fail)\n');
  }

  // 3. Process each job
  console.log('⚙️  Step 3: Processing HWP files...\n');

  const hancomStats: MethodStats = {
    totalFiles: 0,
    successCount: 0,
    failureCount: 0,
    totalTime: 0,
    avgTimePerFile: 0,
    totalCharacters: 0,
    avgCharactersPerFile: 0,
  };

  const hwp5Stats: MethodStats = {
    totalFiles: 0,
    successCount: 0,
    failureCount: 0,
    totalTime: 0,
    avgTimePerFile: 0,
    totalCharacters: 0,
    avgCharactersPerFile: 0,
  };

  const fileComparisons: FileComparison[] = [];

  for (const job of jobs) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📄 Job: ${job.announcementTitle.substring(0, 60)}...`);
    console.log(`   ID: ${job.id}`);
    console.log(`   Attachments: ${job.attachmentFilenames.length} files`);
    console.log(`   Folder: ${job.attachmentFolder}`);
    console.log(`${'='.repeat(80)}\n`);

    // Find HWP files
    const hwpFiles = job.attachmentFilenames.filter((f: string) =>
      f.toLowerCase().endsWith('.hwp')
    );

    if (hwpFiles.length === 0) {
      console.log('⏭️  No HWP files, skipping...\n');
      continue;
    }

    console.log(`   Processing ${hwpFiles.length} HWP file(s)...\n`);

    for (const fileName of hwpFiles) {
      // attachmentFolder already contains full absolute path
      const filePath = path.join(job.attachmentFolder, fileName);

      if (!fs.existsSync(filePath)) {
        console.log(`   ⚠️  File not found: ${fileName}`);
        continue;
      }

      const fileBuffer = fs.readFileSync(filePath);
      console.log(`   📎 ${fileName} (${(fileBuffer.length / 1024).toFixed(2)} KB)\n`);

      // Method A: Hancom Docs + Tesseract
      console.log(`   🔄 Method A: Hancom Docs + Tesseract OCR`);
      const hancomStart = Date.now();
      let hancomText: string | null = null;
      let hancomError: string | undefined;

      try {
        if (sharedBrowser) {
          hancomText = await convertHWPViaHancomTesseract(fileBuffer, fileName, sharedBrowser);
        } else {
          hancomError = 'No browser available';
        }
      } catch (error: any) {
        hancomError = error.message;
      }

      const hancomTime = (Date.now() - hancomStart) / 1000;

      if (hancomText) {
        hancomStats.successCount++;
        hancomStats.totalCharacters += hancomText.length;
        console.log(`      ✓ Success: ${hancomText.length} chars in ${hancomTime.toFixed(2)}s`);
      } else {
        hancomStats.failureCount++;
        console.log(`      ✗ Failed: ${hancomError || 'Unknown error'}`);
      }

      hancomStats.totalFiles++;
      hancomStats.totalTime += hancomTime;

      // Method B: hwp5tools
      console.log(`   🔄 Method B: hwp5tools Native Extraction`);
      const hwp5Start = Date.now();
      let hwp5Text: string | null = null;
      let hwp5Error: string | undefined;

      try {
        hwp5Text = await extractTextViaHwp5(fileBuffer, fileName);
      } catch (error: any) {
        hwp5Error = error.message;
      }

      const hwp5Time = (Date.now() - hwp5Start) / 1000;

      if (hwp5Text) {
        hwp5Stats.successCount++;
        hwp5Stats.totalCharacters += hwp5Text.length;
        console.log(`      ✓ Success: ${hwp5Text.length} chars in ${hwp5Time.toFixed(2)}s`);
      } else {
        hwp5Stats.failureCount++;
        console.log(`      ✗ Failed: ${hwp5Error || 'Unknown error'}`);
      }

      hwp5Stats.totalFiles++;
      hwp5Stats.totalTime += hwp5Time;

      // Compare methods
      if (hancomText && hwp5Text) {
        console.log(`   📊 Comparison:`);

        // Character-level comparison
        const textSimilarity = calculateTextSimilarity(hancomText, hwp5Text);
        console.log(`      Text Similarity: ${textSimilarity.toFixed(1)}%`);
        console.log(`      Speed Improvement: ${(hancomTime / hwp5Time).toFixed(1)}x faster`);

        // Field extraction comparison
        const fieldComparisons = compareExtractions(hancomText, hwp5Text, job.announcementTitle);
        const matchCount = fieldComparisons.filter(f => f.match).length;
        const accuracy = (matchCount / fieldComparisons.length) * 100;

        console.log(`      Field Accuracy: ${accuracy.toFixed(1)}% (${matchCount}/${fieldComparisons.length} fields match)`);

        for (const comp of fieldComparisons) {
          if (!comp.match) {
            console.log(`         ❌ ${comp.field}: ${comp.notes}`);
          }
        }

        // Save to results
        fileComparisons.push({
          fileName,
          jobId: job.id,
          jobTitle: job.announcementTitle,
          hancomMethod: {
            success: true,
            extractedText: hancomText.substring(0, 2000), // Save first 2000 chars
            extractedChars: hancomText.length,
            processingTime: hancomTime,
          },
          hwp5Method: {
            success: true,
            extractedText: hwp5Text.substring(0, 2000), // Save first 2000 chars
            extractedChars: hwp5Text.length,
            processingTime: hwp5Time,
          },
          fieldComparisons,
          overallAccuracy: accuracy,
        });

        // Save full extracted texts to disk for manual review
        const sampleDir = path.join(TEST_OUTPUT_DIR, 'text-samples', job.id);
        if (!fs.existsSync(sampleDir)) {
          fs.mkdirSync(sampleDir, { recursive: true });
        }

        fs.writeFileSync(
          path.join(sampleDir, `${fileName}.hancom.txt`),
          hancomText,
          'utf-8'
        );

        fs.writeFileSync(
          path.join(sampleDir, `${fileName}.hwp5.txt`),
          hwp5Text,
          'utf-8'
        );
      }
    }
  }

  // Close browser
  if (sharedBrowser) {
    await sharedBrowser.close();
    console.log('\n✓ Browser closed\n');
  }

  // 4. Calculate final statistics
  hancomStats.avgTimePerFile = hancomStats.totalFiles > 0
    ? hancomStats.totalTime / hancomStats.totalFiles
    : 0;

  hancomStats.avgCharactersPerFile = hancomStats.successCount > 0
    ? hancomStats.totalCharacters / hancomStats.successCount
    : 0;

  hwp5Stats.avgTimePerFile = hwp5Stats.totalFiles > 0
    ? hwp5Stats.totalTime / hwp5Stats.totalFiles
    : 0;

  hwp5Stats.avgCharactersPerFile = hwp5Stats.successCount > 0
    ? hwp5Stats.totalCharacters / hwp5Stats.successCount
    : 0;

  // 5. Generate report
  console.log('\n\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                     COMPARISON REPORT                          ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  console.log('📊 Method A: Hancom Docs + Tesseract OCR');
  console.log('━'.repeat(80));
  console.log(`   Total Files:          ${hancomStats.totalFiles}`);
  console.log(`   Success:              ${hancomStats.successCount} (${((hancomStats.successCount / hancomStats.totalFiles) * 100).toFixed(1)}%)`);
  console.log(`   Failure:              ${hancomStats.failureCount} (${((hancomStats.failureCount / hancomStats.totalFiles) * 100).toFixed(1)}%)`);
  console.log(`   Total Time:           ${hancomStats.totalTime.toFixed(2)}s`);
  console.log(`   Avg Time Per File:    ${hancomStats.avgTimePerFile.toFixed(2)}s`);
  console.log(`   Avg Characters:       ${hancomStats.avgCharactersPerFile.toFixed(0)} chars\n`);

  console.log('📊 Method B: hwp5tools Native Extraction');
  console.log('━'.repeat(80));
  console.log(`   Total Files:          ${hwp5Stats.totalFiles}`);
  console.log(`   Success:              ${hwp5Stats.successCount} (${((hwp5Stats.successCount / hwp5Stats.totalFiles) * 100).toFixed(1)}%)`);
  console.log(`   Failure:              ${hwp5Stats.failureCount} (${((hwp5Stats.failureCount / hwp5Stats.totalFiles) * 100).toFixed(1)}%)`);
  console.log(`   Total Time:           ${hwp5Stats.totalTime.toFixed(2)}s`);
  console.log(`   Avg Time Per File:    ${hwp5Stats.avgTimePerFile.toFixed(2)}s`);
  console.log(`   Avg Characters:       ${hwp5Stats.avgCharactersPerFile.toFixed(0)} chars\n`);

  console.log('⚡ Performance Comparison');
  console.log('━'.repeat(80));
  if (hancomStats.avgTimePerFile > 0 && hwp5Stats.avgTimePerFile > 0) {
    const speedup = hancomStats.avgTimePerFile / hwp5Stats.avgTimePerFile;
    console.log(`   Speed Improvement:    ${speedup.toFixed(1)}x faster with hwp5tools`);
    console.log(`   Time Savings:         ${(hancomStats.avgTimePerFile - hwp5Stats.avgTimePerFile).toFixed(2)}s per file\n`);
  }

  console.log('🎯 Field Extraction Accuracy');
  console.log('━'.repeat(80));
  if (fileComparisons.length > 0) {
    const avgAccuracy = fileComparisons.reduce((sum, f) => sum + f.overallAccuracy, 0) / fileComparisons.length;
    const perfectMatches = fileComparisons.filter(f => f.overallAccuracy === 100).length;

    console.log(`   Average Accuracy:     ${avgAccuracy.toFixed(1)}%`);
    console.log(`   Perfect Matches:      ${perfectMatches}/${fileComparisons.length} files (${((perfectMatches / fileComparisons.length) * 100).toFixed(1)}%)`);

    // Field-by-field breakdown
    const fieldStats = new Map<string, { total: number; matches: number }>();

    for (const file of fileComparisons) {
      for (const field of file.fieldComparisons) {
        if (!fieldStats.has(field.field)) {
          fieldStats.set(field.field, { total: 0, matches: 0 });
        }
        const stats = fieldStats.get(field.field)!;
        stats.total++;
        if (field.match) stats.matches++;
      }
    }

    console.log('\n   Field-by-Field Accuracy:');
    for (const [field, stats] of fieldStats.entries()) {
      const accuracy = (stats.matches / stats.total) * 100;
      console.log(`      ${field.padEnd(20)} ${accuracy.toFixed(1)}% (${stats.matches}/${stats.total})`);
    }
  }

  console.log('\n');

  // 6. Save JSON report
  const reportPath = path.join(TEST_OUTPUT_DIR, 'comparison-report.json');
  const report = {
    testConfig: {
      sampleSize: SAMPLE_SIZE,
      dateRange: DATE_RANGE,
      timestamp: new Date().toISOString(),
    },
    stats: {
      hancom: hancomStats,
      hwp5: hwp5Stats,
    },
    fileComparisons,
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`💾 Full report saved to: ${reportPath}`);
  console.log(`📁 Text samples saved to: ${path.join(TEST_OUTPUT_DIR, 'text-samples')}\n`);

  // 7. Provide recommendation
  console.log('━'.repeat(80));
  console.log('🎓 RECOMMENDATION');
  console.log('━'.repeat(80));

  if (fileComparisons.length === 0) {
    console.log('⚠️  Cannot provide recommendation - no successful extractions to compare');
  } else {
    const avgAccuracy = fileComparisons.reduce((sum, f) => sum + f.overallAccuracy, 0) / fileComparisons.length;
    const speedup = hancomStats.avgTimePerFile / hwp5Stats.avgTimePerFile;

    if (avgAccuracy >= 95) {
      console.log(`✅ ADOPT hwp5tools`);
      console.log(`   - Field accuracy: ${avgAccuracy.toFixed(1)}% (excellent)`);
      console.log(`   - Speed: ${speedup.toFixed(1)}x faster`);
      console.log(`   - No OCR errors, direct XML parsing`);
      console.log(`   - Production ready`);
    } else if (avgAccuracy >= 85) {
      console.log(`⚠️  INVESTIGATE hwp5tools with corrections`);
      console.log(`   - Field accuracy: ${avgAccuracy.toFixed(1)}% (good, minor issues)`);
      console.log(`   - Speed: ${speedup.toFixed(1)}x faster`);
      console.log(`   - Review field extraction patterns`);
      console.log(`   - May need post-processing corrections`);
    } else {
      console.log(`❌ KEEP current method (Hancom Docs + Tesseract)`);
      console.log(`   - Field accuracy: ${avgAccuracy.toFixed(1)}% (too low)`);
      console.log(`   - hwp5tools needs significant improvements`);
      console.log(`   - Current method more reliable despite being slower`);
    }
  }

  console.log('━'.repeat(80));
  console.log('\n✅ Test complete!\n');

  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
