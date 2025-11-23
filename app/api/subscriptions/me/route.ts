/**
 * Get Current User's Subscription API
 *
 * GET /api/subscriptions/me - Fetch authenticated user's subscription details
 *
 * Returns:
 * - subscription: { plan, status, billingCycle, expiresAt, ... } or null
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
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

    // 2. Fetch user's subscription
    const subscription = await db.subscriptions.findUnique({
      where: { userId },
      select: {
        id: true,
        plan: true,
        status: true,
        billingCycle: true,
        startedAt: true,
        expiresAt: true,
        nextBillingDate: true,
        amount: true,
        currency: true,
        paymentMethod: true,
        createdAt: true,
      },
    });

    // 3. Return subscription (null if user has no subscription = Free plan)
    return NextResponse.json({
      subscription,
    });
  } catch (error) {
    console.error('Subscription fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
