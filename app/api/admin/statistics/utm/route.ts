/**
 * Admin UTM Attribution Statistics API
 * GET /api/admin/statistics/utm
 *
 * Returns UTM attribution data for admin dashboard:
 * - Users by source (cold_email, linkedin, google, etc.)
 * - Users by campaign
 * - Conversion funnel by source
 *
 * Query Parameters:
 * - days: Number of days to look back (default: 30)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import { db } from '@/lib/db';
import { subDays } from 'date-fns';

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

    // 2. Check if user is admin
    const userRole = (session.user as any).role;
    if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required.' },
        { status: 403 }
      );
    }

    // 3. Parse query parameters
    const { searchParams } = new URL(request.url);
    const daysParam = searchParams.get('days');
    const days = daysParam ? parseInt(daysParam, 10) : 30;

    const startDate = subDays(new Date(), days);

    // 4. Get UTM statistics
    // Users by source
    const usersBySource = await db.user.groupBy({
      by: ['utmSource'],
      where: {
        createdAt: { gte: startDate },
        utmSource: { not: null },
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    // Users by campaign
    const usersByCampaign = await db.user.groupBy({
      by: ['utmCampaign'],
      where: {
        createdAt: { gte: startDate },
        utmCampaign: { not: null },
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    // Users by medium
    const usersByMedium = await db.user.groupBy({
      by: ['utmMedium'],
      where: {
        createdAt: { gte: startDate },
        utmMedium: { not: null },
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    // 5. Get total counts
    const totalUsersWithUtm = await db.user.count({
      where: {
        createdAt: { gte: startDate },
        OR: [
          { utmSource: { not: null } },
          { utmCampaign: { not: null } },
        ],
      },
    });

    const totalUsersInPeriod = await db.user.count({
      where: {
        createdAt: { gte: startDate },
      },
    });

    // 6. Get conversion data (users with UTM who have subscriptions)
    const convertedUsersWithUtm = await db.user.count({
      where: {
        createdAt: { gte: startDate },
        utmSource: { not: null },
        subscriptions: {
          plan: { in: ['PRO', 'TEAM'] },
        },
      },
    });

    // 7. Get recent UTM users for detail view
    const recentUtmUsers = await db.user.findMany({
      where: {
        createdAt: { gte: startDate },
        utmSource: { not: null },
      },
      select: {
        id: true,
        email: true,
        name: true,
        utmSource: true,
        utmMedium: true,
        utmCampaign: true,
        createdAt: true,
        subscriptions: {
          select: { plan: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json(
      {
        period: {
          days,
          startDate: startDate.toISOString(),
          endDate: new Date().toISOString(),
        },
        summary: {
          totalUsersInPeriod,
          totalUsersWithUtm,
          attributionRate: totalUsersInPeriod > 0
            ? ((totalUsersWithUtm / totalUsersInPeriod) * 100).toFixed(1)
            : 0,
          convertedUsersWithUtm,
          conversionRate: totalUsersWithUtm > 0
            ? ((convertedUsersWithUtm / totalUsersWithUtm) * 100).toFixed(1)
            : 0,
        },
        bySource: usersBySource.map(s => ({
          source: s.utmSource,
          count: s._count.id,
        })),
        byCampaign: usersByCampaign.map(c => ({
          campaign: c.utmCampaign,
          count: c._count.id,
        })),
        byMedium: usersByMedium.map(m => ({
          medium: m.utmMedium,
          count: m._count.id,
        })),
        recentUsers: recentUtmUsers.map(u => ({
          id: u.id,
          email: u.email,
          name: u.name,
          source: u.utmSource,
          medium: u.utmMedium,
          campaign: u.utmCampaign,
          createdAt: u.createdAt.toISOString(),
          plan: u.subscriptions?.plan || 'FREE',
        })),
        generatedAt: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('[ADMIN API] Error fetching UTM statistics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch UTM statistics' },
      { status: 500 }
    );
  }
}
