/**
 * NTIS Historical Scraping Script
 *
 * Purpose: Import historical R&D announcements from 2025 (Jan 1 - Oct 24)
 * Use Case: Provide "missed opportunities" educational content for users with no current matches
 *
 * Key Features:
 * 1. Date range filtering: Uses NTIS API query parameters to target 2025 YTD data
 * 2. Real-time classification: Filters out SURVEY/EVENT/NOTICE before database insertion
 * 3. Automatic expiry: Marks all programs as status='EXPIRED' (deadline < today)
 * 4. Progress tracking: Checkpoint/resume capability for long scraping runs
 * 5. Efficient scraping: ~5.7 minutes per 5 pages (50 announcements → ~47 R&D projects)
 *
 * Usage:
 *   npx tsx scripts/scrape-ntis-historical.ts --fromDate 2025-01-01 --toDate 2025-10-24
 *   npx tsx scripts/scrape-ntis-historical.ts --fromDate 2025-01-01 --toDate 2025-10-24 --resume
 *
 * Output:
 * - Classification Rate: ~94% R&D projects
 * - Automatically skips SURVEY/NOTICE/EVENT announcements
 * - All programs marked as EXPIRED (historical data)
 */

import { chromium, Browser, Page } from 'playwright';
import { db } from '@/lib/db';
import { AgencyId } from '@prisma/client';
import {
  generateProgramHash,
  parseKoreanDate,
  cleanHtmlText,
} from '../lib/scraping/utils';
import { ntisConfig } from '../lib/scraping/config';
import { parseNTISAnnouncementDetails } from '../lib/scraping/parsers/ntis-announcement-parser';
import { classifyAnnouncement } from '../lib/scraping/classification';

// ================================================================
// Configuration
// ================================================================

interface ScriptConfig {
  fromDate: string; // Format: YYYY-MM-DD
  toDate: string; // Format: YYYY-MM-DD
  resume: boolean; // Resume from checkpoint
  checkpointInterval: number; // Save checkpoint every N pages
  maxPages?: number; // Optional limit for testing
  dryRun: boolean; // Preview mode (no database writes)
}

interface Checkpoint {
  lastProcessedPage: number;
  lastProcessedId: string | null;
  totalProcessed: number;
  totalSaved: number;
  totalSkipped: number;
}

// ================================================================
// Main Function
// ================================================================

