/**
 * Funding Programs Stats API
 *
 * GET /api/funding-programs/stats - Get statistics about active funding programs
 * Returns:
 * - Total count of active programs
 * - Number of unique agencies
 * - Breakdown by agency
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import { PrismaClient } from '@prisma/client';

// Direct Prisma Client instantiation (bypasses lib/db module resolution issue)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: ['error'],
});

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = prisma;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Query active programs
    const activePrograms = await prisma.funding_programs.findMany({
      where: {
        status: 'ACTIVE',
      },
      select: {
        id: true,
        agencyId: true,
        announcingAgency: true,
      },
    });

    // Calculate statistics
    const totalCount = activePrograms.length;

    // Group by agency (funding agency like IITP, KEIT, NTIS)
    const agencyCounts = activePrograms.reduce((acc, program) => {
      const agency = program.agencyId;
      acc[agency] = (acc[agency] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Count unique announcing agencies (주관기관 - governing organizations)
    const uniqueAnnouncingAgencies = new Set(
      activePrograms
        .map((p) => p.announcingAgency)
        .filter((a) => a !== null && a !== '')
    );

    const uniqueGoverningOrgs = uniqueAnnouncingAgencies.size;

    return NextResponse.json({
      success: true,
      stats: {
        totalPrograms: totalCount,
        totalAgencies: Object.keys(agencyCounts).length,
        totalGoverningOrgs: uniqueGoverningOrgs,
        byAgency: agencyCounts,
      },
    });
  } catch (error) {
    console.error('Error fetching funding program stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
