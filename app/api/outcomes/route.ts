/**
 * Application Outcomes API
 *
 * POST /api/outcomes — Create or update an application outcome
 * GET /api/outcomes?organizationId=xxx — List current outcomes for an organization
 *
 * Supports status transitions with audit trail (isCurrent flag).
 * Used for win-rate analytics and personalization feedback.
 *
 * @module app/api/outcomes/route
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import { db } from '@/lib/db';
import { ApplicationStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

// ============================================================================
// Valid Status Transitions
// ============================================================================

const VALID_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  PLANNING: ['IN_PROGRESS', 'SUBMITTED', 'WITHDRAWN'],
  IN_PROGRESS: ['SUBMITTED', 'WITHDRAWN'],
  SUBMITTED: ['UNDER_REVIEW', 'WITHDRAWN'],
  UNDER_REVIEW: ['SELECTED', 'REJECTED'],
  SELECTED: [],  // Terminal state
  REJECTED: [],  // Terminal state
  WITHDRAWN: [], // Terminal state
};

// ============================================================================
// POST Handler — Create or Update Outcome
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();

    const {
      matchId,
      organizationId,
      programId,
      status,
      applicationDate,
      resultDate,
      awardAmount,
      rejectionReason,
      notes,
      metadata,
    } = body;

    // Validate required fields
    if (!organizationId || !programId || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: organizationId, programId, status' },
        { status: 400 }
      );
    }

    // Validate status enum
    const validStatuses: ApplicationStatus[] = [
      'PLANNING', 'IN_PROGRESS', 'SUBMITTED', 'UNDER_REVIEW',
      'SELECTED', 'REJECTED', 'WITHDRAWN',
    ];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // Verify user belongs to organization
    const org = await db.organizations.findFirst({
      where: {
        id: organizationId,
        users: { some: { id: userId } },
      },
    });

    if (!org) {
      return NextResponse.json(
        { error: 'You do not have access to this organization' },
        { status: 403 }
      );
    }

    // Check for existing current outcome (for status transition validation)
    const existing = await db.application_outcomes.findFirst({
      where: {
        organizationId,
        programId,
        isCurrent: true,
      },
    });

    // Validate status transition
    if (existing) {
      const allowedNextStatuses = VALID_TRANSITIONS[existing.status];
      if (!allowedNextStatuses.includes(status)) {
        return NextResponse.json(
          {
            error: `Invalid transition: ${existing.status} → ${status}. Allowed: ${allowedNextStatuses.join(', ') || 'none (terminal state)'}`,
          },
          { status: 400 }
        );
      }
    }

    // Transaction: mark old as non-current, create new
    const result = await db.$transaction(async (tx) => {
      // Mark existing outcome as non-current
      if (existing) {
        await tx.application_outcomes.update({
          where: { id: existing.id },
          data: { isCurrent: false },
        });
      }

      // Create new outcome
      const outcome = await tx.application_outcomes.create({
        data: {
          matchId: matchId || null,
          organizationId,
          programId,
          userId,
          status,
          applicationDate: applicationDate ? new Date(applicationDate) : null,
          resultDate: resultDate ? new Date(resultDate) : null,
          awardAmount: awardAmount ? BigInt(awardAmount) : null,
          rejectionReason: rejectionReason || null,
          notes: notes || null,
          previousStatusId: existing?.id || null,
          isCurrent: true,
          metadata: metadata || null,
        },
      });

      return outcome;
    });

    return NextResponse.json({
      success: true,
      outcome: {
        id: result.id,
        status: result.status,
        organizationId: result.organizationId,
        programId: result.programId,
        isCurrent: result.isCurrent,
        previousStatusId: result.previousStatusId,
        createdAt: result.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('[API/outcomes] POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET Handler — List Outcomes
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Missing organizationId parameter' },
        { status: 400 }
      );
    }

    // Verify user belongs to organization
    const org = await db.organizations.findFirst({
      where: {
        id: organizationId,
        users: { some: { id: session.user.id } },
      },
    });

    if (!org) {
      return NextResponse.json(
        { error: 'You do not have access to this organization' },
        { status: 403 }
      );
    }

    const outcomes = await db.application_outcomes.findMany({
      where: {
        organizationId,
        isCurrent: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      outcomes: outcomes.map((o) => ({
        id: o.id,
        matchId: o.matchId,
        programId: o.programId,
        status: o.status,
        applicationDate: o.applicationDate?.toISOString() || null,
        resultDate: o.resultDate?.toISOString() || null,
        awardAmount: o.awardAmount?.toString() || null,
        rejectionReason: o.rejectionReason,
        notes: o.notes,
        confidence: o.confidence,
        createdAt: o.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('[API/outcomes] GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
