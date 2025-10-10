/**
 * Trigger Immediate Scraping
 * 
 * Manually triggers scraping jobs for all 4 agencies right now
 * instead of waiting for scheduled run.
 * 
 * Usage: npx tsx scripts/trigger-scraping.ts
 */

import { Queue } from 'bullmq';
import { scrapingConfig } from '../lib/scraping/config';

const scrapingQueue = new Queue('scraping-queue', {
  connection: {
    host: process.env.REDIS_QUEUE_HOST || 'localhost',
    port: parseInt(process.env.REDIS_QUEUE_PORT || '6380'),
  },
});

async function triggerScraping() {
  console.log('🚀 Triggering immediate scraping for all agencies...\n');

  // NOTE: KEIT temporarily disabled - requires custom extraction logic for div-based layout
  const agencies = ['iitp', 'tipa', 'kimst']; // Removed 'keit' temporarily
  const jobs = [];

  for (const agency of agencies) {
    const config = scrapingConfig[agency];
    
    console.log(`📋 Queuing ${agency.toUpperCase()}...`);
    
    // Build full URL from baseUrl + listingPath
    const fullUrl = config.baseUrl + config.listingPath;
    
    const job = await scrapingQueue.add(
      `scrape-${agency}`,
      {
        agency,
        url: fullUrl,
        config,
        priority: 'high',
      },
      {
        priority: 1, // High priority
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      }
    );
    
    jobs.push(job);
    console.log(`   ✅ Job queued: ${job.id}`);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ ${jobs.length} scraping jobs queued successfully!`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('🔍 Monitor progress with:');
  console.log('   npx tsx scripts/monitor-scraping.ts');
  console.log('');
  console.log('📊 View results in database:');
  console.log('   npm run db:studio');
  console.log('');
  console.log('⏱️  Scraping will complete in ~5-10 minutes');
  console.log('');

  await scrapingQueue.close();
  process.exit(0);
}

triggerScraping().catch((error) => {
  console.error('❌ Failed to trigger scraping:', error);
  process.exit(1);
});
