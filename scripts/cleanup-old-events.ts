/**
 * Cleanup Old Events Cron Script
 *
 * Daily cron job to delete recommendation events older than retention period.
 * Implements 180-day retention policy for raw event data.
 *
 * Usage:
 *   npx tsx scripts/cleanup-old-events.ts
 *   npx tsx scripts/cleanup-old-events.ts --dry-run
 *
 * Cron schedule (recommended):
 *   0 3 * * *  (3am daily - before aggregate-preferences.ts)
 *
 * Design decisions:
 * - 180-day retention (6 months for historical analysis)
 * - 30-day learning window (used by preference aggregator)
 * - Batch deletion to avoid long transactions
 * - Dry-run mode for safe testing
 *
 * @module scripts/cleanup-old-events
 */

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient({
  log: ['error', 'warn'],
});

// Configuration
const RETENTION_DAYS = 180;  // Keep events for 6 months
const BATCH_SIZE = 10000;    // Delete in batches to avoid long locks
const DRY_RUN = process.argv.includes('--dry-run');

interface CleanupStats {
  totalDeleted: number;
  batches: number;
  duration: number;
  oldestRemaining: Date | null;
}

async function main(): Promise<void> {
  console.log('🧹 Starting event cleanup...\n');
  console.log(`   Retention period: ${RETENTION_DAYS} days`);
  console.log(`   Batch size: ${BATCH_SIZE}`);
  console.log(`   Mode: ${DRY_RUN ? '🔍 DRY RUN (no deletions)' : '🗑️ LIVE (will delete)'}\n`);

  const startTime = Date.now();
  const stats: CleanupStats = {
    totalDeleted: 0,
    batches: 0,
    duration: 0,
    oldestRemaining: null,
  };

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);
  console.log(`📅 Cutoff date: ${cutoffDate.toISOString()}`);
  console.log(`   (Events before this date will be deleted)\n`);

  try {
    // Count events to delete
    const countToDelete = await db.recommendation_events.count({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });

    console.log(`📊 Events to delete: ${countToDelete.toLocaleString()}`);

    if (countToDelete === 0) {
      console.log('\n✅ No events to clean up. Exiting.');
      await printStats();
      return;
    }

    if (DRY_RUN) {
      console.log('\n🔍 DRY RUN - Would delete these events:');

      // Show sample of events that would be deleted
      const sample = await db.recommendation_events.findMany({
        where: {
          createdAt: { lt: cutoffDate },
        },
        select: {
          id: true,
          organizationId: true,
          eventType: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
        take: 5,
      });

      for (const event of sample) {
        console.log(`   - ${event.id.slice(0, 8)}... (${event.eventType}) from ${event.createdAt.toISOString()}`);
      }

      if (countToDelete > 5) {
        console.log(`   ... and ${countToDelete - 5} more events`);
      }

      stats.totalDeleted = countToDelete;
      stats.batches = Math.ceil(countToDelete / BATCH_SIZE);
    } else {
      // Delete in batches
      console.log('\n🗑️ Deleting events in batches...');

      let deleted = 0;
      let batchNum = 0;

      while (deleted < countToDelete) {
        batchNum++;

        // Use raw SQL for efficient batch deletion
        // Prisma's deleteMany doesn't support LIMIT, so we use raw SQL
        const result = await db.$executeRaw`
          DELETE FROM recommendation_events
          WHERE id IN (
            SELECT id FROM recommendation_events
            WHERE created_at < ${cutoffDate}
            LIMIT ${BATCH_SIZE}
          )
        `;

        deleted += Number(result);
        stats.batches = batchNum;
        stats.totalDeleted = deleted;

        // Progress update
        const progress = Math.min(100, (deleted / countToDelete * 100)).toFixed(1);
        console.log(`   Batch ${batchNum}: Deleted ${result} events (Total: ${deleted.toLocaleString()}, ${progress}%)`);

        // Break if no more rows deleted
        if (result === 0) break;

        // Small delay between batches to reduce DB load
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    stats.duration = Date.now() - startTime;

    // Print summary
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📊 CLEANUP SUMMARY');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`   Mode:              ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
    console.log(`   Events deleted:    ${stats.totalDeleted.toLocaleString()}`);
    console.log(`   Batches:           ${stats.batches}`);
    console.log(`   Duration:          ${(stats.duration / 1000).toFixed(2)}s`);
    console.log('═══════════════════════════════════════════════════════════\n');

    // Print remaining stats
    await printStats();

  } catch (error) {
    console.error('\n❌ Fatal error during cleanup:', error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

async function printStats(): Promise<void> {
  // Count remaining events
  const totalRemaining = await db.recommendation_events.count();

  // Get date range of remaining events
  const [oldest, newest] = await Promise.all([
    db.recommendation_events.findFirst({
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    }),
    db.recommendation_events.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    }),
  ]);

  // Count by event type
  const byType = await db.recommendation_events.groupBy({
    by: ['eventType'],
    _count: { eventType: true },
  });

  console.log('📈 Current Event Statistics:');
  console.log(`   Total events:     ${totalRemaining.toLocaleString()}`);

  if (oldest && newest) {
    console.log(`   Oldest event:     ${oldest.createdAt.toISOString()}`);
    console.log(`   Newest event:     ${newest.createdAt.toISOString()}`);

    const rangeInDays = Math.ceil(
      (newest.createdAt.getTime() - oldest.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    console.log(`   Date range:       ${rangeInDays} days`);
  }

  console.log('\n   By event type:');
  for (const { eventType, _count } of byType) {
    console.log(`     - ${eventType}: ${_count.eventType.toLocaleString()}`);
  }
  console.log('');
}

// Run
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
