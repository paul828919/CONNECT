/**
 * AI Cost Monitoring - Daily Breakdown API
 *
 * GET /api/admin/ai-monitoring/daily-breakdown?days=30
 *
 * Returns daily cost breakdown for trend analysis
 * Admin-only endpoint for cost visualization
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import { getDailyCostBreakdown } from '@/lib/ai/monitoring/cost-logger';

export async function GET(request: NextRequest) {
  try {
    // 1. Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Check if user is admin
    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // 3. Get query parameters
    const { searchParams } = new URL(request.url);
    const daysParam = searchParams.get('days') || '30';
    const days = parseInt(daysParam, 10);

    if (isNaN(days) || days < 1 || days > 365) {
      return NextResponse.json(
        { error: 'Invalid days parameter (must be 1-365)' },
        { status: 400 }
      );
    }

    // 4. Get daily cost breakdown
    const breakdown = await getDailyCostBreakdown(days);

    // 5. Calculate summary statistics
    const summary = {
      totalDays: breakdown.length,
      totalCost: breakdown.reduce((sum, day) => sum + day.totalCost, 0),
      totalRequests: breakdown.reduce((sum, day) => sum + day.totalRequests, 0),
      averageDailyCost: breakdown.length > 0
        ? breakdown.reduce((sum, day) => sum + day.totalCost, 0) / breakdown.length
        : 0,
      averageDailyRequests: breakdown.length > 0
        ? breakdown.reduce((sum, day) => sum + day.totalRequests, 0) / breakdown.length
        : 0,
      highestCostDay: breakdown.length > 0
        ? breakdown.reduce((max, day) => day.totalCost > max.totalCost ? day : max)
        : null,
      lowestCostDay: breakdown.length > 0
        ? breakdown.reduce((min, day) => day.totalCost < min.totalCost ? day : min)
        : null,
    };

    const response = {
      summary,
      breakdown,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    console.error('❌ Daily breakdown error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch daily breakdown',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
