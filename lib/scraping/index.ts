/**
 * Scraping Service Entry Point
 *
 * Starts the scraping worker and scheduler.
 * Run this as a separate service in Docker (scraper container).
 */

import scrapingWorker from './worker'; // Schedulers initialized automatically on import
import { startEmailCronJobs } from '../email/cron';
import { startSME24SyncCron } from '../sme24-api/cron';
import { startPersonalizationCronJobs } from '../personalization/cron';

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🤖 Connect Platform - Scraping Service');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');

// 1. Schedulers are initialized automatically in worker.ts on import
// - startScheduler() - NTIS Announcement Scraper (Playwright, 9 AM + 3 PM KST)
// - initializeCacheScheduler() - Cache warming (6 AM KST)
// NOTE: startNTISScheduler() is DISABLED (NTIS API = completed/in-progress projects, NOT announcements)

// 2. Start email notification cron jobs (graceful failure if SMTP not configured)
try {
  startEmailCronJobs();
  console.log('✓ Email notifications enabled');
} catch (error: any) {
  console.warn('⚠️  Email notifications disabled:', error.message);
  console.warn('   (This is non-critical - scraping will continue)');
}

// 3. Start SME24 sync cron job (graceful failure if API key not configured)
try {
  startSME24SyncCron();
  console.log('✓ SME24 program sync enabled');
} catch (error: any) {
  console.warn('⚠️  SME24 sync disabled:', error.message);
  console.warn('   (This is non-critical - can trigger sync manually via admin API)');
}

// 4. Start personalization cron jobs (Phase 6)
try {
  startPersonalizationCronJobs();
  console.log('✓ Personalization cron jobs enabled');
} catch (error: any) {
  console.warn('⚠️  Personalization cron jobs disabled:', error.message);
  console.warn('   (This is non-critical - personalization will use base scores)');
}

// 5. Worker is already started via import
console.log('✓ Scraping worker started (max concurrency: 2)');
console.log('✓ Monitoring Redis queue:', process.env.REDIS_QUEUE_HOST || 'localhost:6380');
console.log('');

// 6. Graceful shutdown
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

// 7. Health check endpoint (optional, for Docker healthcheck)
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
