/**
 * Cache Monitoring Dashboard API
 * 
 * Provides real-time cache metrics for monitoring dashboard
 * Optimized for Grafana integration
 * 
 * Phase 3: Cache Optimization
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import { getCacheStats } from '@/lib/cache/redis-cache';
import { Redis } from 'ioredis';

export const dynamic = 'force-dynamic';

// Redis client for metrics
let metricsRedis: Redis | null = null;

function getMetricsRedis(): Redis {
  if (!metricsRedis) {
    metricsRedis = new Redis(process.env.REDIS_CACHE_URL || 'redis://redis-cache:6379/0', {
      lazyConnect: true,
    });
  }
  return metricsRedis;
}

/**
 * GET /api/admin/cache-dashboard
 * 
 * Returns cache metrics for dashboard visualization
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

    // Get application-level stats
    const appStats = getCacheStats();

    // Connect to Redis for detailed metrics
    const redis = getMetricsRedis();
    await redis.connect();

    // Get Redis stats
    const [info, dbSize, memoryInfo] = await Promise.all([
      redis.info('stats'),
      redis.dbsize(),
      redis.info('memory'),
    ]);

    // Parse stats
    const stats = parseRedisInfo(info);
    const memStats = parseRedisInfo(memoryInfo);

    // Calculate metrics
    const hits = parseInt(stats.keyspace_hits || '0');
    const misses = parseInt(stats.keyspace_misses || '0');
    const total = hits + misses;
    const hitRate = total > 0 ? (hits / total) * 100 : 0;

    // Application-level hit rate
    const appTotal = appStats.hits + appStats.misses;
    const appHitRate = appTotal > 0 ? (appStats.hits / appTotal) * 100 : 0;

    // Memory metrics
    const usedMemory = parseInt(memStats.used_memory || '0');
    const maxMemory = parseInt(memStats.maxmemory || '536870912'); // Default 512MB
    const memoryUsage = maxMemory > 0 ? (usedMemory / maxMemory) * 100 : 0;

    // Get key breakdown
    const keys = await redis.keys('*');
    const keyBreakdown = analyzeKeyTypes(keys);

    // Performance status
    const performanceStatus = getPerformanceStatus(hitRate, memoryUsage, dbSize);

    await redis.disconnect();

    // Build dashboard response
    const dashboard = {
      timestamp: new Date().toISOString(),
      
      // Summary metrics (for at-a-glance view)
      summary: {
        hitRate: parseFloat(hitRate.toFixed(2)),
        totalKeys: dbSize,
        memoryUsage: parseFloat(memoryUsage.toFixed(2)),
        status: performanceStatus.overall,
      },

      // Detailed Redis metrics
      redis: {
        hits,
        misses,
        total,
        hitRate: parseFloat(hitRate.toFixed(2)),
        opsPerSec: parseFloat(stats.instantaneous_ops_per_sec || '0'),
        evictedKeys: parseInt(stats.evicted_keys || '0'),
        expiredKeys: parseInt(stats.expired_keys || '0'),
        connections: parseInt(stats.total_connections_received || '0'),
      },

      // Application-level metrics
      application: {
        hits: appStats.hits,
        misses: appStats.misses,
        errors: appStats.errors,
        hitRate: parseFloat(appHitRate.toFixed(2)),
      },

      // Memory metrics
      memory: {
        used: usedMemory,
        usedHuman: memStats.used_memory_human || '0B',
        max: maxMemory,
        maxHuman: memStats.maxmemory_human || '512M',
        usage: parseFloat(memoryUsage.toFixed(2)),
        peak: memStats.used_memory_peak_human || '0B',
      },

      // Key breakdown by type
      keys: {
        total: dbSize,
        byType: keyBreakdown,
      },

      // Performance indicators
      performance: performanceStatus,

      // Time-series data (for Grafana)
      timeseries: {
        timestamp: Date.now(),
        hitRate,
        hitCount: hits,
        missCount: misses,
        memoryUsage,
        keyCount: dbSize,
        opsPerSec: parseFloat(stats.instantaneous_ops_per_sec || '0'),
      },
    };

    return NextResponse.json(dashboard, { status: 200 });

  } catch (error: any) {
    console.error('[CACHE DASHBOARD] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch cache metrics',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * Parse Redis INFO output
 */
