/**
 * Trigger KIMST Scraping Only
 */

import { Queue } from 'bullmq';
import { scrapingConfig } from '../lib/scraping/config';

const scrapingQueue = new Queue('scraping-queue', {
  connection: {
    host: process.env.REDIS_QUEUE_HOST || 'localhost',
    port: parseInt(process.env.REDIS_QUEUE_PORT || '6379'),
  },
});

async function triggerKimstScraping() {
  console.log('🚀 Triggering KIMST scraping...\n');

  const config = scrapingConfig['kimst'];
  const fullUrl = config.baseUrl + config.listingPath;

  const job = await scrapingQueue.add(
    `scrape-kimst`,
    {
      agency: 'kimst',
      url: fullUrl,
      config,
      priority: 'high',
    },
    {
      priority: 1,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    }
  );

  console.log(`✅ KIMST job queued: ${job.id}`);
  console.log('');

  await scrapingQueue.close();
  process.exit(0);
}

triggerKimstScraping().catch((error) => {
  console.error('❌ Failed to trigger scraping:', error);
  process.exit(1);
});
