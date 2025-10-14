/**
 * Consortium Members API
 *
 * POST: Invite a new member to consortium
 * PATCH: Update member details (role, budget)
 * DELETE: Remove member from consortium
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import { db } from '@/lib/db';
import { ConsortiumRole } from '@prisma/client';


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
    const consortiumId = params.id;

    // Fetch consortium and verify user is from lead organization
    const consortium = await db.consortium_projects.findUnique({
      where: { id: consortiumId },
      select: {
        leadOrganizationId: true,
        status: true,
        totalBudget: true,
        consortium_members: {
          select: {
            budgetShare: true,
          },
        },
      },
    });

    if (!consortium) {
      return NextResponse.json(
        { error: 'Consortium not found' },
        { status: 404 }
      );
    }

    // Get user's organization
    const user = await db.users.findUnique({
      where: { id: userId },
      select: { organizationId: true },
    });

    // Only lead organization can invite members
    if (consortium.leadOrganizationId !== user?.organizationId) {
      return NextResponse.json(
        { error: 'Only lead organization can invite members' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      organizationId,
      role,
      budgetShare,
      budgetPercent,
      responsibilities,
    } = body;

    // Validate input
    if (!organizationId || !role) {
      return NextResponse.json(
        { error: 'Organization ID and role are required' },
        { status: 400 }
      );
    }

    // Verify organization exists
    const targetOrg = await db.organizations.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true, status: true },
    });

    if (!targetOrg) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    if (targetOrg.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Cannot invite inactive organization' },
        { status: 400 }
      );
    }

    // Check if organization is already a member
    const existingMember = await db.consortium_members.findUnique({
      where: {
        consortiumId_organizationId: {
          consortiumId,
          organizationId,
        },
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: 'Organization is already a member of this consortium' },
        { status: 400 }
      );
    }

    // Validate budget allocation if provided
    if (budgetShare && consortium.totalBudget) {
      const totalAllocated = consortium.consortium_members.reduce(
        (sum: number, m: any) => sum + (m.budgetShare ? Number(m.budgetShare) : 0),
        0
      );

      if (totalAllocated + Number(budgetShare) > Number(consortium.totalBudget)) {
        return NextResponse.json(
          { error: 'Total budget allocation would exceed consortium total budget' },
          { status: 400 }
        );
      }
    }

    // Create member invitation
    const { createId } = await import('@paralleldrive/cuid2');
    const member = await db.consortium_members.create({
      data: {
        id: createId(),
        consortiumId,
        organizationId,
        invitedById: userId,
        role: role as ConsortiumRole,
        budgetShare: budgetShare ? BigInt(budgetShare) : null,
        budgetPercent: budgetPercent || null,
        responsibilities: responsibilities?.trim() || null,
        status: 'INVITED',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      include: {
        organizations: {
          select: {
            id: true,
            name: true,
            type: true,
            logoUrl: true,
          },
        },
      },
    });

    // TODO: Send email notification to organization about invitation
    // This would use the email notification system from Phase 3A

    return NextResponse.json({
      success: true,
      member,
      message: '멤버 초대를 전송했습니다',
    });
  } catch (error: any) {
    console.error('Failed to invite consortium member:', error);
    return NextResponse.json(
      { error: 'Failed to invite consortium member' },
      { status: 500 }
    );
  }
}
