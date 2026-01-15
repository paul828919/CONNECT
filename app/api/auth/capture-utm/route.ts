/**
 * UTM Capture API
 * POST /api/auth/capture-utm
 *
 * Associates UTM attribution data with the current user.
 * Called from the client after signup to capture UTM from cookies.
 *
 * Only updates if user doesn't already have UTM data (first-touch attribution).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import { db } from '@/lib/db';
import { parseUtmCookie, UTM_COOKIE_NAME } from '@/lib/analytics/utm-tracking';

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

    const userId = session.user.id;

    // 2. Check if user already has UTM data (first-touch model - don't overwrite)
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        utmSource: true,
        utmCampaign: true,
      },
    });

    if (user?.utmSource || user?.utmCampaign) {
      // User already has UTM attribution
      return NextResponse.json(
        { success: true, message: 'UTM already captured', skipped: true },
        { status: 200 }
      );
    }

    // 3. Get UTM data from cookie
    const cookieValue = request.cookies.get(UTM_COOKIE_NAME)?.value;
    const utmData = parseUtmCookie(
      cookieValue ? decodeURIComponent(cookieValue) : undefined
    );

    if (!utmData || (!utmData.utmSource && !utmData.utmCampaign)) {
      // No UTM data in cookie
      return NextResponse.json(
        { success: true, message: 'No UTM data found', skipped: true },
        { status: 200 }
      );
    }

    // 4. Update user with UTM data
    await db.user.update({
      where: { id: userId },
      data: {
        utmSource: utmData.utmSource,
        utmMedium: utmData.utmMedium,
        utmCampaign: utmData.utmCampaign,
        utmTerm: utmData.utmTerm,
        utmContent: utmData.utmContent,
      },
    });

    console.log(`[UTM] Captured for user ${userId}:`, utmData);

    return NextResponse.json(
      {
        success: true,
        message: 'UTM captured successfully',
        utm: utmData,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('UTM capture error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
