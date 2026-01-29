/**
 * SME24 Sync Cron Job
 *
 * Automated scheduler for synchronizing SME support programs from
 * 중소벤처24 API to the local database.
 *
 * Schedule: Twice daily at 02:00 UTC (11:00 KST) and 07:00 UTC (16:00 KST)
 * - Avoids conflicts with NTIS scraper (01:00, 05:00 UTC)
 * - Lightweight HTTP API calls (no Playwright/browser)
 * - Expected duration: 2-5 minutes per sync
 *
 * Post-sync: Tier 1 Enrichment automatically runs after successful sync
 * - Extracts eligibility criteria from text fields
 * - Updates targetRegionCodes, targetCompanyScale, etc.
 * - Expected duration: 1-2 minutes
 */

import cron from 'node-cron';
import { dailySync, syncSMEPrograms } from './program-service';
import { runTier1Enrichment } from './enrichment-service';

/**
 * Start the SME24 sync cron job
 *
 * Schedule: 0 2,7 * * * (02:00 and 07:00 UTC daily)
 * - 02:00 UTC = 11:00 KST (morning sync)
 * - 07:00 UTC = 16:00 KST (afternoon sync)
 *
 * This schedule was chosen to:
 * 1. Avoid overlap with NTIS Playwright scraper (01:00, 05:00 UTC)
 * 2. Catch new programs posted during Korean business hours
 * 3. Run lightweight HTTP calls at low-traffic times
 */
export function startSME24SyncCron(): void {
  // Validate that we're in a valid environment for cron
  if (typeof cron?.schedule !== 'function') {
    console.error('[SME24 Cron] node-cron not available');
    return;
  }

  // Schedule: Twice daily at 02:00 and 07:00 UTC
  cron.schedule(
    '0 2,7 * * *',
    async () => {
      const kstTime = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📋 [SME24 Cron] Starting scheduled sync (KST: ${kstTime})`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      try {
        const result = await dailySync();

        if (result.success) {
          console.log(`✓ [SME24 Cron] Sync completed successfully:`);
          console.log(`  - Programs found: ${result.programsFound}`);
          console.log(`  - Created: ${result.programsCreated}`);
          console.log(`  - Updated: ${result.programsUpdated}`);
          console.log(`  - Expired: ${result.programsExpired}`);
          console.log(`  - Duration: ${(result.duration / 1000).toFixed(1)}s`);

          // Schedule Tier 1 enrichment 1 minute after sync completes
          console.log('\n📊 [SME24 Cron] Enrichment scheduled to run in 1 minute...');
          setTimeout(async () => {
            const enrichStartTime = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
            console.log(`\n📊 [SME24 Cron] Starting Tier 1 enrichment (KST: ${enrichStartTime})`);
            try {
              const enrichResult = await runTier1Enrichment();

              if (enrichResult.success) {
                console.log(`✓ [SME24 Cron] Enrichment completed:`);
                console.log(`  - Programs processed: ${enrichResult.processed}`);
                console.log(`  - Updated: ${enrichResult.updated}`);
                console.log(`  - Skipped: ${enrichResult.skipped}`);
                console.log(`  - Regions extracted: ${enrichResult.breakdown.regions}`);
                console.log(`  - Company scale extracted: ${enrichResult.breakdown.companyScale}`);
                console.log(`  - Duration: ${(enrichResult.duration / 1000).toFixed(1)}s`);
              } else {
                console.error(`✗ [SME24 Cron] Enrichment failed`);
              }
            } catch (enrichError: any) {
              console.error('✗ [SME24 Cron] Enrichment error:', enrichError.message);
            }
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          }, 60 * 1000); // 1 minute delay
        } else {
          console.error(`✗ [SME24 Cron] Sync failed: ${result.errors.join(', ')}`);
        }
      } catch (error: any) {
        console.error('✗ [SME24 Cron] Unexpected error during sync:', error.message);
      }

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    },
    {
      timezone: 'UTC',
    }
  );

  console.log('✓ SME24 sync cron started (02:00 + 07:00 UTC / 11:00 + 16:00 KST)');
}

/**
 * Run an immediate full sync (for testing or manual triggers)
 *
 * This bypasses the cron schedule and runs a full sync immediately.
 * Useful for:
 * - Initial data population
 * - Testing after code changes
 * - Manual recovery after issues
 */
export async function runImmediateSync(): Promise<{
  success: boolean;
  programsFound: number;
  programsCreated: number;
  programsUpdated: number;
  programsExpired: number;
  errors: string[];
  duration: number;
}> {
  console.log('[SME24] Running immediate full sync...');

  try {
    // Full sync without date filtering to get all active programs
    const result = await syncSMEPrograms({}, true);
    return result;
  } catch (error: any) {
    console.error('[SME24] Immediate sync failed:', error.message);
    return {
      success: false,
      programsFound: 0,
      programsCreated: 0,
      programsUpdated: 0,
      programsExpired: 0,
      errors: [error.message],
      duration: 0,
    };
  }
}
