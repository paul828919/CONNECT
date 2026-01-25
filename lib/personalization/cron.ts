/**
 * Personalization Cron Jobs
 *
 * Scheduled tasks for personalization data processing:
 * - aggregate-preferences: Compute org preferences from events (4 AM UTC)
 * - compute-co-occurrences: Build item-item CF matrix (5 AM UTC)
 * - compute-metrics: Aggregate daily metrics (6 AM UTC)
 *
 * Note: All cron jobs use UTC for consistency with backend containers.
 * KST equivalents: 4 AM UTC = 1 PM KST, 5 AM UTC = 2 PM KST, 6 AM UTC = 3 PM KST
 *
 * @module lib/personalization/cron
 */

import cron from 'node-cron';
import { db } from '@/lib/db';
import {
  aggregatePreferencesForOrganization,
  updateColdStartStatus,
  savePreferences,
} from './preference-aggregator';

// Configuration
const LEARNING_WINDOW_DAYS = 30;
const BATCH_SIZE = 50;
const CONCURRENCY = 5;

// ============================================================================
// Aggregate Preferences (4 AM UTC)
// ============================================================================

async function runAggregatePreferences(): Promise<void> {
  console.log('🔄 [CRON] Starting preference aggregation...');
  const startTime = Date.now();

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
    console.log(`   Found ${organizationIds.length} organizations with events`);

    if (organizationIds.length === 0) {
      console.log('   ✅ No organizations to process');
      return;
    }

    let processed = 0;
    let failed = 0;

    // Process in batches
    for (let i = 0; i < organizationIds.length; i += BATCH_SIZE) {
      const batch = organizationIds.slice(i, i + BATCH_SIZE);

      // Process batch with concurrency limit
      const results = await Promise.allSettled(
        batch.map(async (orgId) => {
          try {
            const preferences = await aggregatePreferencesForOrganization(orgId);
            if (preferences) {
              await savePreferences(orgId, preferences);
              await updateColdStartStatus(orgId);
            }
            return 'success';
          } catch (error) {
            console.error(`   Failed to process org ${orgId.slice(0, 8)}:`, error);
            return 'failed';
          }
        })
      );

      processed += results.filter(r => r.status === 'fulfilled' && r.value === 'success').length;
      failed += results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value === 'failed')).length;
    }

    const duration = Math.round((Date.now() - startTime) / 1000);
    console.log(`   ✅ Completed: ${processed} processed, ${failed} failed (${duration}s)`);
  } catch (error) {
    console.error('   ❌ Preference aggregation failed:', error);
  }
}

// ============================================================================
// Compute Co-Occurrences (5 AM UTC)
// ============================================================================

async function runComputeCoOccurrences(): Promise<void> {
  console.log('🔄 [CRON] Starting co-occurrence computation...');
  const startTime = Date.now();

  try {
    // Get save events from the learning window
    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - LEARNING_WINDOW_DAYS);

    // Find all program pairs that were saved by the same organization
    const saveEvents = await db.recommendation_events.findMany({
      where: {
        eventType: 'SAVE',
        occurredAt: { gte: windowStart },
      },
      select: {
        organizationId: true,
        programId: true,
      },
    });

    // Group saves by organization
    const orgSaves = new Map<string, Set<string>>();
    for (const event of saveEvents) {
      if (!orgSaves.has(event.organizationId)) {
        orgSaves.set(event.organizationId, new Set());
      }
      orgSaves.get(event.organizationId)!.add(event.programId);
    }

    // Count co-occurrences
    const coOccurrences = new Map<string, number>();
    for (const [_, programs] of orgSaves) {
      const programList = Array.from(programs);
      for (let i = 0; i < programList.length; i++) {
        for (let j = i + 1; j < programList.length; j++) {
          // Sort to ensure consistent key
          const [a, b] = [programList[i], programList[j]].sort();
          const key = `${a}|${b}`;
          coOccurrences.set(key, (coOccurrences.get(key) || 0) + 1);
        }
      }
    }

    // Filter to minimum threshold and upsert
    const MIN_CO_SAVE_COUNT = 2;
    let upserted = 0;

    for (const [key, count] of coOccurrences) {
      if (count < MIN_CO_SAVE_COUNT) continue;

      const [programId1, programId2] = key.split('|');

      // Calculate confidence using Wilson score interval
      const n = count;
      const z = 1.96; // 95% confidence
      const phat = Math.min(0.99, n / 100); // Cap at 99%
      const confidence = (phat + z * z / (2 * n) - z * Math.sqrt((phat * (1 - phat) + z * z / (4 * n)) / n)) / (1 + z * z / n);

      await db.program_co_occurrence.upsert({
        where: {
          programId1_programId2: { programId1, programId2 },
        },
        create: {
          programId1,
          programId2,
          coSaveCount: count,
          confidence: Math.max(0, confidence),
        },
        update: {
          coSaveCount: count,
          confidence: Math.max(0, confidence),
        },
      });
      upserted++;
    }

    const duration = Math.round((Date.now() - startTime) / 1000);
    console.log(`   ✅ Completed: ${upserted} co-occurrences upserted (${duration}s)`);
  } catch (error) {
    console.error('   ❌ Co-occurrence computation failed:', error);
  }
}

