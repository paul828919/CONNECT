/**
 * Compute Program Co-Occurrences Script
 *
 * Daily batch job to compute program co-occurrence matrix for
 * Item-Item collaborative filtering.
 *
 * Algorithm:
 * 1. Get all SAVE events from the learning window (30 days)
 * 2. Group saves by organization
 * 3. For each org, compute all program pairs
 * 4. Aggregate co-occurrence counts across orgs
 * 5. Compute confidence scores (statistical significance)
 * 6. Upsert to program_co_occurrence table
 *
 * Usage:
 *   npx tsx scripts/compute-co-occurrences.ts
 *   npx tsx scripts/compute-co-occurrences.ts --dry-run
 *
 * Cron schedule (recommended):
 *   0 5 * * *  (5am daily - after aggregate-preferences.ts)
 *
 * @module scripts/compute-co-occurrences
 */

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient({
  log: ['error', 'warn'],
});

// Configuration
const LEARNING_WINDOW_DAYS = 30;
const MIN_CO_SAVE_COUNT = 2;      // Minimum co-saves to store
const BATCH_SIZE = 1000;          // Upsert batch size
const DRY_RUN = process.argv.includes('--dry-run');

interface CoOccurrencePair {
  programId1: string;
  programId2: string;
  coSaveCount: number;
  coViewCount: number;
  coClickCount: number;
}

interface ComputeStats {
  totalOrganizations: number;
  totalSaveEvents: number;
  uniquePrograms: number;
  coOccurrencePairs: number;
  pairsStored: number;
  duration: number;
}

