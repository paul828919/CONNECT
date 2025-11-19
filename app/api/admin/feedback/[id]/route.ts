/**
 * Admin Feedback Detail & Update API
 *
 * GET /api/admin/feedback/[id] - Get single feedback
 * PATCH /api/admin/feedback/[id] - Update feedback status/notes
 *
 * Admin-only endpoint for managing individual feedback items
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
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

    // 3. Fetch feedback by ID
    const feedback = await db.feedback.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
          },
        },
      },
    });

    if (!feedback) {
      return NextResponse.json(
        { error: 'Feedback not found' },
        { status: 404 }
      );
    }

    // 4. Return feedback
    return NextResponse.json(
      {
        feedback,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('❌ Admin feedback detail error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch feedback',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
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

    // 3. Parse request body
    const body = await request.json();
    const { status, priority, adminNotes } = body;

    // 4. Validate inputs
    const validStatuses = ['NEW', 'IN_REVIEW', 'PLANNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
    const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status value' },
        { status: 400 }
      );
    }

    if (priority && !validPriorities.includes(priority)) {
      return NextResponse.json(
        { error: 'Invalid priority value' },
        { status: 400 }
      );
    }

    // 5. Build update data
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (status) {
      updateData.status = status;

      // Auto-set resolvedAt when status changes to RESOLVED or CLOSED
      if ((status === 'RESOLVED' || status === 'CLOSED') && !updateData.resolvedAt) {
        updateData.resolvedAt = new Date();
      }

      // Clear resolvedAt if status changes back to non-resolved
      if (status !== 'RESOLVED' && status !== 'CLOSED') {
        updateData.resolvedAt = null;
      }
    }

    if (priority) {
      updateData.priority = priority;
    }

    if (adminNotes !== undefined) {
      updateData.adminNotes = adminNotes;
    }

    // 6. Update feedback
    const updatedFeedback = await db.feedback.update({
      where: { id: params.id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // 7. Return updated feedback
    return NextResponse.json(
      {
        success: true,
        feedback: updatedFeedback,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('❌ Admin feedback update error:', error);

    // Handle not found error
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Feedback not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to update feedback',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
