/**
 * Historical Match Generation API (with Redis Caching)
 *
 * Feature: Generate funding opportunity matches from EXPIRED R&D programs
 * Use case: Show "missed opportunities" from 2025 to users during off-season
 *
 * Business Logic:
 * - Historical matches COUNT toward FREE tier's 3 matches/month limit
 * - Saved to funding_matches table (same as active matches)
 * - 24-hour cache TTL (same as active matches)
 * - Opt-in UI (user must explicitly request)
 *
 * Rate limiting enforced:
 * - Free tier: 3 TOTAL matches/month (active + historical)
 * - Pro/Team tier: Unlimited
 *
 * Caching strategy:
 * - Match results: 24h TTL (invalidated on profile update or new programs)
 * - Organization profiles: 1h TTL (invalidated on profile update)
 * - Expired programs: 6h TTL (invalidated after scraping)
 *
 * POST /api/matches/historical/generate?organizationId=xxx
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import { PrismaClient, ProgramStatus, AnnouncementType } from '@prisma/client';

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
import { generateMatches } from '@/lib/matching/algorithm';
import { generateExplanation } from '@/lib/matching/explainer';
import { checkMatchLimit, trackApiUsage } from '@/lib/rateLimit';
import {
  getCache,
  setCache,
  getOrgCacheKey,
  getHistoricalMatchCacheKey,
  invalidateHistoricalMatches,
  CACHE_TTL,
} from '@/lib/cache/redis-cache';

// Historical programs cache key
function getHistoricalProgramsCacheKey(): string {
  return `programs:historical`;
}


export async function POST(request: NextRequest) {
  try {
    // 1. Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // 2. Get organization ID from query params
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const forceRegenerate = searchParams.get('forceRegenerate') === 'true';

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Missing organizationId parameter' },
        { status: 400 }
      );
    }

    // 2a. Force regeneration if requested (safety mechanism)
    if (forceRegenerate) {
      // Clear cache and delete all existing EXPIRED matches
      await invalidateHistoricalMatches(organizationId);
      await db.funding_matches.deleteMany({
        where: {
          organizationId,
          funding_programs: {
            status: ProgramStatus.EXPIRED,
          },
        },
      });
      console.log('[HISTORICAL] Force regeneration - cleared cache and database historical matches for org:', organizationId);
    }

    // 2b. Check cache for existing historical match results (24h TTL)
    const matchCacheKey = getHistoricalMatchCacheKey(organizationId);
    const cachedMatches = await getCache<any>(matchCacheKey);

    if (cachedMatches) {
      // Cache hit! Return cached matches immediately
      return NextResponse.json(
        {
          ...cachedMatches,
          cached: true,
          cacheTimestamp: new Date().toISOString(),
        },
        { status: 200 }
      );
    }
    // Cache miss - continue to generate fresh matches

    // 3. Fetch organization profile (with cache)
    const orgCacheKey = getOrgCacheKey(organizationId);
    let organization = await getCache<any>(orgCacheKey);

    if (!organization) {
      // Cache miss - fetch from database
      organization = await db.organizations.findUnique({
        where: { id: organizationId },
        include: {
          users: {
            where: { id: userId },
          },
        },
      });

      if (organization) {
        // Cache organization profile for 1 hour
        await setCache(orgCacheKey, organization, CACHE_TTL.ORG_PROFILE);
      }
    }

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // 4. Check if user owns this organization
    if (organization.users.length === 0) {
      return NextResponse.json(
        { error: 'You do not have access to this organization' },
        { status: 403 }
      );
    }

    // 5. Check if profile is complete
    if (!organization.profileCompleted) {
      return NextResponse.json(
        {
          error: 'Please complete your organization profile before generating matches',
          profileComplete: false,
        },
        { status: 400 }
      );
    }

    // 6. Get user's subscription plan
    const user = await db.user.findUnique({
      where: { id: userId },
      include: { subscriptions: true },
    });

    const plan = user?.subscriptions?.plan;
    const subscriptionPlan = (plan ? plan.toLowerCase() : 'free') as 'free' | 'pro' | 'team';

    // 7. Check rate limit (CRITICAL: Historical matches count toward limit!)
    const rateLimitCheck = await checkMatchLimit(userId, subscriptionPlan);

    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Monthly match limit reached',
          limit: 3,
          remaining: 0,
          resetDate: rateLimitCheck.resetDate.toISOString(),
          message: '이번 달 무료 매칭 횟수를 모두 사용하셨습니다. Pro 플랜으로 업그레이드하여 무제한 매칭을 받으세요.',
          upgradeUrl: '/pricing',
        },
        { status: 429 }
      );
    }

    // 8. Fetch EXPIRED funding programs (with cache)
    const programsCacheKey = getHistoricalProgramsCacheKey();
    let programs = await getCache<any[]>(programsCacheKey);

    if (!programs) {
      // Cache miss - fetch from database
      programs = await db.funding_programs.findMany({
        where: {
          status: ProgramStatus.EXPIRED, // KEY DIFFERENCE: Query EXPIRED programs
          announcementType: AnnouncementType.R_D_PROJECT, // Only R&D funding opportunities
          scrapingSource: {
            not: null, // Exclude test seed data
            notIn: ['NTIS_API'], // Exclude NTIS_API (old project data)
          },
        },
        orderBy: [
          { publishedAt: 'desc' }, // Newest announcements first
          { deadline: 'desc' },     // Most recent deadlines first
        ],
      });

      if (programs.length > 0) {
        // Cache expired programs for 6 hours
        await setCache(programsCacheKey, programs, CACHE_TTL.PROGRAMS);
      }
    }

    if (programs.length === 0) {
      return NextResponse.json(
        {
          error: 'No historical programs available',
          message: '현재 과거 지원 프로그램이 없습니다. 나중에 다시 시도해주세요.',
        },
        { status: 404 }
      );
    }

    // 9. Generate matches using algorithm (WITH includeExpired option)
    const matchResults = generateMatches(
      organization,
      programs,
      10, // Return more historical matches (10 instead of 3)
      { includeExpired: true } // KEY DIFFERENCE: Enable expired program matching
    );

    if (matchResults.length === 0) {
      return NextResponse.json(
        {
          matches: [],
          message: '귀하의 프로필과 일치하는 과거 프로그램이 없습니다. 프로필을 업데이트하거나 나중에 다시 시도해주세요.',
          remaining: rateLimitCheck.remaining,
          resetDate: rateLimitCheck.resetDate.toISOString(),
        },
        { status: 200 }
      );
    }

    // 10. Store matches in database (UPSERT to handle existing matches)
    const createdMatches = await Promise.all(
      matchResults.map(async (matchResult) => {
        // Generate Korean explanations
        const explanation = generateExplanation(
          matchResult,
          organization,
          matchResult.program
        );

        // UPSERT match record (create or update existing)
        // This makes the API idempotent - clicking "Generate Historical Matches" multiple times is safe
        return db.funding_matches.upsert({
          where: {
            organizationId_programId: {
              organizationId: organization.id,
              programId: matchResult.program.id,
            },
          },
          update: {
            // Update score and explanation if match already exists
            // Preserves user state: viewed, saved, notificationSent flags
            score: matchResult.score,
            explanation: explanation as any,
          },
          create: {
            // Create new match if doesn't exist
            organizationId: organization.id,
            programId: matchResult.program.id,
            score: matchResult.score,
            explanation: explanation as any,
          },
          include: {
            funding_programs: true,
          },
        });
      })
    );

    // 11. Track API usage for analytics
    await trackApiUsage(userId, '/api/matches/historical/generate');

    // 12. Return matches with explanations
    const response = {
      success: true,
      type: 'historical', // KEY DIFFERENCE: Mark as historical matches
      period: '2025-01-01 to 2025-10-23', // Data range from Phase 1 scraping
      matches: createdMatches.map((match: any) => ({
        id: match.id,
        program: {
          id: match.funding_programs.id,
          title: match.funding_programs.title,
          description: match.funding_programs.description,
          agencyId: match.funding_programs.agencyId,
          category: match.funding_programs.category,
          budgetAmount: match.funding_programs.budgetAmount?.toString(),
          deadline: match.funding_programs.deadline?.toISOString(),
          announcementUrl: match.funding_programs.announcementUrl,
          status: match.funding_programs.status, // Will be "EXPIRED"
        },
        score: match.score,
        explanation: match.explanation as any, // Already a JSON object
        isExpired: true, // KEY DIFFERENCE: Flag for UI rendering
        createdAt: match.createdAt.toISOString(),
      })),
      usage: {
        plan: subscriptionPlan,
        matchesUsed: 3 - rateLimitCheck.remaining + 1, // +1 for current request
        matchesRemaining: rateLimitCheck.remaining - 1,
        resetDate: rateLimitCheck.resetDate.toISOString(),
      },
      message: `2025년 ${matchResults.length}개의 놓친 기회를 찾았습니다. 유사한 공고가 다시 나올 때 알림을 받으세요.`,
      isHistorical: true, // KEY DIFFERENCE: Mark response as historical
    };

    // 13. Cache match results for 24 hours
    await setCache(matchCacheKey, response, CACHE_TTL.MATCH_RESULTS);

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Historical match generation error:', error);

    // Log error details for debugging
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
      });
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: '과거 매칭 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      },
      { status: 500 }
    );
  }
  // NOTE: Do NOT call db.$disconnect() in Next.js API routes
  // It breaks connection pooling and causes subsequent requests to fail
}
