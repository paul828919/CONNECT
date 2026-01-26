/**
 * SME Programs Stats API (v2.0)
 *
 * GET /api/sme-programs/stats
 * Returns statistics for SME dashboard display.
 *
 * v2.0 additions:
 * - Score breakdown averages (12-factor analysis)
 * - Top matched bizType categories
 * - Urgent deadline count (≤7 days)
 * - Eligibility level distribution
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import { db } from '@/lib/db';
import { getSyncStats } from '@/lib/sme24-api/program-service';
import { SMEScoreBreakdown } from '@/lib/matching/sme-algorithm';

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
    let enhancedStats = null;

    if (user?.organizationId) {
      const [
        totalMatches,
        savedMatches,
        viewedMatches,
        avgScoreResult,
        fullyEligibleCount,
        org,
        matchesWithPrograms,
        urgentDeadlineCount,
        conditionallyEligibleCount,
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
        // v2.0: Fetch matches with programs for enhanced stats
        db.sme_program_matches.findMany({
          where: { organizationId: user.organizationId },
          select: {
            scoreBreakdown: true,
            program: {
              select: {
                bizType: true,
                applicationEnd: true,
              },
            },
          },
        }),
        // v2.0: Count urgent deadline matches (≤7 days)
        db.sme_program_matches.count({
          where: {
            organizationId: user.organizationId,
            program: {
              applicationEnd: {
                lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                gte: new Date(),
              },
            },
          },
        }),
        // v2.0: Conditionally eligible count
        db.sme_program_matches.count({
          where: {
            organizationId: user.organizationId,
            eligibilityLevel: 'CONDITIONALLY_ELIGIBLE',
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

      // v2.0: Compute enhanced stats from match data
      enhancedStats = computeEnhancedStats(
        matchesWithPrograms,
        urgentDeadlineCount,
        fullyEligibleCount,
        conditionallyEligibleCount,
        totalMatches
      );
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
        enhanced: enhancedStats,
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

/**
 * Compute enhanced v2.0 stats from match data
 */
function computeEnhancedStats(
  matchesWithPrograms: Array<{
    scoreBreakdown: any;
    program: { bizType: string | null; applicationEnd: Date | null };
  }>,
  urgentDeadlineCount: number,
  fullyEligibleCount: number,
  conditionallyEligibleCount: number,
  totalMatches: number
) {
  if (matchesWithPrograms.length === 0) {
    return {
      scoreBreakdownAvg: null,
      topBizTypes: [],
      urgentDeadlineCount: 0,
      eligibilityDistribution: {
        fullyEligible: 0,
        conditionallyEligible: 0,
        total: 0,
      },
    };
  }

  // 1. Average score breakdown across all matches
  const scoreBreakdownAvg = computeAvgBreakdown(matchesWithPrograms);

  // 2. Top bizType categories (sorted by match count)
  const bizTypeCounts: Record<string, number> = {};
  for (const match of matchesWithPrograms) {
    const bizType = match.program.bizType || '기타';
    bizTypeCounts[bizType] = (bizTypeCounts[bizType] || 0) + 1;
  }

  const topBizTypes = Object.entries(bizTypeCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([category, count]) => ({
      category,
      count,
      percentage: Math.round((count / matchesWithPrograms.length) * 100),
    }));

  // 3. Eligibility distribution
  const eligibilityDistribution = {
    fullyEligible: fullyEligibleCount,
    conditionallyEligible: conditionallyEligibleCount,
    total: totalMatches,
  };

  return {
    scoreBreakdownAvg,
    topBizTypes,
    urgentDeadlineCount,
    eligibilityDistribution,
  };
}

/**
 * Compute average score breakdown from match data
 */
function computeAvgBreakdown(
  matches: Array<{ scoreBreakdown: any }>
): Record<string, number> | null {
  const breakdownFields: (keyof SMEScoreBreakdown)[] = [
    'companyScale', 'revenueRange', 'employeeCount', 'businessAge',
    'region', 'certifications', 'bizType', 'lifecycle',
    'industryContent', 'deadline', 'financialRelevance', 'sportType',
  ];

  const sums: Record<string, number> = {};
  let validCount = 0;

  for (const match of matches) {
    const breakdown = match.scoreBreakdown;
    if (!breakdown || typeof breakdown !== 'object') continue;

    validCount++;
    for (const field of breakdownFields) {
      const value = (breakdown as any)[field];
      if (typeof value === 'number') {
        sums[field] = (sums[field] || 0) + value;
      }
    }
  }

  if (validCount === 0) return null;

  const avg: Record<string, number> = {};
  for (const field of breakdownFields) {
    avg[field] = Math.round(((sums[field] || 0) / validCount) * 10) / 10;
  }

  return avg;
}
