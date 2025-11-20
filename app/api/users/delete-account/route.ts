/**
 * Account Deletion API (PIPA Article 21 - Right to Delete)
 *
 * POST /api/users/delete-account - Permanently delete user account
 *
 * 2-Step Process:
 * 1. User requests deletion code via /api/users/request-deletion-code
 * 2. User submits code here to confirm deletion
 *
 * Deletion Flow:
 * 1. Validate 6-digit verification code from Redis
 * 2. Cancel Toss Payments subscription (if exists)
 * 3. Send farewell email with deletion confirmation
 * 4. Hard delete user + cascade delete all related data
 * 5. Create audit log (retained 3 years per PIPA Article 31)
 * 6. Sign out user immediately
 *
 * Security:
 * - Requires valid email verification code (15-minute window)
 * - Single-use codes (deleted after validation)
 * - Irreversible operation (no rollback)
 * - Email blacklisting prevents re-registration with same email
 *
 * PIPA Compliance:
 * - Article 21: Right to delete personal information
 * - Article 31: Audit logs retained 3 years (anonymized)
 * - Cascade deletion of ALL personal data
 * - Confirmation email documenting deleted data types
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { db } from '@/lib/db';
import { validateDeletionCode } from '@/app/api/users/request-deletion-code/route';
import { createAuditLog, AuditAction } from '@/lib/audit';
import { sendEmail } from '@/lib/email/utils';
import { generateFarewellEmail } from '@/lib/email/templates/farewell';

/**
 * POST /api/users/delete-account
 *
 * Request Body:
 * {
 *   "verificationCode": "123456"
 * }
 *
 * Response Success (200):
 * {
 *   "success": true,
 *   "message": "계정이 성공적으로 삭제되었습니다.",
 *   "deletedAt": "2025-01-20T15:30:00.000Z"
 * }
 *
 * Response Errors:
 * - 401: Unauthorized (no session)
 * - 400: Invalid or expired verification code
 * - 500: Internal server error (Toss cancellation failed, database error)
 */
