/**
 * NTIS Scraping Progress Monitoring Dashboard
 *
 * Real-time CLI dashboard for tracking queue-based scraping system:
 * - Overall job queue statistics (pending, processing, completed, failed)
 * - Progress breakdown by date range
 * - Failed jobs analysis with error messages
 * - Enhancement field success rates (budget, TRL, business structures)
 * - Active processor worker monitoring
 *
 * Usage:
 *   DATABASE_URL="..." npx tsx scripts/monitor-scraping-progress.ts
 *
 * For live monitoring (refresh every 5 seconds):
 *   watch -n 5 'DATABASE_URL="..." npx tsx scripts/monitor-scraping-progress.ts'
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.clear();
  console.log('='.repeat(80));
  console.log('NTIS SCRAPING PROGRESS DASHBOARD');
  console.log('='.repeat(80));
  console.log();

  // Overall statistics
  const totalJobs = await prisma.scraping_jobs.count();
  const scraped = await prisma.scraping_jobs.count({
    where: { scrapingStatus: 'SCRAPED' }
  });
  const scrapingFailed = await prisma.scraping_jobs.count({
    where: { scrapingStatus: 'SCRAPING_FAILED' }
  });

  const pending = await prisma.scraping_jobs.count({
    where: { processingStatus: 'PENDING' }
  });
  const processing = await prisma.scraping_jobs.count({
    where: { processingStatus: 'PROCESSING' }
  });
  const completed = await prisma.scraping_jobs.count({
    where: { processingStatus: 'COMPLETED' }
  });
  const failed = await prisma.scraping_jobs.count({
    where: { processingStatus: 'FAILED' }
  });
  const skipped = await prisma.scraping_jobs.count({
    where: { processingStatus: 'SKIPPED' }
  });

  console.log('📊 OVERALL STATISTICS');
  console.log('-'.repeat(80));
  console.log(`Total Jobs: ${totalJobs}`);
  console.log(`Scraped: ${scraped} (${percentage(scraped, totalJobs)}%)`);
  console.log(`Scraping Failed: ${scrapingFailed}`);
  console.log();
  console.log(`Pending: ${pending} (${percentage(pending, totalJobs)}%)`);
  console.log(`Processing: ${processing} (${percentage(processing, totalJobs)}%)`);
  console.log(`Completed: ${completed} (${percentage(completed, totalJobs)}%)`);
  console.log(`Failed: ${failed} (${percentage(failed, totalJobs)}%)`);
  console.log(`Skipped: ${skipped} (${percentage(skipped, totalJobs)}%)`);
  console.log();

  // Progress by date range
  const byDateRange = await prisma.scraping_jobs.groupBy({
    by: ['dateRange', 'processingStatus'],
    _count: { id: true },
    orderBy: { dateRange: 'asc' }
  });

  if (byDateRange.length > 0) {
    console.log('📅 PROGRESS BY DATE RANGE');
    console.log('-'.repeat(80));

    // Group by date range for better readability
    const dateRangeMap = new Map<string, Record<string, number>>();

    for (const row of byDateRange) {
      if (!dateRangeMap.has(row.dateRange)) {
        dateRangeMap.set(row.dateRange, {});
      }
      const statusCounts = dateRangeMap.get(row.dateRange)!;
      statusCounts[row.processingStatus] = row._count.id;
    }

    // Print summary table
    for (const [dateRange, statusCounts] of dateRangeMap.entries()) {
      const total = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);
      const completedCount = statusCounts.COMPLETED || 0;
      const progress = percentage(completedCount, total);

      console.log(`${dateRange.padEnd(30)} | Total: ${String(total).padStart(4)} | ` +
        `Completed: ${String(completedCount).padStart(4)} (${String(progress).padStart(5)}%) | ` +
        `Pending: ${String(statusCounts.PENDING || 0).padStart(4)} | ` +
        `Processing: ${String(statusCounts.PROCESSING || 0).padStart(2)} | ` +
        `Failed: ${String(statusCounts.FAILED || 0).padStart(3)}`
      );
    }
    console.log();
  }

  // Failed jobs breakdown
  const failedJobs = await prisma.scraping_jobs.findMany({
    where: { processingStatus: 'FAILED' },
    select: {
      announcementTitle: true,
      processingError: true,
      processingAttempts: true,
      dateRange: true
    },
    orderBy: { processedAt: 'desc' },
    take: 10
  });

  if (failedJobs.length > 0) {
    console.log('❌ RECENT FAILED JOBS (Top 10)');
    console.log('-'.repeat(80));

    for (const job of failedJobs) {
      console.log(`📄 ${job.announcementTitle.substring(0, 60)}`);
      console.log(`   Date Range: ${job.dateRange} | Attempts: ${job.processingAttempts}`);
      console.log(`   Error: ${job.processingError?.substring(0, 100) || 'Unknown error'}`);
      console.log();
    }
  }

  // Enhancement field success rates (for completed jobs)
  const completedPrograms = await prisma.funding_programs.findMany({
    where: {
      scraping_job: {
        isNot: null
      }
    },
    select: {
      budgetAmount: true,
      minTrl: true,
      maxTrl: true,
      allowedBusinessStructures: true
    }
  });

  if (completedPrograms.length > 0) {
    const budgetSuccess = completedPrograms.filter(p => p.budgetAmount !== null).length;
    const trlSuccess = completedPrograms.filter(p => p.minTrl !== null && p.maxTrl !== null).length;
    const structuresSuccess = completedPrograms.filter(
      p => p.allowedBusinessStructures && p.allowedBusinessStructures.length > 0
    ).length;

    console.log('🎯 ENHANCEMENT FIELD SUCCESS RATES (Completed Programs)');
    console.log('-'.repeat(80));
    console.log(`Budget Extracted: ${budgetSuccess}/${completedPrograms.length} ` +
      `(${percentage(budgetSuccess, completedPrograms.length)}%)`);
    console.log(`TRL Extracted: ${trlSuccess}/${completedPrograms.length} ` +
      `(${percentage(trlSuccess, completedPrograms.length)}%)`);
    console.log(`Business Structures: ${structuresSuccess}/${completedPrograms.length} ` +
      `(${percentage(structuresSuccess, completedPrograms.length)}%)`);
    console.log();
  }

  // Active processor workers
  const activeWorkers = await prisma.scraping_jobs.groupBy({
    by: ['processingWorker'],
    where: {
      processingStatus: 'PROCESSING',
      processingWorker: { not: null }
    },
    _count: { id: true }
  });

  if (activeWorkers.length > 0) {
    console.log('👷 ACTIVE PROCESSOR WORKERS');
    console.log('-'.repeat(80));

    for (const worker of activeWorkers) {
      console.log(`${worker.processingWorker?.padEnd(15)} | Jobs in Progress: ${worker._count.id}`);
    }
    console.log();
  } else if (processing > 0) {
    console.log('⚠️  WARNING: Jobs stuck in PROCESSING status but no active workers detected');
    console.log();
  }

  // Processing rate estimation (if workers are active)
  if (processing > 0 && pending > 0) {
    const recentCompleted = await prisma.scraping_jobs.findMany({
      where: {
        processingStatus: 'COMPLETED',
        processedAt: { not: null }
      },
      orderBy: { processedAt: 'desc' },
      take: 10,
      select: {
        processedAt: true,
        processingStartedAt: true
      }
    });

    if (recentCompleted.length >= 5) {
      const avgProcessingTimeMs = recentCompleted
        .filter(job => job.processedAt && job.processingStartedAt)
        .map(job =>
          job.processedAt!.getTime() - job.processingStartedAt!.getTime()
        )
        .reduce((sum, time) => sum + time, 0) / recentCompleted.length;

      const avgProcessingTimeSec = Math.round(avgProcessingTimeMs / 1000);
      const estimatedCompletionMin = Math.round(
        (pending * avgProcessingTimeSec) / 60 / activeWorkers.length
      );

      console.log('⏱️  PROCESSING RATE ESTIMATION');
      console.log('-'.repeat(80));
      console.log(`Average Processing Time: ${avgProcessingTimeSec}s per job`);
      console.log(`Estimated Completion: ${estimatedCompletionMin} minutes ` +
        `(with ${activeWorkers.length} worker${activeWorkers.length > 1 ? 's' : ''})`);
      console.log();
    }
  }

  console.log('='.repeat(80));
  console.log(`Last Updated: ${new Date().toLocaleString()}`);
  console.log('Refresh: Run this script again or use watch command for live monitoring');
  console.log('='.repeat(80));
}

/**
 * Calculate percentage with one decimal place
 */
function percentage(part: number, total: number): string {
  if (total === 0) return '0.0';
  return ((part / total) * 100).toFixed(1);
}

// Run dashboard
main()
  .catch((error) => {
    console.error('❌ Dashboard Error:', error.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
