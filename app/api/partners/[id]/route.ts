/**
 * Public Organization Profile API (Enhanced with Compatibility Scoring)
 *
 * GET: Fetch public organization profile with compatibility score
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import { db } from '@/lib/db';
import { calculatePartnerCompatibility } from '@/lib/matching/partner-algorithm';


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
    const organization = await db.organizations.findUnique({
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

        // Contact information (public)
        primaryContactName: true,
        primaryContactEmail: true,

        // Trust & Credentials (Priority 1)
        certifications: true,
        governmentCertifications: true,
        industryAwards: true,
        patentCount: true,

        // Track Record (Priority 2)
        businessEstablishedDate: true,
        collaborationCount: true,
        priorGrantWins: true,
        priorGrantTotalAmount: true,

        // Consortium Preferences (Priority 4)
        desiredConsortiumFields: true,
        desiredTechnologies: true,
        targetPartnerTRL: true,
        commercializationCapabilities: true,
        expectedTRLLevel: true,
        targetOrgScale: true,
        targetOrgRevenue: true,

        // Investment History (Priority 3)
        investmentHistory: true,

        // Additional Fields (Priority 5)
        address: true,
        rdInvestmentRatio: true,
        lastFinancialYear: true,

        // Profile metadata
        profileScore: true,
        createdAt: true,

        // Relations (counts only, for privacy)
        _count: {
          select: {
            funding_matches: true,
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

    // Fetch full organization data for status check and compatibility calculation
    const fullOrg = await db.organizations.findUnique({
      where: { id: organizationId },
    });

    if (!fullOrg || fullOrg.status !== 'ACTIVE' || !fullOrg.profileCompleted) {
      return NextResponse.json(
        { error: 'Organization profile is not publicly visible' },
        { status: 403 }
      );
    }

    // Calculate compatibility score with user's organization
    let compatibilityScore = null;
    const userId = (session.user as any).id;

    // Fetch user's organization with all fields needed for compatibility calculation
    const userOrg = await db.organizations.findFirst({
      where: {
        users: {
          some: { id: userId },
        },
      },
    });

    if (userOrg && userOrg.id !== organizationId) {
      // Calculate compatibility using partner algorithm
      const compatibility = calculatePartnerCompatibility(userOrg, fullOrg);
      compatibilityScore = {
        score: compatibility.score,
        breakdown: compatibility.breakdown,
        reasons: compatibility.reasons,
        explanation: compatibility.explanation,
      };
    }

    // Fetch visible team members (users who opted-in to show on partner profile)
    const visibleTeamMembers = await db.user.findMany({
      where: {
        organizationId: organizationId,
        showOnPartnerProfile: true,
      },
      select: {
        id: true,
        name: true,
        position: true,
        linkedinUrl: true,
        rememberUrl: true,
        // Note: email is NOT selected for privacy protection
      },
    });

    return NextResponse.json({
      success: true,
      organization,
      compatibilityScore,
      visibleTeamMembers,
    });
  } catch (error: any) {
    console.error('Failed to fetch organization profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organization profile' },
      { status: 500 }
    );
  }
}
