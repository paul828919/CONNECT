/**
 * Customer Key API
 *
 * GET /api/billing/customer-key - Get or create Toss customerKey for current user
 *
 * customerKey is a unique identifier for each customer in Toss Payments.
 * It must be a UUID and must be consistent across all payment operations.
 *
 * IMPORTANT: customerKey is stored in the database (not localStorage) to ensure:
 * - Consistency across devices (mobile, desktop, etc.)
 * - Persistence across browser cache clears
 * - Security (not exposed in client-side storage)
 *
 * Toss Official Recommendation:
 * - Use UUID format (not email or auto-increment ID)
 * - Store securely on server-side
 * - Use same customerKey for same customer across all operations
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import { db } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function GET() {
  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', message: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // 2. Get user with tossCustomerKey
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { tossCustomerKey: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found', message: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 3. Return existing customerKey or create new one
    let customerKey = user.tossCustomerKey;

    if (!customerKey) {
      // Generate new UUID for customerKey
      customerKey = randomUUID();

      // Save to database
      await db.user.update({
        where: { id: userId },
        data: { tossCustomerKey: customerKey },
      });

      console.log('[CUSTOMER-KEY] Created new customerKey for user:', userId);
    }

    return NextResponse.json({
      success: true,
      customerKey,
    });
  } catch (error) {
    console.error('[CUSTOMER-KEY] Error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'customerKey 조회 중 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
}
