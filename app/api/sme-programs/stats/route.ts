/**
 * SME Programs Stats API
 *
 * GET /api/sme-programs/stats
 * Returns statistics for SME dashboard display.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import { db } from '@/lib/db';
import { getSyncStats } from '@/lib/sme24-api/program-service';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Get user's organization
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { organizationId: true },
    });

    // Get program stats
    const programStats = await getSyncStats();

    // Get user's match stats if they have an organization
    let matchStats = {
      totalMatches: 0,
      savedMatches: 0,
      viewedMatches: 0,
      avgScore: 0,
      fullyEligibleCount: 0,
    };

    let certificationStatus = null;

    if (user?.organizationId) {
      const [
        totalMatches,
        savedMatches,
        viewedMatches,
        avgScoreResult,
        fullyEligibleCount,
        org,
      ] = await Promise.all([
        db.sme_program_matches.count({
          where: { organizationId: user.organizationId },
        }),
        db.sme_program_matches.count({
          where: { organizationId: user.organizationId, saved: true },
        }),
        db.sme_program_matches.count({
          where: { organizationId: user.organizationId, viewed: true },
        }),
        db.sme_program_matches.aggregate({
          where: { organizationId: user.organizationId },
          _avg: { score: true },
        }),
        db.sme_program_matches.count({
          where: {
            organizationId: user.organizationId,
            eligibilityLevel: 'FULLY_ELIGIBLE',
          },
        }),
        db.organizations.findUnique({
          where: { id: user.organizationId },
          select: {
            certifications: true,
            certificationVerifiedAt: true,
            certificationVerifyResult: true,
          },
        }),
      ]);

      matchStats = {
        totalMatches,
        savedMatches,
        viewedMatches,
        avgScore: Math.round(avgScoreResult._avg.score || 0),
        fullyEligibleCount,
      };

      certificationStatus = {
        certifications: org?.certifications || [],
        verifiedAt: org?.certificationVerifiedAt,
        verifyResult: org?.certificationVerifyResult,
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        programs: {
          total: programStats.totalPrograms,
          active: programStats.activePrograms,
          expired: programStats.expiredPrograms,
          lastSyncAt: programStats.lastSyncAt,
        },
        matches: matchStats,
        certification: certificationStatus,
      },
    });
  } catch (error) {
    console.error('SME stats error:', error);
    return NextResponse.json(
      { error: '통계를 불러올 수 없습니다' },
      { status: 500 }
    );
  }
}
