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
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-toss-signature');

    // TODO: Verify webhook signature
    // const expectedSignature = crypto
    //   .createHmac('sha256', process.env.TOSS_SECRET_KEY!)
    //   .update(body)
    //   .digest('hex');

    // if (signature !== expectedSignature) {
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    // }

    const event = JSON.parse(body);

    // TODO: Handle different event types
    // switch (event.type) {
    //   case 'payment.success':
    //     // Update subscription status to ACTIVE
    //     break;
    //   case 'payment.failed':
    //     // Mark subscription as PAST_DUE, send notification
    //     break;
    //   case 'subscription.canceled':
    //     // Mark subscription as CANCELED
    //     break;
    //   case 'payment.refunded':
    //     // Log refund, update payment record
    //     break;
    // }

    return NextResponse.json(
      {
        error: 'Not implemented yet',
        endpoint: '/api/webhooks/toss POST',
        event: event.type || 'unknown',
        todo: [
          'Verify webhook signature',
          'Handle payment events',
          'Update database',
          'Send notifications',
        ],
      },
      { status: 501 }
    );
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}