/**
 * Admin API: Update eligibility review for a specific program
 * PATCH /api/admin/eligibility-review/:id
 *
 * Access: ADMIN or SUPER_ADMIN only
 *
 * Body:
 * {
 *   action: 'APPROVE' | 'REJECT' | 'REQUEST_INFO',
 *   reviewNotes: string (required),
 *   newConfidence: 'LOW' | 'MEDIUM' | 'HIGH',
 *   manualReviewRequired: boolean (keep flagged if requesting more info)
 * }
 *
 * Actions:
 * - APPROVE: Set confidence to newConfidence, mark review as completed
 * - REJECT: Set confidence to LOW, mark review as completed
 * - REQUEST_INFO: Keep manualReviewRequired=true, update notes
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import { PrismaClient, ConfidenceLevel } from '@prisma/client';
import { notifyEligibilityVerification } from '@/lib/notifications/eligibility-verified';

// Force dynamic rendering (prevents static generation errors)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Direct Prisma Client instantiation (bypasses lib/db module resolution issue)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error'],
  });

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = db;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Authentication and authorization check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check for ADMIN or SUPER_ADMIN role
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, name: true, email: true },
    });

    if (user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Access denied - Admin privileges required' },
        { status: 403 }
      );
    }

    // 2. Parse request body
    const body = await request.json();
    const { action, reviewNotes, newConfidence, manualReviewRequired } = body;

    // Validate required fields
    if (!action || !reviewNotes) {
      return NextResponse.json(
        { error: 'Missing required fields: action, reviewNotes' },
        { status: 400 }
      );
    }

    if (!['APPROVE', 'REJECT', 'REQUEST_INFO'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be APPROVE, REJECT, or REQUEST_INFO' },
        { status: 400 }
      );
    }

    // 3. Check if program exists
    const program = await db.funding_programs.findUnique({
      where: { id: params.id },
      select: { id: true, title: true },
    });

    if (!program) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 });
    }

    // 4. Build update data based on action
    const updateData: any = {
      manualReviewNotes: reviewNotes,
      eligibilityLastUpdated: new Date(),
    };

    const reviewerName = user.name || user.email || 'Unknown Admin';

    if (action === 'APPROVE') {
      // APPROVE: Mark as completed with updated confidence
      updateData.eligibilityConfidence = newConfidence as ConfidenceLevel;
      updateData.manualReviewRequired = false;
      updateData.manualReviewCompletedAt = new Date();
      updateData.manualReviewCompletedBy = reviewerName;
    } else if (action === 'REJECT') {
      // REJECT: Set to LOW confidence and mark as completed
      updateData.eligibilityConfidence = 'LOW';
      updateData.manualReviewRequired = false;
      updateData.manualReviewCompletedAt = new Date();
      updateData.manualReviewCompletedBy = reviewerName;
    } else if (action === 'REQUEST_INFO') {
      // REQUEST_INFO: Keep flagged for further review
      updateData.manualReviewRequired = true;
      updateData.eligibilityConfidence = newConfidence || 'LOW';
      // Do NOT mark as completed - still needs review
    }

    // 5. Update program
    const updatedProgram = await db.funding_programs.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        title: true,
        eligibilityConfidence: true,
        manualReviewRequired: true,
        manualReviewNotes: true,
        manualReviewCompletedAt: true,
        manualReviewCompletedBy: true,
      },
    });

    // 6. Log audit trail
    await db.audit_logs.create({
      data: {
        userId: session.user.id,
        action: `ELIGIBILITY_REVIEW_${action}`,
        resourceType: 'funding_programs',
        resourceId: params.id,
        purpose: `Manual eligibility review: ${action} - ${reviewNotes.substring(0, 50)}`,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      },
    });

    // 7. Send notifications to affected users (async, don't block response)
    if (action === 'APPROVE' || action === 'REJECT') {
      // Don't await - run in background
      notifyEligibilityVerification({
        programId: params.id,
        programTitle: program.title,
        newConfidence: updateData.eligibilityConfidence,
        reviewAction: action,
        reviewNotes,
      }).catch((error) => {
        console.error('[Eligibility Review] Failed to send notifications:', error);
      });
    }

    return NextResponse.json(
      {
        success: true,
        program: updatedProgram,
        message: `Program review ${action.toLowerCase()}d successfully`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating eligibility review:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
