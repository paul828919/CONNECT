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
 * 4. Extracts text from HWP/PDF/HWPX files using pyhwp and Hancom Tesseract OCR
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
 * - Graceful termination: Auto-exits after idle timeout (prevents resource accumulation)
 *
 * Usage:
 *   npx tsx scripts/scrape-ntis-processor.ts
 *   npx tsx scripts/scrape-ntis-processor.ts --workerId worker-1
 *   npx tsx scripts/scrape-ntis-processor.ts --maxJobs 50
 *   npx tsx scripts/scrape-ntis-processor.ts --dateRange "2025-07-01 to 2025-07-10"
 *   npx tsx scripts/scrape-ntis-processor.ts --maxIdlePolls 5 --pollInterval 10
 *   npx tsx scripts/scrape-ntis-processor.ts --dryRun
 *
 * Date Range Filtering (NEW):
 *   # Process only jobs from a specific Discovery Scraper run
 *   npx tsx scripts/scrape-ntis-processor.ts --dateRange "2025-07-01 to 2025-07-10" --maxJobs 50
 *
 * Multi-Worker Setup:
 *   # Terminal 1
 *   npx tsx scripts/scrape-ntis-processor.ts --workerId worker-1 --dateRange "2025-07-01 to 2025-07-10"
 *
 *   # Terminal 2
 *   npx tsx scripts/scrape-ntis-processor.ts --workerId worker-2 --dateRange "2025-07-01 to 2025-07-10"
 *
 *   # Terminal 3
 *   npx tsx scripts/scrape-ntis-processor.ts --workerId worker-3 --dateRange "2025-07-01 to 2025-07-10"
 *
 * Idle Timeout (Graceful Termination):
 *   Workers automatically exit when no jobs remain to prevent resource accumulation.
 *   Default: Exit after 16 consecutive "no jobs" polls (80 seconds with 5s poll interval).
 *
 *   Problem Solved:
 *   - Before: Scheduled workers (10 AM, 4 PM daily) ran indefinitely → 14+ workers after 7 days
 *   - After: Workers auto-terminate when idle → Only 1 active worker at a time
 *
 *   Custom Configuration:
 *   # For exactly 180 seconds idle timeout (16 polls × 11s)
 *   npx tsx scripts/scrape-ntis-processor.ts --maxIdlePolls 16 --pollInterval 11
 *
 *   # Exit after 5 empty polls (50 seconds idle with 10s poll interval)
 *   npx tsx scripts/scrape-ntis-processor.ts --maxIdlePolls 5 --pollInterval 10
 *
 *   # Disable idle timeout (process indefinitely until manual stop)
 *   npx tsx scripts/scrape-ntis-processor.ts --maxIdlePolls 999999
 */

import { db } from '@/lib/db';
import { AgencyId, ProcessingStatus, ScrapingStatus } from '@prisma/client';
import { extractTextFromAttachment } from '../lib/scraping/utils/attachment-parser';
import { classifyAnnouncement } from '../lib/scraping/classification';
import { parseKoreanDate, generateProgramHash } from '../lib/scraping/utils';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import type { Browser } from 'playwright';
import { createAuthenticatedHancomBrowser } from '../lib/scraping/utils/hancom-docs-tesseract-converter';

// Import two-tier extraction system
import { TwoTierExtractor } from '../lib/scraping/two-tier-extractor';

// Import eligibility extraction with database integration
import { extractAndSaveEligibility } from '../lib/scraping/eligibility-extractor';
import { ExtractionLogger } from '../lib/scraping/extraction-logger';
import { filterAnnouncementFiles } from '../lib/scraping/announcement-file-filter';

// Import utility functions
import { determineTargetType } from '../lib/scraping/utils';

// Import TRL classifier
import { classifyTRL } from '../lib/matching/trl-classifier';

