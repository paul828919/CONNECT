/**
 * Match Generation API
 *
 * Core feature: Generate funding opportunity matches for organizations
 *
 * Rate limiting enforced:
 * - Free tier: 3 matches/month
 * - Pro/Team tier: Unlimited
 *
 * POST /api/matches/generate?organizationId=xxx
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import { PrismaClient, ProgramStatus } from '@prisma/client';
import { generateMatches } from '@/lib/matching/algorithm';
import { generateExplanation } from '@/lib/matching/explainer';
import { checkMatchLimit, trackApiUsage } from '@/lib/rateLimit';

const prisma = new PrismaClient();

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

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Missing organizationId parameter' },
        { status: 400 }
      );
    }

    // 3. Fetch organization profile
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        users: {
          where: { id: userId },
        },
      },
    });

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
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });

    const subscriptionPlan = user?.subscription?.plan?.toLowerCase() as 'free' | 'pro' | 'team' || 'free';

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

    // 8. Fetch active funding programs
    const programs = await prisma.fundingProgram.findMany({
      where: {
        status: ProgramStatus.ACTIVE,
        deadline: {
          gte: new Date(), // Only future deadlines
        },
      },
      orderBy: {
        deadline: 'asc',
      },
    });

    if (programs.length === 0) {
      return NextResponse.json(
        {
          error: 'No active funding programs available',
          message: '현재 활성화된 지원 프로그램이 없습니다. 나중에 다시 시도해주세요.',
        },
        { status: 404 }
      );
    }

    // 9. Generate matches using algorithm
    const matchResults = generateMatches(organization, programs, 3);

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

    // 10. Store matches in database
    const createdMatches = await Promise.all(
      matchResults.map(async (matchResult) => {
        // Generate Korean explanations
        const explanation = generateExplanation(
          matchResult,
          organization,
          matchResult.program
        );

        // Create match record
        return prisma.fundingMatch.create({
          data: {
            organizationId: organization.id,
            programId: matchResult.program.id,
            score: matchResult.score,
            explanation: explanation, // Use Korean explanations from generateExplanation
          },
          include: {
            program: true,
          },
        });
      })
    );

    // 11. Track API usage for analytics
    await trackApiUsage(userId, '/api/matches/generate');

    // 12. Return matches with explanations
    const response = {
      success: true,
      matches: createdMatches.map((match) => ({
        id: match.id,
        program: {
          id: match.program.id,
          title: match.program.title,
          description: match.program.description,
          agencyId: match.program.agencyId,
          category: match.program.category,
          budgetAmount: match.program.budgetAmount?.toString(),
          deadline: match.program.deadline?.toISOString(),
          announcementUrl: match.program.announcementUrl,
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
      message: `${matchResults.length}개의 적합한 지원 프로그램을 찾았습니다.`,
    };

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
  } finally {
    await prisma.$disconnect();
  }
}
