/**
 * Partner Search API
 *
 * GET: Search for potential partner organizations
 * Filters: type, industry, keyword, trl, location
 * Pagination: page, limit
 * Sorting: compatibility, profile, name (default: compatibility)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import { db } from '@/lib/db';
import { OrganizationType } from '@prisma/client';
import { findIndustrySector, normalizeKoreanKeyword } from '@/lib/matching/taxonomy';
import { calculatePartnerCompatibility } from '@/lib/matching/partner-algorithm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Get user's full organization for compatibility calculation
    const userOrg = await db.organizations.findFirst({
      where: {
        users: {
          some: { id: userId },
        },
      },
    });

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const type = searchParams.get('type') as OrganizationType | null;
    const industry = searchParams.get('industry') || '';
    const minTrl = searchParams.get('minTrl') ? parseInt(searchParams.get('minTrl')!) : null;
    const maxTrl = searchParams.get('maxTrl') ? parseInt(searchParams.get('maxTrl')!) : null;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const sortBy = searchParams.get('sortBy') || 'compatibility'; // compatibility, profile, name

    // Build where clause
    const where: any = {
      status: 'ACTIVE',
      profileCompleted: true,
      // Exclude user's own organization
      ...(userOrg?.id && { NOT: { id: userOrg.id } }),
    };

    // Filter by type
    if (type) {
      where.type = type;
    }

    // Filter by industry (using taxonomy matching)
    if (industry) {
      const normalizedIndustry = normalizeKoreanKeyword(industry);
      const sector = findIndustrySector(industry);

      where.OR = [
        // Direct industry sector match
        {
          industrySector: {
            contains: industry,
            mode: 'insensitive',
          },
        },
        // Normalized match
        ...(sector
          ? [
              {
                industrySector: {
                  contains: sector,
                  mode: 'insensitive',
                },
              },
            ]
          : []),
        // Research focus areas match (for research institutes)
        {
          researchFocusAreas: {
            hasSome: [industry],
          },
        },
        // Key technologies match (for research institutes)
        {
          keyTechnologies: {
            hasSome: [industry],
          },
        },
      ];
    }

    // Filter by TRL range
    if (minTrl !== null || maxTrl !== null) {
      where.technologyReadinessLevel = {};
      if (minTrl !== null) {
        where.technologyReadinessLevel.gte = minTrl;
      }
      if (maxTrl !== null) {
        where.technologyReadinessLevel.lte = maxTrl;
      }
    }

    // Text search across multiple fields
    if (query) {
      const normalizedQuery = normalizeKoreanKeyword(query);

      where.OR = [
        ...(where.OR || []),
        {
          name: {
            contains: query,
            mode: 'insensitive',
          },
        },
        {
          description: {
            contains: query,
            mode: 'insensitive',
          },
        },
        {
          industrySector: {
            contains: query,
            mode: 'insensitive',
          },
        },
      ];
    }

    // Execute search - fetch all matching orgs first for compatibility calculation
    const skip = (page - 1) * limit;

    // Determine sort order based on sortBy parameter
    let orderBy: any = [];
    if (sortBy === 'profile') {
      orderBy = [{ profileScore: 'desc' }, { name: 'asc' }];
    } else if (sortBy === 'name') {
      orderBy = [{ name: 'asc' }];
    } else {
      // For compatibility sort, we'll calculate and sort in-memory
      orderBy = [{ profileScore: 'desc' }];
    }

    const [allOrganizations, total] = await Promise.all([
      db.organizations.findMany({
        where,
        select: {
          id: true,
          type: true,
          name: true,
          description: true,
          industrySector: true,
          employeeCount: true,
          technologyReadinessLevel: true,
          rdExperience: true,
          researchFocusAreas: true,
          keyTechnologies: true,
          logoUrl: true,
          createdAt: true,
          // Consortium preference fields for compatibility calculation
          desiredConsortiumFields: true,
          desiredTechnologies: true,
          targetPartnerTRL: true,
          commercializationCapabilities: true,
          expectedTRLLevel: true,
          targetOrgScale: true,
          targetOrgRevenue: true,
        },
        // For compatibility sort, fetch all and sort in-memory
        // For other sorts, use database sorting with pagination
        ...(sortBy === 'compatibility' ? {} : { skip, take: limit }),
        orderBy,
      }),
      db.organizations.count({ where }),
    ]);

    // Calculate compatibility for each organization
    const organizationsWithCompatibility = allOrganizations.map((org) => {
      let compatibility = null;

      if (userOrg) {
        try {
          const result = calculatePartnerCompatibility(userOrg, org as any);
          compatibility = {
            score: result.score,
            breakdown: result.breakdown,
            reasons: result.reasons.slice(0, 2), // Top 2 reasons for tooltip
            explanation: result.explanation,
          };
        } catch (error) {
          console.error('Compatibility calculation failed for org:', org.id, error);
        }
      }

      return {
        id: org.id,
        type: org.type,
        name: org.name,
        description: org.description,
        industrySector: org.industrySector,
        employeeCount: org.employeeCount,
        technologyReadinessLevel: org.technologyReadinessLevel,
        rdExperience: org.rdExperience,
        researchFocusAreas: org.researchFocusAreas,
        keyTechnologies: org.keyTechnologies,
        logoUrl: org.logoUrl,
        compatibility,
      };
    });

    // Sort by compatibility if requested
    let sortedOrganizations = organizationsWithCompatibility;
    if (sortBy === 'compatibility') {
      sortedOrganizations = organizationsWithCompatibility.sort((a, b) => {
        const scoreA = a.compatibility?.score ?? 0;
        const scoreB = b.compatibility?.score ?? 0;
        return scoreB - scoreA; // Descending order
      });
    }

    // Apply pagination for compatibility sort
    const paginatedOrganizations =
      sortBy === 'compatibility'
        ? sortedOrganizations.slice(skip, skip + limit)
        : sortedOrganizations;

    return NextResponse.json({
      success: true,
      data: {
        organizations: paginatedOrganizations,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: skip + paginatedOrganizations.length < total,
        },
      },
    });
  } catch (error: any) {
    console.error('Partner search failed:', error);
    return NextResponse.json(
      { error: 'Failed to search partners' },
      { status: 500 }
    );
  }
}
