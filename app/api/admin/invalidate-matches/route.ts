/**
 * Admin API: Invalidate all match caches and database records
 *
 * POST /api/admin/invalidate-matches
 *
 * Use after algorithm deploys to flush stale data from both Redis and DB.
 * Matches are regenerated fresh on each user's next visit.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import { PrismaClient } from '@prisma/client';
import {
  invalidateAllMatches,
  invalidateAllSmeMatches,
  invalidateProgramsCache,
} from '@/lib/cache/redis-cache';
import { MATCH_ALGORITHM_VERSION } from '@/lib/matching/algorithm';

// Direct Prisma Client instantiation (bypasses lib/db module resolution issue)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
};

const db = globalForPrisma.prisma ?? new PrismaClient({
  log: ['error'],
});

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = db;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authentication + admin role check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    console.log(`[ADMIN] Match invalidation triggered by user: ${session.user.id}`);

    // 2. Flush all Redis match caches
    const matchKeysDeleted = await invalidateAllMatches();
    const smeKeysDeleted = await invalidateAllSmeMatches();
    await invalidateProgramsCache();

    const totalCacheKeys = matchKeysDeleted + smeKeysDeleted;
    console.log(`[ADMIN] Redis: ${totalCacheKeys} cache keys invalidated (match: ${matchKeysDeleted}, sme: ${smeKeysDeleted})`);

    // 3. Delete all DB match records (forces full regeneration)
    const dbResult = await db.funding_matches.deleteMany({});
    console.log(`[ADMIN] DB: ${dbResult.count} funding_matches records deleted`);

    return NextResponse.json({
      success: true,
      algorithmVersion: MATCH_ALGORITHM_VERSION,
      cacheKeysDeleted: totalCacheKeys,
      dbRecordsDeleted: dbResult.count,
      message: `Invalidated ${totalCacheKeys} cache keys and ${dbResult.count} DB records. All matches will regenerate on next user visit.`,
    }, { status: 200 });

  } catch (error) {
    console.error('[ADMIN] Match invalidation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
