/**
 * Admin User Directory API
 *
 * GET /api/admin/users
 *
 * Returns paginated list of all users with organization and subscription details
 * Admin-only endpoint for user management and oversight
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import { db } from '@/lib/db';
import { SubscriptionPlan } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // 1. Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Check if user is admin or super admin
    const userRole = (session.user as any).role;
    if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // 3. Get query parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const plan = searchParams.get('plan') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // Validate pagination params
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Invalid pagination parameters' },
        { status: 400 }
      );
    }

    const skip = (page - 1) * limit;

    // 4. Build where clause for filtering
    const where: any = {};

    // Search filter (name, email, or organization name)
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { organization: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // Plan filter
    if (plan === 'FREE') {
      // FREE means no active subscription OR no subscription at all
      where.OR = where.OR || [];
      // Combine with existing OR if present, or create new filter
      if (search) {
        // If there's already a search OR, we need AND logic
        where.AND = [
          { OR: where.OR },
          {
            OR: [
              { subscriptions: null },
              { subscriptions: { status: { not: 'ACTIVE' } } },
            ],
          },
        ];
        delete where.OR;
      } else {
        where.OR = [
          { subscriptions: null },
          { subscriptions: { status: { not: 'ACTIVE' } } },
        ];
      }
    } else if (plan === 'PRO' || plan === 'TEAM') {
      const planFilter = {
        subscriptions: {
          plan: plan as SubscriptionPlan,
          status: 'ACTIVE',
        },
      };
      if (search) {
        where.AND = [{ OR: where.OR }, planFilter];
        delete where.OR;
      } else {
        Object.assign(where, planFilter);
      }
    }

    // 5. Get total count for pagination
    const totalCount = await db.user.count({ where });

    // 6. Fetch users with organization and subscription
    const users = await db.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        lastLoginAt: true,
        organization: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        subscriptions: {
          select: {
            plan: true,
            status: true,
            startedAt: true,
            expiresAt: true,
            nextBillingDate: true,
            billingCycle: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
    });

    // 7. Transform users to include computed subscription plan
    const transformedUsers = users.map((user) => {
      const hasActiveSubscription =
        user.subscriptions && user.subscriptions.status === 'ACTIVE';

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt.toISOString(),
        lastLoginAt: user.lastLoginAt?.toISOString() || null,
        organization: user.organization
          ? {
              id: user.organization.id,
              name: user.organization.name,
              type: user.organization.type,
            }
          : null,
        subscription: {
          plan: hasActiveSubscription ? user.subscriptions!.plan : 'FREE',
          status: user.subscriptions?.status || null,
          startedAt: user.subscriptions?.startedAt?.toISOString() || null,
          expiresAt: user.subscriptions?.expiresAt?.toISOString() || null,
          nextBillingDate:
            hasActiveSubscription && user.subscriptions?.nextBillingDate
              ? user.subscriptions.nextBillingDate.toISOString()
              : null,
          billingCycle: user.subscriptions?.billingCycle || null,
        },
      };
    });

    // 8. Get summary statistics (by plan)
    const allUsersCount = await db.user.count();

    // Count users with active PRO subscriptions
    const proCount = await db.user.count({
      where: {
        subscriptions: {
          plan: 'PRO',
          status: 'ACTIVE',
        },
      },
    });

    // Count users with active TEAM subscriptions
    const teamCount = await db.user.count({
      where: {
        subscriptions: {
          plan: 'TEAM',
          status: 'ACTIVE',
        },
      },
    });

    // FREE = total - PRO - TEAM
    const freeCount = allUsersCount - proCount - teamCount;

    // 9. Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasMore = page < totalPages;

    // 10. Return response
    return NextResponse.json(
      {
        users: transformedUsers,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasMore,
        },
        summary: {
          total: allUsersCount,
          FREE: freeCount,
          PRO: proCount,
          TEAM: teamCount,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('❌ Admin users fetch error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch users',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
