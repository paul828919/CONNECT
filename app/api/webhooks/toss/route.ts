/**
 * Toss Payments Webhook Handler
 *
 * POST /api/webhooks/toss - Receive payment event notifications
 *
 * Events:
 * - PAYMENT_CONFIRMED: Payment completed successfully
 * - PAYMENT_FAILED: Payment failed
 * - PAYMENT_CANCELED: Payment was canceled by user
 * - BILLING_KEY_DELETED: Billing key was deleted
 *
 * Security: Verify webhook signature using TOSS_SECRET_KEY
 *
 * Test Mode (TOSS_TEST_MODE=true):
 * - Skips signature verification
 * - Logs events without database updates
 * - Returns success for all events
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { PaymentStatus, SubscriptionStatus } from '@prisma/client';

// Toss webhook event types
interface TossWebhookEvent {
  eventType: string;
  createdAt: string;
  data: {
    paymentKey?: string;
    orderId?: string;
    status?: string;
    transactionKey?: string;
    requestedAt?: string;
    approvedAt?: string;
    card?: {
      number: string;
      issuerCode: string;
      acquirerCode: string;
    };
    totalAmount?: number;
    balanceAmount?: number;
    method?: string;
    customerKey?: string;
    billingKey?: string;
    cancels?: Array<{
      cancelAmount: number;
      cancelReason: string;
      canceledAt: string;
    }>;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-toss-signature');
    const isTestMode = process.env.TOSS_TEST_MODE === 'true';

    // Verify webhook signature (skip in test mode)
    if (!isTestMode) {
      const tossSecretKey = process.env.TOSS_SECRET_KEY;
      if (!tossSecretKey) {
        console.error('[WEBHOOK] TOSS_SECRET_KEY not configured');
        return NextResponse.json(
          { error: 'Toss secret key not configured' },
          { status: 500 }
        );
      }

      // Toss uses HMAC-SHA256 for webhook signatures
      const expectedSignature = crypto
        .createHmac('sha256', tossSecretKey)
        .update(body)
        .digest('hex');

      if (signature !== expectedSignature) {
        console.error('[WEBHOOK] Invalid webhook signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const event: TossWebhookEvent = JSON.parse(body);
    const eventType = event.eventType || 'unknown';

    console.log('[WEBHOOK] Received event:', {
      type: eventType,
      paymentKey: event.data?.paymentKey,
      orderId: event.data?.orderId,
      timestamp: new Date().toISOString(),
    });

    // Test mode: Log and return success
    if (isTestMode) {
      console.log('[WEBHOOK][TEST MODE] Event logged:', {
        type: eventType,
        orderId: event.data?.orderId,
        amount: event.data?.totalAmount,
      });

      return NextResponse.json({
        success: true,
        mode: 'TEST',
        received: eventType,
        message: 'Test mode: Event logged but not processed',
      });
    }

    // Production mode: Handle events
    switch (eventType) {
      case 'PAYMENT_CONFIRMED':
        await handlePaymentConfirmed(event);
        break;

      case 'PAYMENT_FAILED':
        await handlePaymentFailed(event);
        break;

      case 'PAYMENT_CANCELED':
        await handlePaymentCanceled(event);
        break;

      case 'BILLING_KEY_DELETED':
        await handleBillingKeyDeleted(event);
        break;

      default:
        console.warn('[WEBHOOK] Unknown event type:', eventType);
    }

    return NextResponse.json({
      success: true,
      received: eventType,
    });
  } catch (error) {
    console.error('[WEBHOOK] Error processing webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Handle successful payment confirmation
 */
