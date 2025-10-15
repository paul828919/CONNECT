/**
 * Notification Service
 *
 * Handles all email notifications with user preference checking.
 */

import { db } from '@/lib/db';
import { sendEmail } from './utils';
import { newMatchEmailTemplate, NewMatchEmailData } from './templates/new-match';
import {
  deadlineReminderEmailTemplate,
  DeadlineReminderEmailData,
} from './templates/deadline-reminder';
import { weeklyDigestEmailTemplate, WeeklyDigestEmailData } from './templates/weekly-digest';


/**
 * Default notification settings
 */
const defaultNotificationSettings = {
  newMatchNotifications: true,
  deadlineReminders: true,
  weeklyDigest: true,
  minimumMatchScore: 60,
  emailEnabled: true,
};

/**
 * Get user notification settings
 */
async function getUserNotificationSettings(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { notificationSettings: true },
  });

  if (!user || !user.notificationSettings) {
    return defaultNotificationSettings;
  }

  return {
    ...defaultNotificationSettings,
    ...(user.notificationSettings as any),
  };
}

/**
 * Send new match notification
 */
export async function sendNewMatchNotification(
  userId: string,
  matchIds: string[]
): Promise<boolean> {
  try {
    // 1. Get user settings
    const settings = await getUserNotificationSettings(userId);

    if (!settings.emailEnabled || !settings.newMatchNotifications) {
      console.log(`User ${userId} has disabled new match notifications`);
      return false;
    }

    // 2. Fetch user data
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        organizations: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!user || !user.email || !user.organizations) {
      console.error(`User ${userId} not found or missing data`);
      return false;
    }

    // 3. Fetch matches with details
    const matches = await db.funding_matches.findMany({
      where: {
        id: { in: matchIds },
        score: { gte: settings.minimumMatchScore },
      },
      include: {
        funding_programs: true,
      },
      orderBy: { score: 'desc' },
      take: 5, // Top 5 matches
    });

    if (matches.length === 0) {
      console.log(`No matches above threshold for user ${userId}`);
      return false;
    }

    // 4. Prepare email data
    const emailData: NewMatchEmailData = {
      userName: user.name || '사용자',
      organizationName: user.organizations.name,
      matches: matches.map((match) => ({
        id: match.id,
        title: match.funding_programs.title,
        agencyName: match.funding_programs.agencyId || '기관',
        score: match.score,
        deadline: match.funding_programs.deadline,
        budgetAmount: match.funding_programs.budgetAmount
          ? Number(match.funding_programs.budgetAmount)
          : null,
        explanation: match.explanation as string[],
      })),
    };

    // 5. Send email
    const html = newMatchEmailTemplate(emailData);
    const success = await sendEmail({
      to: user.email,
      subject: `🎯 새로운 펀딩 매칭 ${matches.length}건 발견`,
      html,
    });

    if (success) {
      // Update last notification time
      await db.user.update({
        where: { id: userId },
        data: {
          lastNotificationSentAt: new Date(),
        },
      });
    }

    return success;
  } catch (error: any) {
    console.error('Failed to send new match notification:', error);
    return false;
  }
}

/**
 * Send deadline reminder
 */
export async function sendDeadlineReminder(
  userId: string,
  matchId: string,
  daysUntilDeadline: number
): Promise<boolean> {
  try {
    // 1. Get user settings
    const settings = await getUserNotificationSettings(userId);

    if (!settings.emailEnabled || !settings.deadlineReminders) {
      console.log(`User ${userId} has disabled deadline reminders`);
      return false;
    }

    // 2. Fetch user and match data
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        organizations: {
          select: { name: true },
        },
      },
    });

    if (!user || !user.email || !user.organizations) {
      return false;
    }

    const match = await db.funding_matches.findUnique({
      where: { id: matchId },
      include: {
        funding_programs: true,
      },
    });

    if (!match || !match.funding_programs.deadline) {
      return false;
    }

    // 3. Prepare email data
    const emailData: DeadlineReminderEmailData = {
      userName: user.name || '사용자',
      organizationName: user.organizations.name,
      program: {
        id: match.funding_programs.id,
        title: match.funding_programs.title,
        agencyName: match.funding_programs.agencyId || '기관',
        deadline: match.funding_programs.deadline,
        budgetAmount: match.funding_programs.budgetAmount
          ? Number(match.funding_programs.budgetAmount)
          : null,
        announcementUrl: match.funding_programs.announcementUrl,
        matchScore: match.score,
      },
      daysUntilDeadline,
    };

    // 4. Send email
    const html = deadlineReminderEmailTemplate(emailData);
    const success = await sendEmail({
      to: user.email,
      subject: `⏰ D-${daysUntilDeadline} 마감 알림: ${match.funding_programs.title.substring(0, 40)}...`,
      html,
    });

    return success;
  } catch (error: any) {
    console.error('Failed to send deadline reminder:', error);
    return false;
  }
}