// Import agency mapping functions
import {
  extractCategoryFromMinistryAndAgency,
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

/**
 * Sanitize Unicode characters for PostgreSQL JSON storage
 * Removes lone UTF-16 surrogates that cause "lone leading surrogate" errors
 *
 * @param obj - Any JSON-serializable object
 * @returns Sanitized copy of the object safe for PostgreSQL
 */
function sanitizeUnicodeForPostgres(obj: any): any {
  if (typeof obj === 'string') {
    // Use TextEncoder/TextDecoder for proper UTF-16 → UTF-8 conversion
    // TextEncoder automatically replaces lone surrogates (0xD800-0xDFFF) with U+FFFD (�)
    // during encoding, ensuring PostgreSQL receives only valid UTF-8 sequences

    try {
      // Step 1: Encode JavaScript UTF-16 string to UTF-8 bytes
      // Invalid UTF-16 sequences (lone surrogates) are replaced with U+FFFD (�) during encoding
      const encoder = new TextEncoder();
      const utf8Bytes = encoder.encode(obj);

      // Step 2: Decode UTF-8 bytes back to JavaScript UTF-16 string
      // This ensures the string contains only valid UTF-8 sequences
      const decoder = new TextDecoder('utf-8', { fatal: false }); // fatal: false means replace invalid sequences
      let sanitized = decoder.decode(utf8Bytes);

      // Step 3: Remove control characters that are valid UTF-8 but cause PostgreSQL JSON issues
      // eslint-disable-next-line no-control-regex
      sanitized = sanitized.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

      // Step 4: Remove the replacement character (�) if it was inserted
      // This prevents "�" from appearing in the database
      sanitized = sanitized.replace(/\uFFFD/g, '');

      // Step 5: Verify the result is valid JSON-serializable
      JSON.stringify({ test: sanitized });

      return sanitized;
    } catch (e) {
      // Fallback: If encoding fails, use aggressive character filtering
      console.warn('   ⚠️  TextEncoder/TextDecoder sanitization failed, using fallback filtering');
      return obj.replace(/[^\u0020-\u007E\u00A0-\uD7FF\uE000-\uFFFD]/g, '');
    }
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeUnicodeForPostgres(item));
  }

  // Preserve Date objects (don't convert to plain objects)
  if (obj instanceof Date) {
    return obj;
  }

  if (obj !== null && typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        sanitized[key] = sanitizeUnicodeForPostgres(obj[key]);
      }
    }
    return sanitized;
  }

  return obj;
}

/**
 * Extract deadline from NTIS raw HTML text using comprehensive synonym matching
 * NTIS format: "마감일 : 2025.10.24" or "신청마감일 : 2025.10.31"
 *
 * Strategy:
 * 1. Try all deadline synonyms (마감일, 신청마감일, 접수마감일, etc.)
 * 2. Support multiple date formats (YYYY.MM.DD, YYYY-MM-DD, YYYY년 MM월 DD일)
 * 3. Return first valid match
 *
 * @param rawText - Plain text converted from rawHtml
 * @returns Parsed Date object or null
 */
function extractDeadlineFromRawHtml(rawText: string): Date | null {
  if (!rawText || rawText.trim().length === 0) return null;

  // Comprehensive deadline synonyms (from ntis-announcement-parser.ts)
  const deadlineSynonyms = [
    '마감일',
    '신청마감일',
    '지원마감일',
    '모집마감일',
    '접수마감일',
    '신청기한',
    '접수기한',
    '제출마감',
  ];

  // Try each synonym with date pattern matching
  for (const synonym of deadlineSynonyms) {
    // Pattern: "마감일 : 2025.10.31" or "마감일 : 2025-10-31" or "마감일 : 2025년 10월 31일"
    // Support both dot and dash separators, plus Korean date format
    const patterns = [
      new RegExp(`${synonym}\\s*:\\s*(\\d{4}[.-]\\d{1,2}[.-]\\d{1,2})`, 'i'),
      new RegExp(`${synonym}\\s*:\\s*(\\d{4}년\\s*\\d{1,2}월\\s*\\d{1,2}일)`, 'i'),
    ];

    for (const pattern of patterns) {
      const match = rawText.match(pattern);
      if (match && match[1]) {
        const parsed = parseKoreanDate(match[1]);
        if (parsed) {
          console.log(`   ✓ Extracted deadline: ${match[1]} → ${parsed.toISOString().split('T')[0]} (synonym: ${synonym})`);
          return parsed;
        }
      }
    }
  }

  return null;
}

/**
 * Extract publishedAt (공고일) from NTIS raw HTML text
 * NTIS format: "공고일 : 2025.10.20" or "공고일 : 2025-10-20"
 *
 * Strategy:
 * 1. Match pattern "공고일 : YYYY.MM.DD" or "공고일 : YYYY-MM-DD"
 * 2. Validate date is not in the future (sanity check)
 * 3. Return parsed Date object
 *
 * @param rawText - Plain text converted from rawHtml
 * @returns Parsed Date object or null
 */
