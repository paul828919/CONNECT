/**
 * Match Explanation API
 * GET /api/matches/[id]/explanation
 *
 * Generates AI-powered Korean explanations for existing funding matches
 *
 * Features:
 * - Claude Sonnet 4.5 powered explanations
 * - 24-hour Redis caching
 * - Professional 존댓말 (formal Korean)
 * - Rate limiting (50 RPM)
 * - Cost tracking
 * - Subscription gating (Pro/Team only for full AI explanations)
 *
 * Subscription tiers:
 * - Free: Basic score display only
 * - Pro/Team: Full AI-powered detailed explanations
 *
 * Week 3-4: AI Integration (Day 16-17)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import { PrismaClient, SubscriptionPlan, SubscriptionStatus } from '@prisma/client';

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
import { generateMatchExplanation } from '@/lib/ai/services/match-explanation';
import type { MatchExplanationInput } from '@/lib/ai/prompts/match-explanation';
import { updateMatchEngagement } from '@/lib/analytics/match-performance';


export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', message: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const matchId = params.id;

    // 2. Fetch match with related data
    const match = await db.funding_matches.findUnique({
      where: { id: matchId },
      include: {
        organizations: true,
        funding_programs: true,
      },
    });

    if (!match) {
      return NextResponse.json(
        { error: 'Match not found', message: '매칭 결과를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 3. Verify user owns this match and get subscription info
    const userOrg = await db.user.findFirst({
      where: {
        id: userId,
        organizationId: match.organizationId,
      },
      include: {
        subscriptions: {
          select: {
            plan: true,
            status: true,
          },
        },
      },
    });

    if (!userOrg) {
      return NextResponse.json(
        {
          error: 'Forbidden',
          message: '이 매칭 결과에 접근할 권한이 없습니다.',
        },
        { status: 403 }
      );
    }

    // 3a. Check subscription tier for AI explanation access
    const subscription = userOrg.subscriptions;
    const isActiveSubscription = subscription?.status === 'ACTIVE' || subscription?.status === 'TRIAL';
    const subscriptionPlan = isActiveSubscription ? subscription?.plan : 'FREE';

    // Admin/SuperAdmin always have AI access regardless of subscription
    const userRole = (session.user as any).role as 'USER' | 'ADMIN' | 'SUPER_ADMIN' | undefined;
    const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
    const hasAIAccess = isAdmin || subscriptionPlan === 'PRO' || subscriptionPlan === 'TEAM';

    // For Free users, return basic score only without AI generation
    if (!hasAIAccess) {
      // Update match viewed status
      await db.funding_matches.update({
        where: { id: matchId },
        data: {
          viewed: true,
          viewedAt: new Date(),
        },
      });

      // Return basic explanation for Free tier
      const program = match.funding_programs;
      return NextResponse.json(
        {
          success: true,
          matchId,
          explanation: {
            summary: `${match.organizations.name}과(와) "${program.title}" 프로그램의 매칭 점수는 ${match.score}점입니다.`,
            details: null,
            strengths: [],
            recommendations: [],
          },
          metadata: {
            cached: false,
            cost: 0,
            responseTime: 0,
            usage: null,
            subscriptionRequired: true,
          },
          match: {
            score: match.score,
            programTitle: program.title,
            agency: getAgencyName(program.agencyId),
            deadline: program.deadline?.toISOString(),
          },
          upgradePrompt: {
            message: 'Pro 플랜으로 업그레이드하시면 AI가 분석한 상세 매칭 설명, 강점, 보완 포인트를 확인하실 수 있습니다.',
            upgradeUrl: '/pricing',
          },
        },
        { status: 200 }
      );
    }

    // 4. Build input for AI explanation
    const organization = match.organizations;
    const program = match.funding_programs;

    // Parse score breakdown from existing explanation JSON
    // The algorithm stores: keywordScore, industryScore, trlScore, typeScore, rdScore, deadlineScore
    const existingExplanation = match.explanation as any;
    const algoBreakdown = existingExplanation?.scoreBreakdown;
    const scoreBreakdown = algoBreakdown
      ? {
          keyword: algoBreakdown.keywordScore || 0,       // /25 키워드 매칭
          industry: algoBreakdown.industryScore || 0,      // /20 산업 분야
          trl: algoBreakdown.trlScore || 0,                // /15 TRL 적합성
          type: algoBreakdown.typeScore || 0,              // /15 조직 유형
          rd: algoBreakdown.rdScore || 0,                  // /10 R&D 경험
          deadline: algoBreakdown.deadlineScore || 0,      // /15 마감일 근접도
        }
      : {
          keyword: 0,
          industry: 0,
          trl: 0,
          type: 0,
          rd: 0,
          deadline: 0,
        };

    const input: MatchExplanationInput = {
      // Program information
      programTitle: program.title,
      programAgency: getAgencyName(program.agencyId),
      programBudget: formatBudget(program.budgetAmount),
      programTRL: formatTRL(program.minTrl, program.maxTrl),
      programIndustry: program.category || '전 산업',
      programDeadline: program.deadline, // Pass raw Date object
      programStatus: program.status, // Pass program status for conditional prompts
      programRequirements: parseRequirements(program.eligibilityCriteria),

      // Company information
      companyName: organization.name,
      companyIndustry: organization.industrySector || '미분류',
      companyTRL: organization.targetResearchTRL || organization.technologyReadinessLevel || 0,
      companyTargetTRL: organization.targetResearchTRL || null,  // 연구개발 희망 기술 수준
      companyCurrentTRL: organization.technologyReadinessLevel || null,  // 기존 보유 기술 수준
      companyRevenue: parseRevenue(organization.revenueRange),
      companyEmployees: parseEmployeeCount(organization.employeeCount),
      certifications: [], // TODO: Extract from organization profile when available
      rdExperience: organization.rdExperience ? 5 : 0, // Placeholder

      // Match score details
      matchScore: match.score,
      scoreBreakdown,

      // Additional context
      missingRequirements: existingExplanation?.missingRequirements,
      similarSuccessRate: undefined, // TODO: Implement when outcome data is available
    };

    // 5. Generate AI explanation (with caching)
    // Pass actual IDs for better cache key consistency
    const result = await generateMatchExplanation(
      input,
      userId,
      match.organizationId,
      match.programId
    );

    // 6. Update match record with viewed status
    await db.funding_matches.update({
      where: { id: matchId },
      data: {
        viewed: true,
        viewedAt: new Date(),
      },
    });

    // 6a. Update analytics engagement tracking
    await updateMatchEngagement(matchId, { viewed: true });

    // 7. Return explanation with metadata
    return NextResponse.json(
      {
        success: true,
        matchId,
        explanation: result.explanation,
        metadata: {
          cached: result.cached,
          cost: result.cost,
          responseTime: result.responseTime,
          usage: result.usage,
        },
        match: {
          score: match.score,
          programTitle: program.title,
          agency: getAgencyName(program.agencyId),
          deadline: program.deadline?.toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Match explanation API error:', {
      matchId: params.id,
      error: error.message,
      stack: error.stack,
    });

    // User-friendly error messages
    if (error.message.includes('Rate limit')) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
        },
        { status: 429 }
      );
    }

    if (error.message.includes('Daily budget')) {
      return NextResponse.json(
        {
          error: 'Service temporarily unavailable',
          message: 'AI 서비스가 일시적으로 제한되었습니다. 내일 다시 시도해주세요.',
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: '설명 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      },
      { status: 500 }
    );
  }
  // NOTE: Do NOT call db.$disconnect() in Next.js API routes
  // It breaks connection pooling and causes subsequent requests to fail
}

// Helper functions

function getAgencyName(agencyId: string): string {
  const agencies: Record<string, string> = {
    IITP: '정보통신기획평가원',
    KEIT: '한국산업기술평가관리원',
    TIPA: '중소기업기술정보진흥원',
    KIMST: '해양수산과학기술진흥원',
  };
  return agencies[agencyId] || agencyId;
}

function formatBudget(budgetAmount: bigint | null): string {
  if (!budgetAmount) return '미정';

  const amount = Number(budgetAmount);
  if (amount >= 100000000) {
    return `${(amount / 100000000).toFixed(1)}억원`;
  } else if (amount >= 10000000) {
    return `${(amount / 10000000).toFixed(0)}천만원`;
  } else {
    return `${(amount / 10000).toFixed(0)}만원`;
  }
}

function formatTRL(minTrl: number | null, maxTrl: number | null): string {
  if (!minTrl && !maxTrl) return '제한없음';
  if (minTrl && !maxTrl) return `TRL ${minTrl} 이상`;
  if (!minTrl && maxTrl) return `TRL ${maxTrl} 이하`;
  if (minTrl === maxTrl) return `TRL ${minTrl}`;
  return `TRL ${minTrl}-${maxTrl}`;
}

function parseRequirements(eligibilityCriteria: any): string[] {
  if (!eligibilityCriteria) return ['별도 요건 없음'];

  // If already an array
  if (Array.isArray(eligibilityCriteria)) {
    return eligibilityCriteria.length > 0 ? eligibilityCriteria : ['별도 요건 없음'];
  }

  // If JSON object, extract requirements
  if (typeof eligibilityCriteria === 'object') {
    const requirements: string[] = [];
    if (eligibilityCriteria.minTrl) requirements.push(`TRL ${eligibilityCriteria.minTrl} 이상`);
    if (eligibilityCriteria.certifications) requirements.push(...eligibilityCriteria.certifications);
    if (eligibilityCriteria.minRevenue) requirements.push(`매출 ${eligibilityCriteria.minRevenue}원 이상`);
    return requirements.length > 0 ? requirements : ['별도 요건 없음'];
  }

  return ['별도 요건 없음'];
}

function parseRevenue(revenueRange: string | null): number {
  if (!revenueRange) return 0;

  const ranges: Record<string, number> = {
    UNDER_1B: 500000000, // 5억 (midpoint)
    FROM_1B_TO_10B: 5000000000, // 50억
    FROM_10B_TO_50B: 30000000000, // 300억
    FROM_50B_TO_100B: 75000000000, // 750억
    OVER_100B: 150000000000, // 1,500억
  };

  return ranges[revenueRange] || 0;
}

function parseEmployeeCount(employeeCount: string | null): number {
  if (!employeeCount) return 0;

  const ranges: Record<string, number> = {
    UNDER_10: 5,
    FROM_10_TO_50: 30,
    FROM_50_TO_100: 75,
    FROM_100_TO_300: 200,
    OVER_300: 500,
  };

  return ranges[employeeCount] || 0;
}
