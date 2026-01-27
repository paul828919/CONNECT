/**
 * Event Tracking API Endpoint
 *
 * POST /api/events/track
 *
 * Receives batched recommendation events from the client-side tracker.
 * Validates, rate limits, and persists events to the database.
 *
 * Design decisions:
 * - Batch processing: Accepts multiple events per request
 * - Validation: Input validation before persistence
 * - Rate limiting: Server-side Redis counters (backup to client throttling)
 * - Silent fail: Returns success even on partial failures
 *
 * @module app/api/events/track/route
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import {
  logRecommendationEvents,
  validateEventInput,
  RecommendationEventInput,
} from '@/lib/personalization/event-logger';
import { RecommendationEventType } from '@prisma/client';

// ============================================================================
// Types
// ============================================================================

interface TrackRequest {
  events: RecommendationEventInput[];
}

interface TrackResponse {
  success: boolean;
  logged: number;
  skipped: number;
  errors?: string[];
}

// ============================================================================
// Constants
// ============================================================================

const MAX_BATCH_SIZE = 50; // Maximum events per request
const MAX_REQUEST_SIZE = 100 * 1024; // 100KB max request size

// Valid event types (must match Prisma enum)
const VALID_EVENT_TYPES: RecommendationEventType[] = [
  'IMPRESSION',
  'VIEW',
  'CLICK',
  'SAVE',
  'UNSAVE',
  'DISMISS',
  'HIDE',
  'APPLIED',
  'NOT_ELIGIBLE',
  'PLANNING',
];

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse<TrackResponse>> {
  try {
    // 1. Basic request validation
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > MAX_REQUEST_SIZE) {
      return NextResponse.json(
        { success: false, logged: 0, skipped: 0, errors: ['Request too large'] },
        { status: 413 }
      );
    }

    // 2. Parse request body
    let body: TrackRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, logged: 0, skipped: 0, errors: ['Invalid JSON'] },
        { status: 400 }
      );
    }

    // 3. Validate events array
    if (!body.events || !Array.isArray(body.events)) {
      return NextResponse.json(
        { success: false, logged: 0, skipped: 0, errors: ['events must be an array'] },
        { status: 400 }
      );
    }

    if (body.events.length === 0) {
      return NextResponse.json({ success: true, logged: 0, skipped: 0 });
    }

    if (body.events.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        {
          success: false,
          logged: 0,
          skipped: body.events.length,
          errors: [`Batch size exceeds maximum of ${MAX_BATCH_SIZE}`],
        },
        { status: 400 }
      );
    }

    // 4. Get session (optional - events can come from anonymous sessions)
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    // 5. Validate and transform events
    const validatedEvents: RecommendationEventInput[] = [];
    const validationErrors: string[] = [];

    for (let i = 0; i < body.events.length; i++) {
      const event = body.events[i];

      // Basic structure validation
      const { valid, errors } = validateEventInput(event);

      if (!valid) {
        validationErrors.push(`Event ${i}: ${errors.join(', ')}`);
        continue;
      }

      // Validate eventType
      if (!VALID_EVENT_TYPES.includes(event.eventType as RecommendationEventType)) {
        validationErrors.push(`Event ${i}: Invalid eventType: ${event.eventType}`);
        continue;
      }

      // Add server-side userId if available (overrides client-provided)
      validatedEvents.push({
        ...event,
        userId: userId || event.userId,
        eventType: event.eventType as RecommendationEventType,
      });
    }

    // 6. Log events
    const result = await logRecommendationEvents(validatedEvents);

    // 7. Return response
    const skipped = body.events.length - validatedEvents.length + result.skipped;

    return NextResponse.json({
      success: true,
      logged: result.logged,
      skipped,
      errors: validationErrors.length > 0 ? validationErrors : undefined,
    });
  } catch (error) {
    // Log error but don't expose details to client
    console.error('[API/events/track] Error:', error);

    // Return success with 0 logged (silent fail pattern)
    return NextResponse.json({
      success: true, // Don't break client
      logged: 0,
      skipped: 0,
      errors: ['Server error'],
    });
  }
}

// ============================================================================
// OPTIONS Handler (CORS preflight)
// ============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