/**
 * Send weekly digest
 */
export async function sendWeeklyDigest(userId: string): Promise<boolean> {
  try {
    // 1. Get user settings
    const settings = await getUserNotificationSettings(userId);

    if (!settings.emailEnabled || !settings.weeklyDigest) {
      console.log(`User ${userId} has disabled weekly digest`);
      return false;
    }

    // 2. Fetch user data
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        organizations: {
          select: { id: true, name: true },
        },
      },
    });

    if (!user || !user.email || !user.organizations) {
      return false;
    }

    // 3. Calculate week range
    const weekEnd = new Date();
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);

    // 4. Fetch week statistics
    const [newPrograms, newMatches, upcomingDeadlines] = await Promise.all([
      // New programs this week
      db.funding_programs.count({
        where: {
          createdAt: {
            gte: weekStart,
            lte: weekEnd,
          },
          status: 'ACTIVE',
        },
      }),

      // New matches this week
      db.funding_matches.count({
        where: {
          organizationId: user.organizations.id,
          createdAt: {
            gte: weekStart,
            lte: weekEnd,
          },
        },
      }),

      // Upcoming deadlines (next 14 days)
      db.funding_matches.count({
        where: {
          organizationId: user.organizations.id,
          funding_programs: {
            deadline: {
              gte: new Date(),
              lte: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            },
          },
        },
      }),
    ]);

    // 5. Fetch top matches
    const topMatches = await db.funding_matches.findMany({
      where: {
        organizationId: user.organizations.id,
        createdAt: {
          gte: weekStart,
          lte: weekEnd,
        },
        score: { gte: settings.minimumMatchScore },
      },
      include: {
        funding_programs: true,
      },
      orderBy: { score: 'desc' },
      take: 3,
    });

    // 6. Fetch upcoming deadlines
    const upcomingDeadlinesList = await db.funding_matches.findMany({
      where: {
        organizationId: user.organizations.id,
        funding_programs: {
          deadline: {
            gte: new Date(),
            lte: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          },
        },
      },
      include: {
        funding_programs: true,
      },
      orderBy: {
        funding_programs: {
          deadline: 'asc',
        },
      },
      take: 5,
    });

    // 7. Prepare email data
    const emailData: WeeklyDigestEmailData = {
      userName: user.name || '사용자',
      organizationName: user.organizations.name,
      weekStart,
      weekEnd,
      stats: {
        newPrograms,
        newMatches,
        upcomingDeadlines,
      },
      topMatches: topMatches.map((match) => ({
        id: match.id,
        title: match.funding_programs.title,
        agencyName: match.funding_programs.agencyId || '기관',
        score: match.score,
        deadline: match.funding_programs.deadline,
        budgetAmount: match.funding_programs.budgetAmount
          ? Number(match.funding_programs.budgetAmount)
          : null,
      })),
      upcomingDeadlines: upcomingDeadlinesList.map((match) => {
        const daysUntil = Math.ceil(
          (match.funding_programs.deadline!.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        return {
          id: match.funding_programs.id,
          title: match.funding_programs.title,
          agencyName: match.funding_programs.agencyId || '기관',
          deadline: match.funding_programs.deadline!,
          daysUntil,
        };
      }),
    };

    // 8. Send email
    const html = weeklyDigestEmailTemplate(emailData);
    const success = await sendEmail({
      to: user.email,
      subject: `📊 주간 펀딩 리포트 (${newMatches}개 새 매칭)`,
      html,
    });

    return success;
  } catch (error: any) {
    console.error('Failed to send weekly digest:', error);
    return false;
  }
}

/**
 * Send weekly digest to all active users
 */
export async function sendWeeklyDigestToAll(): Promise<{
  total: number;
  sent: number;
  failed: number;
}> {
  try {
    const users = await db.user.findMany({
      where: {
        email: { not: null },
        organizations: { isNot: null },
      },
      select: { id: true },
    });

    let sent = 0;
    let failed = 0;

    for (const user of users) {
      const success = await sendWeeklyDigest(user.id);
      if (success) {
        sent++;
      } else {
        failed++;
      }

      // Rate limiting: wait 1 second between emails
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return {
      total: users.length,
      sent,
      failed,
    };
  } catch (error: any) {
    console.error('Failed to send weekly digest to all users:', error);
    return { total: 0, sent: 0, failed: 0 };
  }
}
