/**
 * Admin Refund Requests Management API
 *
 * GET /api/admin/refund-requests
 *
 * Returns refund requests with filtering, search, and pagination
 * Admin-only endpoint for processing user refund requests
 *
 * Features:
 * - Filter by status (PENDING, APPROVED, PROCESSING, COMPLETED, REJECTED)
 * - Filter by reason category
 * - Search by user name/email
 * - Pagination support
 * - Summary statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // 1. Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Check if user is admin (ADMIN or SUPER_ADMIN)
    const userRole = (session.user as any).role;
    if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // 3. Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const reasonCategory = searchParams.get('reasonCategory');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

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

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (reasonCategory && reasonCategory !== 'ALL') {
      where.reasonCategory = reasonCategory;
    }

    if (search) {
      where.OR = [
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // 5. Get total count for pagination
    const totalCount = await db.refundRequest.count({ where });

    // 6. Fetch refund requests with filters
    const refundRequests = await db.refundRequest.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
        processedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { status: 'asc' }, // PENDING first
        { requestedAt: 'desc' }, // Most recent first
      ],
      skip,
      take: limit,
    });

    // 7. Get summary statistics
    const stats = await db.refundRequest.groupBy({
      by: ['status'],
      _count: true,
      _sum: {
        refundAmount: true,
      },
    });

    const statusCounts = {
      PENDING: 0,
      APPROVED: 0,
      PROCESSING: 0,
      COMPLETED: 0,
      REJECTED: 0,
    };

    let totalPendingAmount = 0;
    let totalCompletedAmount = 0;

    stats.forEach((stat) => {
      statusCounts[stat.status as keyof typeof statusCounts] = stat._count;
      if (stat.status === 'PENDING') {
        totalPendingAmount = stat._sum.refundAmount || 0;
      }
      if (stat.status === 'COMPLETED') {
        totalCompletedAmount = stat._sum.refundAmount || 0;
      }
    });

    // 8. Get today's request count
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = await db.refundRequest.count({
      where: {
        requestedAt: {
          gte: today,
        },
      },
    });

    // 9. Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasMore = page < totalPages;

    // 10. Return response
    return NextResponse.json(
      {
        refundRequests,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasMore,
        },
        stats: {
          statusCounts,
          todayCount,
          totalPendingAmount,
          totalCompletedAmount,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Admin refund requests fetch error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch refund requests',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
