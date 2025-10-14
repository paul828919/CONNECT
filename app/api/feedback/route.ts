/**
 * Feedback API Endpoint
 *
 * POST /api/feedback
 * - Accepts user feedback (bugs, feature requests, complaints, etc.)
 * - Sends email notification to admin
 * - PIPA-compliant (user data optional, anonymous feedback allowed)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { sendEmail } from '@/lib/email/utils';
import { emailConfig, emailBaseUrl } from '@/lib/email/config';
import { nanoid } from 'nanoid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface FeedbackRequestBody {
  category: 'BUG' | 'FEATURE_REQUEST' | 'POSITIVE' | 'COMPLAINT' | 'QUESTION';
  title: string;
  description: string;
  page?: string;
  screenshotUrl?: string;
}

/**
 * POST /api/feedback
 *
 * Submit feedback
 */
export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const body: FeedbackRequestBody = await req.json();

    // Validate required fields
    if (!body.category || !body.title || !body.description) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: category, title, description',
        },
        { status: 400 }
      );
    }

    // Validate category
    const validCategories = ['BUG', 'FEATURE_REQUEST', 'POSITIVE', 'COMPLAINT', 'QUESTION'];
    if (!validCategories.includes(body.category)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid category. Must be one of: ${validCategories.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Validate lengths
    if (body.title.length < 5 || body.title.length > 200) {
      return NextResponse.json(
        {
          success: false,
          error: 'Title must be between 5 and 200 characters',
        },
        { status: 400 }
      );
    }

    if (body.description.length < 10 || body.description.length > 5000) {
      return NextResponse.json(
        {
          success: false,
          error: 'Description must be between 10 and 5000 characters',
        },
        { status: 400 }
      );
    }

    // Get authenticated user (optional, allows anonymous feedback)
    const session = await getServerSession();
    const userId = session?.user?.id || null;

    // Get user agent
    const userAgent = req.headers.get('user-agent') || 'Unknown';

    // Determine priority based on category
    let priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM';
    if (body.category === 'BUG') {
      // Check if bug description contains critical keywords
      const criticalKeywords = [
        '서비스 중단',
        'service down',
        '접속 불가',
        'cannot access',
        '데이터 손실',
        'data loss',
        '보안',
        'security',
        '개인정보',
        'personal data',
      ];
      const isCritical = criticalKeywords.some((keyword) =>
        body.description.toLowerCase().includes(keyword.toLowerCase())
      );

      if (isCritical) {
        priority = 'CRITICAL';
      } else if (body.description.includes('오류') || body.description.includes('error')) {
        priority = 'HIGH';
      }
    } else if (body.category === 'COMPLAINT') {
      priority = 'HIGH';
    } else if (body.category === 'POSITIVE') {
      priority = 'LOW';
    }

    // Get organization ID if user is logged in
    let organizationId: string | null = null;
    if (userId) {
      const user = await db.users.findUnique({
        where: { id: userId },
        select: { organizationId: true, name: true, email: true },
      });
      organizationId = user?.organizationId || null;
    }

    // Create feedback record
    const feedback = await db.feedback.create({
      data: {
        id: nanoid(),
        userId,
        organizationId,
        category: body.category,
        title: body.title,
        description: body.description,
        page: body.page || null,
        userAgent,
        screenshotUrl: body.screenshotUrl || null,
        priority,
        status: 'NEW',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Send email notification to admin
    await sendAdminNotificationEmail({
      feedbackId: feedback.id,
      category: feedback.category,
      priority: feedback.priority,
      title: feedback.title,
      description: feedback.description,
      page: feedback.page,
      userId,
      userAgent,
      screenshotUrl: feedback.screenshotUrl,
    });

    return NextResponse.json(
      {
        success: true,
        feedback: {
          id: feedback.id,
          category: feedback.category,
          priority: feedback.priority,
          status: feedback.status,
          createdAt: feedback.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating feedback:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create feedback',
      },
      { status: 500 }
    );
  }
}

/**
 * Send email notification to admin when new feedback is received
 */
async function sendAdminNotificationEmail(params: {
  feedbackId: string;
  category: string;
  priority: string;
  title: string;
  description: string;
  page: string | null;
  userId: string | null;
  userAgent: string;
  screenshotUrl: string | null;
}) {
  const {
    feedbackId,
    category,
    priority,
    title,
    description,
    page,
    userId,
    userAgent,
    screenshotUrl,
  } = params;

  // Get user details if available
  let userName = 'Anonymous';
  let userEmail = 'N/A';
  let organizationName = 'N/A';

  if (userId) {
    const user = await db.users.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        organizations: {
          select: { name: true },
        },
      },
    });

    if (user) {
      userName = user.name || 'Unknown';
      userEmail = user.email || 'N/A';
      organizationName = user.organizations?.name || 'N/A';
    }
  }

  // Determine email subject based on priority
  let subjectPrefix = '📝';
  if (priority === 'CRITICAL') {
    subjectPrefix = '🚨 CRITICAL';
  } else if (priority === 'HIGH') {
    subjectPrefix = '⚠️ HIGH PRIORITY';
  }

  const subject = `${subjectPrefix} New Feedback: ${category} - ${title}`;

  // Compose email body
  const emailBody = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Feedback Received</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 20px; background-color: #f3f4f6; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header { padding: 24px; background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); color: #ffffff; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 24px; }
    .field { margin-bottom: 16px; }
    .field-label { font-weight: 600; color: #374151; margin-bottom: 4px; }
    .field-value { color: #6b7280; line-height: 1.6; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
    .badge-critical { background-color: #fef2f2; color: #dc2626; }
    .badge-high { background-color: #fef3c7; color: #d97706; }
    .badge-medium { background-color: #dbeafe; color: #2563eb; }
    .badge-low { background-color: #f0fdf4; color: #16a34a; }
    .badge-bug { background-color: #fef2f2; color: #dc2626; }
    .badge-feature { background-color: #eff6ff; color: #2563eb; }
    .badge-positive { background-color: #f0fdf4; color: #16a34a; }
    .badge-complaint { background-color: #fef3c7; color: #d97706; }
    .badge-question { background-color: #f3e8ff; color: #7c3aed; }
    .cta { display: inline-block; margin-top: 16px; padding: 12px 24px; background-color: #2563eb; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600; }
    .footer { padding: 16px 24px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${subjectPrefix} New Feedback Received</h1>
    </div>

    <div class="content">
      <div class="field">
        <div class="field-label">Feedback ID</div>
        <div class="field-value"><code>${feedbackId}</code></div>
      </div>

      <div class="field">
        <div class="field-label">Category</div>
        <div class="field-value">
          <span class="badge badge-${category.toLowerCase()}">${category}</span>
        </div>
      </div>

      <div class="field">
        <div class="field-label">Priority</div>
        <div class="field-value">
          <span class="badge badge-${priority.toLowerCase()}">${priority}</span>
        </div>
      </div>

      <div class="field">
        <div class="field-label">Title</div>
        <div class="field-value" style="font-weight: 600; color: #111827;">${title}</div>
      </div>

      <div class="field">
        <div class="field-label">Description</div>
        <div class="field-value" style="white-space: pre-wrap;">${description}</div>
      </div>

      ${page ? `
      <div class="field">
        <div class="field-label">Page</div>
        <div class="field-value"><code>${page}</code></div>
      </div>
      ` : ''}

      ${screenshotUrl ? `
      <div class="field">
        <div class="field-label">Screenshot</div>
        <div class="field-value">
          <a href="${screenshotUrl}" style="color: #2563eb; text-decoration: none;">View Screenshot</a>
        </div>
      </div>
      ` : ''}

      <div class="field">
        <div class="field-label">User</div>
        <div class="field-value">
          <strong>${userName}</strong><br/>
          Email: ${userEmail}<br/>
          Organization: ${organizationName}
        </div>
      </div>

      <div class="field">
        <div class="field-label">User Agent</div>
        <div class="field-value"><code style="font-size: 11px;">${userAgent}</code></div>
      </div>

      <div class="field">
        <div class="field-label">Submitted At</div>
        <div class="field-value">${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} KST</div>
      </div>

      <a href="${emailBaseUrl}/dashboard/admin/feedback?id=${feedbackId}" class="cta">
        View in Admin Dashboard
      </a>
    </div>

    <div class="footer">
      <p>Connect Platform - Feedback Notification</p>
      <p>This email was sent automatically. Do not reply.</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  // Send email to admin
  try {
    await sendEmail({
      to: process.env.ADMIN_EMAIL || 'support@connect.kr',
      subject,
      html: emailBody,
    });
  } catch (error) {
    console.error('Failed to send admin notification email:', error);
    // Don't throw error - feedback is already saved
  }
}