async function main(): Promise<void> {
  console.log('🔄 Starting co-occurrence computation...\n');
  console.log(`   Learning window: ${LEARNING_WINDOW_DAYS} days`);
  console.log(`   Min co-save count: ${MIN_CO_SAVE_COUNT}`);
  console.log(`   Mode: ${DRY_RUN ? '🔍 DRY RUN' : '💾 LIVE'}\n`);

  const startTime = Date.now();
  const stats: ComputeStats = {
    totalOrganizations: 0,
    totalSaveEvents: 0,
    uniquePrograms: 0,
    coOccurrencePairs: 0,
    pairsStored: 0,
    duration: 0,
  };

  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - LEARNING_WINDOW_DAYS);

  console.log(`📅 Window start: ${windowStart.toISOString()}\n`);

  try {
    // 1. Get SAVE events grouped by organization
    console.log('📊 Fetching SAVE events...');
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

    stats.totalSaveEvents = saveEvents.length;
    console.log(`   Found ${stats.totalSaveEvents} SAVE events`);

    // 2. Group by organization
    const savesByOrg = new Map<string, Set<string>>();
    const uniquePrograms = new Set<string>();

    for (const event of saveEvents) {
      const programs = savesByOrg.get(event.organizationId) || new Set();
      programs.add(event.programId);
      savesByOrg.set(event.organizationId, programs);
      uniquePrograms.add(event.programId);
    }

    stats.totalOrganizations = savesByOrg.size;
    stats.uniquePrograms = uniquePrograms.size;

    console.log(`   ${stats.totalOrganizations} organizations with saves`);
    console.log(`   ${stats.uniquePrograms} unique programs\n`);

    if (stats.totalOrganizations === 0) {
      console.log('✅ No save events found. Exiting.');
      return;
    }

    // 3. Compute co-occurrences
    console.log('🔢 Computing co-occurrence pairs...');
    const coOccurrenceMap = new Map<string, CoOccurrencePair>();

    for (const [orgId, programs] of savesByOrg) {
      const programList = Array.from(programs);

      // Skip orgs with only 1 save
      if (programList.length < 2) continue;

      // Generate all pairs
      for (let i = 0; i < programList.length; i++) {
        for (let j = i + 1; j < programList.length; j++) {
          // Order pair lexicographically
          const [id1, id2] = programList[i] < programList[j]
            ? [programList[i], programList[j]]
            : [programList[j], programList[i]];

          const key = `${id1}:${id2}`;
          const existing = coOccurrenceMap.get(key);

          if (existing) {
            existing.coSaveCount++;
          } else {
            coOccurrenceMap.set(key, {
              programId1: id1,
              programId2: id2,
              coSaveCount: 1,
              coViewCount: 0,  // Could be computed separately
              coClickCount: 0, // Could be computed separately
            });
          }
        }
      }
    }

    stats.coOccurrencePairs = coOccurrenceMap.size;
    console.log(`   Generated ${stats.coOccurrencePairs} unique pairs\n`);

    // 4. Filter and compute confidence
    console.log('📈 Computing confidence scores...');
    const significantPairs: CoOccurrencePair[] = [];

    for (const pair of coOccurrenceMap.values()) {
      if (pair.coSaveCount >= MIN_CO_SAVE_COUNT) {
        significantPairs.push(pair);
      }
    }

    console.log(`   ${significantPairs.length} pairs above threshold (>= ${MIN_CO_SAVE_COUNT} co-saves)\n`);

    // Compute confidence based on sample size
    // Using Wilson score interval approximation
    const pairsWithConfidence = significantPairs.map(pair => {
      const confidence = computeConfidence(
        pair.coSaveCount,
        stats.totalOrganizations
      );
      return { ...pair, confidence };
    });

    // 5. Store results
    if (!DRY_RUN) {
      console.log('💾 Storing co-occurrence data...');

      // Clear old data first
      await db.program_co_occurrence.deleteMany({});

      // Batch upsert
      for (let i = 0; i < pairsWithConfidence.length; i += BATCH_SIZE) {
        const batch = pairsWithConfidence.slice(i, i + BATCH_SIZE);

        await db.program_co_occurrence.createMany({
          data: batch.map(pair => ({
            programId1: pair.programId1,
            programId2: pair.programId2,
            coSaveCount: pair.coSaveCount,
            coViewCount: pair.coViewCount,
            coClickCount: pair.coClickCount,
            confidence: pair.confidence,
            computedAt: new Date(),
          })),
          skipDuplicates: true,
        });

        const progress = Math.min(100, ((i + batch.length) / pairsWithConfidence.length * 100)).toFixed(1);
        console.log(`   Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${progress}% complete`);
      }

      stats.pairsStored = pairsWithConfidence.length;
    } else {
      console.log('🔍 DRY RUN - Would store:');
      console.log(`   ${pairsWithConfidence.length} co-occurrence pairs`);

      // Show sample
      console.log('\n   Sample pairs:');
      for (const pair of pairsWithConfidence.slice(0, 5)) {
        console.log(`   - ${pair.programId1.slice(0, 8)}... + ${pair.programId2.slice(0, 8)}... (${pair.coSaveCount} co-saves, conf: ${pair.confidence.toFixed(3)})`);
      }

      stats.pairsStored = pairsWithConfidence.length;
    }

    stats.duration = Date.now() - startTime;

    // Print summary
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📊 CO-OCCURRENCE COMPUTATION SUMMARY');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`   Mode:                  ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
    console.log(`   Organizations:         ${stats.totalOrganizations}`);
    console.log(`   Save events:           ${stats.totalSaveEvents}`);
    console.log(`   Unique programs:       ${stats.uniquePrograms}`);
    console.log(`   Total pairs:           ${stats.coOccurrencePairs}`);
    console.log(`   Significant pairs:     ${stats.pairsStored}`);
    console.log(`   Duration:              ${(stats.duration / 1000).toFixed(2)}s`);
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

/**
 * Compute confidence score based on sample size
 * Uses simplified Wilson score interval
 */
function computeConfidence(coSaveCount: number, totalOrgs: number): number {
  if (totalOrgs === 0) return 0;

  // Proportion of orgs that co-saved these programs
  const p = coSaveCount / totalOrgs;

  // Wilson score lower bound approximation
  // Higher sample size = higher confidence
  const z = 1.96; // 95% confidence
  const n = coSaveCount;

  if (n === 0) return 0;

  const denominator = 1 + (z * z) / n;
  const center = p + (z * z) / (2 * n);
  const spread = z * Math.sqrt((p * (1 - p) + (z * z) / (4 * n)) / n);

  const lowerBound = (center - spread) / denominator;

  // Normalize to 0-1 and apply minimum threshold
  return Math.max(0, Math.min(1, lowerBound * 10)); // Scale factor
}

// Run
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
