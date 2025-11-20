/**
 * Process Worker Scheduler (Event-Driven)
 *
 * Listens for "process-worker-trigger" events from Discovery Scraper completion
 * Automatically starts Process Worker when new jobs are available
 *
 * Architecture:
 * - Discovery Scraper completes → Emits BullMQ event → This scheduler receives event → Starts Process Worker
 * - Process Worker auto-exits after 80s idle (16 polls × 5s)
 * - No manual intervention required for scheduled runs
 *
 * Manual Execution:
 * - Manual Process Worker execution via CLI still works independently:
 *   docker exec connect_dev_scraper npx tsx scripts/scrape-ntis-processor.ts --workerId worker-1 --maxIdlePolls 3
 */

import { Worker } from 'bullmq';
import Redis from 'ioredis';
import { exec } from 'child_process';

/**
 * Start Process Worker Scheduler
 * Listens for "process-worker-trigger" events from Discovery Scraper
 * Auto-starts Process Worker when jobs are available
 */
export function startProcessWorkerScheduler() {
  console.log('🚀 Starting Process Worker scheduler (event-driven)...');

  // Connect to Redis Queue
  const connection = new Redis({
    host: process.env.REDIS_QUEUE_HOST || 'localhost',
    port: parseInt(process.env.REDIS_QUEUE_PORT || '6380'),
    maxRetriesPerRequest: null, // Required for BullMQ
  });

  // Create BullMQ Worker to listen for trigger events
  const worker = new Worker(
    'scraping-queue', // Same queue name as Discovery Scraper uses
    async (job) => {
      // Only process "process-worker-trigger" jobs
      if (job.name !== 'process-worker-trigger') {
        return { skipped: true, reason: 'Not a process-worker-trigger job' };
      }

      console.log('⏰ Process Worker trigger received:', job.data);

      const { scrapingSession } = job.data;

      console.log(`  🔄 Starting Process Worker for session: ${scrapingSession}`);

      // Start Process Worker as background process
      const workerId = `auto-${scrapingSession}`;
      const command = `npx tsx scripts/scrape-ntis-processor.ts --workerId ${workerId} --maxIdlePolls 16`;

      try {
        // Run in background (don't await)
        // Worker will auto-exit after 16 consecutive empty polls (80 seconds idle)
        exec(command, (error, stdout, stderr) => {
          if (error) {
            console.error(`  ❌ Process Worker failed:`, error);
            console.error(`  📋 stderr:`, stderr);
            return;
          }
          console.log(`  ✅ Process Worker completed:`, stdout);
        });

        console.log(`  ✅ Process Worker started successfully (workerId: ${workerId})`);
        console.log(`  ℹ️  Worker will auto-exit after 80s idle (16 polls × 5s)`);

        return { started: true, workerId, scrapingSession };
      } catch (error: any) {
        console.error('  ❌ Failed to start Process Worker:', error.message);
        throw error;
      }
    },
    {
      connection,
      concurrency: 1, // Only one Process Worker at a time to avoid conflicts
    }
  );

  // Event handlers
  worker.on('completed', (job) => {
    console.log(`✅ Process Worker trigger completed:`, job.returnvalue);
  });

  worker.on('failed', (job, err) => {
    console.error(`❌ Process Worker trigger failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error('❌ Process Worker scheduler error:', err.message);
  });

  console.log('✓ Process Worker scheduler started successfully');
  console.log(`  - Trigger: BullMQ event from Discovery Scraper`);
  console.log(`  - Queue: scraping-queue`);
  console.log(`  - Job name: process-worker-trigger`);
  console.log(`  - Auto-exit: After 80s idle (16 polls × 5s)`);
  console.log(`  - Manual execution: Still supported via CLI`);

  return worker;
}
