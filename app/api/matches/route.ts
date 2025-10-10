/**
 * Fetch Funding Matches API
 *
 * GET /api/matches?organizationId=xxx
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
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

    // 3. Verify user owns this organization
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        users: {
          where: { id: userId },
        },
      },
    });

    if (!organization || organization.users.length === 0) {
      return NextResponse.json(
        { error: 'You do not have access to this organization' },
        { status: 403 }
      );
    }

    // 4. Fetch matches for this organization
    const matches = await prisma.fundingMatch.findMany({
      where: { organizationId },
      include: {
        program: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 5. Return matches
    const response = {
      success: true,
      matches: matches.map((match) => ({
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
        explanation: match.explanation,
        viewed: match.viewed,
        saved: match.saved,
        createdAt: match.createdAt.toISOString(),
      })),
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error fetching matches:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
