/**
 * Compute Personalization Metrics Script
 *
 * Daily batch job to compute and store personalization metrics.
 * Aggregates events from the previous day into personalization_metrics.
 *
 * Metrics computed:
 * - Volume: impressions, views, clicks, saves
 * - Quality: CTR, save rate (position-debiased)
 * - Cold start breakdown
 * - Exploration performance
 *
 * Usage:
 *   npx tsx scripts/compute-metrics.ts
 *   npx tsx scripts/compute-metrics.ts --date 2026-01-24
 *   npx tsx scripts/compute-metrics.ts --dry-run
 *
 * Cron schedule (recommended):
 *   0 6 * * *  (6am daily - after co-occurrences and preferences)
 *
 * @module scripts/compute-metrics
 */

import { PrismaClient, RecommendationEventType } from '@prisma/client';

const db = new PrismaClient({
  log: ['error', 'warn'],
});

// Configuration
const DRY_RUN = process.argv.includes('--dry-run');
const dateArg = process.argv.find(arg => arg.startsWith('--date='));
const TARGET_DATE = dateArg
  ? new Date(dateArg.split('=')[1])
  : (() => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      return yesterday;
    })();

// Position bias factors for debiasing
const POSITION_BIAS: Record<number, number> = {
  1: 1.0, 2: 0.85, 3: 0.72, 4: 0.62, 5: 0.53,
  6: 0.46, 7: 0.40, 8: 0.35, 9: 0.31, 10: 0.27,
};

interface DailyMetrics {
  date: Date;
  configName: string;

  // Volume
  totalImpressions: number;
  totalViews: number;
  totalClicks: number;
  totalSaves: number;
  totalDismisses: number;

  // Unique counts
  uniqueOrganizations: number;
  uniquePrograms: number;

  // Quality (debiased)
  adjustedCTR: number | null;
  adjustedSaveRate: number | null;
  avgPositionOfSave: number | null;

  // Score metrics
  avgBaseScore: number | null;
  avgPersonalizedScore: number | null;
  avgScoreLift: number | null;

  // UX
  avgDwellTime: number | null;

  // Cold start
  fullColdCount: number;
  partialColdCount: number;
  warmCount: number;

  // Exploration
  explorationImpressions: number;
  explorationClicks: number;
  explorationSaves: number;
  explorationCTR: number | null;
  explorationSaveRate: number | null;
}

