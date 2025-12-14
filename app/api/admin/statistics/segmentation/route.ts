/**
 * Admin Statistics Segmentation API
 *
 * GET /api/admin/statistics/segmentation
 *
 * Returns user breakdown by subscription plan for the admin statistics dashboard.
 *
 * Response:
 * {
 *   "byPlan": [
 *     { "plan": "FREE", "userCount": 100, "percentage": 50.0 },
 *     { "plan": "PRO", "userCount": 80, "percentage": 40.0 },
 *     { "plan": "TEAM", "userCount": 20, "percentage": 10.0 }
 *   ],
 *   "total": 200,
 *   "generatedAt": "2025-12-14T10:30:00.000Z"
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import { PrismaClient, SubscriptionPlan } from '@prisma/client';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

interface PlanSegment {
  plan: SubscriptionPlan | 'FREE';
  userCount: number;
  percentage: number;
}

interface SegmentationResponse {
  byPlan: PlanSegment[];
  total: number;
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

    // 3. Get total user count
    const totalUsers = await prisma.user.count();

    // 4. Get users with active subscriptions by plan
    const subscriptionsByPlan = await prisma.subscriptions.groupBy({
      by: ['plan'],
      where: {
        status: 'ACTIVE',
      },
      _count: {
        userId: true,
      },
    });

    // 5. Calculate users without subscriptions (FREE plan)
    const subscribedUserIds = await prisma.subscriptions.findMany({
      where: {
        status: 'ACTIVE',
      },
      select: {
        userId: true,
      },
    });

    const subscribedCount = subscribedUserIds.length;
    const freeCount = totalUsers - subscribedCount;

    // 6. Build segmentation data
    const segmentMap = new Map<string, number>();
    segmentMap.set('FREE', freeCount);

    subscriptionsByPlan.forEach((sub) => {
      segmentMap.set(sub.plan, sub._count.userId);
    });

    // Ensure all plans are represented
    const allPlans: (SubscriptionPlan | 'FREE')[] = ['FREE', 'PRO', 'TEAM'];
    const byPlan: PlanSegment[] = allPlans.map((plan) => {
      const count = segmentMap.get(plan) || 0;
      return {
        plan,
        userCount: count,
        percentage: totalUsers > 0 ? parseFloat(((count / totalUsers) * 100).toFixed(1)) : 0,
      };
    });

    const response: SegmentationResponse = {
      byPlan,
      total: totalUsers,
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
      '[ADMIN API] Error fetching segmentation data:',
      error instanceof Error ? error.message : error
    );

    return NextResponse.json(
      {
        error: 'Failed to fetch segmentation data. Please try again later.',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
