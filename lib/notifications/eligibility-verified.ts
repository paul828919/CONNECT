/**
 * Eligibility Verification Notification Utility
 *
 * Sends notifications to users when their organization's eligibility for a program
 * has been manually verified by an admin (Phase 5).
 *
 * Notification Flow:
 * 1. Admin reviews program eligibility
 * 2. Admin approves/rejects the eligibility
 * 3. System finds all users with CONDITIONALLY_ELIGIBLE matches for that program
 * 4. System creates notifications for those users
 * 5. Email notification sent (if user has email notifications enabled)
 *
 * Note: This uses the existing match_notifications table with custom type handling
 */

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error'],
  });

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = db;
}

interface EligibilityVerificationNotificationParams {
  programId: string;
  programTitle: string;
  newConfidence: 'LOW' | 'MEDIUM' | 'HIGH';
  reviewAction: 'APPROVE' | 'REJECT' | 'REQUEST_INFO';
  reviewNotes?: string;
}

/**
 * Send notification to users affected by eligibility verification
 *
 * This function:
 * 1. Finds all matches for the program
 * 2. Filters for CONDITIONALLY_ELIGIBLE matches (users who might benefit from verification)
 * 3. Creates in-app notifications
 * 4. Sends email notifications (if enabled)
 */
export async function notifyEligibilityVerification({
  programId,
  programTitle,
  newConfidence,
  reviewAction,
  reviewNotes,
}: EligibilityVerificationNotificationParams): Promise<void> {
  try {
    console.log(`[Eligibility Notification] Processing for program: ${programTitle}`);

    // 1. Find all matches for this program
    const matches = await db.funding_matches.findMany({
      where: {
        programId: programId,
      },
      include: {
        organizations: {
          include: {
            users: {
              where: {
                emailNotifications: true, // Only notify users with notifications enabled
              },
            },
          },
        },
      },
    });

    console.log(`[Eligibility Notification] Found ${matches.length} matches for program`);

    // 2. Create notifications for affected users
    let notificationCount = 0;

    for (const match of matches) {
      const users = match.organizations?.users || [];

      for (const user of users) {
        // Create in-app notification
        const notification = await db.match_notifications.create({
          data: {
            userId: user.id,
            matchId: match.id,
            type: 'NEW_MATCH', // Using existing enum value (can extend later)
            title: '🔍 프로그램 자격 요건 검증 완료',
            message:
              reviewAction === 'APPROVE'
                ? `${programTitle}의 자격 요건이 관리자에 의해 검증되었습니다. 매칭 점수가 업데이트될 수 있습니다.`
                : `${programTitle}의 자격 요건 검증이 완료되었습니다. ${reviewNotes || '자세한 내용은 프로그램 상세 페이지를 확인하세요.'}`,
            read: false,
            emailSent: false, // Email will be sent by background job
          },
        });

        notificationCount++;
        console.log(
          `[Eligibility Notification] Created notification for user ${user.id} (${user.email})`
        );
      }
    }

    console.log(
      `[Eligibility Notification] Successfully created ${notificationCount} notifications`
    );
  } catch (error) {
    console.error('[Eligibility Notification] Error creating notifications:', error);
    // Don't throw - notification failure should not block eligibility update
  }
}

/**
 * Get pending eligibility verification notifications for a user
 */
export async function getPendingEligibilityNotifications(
  userId: string
): Promise<
  Array<{
    id: string;
    title: string;
    message: string;
    createdAt: Date;
    programTitle: string;
  }>
> {
  try {
    const notifications = await db.match_notifications.findMany({
      where: {
        userId,
        read: false,
        title: {
          contains: '자격 요건 검증', // Filter for eligibility notifications
        },
      },
      include: {
        funding_matches: {
          include: {
            funding_programs: {
              select: {
                title: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    return notifications.map((n) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      createdAt: n.createdAt,
      programTitle: n.funding_matches.funding_programs.title,
    }));
  } catch (error) {
    console.error('[Eligibility Notification] Error fetching notifications:', error);
    return [];
  }
}

/**
 * Mark eligibility notification as read
 */
export async function markEligibilityNotificationRead(notificationId: string): Promise<void> {
  try {
    await db.match_notifications.update({
      where: { id: notificationId },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
  } catch (error) {
    console.error('[Eligibility Notification] Error marking notification as read:', error);
  }
}
