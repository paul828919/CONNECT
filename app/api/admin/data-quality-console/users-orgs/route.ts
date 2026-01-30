import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PROFILE_COMPLETENESS_FIELDS = [
  'name',
  'description',
  'website',
  'industrySector',
  'employeeCount',
  'revenueRange',
  'technologyReadinessLevel',
  'primaryContactName',
  'primaryContactEmail',
  'address',
  'primaryBusinessDomain',
  'certifications',
  'businessEstablishedDate',
  'companyScaleType',
  'companyProfileDescription',
] as const;

const TOTAL_FIELDS = PROFILE_COMPLETENESS_FIELDS.length; // 15

function computeProfileCompleteness(org: any): { percent: number; filled: number; total: number } {
  if (!org) return { percent: 0, filled: 0, total: TOTAL_FIELDS };
  let filled = 0;
  for (const field of PROFILE_COMPLETENESS_FIELDS) {
    const value = org[field];
    if (value === null || value === undefined) continue;
    if (Array.isArray(value)) {
      if (value.length > 0) filled++;
    } else {
      filled++;
    }
  }
  return { percent: Math.round((filled / TOTAL_FIELDS) * 100), filled, total: TOTAL_FIELDS };
}

/** Convert BigInt/Decimal to JSON-safe types */
function serializeRow(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return Number(obj);
  if (typeof obj === 'object' && obj.constructor?.name === 'Decimal') return Number(obj);
  if (obj instanceof Date) return obj.toISOString();
  if (Array.isArray(obj)) return obj.map(serializeRow);
  if (typeof obj === 'object') {
    const out: any = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = serializeRow(v);
    }
    return out;
  }
  return obj;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if ((session.user as any).role !== 'ADMIN' && (session.user as any).role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
    const skip = (page - 1) * limit;

    const role = searchParams.get('role');
    const orgType = searchParams.get('orgType');
    const profileCompleted = searchParams.get('profileCompleted');
    const subscriptionPlan = searchParams.get('subscriptionPlan');
    const orgStatus = searchParams.get('orgStatus');

    // Build where clause
    const where: any = {};

    if (role) where.role = role;
    if (orgType) where.organization = { ...where.organization, type: orgType };
    if (profileCompleted) {
      where.organization = {
        ...where.organization,
        profileCompleted: profileCompleted === 'true',
      };
    }
    if (orgStatus) {
      where.organization = { ...where.organization, status: orgStatus };
    }
    if (subscriptionPlan) {
      where.subscriptions = { plan: subscriptionPlan };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { organization: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // Query data and count in parallel
    const [data, totalCount] = await Promise.all([
      db.user.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
        include: {
          organization: true,
          subscriptions: {
            select: {
              plan: true,
              status: true,
              billingCycle: true,
              startedAt: true,
              expiresAt: true,
            },
          },
        },
      }),
      db.user.count({ where }),
    ]);

    // Compute stats
    const [totalUsers, totalAdmins, totalOrgs, profileCompletedCount, subBreakdown] =
      await Promise.all([
        db.user.count(),
        db.user.count({ where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } } }),
        db.organizations.count(),
        db.organizations.count({ where: { profileCompleted: true } }),
        db.subscriptions.groupBy({
          by: ['plan'],
          _count: { id: true },
        }),
      ]);

    const totalOrgsForPercent = await db.organizations.count();
    const profileCompletedPercent =
      totalOrgsForPercent > 0
        ? Math.round((profileCompletedCount / totalOrgsForPercent) * 100 * 100) / 100
        : 0;

    const subscriptionBreakdown: Record<string, number> = { FREE: 0, PRO: 0, TEAM: 0 };
    for (const row of subBreakdown) {
      subscriptionBreakdown[row.plan] = row._count.id;
    }

    // Add profileCompleteness to each user and serialize BigInt/Decimal
    const dataWithCompleteness = data.map((user) => ({
      ...serializeRow(user),
      profileCompleteness: computeProfileCompleteness(user.organization),
    }));

    return NextResponse.json({
      data: dataWithCompleteness,
      totalCount,
      page,
      limit,
      stats: {
        totalUsers,
        totalAdmins,
        totalOrgs,
        profileCompletedPercent,
        subscriptionBreakdown,
      },
    });
  } catch (error: any) {
    console.error('Error fetching users and organizations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
