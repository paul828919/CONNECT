/**
 * AI Budget Alert System
 * Connect Platform - Week 3-4 AI Integration
 *
 * Monitors daily budget and sends email alerts at critical thresholds
 */

import { PrismaClient, AlertSeverity } from '@prisma/client';
import { nanoid } from 'nanoid';
import nodemailer from 'nodemailer';
import { db } from '@/lib/db';


// Alert thresholds (percentage of daily budget)
const ALERT_THRESHOLDS = [
  { threshold: 50, severity: 'INFO' as AlertSeverity },
  { threshold: 80, severity: 'WARNING' as AlertSeverity },
  { threshold: 95, severity: 'CRITICAL' as AlertSeverity },
];

// Admin emails (from env)
const ADMIN_EMAILS = process.env.AI_BUDGET_ALERT_EMAILS
  ? process.env.AI_BUDGET_ALERT_EMAILS.split(',')
  : ['kbj20415@gmail.com']; // Default fallback

// Email transporter (AWS SES)
let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }
  return transporter;
}

/**
 * Check budget and create alerts if thresholds exceeded
 */
export async function checkBudgetAndAlert(
  amountSpent: number,
  dailyLimit: number
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const percentage = (amountSpent / dailyLimit) * 100;

  // Check each threshold
  for (const { threshold, severity } of ALERT_THRESHOLDS) {
    if (percentage >= threshold) {
      // Check if alert already sent today for this threshold
      const existingAlert = await db.ai_budget_alerts.findFirst({
        where: {
          date: new Date(today),
          threshold,
          alertSent: true,
        },
      });

      if (existingAlert) {
        continue; // Already alerted for this threshold today
      }

      // Create alert record
      const alert = await db.ai_budget_alerts.create({
        data: {
          id: nanoid(),
          date: new Date(today),
          severity,
          threshold,
          amountSpent,
          dailyLimit,
          percentage,
          alertSent: false,
          recipientEmails: ADMIN_EMAILS,
        },
      });

      // Send email notification
      try {
        await sendBudgetAlertEmail(alert);

        // Mark as sent
        await db.ai_budget_alerts.update({
          where: { id: alert.id },
          data: {
            alertSent: true,
            alertSentAt: new Date(),
          },
        });

        console.log(`✉️  Budget alert sent: ${severity} (${threshold}%)`);
      } catch (error) {
        console.error('❌ Failed to send budget alert email:', error);
      }
    }
  }
}

/**
 * Send budget alert email
 */
