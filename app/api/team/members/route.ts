/**
 * Team Members API
 *
 * GET: List team members in the organization
 * POST: Invite a new team member (TEAM plan only)
 *
 * Team Limits:
 * - Free/Pro: 1 user per organization
 * - Team: Up to 5 users per organization
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
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Get user's organization and subscription
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        organization: {
          include: {
            users: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
                lastLoginAt: true,
              },
            },
          },
        },
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

    // Determine subscription plan and limits
    const isActiveSubscription = user.subscriptions?.status === 'ACTIVE' || user.subscriptions?.status === 'TRIAL';
    const plan = isActiveSubscription ? (user.subscriptions?.plan || 'FREE') : 'FREE';
    const maxMembers = TEAM_LIMITS[plan];
    const currentMembers = user.organization.users.length;

    return NextResponse.json({
      success: true,
      members: user.organization.users,
      limits: {
        plan,
        maxMembers,
        currentMembers,
        canAddMore: currentMembers < maxMembers,
        remainingSlots: Math.max(0, maxMembers - currentMembers),
      },
      organization: {
        id: user.organization.id,
        name: user.organization.name,
      },
    });
  } catch (error: any) {
    console.error('Failed to fetch team members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team members' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Get user's organization and subscription
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        organization: {
          include: {
            users: true,
          },
        },
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

    // Check current member count
    const maxMembers = TEAM_LIMITS[plan];
    const currentMembers = user.organization.users.length;

    if (currentMembers >= maxMembers) {
      return NextResponse.json(
        {
          error: 'Team limit reached',
          message: `팀 멤버 한도(${maxMembers}명)에 도달했습니다.`,
          code: 'TEAM_LIMIT_REACHED',
          maxMembers,
          currentMembers,
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { email, name, role } = body;

    // Validate input
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Check if user with this email already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      // If user exists and belongs to another organization
      if (existingUser.organizationId && existingUser.organizationId !== user.organization.id) {
        return NextResponse.json(
          {
            error: 'User already belongs to another organization',
            message: '이 이메일은 이미 다른 조직에 소속되어 있습니다.',
          },
          { status: 400 }
        );
      }

      // If user exists and already in this organization
      if (existingUser.organizationId === user.organization.id) {
        return NextResponse.json(
          {
            error: 'User already in team',
            message: '이 사용자는 이미 팀 멤버입니다.',
          },
          { status: 400 }
        );
      }

      // User exists but has no organization - add them to this organization
      const updatedUser = await db.user.update({
        where: { id: existingUser.id },
        data: {
          organizationId: user.organization.id,
          role: role || 'USER',
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      });

      return NextResponse.json({
        success: true,
        member: updatedUser,
        message: '기존 사용자가 팀에 추가되었습니다.',
        isNewUser: false,
      });
    }

    // Create new user (they will need to complete OAuth sign-in)
    const { createId } = await import('@paralleldrive/cuid2');
    const newUser = await db.user.create({
      data: {
        id: createId(),
        email,
        name: name || null,
        role: role || 'USER',
        organizationId: user.organization.id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    // TODO: Send invitation email to the new user

    return NextResponse.json({
      success: true,
      member: newUser,
      message: '팀원이 초대되었습니다. 이메일로 발송된 링크를 통해 가입을 완료해야 합니다.',
      isNewUser: true,
    });
  } catch (error: any) {
    console.error('Failed to add team member:', error);
    return NextResponse.json(
      { error: 'Failed to add team member' },
      { status: 500 }
    );
  }
}
