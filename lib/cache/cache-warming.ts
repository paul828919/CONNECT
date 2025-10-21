/**
 * Cache Warming Service
 * 
 * Proactively populates cache with frequently accessed data
 * to improve cache hit rates from 50% to 80%+
 * 
 * Strategies:
 * 1. Pre-cache top matches for active organizations
 * 2. Pre-cache active programs list
 * 3. Pre-cache AI explanations for high-score matches
 * 4. Scheduled warming (e.g., after scraper runs)
 * 
 * Phase 3: Cache Optimization
 */

import { PrismaClient } from '@prisma/client';
import {
  setCache,
  getCache,
  getMatchCacheKey,
  getOrgCacheKey,
  getProgramsCacheKey,
  CACHE_TTL,
} from './redis-cache';
import { 
  generateMatchExplanation,
  batchGenerateExplanations 
} from '@/lib/ai/services/match-explanation';
import type { MatchExplanationInput } from '@/lib/ai/prompts/match-explanation';

// Prisma client singleton
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const db = globalForPrisma.prisma ?? new PrismaClient({
  log: ['error'],
});

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = db;
}

/**
 * Warming statistics
 */
export interface WarmingStats {
  startTime: Date;
  endTime?: Date;
  duration?: number; // milliseconds
  itemsWarmed: number;
  itemsSkipped: number; // already cached
  errors: number;
  breakdown: {
    matches: number;
    organizations: number;
    programs: number;
    aiExplanations: number;
  };
}

/**
 * Warm cache for a specific organization's matches
 * 
 * @param organizationId - Organization to warm cache for
 * @returns Number of items cached
 */
export async function warmOrganizationCache(
  organizationId: string
): Promise<number> {
  try {
    console.log('[CACHE WARMING] Starting for organization:', organizationId);
    let warmedCount = 0;

    // 1. Warm organization profile
    const cacheKey = getOrgCacheKey(organizationId);
    const cached = await getCache(cacheKey);

    if (!cached) {
      const org = await db.organizations.findUnique({
        where: { id: organizationId },
        include: {
          users: true,
        },
      });

      if (org) {
        await setCache(cacheKey, org, CACHE_TTL.ORG_PROFILE);
        warmedCount++;
        console.log('[CACHE WARMING] Cached organization profile:', organizationId);
      }
    } else {
      console.log('[CACHE WARMING] Organization already cached:', organizationId);
    }

    // 2. Warm top matches (if not already cached)
    const matchCacheKey = getMatchCacheKey(organizationId);
    const cachedMatches = await getCache(matchCacheKey);

    if (!cachedMatches) {
      const matches = await db.funding_matches.findMany({
        where: { organizationId },
        include: {
          funding_programs: true,
        },
        orderBy: { score: 'desc' },
        take: 20, // Top 20 matches
      });

      if (matches.length > 0) {
        await setCache(matchCacheKey, matches, CACHE_TTL.MATCH_RESULTS);
        warmedCount++;
        console.log('[CACHE WARMING] Cached matches:', matches.length);
      }
    } else {
      console.log('[CACHE WARMING] Matches already cached');
    }

    console.log('[CACHE WARMING] Completed for organization. Items warmed:', warmedCount);
    return warmedCount;
  } catch (error) {
    console.error('[CACHE WARMING] Error for organization:', error);
    return 0;
  }
}

/**
 * Warm active programs cache
 * 
 * @returns Number of programs cached
 */
export async function warmProgramsCache(): Promise<number> {
  try {
    console.log('[CACHE WARMING] Starting for active programs');

    const cacheKey = getProgramsCacheKey();
    const cached = await getCache(cacheKey);

    if (cached) {
      console.log('[CACHE WARMING] Programs already cached');
      return 0;
    }

    // Fetch active programs (deadline in future or no deadline)
    const now = new Date();
    const programs = await db.funding_programs.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { deadline: null },
          { deadline: { gte: now } },
        ],
      },
      orderBy: { deadline: 'asc' },
    });

    if (programs.length > 0) {
      await setCache(cacheKey, programs, CACHE_TTL.PROGRAMS);
      console.log('[CACHE WARMING] Cached programs:', programs.length);
      return programs.length;
    }

    return 0;
  } catch (error) {
    console.error('[CACHE WARMING] Error for programs:', error);
    return 0;
  }
}

/**
 * Warm AI explanation cache for top matches
 * 
 * IMPORTANT: This can be expensive (AI API calls)
 * Use carefully and consider rate limits
 * 
 * @param organizationId - Organization ID
 * @param topN - Number of top matches to warm (default: 5)
 * @param skipIfCached - Skip if explanation already cached (default: true)
 * @returns Number of explanations generated
 */