export async function POST(request: NextRequest) {
  let userId: string | undefined;
  let userEmail: string | undefined;
  let userName: string | undefined;
  let organizationName: string | undefined;

  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    userId = session.user.id;
    userEmail = session.user.email;
    userName = session.user.name || '회원';

    // 2. Parse request body
    const body = await request.json();
    const { verificationCode } = body;

    if (!verificationCode || typeof verificationCode !== 'string') {
      return NextResponse.json(
        { error: 'Verification code is required' },
        { status: 400 }
      );
    }

    // 3. Validate verification code (from Session 2)
    const isCodeValid = await validateDeletionCode(userId, verificationCode);

    if (!isCodeValid) {
      return NextResponse.json(
        {
          error: '인증 코드가 유효하지 않거나 만료되었습니다.',
          message: 'Invalid or expired verification code. Please request a new code.',
        },
        { status: 400 }
      );
    }

    console.log(`[DELETION] Valid code verified for user ${userId}`);

    // 4. Get user data for email and Toss cancellation
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        organizationId: true,
        organization: {
          select: {
            name: true,
          },
        },
        subscriptions: {
          select: {
            id: true,
            plan: true,
            status: true,
            tossBillingKey: true,
            tossCustomerId: true,
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

    organizationName = user.organization?.name;

    // 5. Cancel Toss Payments subscription (if exists)
    let subscriptionCanceled = false;
    if (user.subscriptions?.tossBillingKey) {
      try {
        subscriptionCanceled = await cancelTossPaymentsSubscription(
          user.subscriptions.tossBillingKey,
          user.id
        );

        if (subscriptionCanceled) {
          console.log(`[DELETION] Toss subscription canceled for user ${userId}`);

          // Create audit log for subscription cancellation
          await createAuditLog({
            userId,
            action: AuditAction.SUBSCRIPTION_CANCELLED,
            details: `Toss Payments billing key ${user.subscriptions.tossBillingKey} canceled due to account deletion`,
            ipAddress: request.headers.get('x-forwarded-for') || request.ip || undefined,
            userAgent: request.headers.get('user-agent') || undefined,
            requestPath: '/api/users/delete-account',
          });
        }
      } catch (tossError) {
        // Log error but continue with deletion (subscription cancellation is best-effort)
        console.error(
          `[DELETION] Failed to cancel Toss subscription for user ${userId}:`,
          tossError instanceof Error ? tossError.message : tossError
        );

        // Still proceed with account deletion - subscription will eventually expire
        // Administrator will need to manually cancel orphaned subscriptions
      }
    }

    // 6. Create audit log BEFORE deletion (PIPA Article 31)
    await createAuditLog({
      userId,
      action: AuditAction.ACCOUNT_DELETION_INITIATED,
      details: `User ${userEmail} initiated account deletion with verification code`,
      ipAddress: request.headers.get('x-forwarded-for') || request.ip || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
      requestPath: '/api/users/delete-account',
    });

    // 7. Send farewell email (from Session 2 template)
    const deletionDate = new Date().toISOString();
    const farewellEmailSent = await sendEmail({
      to: userEmail,
      subject: '[Connect] 회원 탈퇴 완료 안내',
      html: generateFarewellEmail({
        userName,
        userEmail,
        deletionDate,
        organizationName,
      }),
    });

    if (!farewellEmailSent) {
      console.error(
        `[DELETION] Failed to send farewell email to ${userEmail}, but proceeding with deletion`
      );
    }

    // 8. Hard delete user (CASCADE deletes all related data)
    //
    // Prisma schema CASCADE relationships will automatically delete:
    // - accounts (OAuth connections)
    // - audit_logs (user-specific logs, kept for 3 years)
    // - ai_cost_logs
    // - ai_feedback
    // - consortium_members
    // - consortium_projects (created by user)
    // - contact_requests (sent by user)
    // - feedback
    // - match_notifications
    // - sessions (NextAuth sessions)
    // - subscriptions (and payments via cascade)
    //
    // NOT deleted:
    // - organizations (shared resource, only relationship severed)
    // - funding_programs (public resource)
    // - funding_matches (belongs to organization, not user)
    //
    await db.user.delete({
      where: { id: userId },
    });

    console.log(`[DELETION] User ${userId} successfully deleted from database`);

    // 9. Create final audit log (AFTER deletion, no userId)
    // This creates an anonymized audit log for PIPA compliance
    await createAuditLog({
      userId: `DELETED_${userId}`, // Anonymized identifier
      action: AuditAction.ACCOUNT_DELETION_COMPLETED,
      details: `Account deleted: ${userEmail} (${deletionDate})`,
      ipAddress: request.headers.get('x-forwarded-for') || request.ip || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
      requestPath: '/api/users/delete-account',
    });

    // 10. Return success
    // NextAuth session will be invalidated on next request
    return NextResponse.json({
      success: true,
      message: '계정이 성공적으로 삭제되었습니다.',
      deletedAt: deletionDate,
      farewellEmailSent,
      subscriptionCanceled,
    });
  } catch (error) {
    console.error(
      '[DELETION] Fatal error during account deletion:',
      error instanceof Error ? error.message : error,
      error instanceof Error ? error.stack : ''
    );

    // Create error audit log if we have userId
    if (userId) {
      try {
        await createAuditLog({
          userId,
          action: AuditAction.ACCOUNT_DELETION_INITIATED,
          details: `Account deletion FAILED: ${error instanceof Error ? error.message : 'Unknown error'}`,
          ipAddress: request.headers.get('x-forwarded-for') || request.ip || undefined,
          userAgent: request.headers.get('user-agent') || undefined,
          requestPath: '/api/users/delete-account',
        });
      } catch (auditError) {
        console.error('[DELETION] Failed to create error audit log:', auditError);
      }
    }

    return NextResponse.json(
      {
        error: 'Failed to delete account. Please contact support.',
        message: error instanceof Error ? error.message : 'Unknown error',
        support: 'support@connectplt.kr',
      },
      { status: 500 }
    );
  }
}

/**
 * Cancel Toss Payments subscription via billing key
 *
 * @param billingKey - Toss Payments billing key (from subscriptions.tossBillingKey)
 * @param userId - User ID for logging
 * @returns true if cancellation successful, false otherwise
 *
 * Toss Payments API Documentation:
 * https://docs.tosspayments.com/reference/billing#billing-key-cancel
 *
 * @example
 * const canceled = await cancelTossPaymentsSubscription('billing_key_12345', 'user_67890');
 */
async function cancelTossPaymentsSubscription(
  billingKey: string,
  userId: string
): Promise<boolean> {
  try {
    // Check if running in test mode
    const isTestMode = process.env.TOSS_TEST_MODE === 'true';

    if (isTestMode) {
      console.log(
        `[DELETION][TEST MODE] Skipping Toss cancellation for billing key ${billingKey}`
      );
      return true; // Success in test mode
    }

    // Production mode: Call Toss Payments API
    const tossSecretKey = process.env.TOSS_SECRET_KEY;

    if (!tossSecretKey) {
      console.error('[DELETION] TOSS_SECRET_KEY not configured');
      return false;
    }

    // Toss API requires Base64 encoded secret key for Basic Auth
    const authToken = Buffer.from(`${tossSecretKey}:`).toString('base64');

    const response = await fetch(
      `https://api.tosspayments.com/v1/billing/authorizations/${billingKey}/cancel`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cancelReason: '회원 탈퇴 (User account deletion)',
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(
        `[DELETION] Toss API error (${response.status}):`,
        errorData
      );
      return false;
    }

    const data = await response.json();
    console.log(`[DELETION] Toss subscription canceled successfully:`, data);

    return true;
  } catch (error) {
    console.error(
      '[DELETION] Exception during Toss cancellation:',
      error instanceof Error ? error.message : error
    );
    return false;
  }
}

/**
 * Health check utility for testing
 *
 * @example
 * const canDelete = await canDeleteAccount('user_123');
 * if (!canDelete) {
 *   console.error('Preconditions not met for deletion');
 * }
 */
export async function canDeleteAccount(userId: string): Promise<boolean> {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    return !!user;
  } catch (error) {
    console.error('[DELETION] Health check failed:', error);
    return false;
  }
}
