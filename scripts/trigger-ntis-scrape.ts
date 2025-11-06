/**
 * Trigger Immediate NTIS Announcement Scrape
 *
 * This script manually triggers an immediate NTIS announcement scrape
 * without waiting for the scheduled time (9 AM or 3 PM).
 *
 * Usage: npx tsx scripts/trigger-ntis-scrape.ts
 *
 * Prerequisites:
 * - Redis must be running on localhost:6380 (Bull queue dependency)
 * - Worker process must be running to process the queued job
 *
 * Note: This queues the job - the actual scraping happens asynchronously via the worker.
 */

import { triggerManualScrape } from '@/lib/scraping/scheduler';

async function triggerImmediateScrape() {
  console.log('🚀 Triggering immediate NTIS announcement scrape...');
  console.log('');
  console.log('📋 Configuration:');
  console.log('   - Target: NTIS funding announcements only');
  console.log('   - Source: https://www.ntis.go.kr/rndgate/eg/un/ra/mng.do');
  console.log('   - Priority: High (immediate processing)');
  console.log('');

  try {
    // Trigger manual scrape for NTIS only
    const result = await triggerManualScrape('ntis');

    if (result.success) {
      console.log('✅ NTIS scraping job queued successfully!');
      console.log('');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`✅ ${result.message}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');
      console.log('📊 What happens next:');
      console.log('   1. Job is queued in Redis (scraping-queue)');
      console.log('   2. Worker picks up job and launches Playwright browser');
      console.log('   3. Scrapes NTIS list page for announcements');
      console.log('   4. Extracts deadline from list page (95% success rate)');
      console.log('   5. Creates new funding programs in database');
      console.log('   6. Generates matches for active organizations');
      console.log('   7. Sends email notifications for high-score matches');
      console.log('');
      console.log('⏱️  Expected time: 1-2 minutes (90% faster than old method)');
      console.log('');
      console.log('💡 Monitor progress:');
      console.log('   - Check worker logs for real-time updates');
      console.log('   - Check scraping_logs table for results');
      console.log('   - Scheduled scrapes will continue at 9 AM + 3 PM daily');
    } else {
      console.error('❌ Failed to queue NTIS scraping job');
      console.error(`   Error: ${result.message}`);
      process.exit(1);
    }
  } catch (error: any) {
    console.error('❌ Error triggering NTIS scrape:', error.message);
    console.error('Stack:', error.stack);
    console.error('');
    console.error('🔍 Troubleshooting:');
    console.error('   1. Ensure Redis is running: redis-cli ping');
    console.error('   2. Check Redis connection in .env: REDIS_QUEUE_HOST, REDIS_QUEUE_PORT');
    console.error('   3. Verify worker process is running');
    process.exit(1);
  }
}

// Execute
triggerImmediateScrape();
