/**
 * Compute Ranking Quality Metrics
 *
 * Computes Precision@K, nDCG@K, and Hit Rate metrics for SME matching.
 * Uses attribution SQL to trace saves back to their generating sessions.
 *
 * Usage:
 *   npx tsx scripts/compute-ranking-metrics.ts              # Compute and store
 *   npx tsx scripts/compute-ranking-metrics.ts --dry-run    # Preview only
 *   npx tsx scripts/compute-ranking-metrics.ts --days 14    # Custom window
 *
 * Design decisions (from 8 rounds of expert review):
 * - 7-day rolling window by default (adjustable)
 * - Minimum 30 samples for reliable metrics
 * - Last-touch attribution within 7 days
 * - Position is 1-based
 * - Period boundaries in KST (Asia/Seoul)
 */

import { PrismaClient } from '@prisma/client';
import {
  computeMetricsFromAttribution,
  roundMetric,
  toKSTDate,
  get7DayWindow,
  type AttributedSave,
  type SessionMetadata,
} from '../lib/analytics/ranking-metrics';

const prisma = new PrismaClient();

interface CliArgs {
  dryRun: boolean;
  days: number;
}

function parseArgs(): CliArgs {
  const daysArgIdx = process.argv.indexOf('--days');
  let days = 7; // default

  // Check for --days=N format
  const daysEqArg = process.argv.find((arg) => arg.startsWith('--days='));
  if (daysEqArg) {
    days = parseInt(daysEqArg.split('=')[1], 10) || 7;
  } else if (daysArgIdx !== -1 && process.argv[daysArgIdx + 1]) {
    // Check for --days N format
    days = parseInt(process.argv[daysArgIdx + 1], 10) || 7;
  }

  return {
    dryRun: process.argv.includes('--dry-run'),
    days,
  };
}

