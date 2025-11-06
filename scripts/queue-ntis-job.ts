/**
 * Queue NTIS Scraping Job
 * Directly adds a high-priority job to the Redis queue
 */

import { Queue } from 'bullmq';
import { scrapingConfig } from '../lib/scraping/config';

const ntisConfig = scrapingConfig.ntis;

const scrapingQueue = new Queue('scraping-queue', {
  connection: {
    host: process.env.REDIS_QUEUE_HOST || 'localhost',
    port: parseInt(process.env.REDIS_QUEUE_PORT || '6380'),
  },
});

(async () => {
  console.log('📋 Queueing NTIS scraping job with updated selectors...');

  const job = await scrapingQueue.add(
    'scrape-ntis',
    {
      agency: 'ntis',
      url: ntisConfig.baseUrl + ntisConfig.listingPath,
      config: ntisConfig,
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

  console.log(`✅ Job queued successfully: ID ${job.id}`);
  console.log(`   Priority: HIGH`);
  console.log(`   Agency: NTIS`);
  console.log(`   URL: ${ntisConfig.baseUrl}${ntisConfig.listingPath}`);

  await scrapingQueue.close();
  process.exit(0);
})();
