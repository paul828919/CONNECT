/**
 * Recurring Billing Cron Job
 *
 * This script processes automatic subscription renewals.
 * Should be run daily via cron job (at 08:00 UTC / 17:00 KST).
 *
 * Features:
 * - Anniversary billing: Each user billed on their own nextBillingDate
 * - Retry logic: 1 day → 3 days → 7 days after initial failure
 * - Email notifications: Success and failure notifications
 * - Graceful handling: Continues processing even if one payment fails
 *
 * Retry Schedule:
 * - Initial failure: Next retry in 1 day (retryCount: 0 → 1)
 * - 1st retry fails: Next retry in 3 days (retryCount: 1 → 2)
 * - 2nd retry fails: Next retry in 7 days (retryCount: 2 → 3)
 * - 3rd retry fails: Subscription suspended (status: PAST_DUE)
 *
 * Usage:
 * - Development: npx tsx scripts/recurring-billing.ts
 * - Production: Runs inside Docker container via node-cron or system cron
 */

import { db } from '../lib/db';
import { sendEmail } from '../lib/email/utils';
import { generatePaymentConfirmationEmail } from '../lib/email/templates/payment-confirmation';
import { generatePaymentFailedEmail } from '../lib/email/templates/payment-failed';
import { calculateNextBillingDate } from '../lib/billing-date-calculator';
import { PaymentStatus, SubscriptionStatus } from '@prisma/client';

// Plan prices (must match PLAN_PRICES in charge API)
const PLAN_PRICES = {
  PRO: { MONTHLY: 49000, ANNUAL: 490000 },
  TEAM: { MONTHLY: 99000, ANNUAL: 990000 },
};

// Retry intervals in days
const RETRY_INTERVALS = [1, 3, 7]; // After initial, 1st fail, 2nd fail
const MAX_RETRIES = 3;

// Toss API types
interface TossPaymentResponse {
  paymentKey: string;
  orderId: string;
  mId: string;
  currency: string;
  method: string;
  totalAmount: number;
  status: string;
  approvedAt: string;
}

interface TossErrorResponse {
  code: string;
  message: string;
}

/**
 * Process a single subscription billing
 */
