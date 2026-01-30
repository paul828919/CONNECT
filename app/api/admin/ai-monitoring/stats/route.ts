/**
 * AI Cost Monitoring - Stats API
 *
 * GET /api/admin/ai-monitoring/stats
 *
 * Returns current budget status and cost statistics
 * Admin-only endpoint for monitoring AI usage and costs
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import { getBudgetStatus } from '@/lib/ai/client';
import { getCostStats } from '@/lib/ai/monitoring/cost-logger';

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

    // 5. Get budget status from Redis
    const budgetStatus = await getBudgetStatus();

    // 6. Get cost statistics from database
    const costStats = await getCostStats(startDate, endDate);

    // 7. Build model breakdown from cost stats byService
    // Query model-level breakdown from database
    const { db } = await import('@/lib/db');
    const modelLogs = await db.ai_cost_logs.groupBy({
      by: ['model'],
      _sum: { costKRW: true, inputTokens: true, outputTokens: true },
      _count: { id: true },
      _avg: { duration: true },
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    const byModel: Record<string, { count: number; cost: number; inputTokens: number; outputTokens: number; averageDuration: number }> = {};
    for (const entry of modelLogs) {
      byModel[entry.model] = {
        count: entry._count.id,
        cost: entry._sum.costKRW || 0,
        inputTokens: entry._sum.inputTokens || 0,
        outputTokens: entry._sum.outputTokens || 0,
        averageDuration: entry._avg.duration || 0,
      };
    }

    // 8. Combine and return
    const response = {
      budget: {
        dailyLimit: budgetStatus.dailyLimit,
        spent: budgetStatus.spent,
        remaining: budgetStatus.remaining,
        percentage: budgetStatus.percentage,
        resetTime: new Date().setHours(24, 0, 0, 0), // Midnight KST
      },
      stats: {
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          days,
        },
        totalCost: costStats.totalCost,
        totalRequests: costStats.totalRequests,
        successRate: costStats.successRate,
        cacheHitRate: costStats.cacheHitRate,
        averageCost: costStats.averageCost,
        averageDuration: costStats.averageDuration,
        byService: costStats.byService,
        byModel,
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    console.error('❌ AI monitoring stats error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch AI monitoring stats',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
