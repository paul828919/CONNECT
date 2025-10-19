/**
 * Toss Payments Checkout API
 *
 * POST /api/payments/checkout - Initiate payment checkout session
 *
 * Flow:
 * 1. User selects plan (Pro/Team)
 * 2. Create checkout session
 * 3. Redirect to Toss payment widget
 * 4. Toss returns billing key after successful payment
 * 5. Store billing key and create subscription
 *
 * Test Mode (TOSS_TEST_MODE=true):
 * - Simulates checkout without actual API calls
 * - Returns mock checkout URL for local testing
 * - Useful for UI/UX development without payment gateway
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';

const PLAN_PRICES = {
  PRO: { monthly: 490000, yearly: 4900000 },
  TEAM: { monthly: 990000, yearly: 9900000 },
};

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { plan, billingCycle = 'monthly' } = body;

    // Validate plan
    if (!['PRO', 'TEAM'].includes(plan)) {
      return NextResponse.json(
        { error: 'Invalid plan. Must be PRO or TEAM' },
        { status: 400 }
      );
    }

    // Validate billing cycle
    if (!['monthly', 'yearly'].includes(billingCycle)) {
      return NextResponse.json(
        { error: 'Invalid billing cycle. Must be monthly or yearly' },
        { status: 400 }
      );
    }

    // Calculate amount
    const amount = PLAN_PRICES[plan as 'PRO' | 'TEAM'][
      billingCycle as 'monthly' | 'yearly'
    ];

    // Test mode: Return mock response
    if (process.env.TOSS_TEST_MODE === 'true') {
      const mockOrderId = `test_order_${Date.now()}`;
      return NextResponse.json({
        success: true,
        mode: 'TEST',
        orderId: mockOrderId,
        checkoutUrl: `http://localhost:3000/payments/test-checkout?orderId=${mockOrderId}&plan=${plan}&amount=${amount}`,
        amount,
        plan,
        billingCycle,
        message: 'Test mode: No actual payment required',
      });
    }

    // Production mode: Integrate with Toss Payments API
    // TODO: Implement actual Toss Payments API integration
    const tossClientKey = process.env.TOSS_CLIENT_KEY;
    const tossSecretKey = process.env.TOSS_SECRET_KEY;

    if (!tossClientKey || !tossSecretKey) {
      return NextResponse.json(
        { error: 'Toss Payments credentials not configured' },
        { status: 500 }
      );
    }

    // TODO: Create actual Toss payment session
    // 1. Call Toss API to create billing key request
    // 2. Store pending subscription in database
    // 3. Return Toss checkout URL

    return NextResponse.json(
      {
        error: 'Production mode not implemented yet',
        todo: [
          'Call Toss Payments API',
          'Create billing key request',
          'Store pending subscription',
          'Return checkout URL',
        ],
      },
      { status: 501 }
    );
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}