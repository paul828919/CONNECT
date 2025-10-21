/**
 * Checkout Success API (Test Mode)
 *
 * Processes successful test payments and creates subscription records
 *
 * POST /api/payments/checkout/success
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import { PrismaClient, SubscriptionPlan, SubscriptionStatus, BillingCycle, PaymentStatus } from '@prisma/client';

// Direct Prisma Client instantiation (bypasses lib/db module resolution issue)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
};

const db = globalForPrisma.prisma ?? new PrismaClient({
  log: ['error'],
});

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = db;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // 2. Parse request body
    const body = await request.json();
    const { orderId, plan, amount, billingCycle } = body;

    // 3. Validate required fields
    if (!orderId || !plan || !amount || !billingCycle) {
      return NextResponse.json(
        { error: 'Missing required fields: orderId, plan, amount, billingCycle' },
        { status: 400 }
      );
    }

    // 4. Validate plan
    const validPlans: SubscriptionPlan[] = ['PRO', 'TEAM'];
    if (!validPlans.includes(plan as SubscriptionPlan)) {
      return NextResponse.json(
        { error: 'Invalid plan. Must be PRO or TEAM' },
        { status: 400 }
      );
    }

    // 5. Validate billing cycle
    const validCycles: BillingCycle[] = ['MONTHLY', 'ANNUAL'];
    if (!validCycles.includes(billingCycle as BillingCycle)) {
      return NextResponse.json(
        { error: 'Invalid billing cycle. Must be MONTHLY or ANNUAL' },
        { status: 400 }
      );
    }

    // 6. Calculate subscription dates
    const now = new Date();
    const expiresAt = new Date(now);

    if (billingCycle === 'MONTHLY') {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    } else {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    }

    const nextBillingDate = new Date(expiresAt);

    // 7. Check if user already has an active subscription
    const existingSubscription = await db.subscriptions.findUnique({
      where: { userId },
    });

    let subscription;

    if (existingSubscription) {
      // Update existing subscription
      subscription = await db.subscriptions.update({
        where: { userId },
        data: {
          plan: plan as SubscriptionPlan,
          status: 'ACTIVE' as SubscriptionStatus,
          billingCycle: billingCycle as BillingCycle,
          startedAt: now,
          expiresAt,
          nextBillingDate,
          amount: parseInt(amount),
          canceledAt: null,
          cancellationReason: null,
          updatedAt: now,
        },
      });
    } else {
      // Create new subscription
      const subscriptionId = `sub_${Date.now()}_${userId.slice(0, 8)}`;

      subscription = await db.subscriptions.create({
        data: {
          id: subscriptionId,
          userId,
          plan: plan as SubscriptionPlan,
          status: 'ACTIVE' as SubscriptionStatus,
          billingCycle: billingCycle as BillingCycle,
          startedAt: now,
          expiresAt,
          nextBillingDate,
          amount: parseInt(amount),
          currency: 'KRW',
          tossCustomerId: `test_customer_${userId.slice(0, 8)}`,
          createdAt: now,
          updatedAt: now,
        },
      });
    }

    // 8. Create payment record
    const paymentId = `pay_${Date.now()}_${userId.slice(0, 8)}`;

    const payment = await db.payments.create({
      data: {
        id: paymentId,
        subscriptionId: subscription.id,
        amount: parseInt(amount),
        currency: 'KRW',
        status: 'COMPLETED' as PaymentStatus,
        tossPaymentKey: `test_payment_key_${Date.now()}`,
        tossOrderId: orderId,
        tossMethod: 'TEST',
        paidAt: now,
        createdAt: now,
        updatedAt: now,
      },
    });

    // 9. Return success response
    return NextResponse.json(
      {
        success: true,
        message: '구독이 성공적으로 활성화되었습니다.',
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
          amount: payment.amount,
          status: payment.status,
          paidAt: payment.paidAt?.toISOString(),
        },
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Checkout success processing error:', error);

    // Log error details for debugging
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
      });
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: '구독 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      },
      { status: 500 }
    );
  }
  // NOTE: Do NOT call db.$disconnect() in Next.js API routes
  // It breaks connection pooling and causes subsequent requests to fail
}
