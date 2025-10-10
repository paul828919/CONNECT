/**
 * Scraping Scheduler
 *
 * Schedules scraping jobs using node-cron:
 * - Normal mode: 2x daily (9 AM, 3 PM KST)
 * - Peak season (Jan-Mar): 4x daily (9 AM, 12 PM, 3 PM, 6 PM KST)
 */

import cron from 'node-cron';
import { Queue } from 'bullmq';
import { getAllAgencyConfigs } from './config';
import { isPeakSeason, logScraping } from './utils';

// Bull queue for scraping jobs
export const scrapingQueue = new Queue('scraping-queue', {
  connection: {
    host: process.env.REDIS_QUEUE_HOST || 'localhost',
    port: parseInt(process.env.REDIS_QUEUE_PORT || '6380'),
  },
});

/**
 * Queue scraping jobs for all agencies
 */
async function queueScrapingJobs(priority: 'high' | 'standard' = 'standard') {
  const agencies = getAllAgencyConfigs();

  for (const agencyConfig of agencies) {
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
 */
export function startScheduler() {
  console.log('🚀 Starting scraping scheduler...');

  // Normal mode: 2x daily (9 AM, 3 PM KST)
  // Cron format: minute hour day month weekday
  cron.schedule(
    '0 9,15 * * *',
    async () => {
      if (!isPeakSeason()) {
        console.log('⏰ Running normal mode scrape (2x daily)...');
        await queueScrapingJobs('standard');
      }
    },
    {
      timezone: 'Asia/Seoul',
    }
  );

  // Peak season mode: 4x daily (9 AM, 12 PM, 3 PM, 6 PM KST)
  cron.schedule(
    '0 9,12,15,18 * * *',
    async () => {
      if (isPeakSeason()) {
        console.log('⏰ Running peak season scrape (4x daily)...');
        await queueScrapingJobs('high');
      }
    },
    {
      timezone: 'Asia/Seoul',
    }
  );

  console.log('✓ Scraping scheduler started successfully');
  console.log(`  - Normal mode: 9 AM, 3 PM KST (2x daily)`);
  console.log(`  - Peak season (Jan-Mar): 9 AM, 12 PM, 3 PM, 6 PM KST (4x daily)`);
  console.log(`  - Current mode: ${isPeakSeason() ? 'PEAK SEASON (4x)' : 'NORMAL (2x)'}`);
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
