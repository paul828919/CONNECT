/**
 * Toss Payments Webhook Handler
 *
 * POST /api/webhooks/toss - Receive payment event notifications
 *
 * Events:
 * - payment.success: Payment completed
 * - payment.failed: Payment failed
 * - subscription.canceled: User canceled subscription
 * - payment.refunded: Refund issued
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-toss-signature');
    const isTestMode = process.env.TOSS_TEST_MODE === 'true';

    // Verify webhook signature (skip in test mode)
    if (!isTestMode) {
      const tossSecretKey = process.env.TOSS_SECRET_KEY;
      if (!tossSecretKey) {
        return NextResponse.json(
          { error: 'Toss secret key not configured' },
          { status: 500 }
        );
      }

      const expectedSignature = crypto
        .createHmac('sha256', tossSecretKey)
        .update(body)
        .digest('hex');

      if (signature !== expectedSignature) {
        console.error('Invalid webhook signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const event = JSON.parse(body);
    const eventType = event.type || event.eventType || 'unknown';

    // Test mode: Log and return success
    if (isTestMode) {
      console.log('[TEST MODE] Webhook received:', {
        type: eventType,
        orderId: event.orderId,
        amount: event.amount,
        timestamp: new Date().toISOString(),
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
      case 'payment.success':
      case 'PAYMENT_CONFIRMED':
        // TODO: Update subscription status to ACTIVE
        console.log('Payment success:', event.orderId);
        break;

      case 'payment.failed':
      case 'PAYMENT_FAILED':
        // TODO: Mark subscription as PAST_DUE, send notification
        console.log('Payment failed:', event.orderId);
        break;

      case 'subscription.canceled':
      case 'SUBSCRIPTION_CANCELED':
        // TODO: Mark subscription as CANCELED
        console.log('Subscription canceled:', event.orderId);
        break;

      case 'payment.refunded':
      case 'PAYMENT_REFUNDED':
        // TODO: Log refund, update payment record
        console.log('Payment refunded:', event.orderId);
        break;

      default:
        console.warn('Unknown event type:', eventType);
    }

    // TODO: Update database based on event type
    // TODO: Send email notifications to user

    return NextResponse.json({
      success: false,
      error: 'Production mode not implemented yet',
      eventType,
      todo: [
        'Update subscription in database',
        'Send user notifications',
        'Log event for audit',
      ],
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}