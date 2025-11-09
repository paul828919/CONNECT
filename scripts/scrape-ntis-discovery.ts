/**
 * NTIS Discovery Scraper (Phase 1: Download Only)
 *
 * Purpose: Download NTIS announcement metadata and attachments WITHOUT processing
 * Architecture: Two-phase queue pattern (Discovery → Processing)
 *
 * What This Script Does:
 * 1. Scrapes NTIS list pages (title, ministry, deadline, URL)
 * 2. Fetches detail page HTML and extracts raw metadata
 * 3. Downloads ALL attachments to organized folder structure
 * 4. Creates scraping_jobs records with status='SCRAPED', processingStatus='PENDING'
 * 5. Does NOT perform text extraction, classification, or field parsing
 *
 * What This Script Does NOT Do:
 * - HWP/PDF text extraction (moved to processor worker)
 * - Announcement type classification (moved to processor worker)
 * - Budget/TRL/eligibility parsing (moved to processor worker)
 * - Database insertion into funding_programs (moved to processor worker)
 *
 * Benefits:
 * - Fast: ~30-60 seconds per page (vs 5.7 minutes with processing)
 * - Scalable: Multiple processor workers can handle conversion in parallel
 * - Resilient: Attachment files preserved even if processing fails
 * - Resumable: Checkpoint every page (vs every 10 pages)
 *
 * Usage:
 *   npx tsx scripts/scrape-ntis-discovery.ts --fromDate 2025-01-01 --toDate 2025-01-10
 *   npx tsx scripts/scrape-ntis-discovery.ts --fromDate 2025-01-01 --toDate 2025-01-10 --resume
 *   npx tsx scripts/scrape-ntis-discovery.ts --fromDate 2025-10-01 --toDate 2025-10-31 --maxPages 5
 */

import { chromium, Browser, Page } from 'playwright';
import { db } from '@/lib/db';
import { ntisConfig } from '../lib/scraping/config';
import { filterAnnouncementFiles } from '../lib/scraping/announcement-file-filter';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';

// ================================================================
// Configuration
// ================================================================

interface ScriptConfig {
  fromDate: string; // Format: YYYY-MM-DD
  toDate: string; // Format: YYYY-MM-DD
  resume: boolean; // Resume from checkpoint
  checkpointInterval: number; // Save checkpoint every N pages
  maxPages?: number; // Optional limit for testing
  dryRun: boolean; // Preview mode (no database writes, no file downloads)
  attachmentBaseDir: string; // Base directory for attachment storage
}

interface Checkpoint {
  lastProcessedPage: number;
  lastProcessedUrl: string | null;
  totalProcessed: number;
  totalDownloaded: number;
  totalSkipped: number;
}

interface RawDetailPageData {
  title: string;
  ministry: string | null;
  announcingAgency: string | null;
  description: string | null;
  deadline: string | null; // Raw Korean date string
  publishedAt: string | null; // Raw Korean date string
  attachments: Array<{ url: string; filename: string }>;
  rawHtml: string; // Full detail page HTML for processor to parse
}

// ================================================================
// Main Function
// ================================================================

