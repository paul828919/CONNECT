/**
 * Get Historical Matches Count API
 *
 * Efficient endpoint to return count of historical matches without fetching full records.
 * Used for count preview in the HistoricalMatchesPrompt component.
 *
 * GET /api/matches/historical/count?organizationId=xxx
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

    // 4. Count historical matches
    const count = await db.funding_matches.count({
      where: {
        organizationId,
        funding_programs: {
          status: ProgramStatus.EXPIRED,
          announcementType: AnnouncementType.R_D_PROJECT,
          scrapingSource: {
            not: null,
            notIn: ['NTIS_API'],
          },
        },
      },
    });

    // 5. Return count
    return NextResponse.json(
      { success: true, count },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error counting historical matches:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
  // NOTE: Do NOT call db.$disconnect() in Next.js API routes
}
