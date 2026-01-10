/**
 * Consortium Detail API
 *
 * GET: Fetch single consortium project by ID
 * PATCH: Update consortium project (Lead organization only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import { db } from '@/lib/db';

export async function GET(
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

    // Get user's organization and subscription
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        organizationId: true,
        subscriptions: {
          select: {
            plan: true,
            status: true,
          },
        },
      },
    });

    if (!user?.organizationId) {
      return NextResponse.json(
        { error: 'No organization associated with user' },
        { status: 400 }
      );
    }

    // Check subscription - Consortium is Pro/Team only
    const subscriptionPlan = (user.subscriptions?.status === 'ACTIVE' || user.subscriptions?.status === 'TRIAL')
      ? (user.subscriptions.plan?.toLowerCase() || 'free')
      : 'free';

    if (subscriptionPlan === 'free') {
      return NextResponse.json(
        {
          error: 'UPGRADE_REQUIRED',
          message: '컨소시엄 기능은 Pro 이상 플랜에서 사용 가능합니다.',
          upgradeUrl: '/pricing',
        },
        { status: 403 }
      );
    }

    // Fetch consortium with full details
    const consortium = await db.consortium_projects.findUnique({
      where: { id: consortiumId },
      include: {
        organizations: {
          select: {
            id: true,
            name: true,
            type: true,
            logoUrl: true,
          },
        },
        funding_programs: {
          select: {
            id: true,
            title: true,
            agencyId: true,
            deadline: true,
          },
        },
        consortium_members: {
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
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!consortium) {
      return NextResponse.json(
        { error: 'Consortium not found' },
        { status: 404 }
      );
    }

    // Verify user has access to this consortium
    // User must be either lead organization or a member
    const hasAccess =
      consortium.leadOrganizationId === user.organizationId ||
      consortium.consortium_members.some(
        (member) => member.organizationId === user.organizationId
      );

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You do not have access to this consortium' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      consortium,
    });
  } catch (error: any) {
    console.error('Failed to fetch consortium:', error);
    return NextResponse.json(
      { error: 'Failed to fetch consortium' },
      { status: 500 }
    );
  }
}

export async function PATCH(
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

    // Get user's organization and subscription
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        organizationId: true,
        subscriptions: {
          select: {
            plan: true,
            status: true,
          },
        },
      },
    });

    if (!user?.organizationId) {
      return NextResponse.json(
        { error: 'No organization associated with user' },
        { status: 400 }
      );
    }

    // Check subscription - Consortium is Pro/Team only
    const subscriptionPlan = (user.subscriptions?.status === 'ACTIVE' || user.subscriptions?.status === 'TRIAL')
      ? (user.subscriptions.plan?.toLowerCase() || 'free')
      : 'free';

    if (subscriptionPlan === 'free') {
      return NextResponse.json(
        {
          error: 'UPGRADE_REQUIRED',
          message: '컨소시엄 기능은 Pro 이상 플랜에서 사용 가능합니다.',
          upgradeUrl: '/pricing',
        },
        { status: 403 }
      );
    }

    // Fetch existing consortium
    const existingConsortium = await db.consortium_projects.findUnique({
      where: { id: consortiumId },
      select: {
        id: true,
        leadOrganizationId: true,
        status: true,
      },
    });

    if (!existingConsortium) {
      return NextResponse.json(
        { error: 'Consortium not found' },
        { status: 404 }
      );
    }

    // Only lead organization can edit
    if (existingConsortium.leadOrganizationId !== user.organizationId) {
      return NextResponse.json(
        { error: 'Only lead organization can edit consortium' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      name,
      description,
      targetProgramId,
      totalBudget,
      projectDuration,
      startDate,
      endDate,
      status,
      leadOrganizationId,
      memberUpdates,
    } = body;

    // Prepare update data with type-safe conversions
    const updateData: any = {};

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (targetProgramId !== undefined) updateData.targetProgramId = targetProgramId;
    if (projectDuration !== undefined) updateData.projectDuration = projectDuration;
    if (status !== undefined) updateData.status = status;

    // Handle lead organization change
    if (leadOrganizationId !== undefined && leadOrganizationId !== existingConsortium.leadOrganizationId) {
      // Verify the new lead organization is a member of the consortium
      const newLeadMember = await db.consortium_members.findFirst({
        where: {
          consortiumId,
          organizationId: leadOrganizationId,
          status: 'ACCEPTED',
        },
      });

      if (!newLeadMember) {
        return NextResponse.json(
          { error: 'New lead organization must be an accepted member of the consortium' },
          { status: 400 }
        );
      }

      updateData.leadOrganizationId = leadOrganizationId;
    }

    // Handle BigInt for totalBudget
    if (totalBudget !== undefined) {
      updateData.totalBudget = totalBudget !== null ? BigInt(totalBudget) : null;
    }

    // Handle DateTime conversions
    if (startDate !== undefined) {
      updateData.startDate = startDate ? new Date(startDate) : null;
    }
    if (endDate !== undefined) {
      updateData.endDate = endDate ? new Date(endDate) : null;
    }

    // Update member budgets and roles if provided
    if (memberUpdates && Array.isArray(memberUpdates)) {
      for (const memberUpdate of memberUpdates) {
        const { memberId, budgetShare, role } = memberUpdate;
        if (memberId) {
          const memberUpdateData: any = {};
          if (budgetShare !== undefined) {
            memberUpdateData.budgetShare = budgetShare !== null ? BigInt(budgetShare) : null;
          }
          if (role !== undefined) {
            memberUpdateData.role = role;
          }

          if (Object.keys(memberUpdateData).length > 0) {
            await db.consortium_members.update({
              where: { id: memberId },
              data: memberUpdateData,
            });
          }
        }
      }
    }

    // Update consortium
    const updatedConsortium = await db.consortium_projects.update({
      where: { id: consortiumId },
      data: updateData,
      include: {
        organizations: {
          select: {
            id: true,
            name: true,
            type: true,
            logoUrl: true,
          },
        },
        funding_programs: {
          select: {
            id: true,
            title: true,
            agencyId: true,
            deadline: true,
          },
        },
        consortium_members: {
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
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    // Convert BigInt to string for JSON serialization
    const serializedConsortium = {
      ...updatedConsortium,
      totalBudget: updatedConsortium.totalBudget?.toString() || null,
      consortium_members: updatedConsortium.consortium_members.map((member) => ({
        ...member,
        budgetShare: member.budgetShare?.toString() || null,
      })),
    };

    return NextResponse.json({
      success: true,
      consortium: serializedConsortium,
      message: 'Consortium updated successfully',
    });
  } catch (error: any) {
    console.error('Failed to update consortium:', error);
    return NextResponse.json(
      { error: 'Failed to update consortium' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    // Get user's organization and subscription
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        organizationId: true,
        subscriptions: {
          select: {
            plan: true,
            status: true,
          },
        },
      },
    });

    if (!user?.organizationId) {
      return NextResponse.json(
        { error: 'No organization associated with user' },
        { status: 400 }
      );
    }

    // Check subscription - Consortium is Pro/Team only
    const subscriptionPlan = (user.subscriptions?.status === 'ACTIVE' || user.subscriptions?.status === 'TRIAL')
      ? (user.subscriptions.plan?.toLowerCase() || 'free')
      : 'free';

    if (subscriptionPlan === 'free') {
      return NextResponse.json(
        {
          error: 'UPGRADE_REQUIRED',
          message: '컨소시엄 기능은 Pro 이상 플랜에서 사용 가능합니다.',
          upgradeUrl: '/pricing',
        },
        { status: 403 }
      );
    }

    // Fetch existing consortium
    const existingConsortium = await db.consortium_projects.findUnique({
      where: { id: consortiumId },
      select: {
        id: true,
        name: true,
        leadOrganizationId: true,
        status: true,
      },
    });

    if (!existingConsortium) {
      return NextResponse.json(
        { error: 'Consortium not found' },
        { status: 404 }
      );
    }

    // Only lead organization can delete
    if (existingConsortium.leadOrganizationId !== user.organizationId) {
      return NextResponse.json(
        { error: 'Only lead organization can delete consortium' },
        { status: 403 }
      );
    }

    // Delete consortium (members will be cascade deleted automatically)
    await db.consortium_projects.delete({
      where: { id: consortiumId },
    });

    return NextResponse.json({
      success: true,
      message: `Consortium "${existingConsortium.name}" deleted successfully`,
    });
  } catch (error: any) {
    console.error('Failed to delete consortium:', error);
    return NextResponse.json(
      { error: 'Failed to delete consortium' },
      { status: 500 }
    );
  }
}
