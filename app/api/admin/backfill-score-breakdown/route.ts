/**
 * Admin API: Backfill scoreBreakdown into existing match explanations
 *
 * POST /api/admin/backfill-score-breakdown
 * POST /api/admin/backfill-score-breakdown?dryRun=true
 *
 * Problem: Matches created before commit 7648aa6 have explanation JSON
 * without the `scoreBreakdown` field. The AI explanation API reads
 * scoreBreakdown from explanation → all scores appear as 0 → AI concludes
 * "부적합" even for 93-point matches.
 *
 * Solution: Re-run calculateMatchScore for affected matches and merge
 * the breakdown into the existing explanation JSON, then clear cached
 * AI explanations so they regenerate with correct scores.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import { PrismaClient } from '@prisma/client';
import { calculateMatchScore } from '@/lib/matching/algorithm';
import { clearExplanationCache } from '@/lib/ai/services/match-explanation';

// Direct Prisma Client instantiation (same pattern as invalidate-matches)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error'],
  });

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = db;
}

const BATCH_SIZE = 50;

// Program statuses to clear from AI explanation cache
const PROGRAM_STATUSES = ['ACTIVE', 'EXPIRED', 'ARCHIVED'];

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Authentication + admin role check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const dryRun = searchParams.get('dryRun') === 'true';

    console.log(
      `[ADMIN] Backfill scoreBreakdown triggered by user: ${session.user.id} (dryRun: ${dryRun})`
    );

    // 2. Find matches with explanation JSON that lacks scoreBreakdown
    // Use jsonb_exists() instead of ? operator to avoid Prisma $queryRaw parameter collision
    const affectedMatches: Array<{ id: string }> = await db.$queryRaw`
      SELECT id FROM funding_matches
      WHERE explanation IS NOT NULL
        AND NOT jsonb_exists(explanation::jsonb, 'scoreBreakdown')
    `;

    const totalFound = affectedMatches.length;
    console.log(`[ADMIN] Found ${totalFound} matches missing scoreBreakdown`);

    if (dryRun) {
      return NextResponse.json(
        {
          dryRun: true,
          totalFound,
          message: `${totalFound} matches would be updated. Run without dryRun to execute.`,
          executionTimeMs: Date.now() - startTime,
        },
        { status: 200 }
      );
    }

    if (totalFound === 0) {
      return NextResponse.json(
        {
          totalFound: 0,
          updated: 0,
          failed: 0,
          skipped: 0,
          errors: [],
          message: 'No matches need backfilling.',
          executionTimeMs: Date.now() - startTime,
        },
        { status: 200 }
      );
    }

    // 3. Process in batches
    let updated = 0;
    let failed = 0;
    let skipped = 0;
    const errors: Array<{ matchId: string; error: string }> = [];

    for (let i = 0; i < affectedMatches.length; i += BATCH_SIZE) {
      const batch = affectedMatches.slice(i, i + BATCH_SIZE);
      const batchIds = batch.map((m) => m.id);

      // Fetch full match data with organization (including locations) and program
      const matches = await db.funding_matches.findMany({
        where: { id: { in: batchIds } },
        include: {
          organizations: {
            include: {
              locations: true,
            },
          },
          funding_programs: true,
        },
      });

      for (const match of matches) {
        try {
          const organization = match.organizations;
          const program = match.funding_programs;

          if (!organization || !program) {
            skipped++;
            continue;
          }

          // 4. Recalculate score breakdown using the algorithm
          const matchScore = calculateMatchScore(organization, program);

          // 5. Merge scoreBreakdown into existing explanation JSON (preserve other fields)
          const existingExplanation =
            (match.explanation as Record<string, any>) || {};
          const updatedExplanation = {
            ...existingExplanation,
            scoreBreakdown: {
              keywordScore: matchScore.breakdown.keywordScore,
              industryScore: matchScore.breakdown.industryScore,
              trlScore: matchScore.breakdown.trlScore,
              typeScore: matchScore.breakdown.typeScore,
              rdScore: matchScore.breakdown.rdScore,
              deadlineScore: matchScore.breakdown.deadlineScore,
            },
          };

          // 6. Update DB — only the explanation field, not the total score
          await db.funding_matches.update({
            where: { id: match.id },
            data: {
              explanation: updatedExplanation as any,
            },
          });

          // 7. Clear AI explanation cache for all program statuses
          for (const status of PROGRAM_STATUSES) {
            await clearExplanationCache(
              match.organizationId,
              match.programId,
              status
            );
          }

          updated++;
        } catch (err) {
          failed++;
          errors.push({
            matchId: match.id,
            error: err instanceof Error ? err.message : String(err),
          });
          console.error(
            `[ADMIN] Failed to backfill match ${match.id}:`,
            err
          );
        }
      }

      console.log(
        `[ADMIN] Batch ${Math.floor(i / BATCH_SIZE) + 1}: processed ${matches.length} matches (running total: ${updated} updated, ${failed} failed)`
      );
    }

    const executionTimeMs = Date.now() - startTime;
    console.log(
      `[ADMIN] Backfill complete: ${updated} updated, ${failed} failed, ${skipped} skipped in ${executionTimeMs}ms`
    );

    return NextResponse.json(
      {
        totalFound,
        updated,
        failed,
        skipped,
        errors: errors.slice(0, 20), // Limit error detail to first 20
        executionTimeMs,
        message: `Backfilled ${updated}/${totalFound} matches with scoreBreakdown. ${failed > 0 ? `${failed} failed.` : ''} AI explanation caches cleared.`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[ADMIN] Backfill scoreBreakdown error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
