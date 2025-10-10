/**
 * Contact Request Response API
 *
 * POST: Respond to a contact request (accept or decline)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const requestId = params.id;

    // Get user's organization
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true },
    });

    if (!user?.organizationId) {
      return NextResponse.json(
        { error: 'No organization associated with user' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { action, responseMessage } = body; // action: 'accept' or 'decline'

    if (!action || !['accept', 'decline'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "accept" or "decline"' },
        { status: 400 }
      );
    }

    // Fetch the contact request
    const contactRequest = await prisma.contactRequest.findUnique({
      where: { id: requestId },
      include: {
        senderOrg: { select: { name: true } },
        receiverOrg: { select: { name: true } },
      },
    });

    if (!contactRequest) {
      return NextResponse.json(
        { error: 'Contact request not found' },
        { status: 404 }
      );
    }

    // Verify that the current user is from the receiver organization
    if (contactRequest.receiverOrgId !== user.organizationId) {
      return NextResponse.json(
        { error: 'You are not authorized to respond to this request' },
        { status: 403 }
      );
    }

    // Check if already responded
    if (contactRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'This request has already been responded to' },
        { status: 400 }
      );
    }

    // Update the contact request
    const updatedRequest = await prisma.contactRequest.update({
      where: { id: requestId },
      data: {
        status: action === 'accept' ? 'ACCEPTED' : 'DECLINED',
        responseMessage: responseMessage || null,
        respondedAt: new Date(),
      },
      include: {
        sender: {
          select: { name: true, email: true },
        },
        senderOrg: {
          select: { name: true, type: true, logoUrl: true },
        },
        receiverOrg: {
          select: { name: true, type: true, logoUrl: true },
        },
      },
    });

    // TODO: Send email notification to sender about response
    // This would use the email notification system from Phase 3A

    return NextResponse.json({
      success: true,
      contactRequest: updatedRequest,
      message:
        action === 'accept'
          ? '협력 요청을 수락했습니다'
          : '협력 요청을 거절했습니다',
    });
  } catch (error: any) {
    console.error('Failed to respond to contact request:', error);
    return NextResponse.json(
      { error: 'Failed to respond to contact request' },
      { status: 500 }
    );
  }
}
