/**
 * Scraping Scheduler (NTIS-only mode)
 *
 * Schedules NTIS announcement scraping using node-cron:
 * - Fixed schedule: 9 AM + 3 PM KST daily (2x daily)
 * - Target: NTIS funding announcements only (IITP, KEIT, TIPA, KIMST disabled)
 */

import cron from 'node-cron';
import { Queue } from 'bullmq';
import { getAllAgencyConfigs } from './config';
import { logScraping } from './utils';

// Bull queue for scraping jobs
export const scrapingQueue = new Queue('scraping-queue', {
  connection: {
    host: process.env.REDIS_QUEUE_HOST || 'localhost',
    port: parseInt(process.env.REDIS_QUEUE_PORT || '6380'),
  },
});

/**
 * Queue scraping jobs for NTIS only
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
 * NTIS-only mode: 9 AM + 3 PM daily (fixed schedule)
 */
export function startScheduler() {
  console.log('🚀 Starting NTIS announcement scraping scheduler...');

  // Fixed schedule: 9 AM + 3 PM KST daily
  // Cron format: minute hour day month weekday
  cron.schedule(
    '0 9,15 * * *',
    async () => {
      console.log('⏰ Running NTIS announcement scrape (9 AM + 3 PM daily)...');
      await queueScrapingJobs('standard');
    },
    {
      timezone: 'Asia/Seoul',
    }
  );

  console.log('✓ NTIS announcement scraping scheduler started successfully');
  console.log(`  - Schedule: 9 AM + 3 PM KST (2x daily)`);
  console.log(`  - Target: NTIS funding announcements only`);
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
