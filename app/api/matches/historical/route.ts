/**
 * Fetch Historical Funding Matches API
 *
 * Feature: Retrieve previously generated matches from EXPIRED programs
 * Use case: Display "missed opportunities" in UI without consuming rate limit
 *
 * Business Logic:
 * - Read-only endpoint (no rate limiting - retrieving existing data is free)
 * - Returns matches to EXPIRED programs only
 * - Sorted by score (highest first) then creation date (newest first)
 *
 * GET /api/matches/historical?organizationId=xxx
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

    // 4. Build where clause for historical matches
    const whereClause = {
      organizationId,
      funding_programs: {
        status: ProgramStatus.EXPIRED, // Only show matches to EXPIRED programs
        announcementType: AnnouncementType.R_D_PROJECT, // Only R&D funding opportunities
        scrapingSource: {
          not: null, // Exclude test seed data
          notIn: ['NTIS_API'], // Exclude NTIS_API (old project data)
        },
      },
    };

    // 5. Count total historical matches (for pagination metadata)
    const totalMatches = await db.funding_matches.count({
      where: whereClause,
    });

    const totalPages = Math.ceil(totalMatches / itemsPerPage);

    // 6. Fetch paginated historical matches for this organization
    const matches = await db.funding_matches.findMany({
      where: whereClause,
      include: {
        funding_programs: true,
      },
      orderBy: [
        { score: 'desc' },           // Highest relevance first
        { createdAt: 'desc' },       // Most recently generated first
      ],
      skip,
      take: itemsPerPage,
    });

    // 7. Return historical matches with pagination metadata
    const response = {
      success: true,
      type: 'historical',
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
          status: match.funding_programs.status, // Will be "EXPIRED"
          publishedAt: match.funding_programs.publishedAt?.toISOString(),
          manualReviewRequired: match.funding_programs.manualReviewRequired,
          manualReviewNotes: match.funding_programs.manualReviewNotes,
        },
        score: match.score,
        explanation: match.explanation,
        viewed: match.viewed,
        saved: match.saved,
        isExpired: true, // Flag for UI rendering
        createdAt: match.createdAt.toISOString(),
      })),
      count: totalMatches,
      message: totalMatches === 0
        ? '아직 생성된 과거 매칭 결과가 없습니다. "과거 기회 보기" 버튼을 클릭하여 2025년 놓친 기회를 확인하세요.'
        : `${totalMatches}개의 과거 매칭 결과를 찾았습니다.`,
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
    console.error('Error fetching historical matches:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
  // NOTE: Do NOT call db.$disconnect() in Next.js API routes
  // It breaks connection pooling and causes subsequent requests to fail
}
