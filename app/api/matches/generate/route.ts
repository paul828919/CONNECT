/**
 * Match Generation API (with Redis Caching)
 *
 * Core feature: Generate funding opportunity matches for organizations
 *
 * Rate limiting enforced:
 * - Free tier: 3 matches/month
 * - Pro/Team tier: Unlimited
 *
 * Caching strategy:
 * - Match results: 24h TTL (invalidated on profile update or new programs)
 * - Organization profiles: 1h TTL (invalidated on profile update)
 * - Active programs: 6h TTL (invalidated after scraping)
 *
 * POST /api/matches/generate?organizationId=xxx
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
  getMatchCacheKey,
  getOrgCacheKey,
  getProgramsCacheKey,
  CACHE_TTL,
} from '@/lib/cache/redis-cache';
import { logMatchQualityBulk } from '@/lib/analytics/match-performance';


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
      // Clear cache and delete all existing matches
      await invalidateOrgMatches(organizationId);
      await db.funding_matches.deleteMany({
        where: { organizationId },
      });
      console.log('[MATCH] Force regeneration - cleared cache and database matches for org:', organizationId);
    }

    // 2b. Check cache for existing match results (24h TTL)
    const matchCacheKey = getMatchCacheKey(organizationId);
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

    // 7. Check rate limit (critical for business model!)
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

    // 8. Fetch active funding programs (with cache)
    const programsCacheKey = getProgramsCacheKey();
    let programs = await getCache<any[]>(programsCacheKey);

    if (!programs) {
      // Cache miss - fetch from database
      programs = await db.funding_programs.findMany({
        where: {
          status: ProgramStatus.ACTIVE,
          announcementType: AnnouncementType.R_D_PROJECT, // Only R&D funding opportunities (exclude surveys, events, notices)
          // Allow NULL deadlines and budgets per user guidance:
          // - Many Jan-March NTIS announcements have "0억원" (budget TBD) → stored as NULL
          // - Some announcements don't have deadlines yet → stored as NULL
          // - These are REAL opportunities, not preliminary surveys
          scrapingSource: {
            not: null, // Exclude test seed data (seed data has scrapingSource = null)
            notIn: ['NTIS_API'], // Exclude NTIS_API (old project data, not announcements)
          },
        },
        orderBy: [
          { publishedAt: 'desc' }, // Newest announcements first
          { deadline: 'asc' },     // Then by urgency (soonest deadline) - NULLs appear last
        ],
      });

      if (programs.length > 0) {
        // Cache active programs for 6 hours
        await setCache(programsCacheKey, programs, CACHE_TTL.PROGRAMS);
      }
    }

    // Historical fallback: If no active programs, show recent opportunities (Jan 1 - today)
    let isHistoricalFallback = false;
    if (programs.length === 0) {
      const yearStart = new Date(new Date().getFullYear(), 0, 1); // Jan 1 of current year
      const today = new Date();

      programs = await db.funding_programs.findMany({
        where: {
          status: ProgramStatus.ACTIVE,
          announcementType: AnnouncementType.R_D_PROJECT, // Only R&D funding opportunities (exclude surveys, events, notices)
          deadline: {
            gte: yearStart,
            lt: today, // Only past deadlines (historical)
          },
          // Allow NULL budgets in historical fallback too
          scrapingSource: {
            not: null,
            notIn: ['NTIS_API'],
          },
        },
        orderBy: [
          { publishedAt: 'desc' },
          { deadline: 'desc' }, // Most recent deadlines first for historical data
        ],
        take: 10, // Limit historical results
      });

      if (programs.length > 0) {
        isHistoricalFallback = true;
      } else {
        // No programs at all (active or historical)
        return NextResponse.json(
          {
            error: 'No funding programs available',
            message: '현재 활성화된 지원 프로그램이 없습니다. 나중에 다시 시도해주세요.',
          },
          { status: 404 }
        );
      }
    }

    // 9. Generate matches using algorithm
    console.log('[MATCH GENERATION] Using organization profile for org:', organizationId);
    console.log('[MATCH GENERATION] Profile data:', {
      name: organization.name,
      industrySector: organization.industrySector,
      trlLevel: organization.technologyReadinessLevel,
      rdExperience: organization.rdExperience,
      employeeCount: organization.employeeCount,
      profileUpdatedAt: organization.updatedAt,
    });
    const matchResults = generateMatches(organization, programs, 3);
    console.log('[MATCH GENERATION] Generated', matchResults.length, 'matches');

    if (matchResults.length === 0) {
      return NextResponse.json(
        {
          matches: [],
          message: '귀하의 프로필과 일치하는 프로그램이 없습니다. 프로필을 업데이트하거나 나중에 다시 시도해주세요.',
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
        // This makes the API idempotent - clicking "Create Match" multiple times is safe
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

    // 11. Log match quality for analytics (non-blocking)
    await logMatchQualityBulk(
      matchResults.map((matchResult, index) => ({
        matchId: createdMatches[index].id,
        organizationId: organization.id,
        programId: matchResult.program.id,
        category: matchResult.program.category || 'UNKNOWN',
        score: matchResult.score,
        breakdown: matchResult.breakdown,
        saved: false, // Will be updated when user saves
        viewed: false, // Will be updated when user views
      }))
    );

    // 12. Track API usage for analytics
    await trackApiUsage(userId, '/api/matches/generate');

    // 13. Return matches with explanations
    const response = {
      success: true,
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
        },
        score: match.score,
        explanation: match.explanation as any, // Already a JSON object
        createdAt: match.createdAt.toISOString(),
      })),
      usage: {
        plan: subscriptionPlan,
        matchesUsed: 3 - rateLimitCheck.remaining + 1, // +1 for current request
        matchesRemaining: rateLimitCheck.remaining - 1,
        resetDate: rateLimitCheck.resetDate.toISOString(),
      },
      message: isHistoricalFallback
        ? `현재 진행 중인 공고는 없지만, 올해 마감된 유사 프로그램 ${matchResults.length}개를 찾았습니다. 새로운 공고가 올라오면 알림을 받으세요.`
        : `${matchResults.length}개의 적합한 지원 프로그램을 찾았습니다.`,
      isHistorical: isHistoricalFallback,
    };

    // 13. Cache match results for 24 hours
    await setCache(matchCacheKey, response, CACHE_TTL.MATCH_RESULTS);

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Match generation error:', error);

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
        message: '매칭 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      },
      { status: 500 }
    );
  }
  // NOTE: Do NOT call db.$disconnect() in Next.js API routes
  // It breaks connection pooling and causes subsequent requests to fail
}
