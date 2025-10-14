/**
 * Consortium Member Response API
 *
 * POST: Respond to consortium invitation (accept or decline)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import { db } from '@/lib/db';


export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; memberId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { id: consortiumId, memberId } = params;

    // Get user's organization
    const user = await db.users.findUnique({
      where: { id: userId },
      select: { organizationId: true },
    });

    if (!user?.organizationId) {
      return NextResponse.json(
        { error: 'No organization associated with user' },
        { status: 400 }
      );
    }

    // Fetch the member invitation
    const member = await db.consortium_members.findUnique({
      where: { id: memberId },
      include: {
        consortium_projects: {
          select: {
            id: true,
            name: true,
            organizations: {
              select: { name: true },
            },
          },
        },
        organizations: {
          select: { name: true },
        },
      },
    });

    if (!member) {
      return NextResponse.json(
        { error: 'Member invitation not found' },
        { status: 404 }
      );
    }

    // Verify consortium ID matches
    if (member.consortiumId !== consortiumId) {
      return NextResponse.json(
        { error: 'Member does not belong to this consortium' },
        { status: 400 }
      );
    }

    // Verify user is from the invited organization
    if (member.organizationId !== user.organizationId) {
      return NextResponse.json(
        { error: 'You are not authorized to respond to this invitation' },
        { status: 403 }
      );
    }

    // Check if already responded
    if (member.status !== 'INVITED') {
      return NextResponse.json(
        { error: 'This invitation has already been responded to' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { action, responseMessage } = body; // action: 'accept' or 'decline'

    if (!action || !['accept', 'decline'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "accept" or "decline"' },
        { status: 400 }
      );
    }

    // Update member status
    const updatedMember = await db.consortium_members.update({
      where: { id: memberId },
      data: {
        status: action === 'accept' ? 'ACCEPTED' : 'DECLINED',
        responseMessage: responseMessage || null,
        respondedAt: new Date(),
      },
      include: {
        consortium_projects: {
          select: {
            id: true,
            name: true,
          },
        },
        organizations: {
          select: {
            id: true,
            name: true,
            type: true,
            logoUrl: true,
          },
        },
      },
    });

    // TODO: Send email notification to lead organization about response
    // This would use the email notification system from Phase 3A

    return NextResponse.json({
      success: true,
      member: updatedMember,
      message:
        action === 'accept'
          ? '컨소시엄 참여를 수락했습니다'
          : '컨소시엄 참여를 거절했습니다',
    });
  } catch (error: any) {
    console.error('Failed to respond to consortium invitation:', error);
    return NextResponse.json(
      { error: 'Failed to respond to consortium invitation' },
      { status: 500 }
    );
  }
}
