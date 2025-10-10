/**
 * Partner Search API
 *
 * GET: Search for potential partner organizations
 * Filters: type, industry, keyword, trl, location
 * Pagination: page, limit
 * Sorting: relevance, name, createdAt
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import { PrismaClient, OrganizationType } from '@prisma/client';
import { findIndustrySector, normalizeKoreanKeyword } from '@/lib/matching/taxonomy';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Get user's organization to exclude from search
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true },
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

    // Build where clause
    const where: any = {
      status: 'ACTIVE',
      profileCompleted: true,
      // Exclude user's own organization
      ...(user?.organizationId && { NOT: { id: user.organizationId } }),
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

    // Execute search with pagination
    const skip = (page - 1) * limit;

    const [organizations, total] = await Promise.all([
      prisma.organization.findMany({
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
        },
        skip,
        take: limit,
        orderBy: [
          { profileScore: 'desc' }, // Higher profile score first
          { name: 'asc' },
        ],
      }),
      prisma.organization.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        organizations,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: skip + organizations.length < total,
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
