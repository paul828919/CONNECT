/**
 * Competitiveness Summary API
 *
 * GET /api/competitiveness/summary?organizationId=xxx
 *
 * Returns lightweight summary for dashboard card:
 * - Improvement count
 * - Whether user has matches
 * - High priority count
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import { PrismaClient, AnnouncementType, ProgramStatus } from '@prisma/client';
import {
  generateCompetitivenessSummary,
  CompetitivenessSummary,
} from '@/lib/competitiveness/analyzer';

// Direct Prisma Client instantiation (bypasses lib/db module resolution issue)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const db =
  globalForPrisma.prisma ??
  new PrismaClient({
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // 2. Get organization ID from query
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

    // 4. Fetch all active matches for this organization
    const matches = await db.funding_matches.findMany({
      where: {
        organizationId,
        funding_programs: {
          status: ProgramStatus.ACTIVE,
          announcementType: AnnouncementType.R_D_PROJECT,
          scrapingSource: {
            not: null,
            notIn: ['NTIS_API'],
          },
        },
      },
      include: {
        funding_programs: true,
      },
    });

    // 5. Generate summary
    const summary: CompetitivenessSummary = generateCompetitivenessSummary(
      organization,
      matches
    );

    // 6. Return summary
    return NextResponse.json(
      {
        success: true,
        data: summary,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error generating competitiveness summary:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