async function processSubscriptionBilling(subscription: {
  id: string;
  userId: string;
  plan: 'FREE' | 'PRO' | 'TEAM';
  billingCycle: 'MONTHLY' | 'ANNUAL';
  amount: number;
  tossBillingKey: string | null;
  tossCustomerId: string | null;
  nextBillingDate: Date | null;
  user: {
    id: string;
    email: string | null;
    name: string | null;
    tossCustomerKey: string | null;
    organization: {
      name: string;
    } | null;
  };
  payments: {
    retryCount: number;
  }[];
}): Promise<{
  success: boolean;
  error?: string;
}> {
  const { user } = subscription;

  // Validate required fields
  if (!subscription.tossBillingKey) {
    console.error(`[BILLING] No billingKey for subscription ${subscription.id}`);
    return { success: false, error: 'No billing key found' };
  }

  const customerKey = user.tossCustomerKey || subscription.tossCustomerId;
  if (!customerKey) {
    console.error(`[BILLING] No customerKey for subscription ${subscription.id}`);
    return { success: false, error: 'No customer key found' };
  }

  if (subscription.plan === 'FREE') {
    console.log(`[BILLING] Skipping FREE plan for subscription ${subscription.id}`);
    return { success: true };
  }

  // Get retry count from most recent payment
  const lastPayment = subscription.payments[0];
  const currentRetryCount = lastPayment?.retryCount || 0;

  // Generate order details
  const orderId = `order_${Date.now()}_${subscription.userId.slice(0, 8)}_recurring`;
  const orderName = `Connect ${subscription.plan} 플랜 (${subscription.billingCycle === 'MONTHLY' ? '월간' : '연간'}) - 자동 갱신`;
  const amount = PLAN_PRICES[subscription.plan][subscription.billingCycle];

  // Check test mode
  const isTestMode = process.env.TOSS_TEST_MODE === 'true';

  let paymentKey: string;
  let paymentMethod: string;
  let paymentSuccess = false;
  let failureReason = '';

  if (isTestMode) {
    // Test mode: Simulate success (90% success rate for testing)
    const simulateSuccess = Math.random() > 0.1;

    if (simulateSuccess) {
      paymentKey = `test_recurring_${Date.now()}`;
      paymentMethod = 'TEST';
      paymentSuccess = true;
    } else {
      failureReason = '테스트 모드: 시뮬레이션 결제 실패';
      paymentSuccess = false;
    }
  } else {
    // Production: Call Toss API
    const tossSecretKey = process.env.TOSS_SECRET_KEY;

    if (!tossSecretKey) {
      console.error('[BILLING] TOSS_SECRET_KEY not configured');
      return { success: false, error: 'Payment configuration error' };
    }

    const authToken = Buffer.from(`${tossSecretKey}:`).toString('base64');

    try {
      const tossResponse = await fetch(
        `https://api.tosspayments.com/v1/billing/${subscription.tossBillingKey}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            customerKey,
            amount,
            orderId,
            orderName,
            taxFreeAmount: 0,
          }),
        }
      );

      if (tossResponse.ok) {
        const paymentData: TossPaymentResponse = await tossResponse.json();
        paymentKey = paymentData.paymentKey;
        paymentMethod = paymentData.method || 'CARD';
        paymentSuccess = true;
      } else {
        const errorData: TossErrorResponse = await tossResponse.json().catch(() => ({
          code: 'UNKNOWN',
          message: '알 수 없는 오류',
        }));

        failureReason = getKoreanErrorMessage(errorData.code, errorData.message);
        paymentSuccess = false;

        console.error('[BILLING] Toss payment failed:', {
          subscriptionId: subscription.id,
          code: errorData.code,
          message: errorData.message,
        });
      }
    } catch (error) {
      console.error('[BILLING] Toss API call failed:', error);
      failureReason = '결제 서버 연결 오류';
      paymentSuccess = false;
    }
  }

  const now = new Date();

  if (paymentSuccess) {
    // Payment successful
    console.log(`[BILLING] Payment successful for subscription ${subscription.id}`);

    // Calculate next billing date
    const { nextBillingDate } = calculateNextBillingDate({
      planType: subscription.billingCycle,
      startDate: now,
    });

    // Calculate new expiration date
    const expiresAt = new Date(now);
    if (subscription.billingCycle === 'MONTHLY') {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    } else {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    }

    // Update subscription
    await db.subscriptions.update({
      where: { id: subscription.id },
      data: {
        status: 'ACTIVE',
        nextBillingDate,
        expiresAt,
        lastPaymentId: paymentKey!,
        updatedAt: now,
      },
    });

    // Create payment record
    await db.payments.create({
      data: {
        subscriptionId: subscription.id,
        amount,
        currency: 'KRW',
        status: 'COMPLETED' as PaymentStatus,
        tossPaymentKey: paymentKey!,
        tossOrderId: orderId,
        tossMethod: paymentMethod!,
        paidAt: now,
        retryCount: 0, // Reset retry count on success
      },
    });

    // Send success email
    if (user.email) {
      try {
        const emailHtml = generatePaymentConfirmationEmail({
          userName: user.name || '고객',
          userEmail: user.email,
          organizationName: user.organization?.name || '미지정',
          plan: subscription.plan as 'PRO' | 'TEAM',
          billingCycle: subscription.billingCycle,
          amount,
          paymentDate: now,
          nextBillingDate,
        });

        await sendEmail({
          to: user.email,
          subject: 'Connect 자동 결제가 완료되었습니다 ✅',
          html: emailHtml,
        });
      } catch (emailError) {
        console.error('[BILLING] Failed to send success email:', emailError);
      }
    }

    return { success: true };
  } else {
    // Payment failed
    console.log(
      `[BILLING] Payment failed for subscription ${subscription.id}: ${failureReason}`
    );

    const newRetryCount = currentRetryCount + 1;
    const isMaxRetries = newRetryCount >= MAX_RETRIES;

    // Calculate next retry date
    let nextRetryDate: Date | undefined;
    if (!isMaxRetries) {
      nextRetryDate = new Date(now);
      nextRetryDate.setDate(nextRetryDate.getDate() + RETRY_INTERVALS[newRetryCount - 1]);
    }

    // Update subscription status
    await db.subscriptions.update({
      where: { id: subscription.id },
      data: {
        status: isMaxRetries ? ('PAST_DUE' as SubscriptionStatus) : ('ACTIVE' as SubscriptionStatus),
        nextBillingDate: nextRetryDate || subscription.nextBillingDate,
        updatedAt: now,
      },
    });

    // Create failed payment record
    await db.payments.create({
      data: {
        subscriptionId: subscription.id,
        amount,
        currency: 'KRW',
        status: 'FAILED' as PaymentStatus,
        tossOrderId: orderId,
        failedAt: now,
        failureReason,
        retryCount: newRetryCount,
      },
    });

    // Send failure email
    if (user.email) {
      try {
        const emailHtml = generatePaymentFailedEmail({
          userName: user.name || '고객',
          userEmail: user.email,
          organizationName: user.organization?.name || '미지정',
          plan: subscription.plan as 'PRO' | 'TEAM',
          amount,
          failureReason,
          retryCount: newRetryCount,
          nextRetryDate,
        });

        await sendEmail({
          to: user.email,
          subject: `⚠️ Connect 결제 실패 안내 (${newRetryCount}/${MAX_RETRIES}차 시도)`,
          html: emailHtml,
        });
      } catch (emailError) {
        console.error('[BILLING] Failed to send failure email:', emailError);
      }
    }

    return { success: false, error: failureReason };
  }
}

/**
 * Convert Toss error code to Korean message
 */
function getKoreanErrorMessage(code: string, defaultMessage: string): string {
  const errorMessages: Record<string, string> = {
    INVALID_CARD_EXPIRATION: '카드 유효기간이 만료되었습니다',
    EXCEED_MAX_CARD_INSTALLMENT_PLAN: '할부 한도 초과',
    NOT_ALLOWED_POINT_USE: '포인트 사용 불가',
    INVALID_STOPPED_CARD: '정지된 카드입니다',
    EXCEED_MAX_DAILY_PAYMENT_COUNT: '일일 결제 횟수 초과',
    NOT_SUPPORTED_INSTALLMENT_PLAN_CARD_OR_MERCHANT: '할부 불가 카드',
    INVALID_CARD_LOST_OR_STOLEN: '분실/도난 신고된 카드입니다',
    RESTRICTED_TRANSFER_ACCOUNT: '이체 제한 계좌',
    INSUFFICIENT_BALANCE: '잔액이 부족합니다',
    INVALID_ACCOUNT_NUMBER: '계좌번호 오류',
    NOT_AVAILABLE_PAYMENT: '결제 불가',
    FAILED_PAYMENT_INTERNAL_SYSTEM_PROCESSING: '결제 처리 중 오류',
    FAILED_INTERNAL_SYSTEM_PROCESSING: '내부 시스템 오류',
    NOT_FOUND_BILLING_KEY: '빌링키를 찾을 수 없습니다',
  };

  return errorMessages[code] || defaultMessage || '알 수 없는 오류';
}

/**
 * Main function: Process all due subscriptions
 */
async function processRecurringBillings(): Promise<void> {
  console.log('='.repeat(60));
  console.log('[BILLING] Starting recurring billing job at', new Date().toISOString());
  console.log('='.repeat(60));

  const now = new Date();

  try {
    // Find all subscriptions due for billing
    // This includes:
    // 1. Active subscriptions where nextBillingDate <= now
    // 2. PAST_DUE subscriptions that haven't exceeded max retries
    const dueSubscriptions = await db.subscriptions.findMany({
      where: {
        OR: [
          {
            status: 'ACTIVE',
            nextBillingDate: {
              lte: now,
            },
            plan: {
              in: ['PRO', 'TEAM'],
            },
          },
          {
            status: 'PAST_DUE',
            nextBillingDate: {
              lte: now,
            },
            plan: {
              in: ['PRO', 'TEAM'],
            },
          },
        ],
        tossBillingKey: {
          not: null,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            tossCustomerKey: true,
            organization: {
              select: {
                name: true,
              },
            },
          },
        },
        payments: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
          select: {
            retryCount: true,
          },
        },
      },
    });

    console.log(`[BILLING] Found ${dueSubscriptions.length} subscriptions due for billing`);

    if (dueSubscriptions.length === 0) {
      console.log('[BILLING] No subscriptions to process. Exiting.');
      return;
    }

    // Process each subscription
    let successCount = 0;
    let failureCount = 0;

    for (const subscription of dueSubscriptions) {
      console.log('-'.repeat(40));
      console.log(
        `[BILLING] Processing subscription ${subscription.id} (${subscription.plan}, ${subscription.billingCycle})`
      );
      console.log(`[BILLING] User: ${subscription.user.email}`);

      // Check if already exceeded max retries
      const lastPayment = subscription.payments[0];
      if (lastPayment && lastPayment.retryCount >= MAX_RETRIES) {
        console.log(`[BILLING] Subscription ${subscription.id} has exceeded max retries. Skipping.`);
        continue;
      }

      const result = await processSubscriptionBilling(subscription as any);

      if (result.success) {
        successCount++;
      } else {
        failureCount++;
        console.log(`[BILLING] Error: ${result.error}`);
      }

      // Small delay between payments to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // ========== Process Scheduled Downgrades (Team → Pro) ==========
    console.log('-'.repeat(60));
    console.log('[BILLING] Checking for scheduled downgrades (Team → Pro)...');

    // Find CANCELED subscriptions with DOWNGRADE:PRO that have expired
    const scheduledDowngrades = await db.subscriptions.findMany({
      where: {
        status: 'CANCELED',
        cancellationReason: 'DOWNGRADE:PRO',
        expiresAt: {
          lte: now,
        },
        tossBillingKey: {
          not: null,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            tossCustomerKey: true,
            organization: {
              select: {
                name: true,
              },
            },
          },
        },
        payments: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
          select: {
            retryCount: true,
          },
        },
      },
    });

    console.log(`[BILLING] Found ${scheduledDowngrades.length} scheduled downgrades to process`);

    for (const subscription of scheduledDowngrades) {
      console.log('-'.repeat(40));
      console.log(`[BILLING] Processing downgrade for subscription ${subscription.id}`);
      console.log(`[BILLING] User: ${subscription.user.email} (Team → Pro)`);

      // Update subscription to PRO before processing billing
      await db.subscriptions.update({
        where: { id: subscription.id },
        data: {
          plan: 'PRO',
          status: 'ACTIVE',
          amount: PLAN_PRICES.PRO[subscription.billingCycle],
          canceledAt: null,
          cancellationReason: null,
          updatedAt: now,
        },
      });

      // Process billing with updated plan
      const updatedSubscription = {
        ...subscription,
        plan: 'PRO' as const,
        status: 'ACTIVE' as const,
        amount: PLAN_PRICES.PRO[subscription.billingCycle],
      };

      const result = await processSubscriptionBilling(updatedSubscription as any);

      if (result.success) {
        successCount++;
        console.log(`[BILLING] Downgrade billing successful for ${subscription.id}`);
      } else {
        failureCount++;
        console.log(`[BILLING] Downgrade billing failed: ${result.error}`);
        // Revert plan if billing failed
        await db.subscriptions.update({
          where: { id: subscription.id },
          data: {
            plan: 'TEAM',
            status: 'CANCELED',
            amount: PLAN_PRICES.TEAM[subscription.billingCycle],
            cancellationReason: 'DOWNGRADE:PRO',
            updatedAt: now,
          },
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    console.log('='.repeat(60));
    console.log(`[BILLING] Job completed at ${new Date().toISOString()}`);
    console.log(`[BILLING] Results: ${successCount} successful, ${failureCount} failed`);
    console.log('='.repeat(60));
  } catch (error) {
    console.error('[BILLING] Fatal error in recurring billing job:', error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  processRecurringBillings()
    .then(() => {
      console.log('[BILLING] Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[BILLING] Script failed:', error);
      process.exit(1);
    });
}

export { processRecurringBillings, processSubscriptionBilling };
