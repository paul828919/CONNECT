/**
 * Admin Statistics Growth API
 *
 * GET /api/admin/statistics/growth
 *
 * Returns WoW (Week-over-Week) and MoM (Month-over-Month) growth metrics
 * for the admin statistics dashboard.
 *
 * Response:
 * {
 *   "wow": {
 *     "current": 150,
 *     "previous": 120,
 *     "growthRate": 25.0,
 *     "trend": "up"
 *   },
 *   "mom": {
 *     "current": 600,
 *     "previous": 500,
 *     "growthRate": 20.0,
 *     "trend": "up"
 *   },
 *   "generatedAt": "2025-12-14T10:30:00.000Z"
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import { PrismaClient } from '@prisma/client';
import { subDays, subWeeks, subMonths, startOfWeek, startOfMonth } from 'date-fns';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

interface GrowthMetric {
  current: number;
  previous: number;
  growthRate: number;
  trend: 'up' | 'down' | 'stable';
}

interface GrowthResponse {
  wow: GrowthMetric;
  mom: GrowthMetric;
  generatedAt: string;
}

export async function GET(request: NextRequest) {
  try {
    // 1. Check authentication
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    // 2. Check if user is admin or super admin
    const userRole = (session.user as any).role;
    if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required.' },
        { status: 403 }
      );
    }

    // 3. Calculate date ranges
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Week-over-Week: This week vs Last week
    const thisWeekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
    const lastWeekStart = subWeeks(thisWeekStart, 1);
    const lastWeekEnd = subDays(thisWeekStart, 1);

    // Month-over-Month: This month vs Last month
    const thisMonthStart = startOfMonth(today);
    const lastMonthStart = subMonths(thisMonthStart, 1);
    const lastMonthEnd = subDays(thisMonthStart, 1);

    // 4. Fetch WoW data
    const thisWeekData = await prisma.active_user_stats.aggregate({
      where: {
        date: {
          gte: thisWeekStart,
          lte: today,
        },
      },
      _sum: {
        uniqueUsers: true,
      },
    });

    const lastWeekData = await prisma.active_user_stats.aggregate({
      where: {
        date: {
          gte: lastWeekStart,
          lte: lastWeekEnd,
        },
      },
      _sum: {
        uniqueUsers: true,
      },
    });

    // 5. Fetch MoM data
    const thisMonthData = await prisma.active_user_stats.aggregate({
      where: {
        date: {
          gte: thisMonthStart,
          lte: today,
        },
      },
      _sum: {
        uniqueUsers: true,
      },
    });

    const lastMonthData = await prisma.active_user_stats.aggregate({
      where: {
        date: {
          gte: lastMonthStart,
          lte: lastMonthEnd,
        },
      },
      _sum: {
        uniqueUsers: true,
      },
    });

    // 6. Calculate growth rates
    const wowCurrent = thisWeekData._sum.uniqueUsers || 0;
    const wowPrevious = lastWeekData._sum.uniqueUsers || 0;
    const wowGrowthRate = wowPrevious > 0
      ? ((wowCurrent - wowPrevious) / wowPrevious) * 100
      : 0;

    const momCurrent = thisMonthData._sum.uniqueUsers || 0;
    const momPrevious = lastMonthData._sum.uniqueUsers || 0;
    const momGrowthRate = momPrevious > 0
      ? ((momCurrent - momPrevious) / momPrevious) * 100
      : 0;

    // 7. Determine trends
    const getTrend = (rate: number): 'up' | 'down' | 'stable' => {
      if (rate > 5) return 'up';
      if (rate < -5) return 'down';
      return 'stable';
    };

    const response: GrowthResponse = {
      wow: {
        current: wowCurrent,
        previous: wowPrevious,
        growthRate: parseFloat(wowGrowthRate.toFixed(1)),
        trend: getTrend(wowGrowthRate),
      },
      mom: {
        current: momCurrent,
        previous: momPrevious,
        growthRate: parseFloat(momGrowthRate.toFixed(1)),
        trend: getTrend(momGrowthRate),
      },
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error(
      '[ADMIN API] Error fetching growth metrics:',
      error instanceof Error ? error.message : error
    );

    return NextResponse.json(
      {
        error: 'Failed to fetch growth metrics. Please try again later.',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
