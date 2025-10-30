/**
 * NTIS Processor Worker (Phase 2: Processing Only)
 *
 * Purpose: Process downloaded NTIS announcements from scraping_jobs queue
 * Architecture: Multi-worker queue processor with atomic job locking
 *
 * What This Script Does:
 * 1. Polls scraping_jobs table for records with processingStatus='PENDING'
 * 2. Atomically locks jobs using SQL transactions (prevents duplicate processing)
 * 3. Reads attachment files from disk (/opt/connect/data/ntis-attachments/)
 * 4. Extracts text from HWP/PDF/HWPX files using LibreOffice
 * 5. Parses enhancement fields (budget, TRL, business structures) from text
 * 6. Classifies announcement type (R_D_PROJECT vs SURVEY/EVENT/NOTICE)
 * 7. Inserts parsed data into funding_programs table
 * 8. Updates scraping_jobs record: processingStatus='COMPLETED', links fundingProgramId
 * 9. Implements retry logic (max 3 attempts per job)
 *
 * Benefits:
 * - Horizontal scalability: Run multiple workers in parallel
 * - Fault tolerance: Failed jobs automatically retry
 * - Isolation: Each worker processes independent jobs
 * - Progress tracking: Real-time statistics per worker
 *
 * Usage:
 *   npx tsx scripts/scrape-ntis-processor.ts
 *   npx tsx scripts/scrape-ntis-processor.ts --workerId worker-1
 *   npx tsx scripts/scrape-ntis-processor.ts --maxJobs 50
 *   npx tsx scripts/scrape-ntis-processor.ts --dryRun
 *
 * Multi-Worker Setup:
 *   # Terminal 1
 *   npx tsx scripts/scrape-ntis-processor.ts --workerId worker-1
 *
 *   # Terminal 2
 *   npx tsx scripts/scrape-ntis-processor.ts --workerId worker-2
 *
 *   # Terminal 3
 *   npx tsx scripts/scrape-ntis-processor.ts --workerId worker-3
 */

import { db } from '@/lib/db';
import { AgencyId, ProcessingStatus, ScrapingStatus } from '@prisma/client';
import { extractTextFromAttachment } from '../lib/scraping/utils/attachment-parser';
import { classifyAnnouncement } from '../lib/scraping/classification';
import { parseKoreanDate, generateProgramHash } from '../lib/scraping/utils';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

// Import field extraction functions
import {
  extractBudget,
  extractEligibilityCriteria,
  extractBusinessStructures,
} from '../lib/scraping/parsers/ntis-announcement-parser';

// Import utility functions
import {
  determineTargetType,
  extractTRLRange,
} from '../lib/scraping/utils';

// Import TRL classifier
import { classifyTRL } from '../lib/matching/trl-classifier';

// Import agency mapping functions
import {
  extractCategoryFromMinistryAndAgency,
  getCombinedKeywords,
} from '../lib/scraping/parsers/agency-mapper';

// ================================================================
// HTML Parsing Utility
// ================================================================

/**
 * Convert HTML to plain text by stripping tags and normalizing whitespace
 */
function htmlToText(html: string): string {
  if (!html || html.trim().length === 0) return '';

  // Remove script and style tags and their contents
  let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ');
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');

  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, ' ');

  // Decode common HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–');

  // Normalize whitespace: collapse multiple spaces/newlines into single space
  text = text.replace(/\s+/g, ' ');

  return text.trim();
}

// ================================================================
// Configuration
// ================================================================

interface ProcessorConfig {
  workerId: string; // Unique worker identifier
  maxJobs: number | null; // Max jobs to process (null = unlimited)
  pollInterval: number; // Seconds between polling for new jobs
  maxRetries: number; // Max processing attempts per job
  dryRun: boolean; // Preview mode (no database writes)
}

interface ProcessingStats {
  workerId: string;
  startTime: number;
  totalProcessed: number;
  totalSuccess: number;
  totalFailed: number;
  totalSkipped: number;
  currentJob: string | null;
}

