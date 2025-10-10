/**
 * Public Organization Profile API
 *
 * GET: Fetch public organization profile (visible to authenticated users)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organizationId = params.id;

    // Fetch organization with public information only
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        type: true,
        name: true,
        description: true,
        website: true,
        logoUrl: true,

        // Company-specific fields (public subset)
        industrySector: true,
        employeeCount: true,
        revenueRange: true,
        rdExperience: true,
        technologyReadinessLevel: true,

        // Research Institute-specific fields (public subset)
        instituteType: true,
        researchFocusAreas: true,
        annualRdBudget: true,
        researcherCount: true,
        keyTechnologies: true,
        collaborationHistory: true,

        // Contact information (public)
        primaryContactName: true,
        primaryContactEmail: true,

        // Profile metadata
        profileScore: true,
        createdAt: true,

        // Relations (counts only, for privacy)
        _count: {
          select: {
            matches: true,
            leadConsortiums: true,
            consortiumMemberships: true,
          },
        },
      },
    });

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Check if organization profile is visible (active and completed)
    const fullOrg = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { status: true, profileCompleted: true },
    });

    if (fullOrg?.status !== 'ACTIVE' || !fullOrg?.profileCompleted) {
      return NextResponse.json(
        { error: 'Organization profile is not publicly visible' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      organization,
    });
  } catch (error: any) {
    console.error('Failed to fetch organization profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organization profile' },
      { status: 500 }
    );
  }
}
