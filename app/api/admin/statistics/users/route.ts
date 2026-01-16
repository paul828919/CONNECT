/**
 * Admin User Statistics API
 *
 * GET /api/admin/statistics/users
 *
 * Returns user activity analytics for admin dashboard with time-series data
 * Supports CSV/Excel export for offline analysis
 *
 * Query Parameters:
 * - period: 'daily' | 'weekly' | 'monthly' (default: 'daily')
 * - days: Number of days to look back (default: 30 for daily, 84 for weekly, 360 for monthly)
 * - format: 'json' | 'csv' (default: 'json')
 * - excludeInternal: 'true' | 'false' (default: 'false') - Filter out admin users from metrics
 *
 * Examples:
 * - GET /api/admin/statistics/users?period=daily&days=30
 * - GET /api/admin/statistics/users?period=weekly&days=84&format=csv
 * - GET /api/admin/statistics/users?period=monthly&days=360
 *
 * Response (JSON):
 * {
 *   "period": "daily",
 *   "startDate": "2025-10-21",
 *   "endDate": "2025-11-20",
 *   "dataPoints": [
 *     { "date": "2025-10-21", "uniqueUsers": 45, "totalPageViews": 320, "avgPageViewsPerUser": 7.1 },
 *     ...
 *   ],
 *   "summary": {
 *     "totalUsers": 1250,
 *     "totalPageViews": 8900,
 *     "avgDailyUsers": 41.7,
 *     "avgPageViewsPerUser": 7.1,
 *     "peakUsers": 65,
 *     "peakDate": "2025-11-15",
 *     "growthRate": 12.5,
 *     "trend": "up"
 *   },
 *   "generatedAt": "2025-11-20T10:30:00.000Z"
 * }
 *
 * Response (CSV):
 * UTF-8 CSV file with BOM for Excel compatibility
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import {
  getUserAnalytics,
  getTodayStats,
  getTodayVisitors,
  exportToCSV,
  getDAUMAURatio,
  type TimePeriod,
} from '@/lib/analytics/user-analytics';

export const dynamic = 'force-dynamic';

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

    // 3. Parse query parameters
    const { searchParams } = new URL(request.url);
    const period = (searchParams.get('period') || 'daily') as TimePeriod;
    const daysParam = searchParams.get('days');
    const format = searchParams.get('format') || 'json';
    const excludeInternal = searchParams.get('excludeInternal') === 'true';

    // Validate period
    if (!['daily', 'weekly', 'monthly'].includes(period)) {
      return NextResponse.json(
        { error: 'Invalid period. Must be daily, weekly, or monthly.' },
        { status: 400 }
      );
    }

    // Validate format
    if (!['json', 'csv'].includes(format)) {
      return NextResponse.json(
        { error: 'Invalid format. Must be json or csv.' },
        { status: 400 }
      );
    }

    // Parse days parameter
    let days: number | undefined;
    if (daysParam) {
      days = parseInt(daysParam, 10);
      if (isNaN(days) || days < 1 || days > 365) {
        return NextResponse.json(
          { error: 'Invalid days parameter. Must be between 1 and 365.' },
          { status: 400 }
        );
      }
    }

    // 4. Get analytics data
    console.log(`[ADMIN API] Fetching ${period} analytics for ${days || 'default'} days`);
    const analytics = await getUserAnalytics(period, days);

    // 5. Get today's real-time stats (Engagement - from audit_logs)
    // If excludeInternal=true, admin users are filtered out from unique user count
    const todayStats = await getTodayStats({ excludeInternal });

    // 5.5 Get today's visitor stats (Visitors - from Redis sessions)
    // This represents all authenticated visits, regardless of actions taken
    const visitorStats = await getTodayVisitors();

    // 5.6 Get DAU/MAU ratio (stickiness metric)
    // If excludeInternal=true, admin users are filtered out from metrics
    const dauMauRatio = await getDAUMAURatio({ excludeInternal });

    // 6. Return CSV export if requested
    if (format === 'csv') {
      const csv = exportToCSV(analytics);
      const filename = `user-statistics-${period}-${analytics.startDate}-to-${analytics.endDate}.csv`;

      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    }

    // 7. Return JSON response with separated visitor/engagement metrics
    return NextResponse.json(
      {
        ...analytics,
        // VISITOR METRICS (방문자 지표) - From Redis sessions
        // Counts all authenticated visits, may include duplicate users across sessions
        visitors: {
          description: '오늘 로그인 방문자 수 (세션 기반)',
          todayVisitors: visitorStats.uniqueSessions,
          avgDailyVisitors: analytics.summary.avgDailyUsers, // From active_user_stats (historical)
          totalPageViews: visitorStats.totalPageViews,
          peakVisitors: analytics.summary.peakUsers,
          peakDate: analytics.summary.peakDate,
          date: visitorStats.date,
        },
        // ENGAGEMENT METRICS (참여자 지표) - From audit_logs
        // Counts users who took meaningful actions (match generation, profile completion, etc.)
        realtime: {
          description: '오늘 활성 참여자 수 (실제 행동 기반)',
          engagedUsers: todayStats.uniqueUsers,
          totalPageViews: todayStats.totalPageViews,
          date: todayStats.date,
        },
        // DAU/MAU RATIO (참여 고착도) - From audit_logs distinct userId
        engagement: {
          description: 'DAU/MAU 비율 (참여 기반 고착도)',
          excludeInternal, // True if admin users are filtered out
          ...dauMauRatio,
        },
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );
  } catch (error) {
    console.error(
      '[ADMIN API] Error fetching user statistics:',
      error instanceof Error ? error.message : error
    );

    return NextResponse.json(
      {
        error: 'Failed to fetch user statistics. Please try again later.',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Health check utility for testing
 *
 * @example
 * const healthy = await healthCheck();
 * if (!healthy) console.error('Statistics API not ready');
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const analytics = await getUserAnalytics('daily', 7);
    return analytics.dataPoints !== undefined;
  } catch (error) {
    console.error('[ADMIN API] Health check failed:', error);
    return false;
  }
}
