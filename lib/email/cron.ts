/**
 * Email Notification & Billing Cron Jobs
 *
 * Scheduled tasks for:
 * - Deadline reminders (daily at 8:00 AM KST)
 * - Weekly digest (Sundays at 8:00 AM KST)
 * - Recurring billing (daily at 00:00 UTC)
 */

import cron from 'node-cron';
import { db } from '@/lib/db';
import { sendDeadlineReminder, sendWeeklyDigestToAll } from './notifications';
import { processRecurringBillings } from '@/scripts/recurring-billing';


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
          const programsWithDeadlines = await db.funding_programs.findMany({
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
            const matches = await db.funding_matches.findMany({
              where: {
                programId: program.id,
                score: { gte: 60 }, // Minimum threshold
              },
              include: {
                organizations: {
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
              for (const user of match.organizations.users) {
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
 * Process recurring subscription billings
 * Runs daily at 00:00 UTC (09:00 KST)
 *
 * Uses Anniversary Billing: Each user billed on their individual nextBillingDate
 * Retry schedule: 1 day → 3 days → 7 days after initial failure
 */
export function startRecurringBillingCron() {
  cron.schedule(
    '0 0 * * *', // Daily at 00:00 UTC
    async () => {
      console.log('💳 Running recurring billing cron...');

      try {
        await processRecurringBillings();
        console.log('✓ Recurring billing cron completed');
      } catch (error) {
        console.error('Recurring billing cron failed:', error);
      }
    },
    {
      timezone: 'UTC', // Use UTC for billing consistency
    }
  );

  console.log('✓ Recurring billing cron started (daily at 00:00 UTC / 09:00 KST)');
}

/**
 * Start all cron jobs (email notifications + billing)
 */
export function startEmailCronJobs() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📧 Starting Notification & Billing Cron Jobs');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  startDeadlineReminderCron();
  startWeeklyDigestCron();
  startRecurringBillingCron();

  console.log('');
  console.log('✅ All cron jobs started successfully');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}
