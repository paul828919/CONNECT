/**
 * Application Outcomes Analytics API
 *
 * GET /api/outcomes/analytics?organizationId=xxx
 *
 * Returns win-rate, average processing time, and status distribution.
 * Used for dashboard analytics and personalization feedback.
 *
 * @module app/api/outcomes/analytics/route
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

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

    // Fetch all current outcomes for this organization
    const outcomes = await db.application_outcomes.findMany({
      where: {
        organizationId,
        isCurrent: true,
      },
    });

    // Compute analytics
    const totalApplications = outcomes.length;
    const selected = outcomes.filter((o) => o.status === 'SELECTED');
    const rejected = outcomes.filter((o) => o.status === 'REJECTED');
    const submitted = outcomes.filter((o) =>
      ['SUBMITTED', 'UNDER_REVIEW', 'SELECTED', 'REJECTED'].includes(o.status)
    );

    // Win rate (selected / completed decisions)
    const completedDecisions = selected.length + rejected.length;
    const winRate = completedDecisions > 0
      ? selected.length / completedDecisions
      : null;

    // Average time from submission to result (days)
    const timesToResult: number[] = [];
    for (const o of [...selected, ...rejected]) {
      if (o.applicationDate && o.resultDate) {
        const days = (o.resultDate.getTime() - o.applicationDate.getTime()) / (1000 * 60 * 60 * 24);
        if (days > 0) timesToResult.push(days);
      }
    }
    const avgDaysToResult = timesToResult.length > 0
      ? Math.round(timesToResult.reduce((a, b) => a + b, 0) / timesToResult.length)
      : null;

    // Status distribution
    const statusDistribution: Record<string, number> = {};
    for (const o of outcomes) {
      statusDistribution[o.status] = (statusDistribution[o.status] || 0) + 1;
    }

    // Total awarded amount
    const totalAwarded = selected
      .filter((o) => o.awardAmount)
      .reduce((sum, o) => sum + Number(o.awardAmount), 0);

    return NextResponse.json({
      success: true,
      analytics: {
        totalApplications,
        submittedCount: submitted.length,
        selectedCount: selected.length,
        rejectedCount: rejected.length,
        winRate,
        avgDaysToResult,
        totalAwarded: totalAwarded > 0 ? totalAwarded.toString() : null,
        statusDistribution,
      },
    });
  } catch (error) {
    console.error('[API/outcomes/analytics] GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
