/**
 * Consortium Detail API
 *
 * GET: Fetch single consortium project by ID
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

    // Get user's organization
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { organizationId: true },
    });

    if (!user?.organizationId) {
      return NextResponse.json(
        { error: 'No organization associated with user' },
        { status: 400 }
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