function extractPublishedAtFromRawHtml(rawText: string): Date | null {
  if (!rawText || rawText.trim().length === 0) return null;

  // Pattern: "공고일 : 2025.10.20" or "공고일 : 2025-10-20"
  const patterns = [
    /공고일\s*:\s*(\d{4}[.-]\d{1,2}[.-]\d{1,2})/i,
    /공고일\s*:\s*(\d{4}년\s*\d{1,2}월\s*\d{1,2}일)/i,
  ];

  for (const pattern of patterns) {
    const match = rawText.match(pattern);
    if (match && match[1]) {
      const parsed = parseKoreanDate(match[1]);

      // Only return if date is valid and not in the future (sanity check)
      if (parsed && parsed <= new Date()) {
        console.log(`   ✓ Extracted publishedAt: ${match[1]} → ${parsed.toISOString().split('T')[0]}`);
        return parsed;
      }
    }
  }

  return null;
}

/**
 * Extract applicationStart (접수일/신청일) from NTIS raw HTML text
 * NTIS format: "접수일 : 2025.10.27" or "신청일 : 2025.10.20"
 *
 * Strategy:
 * 1. Try all application start synonyms (접수일, 신청일, 모집일, 접수시작일, 신청시작일)
 * 2. Support multiple date formats (YYYY.MM.DD, YYYY-MM-DD, YYYY년 MM월 DD일)
 * 3. Return first valid match
 *
 * @param rawText - Plain text converted from rawHtml
 * @returns Parsed Date object or null
 */
