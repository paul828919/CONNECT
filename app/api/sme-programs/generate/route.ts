/**
 * SME Programs Match Generation API
 *
 * POST /api/sme-programs/generate
 * Generates new SME program matches for the user's organization.
 *
 * This endpoint:
 * 1. Fetches active SME programs from database
 * 2. Runs SME matching algorithm against organization profile
 * 3. Stores match results in sme_program_matches table
 * 4. Returns generated matches
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import { db } from '@/lib/db';
import { generateSMEMatches, SMEMatchResult } from '@/lib/matching/sme-algorithm';
import { getActivePrograms } from '@/lib/sme24-api/program-service';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Get user's organization with all required fields for matching
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        organizationId: true,
        organization: {
          include: {
            locations: true,
          },
        },
      },
    });

    if (!user?.organizationId || !user.organization) {
      return NextResponse.json(
        { error: '조직 프로필이 필요합니다. 먼저 프로필을 생성해주세요.' },
        { status: 400 }
      );
    }

    const organization = user.organization;

    // Check profile completeness (minimum required fields)
    if (!organization.name) {
      return NextResponse.json(
        { error: '조직 이름이 필요합니다. 프로필을 완성해주세요.' },
        { status: 400 }
      );
    }

    console.log(`[SME Match Gen] Generating matches for org: ${organization.id}`);

    // Fetch active SME programs
    const { programs, total } = await getActivePrograms();

    console.log(`[SME Match Gen] Found ${total} active programs`);

    if (programs.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          matchesGenerated: 0,
          message: '현재 접수 중인 지원사업이 없습니다. 나중에 다시 시도해주세요.',
        },
      });
    }

    // Generate matches using SME algorithm
    const matchResults = generateSMEMatches(organization, programs, {
      minimumScore: 40,
      limit: 100,
    });

    console.log(`[SME Match Gen] Generated ${matchResults.length} matches`);

    // Delete existing matches for this organization (regenerate fresh)
    await db.sme_program_matches.deleteMany({
      where: { organizationId: organization.id },
    });

    // Store new matches in database
    if (matchResults.length > 0) {
      const matchData = matchResults.map(match => ({
        organizationId: organization.id,
        programId: match.program.id,
        score: match.score,
        eligibilityLevel: match.eligibilityLevel as string,
        failedCriteria: match.failedCriteria,
        metCriteria: match.metCriteria,
        scoreBreakdown: JSON.parse(JSON.stringify(match.scoreBreakdown)),
        explanation: JSON.parse(JSON.stringify(match.explanation)),
      }));

      await db.sme_program_matches.createMany({
        data: matchData,
      });
    }

    // Fetch stored matches with program details for response
    const storedMatches = await db.sme_program_matches.findMany({
      where: { organizationId: organization.id },
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
      orderBy: { score: 'desc' },
      take: 20, // Return top 20 in response
    });

    return NextResponse.json({
      success: true,
      data: {
        matchesGenerated: matchResults.length,
        matches: storedMatches,
        message: matchResults.length > 0
          ? `${matchResults.length}개의 적합한 지원사업을 찾았습니다.`
          : '현재 귀사에 적합한 지원사업을 찾지 못했습니다. 프로필을 업데이트해보세요.',
      },
    });
  } catch (error: any) {
    console.error('SME match generation error:', error);
    return NextResponse.json(
      { error: 'SME 매칭 생성 중 오류가 발생했습니다: ' + error.message },
      { status: 500 }
    );
  }
}
