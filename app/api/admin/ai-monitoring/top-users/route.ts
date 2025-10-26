/**
 * AI Cost Monitoring - Top Users API
 *
 * GET /api/admin/ai-monitoring/top-users?limit=10&days=30
 *
 * Returns top users by AI cost for usage analysis
 * Admin-only endpoint for identifying high-usage users
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import { getTopUsersByCost } from '@/lib/ai/monitoring/cost-logger';

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
    const limitParam = searchParams.get('limit') || '10';
    const daysParam = searchParams.get('days') || '30';

    const limit = parseInt(limitParam, 10);
    const days = parseInt(daysParam, 10);

    if (isNaN(limit) || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Invalid limit parameter (must be 1-100)' },
        { status: 400 }
      );
    }

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

    // 5. Get top users by cost
    const topUsers = await getTopUsersByCost(startDate, endDate, limit);

    // 6. Calculate summary statistics
    const totalCost = topUsers.reduce((sum, user) => sum + user.totalCost, 0);
    const totalRequests = topUsers.reduce((sum, user) => sum + user.totalRequests, 0);

    const response = {
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        days,
      },
      summary: {
        totalUsers: topUsers.length,
        totalCost,
        totalRequests,
        averageCostPerUser: topUsers.length > 0 ? totalCost / topUsers.length : 0,
        averageRequestsPerUser: topUsers.length > 0 ? totalRequests / topUsers.length : 0,
      },
      topUsers: topUsers.map((user, index) => ({
        rank: index + 1,
        userId: user.userId,
        userName: user.userName || 'Unknown',
        userEmail: user.userEmail || 'N/A',
        totalCost: user.totalCost,
        totalRequests: user.totalRequests,
        averageCostPerRequest: user.totalRequests > 0
          ? user.totalCost / user.totalRequests
          : 0,
        percentOfTotal: totalCost > 0
          ? (user.totalCost / totalCost) * 100
          : 0,
      })),
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    console.error('❌ Top users error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch top users',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