async function main(): Promise<void> {
  console.log('📊 Starting metrics computation...\n');
  console.log(`   Target date: ${TARGET_DATE.toISOString().split('T')[0]}`);
  console.log(`   Mode: ${DRY_RUN ? '🔍 DRY RUN' : '💾 LIVE'}\n`);

  const startTime = Date.now();

  try {
    // Define time range for the target day
    const dayStart = new Date(TARGET_DATE);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(TARGET_DATE);
    dayEnd.setHours(23, 59, 59, 999);

    console.log(`   Window: ${dayStart.toISOString()} to ${dayEnd.toISOString()}\n`);

    // 1. Fetch all events for the day
    console.log('📈 Fetching events...');
    const events = await db.recommendation_events.findMany({
      where: {
        occurredAt: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
      select: {
        organizationId: true,
        programId: true,
        eventType: true,
        position: true,
        matchScore: true,
        dwellTimeMs: true,
        source: true,
      },
    });

    console.log(`   Found ${events.length} events\n`);

    if (events.length === 0) {
      console.log('✅ No events for this date. Exiting.');
      return;
    }

    // 2. Compute metrics
    console.log('🔢 Computing metrics...');
    const metrics = computeMetrics(events, dayStart);

    // 3. Get cold start breakdown from status table
    const coldStartStats = await db.organization_personalization_status.groupBy({
      by: ['status'],
      _count: { status: true },
    });

    for (const stat of coldStartStats) {
      if (stat.status === 'FULL_COLD') metrics.fullColdCount = stat._count.status;
      if (stat.status === 'PARTIAL_COLD') metrics.partialColdCount = stat._count.status;
      if (stat.status === 'WARM') metrics.warmCount = stat._count.status;
    }

    // 4. Store metrics
    if (!DRY_RUN) {
      console.log('\n💾 Storing metrics...');

      await db.personalization_metrics.upsert({
        where: {
          date_configName: {
            date: dayStart,
            configName: metrics.configName,
          },
        },
        update: {
          totalImpressions: metrics.totalImpressions,
          totalViews: metrics.totalViews,
          totalClicks: metrics.totalClicks,
          totalSaves: metrics.totalSaves,
          totalDismisses: metrics.totalDismisses,
          uniqueOrganizations: metrics.uniqueOrganizations,
          uniquePrograms: metrics.uniquePrograms,
          adjustedCTR: metrics.adjustedCTR,
          adjustedSaveRate: metrics.adjustedSaveRate,
          avgPositionOfSave: metrics.avgPositionOfSave,
          avgBaseScore: metrics.avgBaseScore,
          avgDwellTime: metrics.avgDwellTime,
          fullColdCount: metrics.fullColdCount,
          partialColdCount: metrics.partialColdCount,
          warmCount: metrics.warmCount,
          explorationImpressions: metrics.explorationImpressions,
          explorationClicks: metrics.explorationClicks,
          explorationSaves: metrics.explorationSaves,
          explorationCTR: metrics.explorationCTR,
          explorationSaveRate: metrics.explorationSaveRate,
        },
        create: {
          date: dayStart,
          configName: metrics.configName,
          totalImpressions: metrics.totalImpressions,
          totalViews: metrics.totalViews,
          totalClicks: metrics.totalClicks,
          totalSaves: metrics.totalSaves,
          totalDismisses: metrics.totalDismisses,
          uniqueOrganizations: metrics.uniqueOrganizations,
          uniquePrograms: metrics.uniquePrograms,
          adjustedCTR: metrics.adjustedCTR,
          adjustedSaveRate: metrics.adjustedSaveRate,
          avgPositionOfSave: metrics.avgPositionOfSave,
          avgBaseScore: metrics.avgBaseScore,
          avgDwellTime: metrics.avgDwellTime,
          fullColdCount: metrics.fullColdCount,
          partialColdCount: metrics.partialColdCount,
          warmCount: metrics.warmCount,
          explorationImpressions: metrics.explorationImpressions,
          explorationClicks: metrics.explorationClicks,
          explorationSaves: metrics.explorationSaves,
          explorationCTR: metrics.explorationCTR,
          explorationSaveRate: metrics.explorationSaveRate,
        },
      });

      console.log('   ✓ Metrics stored');
    }

    // Print summary
    const duration = Date.now() - startTime;
    printSummary(metrics, duration);

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

function computeMetrics(
  events: Array<{
    organizationId: string;
    programId: string;
    eventType: RecommendationEventType;
    position: number;
    matchScore: number;
    dwellTimeMs: number | null;
    source: string | null;
  }>,
  date: Date
): DailyMetrics {
  // Count by event type
  const impressions = events.filter(e => e.eventType === 'IMPRESSION');
  const views = events.filter(e => e.eventType === 'VIEW');
  const clicks = events.filter(e => e.eventType === 'CLICK');
  const saves = events.filter(e => e.eventType === 'SAVE');
  const dismisses = events.filter(e => e.eventType === 'DISMISS');

  // Unique counts
  const uniqueOrgs = new Set(events.map(e => e.organizationId));
  const uniquePrograms = new Set(events.map(e => e.programId));

  // Position-debiased CTR
  // Weight impressions by position bias, count clicks weighted similarly
  let weightedImpressions = 0;
  let weightedClicks = 0;
  let weightedSaves = 0;

  for (const imp of impressions) {
    const bias = POSITION_BIAS[imp.position] || 0.25;
    weightedImpressions += 1 / bias;
  }

  for (const click of clicks) {
    const bias = POSITION_BIAS[click.position] || 0.25;
    weightedClicks += 1 / bias;
  }

  for (const save of saves) {
    const bias = POSITION_BIAS[save.position] || 0.25;
    weightedSaves += 1 / bias;
  }

  const adjustedCTR = weightedImpressions > 0
    ? weightedClicks / weightedImpressions
    : null;

  const adjustedSaveRate = weightedImpressions > 0
    ? weightedSaves / weightedImpressions
    : null;

  // Average position of saves
  const avgPositionOfSave = saves.length > 0
    ? saves.reduce((sum, s) => sum + s.position, 0) / saves.length
    : null;

  // Average base score (matchScore is the base score at impression time)
  const avgBaseScore = impressions.length > 0
    ? impressions.reduce((sum, i) => sum + i.matchScore, 0) / impressions.length
    : null;

  // Average dwell time (from VIEW events)
  const dwellTimes = views
    .filter(v => v.dwellTimeMs != null)
    .map(v => v.dwellTimeMs!);
  const avgDwellTime = dwellTimes.length > 0
    ? dwellTimes.reduce((sum, d) => sum + d, 0) / dwellTimes.length
    : null;

  // Exploration metrics (source === 'exploration')
  const explorationEvents = events.filter(e => e.source === 'exploration');
  const explorationImpressions = explorationEvents.filter(e => e.eventType === 'IMPRESSION').length;
  const explorationClicks = explorationEvents.filter(e => e.eventType === 'CLICK').length;
  const explorationSaves = explorationEvents.filter(e => e.eventType === 'SAVE').length;

  const explorationCTR = explorationImpressions > 0
    ? explorationClicks / explorationImpressions
    : null;

  const explorationSaveRate = explorationImpressions > 0
    ? explorationSaves / explorationImpressions
    : null;

  return {
    date,
    configName: 'default', // TODO: Get from active config

    totalImpressions: impressions.length,
    totalViews: views.length,
    totalClicks: clicks.length,
    totalSaves: saves.length,
    totalDismisses: dismisses.length,

    uniqueOrganizations: uniqueOrgs.size,
    uniquePrograms: uniquePrograms.size,

    adjustedCTR,
    adjustedSaveRate,
    avgPositionOfSave,

    avgBaseScore,
    avgPersonalizedScore: null, // Would need to store at event time
    avgScoreLift: null,

    avgDwellTime,

    fullColdCount: 0,
    partialColdCount: 0,
    warmCount: 0,

    explorationImpressions,
    explorationClicks,
    explorationSaves,
    explorationCTR,
    explorationSaveRate,
  };
}

function printSummary(metrics: DailyMetrics, durationMs: number): void {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📊 PERSONALIZATION METRICS SUMMARY');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`   Date:                  ${metrics.date.toISOString().split('T')[0]}`);
  console.log(`   Config:                ${metrics.configName}`);
  console.log(`   Mode:                  ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log('───────────────────────────────────────────────────────────');
  console.log('   VOLUME');
  console.log(`   Impressions:           ${metrics.totalImpressions}`);
  console.log(`   Views:                 ${metrics.totalViews}`);
  console.log(`   Clicks:                ${metrics.totalClicks}`);
  console.log(`   Saves:                 ${metrics.totalSaves}`);
  console.log(`   Dismisses:             ${metrics.totalDismisses}`);
  console.log(`   Unique Orgs:           ${metrics.uniqueOrganizations}`);
  console.log(`   Unique Programs:       ${metrics.uniquePrograms}`);
  console.log('───────────────────────────────────────────────────────────');
  console.log('   QUALITY (Position-Debiased)');
  console.log(`   Adjusted CTR:          ${metrics.adjustedCTR?.toFixed(4) ?? 'N/A'}`);
  console.log(`   Adjusted Save Rate:    ${metrics.adjustedSaveRate?.toFixed(4) ?? 'N/A'}`);
  console.log(`   Avg Position of Save:  ${metrics.avgPositionOfSave?.toFixed(2) ?? 'N/A'}`);
  console.log(`   Avg Base Score:        ${metrics.avgBaseScore?.toFixed(1) ?? 'N/A'}`);
  console.log(`   Avg Dwell Time (ms):   ${metrics.avgDwellTime?.toFixed(0) ?? 'N/A'}`);
  console.log('───────────────────────────────────────────────────────────');
  console.log('   COLD START BREAKDOWN');
  console.log(`   Full Cold:             ${metrics.fullColdCount}`);
  console.log(`   Partial Cold:          ${metrics.partialColdCount}`);
  console.log(`   Warm:                  ${metrics.warmCount}`);
  console.log('───────────────────────────────────────────────────────────');
  console.log('   EXPLORATION');
  console.log(`   Impressions:           ${metrics.explorationImpressions}`);
  console.log(`   Clicks:                ${metrics.explorationClicks}`);
  console.log(`   Saves:                 ${metrics.explorationSaves}`);
  console.log(`   CTR:                   ${metrics.explorationCTR?.toFixed(4) ?? 'N/A'}`);
  console.log(`   Save Rate:             ${metrics.explorationSaveRate?.toFixed(4) ?? 'N/A'}`);
  console.log('───────────────────────────────────────────────────────────');
  console.log(`   Duration:              ${(durationMs / 1000).toFixed(2)}s`);
  console.log('═══════════════════════════════════════════════════════════\n');
}

// Run
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