async function main() {
  // Parse command-line arguments
  const args = process.argv.slice(2);
  const config: ScriptConfig = {
    fromDate: getArgValue(args, '--fromDate') || '2025-01-01',
    toDate: getArgValue(args, '--toDate') || '2025-10-31',
    resume: args.includes('--resume'),
    checkpointInterval: 1, // Save checkpoint EVERY page (changed from 10)
    maxPages: getArgValue(args, '--maxPages')
      ? parseInt(getArgValue(args, '--maxPages')!, 10)
      : undefined,
    dryRun: args.includes('--dry-run'),
    // CRITICAL FIX (Nov 10, 2025): Use data/scraper/ntis-attachments to match volume mount
    // Volume mount: ./data/scraper:/app/data/scraper:ro (line 79/149 in docker-compose.production.yml)
    attachmentBaseDir: process.env.NTIS_ATTACHMENT_DIR || path.join(process.cwd(), 'data/scraper/ntis-attachments'),
  };

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║         NTIS Discovery Scraper (Phase 1)                  ║');
  console.log('║         Download Only - No Processing                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  console.log(`📅 Date Range: ${config.fromDate} → ${config.toDate}`);
  console.log(`🔄 Resume Mode: ${config.resume ? 'ON' : 'OFF'}`);
  console.log(`💾 Checkpoint Interval: Every ${config.checkpointInterval} page(s)`);
  console.log(`🧪 Dry Run: ${config.dryRun ? 'ON (Preview only)' : 'OFF'}`);
  console.log(`📁 Attachment Storage: ${config.attachmentBaseDir}\n`);

  if (config.maxPages) {
    console.log(`⚠️  Testing Mode: Limited to ${config.maxPages} pages\n`);
  }

  // ================================================================
  // Graceful Shutdown Handlers (Zero Runtime Overhead)
  // ================================================================

  process.on('SIGTERM', async () => {
    console.log('\n⚠️  Received SIGTERM - saving checkpoint and exiting...');
    await saveCheckpoint(checkpoint);
    console.log('💾 Checkpoint saved. Resume with --resume flag');
    await db.$disconnect();
    if (browser) await browser.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('\n⚠️  Received SIGINT (Ctrl+C) - saving checkpoint and exiting...');
    await saveCheckpoint(checkpoint);
    console.log('💾 Checkpoint saved. Resume with --resume flag');
    await db.$disconnect();
    if (browser) await browser.close();
    process.exit(0);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('\n❌ Unhandled Promise Rejection:', reason);
    console.error('   Promise:', promise);
    saveCheckpoint(checkpoint).finally(() => {
      db.$disconnect().finally(() => process.exit(1));
    });
  });

  // Load or initialize checkpoint
  let checkpoint: Checkpoint = config.resume
    ? await loadCheckpoint()
    : {
        lastProcessedPage: 0,
        lastProcessedUrl: null,
        totalProcessed: 0,
        totalDownloaded: 0,
        totalSkipped: 0,
      };

  console.log(`📊 Starting from page ${checkpoint.lastProcessedPage + 1}...\n`);

  let browser: Browser | null = null;

  try {
    // 1. Launch browser
    console.log('🌐 Launching browser...');
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    const context = await browser.newContext({
      userAgent:
        process.env.SCRAPER_USER_AGENT ||
        'Mozilla/5.0 (compatible; ConnectBot/1.0; +https://connectplt.kr/bot)',
      viewport: { width: 1280, height: 800 },
      locale: 'ko-KR',
      timezoneId: 'Asia/Seoul',
      extraHTTPHeaders: {
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });

    const page = await context.newPage();
    page.setDefaultTimeout(30000);

    // 2. Discover total pages
    const totalPages = await discoverTotalPages(page, config);
    const pagesToScrape = config.maxPages
      ? Math.min(totalPages, config.maxPages)
      : totalPages;

    console.log(
      `📄 Total pages to scrape: ${pagesToScrape} (${totalPages} available)\n`
    );

    // 3. Scrape all pages
    const startTime = Date.now();
    const startPage = checkpoint.lastProcessedPage + 1;

    for (let pageNum = startPage; pageNum <= pagesToScrape; pageNum++) {
      const pageStart = Date.now();
      console.log(`\n${'='.repeat(70)}`);
      console.log(
        `📖 Page ${pageNum}/${pagesToScrape} (${Math.round((pageNum / pagesToScrape) * 100)}% complete)`
      );
      console.log(`${'='.repeat(70)}`);

      // Navigate to page with date filter
      console.log(`🔗 Navigating to page ${pageNum} with date filter...`);
      await navigateToFilteredResults(page, config, pageNum);

      // Extract announcements from list page
      const announcements = await extractNTISAnnouncements(page);
      console.log(`   Found ${announcements.length} announcements on this page`);

      if (announcements.length === 0) {
        console.log('   ⚠️  No announcements found - stopping pagination');
        break;
      }

      // Process each announcement (download only, no processing)
      for (const announcement of announcements) {
        try {
          // STEP 1: Generate content hash for deduplication
          const contentHash = generateContentHash(announcement.link);

          // STEP 1.5: Skip non-research announcements (Technology Demand Survey, etc.)
          const NON_RESEARCH_PATTERNS = [
            /기술수요조사/i,  // Technology Demand Survey
            /수요조사/i,      // Demand Survey
          ];

          const isNonResearch = NON_RESEARCH_PATTERNS.some(pattern =>
            pattern.test(announcement.title)
          );

          if (isNonResearch) {
            console.log(
              `   ⊘ SKIPPED (Non-Research): ${announcement.title.substring(0, 60)}...`
            );
            checkpoint.totalSkipped++;
            checkpoint.totalProcessed++;
            continue;
          }

          // STEP 2: Check if already exists (skip duplicates)
          if (!config.dryRun) {
            const existingJob = await db.scraping_jobs.findFirst({
              where: { announcementUrl: announcement.link },
            });

            if (existingJob) {
              console.log(
                `   ⊘ DUPLICATE: ${announcement.title.substring(0, 60)}...`
              );
              checkpoint.totalSkipped++;
              checkpoint.totalProcessed++;
              continue;
            }
          }

          // STEP 3: Fetch detail page HTML and extract raw metadata
          const detailData = await fetchDetailPageRawData(page, announcement.link);

          // STEP 4: Download attachments to organized folder structure
          const dateRangeFolder = `${config.fromDate}_to_${config.toDate}`.replace(/-/g, '');
          const attachmentFolder = path.join(
            config.attachmentBaseDir,
            dateRangeFolder,
            `page-${pageNum}`,
            `announcement-${announcement.ntisId || 'unknown'}`
          );

          let downloadedFilenames: string[] = [];
          let attachmentCount = 0;

          if (!config.dryRun && detailData.attachments.length > 0) {
            const downloadResult = await downloadAttachments(
              page,
              detailData.attachments,
              attachmentFolder,
              announcement.link
            );
            downloadedFilenames = downloadResult.filenames;
            attachmentCount = downloadResult.count;
          }

          // STEP 5: Create scraping_jobs record (status='SCRAPED', processingStatus='PENDING')
          if (!config.dryRun) {
            await db.scraping_jobs.create({
              data: {
                announcementUrl: announcement.link,
                announcementTitle: announcement.title,
                dateRange: `${config.fromDate} to ${config.toDate}`,
                pageNumber: pageNum,
                announcementIndex: announcements.indexOf(announcement) + 1,
                detailPageData: detailData as any, // Store raw data for processor
                attachmentFolder: attachmentFolder,
                attachmentCount: attachmentCount,
                attachmentFilenames: downloadedFilenames,
                scrapingStatus: 'SCRAPED',
                scrapingError: null,
                scrapedAt: new Date(),
                processingStatus: 'PENDING',
                processingAttempts: 0,
                contentHash: contentHash,
              },
            });
          }

          console.log(
            `   ✅ DOWNLOADED: ${announcement.title.substring(0, 60)}...`
          );
          console.log(
            `      Attachments: ${attachmentCount} files, Folder: ${path.basename(attachmentFolder)}`
          );

          checkpoint.totalDownloaded++;
          checkpoint.totalProcessed++;
          checkpoint.lastProcessedUrl = announcement.link;

          // Rate limiting (2 seconds between detail page fetches)
          await page.waitForTimeout(2000);
        } catch (err: any) {
          console.error(
            `   ❌ ERROR downloading announcement: ${err.message}`
          );

          // Save failed job to database for retry
          if (!config.dryRun) {
            try {
              await db.scraping_jobs.create({
                data: {
                  announcementUrl: announcement.link,
                  announcementTitle: announcement.title,
                  dateRange: `${config.fromDate} to ${config.toDate}`,
                  pageNumber: pageNum,
                  announcementIndex: announcements.indexOf(announcement) + 1,
                  detailPageData: {} as any,
                  attachmentFolder: '',
                  attachmentCount: 0,
                  attachmentFilenames: [],
                  scrapingStatus: 'SCRAPING_FAILED',
                  scrapingError: err.message,
                  scrapedAt: new Date(),
                  processingStatus: 'PENDING',
                  processingAttempts: 0,
                  contentHash: generateContentHash(announcement.link),
                },
              });
            } catch (dbErr: any) {
              console.error(`   ❌ Failed to save error to database: ${dbErr.message}`);
            }
          }

          checkpoint.totalSkipped++;
        }
      }

      // Update checkpoint after EVERY page (changed from every 10 pages)
      checkpoint.lastProcessedPage = pageNum;
      await saveCheckpoint(checkpoint);
      console.log(`\n   💾 Checkpoint saved at page ${pageNum}`);

      const pageTime = ((Date.now() - pageStart) / 1000).toFixed(1);
      console.log(`\n   ⏱️  Page ${pageNum} completed in ${pageTime}s`);

      // Rate limiting between pages (3 seconds)
      await page.waitForTimeout(3000);
    }

    await browser.close();

    // 4. Final statistics
    const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    console.log('\n\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                   DISCOVERY COMPLETE                       ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    console.log(`✅ Total Processed: ${checkpoint.totalProcessed}`);
    console.log(`💾 Total Downloaded: ${checkpoint.totalDownloaded} announcements`);
    console.log(`⊘  Total Skipped: ${checkpoint.totalSkipped} (duplicates/errors)`);
    console.log(`⏱️  Total Time: ${totalTime} minutes`);
    console.log(
      `⏱️  Avg Time per Page: ${(parseFloat(totalTime) / (checkpoint.lastProcessedPage - startPage + 1)).toFixed(1)} minutes\n`
    );

    console.log('🚀 Next Step: Run processor workers to parse downloaded data');
    console.log('   npx tsx scripts/scrape-ntis-processor.ts --workers 3\n');

    // Clean up checkpoint file after successful completion
    if (!config.dryRun) {
      await deleteCheckpoint();
      console.log('🗑️  Checkpoint file deleted (discovery complete)\n');
    }
  } catch (error: any) {
    console.error('\n❌ FATAL ERROR:', error.message);
    console.error(error.stack);

    if (browser) {
      await browser.close();
    }

    // Save checkpoint for resume
    await saveCheckpoint(checkpoint);
    console.log('\n💾 Checkpoint saved. Resume with --resume flag');

    process.exit(1);
  }
}

// ================================================================
// Helper Functions
// ================================================================

/**
 * Navigate to NTIS and apply date range filter via form submission
 * (Reuses logic from scrape-ntis-historical.ts)
 */
async function navigateToFilteredResults(
  page: Page,
  config: ScriptConfig,
  pageNum: number
): Promise<void> {
  const [fromYear, fromMonth, fromDay] = config.fromDate.split('-').map(Number);
  const [toYear, toMonth, toDay] = config.toDate.split('-').map(Number);

  const currentUrl = page.url();

  // Establish session on first page
  if (pageNum === 1 && !currentUrl.includes('ntis.go.kr')) {
    await page.goto('https://www.ntis.go.kr', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await page.waitForTimeout(2000);
  }

  if (!currentUrl.includes('ntis.go.kr/rndgate/eg/un/ra/mng.do')) {
    await page.goto(`${ntisConfig.baseUrl}${ntisConfig.listingPath}`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await page.waitForTimeout(2000);
  }

  // Set dates using jQuery Datepicker API
  await page.evaluate(
    ({ year, month, day }) => {
      const $ = (window as any).$;
      if (!$ || !$.datepicker) {
        throw new Error('jQuery Datepicker not available');
      }
      const startInput = $('#searchCondition2');
      if (startInput.length && startInput.datepicker) {
        startInput.datepicker('setDate', new Date(year, month - 1, day));
      }
    },
    { year: fromYear, month: fromMonth, day: fromDay }
  );

  await page.evaluate(
    ({ year, month, day }) => {
      const $ = (window as any).$;
      const endInput = $('#searchCondition3');
      if (endInput.length && endInput.datepicker) {
        endInput.datepicker('setDate', new Date(year, month - 1, day));
      }
    },
    { year: toYear, month: toMonth, day: toDay }
  );

  await page.waitForTimeout(500);

  // Set page index
  if (pageNum > 1) {
    await page.evaluate((pageIndex) => {
      const pageInput = document.getElementById('pageIndex') as HTMLInputElement;
      if (pageInput) pageInput.value = String(pageIndex);
    }, pageNum);
  }

  // Submit form
  await page.evaluate((pNum) => {
    if (typeof (window as any).fn_search === 'function') {
      (window as any).fn_search(String(pNum), '');
    }
  }, pageNum);

  await page.waitForLoadState('domcontentloaded', { timeout: 30000 });
  await page.waitForTimeout(3000);
  await page.waitForLoadState('networkidle', { timeout: 30000 });
}

/**
 * Discover total pages (reuses logic from scrape-ntis-historical.ts)
 */
async function discoverTotalPages(
  page: Page,
  config: ScriptConfig
): Promise<number> {
  console.log('🔍 Discovering total pages...');

  await navigateToFilteredResults(page, config, 1);

  try {
    const bodyText = await page.textContent('body');
    const resultsMatch = bodyText?.match(/검색결과[:\s]*(\d+)\s*건/i);

    if (resultsMatch) {
      const totalResults = parseInt(resultsMatch[1], 10);
      const estimatedPages = Math.ceil(totalResults / 10);
      console.log(
        `   ✓ Found ${totalResults} total announcements → ${estimatedPages} pages`
      );
      return estimatedPages;
    }

    // Fallback: pagination links
    const paginationSelectors = [
      '.paging',
      '.pagination',
      'div.paging',
      'td[colspan] a[href*="pageIndex"]',
    ];

    for (const selector of paginationSelectors) {
      try {
        const paginationEl = await page.$(selector);
        if (paginationEl) {
          const paginationHTML = await paginationEl.innerHTML();
          const pageIndexMatches = paginationHTML.match(/pageIndex=(\d+)/g);
          if (pageIndexMatches && pageIndexMatches.length > 0) {
            const pageNumbers = pageIndexMatches.map((match) => {
              const num = match.match(/pageIndex=(\d+)/);
              return num ? parseInt(num[1], 10) : 0;
            });
            const maxPage = Math.max(...pageNumbers);
            if (maxPage > 0) {
              console.log(`   ✓ Found ${maxPage} pages from pagination links`);
              return maxPage;
            }
          }
        }
      } catch {
        continue;
      }
    }

    console.warn('   ⚠️  Could not determine total pages - defaulting to 100');
    return 100;
  } catch (error: any) {
    console.warn(`   ⚠️  Error: ${error.message} - defaulting to 100`);
    return 100;
  }
}

/**
 * Extract announcements from list page (reuses logic from scrape-ntis-historical.ts)
 */
async function extractNTISAnnouncements(
  page: Page
): Promise<
  Array<{
    title: string;
    link: string;
    ntisId?: string;
    status?: string;
    ministry?: string;
    startDate?: string;
    deadline?: string;
  }>
> {
  const announcements = await page.$$eval(
    ntisConfig.selectors.announcementList,
    (elements, selectors) => {
      return elements.map((el) => {
        const titleEl = el.querySelector(selectors.title);
        const linkEl = el.querySelector(selectors.link);
        const ntisIdEl = el.querySelector(selectors.ntisId || '');
        const statusEl = el.querySelector(selectors.status || '');
        const ministryEl = el.querySelector(selectors.ministry || '');
        const startDateEl = el.querySelector(selectors.startDate || '');
        const deadlineEl = el.querySelector(selectors.deadline || '');

        return {
          title: titleEl?.textContent?.trim() || '',
          link: linkEl?.getAttribute('href') || '',
          ntisId: ntisIdEl?.textContent?.trim(),
          status: statusEl?.textContent?.trim(),
          ministry: ministryEl?.textContent?.trim(),
          startDate: startDateEl?.textContent?.trim(),
          deadline: deadlineEl?.textContent?.trim(),
        };
      });
    },
    ntisConfig.selectors
  );

  return announcements
    .filter((a) => a.title && a.link)
    .map((a) => ({
      ...a,
      link: a.link.startsWith('http')
        ? a.link
        : `${ntisConfig.baseUrl}${a.link}`,
    }));
}

/**
 * Fetch detail page and extract raw metadata (NO processing)
 *
 * Key Difference from scrape-ntis-historical.ts:
 * - Does NOT call parseNTISAnnouncementDetails (no text extraction)
 * - Does NOT classify announcement type
 * - Does NOT parse budget, TRL, eligibility
 * - Just extracts basic fields + attachment URLs + full HTML
 */
async function fetchDetailPageRawData(
  page: Page,
  detailUrl: string
): Promise<RawDetailPageData> {
  await page.goto(detailUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Extract basic metadata from detail page with timeout handling
  const safeTextContent = async (selector: string, timeoutMs: number = 5000): Promise<string | null> => {
    try {
      return (await page.textContent(selector, { timeout: timeoutMs }))?.trim() || null;
    } catch (error) {
      return null;
    }
  };

  const title = (await safeTextContent('h2, h3, .subject, .title')) || '';

  // NTIS uses <li><span>LABEL : </span>VALUE</li> structure, not table rows
  const ministryRaw = await safeTextContent('li:has-text("부처명")');
  const ministry = ministryRaw?.replace('부처명 :', '').trim() || null;

  const agencyRaw = await safeTextContent('li:has-text("공고기관명")');
  const announcingAgency = agencyRaw?.replace('공고기관명 :', '').trim() || null;

  const publishedAtRaw = await safeTextContent('li:has-text("공고일")');
  const publishedAt = publishedAtRaw?.replace('공고일 :', '').trim() || null;

  // Description is in content section with header "공고내용"
  const description = await safeTextContent('.content, .description, .summary');

  // Deadline might be in different formats (마감일, 접수마감일, etc.)
  let deadline: string | null = null;
  const deadlineRaw = await safeTextContent('li:has-text("마감일")');
  if (deadlineRaw) {
    deadline = deadlineRaw.replace('마감일 :', '').trim();
  }

  // Extract attachment filenames from "첨부파일" section
  // NTIS stores attachments in a dedicated section with header text "첨부파일"
  const attachments = await page.evaluate(() => {
    // Find the element containing "첨부파일" text
    const allElements = Array.from(document.querySelectorAll('*'));
    const attachmentHeader = allElements.find((el) => el.textContent?.trim() === '첨부파일');

    if (!attachmentHeader) {
      return [];
    }

    // Find the parent container and then the list of attachments
    const container = attachmentHeader.parentElement;
    if (!container) {
      return [];
    }

    // Check for "등록된 파일이 없습니다" (No registered files) message
    const containerText = container.textContent?.trim() || '';
    if (containerText.includes('등록된 파일이 없습니다') || containerText.includes('파일이 없습니다')) {
      return [];
    }

    // Find all links in the attachment section
    const links = container.querySelectorAll('a');
    const attachmentList: Array<{ url: string; filename: string }> = [];

    links.forEach((link) => {
      const filename = link.textContent?.trim() || '';
      const url = (link as HTMLAnchorElement).href;

      // Only include files with recognized extensions
      if (filename && /\.(pdf|hwp|hwpx|zip|doc|docx)$/i.test(filename)) {
        attachmentList.push({ url, filename });
      }
    });

    return attachmentList;
  });

  // Log if no attachments found
  if (attachments.length === 0) {
    console.log(`      ⓘ No attachments section found or no files registered`);
  }

  // Capture full HTML for processor to parse later
  const rawHtml = await page.content();

  return {
    title,
    ministry,
    announcingAgency,
    description,
    deadline,
    publishedAt,
    attachments,
    rawHtml,
  };
}

/**
 * Download attachments using Playwright download events (preserves NTIS session)
 *
 * CRITICAL: NTIS downloads require clicking links, not direct URL navigation.
 * Direct page.goto() loses session context → HTTP 404.
 *
 * UPDATE (Nov 1, 2025): Only download announcement files (공고, 공모, 신규과제)
 * - Filter using announcement-file-filter.ts before downloading
 * - Skip application forms, templates, and other non-announcement files
 *
 * Folder structure: /opt/connect/data/ntis-attachments/{dateRange}/page-{N}/announcement-{N}/
 */
async function downloadAttachments(
  page: Page,
  attachments: Array<{ url: string; filename: string }>,
  attachmentFolder: string,
  detailPageUrl: string
): Promise<{ filenames: string[]; count: number }> {
  if (attachments.length === 0) {
    console.log(`      ⓘ No attachments to download`);
    return { filenames: [], count: 0 };
  }

  // Create attachment folder
  await fs.mkdir(attachmentFolder, { recursive: true });

  const downloadedFilenames: string[] = [];

  // Deduplicate filenames (NTIS often lists same file multiple times)
  const uniqueAttachments = Array.from(
    new Map(attachments.map((att) => [att.filename, att])).values()
  );

  if (uniqueAttachments.length < attachments.length) {
    console.log(
      `      Removed ${attachments.length - uniqueAttachments.length} duplicate attachment(s)`
    );
  }

  // Filter for announcement files only (공고, 공모, 신규과제 patterns)
  const allFilenames = uniqueAttachments.map((att) => att.filename);
  const announcementFilenames = filterAnnouncementFiles(allFilenames);
  const filteredAttachments = uniqueAttachments.filter((att) =>
    announcementFilenames.includes(att.filename)
  );

  const skippedCount = uniqueAttachments.length - filteredAttachments.length;
  if (skippedCount > 0) {
    console.log(
      `      🎯 Filtered to ${filteredAttachments.length} announcement file(s) (skipped ${skippedCount} non-announcement files)`
    );
  }

  if (filteredAttachments.length === 0) {
    console.log(`      ⚠️  No announcement files found in attachment list`);
    return { filenames: [], count: 0 };
  }

  for (const attachment of filteredAttachments) {
    try {
      console.log(`      📎 Downloading: ${attachment.filename}...`);

      // Set up download event listener + dialog handler (race condition)
      let dialogHandler: ((dialog: any) => Promise<void>) | null = null;
      let result: { type: 'download'; download: any } | { type: 'dialog' } | null = null;

      try {
        const downloadPromise = page.waitForEvent('download', { timeout: 15000 });

        // Handle "File Not Found" dialogs (파일을 찾을 수 없습니다)
        let dialogHandled = false;
        const dialogPromise = new Promise<'dialog'>((resolve) => {
          dialogHandler = async (dialog: any) => {
            if (dialogHandled) {
              await dialog.accept().catch(() => {});
              return;
            }

            const message = dialog.message();
            if (
              message.includes('File Not Found') ||
              message.includes('파일을 찾을 수 없습니다') ||
              message.includes('파일이 존재하지 않습니다')
            ) {
              dialogHandled = true;
              console.log(`      ⚠️  File Not Found popup: "${message}"`);
              console.log(`      🔘 Clicking confirmation button...`);
              await dialog.accept(); // Click "확인" button
              resolve('dialog');
            }
          };
          page.on('dialog', dialogHandler);
        });

        // Click the attachment link (CRITICAL: preserves session context)
        await page.click(`a:has-text("${attachment.filename}")`);

        // Wait for either download to start OR dialog to appear
        result = await Promise.race([
          downloadPromise.then((download) => ({ type: 'download' as const, download })),
          dialogPromise.then(() => ({ type: 'dialog' as const })),
        ]);
      } catch (error: any) {
        if (error.message?.includes('Timeout') || error.name === 'TimeoutError') {
          console.log(`      ⏱️  Timeout: ${attachment.filename} - skipping`);
        } else {
          console.warn(`      ⚠️  Error: ${attachment.filename}: ${error.message}`);
        }
        continue;
      } finally {
        // Clean up dialog handler
        if (dialogHandler) {
          page.off('dialog', dialogHandler);
        }
      }

      // Handle "File Not Found" dialog - navigate to next announcement
      if (result?.type === 'dialog') {
        console.log(`      ✗ File not available on NTIS server`);
        console.log(`      ➜ Proceeding to next announcement (dialog redirects to list page)`);

        // After clicking "확인", NTIS redirects to list page automatically
        // Wait for navigation to complete
        try {
          await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
          await page.waitForTimeout(1000);
          console.log(`      ✓ Redirected to list page by NTIS`);
        } catch (error: any) {
          console.warn(`      ⚠️  Navigation timeout after dialog: ${error.message}`);
        }

        // Break out of attachment loop - we've been redirected away from detail page
        break;
      }

      // Verify download succeeded
      if (!result || result.type !== 'download') {
        console.log(`      ⚠️  No download or dialog for ${attachment.filename} - skipping`);
        continue;
      }

      // Save downloaded file
      const download = result.download;
      const fileBuffer = await download.createReadStream().then((stream) => {
        return new Promise<Buffer>((resolve, reject) => {
          const chunks: Buffer[] = [];
          stream.on('data', (chunk) => chunks.push(chunk));
          stream.on('end', () => resolve(Buffer.concat(chunks)));
          stream.on('error', reject);
        });
      });

      const filePath = path.join(attachmentFolder, attachment.filename);
      await fs.writeFile(filePath, fileBuffer);

      downloadedFilenames.push(attachment.filename);
      console.log(`      ✓ Downloaded: ${attachment.filename} (${fileBuffer.length} bytes)`);

      // Rate limiting between downloads
      await page.waitForTimeout(1000);
    } catch (err: any) {
      console.warn(`      ⚠️  Error downloading ${attachment.filename}: ${err.message}`);
    }
  }

  return { filenames: downloadedFilenames, count: downloadedFilenames.length };
}

/**
 * Generate SHA-256 hash for deduplication
 */
function generateContentHash(url: string): string {
  return crypto.createHash('sha256').update(url).digest('hex');
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

/**
 * Save checkpoint to file
 */
async function saveCheckpoint(checkpoint: Checkpoint): Promise<void> {
  const checkpointPath = '/tmp/ntis-discovery-checkpoint.json';
  await fs.writeFile(checkpointPath, JSON.stringify(checkpoint, null, 2));
}

/**
 * Load checkpoint from file
 */
async function loadCheckpoint(): Promise<Checkpoint> {
  try {
    const checkpointPath = '/tmp/ntis-discovery-checkpoint.json';
    const data = await fs.readFile(checkpointPath, 'utf-8');
    const checkpoint = JSON.parse(data);

    console.log('📂 Loaded checkpoint:');
    console.log(`   Last page: ${checkpoint.lastProcessedPage}`);
    console.log(`   Total downloaded: ${checkpoint.totalDownloaded}`);
    console.log(`   Total skipped: ${checkpoint.totalSkipped}\n`);

    return checkpoint;
  } catch {
    console.log('   No checkpoint found - starting fresh\n');
    return {
      lastProcessedPage: 0,
      lastProcessedUrl: null,
      totalProcessed: 0,
      totalDownloaded: 0,
      totalSkipped: 0,
    };
  }
}

/**
 * Delete checkpoint file after successful completion
 */
async function deleteCheckpoint(): Promise<void> {
  try {
    const checkpointPath = '/tmp/ntis-discovery-checkpoint.json';
    await fs.unlink(checkpointPath);
  } catch {
    // Ignore errors
  }
}

// ================================================================
// Run Script
// ================================================================

main()
  .catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
