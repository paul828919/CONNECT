/**
 * Internal API: Track Active User
 *
 * This endpoint receives user tracking requests from middleware and
 * processes them using Node.js runtime (not Edge Runtime).
 *
 * Why this exists:
 * - Middleware runs on Edge Runtime which doesn't support the `redis` package
 * - This API route runs on Node.js runtime, enabling full Redis functionality
 * - Middleware calls this endpoint via fetch (non-blocking)
 *
 * Security:
 * - Internal use only (not exposed to external clients)
 * - Validates session token format
 * - Silent fail pattern (doesn't affect user experience)
 */

import { NextRequest, NextResponse } from 'next/server';
import { trackActiveUser } from '@/lib/analytics/active-user-tracking';

// Force Node.js runtime (not Edge)
export const runtime = 'nodejs';

/**
 * POST /api/internal/track-user
 *
 * Track active user page view
 *
 * @body { sessionToken: string } - NextAuth session token
 */
export async function POST(request: NextRequest) {
  try {
    // Validate request origin (internal only)
    const origin = request.headers.get('x-internal-request');
    if (origin !== 'middleware') {
      // Silent reject for external requests
      return NextResponse.json({ success: false }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { sessionToken } = body;

    // Validate session token
    if (!sessionToken || typeof sessionToken !== 'string') {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    // Track the user (non-blocking, silent fail)
    await trackActiveUser(sessionToken);

    return NextResponse.json({ success: true });
  } catch (error) {
    // Silent fail - don't expose errors
    console.error('[TRACK-USER] Error:', error instanceof Error ? error.message : error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
