/**
 * NTIS API Scheduler
 *
 * ⚠️ WARNING: This scheduler is for completed/in-progress research PROJECTS, NOT announcements
 *
 * Data Source: NTIS API (https://www.ntis.go.kr/openapi)
 * - Provides: Completed and in-progress research project data (736,923+ projects)
 * - Does NOT provide: Funding announcements (공고) for new opportunities
 *
 * For funding announcements, use: /lib/scraping/scheduler.ts (NTIS Announcement Scraper via Playwright)
 *
 * Status: DISABLED (not needed for primary use case)
 * Original Purpose: Historical R&D project database integration (Week 6)
 */

import cron from 'node-cron';
import { NTISApiScraper } from './scraper';

/**
 * Start NTIS API automated scheduler
 *
 * ⚠️ WARNING: This scrapes COMPLETED/IN-PROGRESS research projects, NOT funding announcements
 *
 * Schedule: Daily at 9:00 AM KST (CURRENTLY DISABLED)
 * Purpose: Fetch historical R&D project data from NTIS API (736,923+ projects)
 * Data: Research projects already completed or in progress
 * NOT for: Funding announcements (공고) - use NTIS Announcement Scraper instead
 */
export function startNTISScheduler(): void {
  console.log('🚀 Starting NTIS API scheduler...');

  // Daily scraping at 9:00 AM KST
  // Cron expression: '0 9 * * *' = minute 0, hour 9, every day
  cron.schedule('0 9 * * *', async () => {
    console.log('⏰ [NTIS] Running daily NTIS API scraping...');

    try {
      const scraper = new NTISApiScraper();

      // Scrape last 30 days of programs
      // Note: NTIS API has 736,923+ programs; we focus on recent announcements
      const result = await scraper.scrapeAllAgencies(30);

      if (result.success) {
        console.log(`✅ [NTIS] Scraping completed successfully`);
        console.log(`   - Programs found: ${result.totalFound}`);
        console.log(`   - New programs: ${result.programsNew}`);
        console.log(`   - Updated programs: ${result.programsUpdated}`);
      } else {
        console.error(`❌ [NTIS] Scraping failed - check logs for details`);
      }
    } catch (error: any) {
      console.error('❌ [NTIS] Fatal error during scheduled scraping:', error.message);
      console.error('   Stack:', error.stack);
    }
  }, {
    timezone: 'Asia/Seoul',
  });

  console.log('✓ NTIS API scheduler started successfully');
  console.log('  - Schedule: Daily at 9:00 AM KST');
  console.log('  - Data source: NTIS API (736,923+ R&D programs)');
  console.log('  - Lookback window: 30 days');
}

/**
 * Trigger manual NTIS scraping (for testing or immediate refresh)
 *
 * @param daysBack - Number of days to look back (default: 30)
 * @returns Promise with scraping results
 */
export async function triggerManualNTISScrape(daysBack: number = 30): Promise<{
  success: boolean;
  programsNew: number;
  programsUpdated: number;
  totalFound: number;
}> {
  console.log(`🔧 [NTIS] Manual scraping triggered (${daysBack} days back)...`);

  try {
    const scraper = new NTISApiScraper();
    const result = await scraper.scrapeAllAgencies(daysBack);

    if (result.success) {
      console.log(`✅ [NTIS] Manual scraping completed`);
      console.log(`   - Programs found: ${result.totalFound}`);
      console.log(`   - New programs: ${result.programsNew}`);
      console.log(`   - Updated programs: ${result.programsUpdated}`);
    } else {
      console.error(`❌ [NTIS] Manual scraping failed`);
    }

    return result;
  } catch (error: any) {
    console.error('❌ [NTIS] Fatal error during manual scraping:', error.message);
    return {
      success: false,
      programsNew: 0,
      programsUpdated: 0,
      totalFound: 0,
    };
  }
}
