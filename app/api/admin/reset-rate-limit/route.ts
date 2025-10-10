/**
 * Admin API: Reset rate limit for a user
 * POST /api/admin/reset-rate-limit?userId=xxx
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import { resetRateLimit } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  try {
    // 1. Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const currentUserId = session.user.id;

    // 2. Get user ID from query params (or use current user)
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || currentUserId;

    // 3. Generate the month key
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const monthKey = `${year}-${month}`;

    // 4. Reset the rate limit key
    const key = `match:limit:${userId}:${monthKey}`;
    await resetRateLimit(key);

    return NextResponse.json({
      success: true,
      message: 'Rate limit reset successfully',
      key,
    }, { status: 200 });

  } catch (error) {
    console.error('Error resetting rate limit:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
