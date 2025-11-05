/**
 * Admin API: Fetch programs requiring eligibility review
 * GET /api/admin/eligibility-review?confidence=LOW&agency=NTIS&status=PENDING
 *
 * Access: ADMIN or SUPER_ADMIN only
 *
 * Query Parameters:
 * - confidence: Filter by eligibility confidence (LOW, MEDIUM, HIGH, ALL)
 * - agency: Filter by agency (NTIS, IITP, KIAT, KOTRA, ALL)
 * - status: Filter by review status (PENDING, COMPLETED, ALL)
 *
 * Returns: Array of programs requiring manual review
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import { PrismaClient, ConfidenceLevel, AgencyId } from '@prisma/client';

// Force dynamic rendering (prevents static generation errors)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

export async function GET(request: NextRequest) {
  try {
    // 1. Authentication and authorization check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check for ADMIN or SUPER_ADMIN role
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Access denied - Admin privileges required' },
        { status: 403 }
      );
    }

    // 2. Parse query parameters
    const { searchParams } = new URL(request.url);
    const confidenceFilter = searchParams.get('confidence') || 'ALL';
    const agencyFilter = searchParams.get('agency') || 'ALL';
    const statusFilter = searchParams.get('status') || 'PENDING';

    // 3. Build query filters
    const where: any = {};

    // Confidence filter
    if (confidenceFilter !== 'ALL') {
      where.eligibilityConfidence = confidenceFilter as ConfidenceLevel;
    }

    // Agency filter
    if (agencyFilter !== 'ALL') {
      where.agencyId = agencyFilter as AgencyId;
    }

    // Status filter (pending = manualReviewRequired AND not completed)
    if (statusFilter === 'PENDING') {
      where.manualReviewRequired = true;
      where.manualReviewCompletedAt = null;
    } else if (statusFilter === 'COMPLETED') {
      where.manualReviewCompletedAt = { not: null };
    } else if (statusFilter === 'ALL') {
      // No filter - show all programs requiring review (regardless of completion)
      where.manualReviewRequired = true;
    }

    // 4. Fetch programs
    const programs = await db.funding_programs.findMany({
      where,
      select: {
        id: true,
        title: true,
        agencyId: true,
        announcementUrl: true,
        eligibilityCriteria: true,
        eligibilityConfidence: true,
        manualReviewRequired: true,
        manualReviewNotes: true,
        manualReviewCompletedAt: true,
        manualReviewCompletedBy: true,
        requiredCertifications: true,
        preferredCertifications: true,
        requiredInvestmentAmount: true,
        requiredOperatingYears: true,
        maxOperatingYears: true,
        createdAt: true,
        scrapedAt: true,
      },
      orderBy: [
        { eligibilityConfidence: 'asc' }, // LOW confidence first
        { scrapedAt: 'desc' }, // Most recent first
      ],
      take: 100, // Limit to prevent overwhelming the admin
    });

    return NextResponse.json(
      {
        success: true,
        programs,
        count: programs.length,
        filters: {
          confidence: confidenceFilter,
          agency: agencyFilter,
          status: statusFilter,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching eligibility review programs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
