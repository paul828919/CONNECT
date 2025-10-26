/**
 * AI Cost Monitoring - Alert History API
 *
 * GET /api/admin/ai-monitoring/alert-history?days=30
 *
 * Returns budget alert history for monitoring
 * Admin-only endpoint for tracking budget alerts
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import { getAlertHistory } from '@/lib/ai/monitoring/budget-alerts';

export const dynamic = 'force-dynamic';

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

    // 4. Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // 5. Get alert history
    const alerts = await getAlertHistory(startDate, endDate);

    // 6. Calculate summary statistics
    const summary = {
      totalAlerts: alerts.length,
      byThreshold: {
        '50%': alerts.filter(a => a.threshold === 50).length,
        '80%': alerts.filter(a => a.threshold === 80).length,
        '95%': alerts.filter(a => a.threshold === 95).length,
      },
      bySeverity: {
        INFO: alerts.filter(a => a.severity === 'INFO').length,
        WARNING: alerts.filter(a => a.severity === 'WARNING').length,
        CRITICAL: alerts.filter(a => a.severity === 'CRITICAL').length,
      },
      alertsSent: alerts.filter(a => a.alertSent).length,
      alertsPending: alerts.filter(a => !a.alertSent).length,
      lastAlert: alerts.length > 0 ? alerts[0] : null,
    };

    const response = {
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        days,
      },
      summary,
      alerts: alerts.map(alert => ({
        id: alert.id,
        date: alert.date,
        severity: alert.severity,
        threshold: alert.threshold,
        amountSpent: alert.amountSpent,
        dailyLimit: alert.dailyLimit,
        percentage: alert.percentage,
        alertSent: alert.alertSent,
        alertSentAt: alert.alertSentAt,
        recipientEmails: alert.recipientEmails,
        createdAt: alert.createdAt,
      })),
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    console.error('❌ Alert history error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch alert history',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