async function sendBudgetAlertEmail(alert: {
  severity: AlertSeverity;
  threshold: number;
  amountSpent: number;
  dailyLimit: number;
  percentage: number;
}): Promise<void> {
  const { severity, threshold, amountSpent, dailyLimit, percentage } = alert;

  // Email subject based on severity
  const subjectPrefix = {
    INFO: '📊 Info',
    WARNING: '⚠️ Warning',
    CRITICAL: '🚨 Critical',
  }[severity];

  const subject = `${subjectPrefix}: AI Budget at ${percentage.toFixed(1)}%`;

  // Email body
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: ${severity === 'CRITICAL' ? '#dc2626' : severity === 'WARNING' ? '#f59e0b' : '#3b82f6'}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
        .stat { background: white; padding: 15px; margin: 10px 0; border-radius: 6px; border-left: 4px solid ${severity === 'CRITICAL' ? '#dc2626' : severity === 'WARNING' ? '#f59e0b' : '#3b82f6'}; }
        .stat-label { font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600; }
        .stat-value { font-size: 24px; font-weight: 700; color: #111827; margin-top: 5px; }
        .progress-bar { background: #e5e7eb; height: 24px; border-radius: 12px; overflow: hidden; margin: 20px 0; }
        .progress-fill { height: 100%; background: ${severity === 'CRITICAL' ? '#dc2626' : severity === 'WARNING' ? '#f59e0b' : '#3b82f6'}; transition: width 0.3s; }
        .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
        .action-items { background: #fef3c7; border: 1px solid #fcd34d; padding: 15px; border-radius: 6px; margin: 15px 0; }
        .action-items ul { margin: 10px 0; padding-left: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">${subjectPrefix}: AI Budget Alert</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Daily budget threshold reached</p>
        </div>
        <div class="content">
          <p>Your Connect Platform AI budget has reached <strong>${threshold}%</strong> of the daily limit.</p>

          <div class="progress-bar">
            <div class="progress-fill" style="width: ${percentage}%"></div>
          </div>

          <div class="stat">
            <div class="stat-label">Amount Spent Today</div>
            <div class="stat-value">₩${amountSpent.toLocaleString('ko-KR')}</div>
          </div>

          <div class="stat">
            <div class="stat-label">Daily Budget Limit</div>
            <div class="stat-value">₩${dailyLimit.toLocaleString('ko-KR')}</div>
          </div>

          <div class="stat">
            <div class="stat-label">Remaining Budget</div>
            <div class="stat-value">₩${(dailyLimit - amountSpent).toLocaleString('ko-KR')}</div>
          </div>

          ${severity === 'CRITICAL' ? `
          <div class="action-items">
            <strong>⚠️ Action Required:</strong>
            <ul>
              <li>AI requests will be blocked when budget is fully exhausted</li>
              <li>Consider increasing AI_DAILY_BUDGET_KRW in production .env</li>
              <li>Review cost breakdown in admin dashboard</li>
              <li>Check for unusual usage patterns or abuse</li>
            </ul>
          </div>
          ` : ''}

          <p style="margin-top: 20px;">
            <strong>When does the budget reset?</strong><br>
            The daily budget resets at midnight KST (Korean Standard Time).
          </p>

          <p>
            <strong>View detailed analytics:</strong><br>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/ai-monitoring">AI Monitoring Dashboard</a>
          </p>
        </div>
        <div class="footer">
          Connect Platform AI Monitoring System<br>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}">connect.example.com</a>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
${subjectPrefix}: AI Budget Alert

Your Connect Platform AI budget has reached ${threshold}% of the daily limit.

Amount Spent: ₩${amountSpent.toLocaleString('ko-KR')}
Daily Limit: ₩${dailyLimit.toLocaleString('ko-KR')}
Remaining: ₩${(dailyLimit - amountSpent).toLocaleString('ko-KR')}

${severity === 'CRITICAL' ? `
⚠️ Action Required:
- AI requests will be blocked when budget is fully exhausted
- Consider increasing AI_DAILY_BUDGET_KRW in production .env
- Review cost breakdown in admin dashboard
` : ''}

View detailed analytics: ${process.env.NEXT_PUBLIC_APP_URL}/admin/ai-monitoring

The daily budget resets at midnight KST.
  `.trim();

  const transporter = getTransporter();

  await transporter.sendMail({
    from: `${process.env.SMTP_FROM_NAME} <${process.env.SMTP_FROM_EMAIL}>`,
    to: ADMIN_EMAILS.join(', '),
    subject,
    text,
    html,
  });
}

/**
 * Get alert history for date range
 */
export async function getAlertHistory(
  startDate: Date,
  endDate: Date
): Promise<any[]> {
  return db.ai_budget_alerts.findMany({
    where: {
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

/**
 * Test alert system (sends test email)
 */
export async function testAlertSystem(): Promise<void> {
  const testAlert = {
    date: new Date(),
    severity: 'INFO' as AlertSeverity,
    threshold: 50,
    amountSpent: 25000,
    dailyLimit: 50000,
    percentage: 50,
  };

  await sendBudgetAlertEmail(testAlert);
  console.log('✅ Test alert email sent successfully');
}

const budgetAlerts = {
  checkBudgetAndAlert,
  getAlertHistory,
  testAlertSystem,
};

export default budgetAlerts;
