/**
 * Scraping Worker (with Cache Invalidation)
 *
 * Bull queue worker that processes scraping jobs for 4 NTIS agencies.
 * Uses Playwright for browser automation and change detection via SHA-256 hashing.
 *
 * Cache invalidation:
 * - After successful scraping: Invalidates programs cache and all match caches
 * - Ensures users get fresh matches after new programs are added
 */

import { Worker, Job } from 'bullmq';
import { chromium, Browser, Page } from 'playwright';
import { db } from '@/lib/db';
import { AgencyId } from '@prisma/client';
import {
  RateLimiter,
  generateProgramHash,
  logScraping,
  getRandomUserAgent,
} from './utils';
import { scrapingConfig, AgencyConfig } from './config';
import { sendNewMatchNotification } from '../email/notifications';
import { parseProgramDetails } from './parsers';
import {
  invalidateProgramsCache,
  invalidateAllMatches,
} from '@/lib/cache/redis-cache';
import { startScheduler } from './scheduler';
import { startNTISScheduler } from '../ntis-api/scheduler';


// Job data interface
interface ScrapingJobData {
  agency: string;
  url: string;
  config: AgencyConfig;
  priority?: 'high' | 'standard';
}

// Result interface
interface ScrapingResult {
  agency: string;
  success: boolean;
  programsFound: number;
  programsNew: number;
  programsUpdated: number;
  timestamp: Date;
  error?: string;
}

/**
 * Main scraping worker
 */
