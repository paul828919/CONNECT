/**
 * Fetch Funding Matches API
 *
 * GET /api/matches?organizationId=xxx
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import { PrismaClient, AnnouncementType } from '@prisma/client';

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

export const dynamic = 'force-dynamic';

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
    const organization = await db.organizations.findUnique({
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
    const matches = await db.funding_matches.findMany({
      where: {
        organizationId,
        funding_programs: {
          status: 'ACTIVE', // Only show matches to active programs (exclude EXPIRED)
          announcementType: AnnouncementType.R_D_PROJECT, // Only R&D funding opportunities (exclude surveys, events, notices)
          scrapingSource: {
            not: null, // Exclude test seed data
            notIn: ['NTIS_API'], // Exclude NTIS_API (old project data)
          },
          // Allow NULL budgets and deadlines per user guidance
          // (Jan-March NTIS announcements may have budget/deadline TBD)
        },
      },
      include: {
        funding_programs: true,
      },
      orderBy: [
        { funding_programs: { publishedAt: 'desc' } }, // Newest announcements first
        { funding_programs: { deadline: 'asc' } },     // Then by urgency (NULLs last)
      ],
    });

    // 5. Return matches
    const response = {
      success: true,
      matches: matches.map((match: any) => ({
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
          manualReviewRequired: match.funding_programs.manualReviewRequired,
          manualReviewNotes: match.funding_programs.manualReviewNotes,
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
  }
  // NOTE: Do NOT call db.$disconnect() in Next.js API routes
  // It breaks connection pooling and causes subsequent requests to fail
}
