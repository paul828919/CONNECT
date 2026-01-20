/**
 * SME Programs API
 *
 * GET /api/sme-programs
 * Returns SME program matches for the user's organization.
 *
 * Query params:
 * - page: Page number (default: 1)
 * - limit: Results per page (default: 20)
 * - saved: Filter saved matches only (boolean)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { searchParams } = new URL(request.url);

    // Parse query params
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const savedOnly = searchParams.get('saved') === 'true';

    // Get user's organization
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { organizationId: true },
    });

    if (!user?.organizationId) {
      return NextResponse.json(
        { error: '조직 프로필이 필요합니다' },
        { status: 400 }
      );
    }

    // Build where clause
    const whereClause: any = {
      organizationId: user.organizationId,
    };

    if (savedOnly) {
      whereClause.saved = true;
    }

    // Fetch matches with pagination
    const [matches, total] = await Promise.all([
      db.sme_program_matches.findMany({
        where: whereClause,
        include: {
          program: {
            select: {
              id: true,
              pblancSeq: true,
              title: true,
              detailBsnsNm: true,
              supportInstitution: true,
              applicationStart: true,
              applicationEnd: true,
              bizType: true,
              sportType: true,
              targetCompanyScale: true,
              targetRegions: true,
              requiredCerts: true,
              minSupportAmount: true,
              maxSupportAmount: true,
              minInterestRate: true,
              maxInterestRate: true,
              detailUrl: true,
              applicationUrl: true,
              status: true,
            },
          },
        },
        orderBy: [
          { saved: 'desc' },
          { score: 'desc' },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.sme_program_matches.count({ where: whereClause }),
    ]);

    // Mark matches as viewed
    const unviewedIds = matches
      .filter(m => !m.viewed)
      .map(m => m.id);

    if (unviewedIds.length > 0) {
      await db.sme_program_matches.updateMany({
        where: { id: { in: unviewedIds } },
        data: { viewed: true, viewedAt: new Date() },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        matches,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('SME programs fetch error:', error);
    return NextResponse.json(
      { error: 'SME 지원사업을 불러올 수 없습니다' },
      { status: 500 }
    );
  }
}
