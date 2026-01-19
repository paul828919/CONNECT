/**
 * Public Stats API
 *
 * GET /api/public/stats - Get public statistics for landing page
 * Returns:
 * - Total count of active programs
 * - Number of unique agencies
 *
 * Note: This endpoint does NOT require authentication (for landing page use)
 */

import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

// Direct Prisma Client instantiation (consistent with other API routes)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: ['error'],
});

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = prisma;
}

export async function GET() {
  try {
    // Query active programs (minimal fields for performance)
    const activePrograms = await prisma.funding_programs.findMany({
      where: {
        status: 'ACTIVE',
      },
      select: {
        id: true,
        announcingAgency: true,
      },
    });

    // Calculate statistics
    const totalPrograms = activePrograms.length;

    // Count unique announcing agencies
    const uniqueAgencies = new Set(
      activePrograms
        .map((p) => p.announcingAgency)
        .filter((a): a is string => a !== null && a !== '')
    );

    return NextResponse.json({
      totalPrograms,
      totalAgencies: uniqueAgencies.size,
    });
  } catch (error) {
    console.error('Error fetching public stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
