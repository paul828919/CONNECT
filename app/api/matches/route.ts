/**
 * Fetch Funding Matches API
 *
 * GET /api/matches?organizationId=xxx
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import { PrismaClient, AnnouncementType, ProgramStatus } from '@prisma/client';

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

    // 2. Get organization ID and pagination params from query
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Missing organizationId parameter' },
        { status: 400 }
      );
    }

    // Parse pagination parameters
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    // Validate and sanitize pagination
    const currentPage = Math.max(1, page);
    const itemsPerPage = Math.min(Math.max(1, limit), 50); // Max 50 items per page
    const skip = (currentPage - 1) * itemsPerPage;

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

    // 4. Build where clause for active matches
    const whereClause = {
      organizationId,
      funding_programs: {
        status: ProgramStatus.ACTIVE, // Only show matches to active programs (exclude EXPIRED)
        announcementType: AnnouncementType.R_D_PROJECT, // Only R&D funding opportunities (exclude surveys, events, notices)
        scrapingSource: {
          not: null, // Exclude test seed data
          notIn: ['NTIS_API'], // Exclude NTIS_API (old project data)
        },
        // Deadline filter: Exclude programs with past deadlines but keep NULL (TBD) deadlines
        OR: [
          { deadline: null },              // TBD deadlines are valid
          { deadline: { gte: new Date() } }, // Future deadlines are valid
        ],
      },
    };

    // 5. Count total matches (for pagination metadata)
    const totalMatches = await db.funding_matches.count({
      where: whereClause,
    });

    const totalPages = Math.ceil(totalMatches / itemsPerPage);

    // 6. Fetch paginated matches for this organization
    const matches = await db.funding_matches.findMany({
      where: whereClause,
      include: {
        funding_programs: true,
      },
      orderBy: [
        { score: 'desc' },                               // 1. Highest match score first
        { funding_programs: { deadline: 'asc' } },       // 2. Then by urgency (closest deadline first, NULLs last)
        { funding_programs: { publishedAt: 'desc' } },   // 3. Then newest announcements
      ],
      skip,
      take: itemsPerPage,
    });

    // 7. Return matches with pagination metadata
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
          eligibilityConfidence: match.funding_programs.eligibilityConfidence,
        },
        score: match.score,
        personalizedScore: match.personalizedScore ?? null,
        explanation: match.explanation,
        viewed: match.viewed,
        saved: match.saved,
        createdAt: match.createdAt.toISOString(),
      })),
      pagination: {
        currentPage,
        itemsPerPage,
        totalMatches,
        totalPages,
        hasNextPage: currentPage < totalPages,
        hasPreviousPage: currentPage > 1,
      },
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