function parseRedisInfo(info: string): Record<string, string> {
  const lines = info.split('\r\n');
  const result: Record<string, string> = {};

  for (const line of lines) {
    if (line && !line.startsWith('#') && line.includes(':')) {
      const [key, value] = line.split(':');
      result[key.trim()] = value.trim();
    }
  }

  return result;
}

/**
 * Analyze keys by type/prefix
 */
function analyzeKeyTypes(keys: string[]): Record<string, number> {
  const breakdown: Record<string, number> = {
    'ai:explanation': 0,
    'match:org': 0,
    'org:profile': 0,
    'programs:active': 0,
    'other': 0,
  };

  for (const key of keys) {
    if (key.startsWith('ai:explanation') || key.startsWith('match:explanation')) {
      breakdown['ai:explanation']++;
    } else if (key.startsWith('match:org')) {
      breakdown['match:org']++;
    } else if (key.startsWith('org:profile')) {
      breakdown['org:profile']++;
    } else if (key.startsWith('programs:active')) {
      breakdown['programs:active']++;
    } else {
      breakdown['other']++;
    }
  }

  return breakdown;
}

/**
 * Get performance status based on metrics
 */
function getPerformanceStatus(
  hitRate: number,
  memoryUsage: number,
  keyCount: number
): {
  overall: 'excellent' | 'good' | 'warning' | 'critical';
  hitRateStatus: 'excellent' | 'good' | 'warning' | 'critical';
  memoryStatus: 'normal' | 'warning' | 'critical';
  keyCountStatus: 'optimal' | 'low' | 'high';
  recommendations: string[];
} {
  // Hit rate status
  let hitRateStatus: 'excellent' | 'good' | 'warning' | 'critical';
  if (hitRate >= 80) hitRateStatus = 'excellent';
  else if (hitRate >= 60) hitRateStatus = 'good';
  else if (hitRate >= 40) hitRateStatus = 'warning';
  else hitRateStatus = 'critical';

  // Memory status
  let memoryStatus: 'normal' | 'warning' | 'critical';
  if (memoryUsage < 75) memoryStatus = 'normal';
  else if (memoryUsage < 90) memoryStatus = 'warning';
  else memoryStatus = 'critical';

  // Key count status
  let keyCountStatus: 'optimal' | 'low' | 'high';
  if (keyCount < 100) keyCountStatus = 'low';
  else if (keyCount > 10000) keyCountStatus = 'high';
  else keyCountStatus = 'optimal';

  // Overall status (worst of hit rate and memory)
  let overall: 'excellent' | 'good' | 'warning' | 'critical';
  if (hitRateStatus === 'critical' || memoryStatus === 'critical') {
    overall = 'critical';
  } else if (hitRateStatus === 'warning' || memoryStatus === 'warning') {
    overall = 'warning';
  } else if (hitRateStatus === 'good') {
    overall = 'good';
  } else {
    overall = 'excellent';
  }

  // Generate recommendations
  const recommendations: string[] = [];
  
  if (hitRateStatus === 'critical') {
    recommendations.push('URGENT: Hit rate below 40%. Run cache warming immediately.');
  } else if (hitRateStatus === 'warning') {
    recommendations.push('Hit rate below 60%. Consider implementing scheduled cache warming.');
  }

  if (memoryStatus === 'critical') {
    recommendations.push('URGENT: Memory usage above 90%. Risk of evictions.');
  } else if (memoryStatus === 'warning') {
    recommendations.push('Memory usage above 75%. Monitor closely.');
  }

  if (keyCountStatus === 'low') {
    recommendations.push('Low key count. Cache may not be warming properly.');
  } else if (keyCountStatus === 'high') {
    recommendations.push('High key count. Review cache strategy and TTLs.');
  }

  if (hitRateStatus === 'excellent' && memoryStatus === 'normal') {
    recommendations.push('✅ Cache performing optimally!');
  }

  return {
    overall,
    hitRateStatus,
    memoryStatus,
    keyCountStatus,
    recommendations,
  };
}

