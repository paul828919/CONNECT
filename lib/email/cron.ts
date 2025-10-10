/**
 * Email Notification Cron Jobs
 *
 * Scheduled tasks for deadline reminders and weekly digest.
 */

import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { sendDeadlineReminder, sendWeeklyDigestToAll } from './notifications';

const prisma = new PrismaClient();

/**
 * Send deadline reminders (7 days, 3 days, 1 day before)
 * Runs daily at 8:00 AM KST
 */
export function startDeadlineReminderCron() {
  cron.schedule(
    '0 8 * * *',
    async () => {
      console.log('⏰ Running deadline reminder cron...');

      try {
        const now = new Date();
        const deadlineThresholds = [
          { days: 7, label: 'D-7' },
          { days: 3, label: 'D-3' },
          { days: 1, label: 'D-1' },
        ];

        for (const threshold of deadlineThresholds) {
          // Calculate target deadline date
          const targetDeadline = new Date();
          targetDeadline.setDate(targetDeadline.getDate() + threshold.days);
          targetDeadline.setHours(0, 0, 0, 0);

          const nextDay = new Date(targetDeadline);
          nextDay.setDate(nextDay.getDate() + 1);

          // Find programs with deadlines matching this threshold
          const programsWithDeadlines = await prisma.fundingProgram.findMany({
            where: {
              deadline: {
                gte: targetDeadline,
                lt: nextDay,
              },
              status: 'ACTIVE',
            },
            select: { id: true },
          });

          console.log(
            `Found ${programsWithDeadlines.length} programs with ${threshold.label} deadlines`
          );

          // Get all matches for these programs
          for (const program of programsWithDeadlines) {
            const matches = await prisma.fundingMatch.findMany({
              where: {
                programId: program.id,
                status: 'ACTIVE',
                score: { gte: 60 }, // Minimum threshold
              },
              include: {
                organization: {
                  include: {
                    users: {
                      select: { id: true },
                    },
                  },
                },
              },
            });

            // Send reminder to each user
            for (const match of matches) {
              for (const user of match.organization.users) {
                try {
                  await sendDeadlineReminder(user.id, match.id, threshold.days);
                  // Small delay to avoid rate limiting
                  await new Promise((resolve) => setTimeout(resolve, 500));
                } catch (error) {
                  console.error(
                    `Failed to send deadline reminder to user ${user.id}:`,
                    error
                  );
                }
              }
            }
          }
        }

        console.log('✓ Deadline reminder cron completed');
      } catch (error) {
        console.error('Deadline reminder cron failed:', error);
      }
    },
    {
      timezone: 'Asia/Seoul',
    }
  );

  console.log('✓ Deadline reminder cron started (daily at 8:00 AM KST)');
}

/**
 * Send weekly digest
 * Runs every Sunday at 8:00 AM KST
 */
export function startWeeklyDigestCron() {
  cron.schedule(
    '0 8 * * 0',
    async () => {
      console.log('📊 Running weekly digest cron...');

      try {
        const result = await sendWeeklyDigestToAll();
        console.log(
          `✓ Weekly digest sent: ${result.sent}/${result.total} successful, ${result.failed} failed`
        );
      } catch (error) {
        console.error('Weekly digest cron failed:', error);
      }
    },
    {
      timezone: 'Asia/Seoul',
    }
  );

  console.log('✓ Weekly digest cron started (Sundays at 8:00 AM KST)');
}

/**
 * Start all email notification cron jobs
 */
export function startEmailCronJobs() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📧 Starting Email Notification Cron Jobs');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  startDeadlineReminderCron();
  startWeeklyDigestCron();

  console.log('');
  console.log('✅ All email cron jobs started successfully');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}
