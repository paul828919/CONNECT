import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { db } from '@/lib/db';
import { getCache, setCache } from '@/lib/cache/redis-cache';
import { calculatePartnerCompatibility } from '@/lib/matching/partner-algorithm';
import { headers } from 'next/headers';

// Force dynamic rendering - uses session/headers
export const dynamic = 'force-dynamic';

/**
 * GET /api/partners/recommendations
 *
 * Returns personalized partner recommendations based on:
 * - Complementary TRL ranges (opposite stages for synergy)
 * - Matching industries and technologies
 * - Organization scale compatibility
 * - Cached for 24 hours per user organization
 *
 * Query Parameters:
 * - page: number (default: 1)
 * - limit: number (default: 20, max: 50)
 *
 * Response:
 * {
 *   success: true,
 *   recommendations: Array<{
 *     organization: Organization,
 *     compatibility: { score, breakdown, reasons, explanation }
 *   }>,
 *   pagination: { page, limit, total, totalPages },
 *   cached: boolean,
 *   cacheExpiry: ISO timestamp
 * }
 */
export async function GET(request: NextRequest) {
  // Force dynamic rendering
  headers();

  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const offset = (page - 1) * limit;

    // 3. Fetch user's organization
    const userOrg = await db.organizations.findFirst({
      where: {
        users: {
          some: { id: session.user.id },
        },
      },
      include: {
        users: true,
      },
    });

    if (!userOrg) {
      return NextResponse.json(
        { success: false, error: 'Organization not found for user' },
        { status: 404 }
      );
    }

    // 4. Check Redis cache first
    const cacheKey = `partner_recs:${userOrg.id}`;
    const cachedData = await getCache<{
      recommendations: any[];
      expiry: string;
      generatedAt: string;
    }>(cacheKey);

    if (cachedData) {
      const paginatedResults = cachedData.recommendations.slice(offset, offset + limit);

      return NextResponse.json({
        success: true,
        recommendations: paginatedResults,
        pagination: {
          page,
          limit,
          total: cachedData.recommendations.length,
          totalPages: Math.ceil(cachedData.recommendations.length / limit),
        },
        cached: true,
        cacheExpiry: cachedData.expiry,
      });
    }

    // 5. Query complementary organizations
    const complementaryOrgs = await queryComplementaryOrganizations(userOrg);

    // 6. Calculate compatibility scores for all candidates
    const recommendations = complementaryOrgs
      .map((org) => {
        const compatibility = calculatePartnerCompatibility(userOrg, org);
        return {
          organization: org,
          compatibility: {
            score: compatibility.score,
            breakdown: compatibility.breakdown,
            reasons: compatibility.reasons,
            explanation: compatibility.explanation,
          },
        };
      })
      // Sort by compatibility score (descending)
      .sort((a, b) => b.compatibility.score - a.compatibility.score)
      // Take top 20 for caching
      .slice(0, 20);

    // 7. Cache results in Redis (24h TTL)
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await setCache(
      cacheKey,
      {
        recommendations,
        expiry,
        generatedAt: new Date().toISOString(),
      },
      24 * 60 * 60 // 24 hours in seconds
    );

    // 8. Paginate results
    const paginatedResults = recommendations.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      recommendations: paginatedResults,
      pagination: {
        page,
        limit,
        total: recommendations.length,
        totalPages: Math.ceil(recommendations.length / limit),
      },
      cached: false,
      cacheExpiry: expiry,
    });
  } catch (error) {
    console.error('[Partner Recommendations API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate partner recommendations',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Query organizations that are complementary to the user's organization
 *
 * Strategy:
 * - For companies: Find research institutes with opposite TRL ranges
 * - For research institutes: Find companies with opposite TRL ranges
 * - Match by industry and technology alignment
 * - Exclude own organization
 */
async function queryComplementaryOrganizations(userOrg: any) {
  const isCompany = userOrg.type === 'COMPANY';
  const userTRL = userOrg.technologyReadinessLevel;

  // Build base query
  const baseWhere: any = {
    id: { not: userOrg.id }, // Exclude self
    status: 'ACTIVE', // Only active organizations
    profileCompleted: true, // Only organizations with completed profiles
    type: isCompany ? 'RESEARCH_INSTITUTE' : 'COMPANY', // Opposite type
  };

  // Add TRL-based filtering for complementary matching
  if (userTRL !== null && userTRL !== undefined) {
    if (isCompany) {
      // Companies (high TRL 7-9) seek research institutes (low TRL 1-4)
      if (userTRL >= 7) {
        baseWhere.technologyReadinessLevel = { gte: 1, lte: 4 };
      }
      // Companies (mid TRL 4-6) seek research institutes (any TRL)
      else if (userTRL >= 4) {
        baseWhere.technologyReadinessLevel = { gte: 1, lte: 6 };
      }
      // Companies (low TRL 1-3) seek research institutes (mid-high TRL 4-9)
      else {
        baseWhere.technologyReadinessLevel = { gte: 4, lte: 9 };
      }
    } else {
      // Research institutes (low TRL 1-4) seek companies (high TRL 7-9)
      if (userTRL <= 4) {
        baseWhere.technologyReadinessLevel = { gte: 7, lte: 9 };
      }
      // Research institutes (mid TRL 4-6) seek companies (any TRL)
      else if (userTRL <= 6) {
        baseWhere.technologyReadinessLevel = { gte: 4, lte: 9 };
      }
      // Research institutes (high TRL 7-9) seek companies (low-mid TRL 1-6)
      else {
        baseWhere.technologyReadinessLevel = { gte: 1, lte: 6 };
      }
    }
  }

  // Add industry filter if user has specified industry
  const industryConditions: any[] = [];

  if (userOrg.industrySector) {
    industryConditions.push({ industrySector: userOrg.industrySector });
  }

  // Add technology filter if user has specified technologies
  if (userOrg.keyTechnologies && userOrg.keyTechnologies.length > 0) {
    industryConditions.push({
      keyTechnologies: {
        hasSome: userOrg.keyTechnologies,
      },
    });
  }

  // Add consortium field filter if user has specified desired fields
  if (userOrg.desiredConsortiumFields && userOrg.desiredConsortiumFields.length > 0) {
    industryConditions.push({
      researchFocusAreas: {
        hasSome: userOrg.desiredConsortiumFields,
      },
    });
  }

  // Combine conditions with OR (matches any of: industry, technology, consortium field)
  if (industryConditions.length > 0) {
    baseWhere.OR = industryConditions;
  }

  // Execute query
  const organizations = await db.organizations.findMany({
    where: baseWhere,
    select: {
      id: true,
      name: true,
      type: true,
      industrySector: true,
      description: true,
      website: true,
      logoUrl: true,
      technologyReadinessLevel: true,
      employeeCount: true,
      revenueRange: true,
      researcherCount: true,
      annualRdBudget: true,
      keyTechnologies: true,
      researchFocusAreas: true,
      rdExperience: true,
      collaborationCount: true,
      desiredConsortiumFields: true,
      desiredTechnologies: true,
      targetPartnerTRL: true,
      commercializationCapabilities: true,
      expectedTRLLevel: true,
      targetOrgScale: true,
      targetOrgRevenue: true,
      profileScore: true,
      createdAt: true,
      updatedAt: true,
    },
    // Limit to reasonable number for processing
    take: 100,
    orderBy: [
      { profileScore: 'desc' }, // Prioritize complete profiles
      { createdAt: 'desc' }, // Then by recency
    ],
  });

  return organizations;
}
