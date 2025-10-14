/**
 * Consortium Projects API
 *
 * GET: List user's consortium projects
 * POST: Create a new consortium project
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import { db } from '@/lib/db';


export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Get user's organization
    const user = await db.users.findUnique({
      where: { id: userId },
      select: { organizationId: true },
    });

    if (!user?.organizationId) {
      return NextResponse.json(
        { error: 'No organization associated with user' },
        { status: 400 }
      );
    }

    // Fetch consortiums where user's org is lead or member
    const consortiums = await db.consortium_projects.findMany({
      where: {
        OR: [
          { leadOrganizationId: user.organizationId },
          {
            consortium_members: {
              some: {
                organizationId: user.organizationId,
                status: { in: ['INVITED', 'ACCEPTED'] },
              },
            },
          },
        ],
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
        _count: {
          select: {
            consortium_members: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      consortiums,
    });
  } catch (error: any) {
    console.error('Failed to fetch consortiums:', error);
    return NextResponse.json(
      { error: 'Failed to fetch consortiums' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Get user's organization
    const user = await db.users.findUnique({
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
    const {
      name,
      description,
      targetProgramId,
      totalBudget,
      projectDuration,
      startDate,
      endDate,
    } = body;

    // Validate input
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Consortium name is required' },
        { status: 400 }
      );
    }

    // If targetProgramId is provided, verify it exists
    if (targetProgramId) {
      const program = await db.funding_programs.findUnique({
        where: { id: targetProgramId },
      });

      if (!program) {
        return NextResponse.json(
          { error: 'Target funding program not found' },
          { status: 404 }
        );
      }
    }

    // Create consortium project
    const { createId } = await import('@paralleldrive/cuid2');
    const consortium = await db.consortium_projects.create({
      data: {
        id: createId(),
        name: name.trim(),
        description: description?.trim() || null,
        targetProgramId: targetProgramId || null,
        leadOrganizationId: user.organizationId,
        createdById: userId,
        totalBudget: totalBudget ? BigInt(totalBudget) : null,
        projectDuration,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        status: 'DRAFT',
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
        funding_programs: {
          select: {
            id: true,
            title: true,
            agencyId: true,
            deadline: true,
          },
        },
      },
    });

    // Automatically add lead organization as a member with LEAD role
    await db.consortium_members.create({
      data: {
        id: createId(),
        consortiumId: consortium.id,
        organizationId: user.organizationId,
        invitedById: userId,
        role: 'LEAD',
        status: 'ACCEPTED', // Lead is automatically accepted
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      consortium,
      message: '컨소시엄 프로젝트가 생성되었습니다',
    });
  } catch (error: any) {
    console.error('Failed to create consortium:', error);
    return NextResponse.json(
      { error: 'Failed to create consortium' },
      { status: 500 }
    );
  }
}
