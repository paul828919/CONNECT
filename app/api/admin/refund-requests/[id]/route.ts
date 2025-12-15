/**
 * Admin Refund Request Detail & Update API
 *
 * GET /api/admin/refund-requests/[id] - Get single refund request
 * PATCH /api/admin/refund-requests/[id] - Update refund request status/notes
 *
 * Admin-only endpoint for processing individual refund requests
 *
 * Supported Actions:
 * - Approve: status → APPROVED, set approvedAt
 * - Reject: status → REJECTED, set rejectionReason, rejectedAt
 * - Mark Processing: status → PROCESSING, set processedAt
 * - Mark Completed: status → COMPLETED, set completedAt
 * - Add internal notes
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

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

    // 3. Fetch refund request by ID
    const refundRequest = await db.refundRequest.findUnique({
      where: { id },
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
        organization: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        processedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!refundRequest) {
      return NextResponse.json(
        { error: 'Refund request not found' },
        { status: 404 }
      );
    }

    // 4. Return refund request
    return NextResponse.json(
      {
        refundRequest,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Admin refund request detail error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch refund request',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

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

    const adminId = (session.user as any).id;

    // 3. Parse request body
    const body = await request.json();
    const { action, internalNotes, rejectionReason, actualRefundAmount } = body;

    // 4. Validate action
    const validActions = ['approve', 'reject', 'process', 'complete', 'update_notes'];
    if (action && !validActions.includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Valid actions: approve, reject, process, complete, update_notes' },
        { status: 400 }
      );
    }

    // 5. Fetch current refund request to validate state transitions
    const currentRequest = await db.refundRequest.findUnique({
      where: { id },
    });

    if (!currentRequest) {
      return NextResponse.json(
        { error: 'Refund request not found' },
        { status: 404 }
      );
    }

    // 6. Build update data based on action
    const updateData: any = {
      updatedAt: new Date(),
    };

    // Track admin who processed
    if (action && action !== 'update_notes') {
      updateData.processedByAdminId = adminId;
    }

    switch (action) {
      case 'approve':
        if (currentRequest.status !== 'PENDING') {
          return NextResponse.json(
            { error: 'Can only approve PENDING requests' },
            { status: 400 }
          );
        }
        updateData.status = 'APPROVED';
        updateData.approvedAt = new Date();
        break;

      case 'reject':
        if (currentRequest.status !== 'PENDING' && currentRequest.status !== 'APPROVED') {
          return NextResponse.json(
            { error: 'Can only reject PENDING or APPROVED requests' },
            { status: 400 }
          );
        }
        if (!rejectionReason) {
          return NextResponse.json(
            { error: 'rejectionReason is required for rejection' },
            { status: 400 }
          );
        }
        updateData.status = 'REJECTED';
        updateData.rejectedAt = new Date();
        updateData.rejectionReason = rejectionReason;
        break;

      case 'process':
        if (currentRequest.status !== 'APPROVED') {
          return NextResponse.json(
            { error: 'Can only process APPROVED requests' },
            { status: 400 }
          );
        }
        updateData.status = 'PROCESSING';
        updateData.processedAt = new Date();
        break;

      case 'complete':
        if (currentRequest.status !== 'PROCESSING') {
          return NextResponse.json(
            { error: 'Can only complete PROCESSING requests' },
            { status: 400 }
          );
        }
        updateData.status = 'COMPLETED';
        updateData.completedAt = new Date();
        break;

      case 'update_notes':
        // Just update notes, no status change
        break;
    }

    // Allow updating internal notes with any action
    if (internalNotes !== undefined) {
      updateData.internalNotes = internalNotes;
    }

    // Allow overriding refund amount if provided (for CS adjustments)
    if (actualRefundAmount !== undefined && typeof actualRefundAmount === 'number') {
      updateData.refundAmount = actualRefundAmount;
    }

    // 7. Update refund request
    const updatedRequest = await db.refundRequest.update({
      where: { id },
      data: updateData,
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
    });

    // 8. Return updated refund request
    return NextResponse.json(
      {
        success: true,
        refundRequest: updatedRequest,
        action,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Admin refund request update error:', error);

    // Handle not found error
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Refund request not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to update refund request',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