async function main() {
  // Parse command-line arguments
  const args = process.argv.slice(2);
  const config: ScriptConfig = {
    fromDate: getArgValue(args, '--fromDate') || '2025-01-01',
    toDate: getArgValue(args, '--toDate') || '2025-10-24',
    resume: args.includes('--resume'),
    checkpointInterval: parseInt(getArgValue(args, '--checkpoint') || '10', 10), // Every 10 pages
    maxPages: getArgValue(args, '--maxPages')
      ? parseInt(getArgValue(args, '--maxPages')!, 10)
      : undefined,
    dryRun: args.includes('--dry-run'),
  };

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║         NTIS Historical Data Scraping Script              ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  console.log(`📅 Date Range: ${config.fromDate} → ${config.toDate}`);
  console.log(`🔄 Resume Mode: ${config.resume ? 'ON' : 'OFF'}`);
  console.log(`💾 Checkpoint Interval: Every ${config.checkpointInterval} pages`);
  console.log(`🧪 Dry Run: ${config.dryRun ? 'ON (Preview only)' : 'OFF'}\n`);

  if (config.maxPages) {
    console.log(`⚠️  Testing Mode: Limited to ${config.maxPages} pages\n`);
  }

  // Load or initialize checkpoint
  let checkpoint: Checkpoint = config.resume
    ? await loadCheckpoint()
    : {
        lastProcessedPage: 0,
        lastProcessedId: null,
        totalProcessed: 0,
        totalSaved: 0,
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

      // Navigate to page with date filter (via form submission)
      console.log(`🔗 Navigating to page ${pageNum} with date filter ${config.fromDate} → ${config.toDate}...`);

      await navigateToFilteredResults(page, config, pageNum);

      // Extract announcements from list page
      const announcements = await extractNTISAnnouncements(page);
      console.log(`   Found ${announcements.length} announcements on this page`);

      if (announcements.length === 0) {
        console.log('   ⚠️  No announcements found on this page - stopping pagination');
        break;
      }

      // Process each announcement
      for (const announcement of announcements) {
        try {
          // STEP 1: Generate content hash for deduplication
          const contentHash = generateProgramHash({
            agencyId: 'NTIS',
            title: announcement.title,
            announcementUrl: announcement.link,
          });

          // STEP 2: Check if already exists (skip duplicates)
          // Note: In dry-run mode, skip database check (database may not be running)
          if (!config.dryRun) {
            const existingProgram = await db.funding_programs.findFirst({
              where: { contentHash },
            });

            if (existingProgram) {
              console.log(
                `   ⊘ DUPLICATE: ${announcement.title.substring(0, 60)}...`
              );
              checkpoint.totalSkipped++;
              checkpoint.totalProcessed++;
              continue;
            }
          }

          // STEP 3: Fetch detail page for full metadata
          const details = await parseNTISAnnouncementDetails(
            page,
            announcement.link
          );

          // STEP 4: CLASSIFICATION - Filter out non-R&D announcements
          const announcementType = classifyAnnouncement({
            title: announcement.title,
            description: details.description || '',
            url: announcement.link,
            source: 'ntis',
          });

          if (announcementType !== 'R_D_PROJECT') {
            console.log(
              `   ⊘ SKIPPED (${announcementType}): ${announcement.title.substring(0, 60)}...`
            );
            checkpoint.totalSkipped++;
            checkpoint.totalProcessed++;
            continue;
          }

          // STEP 5: Parse deadline from list page (optimization)
          let deadline: Date | null = null;
          if (announcement.deadline) {
            deadline = parseKoreanDate(announcement.deadline);
          }
          // Fallback to detail page deadline
          if (!deadline && details.deadline) {
            deadline = details.deadline;
          }

          // STEP 5.5: Use list page ministry/agency as fallback (CRITICAL FIX for 54.74% omission rate)
          // NTIS detail pages don't consistently include "부처명 :" field
          // But list pages always have ministry column - use as fallback
          const ministry = details.ministry || announcement.ministry || null;
          const announcingAgency = details.announcingAgency || null;

          // STEP 5.6: Re-compute category and keywords if ministry was corrected
          // (detail page had NULL ministry, but list page provided it)
          let category = details.category;
          let keywords = details.keywords;
          if (!details.ministry && ministry) {
            // Ministry was corrected - recompute hierarchical categorization
            const { extractCategoryFromMinistryAndAgency, getCombinedKeywords } = await import('../lib/scraping/parsers/agency-mapper');
            const categoryResult = extractCategoryFromMinistryAndAgency(ministry, announcingAgency);
            category = categoryResult.category;
            keywords = getCombinedKeywords(ministry, announcingAgency);
          }

          // STEP 6: Determine status (all Q1 2025 programs should be expired by Oct 2025)
          const status =
            deadline && deadline < new Date() ? 'EXPIRED' : 'ACTIVE';

          // STEP 7: Save to database (unless dry run)
          if (!config.dryRun) {
            const targetTypeArray =
              details.targetType === 'BOTH'
                ? ['COMPANY' as const, 'RESEARCH_INSTITUTE' as const]
                : details.targetType === 'COMPANY'
                ? ['COMPANY' as const]
                : details.targetType === 'RESEARCH_INSTITUTE'
                ? ['RESEARCH_INSTITUTE' as const]
                : ['COMPANY' as const, 'RESEARCH_INSTITUTE' as const];

            await db.funding_programs.create({
              data: {
                agencyId: 'NTIS' as AgencyId,
                title: announcement.title,
                description: details.description || null,
                announcementUrl: announcement.link,
                deadline: deadline || null,
                budgetAmount: details.budgetAmount || null,
                targetType: targetTypeArray,
                minTrl: details.minTRL || null,
                maxTrl: details.maxTRL || null,
                eligibilityCriteria: details.eligibilityCriteria || undefined,
                publishedAt: details.publishedAt || null,
                ministry, // 부처명 (detail page with list page fallback)
                announcingAgency, // 공고기관명 (from NTIS detail page)
                category: category || null, // Industry sector (hierarchical categorization with ministry fallback)
                keywords: keywords || [], // Technology keywords (recomputed if ministry was corrected)
                contentHash,
                scrapedAt: new Date(),
                scrapingSource: 'ntis',
                status, // EXPIRED for all Q1 2025 programs
                announcementType: 'R_D_PROJECT', // Only save R&D projects
                // Phase 2 Enhancement Fields (added Oct 29, 2025 for Phase 6 testing)
                allowedBusinessStructures: details.allowedBusinessStructures || [],
                attachmentUrls: details.attachmentUrls || [],
                trlInferred: details.trlInferred || false,
                trlClassification: details.trlClassification || undefined,
              },
            });
          }

          console.log(
            `   ✅ SAVED (${status}): ${announcement.title.substring(0, 60)}...`
          );
          console.log(
            `      Deadline: ${deadline ? deadline.toISOString().split('T')[0] : 'TBD'}, Budget: ${details.budgetAmount ? `₩${(details.budgetAmount / 1e9).toFixed(1)}B` : 'TBD'}`
          );

          checkpoint.totalSaved++;
          checkpoint.totalProcessed++;
          checkpoint.lastProcessedId = announcement.ntisId || null;

          // Rate limiting (3 seconds between detail page fetches)
          await page.waitForTimeout(3000);
        } catch (err: any) {
          console.error(
            `   ❌ ERROR processing announcement: ${err.message}`
          );
          checkpoint.totalSkipped++;
        }
      }

      // Update checkpoint after each page
      checkpoint.lastProcessedPage = pageNum;
      if (pageNum % config.checkpointInterval === 0) {
        await saveCheckpoint(checkpoint);
        console.log(`\n   💾 Checkpoint saved at page ${pageNum}`);
      }

      const pageTime = ((Date.now() - pageStart) / 1000).toFixed(1);
      console.log(`\n   ⏱️  Page ${pageNum} completed in ${pageTime}s`);

      // Rate limiting between pages (5 seconds)
      await page.waitForTimeout(5000);
    }

    await browser.close();

    // 4. Final statistics
    const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    console.log('\n\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                   SCRAPING COMPLETE                        ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    console.log(`✅ Total Processed: ${checkpoint.totalProcessed}`);
    console.log(
      `💾 Total Saved: ${checkpoint.totalSaved} R&D projects`
    );
    console.log(
      `⊘  Total Skipped: ${checkpoint.totalSkipped} (surveys/events/duplicates)`
    );
    console.log(`⏱️  Total Time: ${totalTime} minutes`);
    console.log(`📊 Classification Rate: ${((checkpoint.totalSaved / (checkpoint.totalSaved + checkpoint.totalSkipped)) * 100).toFixed(1)}% R&D projects\n`);

    // Clean up checkpoint file after successful completion
    if (!config.dryRun) {
      await deleteCheckpoint();
      console.log('🗑️  Checkpoint file deleted (scraping complete)\n');
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
 *
 * IMPORTANT: NTIS does NOT accept date filters via URL query parameters.
 * Date filtering MUST be done via form submission (POST request).
 *
 * Strategy (updated based on manual verification with MCP Playwright):
 * 1. Establish session by visiting main NTIS page (avoids bot detection)
 * 2. Navigate to announcements page (/rndgate/eg/un/ra/mng.do)
 * 3. Set dates using jQuery Datepicker API (not direct input.value)
 * 4. Call fn_search() to submit form (not form.submit())
 * 5. Wait for results to load
 *
 * Form structure:
 * - Form ID: rndMngForm (method: POST)
 * - FROM date field: searchCondition2 (readonly, controlled by datepicker widget)
 * - TO date field: searchCondition3 (readonly, controlled by datepicker widget)
 * - Page field: pageIndex (hidden input, 1-indexed)
 * - Submit function: fn_search(pageNum, '') - custom JavaScript function
 *
 * @param page - Playwright page instance
 * @param config - Script configuration with date range
 * @param pageNum - Page number to navigate to (1-indexed)
 */
async function navigateToFilteredResults(
  page: Page,
  config: ScriptConfig,
  pageNum: number
): Promise<void> {
  const fromDate = config.fromDate.replace(/-/g, '.'); // Convert YYYY-MM-DD → YYYY.MM.DD
  const toDate = config.toDate.replace(/-/g, '.');

  // Parse dates for datepicker UI interaction
  const [fromYear, fromMonth, fromDay] = config.fromDate.split('-').map(Number);
  const [toYear, toMonth, toDay] = config.toDate.split('-').map(Number);

  // Navigate to base URL first (if not already there)
  const currentUrl = page.url();

  // Establish session on first page by visiting main NTIS site (avoid bot detection)
  if (pageNum === 1 && !currentUrl.includes('ntis.go.kr')) {
    console.log('🔐 Establishing session with NTIS main page...');
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
  // Note: Input fields are readonly and controlled by datepicker widget
  // Must use jQuery's datepicker('setDate') to properly set the date values

  // Set start date using datepicker API
  await page.evaluate(({ year, month, day }) => {
    const $ = (window as any).$;
    if (!$ || !$.datepicker) {
      throw new Error('jQuery Datepicker not available');
    }

    const startInput = $('#searchCondition2');
    if (startInput.length && startInput.datepicker) {
      // Month is 0-indexed in JavaScript Date
      startInput.datepicker('setDate', new Date(year, month - 1, day));
    }
  }, { year: fromYear, month: fromMonth, day: fromDay });

  // Set end date using datepicker API
  await page.evaluate(({ year, month, day }) => {
    const $ = (window as any).$;
    const endInput = $('#searchCondition3');
    if (endInput.length && endInput.datepicker) {
      // Month is 0-indexed in JavaScript Date
      endInput.datepicker('setDate', new Date(year, month - 1, day));
    }
  }, { year: toYear, month: toMonth, day: toDay });

  await page.waitForTimeout(500);

  // Set page index (if not page 1)
  if (pageNum > 1) {
    await page.evaluate((pageIndex) => {
      const pageInput = document.getElementById('pageIndex') as HTMLInputElement;
      if (pageInput) pageInput.value = String(pageIndex);
    }, pageNum);
  }

  // Submit form by calling fn_search()
  // Note: NTIS uses a custom fn_search('1', '') function, not standard form.submit()
  await page.evaluate((pNum) => {
    if (typeof (window as any).fn_search === 'function') {
      (window as any).fn_search(String(pNum), '');
    } else {
      console.error('fn_search function not found');
    }
  }, pageNum);

  // Wait for results to load after form submission
  await page.waitForLoadState('domcontentloaded', { timeout: 30000 });
  await page.waitForTimeout(3000);
  await page.waitForLoadState('networkidle', { timeout: 30000 });
}

/**
 * Discover total number of pages for the date range
 *
 * Strategy:
 * 1. Navigate to first page with date filter (via form submission)
 * 2. Extract pagination info from page (e.g., "95 페이지" or "처음 이전 1 2 3 ... 95 다음 끝")
 * 3. Return total page count
 */
async function discoverTotalPages(
  page: Page,
  config: ScriptConfig
): Promise<number> {
  console.log('🔍 Discovering total pages...');

  // Use form submission to apply date filter
  await navigateToFilteredResults(page, config, 1);

  try {
    // Method 1: Count total results and calculate pages
    // NTIS shows "검색결과: 950건" format - this is the most reliable method
    const bodyText = await page.textContent('body');
    const resultsMatch = bodyText?.match(/검색결과[:\s]*(\d+)\s*건/i); // "검색결과: 950건" or "검색결과 950건"

    if (resultsMatch) {
      const totalResults = parseInt(resultsMatch[1], 10);
      const estimatedPages = Math.ceil(totalResults / 10); // NTIS shows 10 results per page
      console.log(
        `   ✓ Found ${totalResults} total announcements → ${estimatedPages} pages`
      );
      return estimatedPages;
    }

    // Method 2: Extract from pagination links
    // NTIS pagination format: "처음 이전 91 92 93 94 95 다음 끝"
    // Look for pagination container (various possible selectors)
    const paginationSelectors = [
      '.paging',
      '.pagination',
      'div.paging',
      'div[class*="pag"]',
      'td[colspan] a[href*="pageIndex"]', // Pagination links
    ];

    for (const selector of paginationSelectors) {
      try {
        const paginationEl = await page.$(selector);
        if (paginationEl) {
          const paginationHTML = await paginationEl.innerHTML();

          // Extract all page numbers from href="...pageIndex=N" links
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

          // Fallback: Extract numbers from visible text (be careful - might include other numbers)
          const paginationText = await paginationEl.textContent();
          if (paginationText) {
            // Only consider numbers that look like page numbers (1-999)
            const numbers = paginationText.match(/\b(\d{1,3})\b/g);
            if (numbers && numbers.length > 0) {
              const pageNumbers = numbers.map(Number).filter(n => n > 0 && n < 1000);
              if (pageNumbers.length > 0) {
                const maxPage = Math.max(...pageNumbers);
                console.log(`   ✓ Found ${maxPage} pages from pagination text`);
                return maxPage;
              }
            }
          }
        }
      } catch (err) {
        // Try next selector
        continue;
      }
    }

    // Fallback: Default to 100 pages (conservative estimate)
    console.warn('   ⚠️  Could not determine total pages - defaulting to 100');
    return 100;
  } catch (error: any) {
    console.warn(
      `   ⚠️  Error discovering pages: ${error.message} - defaulting to 100`
    );
    return 100;
  }
}

/**
 * Extract announcements from NTIS list page
 *
 * Reuses NTIS selectors from config:
 * - title: td:nth-child(4) a
 * - link: td:nth-child(4) a
 * - ntisId: td:nth-child(2)
 * - status: td:nth-child(3) (접수중/마감)
 * - ministry: td:nth-child(5)
 * - startDate: td:nth-child(6)
 * - deadline: td:nth-child(7)
 * - dday: td:nth-child(8)
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
    dday?: string;
  }>
> {
  const announcements = await page.$$eval(
    ntisConfig.selectors.announcementList,
    (elements, selectors) => {
      return elements.map((el) => {
        // Extract fields using selectors
        const titleEl = el.querySelector(selectors.title);
        const linkEl = el.querySelector(selectors.link);
        const ntisIdEl = el.querySelector(selectors.ntisId || '');
        const statusEl = el.querySelector(selectors.status || '');
        const ministryEl = el.querySelector(selectors.ministry || '');
        const startDateEl = el.querySelector(selectors.startDate || '');
        const deadlineEl = el.querySelector(selectors.deadline || '');
        const ddayEl = el.querySelector(selectors.dday || '');

        return {
          title: titleEl?.textContent?.trim() || '',
          link: linkEl?.getAttribute('href') || '',
          ntisId: ntisIdEl?.textContent?.trim(),
          status: statusEl?.textContent?.trim(),
          ministry: ministryEl?.textContent?.trim(),
          startDate: startDateEl?.textContent?.trim(),
          deadline: deadlineEl?.textContent?.trim(),
          dday: ddayEl?.textContent?.trim(),
        };
      });
    },
    ntisConfig.selectors
  );

  // Filter out empty rows and normalize URLs
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
 * Save checkpoint to file for resume capability
 */
async function saveCheckpoint(checkpoint: Checkpoint): Promise<void> {
  const fs = await import('fs/promises');
  const checkpointPath = '/tmp/ntis-historical-checkpoint.json';

  await fs.writeFile(checkpointPath, JSON.stringify(checkpoint, null, 2));
}

/**
 * Load checkpoint from file
 */
async function loadCheckpoint(): Promise<Checkpoint> {
  try {
    const fs = await import('fs/promises');
    const checkpointPath = '/tmp/ntis-historical-checkpoint.json';

    const data = await fs.readFile(checkpointPath, 'utf-8');
    const checkpoint = JSON.parse(data);

    console.log('📂 Loaded checkpoint:');
    console.log(`   Last page: ${checkpoint.lastProcessedPage}`);
    console.log(`   Total saved: ${checkpoint.totalSaved}`);
    console.log(`   Total skipped: ${checkpoint.totalSkipped}\n`);

    return checkpoint;
  } catch (error) {
    console.log('   No checkpoint found - starting fresh\n');
    return {
      lastProcessedPage: 0,
      lastProcessedId: null,
      totalProcessed: 0,
      totalSaved: 0,
      totalSkipped: 0,
    };
  }
}

/**
 * Delete checkpoint file after successful completion
 */
async function deleteCheckpoint(): Promise<void> {
  try {
    const fs = await import('fs/promises');
    const checkpointPath = '/tmp/ntis-historical-checkpoint.json';
    await fs.unlink(checkpointPath);
  } catch (error) {
    // Ignore errors (file might not exist)
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