function extractApplicationStartFromRawHtml(rawText: string): Date | null {
  if (!rawText || rawText.trim().length === 0) return null;

  // Comprehensive application start synonyms
  const applicationStartSynonyms = [
    '접수일',
    '신청일',
    '모집일',
    '접수시작일',
    '신청시작일',
  ];

  // Try each synonym with date pattern matching
  for (const synonym of applicationStartSynonyms) {
    // Pattern: "접수일 : 2025.10.27" or "접수일 : 2025-10-27" or "접수일 : 2025년 10월 27일"
    const patterns = [
      new RegExp(`${synonym}\\s*:\\s*(\\d{4}[.-]\\d{1,2}[.-]\\d{1,2})`, 'i'),
      new RegExp(`${synonym}\\s*:\\s*(\\d{4}년\\s*\\d{1,2}월\\s*\\d{1,2}일)`, 'i'),
    ];

    for (const pattern of patterns) {
      const match = rawText.match(pattern);
      if (match && match[1]) {
        const parsed = parseKoreanDate(match[1]);

        // Only return if date is valid and not in the future (sanity check)
        if (parsed && parsed <= new Date()) {
          console.log(`   ✓ Extracted applicationStart: ${match[1]} → ${parsed.toISOString().split('T')[0]} (synonym: ${synonym})`);
          return parsed;
        }
      }
    }
  }

  return null;
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
  dateRange: string | null; // Filter jobs by specific date range (e.g., "2025-07-01 to 2025-07-10")
  maxIdlePolls: number; // Exit after N consecutive "no jobs" polls (prevents infinite waiting)
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
    dateRange: getArgValue(args, '--dateRange') || null,
    maxIdlePolls: parseInt(getArgValue(args, '--maxIdlePolls') || '16', 10), // Exit after 16 empty polls by default
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
  console.log(`📅 Date Range Filter: ${config.dateRange || 'All jobs (no filter)'}`);
  console.log(`⏱️  Poll Interval: ${config.pollInterval} seconds`);
  console.log(`⏰ Idle Timeout: ${config.maxIdlePolls} empty polls (${config.maxIdlePolls * config.pollInterval}s total)`);
  console.log(`🔁 Max Retries: ${config.maxRetries}`);
  console.log(`🧪 Dry Run: ${config.dryRun ? 'ON (Preview only)' : 'OFF'}\n`);

  // ================================================================
  // Worker-Level Browser Session (Reused Across All Jobs)
  // ================================================================

  // Create ONE authenticated browser per worker (not per job)
  // This prevents simultaneous login attempts when running multiple workers
  let workerBrowser: Browser | null = null;

  // ================================================================
  // Graceful Shutdown Handlers (Zero Runtime Overhead)
  // ================================================================

  let isShuttingDown = false;

  process.on('SIGTERM', async () => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log('\n⚠️  Received SIGTERM - gracefully shutting down...');
    console.log(`📊 Final Stats: ${stats.totalProcessed} processed (${stats.totalSuccess} success, ${stats.totalFailed} failed, ${stats.totalSkipped} skipped)`);
    console.log('💾 Current job will be released back to queue');

    // Cleanup browser session
    if (workerBrowser) {
      try {
        await workerBrowser.close();
        console.log('🌐 Worker browser closed');
      } catch (err) {
        console.warn('⚠️  Failed to close worker browser:', err);
      }
    }

    await db.$disconnect();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log('\n⚠️  Received SIGINT (Ctrl+C) - gracefully shutting down...');
    console.log(`📊 Final Stats: ${stats.totalProcessed} processed (${stats.totalSuccess} success, ${stats.totalFailed} failed, ${stats.totalSkipped} skipped)`);
    console.log('💾 Current job will be released back to queue');

    // Cleanup browser session
    if (workerBrowser) {
      try {
        await workerBrowser.close();
        console.log('🌐 Worker browser closed');
      } catch (err) {
        console.warn('⚠️  Failed to close worker browser:', err);
      }
    }

    await db.$disconnect();
    process.exit(0);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('\n❌ Unhandled Promise Rejection:', reason);
    console.error('   Promise:', promise);
    console.error(`   Current job: ${stats.currentJob || 'none'}`);
    db.$disconnect().finally(() => process.exit(1));
  });

  try {
    // ================================================================
    // Initialize Worker Browser (if needed)
    // ================================================================

    // Check if any jobs in the queue have HWP files that would require browser
    // We'll create the browser lazily on first HWP file encounter to avoid
    // unnecessary browser creation for workers processing only PDF files
    console.log('🔍 Worker initialized - browser will be created on first HWP file encounter\n');

    // Track consecutive "no jobs" polls for idle timeout
    let consecutiveEmptyPolls = 0;

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
        consecutiveEmptyPolls++;
        const totalIdleTime = consecutiveEmptyPolls * config.pollInterval;
        console.log(
          `⏸️  No pending jobs - waiting ${config.pollInterval}s... ` +
          `(${consecutiveEmptyPolls}/${config.maxIdlePolls} empty polls, ${totalIdleTime}s idle)`
        );

        // Exit if idle timeout reached
        if (consecutiveEmptyPolls >= config.maxIdlePolls) {
          console.log(
            `\n✅ No jobs found after ${config.maxIdlePolls} consecutive polls (${totalIdleTime}s idle) - stopping worker gracefully`
          );
          break;
        }

        await sleep(config.pollInterval * 1000);
        continue;
      }

      // Reset counter when job is found
      consecutiveEmptyPolls = 0;
      stats.currentJob = job.announcementTitle;
      console.log(`\n${'='.repeat(70)}`);
      console.log(`🔧 Processing Job: ${job.id}`);
      console.log(`📄 Title: ${job.announcementTitle.substring(0, 60)}...`);
      console.log(`📁 Attachments: ${job.attachmentCount} files in ${path.basename(job.attachmentFolder)}`);
      console.log(`${'='.repeat(70)}`);

      try {
        // Process the job (passing worker browser for reuse)
        // Worker browser may be created lazily on first HWP file encounter
        const result = await processJob(job, config, workerBrowser);

        // Update worker browser reference if it was created during this job
        if (result.updatedBrowser !== undefined) {
          workerBrowser = result.updatedBrowser;
        }

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
    // Cleanup browser session
    if (workerBrowser) {
      try {
        await workerBrowser.close();
        console.log('🌐 Worker browser closed');
      } catch (err) {
        console.warn('⚠️  Failed to close worker browser:', err);
      }
    }

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
        ...(config.dateRange ? { dateRange: config.dateRange } : {}),
      },
      orderBy: { createdAt: 'asc' },
    });
    return job;
  }

  // Use Prisma transaction for atomic lock
  try {
    const job = await db.$transaction(async (tx) => {
      // SELECT FOR UPDATE SKIP LOCKED (atomic row-level lock)
      // Dynamic query based on whether dateRange filter is provided
      const jobs = config.dateRange
        ? await tx.$queryRaw<any[]>`
            SELECT * FROM scraping_jobs
            WHERE "scrapingStatus" = 'SCRAPED'
              AND "processingStatus" = 'PENDING'
              AND "processingAttempts" < ${config.maxRetries}
              AND "dateRange" = ${config.dateRange}
            ORDER BY "createdAt" ASC
            LIMIT 1
            FOR UPDATE SKIP LOCKED
          `
        : await tx.$queryRaw<any[]>`
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
 *
 * @param job - Scraping job to process
 * @param config - Worker configuration
 * @param workerBrowser - Mutable reference to worker's browser session (created lazily on first HWP file)
 */
async function processJob(
  job: any,
  config: ProcessorConfig,
  workerBrowser: Browser | null
): Promise<{
  success: boolean;
  skipped?: boolean;
  reason?: string;
  error?: string;
  fundingProgramId?: string;
  updatedBrowser?: Browser | null; // Return updated browser reference
}> {
  try {
    // STEP 1: Initialize browser session if needed (lazy initialization)
    const hwpFileCount = job.attachmentFilenames.filter((f: string) =>
      f.toLowerCase().endsWith('.hwp')
    ).length;

    if (hwpFileCount > 0 && !workerBrowser) {
      console.log(`   🌐 Creating worker browser session for ${hwpFileCount} HWP file(s)...`);
      console.log(`   [HANCOM-BROWSER] Logging in once per worker - this session will be reused for all jobs`);
      workerBrowser = await createAuthenticatedHancomBrowser();
      console.log(`   ✓ Worker browser ready - will be reused for remaining jobs`);
    }

    // STEP 2: Parse raw detail page data
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

    // STEP 2: Separate announcement files from other attachments
    const announcementFilenames = filterAnnouncementFiles(job.attachmentFilenames);
    const otherFilenames = job.attachmentFilenames.filter(
      (f) => !announcementFilenames.includes(f)
    );

    console.log(
      `   📄 Attachment breakdown: ${announcementFilenames.length} announcement files, ` +
      `${otherFilenames.length} other files (total: ${job.attachmentCount})`
    );

    // ⚠️ SPECIAL CASE: Handle programs with no attachments
    // These programs require manual verification of the announcement page
    if (job.attachmentCount === 0) {
      console.log('   ⚠️  No attachments available - creating manual review record');

      // Use only detail page data for classification (no attachment text available)
      const rawHtmlText = detailData.rawHtml ? htmlToText(detailData.rawHtml) : '';
      const detailPageOnlyText = [detailData.description || '', rawHtmlText]
        .filter((t) => t.trim().length > 0)
        .join('\n\n');

      // Classify announcement type using only detail page content
      const announcementType = classifyAnnouncement({
        title: job.announcementTitle,
        description: detailPageOnlyText,
        url: job.announcementUrl,
        source: 'ntis',
      });

      // Skip non-R&D announcements
      if (announcementType !== 'R_D_PROJECT') {
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
        return { success: false, skipped: true, reason: `Non-R&D (${announcementType})`, updatedBrowser: workerBrowser };
      }

      // Extract category from ministry/agency
      const categoryResult = extractCategoryFromMinistryAndAgency(
        detailData.ministry,
        detailData.announcingAgency,
        detailData.title || job.announcementTitle
      );

      // Determine deadline and status
      const deadline = detailData.deadline ? new Date(detailData.deadline) : null;
      const status = deadline && deadline < new Date() ? 'EXPIRED' : 'ACTIVE';

      // Generate content hash for deduplication
      const contentHash = generateProgramHash({
        agencyId: 'NTIS',
        title: detailData.title,
        announcementUrl: job.announcementUrl,
      });

      // Check for duplicates
      if (!config.dryRun) {
        const existingProgram = await db.funding_programs.findFirst({
          where: { contentHash },
        });

        if (existingProgram) {
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
            updatedBrowser: workerBrowser,
          };
        }

        // Create funding program with manual review required
        const fundingProgram = await db.funding_programs.create({
          data: {
            agencyId: 'NTIS' as AgencyId,
            title: job.announcementTitle,
            description: '공고문 확인 필요 (Announcement Verification Required)',
            announcementUrl: job.announcementUrl,
            deadline: deadline,
            ministry: detailData.ministry || null,
            announcingAgency: detailData.announcingAgency || null,
            category: categoryResult.category || null,
            keywords: categoryResult.keywords || [],
            contentHash,
            scrapedAt: new Date(),
            scrapingSource: 'ntis',
            status,
            announcementType,
            attachmentUrls: detailData.attachmentUrls || [],
            targetType: ['COMPANY', 'RESEARCH_INSTITUTE'],
            manualReviewRequired: true,
            manualReviewNotes: '첨부파일 없음 - 공고문 페이지에서 직접 확인 필요',
            publishedAt: detailData.publishedAt ? new Date(detailData.publishedAt) : null,
          },
        });

        // Update scraping job to COMPLETED
        await db.scraping_jobs.update({
          where: { id: job.id },
          data: {
            processingStatus: 'COMPLETED',
            fundingProgramId: fundingProgram.id,
            processedAt: new Date(),
            processingWorker: null,
          },
        });

        console.log(`   ✓ Created manual review record (ID: ${fundingProgram.id})`);
        return {
          success: true,
          fundingProgramId: fundingProgram.id,
          updatedBrowser: workerBrowser,
        };
      } else {
        console.log('   [DRY RUN] Would create manual review record');
        return { success: true, updatedBrowser: workerBrowser };
      }
    }

    // STEP 3: Extract text from announcement files (priority source)
    const announcementFiles: Array<{ filename: string; text: string }> = [];
    if (announcementFilenames.length > 0) {
      const results = await Promise.all(
        announcementFilenames.map(async (filename: string) => {
          try {
            const filePath = path.join(job.attachmentFolder, filename);
            const fileBuffer = await fs.readFile(filePath);
            const extractedText = await extractTextFromAttachment(filename, fileBuffer, workerBrowser || undefined);
            return { filename, text: extractedText || '' };
          } catch (err: any) {
            console.warn(`   ⚠️  Failed to extract text from ${filename}: ${err.message}`);
            return { filename, text: '' };
          }
        })
      );
      announcementFiles.push(...results.filter((r) => r.text.length > 0));
    }

    // STEP 4: Extract text from other files (for reference)
    const otherFiles: Array<{ filename: string; text: string }> = [];
    if (otherFilenames.length > 0) {
      const results = await Promise.all(
        otherFilenames.map(async (filename: string) => {
          try {
            const filePath = path.join(job.attachmentFolder, filename);
            const fileBuffer = await fs.readFile(filePath);
            const extractedText = await extractTextFromAttachment(filename, fileBuffer, workerBrowser || undefined);
            return { filename, text: extractedText || '' };
          } catch (err: any) {
            console.warn(`   ⚠️  Failed to extract text from ${filename}: ${err.message}`);
            return { filename, text: '' };
          }
        })
      );
      otherFiles.push(...results.filter((r) => r.text.length > 0));
    }

    const totalAnnouncementChars = announcementFiles.reduce((sum, f) => sum + f.text.length, 0);
    const totalOtherChars = otherFiles.reduce((sum, f) => sum + f.text.length, 0);

    console.log(
      `   📝 Extracted text: ${totalAnnouncementChars} chars from announcement files, ` +
      `${totalOtherChars} chars from other files`
    );

    // STEP 4.5: Update detailPageData.attachmentUrls with extracted text
    // This saves the extracted text to the database for debugging and verification
    const updatedAttachments = (detailData.attachmentUrls || []).map((att: any) => {
      const extracted = [...announcementFiles, ...otherFiles].find(
        (f) => f.filename === att.filename
      );
      return {
        ...att,
        text: extracted?.text || null, // Add text field
      };
    });

    // Update detailPageData with enriched attachments
    const updatedDetailPageData = {
      ...detailData,
      attachments: updatedAttachments,
    };

    // Save updated detailPageData back to database immediately (before processing)
    // Sanitize Unicode to prevent "lone leading surrogate" errors in PostgreSQL
    if (!config.dryRun) {
      const sanitizedDetailPageData = sanitizeUnicodeForPostgres(updatedDetailPageData);
      await db.scraping_jobs.update({
        where: { id: job.id },
        data: {
          detailPageData: sanitizedDetailPageData as any,
        },
      });
      console.log(
        `   💾 Saved extracted text to database (${updatedAttachments.filter((a: any) => a.text).length}/${updatedAttachments.length} attachments)`
      );
    }

    // STEP 5: Combine all text for announcement type classification only
    // Note: Field extraction will use TwoTierExtractor with priority fallback
    const rawHtmlText = detailData.rawHtml ? htmlToText(detailData.rawHtml) : '';
    const allAttachmentText = [...announcementFiles, ...otherFiles]
      .map((f) => f.text)
      .join('\n\n');
    const combinedText = [detailData.description || '', allAttachmentText, rawHtmlText]
      .filter((t) => t.trim().length > 0)
      .join('\n\n');

    // STEP 6: Classify announcement type (skip non-R&D)
    // IMPORTANT: Use job.announcementTitle (from list page) instead of detailData.title (generic page header)
    // and combinedText (includes attachments + rawHtml) for comprehensive survey detection
    const announcementType = classifyAnnouncement({
      title: job.announcementTitle,
      description: combinedText,
      url: job.announcementUrl,
      source: 'ntis',
    });

    // DEBUG: Log received classification result
    if (process.env.DEBUG_CLASSIFICATION) {
      console.log(`[PROCESSOR] Received announcementType: ${announcementType}`);
      console.log(`[PROCESSOR] Is R_D_PROJECT? ${announcementType === 'R_D_PROJECT'}`);
    }

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
      return { success: false, skipped: true, reason: `Non-R&D (${announcementType})`, updatedBrowser: workerBrowser };
    }

    // STEP 7: Initialize two-tier extraction system
    const extractionLogger = new ExtractionLogger(job.id);
    const extractor = new TwoTierExtractor(
      job.id,
      detailData,
      { filenames: job.attachmentFilenames, announcementFiles, otherFiles },
      extractionLogger
    );

    // STEP 8: Extract enhancement fields using two-tier priority system
    const deadline = await extractor.extractDeadline();
    const publishedAt = await extractor.extractPublishedAt();
    const applicationStart = await extractor.extractApplicationStart();
    const budgetAmount = await extractor.extractBudget();
    const trlRange = await extractor.extractTRL();
    const eligibilityCriteria = await extractor.extractEligibility();
    const allowedBusinessStructures = await extractor.extractBusinessStructures();
    const requiredInvestmentAmount = await extractor.extractInvestment();

    // STEP 9: Extract fields not yet handled by TwoTierExtractor
    const targetType = determineTargetType(combinedText);

    // STEP 10: Classify TRL stage and keywords
    let trlClassification = null;
    if (trlRange) {
      try {
        trlClassification = classifyTRL(trlRange.minTRL, trlRange.maxTRL);
      } catch (error) {
        console.warn(`   ⚠️  Failed to classify TRL ${trlRange.minTRL}-${trlRange.maxTRL}`);
      }
    }

    // STEP 11: Extract category and keywords from ministry/agency
    // FIX (Nov 13, 2025): Pass title for taxonomy-based classification (fixes Nuclear→ICT bug)
    // FIX (Nov 14, 2025): Use correct field name - detailData.title, not announcementTitle
    const categoryResult = extractCategoryFromMinistryAndAgency(
      detailData.ministry,
      detailData.announcingAgency,
      detailData.title || job.announcementTitle // Pass title for domain detection (e.g., "원자력" → ENERGY)
    );
    // FIX (Nov 13, 2025): Use taxonomy keywords from categoryResult instead of agency defaults
    const keywords = categoryResult.keywords;

    // STEP 12: Save extraction logs to database and print summary
    await extractionLogger.flush();
    extractionLogger.printSummary();

    // STEP 13: Determine status (ACTIVE vs EXPIRED)
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

      // Stage 3.2: Determine trlConfidence and trlInferred from extracted TRL data
      // - 'explicit': TRL explicitly stated (e.g., "TRL 4-6", "기술성숙도 7-9")
      // - 'inferred': TRL inferred from Korean keywords (e.g., "응용연구" → TRL 4-6)
      // - 'missing': No TRL data detected
      const trlConfidence = trlRange ? trlRange.confidence : 'missing';
      const trlInferred = trlRange ? (trlRange.confidence === 'inferred') : false;

      // Extract top-level eligibility fields from JSONB for matching algorithm
      // The matching algorithm checks these top-level fields (e.g., requiredInvestmentAmount)
      // while the extracted data is in eligibilityCriteria JSONB
      const eligibilityFields = extractEligibilityFields(eligibilityCriteria);

      // Prepare funding program data
      const fundingProgramData = {
        agencyId: 'NTIS' as AgencyId,
        title: job.announcementTitle, // Use list page title, not detail page header
        description: combinedText || null,
        announcementUrl: job.announcementUrl,
        deadline: deadline || null,
        budgetAmount: budgetAmount || null,
        targetType: targetTypeArray,
        minTrl: trlRange?.minTRL || null,
        maxTrl: trlRange?.maxTRL || null,
        trlConfidence, // Stage 3.2: Now populated from extraction confidence
        eligibilityCriteria: eligibilityCriteria || undefined,
        publishedAt: publishedAt || null,
        applicationStart: applicationStart || null,
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
        trlInferred, // Stage 3.2: Now derived from confidence (true if 'inferred', false otherwise)
        trlClassification: trlClassification || undefined,
        // Top-level eligibility fields extracted from JSONB for matching algorithm
        requiredInvestmentAmount: eligibilityFields.requiredInvestmentAmount || undefined,
        requiredOperatingYears: eligibilityFields.requiredOperatingYears || undefined,
        maxOperatingYears: eligibilityFields.maxOperatingYears || undefined,
        requiredMinEmployees: eligibilityFields.requiredMinEmployees || undefined,
        requiredMaxEmployees: eligibilityFields.requiredMaxEmployees || undefined,
        requiredCertifications: eligibilityFields.requiredCertifications || undefined,
        preferredCertifications: eligibilityFields.preferredCertifications || undefined,
      };

      // Sanitize Unicode to prevent "lone leading surrogate" errors in PostgreSQL
      const sanitizedFundingProgramData = sanitizeUnicodeForPostgres(fundingProgramData);

      const fundingProgram = await db.funding_programs.create({
        data: sanitizedFundingProgramData as any,
      });

      fundingProgramId = fundingProgram.id;

      // STEP 13.5: Extract and save eligibility criteria using V2 patterns
      // This populates requiredCertifications, requiresResearchInstitute, and creates audit trail
      console.log('   🔍 Extracting eligibility criteria (V2 patterns)...');
      try {
        const announcementText = announcementFiles.map((f) => f.text).join('\n\n');
        const detailPageText = `${detailData.description || ''}\n\n${rawHtmlText}`;
        const sourceFilenames = announcementFilenames.length > 0 ? announcementFilenames : job.attachmentFilenames;

        await extractAndSaveEligibility(
          fundingProgram.id,
          announcementText,
          detailPageText,
          sourceFilenames
        );
      } catch (eligibilityError: any) {
        console.warn(`   ⚠️  Eligibility extraction failed: ${eligibilityError.message}`);
        // Non-fatal: Continue processing even if eligibility extraction fails
      }

      // STEP 14: Update scraping_jobs record to COMPLETED and link funding program
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

    return { success: true, fundingProgramId, updatedBrowser: workerBrowser };
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

    return { success: false, error: error.message, updatedBrowser: workerBrowser };
  }
  // NOTE: Worker browser is NOT closed here - it's reused for all jobs
  // Browser cleanup happens when worker shuts down (in main loop finally block)
}

// ================================================================
// Helper Functions
// ================================================================

/**
 * Extract top-level eligibility fields from JSONB for matching algorithm
 *
 * The matching algorithm checks top-level fields (e.g., requiredInvestmentAmount)
 * while the extracted data is in eligibilityCriteria JSONB
 * (e.g., eligibilityCriteria.financialRequirements.investmentThreshold.minimumAmount)
 */
function extractEligibilityFields(eligibilityCriteria: any) {
  const fields = {
    requiredInvestmentAmount: null as number | null,
    requiredOperatingYears: null as number | null,
    maxOperatingYears: null as number | null,
    requiredMinEmployees: null as number | null,
    requiredMaxEmployees: null as number | null,
    requiredCertifications: null as string[] | null,
    preferredCertifications: null as string[] | null,
  };

  if (!eligibilityCriteria) {
    return fields;
  }

  try {
    // Extract investment threshold from financialRequirements
    const financialReqs = eligibilityCriteria.financialRequirements;
    if (financialReqs?.investmentThreshold?.minimumAmount) {
      fields.requiredInvestmentAmount = financialReqs.investmentThreshold.minimumAmount;
    }

    // Extract operating years from organizationRequirements
    const orgReqs = eligibilityCriteria.organizationRequirements;
    if (orgReqs?.operatingYears) {
      if (orgReqs.operatingYears.minimum) {
        fields.requiredOperatingYears = orgReqs.operatingYears.minimum;
      }
      if (orgReqs.operatingYears.maximum) {
        fields.maxOperatingYears = orgReqs.operatingYears.maximum;
      }
    }

    // Extract certifications from certificationRequirements
    const certReqs = eligibilityCriteria.certificationRequirements;
    if (certReqs?.required && Array.isArray(certReqs.required) && certReqs.required.length > 0) {
      fields.requiredCertifications = certReqs.required;
    }
    if (certReqs?.preferred && Array.isArray(certReqs.preferred) && certReqs.preferred.length > 0) {
      fields.preferredCertifications = certReqs.preferred;
    }
  } catch (error) {
    console.error('[WORKER] Failed to extract eligibility fields from JSONB:', error);
    // Return empty fields on error (safer than failing the entire program creation)
  }

  return fields;
}

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