// ================================================================
// Main Function
// ================================================================

async function main() {
  // Parse command-line arguments
  const args = process.argv.slice(2);
  const config: ProcessorConfig = {
    workerId:
      getArgValue(args, '--workerId') || `worker-${os.hostname()}-${process.pid}`,
    maxJobs: getArgValue(args, '--maxJobs')
      ? parseInt(getArgValue(args, '--maxJobs')!, 10)
      : null,
    pollInterval: parseInt(getArgValue(args, '--pollInterval') || '5', 10),
    maxRetries: parseInt(getArgValue(args, '--maxRetries') || '3', 10),
    dryRun: args.includes('--dryRun') || args.includes('--dry-run'),
  };

  const stats: ProcessingStats = {
    workerId: config.workerId,
    startTime: Date.now(),
    totalProcessed: 0,
    totalSuccess: 0,
    totalFailed: 0,
    totalSkipped: 0,
    currentJob: null,
  };

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║         NTIS Processor Worker (Phase 2)                   ║');
  console.log('║         Processing Downloaded Announcements                ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  console.log(`🆔 Worker ID: ${config.workerId}`);
  console.log(`📊 Max Jobs: ${config.maxJobs || 'Unlimited'}`);
  console.log(`⏱️  Poll Interval: ${config.pollInterval} seconds`);
  console.log(`🔁 Max Retries: ${config.maxRetries}`);
  console.log(`🧪 Dry Run: ${config.dryRun ? 'ON (Preview only)' : 'OFF'}\n`);

  try {
    // Main processing loop
    while (true) {
      // Check if max jobs reached
      if (config.maxJobs !== null && stats.totalProcessed >= config.maxJobs) {
        console.log(`\n✅ Max jobs (${config.maxJobs}) reached - stopping worker`);
        break;
      }

      // Fetch and lock next pending job atomically
      const job = await fetchAndLockNextJob(config);

      if (!job) {
        // No jobs available - wait and poll again
        console.log(`⏸️  No pending jobs - waiting ${config.pollInterval}s...`);
        await sleep(config.pollInterval * 1000);
        continue;
      }

      stats.currentJob = job.announcementTitle;
      console.log(`\n${'='.repeat(70)}`);
      console.log(`🔧 Processing Job: ${job.id}`);
      console.log(`📄 Title: ${job.announcementTitle.substring(0, 60)}...`);
      console.log(`📁 Attachments: ${job.attachmentCount} files in ${path.basename(job.attachmentFolder)}`);
      console.log(`${'='.repeat(70)}`);

      try {
        // Process the job
        const result = await processJob(job, config);

        if (result.success) {
          stats.totalSuccess++;
          console.log(`   ✅ SUCCESS: Saved to funding_programs (ID: ${result.fundingProgramId})`);
        } else if (result.skipped) {
          stats.totalSkipped++;
          console.log(`   ⊘ SKIPPED: ${result.reason}`);
        } else {
          stats.totalFailed++;
          console.log(`   ❌ FAILED: ${result.error}`);
        }

        stats.totalProcessed++;
        stats.currentJob = null;

        // Print real-time stats
        printStats(stats);
      } catch (error: any) {
        console.error(`   ❌ FATAL ERROR processing job ${job.id}:`, error.message);
        stats.totalFailed++;
        stats.totalProcessed++;
        stats.currentJob = null;

        // Update job status to FAILED
        if (!config.dryRun) {
          await db.scraping_jobs.update({
            where: { id: job.id },
            data: {
              processingStatus: 'FAILED',
              processingError: `Fatal error: ${error.message}`,
              processingWorker: null,
            },
          });
        }
      }

      // Rate limiting between jobs (1 second)
      await sleep(1000);
    }

    // Final statistics
    const totalTime = ((Date.now() - stats.startTime) / 1000 / 60).toFixed(1);
    console.log('\n\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                   PROCESSING COMPLETE                      ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    console.log(`✅ Total Processed: ${stats.totalProcessed}`);
    console.log(`💾 Total Success: ${stats.totalSuccess}`);
    console.log(`⊘  Total Skipped: ${stats.totalSkipped} (non-R&D/duplicates)`);
    console.log(`❌ Total Failed: ${stats.totalFailed}`);
    console.log(`⏱️  Total Time: ${totalTime} minutes`);
    console.log(
      `⏱️  Avg Time per Job: ${stats.totalProcessed > 0 ? (parseFloat(totalTime) / stats.totalProcessed * 60).toFixed(1) : 0} seconds\n`
    );
  } catch (error: any) {
    console.error('\n❌ FATAL ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

// ================================================================
// Core Processing Functions
// ================================================================

/**
 * Fetch next pending job and lock it atomically using SQL transaction
 *
 * Atomic Locking Strategy:
 * 1. SELECT jobs WHERE processingStatus='PENDING' AND processingAttempts < maxRetries
 * 2. ORDER BY createdAt ASC (FIFO processing)
 * 3. LIMIT 1 FOR UPDATE SKIP LOCKED (PostgreSQL row-level locking)
 * 4. UPDATE processingStatus='PROCESSING', processingWorker={workerId}, processingStartedAt=NOW()
 * 5. Return locked job
 *
 * Benefits:
 * - No race conditions between multiple workers
 * - Each worker gets a unique job
 * - Failed jobs automatically retry
 */
async function fetchAndLockNextJob(config: ProcessorConfig): Promise<any | null> {
  if (config.dryRun) {
    // In dry-run mode, just fetch without locking
    const job = await db.scraping_jobs.findFirst({
      where: {
        scrapingStatus: 'SCRAPED',
        processingStatus: 'PENDING',
        processingAttempts: { lt: config.maxRetries },
      },
      orderBy: { createdAt: 'asc' },
    });
    return job;
  }

  // Use Prisma transaction for atomic lock
  try {
    const job = await db.$transaction(async (tx) => {
      // SELECT FOR UPDATE SKIP LOCKED (atomic row-level lock)
      const jobs = await tx.$queryRaw<any[]>`
        SELECT * FROM scraping_jobs
        WHERE "scrapingStatus" = 'SCRAPED'
          AND "processingStatus" = 'PENDING'
          AND "processingAttempts" < ${config.maxRetries}
        ORDER BY "createdAt" ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      `;

      if (jobs.length === 0) {
        return null;
      }

      const selectedJob = jobs[0];

      // Update to PROCESSING status (lock acquired)
      await tx.scraping_jobs.update({
        where: { id: selectedJob.id },
        data: {
          processingStatus: 'PROCESSING',
          processingWorker: config.workerId,
          processingStartedAt: new Date(),
          processingAttempts: { increment: 1 },
        },
      });

      return selectedJob;
    });

    return job;
  } catch (error: any) {
    console.error(`⚠️  Error fetching job: ${error.message}`);
    return null;
  }
}

/**
 * Process a single job: extract text, parse fields, classify, save to funding_programs
 */
async function processJob(
  job: any,
  config: ProcessorConfig
): Promise<{
  success: boolean;
  skipped?: boolean;
  reason?: string;
  error?: string;
  fundingProgramId?: string;
}> {
  try {
    // STEP 1: Parse raw detail page data
    const detailData = job.detailPageData as {
      title: string;
      ministry: string | null;
      announcingAgency: string | null;
      description: string | null;
      deadline: string | null;
      publishedAt: string | null;
      attachmentUrls: string[];
      rawHtml: string;
    };

    // STEP 2: Read and extract text from attachments
    let attachmentText = '';
    if (job.attachmentCount > 0 && job.attachmentFilenames.length > 0) {
      const attachmentTexts = await Promise.all(
        job.attachmentFilenames.map(async (filename: string) => {
          try {
            const filePath = path.join(job.attachmentFolder, filename);
            const fileBuffer = await fs.readFile(filePath);
            const extractedText = await extractTextFromAttachment(filename, fileBuffer);
            return extractedText || '';
          } catch (err: any) {
            console.warn(`   ⚠️  Failed to extract text from ${filename}: ${err.message}`);
            return '';
          }
        })
      );
      attachmentText = attachmentTexts.filter((t) => t).join('\n\n');
    }

    console.log(
      `   📄 Extracted ${attachmentText.length} characters from ${job.attachmentCount} attachments`
    );

    // STEP 3: Combine text sources for field extraction
    // Parse rawHtml to extract text (fallback when description is empty and no attachments)
    const rawHtmlText = detailData.rawHtml ? htmlToText(detailData.rawHtml) : '';

    // Priority: description > attachments > rawHtml
    const textSources = [
      detailData.description || '',
      attachmentText,
      rawHtmlText
    ].filter(t => t.trim().length > 0);

    const combinedText = textSources.join('\n\n');

    console.log(
      `   📝 Combined text: description=${detailData.description?.length || 0} chars, ` +
      `attachments=${attachmentText.length} chars, rawHtml=${rawHtmlText.length} chars, ` +
      `total=${combinedText.length} chars`
    );

    // STEP 4: Classify announcement type (skip non-R&D)
    // IMPORTANT: Use job.announcementTitle (from list page) instead of detailData.title (generic page header)
    // and combinedText (includes attachments + rawHtml) for comprehensive survey detection
    const announcementType = classifyAnnouncement({
      title: job.announcementTitle,
      description: combinedText,
      url: job.announcementUrl,
      source: 'ntis',
    });

    if (announcementType !== 'R_D_PROJECT') {
      // Mark as skipped, not failed
      if (!config.dryRun) {
        await db.scraping_jobs.update({
          where: { id: job.id },
          data: {
            processingStatus: 'SKIPPED',
            processingError: `Non-R&D announcement type: ${announcementType}`,
            processingWorker: null,
          },
        });
      }
      return { success: false, skipped: true, reason: `Non-R&D (${announcementType})` };
    }

    // STEP 5: Extract enhancement fields from combined text
    const budgetAmount = extractBudget(combinedText);
    const targetType = determineTargetType(combinedText);
    const trlRange = extractTRLRange(combinedText);
    const eligibilityCriteria = extractEligibilityCriteria(combinedText);
    const allowedBusinessStructures = extractBusinessStructures(combinedText);

    // STEP 6: Classify TRL stage and keywords
    let trlClassification = null;
    if (trlRange) {
      try {
        trlClassification = classifyTRL(trlRange.minTRL, trlRange.maxTRL);
      } catch (error) {
        console.warn(`   ⚠️  Failed to classify TRL ${trlRange.minTRL}-${trlRange.maxTRL}`);
      }
    }

    // STEP 7: Extract category and keywords from ministry/agency
    const categoryResult = extractCategoryFromMinistryAndAgency(
      detailData.ministry,
      detailData.announcingAgency
    );
    const keywords = getCombinedKeywords(detailData.ministry, detailData.announcingAgency);

    // STEP 8: Parse dates
    const deadline = detailData.deadline ? parseKoreanDate(detailData.deadline) : null;
    const publishedAt = detailData.publishedAt
      ? parseKoreanDate(detailData.publishedAt)
      : null;

    // STEP 9: Determine status (ACTIVE vs EXPIRED)
    const status = deadline && deadline < new Date() ? 'EXPIRED' : 'ACTIVE';

    // STEP 10: Generate content hash for deduplication
    const contentHash = generateProgramHash({
      agencyId: 'NTIS',
      title: detailData.title,
      announcementUrl: job.announcementUrl,
    });

    // STEP 11: Check for duplicates in funding_programs
    if (!config.dryRun) {
      const existingProgram = await db.funding_programs.findFirst({
        where: { contentHash },
      });

      if (existingProgram) {
        // Mark job as completed but link to existing program
        await db.scraping_jobs.update({
          where: { id: job.id },
          data: {
            processingStatus: 'COMPLETED',
            fundingProgramId: existingProgram.id,
            processedAt: new Date(),
            processingWorker: null,
          },
        });
        return {
          success: false,
          skipped: true,
          reason: 'Duplicate program (already exists)',
        };
      }
    }

    // STEP 12: Save to funding_programs table
    let fundingProgramId: string | undefined;

    if (!config.dryRun) {
      const targetTypeArray =
        targetType === 'BOTH'
          ? ['COMPANY' as const, 'RESEARCH_INSTITUTE' as const]
          : targetType === 'COMPANY'
          ? ['COMPANY' as const]
          : targetType === 'RESEARCH_INSTITUTE'
          ? ['RESEARCH_INSTITUTE' as const]
          : ['COMPANY' as const, 'RESEARCH_INSTITUTE' as const];

      const fundingProgram = await db.funding_programs.create({
        data: {
          agencyId: 'NTIS' as AgencyId,
          title: detailData.title,
          description: combinedText || null,
          announcementUrl: job.announcementUrl,
          deadline: deadline || null,
          budgetAmount: budgetAmount || null,
          targetType: targetTypeArray,
          minTrl: trlRange?.minTRL || null,
          maxTrl: trlRange?.maxTRL || null,
          eligibilityCriteria: eligibilityCriteria || undefined,
          publishedAt: publishedAt || null,
          ministry: detailData.ministry || null,
          announcingAgency: detailData.announcingAgency || null,
          category: categoryResult.category || null,
          keywords: keywords || [],
          contentHash,
          scrapedAt: new Date(),
          scrapingSource: 'ntis',
          status,
          announcementType, // From classification (always R_D_PROJECT at this point due to line 409 check)
          // Phase 2 Enhancement Fields
          allowedBusinessStructures: allowedBusinessStructures || [],
          attachmentUrls: detailData.attachmentUrls || [],
          trlInferred: trlRange ? trlRange.confidence === 'inferred' : false,
          trlClassification: trlClassification || undefined,
        },
      });

      fundingProgramId = fundingProgram.id;

      // STEP 13: Update scraping_jobs record to COMPLETED and link funding program
      await db.scraping_jobs.update({
        where: { id: job.id },
        data: {
          processingStatus: 'COMPLETED',
          fundingProgramId: fundingProgram.id,
          processedAt: new Date(),
          processingWorker: null,
          processingError: null,
        },
      });
    }

    return { success: true, fundingProgramId };
  } catch (error: any) {
    console.error(`   ❌ Processing error: ${error.message}`);

    // Update job with error (will retry if attempts < maxRetries)
    if (!config.dryRun) {
      const shouldRetry = job.processingAttempts < config.maxRetries;
      await db.scraping_jobs.update({
        where: { id: job.id },
        data: {
          processingStatus: shouldRetry ? 'PENDING' : 'FAILED',
          processingError: error.message,
          processingWorker: null,
        },
      });
    }

    return { success: false, error: error.message };
  }
}

// ================================================================
// Helper Functions
// ================================================================

/**
 * Print real-time processing statistics
 */
function printStats(stats: ProcessingStats): void {
  const elapsed = ((Date.now() - stats.startTime) / 1000 / 60).toFixed(1);
  const rate =
    stats.totalProcessed > 0
      ? (stats.totalProcessed / parseFloat(elapsed)).toFixed(1)
      : '0.0';

  console.log(`\n   📊 Stats [${stats.workerId}]: ${stats.totalProcessed} processed | ${stats.totalSuccess} success | ${stats.totalSkipped} skipped | ${stats.totalFailed} failed | ${elapsed} min | ${rate} jobs/min`);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Parse command-line argument value
 */
function getArgValue(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index !== -1 && index + 1 < args.length) {
    return args[index + 1];
  }
  return undefined;
}

// ================================================================
// Run Script
// ================================================================

main();
