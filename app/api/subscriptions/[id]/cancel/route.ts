/**
 * Subscription Cancel API
 * POST /api/subscriptions/[id]/cancel - Cancel a subscription
 *
 * v3.1 Clarification: Separate from refund request
 * - Cancels subscription (stops future billing)
 * - Does NOT issue refund automatically
 * - User must separately request refund via /api/refund-requests if desired
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { authOptions } from '@/lib/auth.config';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subscription = await db.subscriptions.findFirst({
      where: {
        id: params.id,
        userId: (session.user as any).id,
        status: 'ACTIVE',
      },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: 'Subscription not found or already cancelled' },
        { status: 404 }
      );
    }

    // Cancel subscription (stops future billing, does NOT issue refund)
    await db.subscriptions.update({
      where: { id: params.id },
      data: {
        status: 'CANCELED',
        canceledAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: '구독이 해지되었습니다. 다음 결제일부터 과금되지 않습니다.',
    });
  } catch (error) {
    console.error('Subscription cancel error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