export const scrapingWorker = new Worker<ScrapingJobData, ScrapingResult>(
  'scraping-queue',
  async (job: Job<ScrapingJobData>) => {
    const { agency, url, config } = job.data;

    logScraping(agency, `Starting scrape job ${job.id}...`);

    let browser: Browser | null = null;

    try {
      // 1. Launch Playwright browser
      browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
          '--disable-dev-shm-usage',
        ],
      });

      // 2. Create context with stealth settings
      const context = await browser.newContext({
        userAgent:
          process.env.SCRAPER_USER_AGENT ||
          'Mozilla/5.0 (compatible; ConnectBot/1.0; +https://connect.kr/bot)',
        viewport: {
          width: 1280 + Math.floor(Math.random() * 100),
          height: 800 + Math.floor(Math.random() * 100),
        },
        locale: 'ko-KR',
        timezoneId: 'Asia/Seoul',
        extraHTTPHeaders: {
          'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
          'Accept-Encoding': 'gzip, deflate, br',
          Connection: 'keep-alive',
        },
      });

      const page = await context.newPage();
      page.setDefaultTimeout(config.timeout || 30000);

      // Remove webdriver flag (using addInitScript for newer Playwright)
      await page.addInitScript(() => {
        delete (Object.getPrototypeOf(navigator) as any).webdriver;
      });

      // 3. Navigate to agency listings page
      logScraping(agency, `Navigating to ${url}...`);
      await page.goto(url, { waitUntil: 'networkidle', timeout: config.timeout });

      // 4. Extract announcements from listing page
      const announcements = await extractAnnouncements(page, config, agency);
      logScraping(agency, `Found ${announcements.length} announcements`);

      // 5. Process each announcement
      const rateLimiter = new RateLimiter(config.rateLimit.requestsPerMinute);
      let programsNew = 0;
      let programsUpdated = 0;

      for (const announcement of announcements) {
        try {
          // Rate limiting
          await rateLimiter.throttle();

          // Generate content hash for change detection
          const contentHash = generateProgramHash({
            agencyId: agency,
            title: announcement.title,
            announcementUrl: announcement.link,
          });

          // Check if program already exists
          const existingProgram = await db.funding_programs.findFirst({
            where: { contentHash },
          });

          if (!existingProgram) {
            // NEW PROGRAM - Fetch details
            logScraping(agency, `New program: ${announcement.title.substring(0, 50)}...`);

            const details = await fetchProgramDetails(
              page,
              announcement.link,
              config,
              agency
            );

            // Convert targetType string to array format for Prisma
            const targetTypeArray =
              details.targetType === 'BOTH'
                ? ['COMPANY' as const, 'RESEARCH_INSTITUTE' as const]
                : details.targetType === 'COMPANY'
                ? ['COMPANY' as const]
                : details.targetType === 'RESEARCH_INSTITUTE'
                ? ['RESEARCH_INSTITUTE' as const]
                : ['COMPANY' as const, 'RESEARCH_INSTITUTE' as const]; // Default to BOTH

            // Create new program
            const newProgram = await db.funding_programs.create({
              data: {
                agencyId: agency.toUpperCase() as AgencyId,
                title: announcement.title,
                description: details.description || null,
                announcementUrl: announcement.link,
                deadline: details.deadline || null,
                budgetAmount: details.budgetAmount || null,
                targetType: targetTypeArray,
                minTrl: details.minTRL || null,
                maxTrl: details.maxTRL || null,
                eligibilityCriteria: details.eligibilityCriteria || undefined,
                contentHash,
                scrapedAt: new Date(),
                scrapingSource: announcement.link, // ✅ SET scrapingSource for identifying real scraped programs
                status: 'ACTIVE',
              },
            });

            programsNew++;

            // Trigger match calculation (async, don't wait)
            calculateMatchesForProgram(newProgram.id).catch((err) =>
              console.error(`Match calculation failed for program ${newProgram.id}:`, err)
            );

            // Trigger email notifications for high-score matches (async, don't wait)
            sendMatchNotifications(newProgram.id).catch((err) =>
              console.error(`Match notifications failed for program ${newProgram.id}:`, err)
            );
          } else {
            // Existing program - update scrapedAt
            await db.funding_programs.update({
              where: { id: existingProgram.id },
              data: { scrapedAt: new Date() },
            });

            programsUpdated++;
          }
        } catch (err: any) {
          logScraping(
            agency,
            `Failed to process announcement: ${err.message}`,
            'error'
          );
          // Continue to next announcement
        }
      }

      await browser.close();

      // 6. Log result to database
      const completedAt = new Date();
      const startedAt = new Date(job.timestamp); // Job start time

      await db.scraping_logs.create({
        data: {
          agencyId: agency.toUpperCase() as AgencyId,
          success: true,
          programsFound: announcements.length,
          programsNew,
          programsUpdated,
          startedAt,
          completedAt,
          duration: completedAt.getTime() - startedAt.getTime(),
        },
      });

      logScraping(
        agency,
        `Scraping completed: ${programsNew} new, ${programsUpdated} updated`
      );

      // 7. Invalidate caches (programs and matches need refresh)
      if (programsNew > 0 || programsUpdated > 0) {
        logScraping(agency, 'Invalidating programs and match caches...');
        await invalidateProgramsCache();
        const matchesInvalidated = await invalidateAllMatches();
        logScraping(
          agency,
          `Cache invalidated: programs + ${matchesInvalidated} match caches`
        );
      }

      return {
        agency,
        success: true,
        programsFound: announcements.length,
        programsNew,
        programsUpdated,
        timestamp: new Date(),
      };
    } catch (error: any) {
      logScraping(agency, `Scraping failed: ${error.message}`, 'error');

      if (browser) {
        await browser.close();
      }

      // Log failure to database
      const completedAt = new Date();
      const startedAt = new Date(job.timestamp);

      await db.scraping_logs.create({
        data: {
          agencyId: agency.toUpperCase() as AgencyId,
          success: false,
          programsFound: 0,
          programsNew: 0,
          programsUpdated: 0,
          error: error.message,
          startedAt,
          completedAt,
          duration: completedAt.getTime() - startedAt.getTime(),
        },
      });

      throw error; // Re-throw for Bull retry logic
    }
  },
  {
    connection: {
      host: process.env.REDIS_QUEUE_HOST || 'localhost',
      port: parseInt(process.env.REDIS_QUEUE_PORT || '6380'),
    },
    concurrency: 2, // Max 2 simultaneous scraping jobs
  }
);

/**
 * Extract announcements from listing page
 */
async function extractAnnouncements(
  page: Page,
  config: AgencyConfig,
  agency: string
): Promise<Array<{ title: string; link: string }>> {
  const announcements = await page.$$eval(
    config.selectors.announcementList,
    (elements, selectors) => {
      return elements.map((el) => {
        const titleEl = el.querySelector(selectors.title);
        const linkEl = el.querySelector(selectors.link);

        return {
          title: titleEl?.textContent?.trim() || '',
          link: linkEl?.getAttribute('href') || '',
        };
      });
    },
    config.selectors
  );

  // Filter out empty titles/links
  return announcements.filter((a) => a.title && a.link);
}

/**
 * Fetch detailed program information using agency-specific parsers
 */
