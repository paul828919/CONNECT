/**
 * Scraping Scheduler (NTIS-only mode)
 *
 * Schedules NTIS announcement scraping using node-cron:
 * - Fixed schedule: 10 AM + 2 PM KST daily (2x daily) - Updated Nov 20, 2025
 * - Date range: Yesterday to today (dynamic KST-based calculation)
 * - Target: NTIS funding announcements only (IITP, KEIT, TIPA, KIMST disabled)
 * - Architecture: Runs standalone Discovery Scraper script → Triggers Process Worker via BullMQ
 */

import cron from 'node-cron';
import { Queue } from 'bullmq';
import { getAllAgencyConfigs } from './config';
import { logScraping } from './utils';
import { getYesterdayToTodayRange } from './utils/date-utils';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Bull queue for scraping jobs
export const scrapingQueue = new Queue('scraping-queue', {
  connection: {
    host: process.env.REDIS_QUEUE_HOST || 'localhost',
    port: parseInt(process.env.REDIS_QUEUE_PORT || '6380'),
  },
});

/**
 * Run Discovery Scraper script and trigger Process Worker
 * NOTE: Runs standalone script with "yesterday to today" date range
 */
async function runDiscoveryScraper() {
  const { fromDate, toDate } = getYesterdayToTodayRange();

  console.log(`  📅 Date range: ${fromDate} → ${toDate}`);
  console.log(`  🔍 Running Discovery Scraper...`);

  try {
    // Run Discovery Scraper script
    const command = `npx tsx scripts/scrape-ntis-discovery.ts --fromDate ${fromDate} --toDate ${toDate}`;
    const { stdout, stderr } = await execAsync(command, {
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large outputs
    });

    console.log(stdout);
    if (stderr) {
      console.error('  ⚠️  Discovery Scraper stderr:', stderr);
    }

    console.log('  ✅ Discovery Scraper completed successfully');

    // Trigger Process Worker via BullMQ event
    const scrapingSession = `${fromDate}-${toDate}-${Date.now()}`;
    await triggerProcessWorker(scrapingSession);

    console.log('  📤 Process Worker trigger queued');
  } catch (err: any) {
    console.error('  ❌ Discovery Scraper failed:', err.message);
    if (err.stdout) console.log('  📋 stdout:', err.stdout);
    if (err.stderr) console.error('  📋 stderr:', err.stderr);
    throw err;
  }
}

/**
 * Run Discovery Scraper with retry logic for transient failures
 * Handles DNS resolution errors during container restarts
 */
async function runDiscoveryScraperWithRetry(maxRetries = 2): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await runDiscoveryScraper();
      return;
    } catch (err: any) {
      const isTransient = err.message?.includes('ENOTFOUND') ||
                          err.message?.includes('ECONNREFUSED') ||
                          err.message?.includes('ETIMEDOUT');

      if (attempt === maxRetries || !isTransient) {
        console.error(`  ❌ Discovery Scraper failed after ${attempt} attempts`);
        throw err;
      }

      console.log(`  🔄 Retry ${attempt}/${maxRetries} after transient failure...`);
      await new Promise(r => setTimeout(r, 30000)); // 30s delay before retry
    }
  }
}

/**
 * Trigger Process Worker via BullMQ event
 * Queues a job to start the Process Worker after Discovery Scraper completes
 */
async function triggerProcessWorker(scrapingSession: string) {
  await scrapingQueue.add(
    'process-worker-trigger',
    {
      scrapingSession,
      triggeredAt: new Date().toISOString(),
    },
    {
      priority: 1, // High priority
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    }
  );
}

/**
 * Queue scraping jobs for NTIS only (LEGACY - kept for manual trigger)
 * NOTE: Only NTIS Announcement Scraper is active (IITP, KEIT, TIPA, KIMST disabled)
 */
async function queueScrapingJobs(priority: 'high' | 'standard' = 'standard') {
  const agencies = getAllAgencyConfigs();

  // Filter to NTIS only
  const ntisOnly = agencies.filter(a => a.id === 'ntis');

  for (const agencyConfig of ntisOnly) {
    try {
      await scrapingQueue.add(
        `scrape-${agencyConfig.id}`,
        {
          agency: agencyConfig.id,
          url: agencyConfig.baseUrl + agencyConfig.listingPath,
          config: agencyConfig,
          priority,
        },
        {
          priority: priority === 'high' ? 1 : 5,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000, // 5 seconds base delay
          },
          removeOnComplete: {
            count: 100, // Keep last 100 completed jobs
          },
          removeOnFail: {
            count: 50, // Keep last 50 failed jobs
          },
        }
      );

      logScraping(agencyConfig.id, `Queued scraping job (priority: ${priority})`);
    } catch (err: any) {
      logScraping(agencyConfig.id, `Failed to queue job: ${err.message}`, 'error');
    }
  }
}

/**
 * Start scraping scheduler
 * NTIS-only mode: 10 AM + 2 PM KST daily (updated Nov 20, 2025)
 *
 * UTC Conversion (standard for all backend services):
 * - 10:00 KST = 01:00 UTC
 * - 14:00 KST = 05:00 UTC
 */
export function startScheduler() {
  console.log('🚀 Starting NTIS announcement scraping scheduler...');

  // Fixed schedule: 10 AM + 2 PM KST daily
  // Expressed in UTC for consistency: 01:00 UTC + 05:00 UTC
  // Cron format: minute hour day month weekday
  cron.schedule(
    '0 1,5 * * *',
    async () => {
      const kstTime = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
      console.log(`⏰ Running NTIS announcement scrape (KST: ${kstTime})...`);
      await runDiscoveryScraperWithRetry();
    },
    {
      timezone: 'UTC',
    }
  );

  console.log('✓ NTIS announcement scraping scheduler started successfully');
  console.log(`  - Schedule: 10 AM + 2 PM KST (01:00 + 05:00 UTC)`);
  console.log(`  - Date Range: Yesterday to today (dynamic)`);
  console.log(`  - Target: NTIS funding announcements only`);
  console.log(`  - Architecture: Discovery Scraper → Process Worker (event-driven)`);
}

/**
 * Manually trigger scraping (for testing or admin dashboard)
 */
export async function triggerManualScrape(
  agencyId?: string
): Promise<{ success: boolean; message: string }> {
  try {
    if (agencyId) {
      // Scrape single agency
      const agencies = getAllAgencyConfigs();
      const agencyConfig = agencies.find((a) => a.id === agencyId.toLowerCase());

      if (!agencyConfig) {
        return {
          success: false,
          message: `Agency '${agencyId}' not found`,
        };
      }

      await scrapingQueue.add(
        `scrape-${agencyConfig.id}-manual`,
        {
          agency: agencyConfig.id,
          url: agencyConfig.baseUrl + agencyConfig.listingPath,
          config: agencyConfig,
          priority: 'high',
        },
        {
          priority: 1,
          attempts: 3,
        }
      );

      return {
        success: true,
        message: `Manual scrape queued for ${agencyConfig.name}`,
      };
    } else {
      // Scrape all agencies
      await queueScrapingJobs('high');
      return {
        success: true,
        message: 'Manual scrape queued for all agencies',
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to queue manual scrape: ${err.message}`,
    };
  }
}

/**
 * Get queue statistics
 */
export async function getQueueStats() {
  const [waiting, active, completed, failed] = await Promise.all([
    scrapingQueue.getWaitingCount(),
    scrapingQueue.getActiveCount(),
    scrapingQueue.getCompletedCount(),
    scrapingQueue.getFailedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    total: waiting + active + completed + failed,
  };
}
