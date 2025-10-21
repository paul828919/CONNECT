/**
 * Cache Warming Scheduler
 *
 * Schedules automatic cache warming using node-cron:
 * - Daily at 06:00 KST (21:00 UTC previous day)
 * - Uses "smart" strategy: warms organizations active today + programs
 * - Runs only in app1 container (check INSTANCE_ID)
 *
 * Phase 3: Cache Optimization - Week 9 Automation
 */

import cron from 'node-cron';
import { smartWarmCache, warmProgramsCache } from './cache-warming';

/**
 * Start cache warming scheduler
 *
 * Schedules daily cache warming at 06:00 KST
 * Only call this from app1 container to avoid duplicate jobs
 */
export function startCacheWarmingScheduler() {
  console.log('🚀 Starting cache warming scheduler...');

  // Daily at 06:00 KST (21:00 UTC previous day)
  // Cron format: minute hour day month weekday
  cron.schedule(
    '0 21 * * *',
    async () => {
      console.log('⏰ [CACHE WARMING SCHEDULER] Running scheduled cache warming (06:00 KST)...');

      try {
        // Run smart warming strategy
        const result = await smartWarmCache();

        console.log('✅ [CACHE WARMING SCHEDULER] Cache warming complete:', {
          duration: result.duration ? `${(result.duration / 1000).toFixed(2)}s` : 'N/A',
          itemsWarmed: result.itemsWarmed,
          itemsSkipped: result.itemsSkipped,
          errors: result.errors,
          breakdown: result.breakdown,
        });

        // Log to help monitor success
        if (result.errors > 0) {
          console.warn(`⚠️ [CACHE WARMING SCHEDULER] Completed with ${result.errors} errors`);
        } else {
          console.log('🎉 [CACHE WARMING SCHEDULER] All items warmed successfully');
        }
      } catch (error: any) {
        console.error('❌ [CACHE WARMING SCHEDULER] Cache warming failed:', error.message);
        console.error('Stack trace:', error.stack);
      }
    },
    {
      timezone: 'Asia/Seoul', // Ensures correct timing for Korean business hours
    }
  );

  console.log('✓ Cache warming scheduler started successfully');
  console.log('  - Schedule: Daily at 06:00 KST (21:00 UTC)');
  console.log('  - Strategy: Smart warming (active organizations + programs)');
  console.log('  - Instance: app1 only (check INSTANCE_ID to prevent duplicates)');
}

/**
 * Manually trigger cache warming
 *
 * Useful for testing or emergency cache warming
 * Can be called from admin endpoints or maintenance scripts
 *
 * @returns Warming statistics
 */
export async function triggerManualCacheWarming(): Promise<{
  success: boolean;
  message: string;
  stats?: any;
}> {
  try {
    console.log('[CACHE WARMING SCHEDULER] Manual cache warming triggered');

    const result = await smartWarmCache();

    return {
      success: true,
      message: 'Cache warming completed successfully',
      stats: result,
    };
  } catch (error: any) {
    console.error('[CACHE WARMING SCHEDULER] Manual warming failed:', error);

    return {
      success: false,
      message: `Cache warming failed: ${error.message}`,
    };
  }
}

const cacheWarmingScheduler = {
  startCacheWarmingScheduler,
  triggerManualCacheWarming,
};

export default cacheWarmingScheduler;
