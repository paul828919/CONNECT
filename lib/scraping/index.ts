/**
 * Scraping Service Entry Point
 *
 * Starts the scraping worker and scheduler.
 * Run this as a separate service in Docker (scraper container).
 */

import { startScheduler } from './scheduler';
import scrapingWorker from './worker';
import { startEmailCronJobs } from '../email/cron';

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🤖 Connect Platform - Scraping Service');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');

// 1. Start the scraping scheduler (cron jobs)
startScheduler();

// 2. Start email notification cron jobs
startEmailCronJobs();

// 2. Worker is already started via import
console.log('✓ Scraping worker started (max concurrency: 2)');
console.log('✓ Monitoring Redis queue:', process.env.REDIS_QUEUE_HOST || 'localhost:6380');
console.log('');

// 3. Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('📴 SIGTERM received, shutting down gracefully...');
  await scrapingWorker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('📴 SIGINT received, shutting down gracefully...');
  await scrapingWorker.close();
  process.exit(0);
});

// 4. Health check endpoint (optional, for Docker healthcheck)
if (process.env.ENABLE_HEALTH_SERVER === 'true') {
  const http = require('http');

  const healthServer = http.createServer((req: any, res: any) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'healthy', service: 'scraper' }));
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  const port = process.env.HEALTH_PORT || 3100;
  healthServer.listen(port, () => {
    console.log(`✓ Health check server running on port ${port}`);
    console.log('');
  });
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✅ Scraping service is ready');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
