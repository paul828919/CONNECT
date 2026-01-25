/**
 * Aggregate Preferences Cron Script
 *
 * Daily cron job to compute organization preferences from recommendation events.
 * Uses 30-day learning window with recency weighting.
 *
 * Usage:
 *   npx tsx scripts/aggregate-preferences.ts
 *
 * Cron schedule (recommended):
 *   0 4 * * *  (4am daily - after cleanup-old-events.ts)
 *
 * @module scripts/aggregate-preferences
 */

import { PrismaClient } from '@prisma/client';
import {
  aggregatePreferencesForOrganization,
  updateColdStartStatus,
  savePreferences,
} from '../lib/personalization/preference-aggregator';

const db = new PrismaClient({
  log: ['error', 'warn'],
});

// Configuration
const BATCH_SIZE = 50;       // Process organizations in batches
const CONCURRENCY = 5;       // Parallel processing within batch
const LEARNING_WINDOW_DAYS = 30;

interface AggregationStats {
  totalOrganizations: number;
  processed: number;
  failed: number;
  skipped: number;
  duration: number;
}

async function main(): Promise<void> {
  console.log('🔄 Starting preference aggregation...\n');
  console.log(`   Learning window: ${LEARNING_WINDOW_DAYS} days`);
  console.log(`   Batch size: ${BATCH_SIZE}`);
  console.log(`   Concurrency: ${CONCURRENCY}\n`);

  const startTime = Date.now();
  const stats: AggregationStats = {
    totalOrganizations: 0,
    processed: 0,
    failed: 0,
    skipped: 0,
    duration: 0,
  };

  try {
    // Get organizations with recent events
    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - LEARNING_WINDOW_DAYS);

    const organizationsWithEvents = await db.recommendation_events.findMany({
      where: {
        occurredAt: { gte: windowStart },
      },
      select: {
        organizationId: true,
      },
      distinct: ['organizationId'],
    });

    const organizationIds = organizationsWithEvents.map(o => o.organizationId);
    stats.totalOrganizations = organizationIds.length;

    console.log(`📊 Found ${stats.totalOrganizations} organizations with events in the last ${LEARNING_WINDOW_DAYS} days\n`);

    if (stats.totalOrganizations === 0) {
      console.log('✅ No organizations to process. Exiting.');
      return;
    }

    // Process in batches
    for (let i = 0; i < organizationIds.length; i += BATCH_SIZE) {
      const batch = organizationIds.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(organizationIds.length / BATCH_SIZE);

      console.log(`📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} organizations)...`);

      // Process batch with concurrency limit
      const results = await processWithConcurrency(batch, CONCURRENCY);

      // Update stats
      for (const result of results) {
        if (result.success) {
          stats.processed++;
        } else if (result.skipped) {
          stats.skipped++;
        } else {
          stats.failed++;
          console.error(`   ❌ Failed: ${result.organizationId} - ${result.error}`);
        }
      }

      // Progress update
      const progress = ((i + batch.length) / organizationIds.length * 100).toFixed(1);
      console.log(`   Progress: ${progress}% (${stats.processed} processed, ${stats.failed} failed)\n`);
    }

    stats.duration = Date.now() - startTime;

    // Print summary
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📊 AGGREGATION SUMMARY');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`   Total organizations:   ${stats.totalOrganizations}`);
    console.log(`   Successfully processed: ${stats.processed}`);
    console.log(`   Failed:                ${stats.failed}`);
    console.log(`   Skipped:               ${stats.skipped}`);
    console.log(`   Duration:              ${(stats.duration / 1000).toFixed(2)}s`);
    console.log(`   Avg per org:           ${(stats.duration / stats.totalOrganizations).toFixed(0)}ms`);
    console.log('═══════════════════════════════════════════════════════════\n');

    // Status distribution
    await printStatusDistribution();

  } catch (error) {
    console.error('\n❌ Fatal error during aggregation:', error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

interface ProcessResult {
  organizationId: string;
  success: boolean;
  skipped: boolean;
  error?: string;
}

async function processWithConcurrency(
  organizationIds: string[],
  concurrency: number
): Promise<ProcessResult[]> {
  const results: ProcessResult[] = [];

  for (let i = 0; i < organizationIds.length; i += concurrency) {
    const chunk = organizationIds.slice(i, i + concurrency);
    const chunkResults = await Promise.all(
      chunk.map(orgId => processOrganization(orgId))
    );
    results.push(...chunkResults);
  }

  return results;
}

async function processOrganization(organizationId: string): Promise<ProcessResult> {
  try {
    // 1. Aggregate preferences from events
    const preferences = await aggregatePreferencesForOrganization(organizationId);

    // 2. Skip if no meaningful data
    if (
      preferences.totalImpressions === 0 &&
      preferences.totalViews === 0 &&
      preferences.totalSaves === 0
    ) {
      return { organizationId, success: false, skipped: true };
    }

    // 3. Save preferences to database
    await savePreferences(organizationId, preferences);

    // 4. Update cold start status
    await updateColdStartStatus(organizationId);

    return { organizationId, success: true, skipped: false };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return { organizationId, success: false, skipped: false, error: errorMsg };
  }
}

async function printStatusDistribution(): Promise<void> {
  const statusCounts = await db.organization_personalization_status.groupBy({
    by: ['status'],
    _count: { status: true },
  });

  console.log('📈 Cold Start Status Distribution:');
  for (const { status, _count } of statusCounts) {
    const emoji = status === 'WARM' ? '🔥' : status === 'PARTIAL_COLD' ? '❄️' : '🧊';
    console.log(`   ${emoji} ${status}: ${_count.status}`);
  }
  console.log('');
}

// Run
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
