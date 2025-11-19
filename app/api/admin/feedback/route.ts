/**
 * Admin Feedback Management API
 *
 * GET /api/admin/feedback
 *
 * Returns feedback submissions with filtering, search, and pagination
 * Admin-only endpoint for managing user feedback
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

    // 2. Check if user is admin
    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // 3. Get query parameters
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const priority = searchParams.get('priority');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
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

    if (category) {
      where.category = category;
    }

    if (priority) {
      where.priority = priority;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // 5. Get total count for pagination
    const totalCount = await db.feedback.count({ where });

    // 6. Fetch feedback with filters
    const feedbackList = await db.feedback.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [
        { priority: 'desc' }, // CRITICAL first
        { createdAt: 'desc' }, // Most recent first
      ],
      skip,
      take: limit,
    });

    // 7. Get summary statistics
    const stats = await db.feedback.groupBy({
      by: ['status'],
      _count: true,
    });

    const statusCounts = {
      NEW: 0,
      IN_REVIEW: 0,
      PLANNED: 0,
      IN_PROGRESS: 0,
      RESOLVED: 0,
      CLOSED: 0,
    };

    stats.forEach((stat) => {
      statusCounts[stat.status as keyof typeof statusCounts] = stat._count;
    });

    // 8. Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasMore = page < totalPages;

    // 9. Return response
    return NextResponse.json(
      {
        feedback: feedbackList,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasMore,
        },
        stats: statusCounts,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('❌ Admin feedback fetch error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch feedback',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