async function main() {
  const args = parseArgs();

  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  SME Ranking Quality Metrics Computation                     ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`Mode: ${args.dryRun ? 'DRY RUN (no writes)' : 'LIVE'}`);
  console.log(`Window: ${args.days} days`);
  console.log('');

  // Calculate period boundaries
  // Use current time as end (not truncated to date) to include today's sessions
  const now = new Date();
  const windowMs = args.days * 24 * 60 * 60 * 1000;
  const actualStart = new Date(now.getTime() - windowMs);
  const periodEnd = now;
  const periodStart = actualStart;

  console.log(`Period: ${actualStart.toISOString()} → ${periodEnd.toISOString()}`);
  console.log('');

  // ========================================================================
  // Phase 1: Fetch Sessions
  // ========================================================================
  console.log('📋 Phase 1: Fetching sessions...');

  const sessions = await prisma.sme_match_sessions.findMany({
    where: {
      createdAt: {
        gte: actualStart,
        lte: periodEnd,
      },
    },
    select: {
      id: true,
      organizationId: true,
      sourceSessionId: true,
      configName: true,
      createdAt: true,
      _count: {
        select: {
          matches: true,
        },
      },
    },
  });

  console.log(`   Found ${sessions.length} sessions in period`);

  if (sessions.length === 0) {
    console.log('   ⚠️  No sessions found. Exiting.');
    return;
  }

  // Build session metadata
  const sessionMetadata: SessionMetadata[] = sessions.map((s) => ({
    sessionId: s.id,
    organizationId: s.organizationId,
    generatedCount: s._count.matches,
    isCached: s.sourceSessionId !== null,
    configName: s.configName,
    createdAt: s.createdAt,
  }));

  const cachedCount = sessionMetadata.filter((s) => s.isCached).length;
  console.log(`   Fresh sessions: ${sessions.length - cachedCount}`);
  console.log(`   Cache hit sessions: ${cachedCount}`);
  console.log('');

  // ========================================================================
  // Phase 2: Attribution SQL - Trace saves back to sessions
  // ========================================================================
  console.log('📋 Phase 2: Running attribution SQL...');

  // Get session IDs for lookup
  const sessionIds = sessions.map((s) => s.id);

  // Build impressions mapping (session → matches with positions)
  // For cache hits, use source session's matches
  const impressions = await prisma.$queryRaw<
    {
      sessionId: string;
      organizationId: string;
      programId: string;
      position: number;
      impressionAt: Date;
    }[]
  >`
    SELECT
      s.id as "sessionId",
      s."organizationId",
      m."programId",
      m.position,
      s.created_at as "impressionAt"
    FROM sme_match_sessions s
    JOIN sme_program_matches m
      ON m."sessionId" = COALESCE(s.source_session_id, s.id)
    WHERE s.id = ANY(${sessionIds})
      AND m.position IS NOT NULL
  `;

  console.log(`   Found ${impressions.length} impressions (match views)`);

  // Get SAVE events in the period
  // Last-touch attribution: most recent impression before save within 7 days
  const attributedSaves = await prisma.$queryRaw<
    {
      sessionId: string;
      programId: string;
      position: number;
      saveAt: Date;
    }[]
  >`
    WITH saves AS (
      SELECT
        "organizationId",
        "programId",
        sme_session_id as "directSessionId",
        "occurredAt" as "saveAt"
      FROM recommendation_events
      WHERE "eventType" = 'SAVE'
        AND "occurredAt" >= ${actualStart}
        AND "occurredAt" <= ${periodEnd}
    ),
    impressions AS (
      SELECT
        s.id as "sessionId",
        s."organizationId",
        m."programId",
        m.position,
        s.created_at as "impressionAt"
      FROM sme_match_sessions s
      JOIN sme_program_matches m
        ON m."sessionId" = COALESCE(s.source_session_id, s.id)
      WHERE s.id = ANY(${sessionIds})
        AND m.position IS NOT NULL
    )
    SELECT DISTINCT ON (s."organizationId", s."programId")
      COALESCE(s."directSessionId", i."sessionId") as "sessionId",
      s."programId",
      i.position,
      s."saveAt"
    FROM saves s
    LEFT JOIN impressions i
      ON i."organizationId" = s."organizationId"
      AND i."programId" = s."programId"
      AND i."impressionAt" <= s."saveAt"
      AND i."impressionAt" >= s."saveAt" - INTERVAL '7 days'
    WHERE COALESCE(s."directSessionId", i."sessionId") IS NOT NULL
      AND i.position IS NOT NULL
    ORDER BY s."organizationId", s."programId", i."impressionAt" DESC NULLS LAST
  `;

  console.log(`   Attributed ${attributedSaves.length} saves to sessions`);
  console.log('');

  // ========================================================================
  // Phase 3: Compute Metrics
  // ========================================================================
  console.log('📋 Phase 3: Computing metrics...');

  const metrics = computeMetricsFromAttribution(
    sessionMetadata,
    attributedSaves.map((s) => ({
      sessionId: s.sessionId,
      programId: s.programId,
      position: s.position,
      saveAt: new Date(s.saveAt),
    })),
    actualStart,
    periodEnd,
    30 // minSampleSize
  );

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  Results                                                     ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`Config Name:        ${metrics.configName}`);
  console.log(`Period:             ${metrics.periodStart.toISOString().split('T')[0]} → ${metrics.periodEnd.toISOString().split('T')[0]}`);
  console.log(`Sample Size:        ${metrics.sampleSize}`);
  console.log(`Sufficient Sample:  ${metrics.isSufficientSample ? '✓ Yes' : '⚠️ No (need 30+)'}`);
  console.log(`Cached Ratio:       ${metrics.cachedSessionRatio !== null ? (metrics.cachedSessionRatio * 100).toFixed(1) + '%' : 'N/A'}`);
  console.log('');
  console.log('Metrics:');
  console.log(`  Precision@5:      ${metrics.precisionAt5 !== null ? (metrics.precisionAt5 * 100).toFixed(2) + '%' : 'N/A'}`);
  console.log(`  Precision@10:     ${metrics.precisionAt10 !== null ? (metrics.precisionAt10 * 100).toFixed(2) + '%' : 'N/A'}`);
  console.log(`  nDCG@10:          ${metrics.ndcgAt10 !== null ? (metrics.ndcgAt10 * 100).toFixed(2) + '%' : 'N/A'}`);
  console.log(`  Hit Rate@10:      ${metrics.hitRate !== null ? (metrics.hitRate * 100).toFixed(2) + '%' : 'N/A'}`);
  console.log('');

  // ========================================================================
  // Phase 4: Store Results
  // ========================================================================
  if (args.dryRun) {
    console.log('🔍 Dry run mode - skipping database write');
    console.log('   Run without --dry-run to store metrics');
  } else {
    console.log('📋 Phase 4: Storing metrics...');

    // Check for existing metrics for this period+config
    const existing = await prisma.ranking_quality_metrics.findFirst({
      where: {
        periodEnd: metrics.periodEnd,
        configName: metrics.configName,
        supersededAt: null,
      },
      orderBy: {
        revision: 'desc',
      },
    });

    if (existing) {
      // Supersede existing metrics
      const newMetric = await prisma.ranking_quality_metrics.create({
        data: {
          periodStart: metrics.periodStart,
          periodEnd: metrics.periodEnd,
          configName: metrics.configName,
          generatedPrecisionAt5: roundMetric(metrics.precisionAt5),
          generatedPrecisionAt10: roundMetric(metrics.precisionAt10),
          ndcgAt10Conditional: roundMetric(metrics.ndcgAt10),
          hitRate: roundMetric(metrics.hitRate),
          sampleSize: metrics.sampleSize,
          cachedSessionRatio: roundMetric(metrics.cachedSessionRatio),
          minSampleThreshold: 30,
          revision: existing.revision + 1,
          dataWatermark: metrics.dataWatermark,
        },
      });

      // Mark old as superseded
      await prisma.ranking_quality_metrics.update({
        where: { id: existing.id },
        data: {
          supersededAt: new Date(),
          supersededById: newMetric.id,
        },
      });

      console.log(`   ✓ Created revision ${newMetric.revision} (superseded revision ${existing.revision})`);
    } else {
      // Create new metrics record
      await prisma.ranking_quality_metrics.create({
        data: {
          periodStart: metrics.periodStart,
          periodEnd: metrics.periodEnd,
          configName: metrics.configName,
          generatedPrecisionAt5: roundMetric(metrics.precisionAt5),
          generatedPrecisionAt10: roundMetric(metrics.precisionAt10),
          ndcgAt10Conditional: roundMetric(metrics.ndcgAt10),
          hitRate: roundMetric(metrics.hitRate),
          sampleSize: metrics.sampleSize,
          cachedSessionRatio: roundMetric(metrics.cachedSessionRatio),
          minSampleThreshold: 30,
          revision: 1,
          dataWatermark: metrics.dataWatermark,
        },
      });

      console.log('   ✓ Created new metrics record (revision 1)');
    }
  }

  console.log('');
  console.log('✅ Computation complete!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
