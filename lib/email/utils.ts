/**
 * Email Utilities
 *
 * Helper functions for sending emails with nodemailer.
 */

import { emailTransporter, emailConfig } from './config';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send email using configured SMTP transport
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const info = await emailTransporter.sendMail({
      from: `${emailConfig.from.name} <${emailConfig.from.address}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || stripHtml(options.html),
      replyTo: emailConfig.replyTo,
    });

    console.log(`✓ Email sent to ${options.to}: ${info.messageId}`);
    return true;
  } catch (error: any) {
    console.error(`❌ Failed to send email to ${options.to}:`, error.message);
    return false;
  }
}

/**
 * Strip HTML tags for plain text version
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Format Korean date
 */
export function formatKoreanDate(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}년 ${month}월 ${day}일`;
}

/**
 * Calculate days until deadline
 */
export function getDaysUntilDeadline(deadline: Date): number {
  const now = new Date();
  const diff = deadline.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Format Korean number with commas
 */
export function formatKoreanNumber(num: number): string {
  return num.toLocaleString('ko-KR');
}

/**
 * Convert budget to Korean readable format
 * Example: 100000000 → "1억원"
 */
export function formatBudgetKorean(amount: number): string {
  if (amount >= 1000000000000) {
    // 조 (trillion)
    const trillion = amount / 1000000000000;
    return `${trillion.toFixed(1)}조원`;
  } else if (amount >= 100000000) {
    // 억 (hundred million)
    const hundredMillion = amount / 100000000;
    return `${hundredMillion.toFixed(1)}억원`;
  } else if (amount >= 10000) {
    // 만 (ten thousand)
    const tenThousand = amount / 10000;
    return `${tenThousand.toFixed(0)}만원`;
  } else {
    return `${formatKoreanNumber(amount)}원`;
  }
}