// ============================================================================
// Compute Metrics (6 AM UTC)
// ============================================================================

async function runComputeMetrics(): Promise<void> {
  console.log('🔄 [CRON] Starting daily metrics computation...');
  const startTime = Date.now();

  try {
    // Compute metrics for yesterday (full day of data)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const today = new Date(yesterday);
    today.setDate(today.getDate() + 1);

    // Get events from yesterday
    const events = await db.recommendation_events.findMany({
      where: {
        occurredAt: {
          gte: yesterday,
          lt: today,
        },
      },
    });

    if (events.length === 0) {
      console.log('   ✅ No events for yesterday');
      return;
    }

    // Aggregate metrics
    const impressions = events.filter(e => e.eventType === 'IMPRESSION').length;
    const views = events.filter(e => e.eventType === 'VIEW').length;
    const clicks = events.filter(e => e.eventType === 'CLICK').length;
    const saves = events.filter(e => e.eventType === 'SAVE').length;
    const dismisses = events.filter(e => e.eventType === 'DISMISS').length;

    const uniqueOrgs = new Set(events.map(e => e.organizationId)).size;
    const uniquePrograms = new Set(events.map(e => e.programId)).size;

    // Calculate rates with position bias adjustment
    const positionBiasFactors = [1.0, 0.85, 0.75, 0.65, 0.55, 0.47, 0.41, 0.36, 0.31, 0.27];
    let adjustedImpressions = 0;
    let adjustedClicks = 0;

    for (const event of events) {
      if (event.eventType === 'IMPRESSION') {
        const factor = positionBiasFactors[Math.min(event.position, 9)] || 0.27;
        adjustedImpressions += 1 / factor;
      }
      if (event.eventType === 'CLICK') {
        adjustedClicks++;
      }
    }

    const adjustedCTR = adjustedImpressions > 0 ? adjustedClicks / adjustedImpressions : 0;
    const adjustedSaveRate = views > 0 ? saves / views : 0;

    // Calculate average scores
    const matchScores = events.filter(e => e.matchScore).map(e => e.matchScore);
    const avgBaseScore = matchScores.length > 0
      ? matchScores.reduce((a, b) => a + b, 0) / matchScores.length
      : 0;

    // Upsert metrics
    await db.personalization_metrics.upsert({
      where: {
        date_configName: {
          date: yesterday,
          configName: 'default',
        },
      },
      create: {
        date: yesterday,
        configName: 'default',
        totalImpressions: impressions,
        totalViews: views,
        totalClicks: clicks,
        totalSaves: saves,
        totalDismisses: dismisses,
        uniqueOrganizations: uniqueOrgs,
        uniquePrograms: uniquePrograms,
        adjustedCTR,
        adjustedSaveRate,
        avgBaseScore,
      },
      update: {
        totalImpressions: impressions,
        totalViews: views,
        totalClicks: clicks,
        totalSaves: saves,
        totalDismisses: dismisses,
        uniqueOrganizations: uniqueOrgs,
        uniquePrograms: uniquePrograms,
        adjustedCTR,
        adjustedSaveRate,
        avgBaseScore,
      },
    });

    const duration = Math.round((Date.now() - startTime) / 1000);
    console.log(`   ✅ Metrics saved: ${impressions} impressions, ${clicks} clicks, ${saves} saves (${duration}s)`);
  } catch (error) {
    console.error('   ❌ Metrics computation failed:', error);
  }
}

// ============================================================================
// Start All Personalization Cron Jobs
// ============================================================================

export function startPersonalizationCronJobs(): void {
  console.log('📊 Starting personalization cron jobs...');

  // Aggregate preferences - 4 AM UTC (1 PM KST)
  cron.schedule('0 4 * * *', async () => {
    console.log('⏰ [4:00 UTC] Running preference aggregation...');
    await runAggregatePreferences();
  });
  console.log('   ✓ Preference aggregation: 0 4 * * * (4 AM UTC / 1 PM KST)');

  // Compute co-occurrences - 5 AM UTC (2 PM KST)
  cron.schedule('0 5 * * *', async () => {
    console.log('⏰ [5:00 UTC] Running co-occurrence computation...');
    await runComputeCoOccurrences();
  });
  console.log('   ✓ Co-occurrence computation: 0 5 * * * (5 AM UTC / 2 PM KST)');

  // Compute metrics - 6 AM UTC (3 PM KST)
  cron.schedule('0 6 * * *', async () => {
    console.log('⏰ [6:00 UTC] Running metrics computation...');
    await runComputeMetrics();
  });
  console.log('   ✓ Metrics computation: 0 6 * * * (6 AM UTC / 3 PM KST)');
}

// ============================================================================
// Manual Trigger Functions (for testing/debugging)
// ============================================================================

export async function triggerPreferenceAggregation(): Promise<void> {
  console.log('🔧 Manually triggering preference aggregation...');
  await runAggregatePreferences();
}

export async function triggerCoOccurrenceComputation(): Promise<void> {
  console.log('🔧 Manually triggering co-occurrence computation...');
  await runComputeCoOccurrences();
}

export async function triggerMetricsComputation(): Promise<void> {
  console.log('🔧 Manually triggering metrics computation...');
  await runComputeMetrics();
}