export async function warmAIExplanations(
  organizationId: string,
  topN: number = 5,
  skipIfCached: boolean = true
): Promise<number> {
  try {
    console.log('[CACHE WARMING] Starting AI explanations for org:', organizationId, 'topN:', topN);
    
    // Get top N matches
    const matches = await db.funding_matches.findMany({
      where: { organizationId },
      include: {
        organizations: true,
        funding_programs: true,
      },
      orderBy: { score: 'desc' },
      take: topN,
    });

    if (matches.length === 0) {
      console.log('[CACHE WARMING] No matches found for organization');
      return 0;
    }

    // Build inputs for batch generation
    const inputs: MatchExplanationInput[] = [];
    const matchIds: { organizationId: string; programId: string }[] = [];

    for (const match of matches) {
      const organization = match.organizations;
      const program = match.funding_programs;

      // Parse existing explanation for score breakdown
      const existingExplanation = match.explanation as any;
      const scoreBreakdown = existingExplanation?.scoreBreakdown || {
        industry: 0,
        trl: 0,
        certifications: 0,
        budget: 0,
        experience: 0,
      };

      const input: MatchExplanationInput = {
        programTitle: program.title,
        programAgency: getAgencyName(program.agencyId),
        programBudget: formatBudget(program.budgetAmount),
        programTRL: formatTRL(program.minTrl, program.maxTrl),
        programIndustry: program.category || '전 산업',
        programDeadline: formatDeadline(program.deadline),
        programRequirements: [],
        companyName: organization.name,
        companyIndustry: organization.industrySector || '미분류',
        companyTRL: organization.technologyReadinessLevel || 0,
        companyRevenue: parseRevenue(organization.revenueRange),
        companyEmployees: parseEmployeeCount(organization.employeeCount),
        certifications: [],
        rdExperience: organization.rdExperience ? 5 : 0,
        matchScore: match.score,
        scoreBreakdown,
      };

      inputs.push(input);
      matchIds.push({
        organizationId: match.organizationId,
        programId: match.programId,
      });
    }

    // Batch generate explanations (respects rate limits)
    const results = await batchGenerateExplanations(
      inputs,
      undefined, // userId not available during warming
      organizationId
    );

    const generatedCount = results.filter(r => !r.cached).length;
    console.log('[CACHE WARMING] AI explanations generated:', generatedCount, '/', matches.length);

    return generatedCount;
  } catch (error) {
    console.error('[CACHE WARMING] Error warming AI explanations:', error);
    return 0;
  }
}

/**
 * Warm cache for all active organizations
 * 
 * Use with caution - can be resource intensive
 * Consider running during off-peak hours
 * 
 * @param maxOrganizations - Maximum organizations to warm (default: 50)
 * @returns Warming statistics
 */
export async function warmAllActiveOrganizations(
  maxOrganizations: number = 50
): Promise<WarmingStats> {
  const stats: WarmingStats = {
    startTime: new Date(),
    itemsWarmed: 0,
    itemsSkipped: 0,
    errors: 0,
    breakdown: {
      matches: 0,
      organizations: 0,
      programs: 0,
      aiExplanations: 0,
    },
  };

  try {
    console.log('[CACHE WARMING] Starting full warming for active organizations');

    // 1. Warm programs cache (shared across all orgs)
    const programsCount = await warmProgramsCache();
    stats.breakdown.programs = programsCount;
    stats.itemsWarmed += programsCount;

    // 2. Get active organizations (have users and recent activity)
    const organizations = await db.organizations.findMany({
      where: {
        users: {
          some: {
            lastLoginAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Active in last 30 days
            },
          },
        },
      },
      take: maxOrganizations,
    });

    console.log('[CACHE WARMING] Found active organizations:', organizations.length);

    // 3. Warm each organization's cache
    for (const org of organizations) {
      try {
        const warmed = await warmOrganizationCache(org.id);
        stats.itemsWarmed += warmed;

        if (warmed === 0) {
          stats.itemsSkipped++;
        } else {
          stats.breakdown.organizations++;
          stats.breakdown.matches++;
        }
      } catch (error) {
        console.error('[CACHE WARMING] Error warming org:', org.id, error);
        stats.errors++;
      }
    }

    stats.endTime = new Date();
    stats.duration = stats.endTime.getTime() - stats.startTime.getTime();

    console.log('[CACHE WARMING] Full warming complete:', {
      duration: `${(stats.duration / 1000).toFixed(2)}s`,
      itemsWarmed: stats.itemsWarmed,
      itemsSkipped: stats.itemsSkipped,
      errors: stats.errors,
    });

    return stats;
  } catch (error) {
    console.error('[CACHE WARMING] Critical error during full warming:', error);
    stats.errors++;
    stats.endTime = new Date();
    stats.duration = stats.endTime.getTime() - stats.startTime.getTime();
    return stats;
  }
}

