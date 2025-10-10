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
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { plan, billingCycle } = body;

    // TODO: Implement Toss Payments checkout
    // 1. Validate plan (PRO, TEAM)
    // 2. Calculate amount based on plan and billing cycle
    // 3. Create Toss payment session
    // 4. Return checkout URL
    // 5. Store pending subscription in database

    return NextResponse.json(
      {
        error: 'Not implemented yet',
        endpoint: '/api/payments/checkout POST',
        body: { plan, billingCycle },
        todo: [
          'Integrate Toss Payments SDK',
          'Create checkout session',
          'Handle redirect flow',
        ],
      },
      { status: 501 }
    );
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}