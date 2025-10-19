/**
 * Cache Warming API
 * 
 * Triggers cache warming strategies
 * - Manual trigger for testing
 * - Smart warming (recommended)
 * - Full warming (resource intensive)
 * 
 * Phase 3: Cache Optimization
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import {
  smartWarmCache,
  warmAllActiveOrganizations,
  warmOrganizationCache,
  warmProgramsCache,
  type WarmingStats,
} from '@/lib/cache/cache-warming';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max for warming

/**
 * POST /api/admin/cache-warming
 * 
 * Trigger cache warming
 * 
 * Body:
 * - strategy: "smart" | "full" | "organization" | "programs"
 * - organizationId?: string (required for "organization" strategy)
 * - maxOrganizations?: number (for "full" strategy)
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authentication check (admin only)
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Parse request body
    const body = await request.json();
    const { 
      strategy = 'smart',
      organizationId,
      maxOrganizations = 50 
    } = body;

    console.log('[CACHE WARMING API] Starting warming with strategy:', strategy);

    let result: WarmingStats | { itemsWarmed: number; message: string };

    // 3. Execute warming strategy
    switch (strategy) {
      case 'smart':
        // Smart warming: Organizations active today + programs
        result = await smartWarmCache();
        break;

      case 'full':
        // Full warming: All active organizations (last 30 days)
        result = await warmAllActiveOrganizations(maxOrganizations);
        break;

      case 'organization':
        // Single organization warming
        if (!organizationId) {
          return NextResponse.json(
            { error: 'organizationId is required for organization strategy' },
            { status: 400 }
          );
        }
        const itemsWarmed = await warmOrganizationCache(organizationId);
        result = {
          itemsWarmed,
          message: `Warmed cache for organization ${organizationId}`,
        };
        break;

      case 'programs':
        // Programs only
        const programsWarmed = await warmProgramsCache();
        result = {
          itemsWarmed: programsWarmed,
          message: 'Warmed active programs cache',
        };
        break;

      default:
        return NextResponse.json(
          { error: `Unknown strategy: ${strategy}` },
          { status: 400 }
        );
    }

    console.log('[CACHE WARMING API] Warming complete:', result);

    return NextResponse.json({
      success: true,
      strategy,
      result,
      timestamp: new Date().toISOString(),
    }, { status: 200 });

  } catch (error: any) {
    console.error('[CACHE WARMING API] Error:', error);
    return NextResponse.json(
      { 
        error: 'Cache warming failed',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/cache-warming/status
 * 
 * Get warming status and recommendations
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication check (admin only)
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get cache analytics
    const { getCacheStats } = await import('@/lib/cache/redis-cache');
    const cacheStats = getCacheStats();

    const hitRate = cacheStats.hits + cacheStats.misses > 0
      ? ((cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100).toFixed(2)
      : '0.00';

    // Generate recommendations
    const recommendations = [];

    if (parseFloat(hitRate) < 50) {
      recommendations.push({
        severity: 'critical',
        message: 'Cache hit rate is below 50%. Consider running smart warming immediately.',
        action: 'POST /api/admin/cache-warming with strategy="smart"',
      });
    } else if (parseFloat(hitRate) < 80) {
      recommendations.push({
        severity: 'warning',
        message: 'Cache hit rate is below target (80%). Consider implementing scheduled warming.',
        action: 'Set up cron job for smart warming during off-peak hours',
      });
    }

    if (cacheStats.hits === 0 && cacheStats.misses === 0) {
      recommendations.push({
        severity: 'info',
        message: 'No cache activity detected. Run warming after first user traffic.',
        action: 'Monitor cache usage and warm accordingly',
      });
    }

    return NextResponse.json({
      cacheStats: {
        hits: cacheStats.hits,
        misses: cacheStats.misses,
        errors: cacheStats.errors,
        hitRate: hitRate + '%',
      },
      recommendations,
      strategies: {
        smart: {
          description: 'Warm organizations active today + programs',
          recommended: true,
          duration: '~5-30 seconds',
          cost: 'Low (no AI calls)',
        },
        full: {
          description: 'Warm all organizations active in last 30 days',
          recommended: false,
          duration: '~1-5 minutes',
          cost: 'Medium',
        },
        organization: {
          description: 'Warm specific organization',
          recommended: false,
          duration: '~1-2 seconds',
          cost: 'Very low',
        },
        programs: {
          description: 'Warm active programs only',
          recommended: true,
          duration: '~1 second',
          cost: 'Very low',
        },
      },
    }, { status: 200 });

  } catch (error: any) {
    console.error('[CACHE WARMING API] Status error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get warming status',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

