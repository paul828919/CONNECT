/**
 * Request Account Deletion Verification Code
 *
 * Step 1 of 2-step account deletion process (security measure).
 *
 * Flow:
 * 1. User requests deletion code
 * 2. Generate 6-digit code, store in Redis (15min expiry)
 * 3. Send email with code
 * 4. User enters code in deletion confirmation page
 * 5. Deletion API validates code and deletes account
 *
 * Security:
 * - Rate limit: 1 code per 5 minutes per user
 * - Code expires after 15 minutes
 * - Code is single-use (deleted after successful validation)
 * - All requests logged for audit trail (PIPA Article 31)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { PrismaClient } from '@prisma/client';
import { createClient } from 'redis';
import { sendEmail } from '@/lib/email/utils';
import { createAuditLog, AuditAction } from '@/lib/audit';

const prisma = new PrismaClient();

// Redis client for code storage and rate limiting
let redisClient: ReturnType<typeof createClient> | null = null;

async function getRedisClient() {
  if (!redisClient) {
    redisClient = createClient({
      url: process.env.REDIS_CACHE_URL || 'redis://localhost:6379',
    });
    redisClient.on('error', (err) => console.error('[DELETION] Redis error:', err));
    await redisClient.connect();
  }
  return redisClient;
}

/**
 * POST /api/users/request-deletion-code
 *
 * Generate and send account deletion verification code
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const userEmail = session.user.email;

    // 2. Rate limiting: 1 code per 5 minutes per user
    const redis = await getRedisClient();
    const rateLimitKey = `deletion:ratelimit:${userId}`;
    const existingRateLimit = await redis.get(rateLimitKey);

    if (existingRateLimit) {
      const ttl = await redis.ttl(rateLimitKey);
      const resetTime = new Date(Date.now() + ttl * 1000);

      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Please wait before requesting another code.',
          resetTime: resetTime.toISOString(),
          waitSeconds: ttl,
        },
        { status: 429 }
      );
    }

    // 3. Get user data for email personalization
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        organization: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // 4. Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString(); // 100000-999999

    // 5. Store code in Redis with 15-minute expiration
    const codeKey = `deletion:code:${userId}`;
    await redis.set(codeKey, verificationCode, {
      EX: 15 * 60, // 15 minutes in seconds
    });

    // 6. Set rate limit (5 minutes)
    await redis.set(rateLimitKey, Date.now().toString(), {
      EX: 5 * 60, // 5 minutes in seconds
    });

    // 7. Send email with verification code
    const emailSent = await sendEmail({
      to: userEmail,
      subject: '[Connect] 회원 탈퇴 인증 코드',
      html: generateDeletionCodeEmail({
        userName: user.name || '회원',
        userEmail,
        verificationCode,
        organizationName: user.organization?.name,
      }),
    });

    if (!emailSent) {
      // Email failed but code is already stored
      // User can still use the code if they have it somehow
      console.error('[DELETION] Failed to send email, but code was generated');
    }

    // 8. Create audit log
    await createAuditLog({
      userId,
      action: AuditAction.DELETION_CODE_SENT,
      details: `Deletion verification code sent to ${userEmail}`,
      ipAddress: request.headers.get('x-forwarded-for') || request.ip || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
      requestPath: '/api/users/request-deletion-code',
    });

    // 9. Return success (don't expose code in response)
    return NextResponse.json({
      success: true,
      message: '인증 코드가 이메일로 전송되었습니다.',
      email: userEmail,
      expiresIn: 15 * 60, // seconds
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    });
  } catch (error) {
    console.error('[DELETION] Error generating deletion code:', error instanceof Error ? error.message : error);

    return NextResponse.json(
      {
        error: 'Failed to generate deletion code. Please try again later.',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Generate deletion verification code email (Korean)
 */
