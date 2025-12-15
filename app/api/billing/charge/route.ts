/**
 * Billing Charge API
 *
 * POST /api/billing/charge - Charge customer using billingKey
 *
 * This endpoint charges the customer using their stored billingKey.
 * Used for both initial subscription payment and recurring charges.
 *
 * Flow:
 * 1. Client calls with billingKey, customerKey, amount, plan, billingCycle
 * 2. Server calls Toss API to process payment
 * 3. Server creates/updates subscription and payment records
 * 4. Server returns payment confirmation
 *
 * Test Mode (TOSS_TEST_MODE=true):
 * - Creates subscription and payment records without calling Toss API
 * - Useful for local development and UI testing
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import { db } from '@/lib/db';
import {
  SubscriptionPlan,
  SubscriptionStatus,
  BillingCycle,
  PaymentStatus,
} from '@prisma/client';

// Plan prices for validation
const PLAN_PRICES = {
  PRO: { MONTHLY: 49000, ANNUAL: 490000 },
  TEAM: { MONTHLY: 99000, ANNUAL: 990000 },
};

// Toss API response types
interface TossPaymentResponse {
  paymentKey: string;
  orderId: string;
  mId: string;
  currency: string;
  method: string;
  totalAmount: number;
  balanceAmount: number;
  status: string;
  requestedAt: string;
  approvedAt: string;
  card?: {
    issuerCode: string;
    acquirerCode: string;
    number: string;
    installmentPlanMonths: number;
    isInterestFree: boolean;
    interestPayer: string | null;
    approveNo: string;
    useCardPoint: boolean;
    cardType: string;
    ownerType: string;
    acquireStatus: string;
    amount: number;
  };
  receipt?: {
    url: string;
  };
}

interface TossErrorResponse {
  code: string;
  message: string;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', message: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // 2. Parse request body
    const body = await request.json();
    const { billingKey, customerKey, amount, plan, billingCycle } = body;

    // 3. Validate required fields
    if (!billingKey || !customerKey || !amount || !plan || !billingCycle) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          message: 'billingKey, customerKey, amount, plan, billingCycle가 필요합니다.',
        },
        { status: 400 }
      );
    }

    // 4. Validate plan and billing cycle
    const validPlans: SubscriptionPlan[] = ['PRO', 'TEAM'];
    const validCycles: BillingCycle[] = ['MONTHLY', 'ANNUAL'];

    if (!validPlans.includes(plan)) {
      return NextResponse.json(
        { error: 'Invalid plan', message: '유효하지 않은 플랜입니다.' },
        { status: 400 }
      );
    }

    if (!validCycles.includes(billingCycle)) {
      return NextResponse.json(
        { error: 'Invalid billing cycle', message: '유효하지 않은 결제 주기입니다.' },
        { status: 400 }
      );
    }

    // 5. Validate amount matches expected price
    const expectedAmount = PLAN_PRICES[plan as 'PRO' | 'TEAM'][billingCycle as 'MONTHLY' | 'ANNUAL'];
    if (amount !== expectedAmount) {
      console.error('[BILLING] Amount mismatch:', { amount, expectedAmount });
      return NextResponse.json(
        { error: 'Invalid amount', message: '결제 금액이 올바르지 않습니다.' },
        { status: 400 }
      );
    }

    // 6. Generate unique order ID
    const orderId = `order_${Date.now()}_${userId.slice(0, 8)}`;
    const orderName = `Connect ${plan} 플랜 (${billingCycle === 'MONTHLY' ? '월간' : '연간'})`;

    // 7. Check if in test mode
    const isTestMode = process.env.TOSS_TEST_MODE === 'true';
    const now = new Date();

    let paymentKey: string;
    let paymentMethod: string;
    let receiptUrl: string | undefined;

    if (isTestMode) {
      // Test mode: Skip Toss API call
      paymentKey = `test_payment_${Date.now()}`;
      paymentMethod = 'TEST';
      receiptUrl = undefined;
    } else {
      // Production mode: Call Toss Payments API
      const tossSecretKey = process.env.TOSS_SECRET_KEY;

      if (!tossSecretKey) {
        console.error('[BILLING] TOSS_SECRET_KEY not configured');
        return NextResponse.json(
          { error: 'Payment configuration error', message: '결제 설정이 완료되지 않았습니다.' },
          { status: 500 }
        );
      }

      // Toss API requires Base64 encoded "secretKey:" for Basic Auth
      const authToken = Buffer.from(`${tossSecretKey}:`).toString('base64');

      const tossResponse = await fetch(
        `https://api.tosspayments.com/v1/billing/${billingKey}`,
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
            taxFreeAmount: 0, // No tax-free amount
          }),
        }
      );

      if (!tossResponse.ok) {
        const errorData: TossErrorResponse = await tossResponse.json().catch(() => ({
          code: 'UNKNOWN',
          message: '알 수 없는 오류가 발생했습니다.',
        }));

        console.error('[BILLING] Toss payment error:', {
          status: tossResponse.status,
          code: errorData.code,
          message: errorData.message,
        });

        return NextResponse.json(
          {
            error: errorData.code,
            message: errorData.message || '결제 처리에 실패했습니다.',
          },
          { status: tossResponse.status }
        );
      }

      const paymentData: TossPaymentResponse = await tossResponse.json();
      paymentKey = paymentData.paymentKey;
      paymentMethod = paymentData.method || 'CARD';
      receiptUrl = paymentData.receipt?.url;
    }

    // 8. Calculate subscription dates
    const expiresAt = new Date(now);
    if (billingCycle === 'MONTHLY') {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    } else {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    }
    const nextBillingDate = new Date(expiresAt);

    // 9. Create or update subscription
    const existingSubscription = await db.subscriptions.findUnique({
      where: { userId },
    });

    let subscription;

    if (existingSubscription) {
      subscription = await db.subscriptions.update({
        where: { userId },
        data: {
          plan: plan as SubscriptionPlan,
          status: 'ACTIVE' as SubscriptionStatus,
          billingCycle: billingCycle as BillingCycle,
          startedAt: now,
          expiresAt,
          nextBillingDate,
          amount,
          tossBillingKey: billingKey,
          tossCustomerId: customerKey,
          lastPaymentId: paymentKey,
          canceledAt: null,
          cancellationReason: null,
          updatedAt: now,
        },
      });
    } else {
      subscription = await db.subscriptions.create({
        data: {
          userId,
          plan: plan as SubscriptionPlan,
          status: 'ACTIVE' as SubscriptionStatus,
          billingCycle: billingCycle as BillingCycle,
          startedAt: now,
          expiresAt,
          nextBillingDate,
          amount,
          currency: 'KRW',
          tossBillingKey: billingKey,
          tossCustomerId: customerKey,
          lastPaymentId: paymentKey,
        },
      });
    }

    // 10. Create payment record
    const payment = await db.payments.create({
      data: {
        subscriptionId: subscription.id,
        amount,
        currency: 'KRW',
        status: 'COMPLETED' as PaymentStatus,
        tossPaymentKey: paymentKey,
        tossOrderId: orderId,
        tossMethod: paymentMethod,
        paidAt: now,
      },
    });

    // 11. Return success response
    return NextResponse.json({
      success: true,
      mode: isTestMode ? 'TEST' : 'PRODUCTION',
      subscription: {
        id: subscription.id,
        plan: subscription.plan,
        status: subscription.status,
        billingCycle: subscription.billingCycle,
        startedAt: subscription.startedAt.toISOString(),
        expiresAt: subscription.expiresAt.toISOString(),
        nextBillingDate: subscription.nextBillingDate?.toISOString(),
        amount: subscription.amount,
      },
      payment: {
        id: payment.id,
        orderId: payment.tossOrderId,
        paymentKey: payment.tossPaymentKey,
        amount: payment.amount,
        status: payment.status,
        paidAt: payment.paidAt?.toISOString(),
        receiptUrl,
      },
      message: isTestMode
        ? '테스트 모드: 구독이 성공적으로 활성화되었습니다.'
        : '구독이 성공적으로 활성화되었습니다.',
    });
  } catch (error) {
    console.error('[BILLING] Charge error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: '결제 처리 중 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
}
