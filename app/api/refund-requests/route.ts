/**
 * Refund Requests API
 * POST /api/refund-requests - Create a new refund request
 *
 * v3.1 Features:
 * - Automatic statutory vs contractual mode detection
 * - SERVICE_ISSUE defaults to contractual (CS can override)
 * - Consumer user detection based on organization type
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { calculateRefund } from '@/lib/refund-calculator';
import { db } from '@/lib/db';
import { authOptions } from '@/lib/auth.config';
import { differenceInDays } from 'date-fns';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subscriptionId, reasonCategory, reasonText } = await request.json();

    if (!reasonCategory) {
      return NextResponse.json(
        { error: 'reasonCategory is required' },
        { status: 400 }
      );
    }

    // Validate subscription belongs to user
    const subscription = await db.subscriptions.findFirst({
      where: {
        id: subscriptionId,
        userId: (session.user as any).id,
      },
      include: {
        user: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    if (subscription.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Can only request refund for active subscriptions' },
        { status: 400 }
      );
    }

    // ========== v3.1 ENHANCED: Statutory vs Contractual Mode Detection ==========

    const daysSincePayment = differenceInDays(new Date(), subscription.startedAt);
    const isConsumerUser = !subscription.user.organization ||
      subscription.user.organization.type !== 'COMPANY';

    // Determine if this is a statutory (법정) or contractual (임의) refund
    let isStatutory: boolean;

    if (
      isConsumerUser &&
      daysSincePayment <= 7 &&
      reasonCategory === 'CHANGE_OF_MIND'
    ) {
      // Statutory cooling-off period (전자상거래법 Article 17)
      isStatutory = true;
    } else if (
      reasonCategory === 'BILLING_ERROR' ||
      reasonCategory === 'DUPLICATE_PAYMENT' ||
      reasonCategory === 'CONTRACT_MISMATCH'
    ) {
      // Connect's fault → statutory treatment (no penalty)
      isStatutory = true;
    } else {
      // v3.1 NEW: SERVICE_ISSUE defaults to contractual
      // CS can override to statutory if merchant fault is clear
      // (via admin panel updating isStatutory + actualRefundAmount fields)
      isStatutory = false;
    }

    // Calculate refund amount
    const refundCalculation = calculateRefund({
      totalPaid: subscription.amount,
      startDate: subscription.startedAt,
      requestDate: new Date(),
      contractEndDate: subscription.expiresAt,
      isAnnualPlan: subscription.billingCycle === 'ANNUAL',
      mode: isStatutory ? 'statutory' : 'contractual',
    });

    // ========== Create RefundRequest with v3.1 fields ==========

    const refundRequest = await db.refundRequest.create({
      data: {
        userId: (session.user as any).id,
        organizationId: subscription.user.organizationId,
        subscriptionId,
        plan: subscription.plan,
        billingCycle: subscription.billingCycle,
        amountPaid: subscription.amount, // in KRW (won)
        purchaseDate: subscription.startedAt,
        contractEndDate: subscription.expiresAt,
        usedDays: refundCalculation.usedDays,
        refundAmount: refundCalculation.refundAmount, // in KRW (won)
        penalty: refundCalculation.penalty, // in KRW (won)
        reasonCategory, // v3.1 NEW
        calculationJson: refundCalculation, // v3.1 NEW
        isStatutory,
        reason: reasonText || reasonCategory,
        status: 'PENDING',
      },
    });

    return NextResponse.json({
      success: true,
      refundRequest: {
        id: refundRequest.id,
        estimatedAmount: refundCalculation.refundAmount,
        calculationMode: isStatutory ? 'statutory' : 'contractual',
      },
    });
  } catch (error) {
    console.error('Refund request error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
