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
import {
  reEngagementEmailTemplate,
  getReEngagementSubject,
  ReEngagementEmailData,
} from './templates/re-engagement';


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
        organization: {
          select: {
            name: true,
            primaryContactEmail: true,
          },
        },
      },
    });

    if (!user || !user.email || !user.organization) {
      console.error(`User ${userId} not found or missing data`);
      return false;
    }

    // Use organization's work email if available, fallback to OAuth email
    const recipientEmail = user.organization.primaryContactEmail || user.email;

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
      organizationName: user.organization.name,
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
      to: recipientEmail,
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
        organization: {
          select: {
            name: true,
            primaryContactEmail: true,
          },
        },
      },
    });

    if (!user || !user.email || !user.organization) {
      return false;
    }

    // Use organization's work email if available, fallback to OAuth email
    const recipientEmail = user.organization.primaryContactEmail || user.email;

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
      organizationName: user.organization.name,
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
      to: recipientEmail,
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
        organization: {
          select: {
            id: true,
            name: true,
            primaryContactEmail: true,
          },
        },
      },
    });

    if (!user || !user.email || !user.organization) {
      return false;
    }

    // Use organization's work email if available, fallback to OAuth email
    const recipientEmail = user.organization.primaryContactEmail || user.email;

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
          organizationId: user.organization.id,
          createdAt: {
            gte: weekStart,
            lte: weekEnd,
          },
        },
      }),

      // Upcoming deadlines (next 14 days)
      db.funding_matches.count({
        where: {
          organizationId: user.organization.id,
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
        organizationId: user.organization.id,
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
        organizationId: user.organization.id,
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
      organizationName: user.organization.name,
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
      to: recipientEmail,
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
        organization: { isNot: null },
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

/**
 * Send re-engagement email to inactive user
 *
 * @param userId - User ID
 * @param day - Day in the sequence (1, 3, or 7)
 */
export async function sendReEngagementEmail(
  userId: string,
  day: 1 | 3 | 7
): Promise<boolean> {
  try {
    // 1. Get user settings
    const settings = await getUserNotificationSettings(userId);

    if (!settings.emailEnabled) {
      console.log(`User ${userId} has disabled email notifications`);
      return false;
    }

    // 2. Fetch user data
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            primaryContactEmail: true,
          },
        },
      },
    });

    if (!user || !user.email) {
      return false;
    }

    // Use organization's work email if available, fallback to OAuth email
    const recipientEmail = user.organization?.primaryContactEmail || user.email;

    // 3. Calculate profile completion (simplified)
    let profileCompletion = 30; // Base for having account
    if (user.organization) {
      profileCompletion += 30; // Has organization
      const org = await db.organizations.findUnique({
        where: { id: user.organization.id },
        select: {
          industrySector: true,
          technologyReadinessLevel: true,
          type: true,
          revenueRange: true,
        },
      });
      if (org?.industrySector) profileCompletion += 15;
      if (org?.technologyReadinessLevel) profileCompletion += 10;
      if (org?.type) profileCompletion += 10;
      if (org?.revenueRange) profileCompletion += 5;
    }
    profileCompletion = Math.min(profileCompletion, 100);

    // 4. Get active programs count
    const activePrograms = await db.funding_programs.count({
      where: {
        status: 'ACTIVE',
        deadline: { gte: new Date() },
      },
    });

    // 5. Check if user has any matches
    const hasMatches = user.organization
      ? (await db.funding_matches.count({
          where: { organizationId: user.organization.id },
        })) > 0
      : false;

    // 6. Prepare email data
    const emailData: ReEngagementEmailData = {
      userName: user.name || '사용자',
      organizationName: user.organization?.name || null,
      daysSinceLastActivity: day,
      profileCompletion,
      activePrograms,
      hasMatches,
    };

    // 7. Send email
    const html = reEngagementEmailTemplate(emailData, day);
    const subject = getReEngagementSubject(emailData, day);

    const success = await sendEmail({
      to: recipientEmail,
      subject,
      html,
    });

    if (success) {
      console.log(`[Re-engagement] Sent Day ${day} email to user ${userId}`);
    }

    return success;
  } catch (error: any) {
    console.error('Failed to send re-engagement email:', error);
    return false;
  }
}

/**
 * Find and send re-engagement emails to all inactive users
 * Called daily by cron job
 */
export async function processReEngagementEmails(): Promise<{
  day1: { sent: number; failed: number };
  day3: { sent: number; failed: number };
  day7: { sent: number; failed: number };
}> {
  const result = {
    day1: { sent: 0, failed: 0 },
    day3: { sent: 0, failed: 0 },
    day7: { sent: 0, failed: 0 },
  };

  try {
    const now = new Date();

    // Calculate date boundaries for each cohort
    const day1Start = new Date(now);
    day1Start.setDate(day1Start.getDate() - 1);
    day1Start.setHours(0, 0, 0, 0);

    const day1End = new Date(day1Start);
    day1End.setHours(23, 59, 59, 999);

    const day3Start = new Date(now);
    day3Start.setDate(day3Start.getDate() - 3);
    day3Start.setHours(0, 0, 0, 0);

    const day3End = new Date(day3Start);
    day3End.setHours(23, 59, 59, 999);

    const day7Start = new Date(now);
    day7Start.setDate(day7Start.getDate() - 7);
    day7Start.setHours(0, 0, 0, 0);

    const day7End = new Date(day7Start);
    day7End.setHours(23, 59, 59, 999);

    // Find inactive users for each cohort
    // "Inactive" = created account but hasn't logged in since creation day
    // OR has logged in but never generated a match

    // Day 1: Users who signed up yesterday and haven't returned
    const day1Users = await db.user.findMany({
      where: {
        createdAt: { gte: day1Start, lte: day1End },
        OR: [
          { lastLoginAt: null },
          { lastLoginAt: { lte: day1End } },
        ],
        email: { not: null },
      },
      select: { id: true },
    });

    // Day 3: Users who signed up 3 days ago and still haven't engaged
    const day3Users = await db.user.findMany({
      where: {
        createdAt: { gte: day3Start, lte: day3End },
        OR: [
          { lastLoginAt: null },
          { lastLoginAt: { lte: day3End } },
        ],
        email: { not: null },
      },
      select: { id: true },
    });

    // Day 7: Users who signed up 7 days ago and still haven't engaged
    const day7Users = await db.user.findMany({
      where: {
        createdAt: { gte: day7Start, lte: day7End },
        OR: [
          { lastLoginAt: null },
          { lastLoginAt: { lte: day7End } },
        ],
        email: { not: null },
      },
      select: { id: true },
    });

    console.log(`[Re-engagement] Found: Day 1: ${day1Users.length}, Day 3: ${day3Users.length}, Day 7: ${day7Users.length}`);

    // Send Day 1 emails
    for (const user of day1Users) {
      const success = await sendReEngagementEmail(user.id, 1);
      if (success) result.day1.sent++;
      else result.day1.failed++;
      await new Promise((resolve) => setTimeout(resolve, 500)); // Rate limit
    }

    // Send Day 3 emails
    for (const user of day3Users) {
      const success = await sendReEngagementEmail(user.id, 3);
      if (success) result.day3.sent++;
      else result.day3.failed++;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // Send Day 7 emails
    for (const user of day7Users) {
      const success = await sendReEngagementEmail(user.id, 7);
      if (success) result.day7.sent++;
      else result.day7.failed++;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    return result;
  } catch (error: any) {
    console.error('Failed to process re-engagement emails:', error);
    return result;
  }
}
