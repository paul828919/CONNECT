/**
 * SME Program Match Update API
 * PATCH /api/sme-programs/[id]
 *
 * Toggle saved status for an SME program match.
 * Follows the same pattern as /api/matches/[id] for R&D matches.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import { db } from '@/lib/db';
import { logFunnelEvent, AuditAction } from '@/lib/audit';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id;
    const matchId = params.id;

    const body = await request.json();
    const { saved } = body;

    if (saved === undefined) {
      return NextResponse.json(
        { error: 'Missing saved parameter' },
        { status: 400 }
      );
    }

    // Get user's organization for ownership verification
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

    // Fetch match and verify ownership
    const match = await db.sme_program_matches.findUnique({
      where: { id: matchId },
      include: {
        program: {
          select: { id: true, title: true },
        },
      },
    });

    if (!match) {
      return NextResponse.json(
        { error: 'Match not found' },
        { status: 404 }
      );
    }

    if (match.organizationId !== user.organizationId) {
      return NextResponse.json(
        { error: 'You do not have access to this match' },
        { status: 403 }
      );
    }

    // Update saved status
    const updatedMatch = await db.sme_program_matches.update({
      where: { id: matchId },
      data: {
        saved: saved,
        savedAt: saved ? new Date() : null,
      },
    });

    // Log funnel event when saving
    if (saved) {
      await logFunnelEvent(
        userId,
        AuditAction.MATCH_SAVED,
        matchId,
        `SME Program: ${match.program.title}`
      );
    }

    return NextResponse.json({
      success: true,
      matchId,
      saved: updatedMatch.saved,
    });
  } catch (error) {
    console.error('SME match update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
