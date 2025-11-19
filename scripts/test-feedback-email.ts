/**
 * Test Feedback Email Notification
 *
 * Simulates a feedback submission and verifies email is sent to admin
 */

import { db } from '../lib/db';
import { sendEmail } from '../lib/email/utils';
import { emailBaseUrl } from '../lib/email/config';
import { nanoid } from 'nanoid';

async function testFeedbackEmail() {
  console.log('🧪 Testing feedback email notification...\n');

  // Create a test feedback record
  const feedbackId = nanoid();
  const category = 'BUG';
  const priority = 'HIGH';
  const title = '테스트_유용한 도구';
  const description = '유용한 도구';
  const page = '/dashboard';
  const userAgent = 'Test Script / Node.js';

  try {
    // Test 1: Create feedback in database
    console.log('📝 Creating test feedback in database...');
    const feedback = await db.feedback.create({
      data: {
        id: feedbackId,
        userId: null, // Anonymous
        organizationId: null,
        category: category as any,
        title,
        description,
        page,
        userAgent,
        screenshotUrl: null,
        priority: priority as any,
        status: 'NEW',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    console.log(`✅ Feedback created: ${feedback.id}\n`);

    // Test 2: Send admin notification email
    console.log('📧 Sending admin notification email...');

    const subject = `⚠️ HIGH PRIORITY New Feedback: ${category} - ${title}`;

    const emailBody = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>New Feedback Received</title>
  <style>
    body { font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
    .field { margin-bottom: 12px; }
    .label { font-weight: 600; color: #374151; }
    .value { color: #6b7280; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; }
    .badge-high { background-color: #fef3c7; color: #d97706; }
    .badge-bug { background-color: #fef2f2; color: #dc2626; }
  </style>
</head>
<body>
  <div class="header">
    <h2>⚠️ New Feedback Received</h2>
  </div>
  <div class="content">
    <div class="field">
      <div class="label">Feedback ID</div>
      <div class="value"><code>${feedbackId}</code></div>
    </div>
    <div class="field">
      <div class="label">Category</div>
      <div class="value"><span class="badge badge-bug">${category}</span></div>
    </div>
    <div class="field">
      <div class="label">Priority</div>
      <div class="value"><span class="badge badge-high">${priority}</span></div>
    </div>
    <div class="field">
      <div class="label">Title</div>
      <div class="value" style="font-weight: 600; color: #111827;">${title}</div>
    </div>
    <div class="field">
      <div class="label">Description</div>
      <div class="value">${description}</div>
    </div>
    <div class="field">
      <div class="label">Page</div>
      <div class="value"><code>${page}</code></div>
    </div>
    <div class="field">
      <div class="label">User</div>
      <div class="value">Anonymous</div>
    </div>
    <div class="field">
      <div class="label">Submitted At</div>
      <div class="value">${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} KST</div>
    </div>
    <p style="margin-top: 20px;">
      <a href="${emailBaseUrl}/dashboard/admin/feedback?id=${feedbackId}"
         style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px;">
        View in Admin Dashboard
      </a>
    </p>
  </div>
</body>
</html>
    `.trim();

    const emailSent = await sendEmail({
      to: process.env.ADMIN_EMAIL || 'support@connectplt.kr',
      subject,
      html: emailBody,
    });

    if (emailSent) {
      console.log(`✅ Email sent successfully to ${process.env.ADMIN_EMAIL || 'support@connectplt.kr'}`);
      console.log(`   Message should appear in inbox shortly\n`);
    } else {
      console.error('❌ Email sending failed\n');
    }

    // Test 3: Clean up test data
    console.log('🧹 Cleaning up test feedback...');
    await db.feedback.delete({
      where: { id: feedbackId },
    });
    console.log('✅ Test feedback deleted\n');

    console.log('✨ Test completed successfully!');
    console.log('📧 Check inbox at support@connectplt.kr for the test email\n');

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testFeedbackEmail().catch(console.error);
