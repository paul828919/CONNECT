/**
 * Cron Job: Aggregate Active User Statistics
 *
 * Called hourly by external Linux server crontab at :05
 * Aggregates Redis active user data to PostgreSQL
 *
 * Security: Bearer token authorization (CRON_SECRET_TOKEN)
 *
 * Crontab configuration (on server at 59.21.170.6):
 * ```bash
 * # Aggregate active user stats every hour at :05
 * 5 * * * * curl -X POST http://localhost:3000/api/cron/aggregate-active-users \
 *   -H "Authorization: Bearer YOUR_CRON_SECRET_TOKEN" \
 *   >> /var/log/connect/cron-active-users.log 2>&1
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import { aggregateActiveUserStats } from '@/lib/analytics/active-user-tracking';

/**
 * POST /api/cron/aggregate-active-users
 *
 * Aggregate active user statistics from Redis to PostgreSQL
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Verify authorization token
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    const expectedToken = process.env.CRON_SECRET_TOKEN;

    if (!expectedToken) {
      console.error('[CRON] CRON_SECRET_TOKEN not configured in environment');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    if (token !== expectedToken) {
      console.error('[CRON] Unauthorized access attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Run aggregation
    console.log('[CRON] Starting active user aggregation...');
    const result = await aggregateActiveUserStats();

    // 3. Return result
    if (result.success) {
      console.log(`[CRON] ✓ Aggregation completed: ${result.date}`);
      return NextResponse.json({
        success: true,
        timestamp: new Date().toISOString(),
        data: {
          date: result.date,
          uniqueUsers: result.uniqueUsers,
          totalPageViews: result.totalPageViews,
        },
      });
    } else {
      console.error(`[CRON] ✗ Aggregation failed: ${result.error}`);
      return NextResponse.json(
        {
          success: false,
          timestamp: new Date().toISOString(),
          error: result.error,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[CRON] Aggregation endpoint error:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      {
        success: false,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
