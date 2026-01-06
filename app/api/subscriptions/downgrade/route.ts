/**
 * Subscription Downgrade API
 * POST /api/subscriptions/downgrade - Schedule a subscription downgrade
 *
 * Downgrade Policy:
 * - Pro/Team -> Free: Sets status to CANCELED (becomes Free after expiration)
 * - Team -> Pro: Sets status to CANCELED with cancellationReason = "DOWNGRADE:PRO"
 *                (renews as Pro at next billing cycle)
 *
 * Users keep their current plan features until the expiration date.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { authOptions } from '@/lib/auth.config';
import { SubscriptionPlan } from '@prisma/client';

// Plan hierarchy for validation
const PLAN_ORDER: Record<SubscriptionPlan, number> = {
  FREE: 0,
  PRO: 1,
  TEAM: 2,
};

interface DowngradeRequest {
  targetPlan: 'FREE' | 'PRO';
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    if (!userId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 400 });
    }

    // 2. Parse request body
    const body: DowngradeRequest = await request.json();
    const { targetPlan } = body;

    // 3. Validate target plan
    if (!targetPlan || !['FREE', 'PRO'].includes(targetPlan)) {
      return NextResponse.json(
        { error: 'Invalid target plan. Must be FREE or PRO.' },
        { status: 400 }
      );
    }

    // 4. Get current subscription
    const subscription = await db.subscriptions.findUnique({
      where: { userId },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: 'No active subscription found. You are already on the Free plan.' },
        { status: 404 }
      );
    }

    // 5. Validate this is actually a downgrade
    const currentPlanOrder = PLAN_ORDER[subscription.plan];
    const targetPlanOrder = PLAN_ORDER[targetPlan];

    if (targetPlanOrder >= currentPlanOrder) {
      return NextResponse.json(
        { error: 'This is not a downgrade. Please use the upgrade flow instead.' },
        { status: 400 }
      );
    }

    // 6. Check if already canceled/downgraded
    if (subscription.status === 'CANCELED') {
      return NextResponse.json(
        {
          error: 'Subscription is already scheduled for cancellation or downgrade.',
          currentStatus: subscription.status,
          cancellationReason: subscription.cancellationReason,
        },
        { status: 400 }
      );
    }

    // 7. Check if subscription is active
    if (subscription.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: `Cannot downgrade subscription with status: ${subscription.status}` },
        { status: 400 }
      );
    }

    // 8. Determine cancellation reason based on target plan
    let cancellationReason: string;
    let message: string;

    if (targetPlan === 'FREE') {
      cancellationReason = 'DOWNGRADE:FREE';
      message = `구독이 ${subscription.plan}에서 Free로 다운그레이드 예약되었습니다. ${new Date(subscription.expiresAt).toLocaleDateString('ko-KR')}까지 현재 플랜을 이용하실 수 있습니다.`;
    } else if (targetPlan === 'PRO') {
      cancellationReason = 'DOWNGRADE:PRO';
      message = `구독이 Team에서 Pro로 다운그레이드 예약되었습니다. ${new Date(subscription.expiresAt).toLocaleDateString('ko-KR')}까지 Team 기능을 이용하실 수 있으며, 이후 Pro 플랜으로 자동 갱신됩니다.`;
    } else {
      return NextResponse.json(
        { error: 'Invalid downgrade path' },
        { status: 400 }
      );
    }

    // 9. Update subscription to scheduled downgrade
    const updatedSubscription = await db.subscriptions.update({
      where: { id: subscription.id },
      data: {
        status: 'CANCELED',
        canceledAt: new Date(),
        cancellationReason,
      },
    });

    // 10. Return success response
    return NextResponse.json({
      success: true,
      message,
      downgrade: {
        fromPlan: subscription.plan,
        toPlan: targetPlan,
        effectiveDate: subscription.expiresAt.toISOString(),
        currentPlanValidUntil: subscription.expiresAt.toISOString(),
      },
      subscription: {
        id: updatedSubscription.id,
        plan: updatedSubscription.plan,
        status: updatedSubscription.status,
        expiresAt: updatedSubscription.expiresAt.toISOString(),
        cancellationReason: updatedSubscription.cancellationReason,
      },
    });
  } catch (error) {
    console.error('Subscription downgrade error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
