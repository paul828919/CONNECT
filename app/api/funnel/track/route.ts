/**
 * Funnel Event Tracking API
 * POST /api/funnel/track
 *
 * Logs conversion funnel events from client-side components.
 * Used for events that occur on client-rendered pages like:
 * - upgrade_viewed: User visited pricing page
 * - upgrade_started: User clicked payment button
 *
 * Server-side events (profile_completed, first_match_generated, match_saved)
 * are logged directly in their respective API routes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import { logFunnelEvent, AuditAction } from '@/lib/audit';

// Allowed client-side funnel events
const ALLOWED_EVENTS: AuditAction[] = [
  AuditAction.UPGRADE_VIEWED,
  AuditAction.UPGRADE_STARTED,
];

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

    // 2. Parse request body
    const body = await request.json();
    const { event, resourceId, details } = body;

    // 3. Validate event type
    if (!event || !ALLOWED_EVENTS.includes(event as AuditAction)) {
      return NextResponse.json(
        { error: 'Invalid event type' },
        { status: 400 }
      );
    }

    // 4. Log the funnel event
    await logFunnelEvent(
      userId,
      event as AuditAction,
      resourceId || undefined,
      details || undefined
    );

    return NextResponse.json(
      { success: true, event },
      { status: 200 }
    );
  } catch (error) {
    console.error('Funnel tracking error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
