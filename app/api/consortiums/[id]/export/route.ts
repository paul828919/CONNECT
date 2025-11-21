/**
 * Consortium Export API
 *
 * GET: Export consortium details (members, budget breakdown, etc.)
 * Returns JSON format (can be extended to PDF/Excel later)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';


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

    // Fetch consortium with all details
    const consortium = await db.consortium_projects.findUnique({
      where: { id: consortiumId },
      include: {
        organizations: {
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
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        funding_programs: {
          select: {
            id: true,
            agencyId: true,
            title: true,
            deadline: true,
            budgetAmount: true,
            announcementUrl: true,
          },
        },
        consortium_members: {
          where: {
            status: 'ACCEPTED', // Only include accepted members
          },
          include: {
            organizations: {
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
    }) as Prisma.consortium_projectsGetPayload<{
      include: {
        organizations: {
          select: {
            id: true;
            name: true;
            type: true;
            businessStructure: true;
            industrySector: true;
            employeeCount: true;
            primaryContactName: true;
            primaryContactEmail: true;
            primaryContactPhone: true;
            address: true;
          };
        };
        user: {
          select: {
            name: true;
            email: true;
          };
        };
        funding_programs: {
          select: {
            id: true;
            agencyId: true;
            title: true;
            deadline: true;
            budgetAmount: true;
            announcementUrl: true;
          };
        };
        consortium_members: {
          include: {
            organizations: {
              select: {
                id: true;
                name: true;
                type: true;
                businessStructure: true;
                industrySector: true;
                employeeCount: true;
                technologyReadinessLevel: true;
                rdExperience: true;
                researchFocusAreas: true;
                primaryContactName: true;
                primaryContactEmail: true;
                primaryContactPhone: true;
                address: true;
              };
            };
          };
        };
      };
    }> | null;

    if (!consortium) {
      return NextResponse.json(
        { error: 'Consortium not found' },
        { status: 404 }
      );
    }

    // Verify user's organization is a member
    const isMember = consortium.consortium_members.some(
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
      allocated: consortium.consortium_members.reduce(
        (sum: number, m: any) => sum + (m.budgetShare ? Number(m.budgetShare) : 0),
        0
      ),
      unallocated: 0,
      breakdown: consortium.consortium_members.map((m: any) => ({
        organization: m.organizations.name,
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
      targetProgram: consortium.funding_programs
        ? {
            agency: consortium.funding_programs.agencyId,
            title: consortium.funding_programs.title,
            deadline: consortium.funding_programs.deadline,
            budget: consortium.funding_programs.budgetAmount
              ? Number(consortium.funding_programs.budgetAmount)
              : null,
            url: consortium.funding_programs.announcementUrl,
          }
        : null,

      // Lead Organization
      leadOrganization: {
        name: consortium.organizations.name,
        type: consortium.organizations.type,
        industry: consortium.organizations.industrySector,
        contact: {
          name: consortium.organizations.primaryContactName,
          email: consortium.organizations.primaryContactEmail,
          phone: consortium.organizations.primaryContactPhone,
        },
        address: consortium.organizations.address,
      },

      // Member Organizations
      members: consortium.consortium_members.map((m: any) => ({
        organization: {
          name: m.organizations.name,
          type: m.organizations.type,
          industry: m.organizations.industrySector,
          employeeCount: m.organizations.employeeCount,
          trl: m.organizations.technologyReadinessLevel,
          rdExperience: m.organizations.rdExperience,
          researchFocus: m.organizations.researchFocusAreas,
          contact: {
            name: m.organizations.primaryContactName,
            email: m.organizations.primaryContactEmail,
            phone: m.organizations.primaryContactPhone,
          },
          address: m.organizations.address,
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
        memberCount: consortium.consortium_members.length,
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
