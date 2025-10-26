/**
 * API Route: AI Performance Monitoring
 * GET /api/admin/ai-monitoring/performance
 *
 * Returns AI performance statistics:
 * - Response time percentiles (P50, P95, P99)
 * - Success rates
 * - Cache hit rates
 * - Slow requests
 * - Performance trends
 *
 * Week 3, Day 22-23, Part 3
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import {
  getPerformanceStats,
  getSlowRequests,
  getPerformanceTrends,
  checkPerformanceAlerts,
} from '@/lib/ai/monitoring/performance';
import { AIServiceType } from '@prisma/client';

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
    const minutes = parseInt(searchParams.get('minutes') || '60', 10);
    const serviceType = (searchParams.get('serviceType') || 'ALL') as AIServiceType | 'ALL';
    const includeSlowRequests = searchParams.get('includeSlowRequests') === 'true';
    const includeTrends = searchParams.get('includeTrends') === 'true';

    // Validate parameters
    if (minutes < 1 || minutes > 1440) {
      return NextResponse.json(
        { error: 'Invalid minutes parameter (must be 1-1440)' },
        { status: 400 }
      );
    }

    // 4. Get performance statistics
    const stats = await getPerformanceStats(serviceType, minutes);

    // 5. Get slow requests (if requested)
    let slowRequests = undefined;
    if (includeSlowRequests) {
      slowRequests = await getSlowRequests(3000, minutes, 20); // Threshold: 3 seconds, limit: 20
    }

    // 6. Get performance trends (if requested)
    let trends = undefined;
    if (includeTrends) {
      const bucketSizeMinutes = minutes <= 60 ? 5 : minutes <= 240 ? 15 : 30;
      trends = await getPerformanceTrends(minutes, bucketSizeMinutes);
    }

    // 7. Check for alerts
    const alerts = await checkPerformanceAlerts();

    // 8. Build response
    const response = {
      stats,
      slowRequests,
      trends,
      alerts: {
        active: alerts.alert,
        reasons: alerts.reasons,
      },
      metadata: {
        serviceType,
        minutes,
        timestamp: new Date().toISOString(),
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    console.error('❌ AI performance monitoring error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch performance stats', message: error.message },
      { status: 500 }
    );
  }
}
