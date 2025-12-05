/**
 * Team Join API
 *
 * GET: Validate invite code and get organization info
 * POST: Join a team using an invite code
 *
 * This API allows users to join a team via an invite link
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import { db } from '@/lib/db';
import { SubscriptionPlan } from '@prisma/client';

// Team member limits by subscription plan
const TEAM_LIMITS: Record<SubscriptionPlan, number> = {
  FREE: 1,
  PRO: 1,
  TEAM: 5,
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json(
        { error: 'Invite code is required' },
        { status: 400 }
      );
    }

    // Find the invite link
    const inviteLink = await db.team_invite_links.findUnique({
      where: { code },
      include: {
        organization: {
          include: {
            users: true,
          },
        },
      },
    });

    if (!inviteLink) {
      return NextResponse.json({
        valid: false,
        error: 'invalid_code',
        message: '유효하지 않은 초대 코드입니다.',
      });
    }

    // Check if link is active
    if (!inviteLink.isActive) {
      return NextResponse.json({
        valid: false,
        error: 'link_deactivated',
        message: '이 초대 링크는 비활성화되었습니다.',
      });
    }

    // Check if link has expired
    if (new Date() > inviteLink.expiresAt) {
      return NextResponse.json({
        valid: false,
        error: 'link_expired',
        message: '이 초대 링크가 만료되었습니다.',
      });
    }

    // Check if link has been used up
    if (inviteLink.usedCount >= inviteLink.maxUses) {
      return NextResponse.json({
        valid: false,
        error: 'link_exhausted',
        message: '이 초대 링크의 사용 횟수가 모두 소진되었습니다.',
      });
    }

    // Check organization's current member count
    const currentMembers = inviteLink.organization.users.length;
    const maxMembers = TEAM_LIMITS.TEAM;

    if (currentMembers >= maxMembers) {
      return NextResponse.json({
        valid: false,
        error: 'team_full',
        message: '팀이 이미 최대 인원에 도달했습니다.',
      });
    }

    return NextResponse.json({
      valid: true,
      organization: {
        name: inviteLink.organization.name,
        type: inviteLink.organization.type,
        currentMembers,
        maxMembers,
        remainingSlots: maxMembers - currentMembers,
      },
      expiresAt: inviteLink.expiresAt,
      remainingUses: inviteLink.maxUses - inviteLink.usedCount,
    });
  } catch (error: any) {
    console.error('Failed to validate invite code:', error);
    return NextResponse.json(
      { error: 'Failed to validate invite code' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: '팀에 참여하려면 먼저 로그인해주세요.',
          code: 'AUTHENTICATION_REQUIRED',
        },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id;
    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json(
        { error: 'Invite code is required' },
        { status: 400 }
      );
    }

    // Get current user
    const currentUser = await db.user.findUnique({
      where: { id: userId },
      include: {
        organization: true,
      },
    });

    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user already belongs to an organization
    if (currentUser.organizationId) {
      return NextResponse.json({
        success: false,
        error: 'already_in_organization',
        message: '이미 다른 조직에 소속되어 있습니다. 현재 조직에서 나간 후 다시 시도해주세요.',
      }, { status: 400 });
    }

    // Find and validate the invite link
    const inviteLink = await db.team_invite_links.findUnique({
      where: { code },
      include: {
        organization: {
          include: {
            users: true,
          },
        },
      },
    });

    if (!inviteLink) {
      return NextResponse.json({
        success: false,
        error: 'invalid_code',
        message: '유효하지 않은 초대 코드입니다.',
      }, { status: 400 });
    }

    if (!inviteLink.isActive) {
      return NextResponse.json({
        success: false,
        error: 'link_deactivated',
        message: '이 초대 링크는 비활성화되었습니다.',
      }, { status: 400 });
    }

    if (new Date() > inviteLink.expiresAt) {
      return NextResponse.json({
        success: false,
        error: 'link_expired',
        message: '이 초대 링크가 만료되었습니다.',
      }, { status: 400 });
    }

    if (inviteLink.usedCount >= inviteLink.maxUses) {
      return NextResponse.json({
        success: false,
        error: 'link_exhausted',
        message: '이 초대 링크의 사용 횟수가 모두 소진되었습니다.',
      }, { status: 400 });
    }

    // Check organization's current member count
    const currentMembers = inviteLink.organization.users.length;
    const maxMembers = TEAM_LIMITS.TEAM;

    if (currentMembers >= maxMembers) {
      return NextResponse.json({
        success: false,
        error: 'team_full',
        message: '팀이 이미 최대 인원에 도달했습니다.',
      }, { status: 400 });
    }

    // Join the team - use transaction to ensure consistency
    await db.$transaction([
      // Update user's organization
      db.user.update({
        where: { id: userId },
        data: {
          organizationId: inviteLink.organizationId,
          role: 'USER', // New members join as regular users
        },
      }),
      // Increment invite link usage count
      db.team_invite_links.update({
        where: { id: inviteLink.id },
        data: {
          usedCount: { increment: 1 },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: `${inviteLink.organization.name} 팀에 성공적으로 참여했습니다!`,
      organization: {
        id: inviteLink.organization.id,
        name: inviteLink.organization.name,
        type: inviteLink.organization.type,
      },
      redirectUrl: '/dashboard',
    });
  } catch (error: any) {
    console.error('Failed to join team:', error);
    return NextResponse.json(
      { error: 'Failed to join team' },
      { status: 500 }
    );
  }
}