function generateDeletionCodeEmail(params: {
  userName: string;
  userEmail: string;
  verificationCode: string;
  organizationName?: string;
}): string {
  const { userName, userEmail, verificationCode, organizationName } = params;

  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Connect 회원 탈퇴 인증</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Malgun Gothic', sans-serif;
      background-color: #f3f4f6;
    }
    .email-container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
      padding: 32px 24px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: bold;
      color: #ffffff;
    }
    .header p {
      margin: 8px 0 0;
      font-size: 14px;
      color: #fecaca;
    }
    .content {
      padding: 32px 24px;
    }
    .code-box {
      background-color: #fef2f2;
      border: 2px solid #dc2626;
      border-radius: 8px;
      padding: 24px;
      text-align: center;
      margin: 24px 0;
    }
    .code {
      font-size: 36px;
      font-weight: bold;
      color: #dc2626;
      letter-spacing: 8px;
      margin: 8px 0;
    }
    .warning-box {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 16px;
      margin: 24px 0;
      border-radius: 4px;
    }
    .footer {
      padding: 24px;
      text-align: center;
      background-color: #f9fafb;
      border-top: 1px solid #e5e7eb;
    }
    .footer p {
      margin: 4px 0;
      font-size: 12px;
      color: #6b7280;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <!-- Header -->
    <div class="header">
      <h1>⚠️ 회원 탈퇴 인증</h1>
      <p>Connect 계정 삭제 확인</p>
    </div>

    <!-- Content -->
    <div class="content">
      <h2 style="font-size: 20px; font-weight: bold; color: #111827; margin: 0 0 16px;">
        안녕하세요 ${userName}님,
      </h2>
      <p style="font-size: 16px; color: #374151; line-height: 1.6; margin: 0;">
        ${organizationName ? `<strong>${organizationName}</strong> 계정의 ` : ''}Connect 회원 탈퇴 요청을 받았습니다.
      </p>

      <!-- Verification Code -->
      <div class="code-box">
        <p style="font-size: 14px; color: #991b1b; margin: 0 0 12px; font-weight: 600;">
          인증 코드 (15분간 유효)
        </p>
        <div class="code">${verificationCode}</div>
        <p style="font-size: 12px; color: #6b7280; margin: 12px 0 0;">
          위 코드를 회원 탈퇴 페이지에 입력해 주세요.
        </p>
      </div>

      <div class="warning-box">
        <p style="font-size: 14px; font-weight: 600; color: #92400e; margin: 0 0 8px;">
          ⚠️ 중요: 계정 삭제는 되돌릴 수 없습니다
        </p>
        <ul style="font-size: 14px; color: #92400e; margin: 8px 0 0; padding-left: 20px; line-height: 1.6;">
          <li>개인정보, 조직 정보, 매칭 결과가 모두 삭제됩니다</li>
          <li>참여 중인 컨소시엄에서 자동으로 탈퇴됩니다</li>
          <li>진행 중인 구독이 즉시 취소됩니다</li>
          <li>삭제된 데이터는 복구할 수 없습니다</li>
          <li>동일한 이메일로 재가입이 불가능합니다</li>
        </ul>
      </div>

      <p style="font-size: 14px; color: #4b5563; line-height: 1.6; margin: 24px 0 0;">
        <strong>본인이 요청하지 않은 경우:</strong><br/>
        이 이메일을 무시하고 즉시 비밀번호를 변경하세요. 타인이 귀하의 계정에 접근하려고 시도했을 수 있습니다.
      </p>

      <p style="font-size: 14px; color: #4b5563; line-height: 1.6; margin: 16px 0 0;">
        <strong>인증 코드 유효 기간:</strong> 15분<br/>
        <strong>수신 이메일:</strong> ${userEmail}<br/>
        <strong>발송 시각:</strong> ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} (KST)
      </p>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p><strong>Connect Platform</strong></p>
      <p>Korea's Innovation Ecosystem Matching Platform</p>
      <p style="margin-top: 12px;">
        문의: <a href="mailto:support@connectplt.kr" style="color: #2563eb; text-decoration: none;">support@connectplt.kr</a>
      </p>
      <p style="margin-top: 12px; color: #9ca3af;">
        이 이메일은 회원 탈퇴 요청에 대한 자동 발송 이메일입니다.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Utility: Validate verification code (called by deletion API)
 *
 * @param userId - User ID
 * @param code - 6-digit code entered by user
 * @returns true if code is valid, false otherwise
 *
 * @example
 * const isValid = await validateDeletionCode(userId, '123456');
 * if (isValid) {
 *   // Proceed with account deletion
 * }
 */
export async function validateDeletionCode(
  userId: string,
  code: string
): Promise<boolean> {
  try {
    const redis = await getRedisClient();
    const codeKey = `deletion:code:${userId}`;

    const storedCode = await redis.get(codeKey);

    if (!storedCode) {
      console.log(`[DELETION] No code found for user ${userId} (expired or never generated)`);
      return false;
    }

    const isValid = storedCode === code;

    if (isValid) {
      // Delete code after successful validation (single-use)
      await redis.del(codeKey);
      console.log(`[DELETION] Valid code consumed for user ${userId}`);
    } else {
      console.log(`[DELETION] Invalid code attempt for user ${userId}`);
    }

    return isValid;
  } catch (error) {
    console.error('[DELETION] Error validating code:', error instanceof Error ? error.message : error);
    return false;
  }
}
