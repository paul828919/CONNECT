/**
 * Notification Settings API
 *
 * GET: Fetch user's notification preferences
 * PATCH: Update notification preferences
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Default notification settings
const defaultSettings = {
  newMatchNotifications: true,
  deadlineReminders: true,
  weeklyDigest: true,
  minimumMatchScore: 60,
  emailEnabled: true,
};

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { notificationSettings: true },
    });

    const settings = user?.notificationSettings
      ? { ...defaultSettings, ...(user.notificationSettings as any) }
      : defaultSettings;

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error: any) {
    console.error('Failed to fetch notification settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();

    // Validate input
    const {
      newMatchNotifications,
      deadlineReminders,
      weeklyDigest,
      minimumMatchScore,
      emailEnabled,
    } = body;

    const settings: any = {};

    if (typeof newMatchNotifications === 'boolean')
      settings.newMatchNotifications = newMatchNotifications;
    if (typeof deadlineReminders === 'boolean')
      settings.deadlineReminders = deadlineReminders;
    if (typeof weeklyDigest === 'boolean') settings.weeklyDigest = weeklyDigest;
    if (typeof emailEnabled === 'boolean') settings.emailEnabled = emailEnabled;

    if (minimumMatchScore !== undefined) {
      const score = parseInt(minimumMatchScore);
      if (score >= 0 && score <= 100) {
        settings.minimumMatchScore = score;
      } else {
        return NextResponse.json(
          { error: 'Minimum match score must be between 0 and 100' },
          { status: 400 }
        );
      }
    }

    // Update user settings
    await prisma.user.update({
      where: { id: userId },
      data: {
        notificationSettings: settings as any,
      },
    });

    return NextResponse.json({
      success: true,
      settings,
      message: '알림 설정이 업데이트되었습니다',
    });
  } catch (error: any) {
    console.error('Failed to update notification settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