async function fetchProgramDetails(
  page: Page,
  link: string,
  config: AgencyConfig,
  agency: string
): Promise<{
  description: string | null;
  deadline: Date | null;
  budgetAmount: number | null;
  targetType: 'COMPANY' | 'RESEARCH_INSTITUTE' | 'BOTH';
  minTRL: number | null;
  maxTRL: number | null;
  eligibilityCriteria: Record<string, any> | null;
}> {
  try {
    // Navigate to detail page
    const fullUrl = link.startsWith('http') ? link : config.baseUrl + link;

    // Use agency-specific parser
    const details = await parseProgramDetails(page, agency, fullUrl);

    logScraping(
      agency,
      `Parsed details: deadline=${details.deadline ? 'found' : 'none'}, budget=${details.budgetAmount ? 'found' : 'none'}, targetType=${details.targetType}`
    );

    return details;
  } catch (err: any) {
    logScraping(agency, `Failed to fetch details: ${err.message}`, 'warn');
    return {
      description: null,
      deadline: null,
      budgetAmount: null,
      targetType: 'BOTH',
      minTRL: null,
      maxTRL: null,
      eligibilityCriteria: null,
    };
  }
}

/**
 * Send email notifications for new high-score matches
 */
async function sendMatchNotifications(programId: string): Promise<void> {
  try {
    // Get all matches for this program with score >= 70
    const highScoreMatches = await db.funding_matches.findMany({
      where: {
        programId,
        score: { gte: 70 }, // Only high-score matches
      },
      include: {
        organizations: {
          include: {
            users: {
              select: { id: true },
            },
          },
        },
      },
    });

    // Group matches by user
    const matchesByUser = new Map<string, string[]>();

    for (const match of highScoreMatches) {
      for (const user of match.organizations.users) {
        if (!matchesByUser.has(user.id)) {
          matchesByUser.set(user.id, []);
        }
        matchesByUser.get(user.id)!.push(match.id);
      }
    }

    // Send notifications to each user
    for (const [userId, matchIds] of matchesByUser.entries()) {
      try {
        await sendNewMatchNotification(userId, matchIds);
      } catch (err) {
        console.error(`Failed to send notification to user ${userId}:`, err);
      }
    }
  } catch (error) {
    console.error('Failed to send match notifications:', error);
  }
}

/**
 * Calculate matches for a newly scraped program
 */
async function calculateMatchesForProgram(programId: string): Promise<void> {
  // Get all active organizations
  const organizations = await db.organizations.findMany({
    where: { status: 'ACTIVE' },
  });

  const program = await db.funding_programs.findUnique({
    where: { id: programId },
  });

  if (!program) return;

  for (const org of organizations) {
    // Simple matching logic (from Phase 2A)
    let score = 0;
    const explanation: string[] = [];

    // Target type matching (40 points)
    if (
      (program.targetType.includes('COMPANY' as any) && program.targetType.includes('RESEARCH_INSTITUTE' as any)) ||
      program.targetType.includes(org.type)
    ) {
      score += 40;
      explanation.push('조직 유형이 적합합니다');
    }

    // Industry matching (20 points) - simplified
    if (program.title.includes(org.industrySector || '')) {
      score += 20;
      explanation.push('산업 분야가 일치합니다');
    }

    // R&D experience (20 points)
    if (org.rdExperience) {
      score += 20;
      explanation.push('R&D 경험이 있습니다');
    }

    // Only create match if score >= 60
    if (score >= 60) {
      await db.funding_matches.upsert({
        where: {
          organizationId_programId: {
            organizationId: org.id,
            programId: program.id,
          },
        },
        create: {
          organizationId: org.id,
          programId: program.id,
          score,
          explanation,
        },
        update: {
          score,
          explanation,
        },
      });
    }
  }
}

/**
 * Worker event handlers
 */
scrapingWorker.on('completed', (job, result) => {
  logScraping(
    result.agency,
    `Job ${job.id} completed: ${result.programsNew} new, ${result.programsUpdated} updated`
  );
});

scrapingWorker.on('failed', (job, err) => {
  if (job) {
    logScraping(job.data.agency, `Job ${job.id} failed: ${err.message}`, 'error');
  }
});

// Start schedulers on worker initialization
console.log('🚀 Initializing schedulers...');
startScheduler();         // Playwright scraper (9 AM, 3 PM KST)
startNTISScheduler();     // NTIS API scraper (9 AM KST daily)
console.log('✅ Schedulers initialized successfully');

export default scrapingWorker;
