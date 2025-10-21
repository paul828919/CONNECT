/**
 * Test Script for Scheduler Verification
 *
 * Manually triggers all three schedulers to verify they work correctly:
 * 1. Playwright scraper (agency websites)
 * 2. NTIS API scraper
 * 3. Cache warming
 */

import { triggerManualScrape, getQueueStats } from '../lib/scraping/scheduler';
import { triggerManualNTISScrape } from '../lib/ntis-api/scheduler';
import { triggerManualCacheWarming } from '../lib/cache/cache-warming-scheduler';
import { db } from '../lib/db';

async function testSchedulers() {
  console.log('🧪 Testing All Schedulers\n');
  console.log('='.repeat(60));

  try {
    // ============================================
    // 1. Test Playwright Scraper
    // ============================================
    console.log('\n1️⃣  TESTING PLAYWRIGHT SCRAPER');
    console.log('-'.repeat(60));

    console.log('📊 Current queue stats:');
    const initialStats = await getQueueStats();
    console.log(`   - Waiting: ${initialStats.waiting}`);
    console.log(`   - Active: ${initialStats.active}`);
    console.log(`   - Completed: ${initialStats.completed}`);
    console.log(`   - Failed: ${initialStats.failed}`);

    console.log('\n🔄 Triggering manual scrape for all agencies...');
    const scrapeResult = await triggerManualScrape();
    console.log(`   Result: ${scrapeResult.success ? '✅ Success' : '❌ Failed'}`);
    console.log(`   Message: ${scrapeResult.message}`);

    // Wait a bit for the queue to update
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('\n📊 Updated queue stats:');
    const updatedStats = await getQueueStats();
    console.log(`   - Waiting: ${updatedStats.waiting} (${updatedStats.waiting > initialStats.waiting ? '↑' : '='} ${updatedStats.waiting - initialStats.waiting})`);
    console.log(`   - Active: ${updatedStats.active}`);
    console.log(`   - Completed: ${updatedStats.completed}`);
    console.log(`   - Failed: ${updatedStats.failed}`);

    // ============================================
    // 2. Test NTIS API Scraper
    // ============================================
    console.log('\n\n2️⃣  TESTING NTIS API SCRAPER');
    console.log('-'.repeat(60));

    const beforeNTIS = await db.funding_programs.count({
      where: { scrapingSource: 'ntis' }
    });
    console.log(`📊 Programs from NTIS before: ${beforeNTIS}`);

    console.log('\n🔄 Triggering manual NTIS scrape (7 days back)...');
    const ntisResult = await triggerManualNTISScrape(7);
    console.log(`   Result: ${ntisResult.success ? '✅ Success' : '❌ Failed'}`);
    console.log(`   Total found: ${ntisResult.totalFound}`);
    console.log(`   New programs: ${ntisResult.programsNew}`);
    console.log(`   Updated programs: ${ntisResult.programsUpdated}`);

    const afterNTIS = await db.funding_programs.count({
      where: { scrapingSource: 'ntis' }
    });
    console.log(`\n📊 Programs from NTIS after: ${afterNTIS} (${afterNTIS > beforeNTIS ? '↑' : '='} +${afterNTIS - beforeNTIS})`);

    // ============================================
    // 3. Test Cache Warming
    // ============================================
    console.log('\n\n3️⃣  TESTING CACHE WARMING SCHEDULER');
    console.log('-'.repeat(60));

    console.log('🔄 Triggering manual cache warming...');
    const cacheResult = await triggerManualCacheWarming();
    console.log(`   Result: ${cacheResult.success ? '✅ Success' : '❌ Failed'}`);
    console.log(`   Message: ${cacheResult.message}`);

    if (cacheResult.stats) {
      console.log('\n📊 Cache warming stats:');
      console.log(`   - Items warmed: ${cacheResult.stats.itemsWarmed}`);
      console.log(`   - Items skipped: ${cacheResult.stats.itemsSkipped}`);
      console.log(`   - Errors: ${cacheResult.stats.errors}`);
      console.log(`   - Duration: ${cacheResult.stats.duration ? (cacheResult.stats.duration / 1000).toFixed(2) + 's' : 'N/A'}`);

      if (cacheResult.stats.breakdown) {
        console.log('\n   Breakdown by type:');
        for (const [type, count] of Object.entries(cacheResult.stats.breakdown)) {
          console.log(`     - ${type}: ${count}`);
        }
      }
    }

    // ============================================
    // 4. Database Summary
    // ============================================
    console.log('\n\n4️⃣  DATABASE SUMMARY');
    console.log('-'.repeat(60));

    const programsBySource = await db.funding_programs.groupBy({
      by: ['scrapingSource'],
      _count: { id: true }
    });

    console.log('📊 Programs by source:');
    for (const source of programsBySource) {
      console.log(`   - ${source.scrapingSource || 'unknown'}: ${source._count.id}`);
    }

    const totalPrograms = await db.funding_programs.count();
    console.log(`\n📊 Total programs in database: ${totalPrograms}`);

    const recentLogs = await db.scraping_logs.findMany({
      take: 5,
      orderBy: { completedAt: 'desc' }
    });

    if (recentLogs.length > 0) {
      console.log(`\n📋 Recent scraping logs (last 5):`);
      for (const log of recentLogs) {
        const status = log.success ? '✅' : '❌';
        const duration = log.duration ? `${(log.duration / 1000).toFixed(1)}s` : 'N/A';
        console.log(`   ${status} ${log.agencyId} - ${log.programsNew} new, ${log.programsUpdated} updated (${duration})`);
      }
    } else {
      console.log('\n📋 No scraping logs found yet');
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ All scheduler tests completed!\n');

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

// Run tests
testSchedulers().catch(console.error);
