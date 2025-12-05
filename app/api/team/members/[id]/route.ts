/**
 * Individual Team Member API
 *
 * DELETE: Remove a team member from the organization
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import { db } from '@/lib/db';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const memberIdToRemove = params.id;

    // Prevent user from removing themselves
    if (userId === memberIdToRemove) {
      return NextResponse.json(
        {
          error: 'Cannot remove yourself',
          message: '자기 자신은 팀에서 제외할 수 없습니다. 조직을 탈퇴하려면 설정에서 회원 탈퇴를 진행해주세요.',
        },
        { status: 400 }
      );
    }

    // Get requesting user's organization and subscription
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        organization: true,
        subscriptions: {
          select: {
            plan: true,
            status: true,
          },
        },
      },
    });

    if (!user?.organization) {
      return NextResponse.json(
        { error: 'No organization associated with user' },
        { status: 400 }
      );
    }

    // Check subscription plan
    const isActiveSubscription = user.subscriptions?.status === 'ACTIVE' || user.subscriptions?.status === 'TRIAL';
    const plan = isActiveSubscription ? (user.subscriptions?.plan || 'FREE') : 'FREE';

    if (plan !== 'TEAM') {
      return NextResponse.json(
        {
          error: 'Upgrade required',
          message: '팀 멤버 관리 기능은 Team 플랜에서만 사용 가능합니다.',
          code: 'UPGRADE_REQUIRED',
          upgradeUrl: '/pricing',
        },
        { status: 403 }
      );
    }

    // Get the member to remove
    const memberToRemove = await db.user.findUnique({
      where: { id: memberIdToRemove },
      select: {
        id: true,
        name: true,
        email: true,
        organizationId: true,
        role: true,
      },
    });

    if (!memberToRemove) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

    // Verify member belongs to the same organization
    if (memberToRemove.organizationId !== user.organization.id) {
      return NextResponse.json(
        {
          error: 'Member not in your organization',
          message: '이 사용자는 귀하의 조직에 소속되어 있지 않습니다.',
        },
        { status: 403 }
      );
    }

    // Prevent removing ADMIN users (only SUPER_ADMIN can do that)
    if (memberToRemove.role === 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        {
          error: 'Cannot remove admin',
          message: '관리자는 다른 관리자를 제거할 수 없습니다.',
        },
        { status: 403 }
      );
    }

    // Remove member from organization (set organizationId to null)
    await db.user.update({
      where: { id: memberIdToRemove },
      data: {
        organizationId: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: `${memberToRemove.name || memberToRemove.email}님이 팀에서 제외되었습니다.`,
      removedMember: {
        id: memberToRemove.id,
        name: memberToRemove.name,
        email: memberToRemove.email,
      },
    });
  } catch (error: any) {
    console.error('Failed to remove team member:', error);
    return NextResponse.json(
      { error: 'Failed to remove team member' },
      { status: 500 }
    );
  }
}
