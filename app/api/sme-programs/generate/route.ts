/**
 * SME Programs Match Generation API (v2.2)
 *
 * POST /api/sme-programs/generate
 * Generates new SME program matches for the user's organization.
 *
 * v2.2 Changes (Ranking Metrics Infrastructure):
 * - Session tracking: Each match generation creates SmeMatchSession record
 * - Position assignment: Matches stored with 1-based position for nDCG@K
 * - Cache hit sessions: Reference source session via sourceSessionId
 * - Config name: Stable hash of scoring weights for A/B test tracking
 *
 * v2.0 Changes:
 * - Redis caching (24h TTL for match results, 4h for programs)
 * - UPSERT pattern (preserves viewed/saved/notificationSent flags)
 * - Rate limiting per subscription tier (FREE: 2/month, PRO: unlimited)
 * - Analytics logging (SME_FIRST_MATCH_GENERATED funnel event)
 * - forceRegenerate param to bypass cache
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import { db } from '@/lib/db';
import { generateSMEMatches, SMEMatchResult } from '@/lib/matching/sme-algorithm';
import { getActivePrograms } from '@/lib/sme24-api/program-service';
import {
  getCache,
  setCache,
  getSmeMatchCacheKey,
  getSmeProgramsCacheKey,
  CACHE_TTL,
  invalidateOrgSmeMatches,
} from '@/lib/cache/redis-cache';
import { checkSmeMatchLimit } from '@/lib/rateLimit';
import { AuditAction, logFunnelEvent, hasFunnelEvent } from '@/lib/audit';
import { getConfigName, DEFAULT_SME_WEIGHTS } from '@/lib/analytics/ranking-metrics';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Parse request body for optional params
    let forceRegenerate = false;
    try {
      const body = await request.json();
      forceRegenerate = body?.forceRegenerate === true;
    } catch {
      // No body or invalid JSON — use defaults
    }

    // Get user's organization with all required fields for matching
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        organizationId: true,
        organization: {
          include: {
            locations: true,
          },
        },
        subscriptions: true,
        role: true,
      },
    });

    if (!user?.organizationId || !user.organization) {
      return NextResponse.json(
        { error: '조직 프로필이 필요합니다. 먼저 프로필을 생성해주세요.' },
        { status: 400 }
      );
    }

    const organization = user.organization;

    // Check profile completeness (minimum required fields)
    if (!organization.name) {
      return NextResponse.json(
        { error: '조직 이름이 필요합니다. 프로필을 완성해주세요.' },
        { status: 400 }
      );
    }

    // ========================================================================
    // Rate Limiting (Step 5)
    // ========================================================================
    const plan = user.subscriptions?.plan;
    const subscriptionPlan = (plan ? plan.toLowerCase() : 'free') as 'free' | 'pro' | 'team';
    const userRole = user.role as 'USER' | 'ADMIN' | 'SUPER_ADMIN' | undefined;

    const rateLimitCheck = await checkSmeMatchLimit(userId, subscriptionPlan, userRole);

    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        {
          error: '이번 달 SME 매칭 생성 횟수를 초과했습니다.',
          data: {
            remaining: rateLimitCheck.remaining,
            resetDate: rateLimitCheck.resetDate,
            upgradeRequired: subscriptionPlan === 'free',
          },
        },
        { status: 429 }
      );
    }

    // ========================================================================
    // Session & Config Setup (v2.2)
    // ========================================================================
    const sessionId = randomUUID();
    const configName = getConfigName(DEFAULT_SME_WEIGHTS);
    const matchCacheKey = getSmeMatchCacheKey(organization.id);
    const sessionCacheKey = `${matchCacheKey}:sessionId`;

    // ========================================================================
    // Cache Check with Session Tracking (Step 3)
    // ========================================================================
    if (!forceRegenerate) {
      const cachedResults = await getCache<any>(matchCacheKey);
      const cachedSessionId = await getCache<string>(sessionCacheKey);

      if (cachedResults && cachedSessionId) {
        // Validate source session belongs to same org (defense in depth)
        const sourceSession = await db.sme_match_sessions.findUnique({
          where: { id: cachedSessionId },
          select: { organizationId: true },
        });

        if (sourceSession && sourceSession.organizationId === organization.id) {
          // Create cache hit session (references source session)
          await db.sme_match_sessions.create({
            data: {
              id: sessionId,
              organizationId: organization.id,
              sourceSessionId: cachedSessionId,
              configName,
            },
          });

          console.log(`[SME Match Gen] Cache HIT for org: ${organization.id}, session: ${sessionId}, source: ${cachedSessionId}`);

          return NextResponse.json({
            success: true,
            data: {
              ...cachedResults,
              cached: true,
              sessionId,
              rateLimitRemaining: rateLimitCheck.remaining,
            },
          });
        }
        // If org validation fails, treat as cache miss
        console.log(`[SME Match Gen] Cache session org mismatch, treating as cache miss`);
      }
    }

    console.log(`[SME Match Gen] Generating matches for org: ${organization.id}, session: ${sessionId}`);

    // ========================================================================
    // Fetch Active Programs (with cache)
    // ========================================================================
    const programsCacheKey = getSmeProgramsCacheKey();
    let programs: any[] | null = await getCache<any[]>(programsCacheKey);

    if (!programs) {
      const result = await getActivePrograms();
      programs = result.programs;

      if (programs.length > 0) {
        await setCache(programsCacheKey, programs, CACHE_TTL.PROGRAMS);
      }
    }

    console.log(`[SME Match Gen] Found ${programs.length} active programs`);

    if (programs.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          matchesGenerated: 0,
          message: '현재 접수 중인 지원사업이 없습니다. 나중에 다시 시도해주세요.',
        },
      });
    }

    // ========================================================================
    // Generate Matches
    // ========================================================================
    const matchResults = generateSMEMatches(organization, programs, {
      minimumScore: 50,
      limit: 100,
    });

    console.log(`[SME Match Gen] Generated ${matchResults.length} matches`);

    // ========================================================================
    // Create Fresh Session Record (v2.2)
    // ========================================================================
    await db.sme_match_sessions.create({
      data: {
        id: sessionId,
        organizationId: organization.id,
        sourceSessionId: null, // Fresh session
        configName,
      },
    });

    // ========================================================================
    // UPSERT Pattern (Step 4) - Preserve user state, add position
    // ========================================================================
    const currentProgramIds = matchResults.map(m => m.program.id);

    // UPSERT each match with position (1-based for ranking metrics)
    for (let i = 0; i < matchResults.length; i++) {
      const match = matchResults[i];
      const position = i + 1; // 1-based position

      await db.sme_program_matches.upsert({
        where: {
          organizationId_programId: {
            organizationId: organization.id,
            programId: match.program.id,
          },
        },
        update: {
          score: match.score,
          eligibilityLevel: match.eligibilityLevel as string,
          failedCriteria: match.failedCriteria,
          metCriteria: match.metCriteria,
          scoreBreakdown: JSON.parse(JSON.stringify(match.scoreBreakdown)),
          explanation: JSON.parse(JSON.stringify(match.explanation)),
          sessionId,   // Update to latest session
          position,    // Update position (may change on re-generation)
          // DO NOT update: viewed, saved, viewedAt, savedAt, notificationSent, notifiedAt
        },
        create: {
          organizationId: organization.id,
          programId: match.program.id,
          score: match.score,
          eligibilityLevel: match.eligibilityLevel as string,
          failedCriteria: match.failedCriteria,
          metCriteria: match.metCriteria,
          scoreBreakdown: JSON.parse(JSON.stringify(match.scoreBreakdown)),
          explanation: JSON.parse(JSON.stringify(match.explanation)),
          sessionId,
          position,
        },
      });
    }

    // Clean up stale matches (programs no longer in results AND not saved by user)
    await db.sme_program_matches.deleteMany({
      where: {
        organizationId: organization.id,
        programId: { notIn: currentProgramIds },
        saved: false,
      },
    });

    // ========================================================================
    // Fetch Stored Matches for Response
    // ========================================================================
    const storedMatches = await db.sme_program_matches.findMany({
      where: { organizationId: organization.id },
      include: {
        program: {
          select: {
            id: true,
            pblancSeq: true,
            title: true,
            detailBsnsNm: true,
            supportInstitution: true,
            applicationStart: true,
            applicationEnd: true,
            bizType: true,
            sportType: true,
            targetCompanyScale: true,
            targetRegions: true,
            requiredCerts: true,
            minSupportAmount: true,
            maxSupportAmount: true,
            minInterestRate: true,
            maxInterestRate: true,
            detailUrl: true,
            applicationUrl: true,
            status: true,
            // v2.1: Include description for text-based amount extraction
            description: true,
            supportScale: true,
          },
        },
      },
      orderBy: { score: 'desc' },
      take: 20, // Return top 20 in response
    });

    const responseData = {
      matchesGenerated: matchResults.length,
      matches: storedMatches,
      sessionId,
      rateLimitRemaining: rateLimitCheck.remaining,
      message: matchResults.length > 0
        ? `${matchResults.length}개의 적합한 지원사업을 찾았습니다.`
        : '현재 귀사에 적합한 지원사업을 찾지 못했습니다. 프로필을 업데이트해보세요.',
    };

    // ========================================================================
    // Cache Results with Session ID (Step 3, v2.2)
    // ========================================================================
    await setCache(matchCacheKey, responseData, CACHE_TTL.MATCH_RESULTS);
    await setCache(sessionCacheKey, sessionId, CACHE_TTL.MATCH_RESULTS);

    // ========================================================================
    // Analytics Logging (Step 5)
    // ========================================================================
    const hasGeneratedBefore = await hasFunnelEvent(userId, AuditAction.SME_FIRST_MATCH_GENERATED);
    if (!hasGeneratedBefore && matchResults.length > 0) {
      await logFunnelEvent(
        userId,
        AuditAction.SME_FIRST_MATCH_GENERATED,
        organization.id,
        `Generated ${matchResults.length} SME matches (v2.0 algorithm)`
      );
    }

    console.log(`[SME Match Gen] Completed for org: ${organization.id}, session: ${sessionId}, ${matchResults.length} matches, config: ${configName}`);

    return NextResponse.json({
      success: true,
      data: responseData,
    });
  } catch (error: any) {
    console.error('SME match generation error:', error);
    return NextResponse.json(
      { error: 'SME 매칭 생성 중 오류가 발생했습니다: ' + error.message },
      { status: 500 }
    );
  }
}