/**
 * Smart warming: Only warm what's likely to be accessed
 * 
 * Strategy:
 * - Warm organizations that logged in today
 * - Warm top 3 matches for each
 * - Warm active programs
 * 
 * @returns Warming statistics
 */
export async function smartWarmCache(): Promise<WarmingStats> {
  const stats: WarmingStats = {
    startTime: new Date(),
    itemsWarmed: 0,
    itemsSkipped: 0,
    errors: 0,
    breakdown: {
      matches: 0,
      organizations: 0,
      programs: 0,
      aiExplanations: 0,
    },
  };

  try {
    console.log('[CACHE WARMING] Starting smart warming');

    // 1. Warm programs (most likely to be accessed)
    const programsCount = await warmProgramsCache();
    stats.breakdown.programs = programsCount;
    stats.itemsWarmed += programsCount;

    // 2. Get organizations active TODAY
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const organizations = await db.organizations.findMany({
      where: {
        users: {
          some: {
            lastLoginAt: {
              gte: today,
            },
          },
        },
      },
      take: 20, // Limit to 20 most recent
    });

    console.log('[CACHE WARMING] Organizations active today:', organizations.length);

    // 3. Warm each active organization
    for (const org of organizations) {
      try {
        const warmed = await warmOrganizationCache(org.id);
        stats.itemsWarmed += warmed;

        if (warmed > 0) {
          stats.breakdown.organizations++;
          stats.breakdown.matches++;
        } else {
          stats.itemsSkipped++;
        }
      } catch (error) {
        console.error('[CACHE WARMING] Error warming org:', org.id, error);
        stats.errors++;
      }
    }

    stats.endTime = new Date();
    stats.duration = stats.endTime.getTime() - stats.startTime.getTime();

    console.log('[CACHE WARMING] Smart warming complete:', {
      duration: `${(stats.duration / 1000).toFixed(2)}s`,
      itemsWarmed: stats.itemsWarmed,
      organizations: organizations.length,
    });

    return stats;
  } catch (error) {
    console.error('[CACHE WARMING] Error during smart warming:', error);
    stats.errors++;
    stats.endTime = new Date();
    stats.duration = stats.endTime.getTime() - stats.startTime.getTime();
    return stats;
  }
}

// Helper functions

function getAgencyName(agencyId: string): string {
  const agencies: Record<string, string> = {
    IITP: '정보통신기획평가원',
    KEIT: '한국산업기술평가관리원',
    TIPA: '중소기업기술정보진흥원',
    KIMST: '해양수산과학기술진흥원',
  };
  return agencies[agencyId] || agencyId;
}

function formatBudget(budgetAmount: bigint | null): string {
  if (!budgetAmount) return '미정';

  const amount = Number(budgetAmount);
  if (amount >= 100000000) {
    return `${(amount / 100000000).toFixed(1)}억원`;
  } else if (amount >= 10000000) {
    return `${(amount / 10000000).toFixed(0)}천만원`;
  } else {
    return `${(amount / 10000).toFixed(0)}만원`;
  }
}

function formatTRL(minTrl: number | null, maxTrl: number | null): string {
  if (!minTrl && !maxTrl) return '제한없음';
  if (minTrl && !maxTrl) return `TRL ${minTrl} 이상`;
  if (!minTrl && maxTrl) return `TRL ${maxTrl} 이하`;
  if (minTrl === maxTrl) return `TRL ${minTrl}`;
  return `TRL ${minTrl}-${maxTrl}`;
}

function formatDeadline(deadline: Date | null): string {
  if (!deadline) return '상시 모집';

  const now = new Date();
  const daysUntil = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  const dateStr = deadline.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  if (daysUntil <= 0) return `${dateStr} (마감)`;
  if (daysUntil === 1) return `${dateStr} (내일 마감)`;
  if (daysUntil <= 7) return `${dateStr} (${daysUntil}일 남음)`;
  return dateStr;
}

function parseRevenue(revenueRange: string | null): number {
  if (!revenueRange) return 0;

  const ranges: Record<string, number> = {
    UNDER_1B: 500000000,
    FROM_1B_TO_10B: 5000000000,
    FROM_10B_TO_50B: 30000000000,
    FROM_50B_TO_100B: 75000000000,
    OVER_100B: 150000000000,
  };

  return ranges[revenueRange] || 0;
}

function parseEmployeeCount(employeeCount: string | null): number {
  if (!employeeCount) return 0;

  const ranges: Record<string, number> = {
    UNDER_10: 5,
    FROM_10_TO_50: 30,
    FROM_50_TO_100: 75,
    FROM_100_TO_300: 200,
    OVER_300: 500,
  };

  return ranges[employeeCount] || 0;
}

const cacheWarming = {
  warmOrganizationCache,
  warmProgramsCache,
  warmAIExplanations,
  warmAllActiveOrganizations,
  smartWarmCache,
};

export default cacheWarming;

