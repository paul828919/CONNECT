/**
 * Consortium Export API
 *
 * GET: Export consortium details (members, budget breakdown, etc.)
 * Returns JSON format (can be extended to PDF/Excel later)
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

    const userId = (session.user as any).id;
    const consortiumId = params.id;

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

    // Fetch consortium with all details
    const consortium = await prisma.consortiumProject.findUnique({
      where: { id: consortiumId },
      include: {
        leadOrganization: {
          select: {
            id: true,
            name: true,
            type: true,
            businessStructure: true,
            industrySector: true,
            employeeCount: true,
            primaryContactName: true,
            primaryContactEmail: true,
            primaryContactPhone: true,
            address: true,
          },
        },
        createdBy: {
          select: {
            name: true,
            email: true,
          },
        },
        targetProgram: {
          select: {
            id: true,
            agencyId: true,
            title: true,
            deadline: true,
            budgetAmount: true,
            announcementUrl: true,
          },
        },
        members: {
          where: {
            status: 'ACCEPTED', // Only include accepted members
          },
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                type: true,
                businessStructure: true,
                industrySector: true,
                employeeCount: true,
                technologyReadinessLevel: true,
                rdExperience: true,
                researchFocusAreas: true,
                primaryContactName: true,
                primaryContactEmail: true,
                primaryContactPhone: true,
                address: true,
              },
            },
          },
          orderBy: [
            { role: 'asc' }, // LEAD first, then PARTICIPANT, then SUBCONTRACTOR
            { createdAt: 'asc' },
          ],
        },
      },
    });

    if (!consortium) {
      return NextResponse.json(
        { error: 'Consortium not found' },
        { status: 404 }
      );
    }

    // Verify user's organization is a member
    const isMember = consortium.members.some(
      (m) => m.organizationId === user.organizationId
    );

    if (
      consortium.leadOrganizationId !== user.organizationId &&
      !isMember
    ) {
      return NextResponse.json(
        { error: 'You are not authorized to export this consortium' },
        { status: 403 }
      );
    }

    // Calculate budget summary
    const budgetSummary = {
      total: consortium.totalBudget ? Number(consortium.totalBudget) : 0,
      allocated: consortium.members.reduce(
        (sum, m) => sum + (m.budgetShare ? Number(m.budgetShare) : 0),
        0
      ),
      unallocated: 0,
      breakdown: consortium.members.map((m) => ({
        organization: m.organization.name,
        role: m.role,
        amount: m.budgetShare ? Number(m.budgetShare) : 0,
        percent: m.budgetPercent || 0,
      })),
    };

    budgetSummary.unallocated = budgetSummary.total - budgetSummary.allocated;

    // Format export data
    const exportData = {
      // Consortium Info
      consortium: {
        id: consortium.id,
        name: consortium.name,
        description: consortium.description,
        status: consortium.status,
        createdAt: consortium.createdAt,
        updatedAt: consortium.updatedAt,
      },

      // Target Program Info
      targetProgram: consortium.targetProgram
        ? {
            agency: consortium.targetProgram.agencyId,
            title: consortium.targetProgram.title,
            deadline: consortium.targetProgram.deadline,
            budget: consortium.targetProgram.budgetAmount
              ? Number(consortium.targetProgram.budgetAmount)
              : null,
            url: consortium.targetProgram.announcementUrl,
          }
        : null,

      // Lead Organization
      leadOrganization: {
        name: consortium.leadOrganization.name,
        type: consortium.leadOrganization.type,
        industry: consortium.leadOrganization.industrySector,
        contact: {
          name: consortium.leadOrganization.primaryContactName,
          email: consortium.leadOrganization.primaryContactEmail,
          phone: consortium.leadOrganization.primaryContactPhone,
        },
        address: consortium.leadOrganization.address,
      },

      // Member Organizations
      members: consortium.members.map((m) => ({
        organization: {
          name: m.organization.name,
          type: m.organization.type,
          industry: m.organization.industrySector,
          employeeCount: m.organization.employeeCount,
          trl: m.organization.technologyReadinessLevel,
          rdExperience: m.organization.rdExperience,
          researchFocus: m.organization.researchFocusAreas,
          contact: {
            name: m.organization.primaryContactName,
            email: m.organization.primaryContactEmail,
            phone: m.organization.primaryContactPhone,
          },
          address: m.organization.address,
        },
        role: m.role,
        responsibilities: m.responsibilities,
        budgetShare: m.budgetShare ? Number(m.budgetShare) : null,
        budgetPercent: m.budgetPercent,
        joinedAt: m.respondedAt,
      })),

      // Budget Summary
      budget: budgetSummary,

      // Project Details
      project: {
        duration: consortium.projectDuration,
        startDate: consortium.startDate,
        endDate: consortium.endDate,
        totalBudget: consortium.totalBudget ? Number(consortium.totalBudget) : null,
      },

      // Metadata
      metadata: {
        exportedAt: new Date(),
        exportedBy: {
          name: session.user.name,
          email: session.user.email,
        },
        memberCount: consortium.members.length,
      },
    };

    return NextResponse.json({
      success: true,
      data: exportData,
    });
  } catch (error: any) {
    console.error('Failed to export consortium:', error);
    return NextResponse.json(
      { error: 'Failed to export consortium' },
      { status: 500 }
    );
  }
}
