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
  attachmentUrls: string[];
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
    attachmentBaseDir: '/opt/connect/data/ntis-attachments',
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

          if (!config.dryRun && detailData.attachmentUrls.length > 0) {
            const downloadResult = await downloadAttachments(
              page,
              detailData.attachmentUrls,
              attachmentFolder
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

  // Extract basic metadata from detail page
  const title =
    (await page.textContent('h2, h3, .subject, .title'))?.trim() || '';
  const ministry =
    (await page.textContent('th:has-text("부처명") + td'))?.trim() || null;
  const announcingAgency =
    (await page.textContent('th:has-text("공고기관명") + td'))?.trim() || null;
  const description =
    (await page.textContent('.content, .description, .summary'))?.trim() ||
    null;
  const deadline =
    (await page.textContent('th:has-text("접수마감일") + td'))?.trim() || null;
  const publishedAt =
    (await page.textContent('th:has-text("공고일") + td'))?.trim() || null;

  // Extract attachment URLs
  const attachmentUrls = await page.$$eval(
    'a[href*="/file/download"]',
    (links) =>
      links.map((link) => (link as HTMLAnchorElement).href).filter(Boolean)
  );

  // Capture full HTML for processor to parse later
  const rawHtml = await page.content();

  return {
    title,
    ministry,
    announcingAgency,
    description,
    deadline,
    publishedAt,
    attachmentUrls,
    rawHtml,
  };
}

/**
 * Download attachments to organized folder structure
 *
 * Folder structure: /opt/connect/data/ntis-attachments/{dateRange}/page-{N}/announcement-{N}/
 */
async function downloadAttachments(
  page: Page,
  attachmentUrls: string[],
  attachmentFolder: string
): Promise<{ filenames: string[]; count: number }> {
  if (attachmentUrls.length === 0) {
    return { filenames: [], count: 0 };
  }

  // Create attachment folder
  await fs.mkdir(attachmentFolder, { recursive: true });

  const downloadedFilenames: string[] = [];

  for (const url of attachmentUrls) {
    try {
      // Navigate to download URL
      const response = await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      if (!response || !response.ok()) {
        console.warn(`   ⚠️  Failed to download: ${url} (status ${response?.status()})`);
        continue;
      }

      // Extract filename from Content-Disposition header or URL
      const contentDisposition = response.headers()['content-disposition'];
      let filename = 'unknown';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (match && match[1]) {
          filename = match[1].replace(/['"]/g, '');
        }
      } else {
        filename = path.basename(url.split('?')[0]);
      }

      // Download file
      const fileBuffer = await response.body();
      const filePath = path.join(attachmentFolder, filename);
      await fs.writeFile(filePath, fileBuffer);

      downloadedFilenames.push(filename);
      console.log(`      📎 Downloaded: ${filename}`);

      // Rate limiting between downloads
      await page.waitForTimeout(1000);
    } catch (err: any) {
      console.warn(`   ⚠️  Error downloading ${url}: ${err.message}`);
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
