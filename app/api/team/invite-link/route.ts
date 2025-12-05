/**
 * Team Invite Link API
 *
 * GET: Get current active invite link for the organization
 * POST: Create a new invite link (invalidates previous one)
 * DELETE: Deactivate the current invite link
 *
 * Only available for TEAM plan subscribers
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import { db } from '@/lib/db';
import { SubscriptionPlan } from '@prisma/client';
import * as crypto from 'crypto';

// Team member limits by subscription plan
const TEAM_LIMITS: Record<SubscriptionPlan, number> = {
  FREE: 1,
  PRO: 1,
  TEAM: 5,
};

// Generate a random 8-character invite code
function generateInviteCode(): string {
  return crypto.randomBytes(4).toString('hex');
}

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
            users: true,
            teamInviteLinks: {
              where: {
                isActive: true,
                expiresAt: { gt: new Date() },
              },
              orderBy: { createdAt: 'desc' },
              take: 1,
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

    // Check subscription plan
    const isActiveSubscription = user.subscriptions?.status === 'ACTIVE' || user.subscriptions?.status === 'TRIAL';
    const plan = isActiveSubscription ? (user.subscriptions?.plan || 'FREE') : 'FREE';

    if (plan !== 'TEAM') {
      return NextResponse.json(
        {
          error: 'Upgrade required',
          message: '팀 초대 링크 기능은 Team 플랜에서만 사용 가능합니다.',
          code: 'UPGRADE_REQUIRED',
          upgradeUrl: '/pricing',
        },
        { status: 403 }
      );
    }

    const activeLink = user.organization.teamInviteLinks[0];
    const maxMembers = TEAM_LIMITS[plan];
    const currentMembers = user.organization.users.length;
    const remainingSlots = Math.max(0, maxMembers - currentMembers);

    if (!activeLink) {
      return NextResponse.json({
        success: true,
        inviteLink: null,
        message: '활성화된 초대 링크가 없습니다.',
        remainingSlots,
      });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://connectplt.kr';
    const fullUrl = `${baseUrl}/join/${activeLink.code}`;

    return NextResponse.json({
      success: true,
      inviteLink: {
        id: activeLink.id,
        code: activeLink.code,
        fullUrl,
        expiresAt: activeLink.expiresAt,
        maxUses: activeLink.maxUses,
        usedCount: activeLink.usedCount,
        remainingUses: Math.max(0, activeLink.maxUses - activeLink.usedCount),
        createdAt: activeLink.createdAt,
      },
      remainingSlots,
    });
  } catch (error: any) {
    console.error('Failed to get invite link:', error);
    return NextResponse.json(
      { error: 'Failed to get invite link' },
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
          message: '팀 초대 링크 기능은 Team 플랜에서만 사용 가능합니다.',
          code: 'UPGRADE_REQUIRED',
          upgradeUrl: '/pricing',
        },
        { status: 403 }
      );
    }

    // Check if organization can add more members
    const maxMembers = TEAM_LIMITS[plan];
    const currentMembers = user.organization.users.length;

    if (currentMembers >= maxMembers) {
      return NextResponse.json(
        {
          error: 'Team limit reached',
          message: `팀 멤버 한도(${maxMembers}명)에 도달했습니다. 더 이상 초대할 수 없습니다.`,
          code: 'TEAM_LIMIT_REACHED',
        },
        { status: 400 }
      );
    }

    // Parse optional expiry days from request body
    let expiryDays = 7; // Default 7 days
    try {
      const body = await request.json();
      if (body.expiryDays && typeof body.expiryDays === 'number' && body.expiryDays > 0 && body.expiryDays <= 30) {
        expiryDays = body.expiryDays;
      }
    } catch {
      // No body or invalid JSON, use default
    }

    // Deactivate any existing active invite links for this organization
    await db.team_invite_links.updateMany({
      where: {
        organizationId: user.organization.id,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    // Create new invite link
    const code = generateInviteCode();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    const remainingSlots = maxMembers - currentMembers;

    const inviteLink = await db.team_invite_links.create({
      data: {
        code,
        organizationId: user.organization.id,
        createdById: userId,
        expiresAt,
        maxUses: remainingSlots,
        usedCount: 0,
        isActive: true,
      },
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://connectplt.kr';
    const fullUrl = `${baseUrl}/join/${code}`;

    return NextResponse.json({
      success: true,
      inviteLink: {
        id: inviteLink.id,
        code: inviteLink.code,
        fullUrl,
        expiresAt: inviteLink.expiresAt,
        maxUses: inviteLink.maxUses,
        usedCount: inviteLink.usedCount,
        remainingUses: inviteLink.maxUses,
        createdAt: inviteLink.createdAt,
      },
      message: `초대 링크가 생성되었습니다. ${expiryDays}일 후 만료됩니다.`,
    });
  } catch (error: any) {
    console.error('Failed to create invite link:', error);
    return NextResponse.json(
      { error: 'Failed to create invite link' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Get user's organization
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
          message: '팀 초대 링크 기능은 Team 플랜에서만 사용 가능합니다.',
          code: 'UPGRADE_REQUIRED',
          upgradeUrl: '/pricing',
        },
        { status: 403 }
      );
    }

    // Deactivate all active invite links for this organization
    const result = await db.team_invite_links.updateMany({
      where: {
        organizationId: user.organization.id,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: result.count > 0
        ? '초대 링크가 비활성화되었습니다.'
        : '활성화된 초대 링크가 없습니다.',
      deactivatedCount: result.count,
    });
  } catch (error: any) {
    console.error('Failed to deactivate invite link:', error);
    return NextResponse.json(
      { error: 'Failed to deactivate invite link' },
      { status: 500 }
    );
  }
}