async function handlePaymentConfirmed(event: TossWebhookEvent) {
  const { paymentKey, orderId, totalAmount } = event.data;

  if (!paymentKey || !orderId) {
    console.error('[WEBHOOK] Missing paymentKey or orderId in PAYMENT_CONFIRMED');
    return;
  }

  try {
    // Find payment by tossPaymentKey
    const payment = await db.payments.findFirst({
      where: { tossPaymentKey: paymentKey },
      include: { subscriptions: true },
    });

    if (!payment) {
      console.warn('[WEBHOOK] Payment not found for paymentKey:', paymentKey);
      return;
    }

    // Update payment status to COMPLETED
    await db.payments.update({
      where: { id: payment.id },
      data: {
        status: 'COMPLETED' as PaymentStatus,
        paidAt: new Date(),
      },
    });

    // Update subscription status to ACTIVE if not already
    if (payment.subscriptions && payment.subscriptions.status !== 'ACTIVE') {
      await db.subscriptions.update({
        where: { id: payment.subscriptions.id },
        data: {
          status: 'ACTIVE' as SubscriptionStatus,
          lastPaymentId: payment.id,
        },
      });
    }

    console.log('[WEBHOOK] Payment confirmed:', {
      paymentId: payment.id,
      orderId,
      amount: totalAmount,
    });

    // TODO: Send email notification to user
    // await sendPaymentConfirmationEmail(payment.subscription?.userId);
  } catch (error) {
    console.error('[WEBHOOK] Error handling PAYMENT_CONFIRMED:', error);
  }
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(event: TossWebhookEvent) {
  const { paymentKey, orderId } = event.data;

  if (!paymentKey) {
    console.error('[WEBHOOK] Missing paymentKey in PAYMENT_FAILED');
    return;
  }

  try {
    // Find payment by tossPaymentKey
    const payment = await db.payments.findFirst({
      where: { tossPaymentKey: paymentKey },
      include: { subscriptions: true },
    });

    if (!payment) {
      console.warn('[WEBHOOK] Payment not found for paymentKey:', paymentKey);
      return;
    }

    // Update payment status to FAILED
    await db.payments.update({
      where: { id: payment.id },
      data: {
        status: 'FAILED' as PaymentStatus,
      },
    });

    // Update subscription status to PAST_DUE
    if (payment.subscriptions) {
      await db.subscriptions.update({
        where: { id: payment.subscriptions.id },
        data: {
          status: 'PAST_DUE' as SubscriptionStatus,
        },
      });
    }

    console.log('[WEBHOOK] Payment failed:', {
      paymentId: payment.id,
      orderId,
    });

    // TODO: Send email notification to user about failed payment
    // await sendPaymentFailedEmail(payment.subscriptions?.userId);
  } catch (error) {
    console.error('[WEBHOOK] Error handling PAYMENT_FAILED:', error);
  }
}

/**
 * Handle payment cancellation (refund)
 */
async function handlePaymentCanceled(event: TossWebhookEvent) {
  const { paymentKey, cancels } = event.data;

  if (!paymentKey) {
    console.error('[WEBHOOK] Missing paymentKey in PAYMENT_CANCELED');
    return;
  }

  try {
    // Find payment by tossPaymentKey
    const payment = await db.payments.findFirst({
      where: { tossPaymentKey: paymentKey },
      include: { subscriptions: true },
    });

    if (!payment) {
      console.warn('[WEBHOOK] Payment not found for paymentKey:', paymentKey);
      return;
    }

    // Get cancellation details
    const cancelInfo = cancels?.[0];
    const cancelAmount = cancelInfo?.cancelAmount || payment.amount;
    const cancelReason = cancelInfo?.cancelReason || 'Webhook cancellation';

    // Update payment status to REFUNDED
    await db.payments.update({
      where: { id: payment.id },
      data: {
        status: 'REFUNDED' as PaymentStatus,
        refundedAt: new Date(),
        failureReason: cancelReason,
      },
    });

    // Update subscription status to CANCELED
    if (payment.subscriptions) {
      await db.subscriptions.update({
        where: { id: payment.subscriptions.id },
        data: {
          status: 'CANCELED' as SubscriptionStatus,
          canceledAt: new Date(),
          cancellationReason: cancelReason,
        },
      });
    }

    console.log('[WEBHOOK] Payment canceled:', {
      paymentId: payment.id,
      cancelAmount,
      cancelReason,
    });

    // TODO: Send email notification to user about refund
    // await sendRefundConfirmationEmail(payment.subscriptions?.userId, cancelAmount);
  } catch (error) {
    console.error('[WEBHOOK] Error handling PAYMENT_CANCELED:', error);
  }
}

/**
 * Handle billing key deletion
 */
async function handleBillingKeyDeleted(event: TossWebhookEvent) {
  const { customerKey, billingKey } = event.data;

  if (!billingKey) {
    console.error('[WEBHOOK] Missing billingKey in BILLING_KEY_DELETED');
    return;
  }

  try {
    // Find subscription by billing key
    const subscription = await db.subscriptions.findFirst({
      where: { tossBillingKey: billingKey },
    });

    if (!subscription) {
      console.warn('[WEBHOOK] Subscription not found for billingKey:', billingKey);
      return;
    }

    // Clear billing key and update status
    await db.subscriptions.update({
      where: { id: subscription.id },
      data: {
        tossBillingKey: null,
        status: 'CANCELED' as SubscriptionStatus,
        canceledAt: new Date(),
        cancellationReason: 'Billing key deleted',
      },
    });

    console.log('[WEBHOOK] Billing key deleted:', {
      subscriptionId: subscription.id,
      customerKey,
    });

    // TODO: Send email notification to user
    // await sendBillingKeyDeletedEmail(subscription.userId);
  } catch (error) {
    console.error('[WEBHOOK] Error handling BILLING_KEY_DELETED:', error);
  }
}
