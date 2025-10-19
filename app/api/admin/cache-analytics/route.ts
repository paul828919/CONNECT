/**
 * Cache Analytics API
 * 
 * Provides comprehensive cache monitoring and analytics
 * - Real-time hit/miss rates
 * - Cache key analysis
 * - Performance metrics
 * - Memory usage
 * 
 * Phase 3: Cache Optimization
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import { getCacheStats } from '@/lib/cache/redis-cache';
import { Redis } from 'ioredis';

export const dynamic = 'force-dynamic'; // Disable caching for this endpoint

// Redis client for analytics
let analyticsRedis: Redis | null = null;

function getAnalyticsRedis(): Redis {
  if (!analyticsRedis) {
    analyticsRedis = new Redis(process.env.REDIS_CACHE_URL || 'redis://redis-cache:6379/0', {
      lazyConnect: true,
    });
  }
  return analyticsRedis;
}

/**
 * GET /api/admin/cache-analytics
 * 
 * Returns comprehensive cache analytics
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Authentication check (admin only)
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Get basic cache stats from our utility
    const basicStats = getCacheStats();

    // 3. Connect to Redis and get detailed stats
    const redis = getAnalyticsRedis();
    await redis.connect();

    // Get Redis INFO stats
    const [
      info,
      dbSize,
      memoryStats,
      allKeys
    ] = await Promise.all([
      redis.info('stats'),
      redis.dbsize(),
      redis.info('memory'),
      redis.keys('*')
    ]);

    // Parse INFO stats
    const stats = parseRedisInfo(info);
    const memStats = parseRedisInfo(memoryStats);

    // Calculate hit rate
    const hits = parseInt(stats.keyspace_hits || '0');
    const misses = parseInt(stats.keyspace_misses || '0');
    const total = hits + misses;
    const hitRate = total > 0 ? ((hits / total) * 100).toFixed(2) : '0.00';

    // Analyze cache keys by type
    const keyAnalysis = analyzeKeys(allKeys);

    // Get sample key details
    const sampleKeys = await getSampleKeyDetails(redis, allKeys);

    // Calculate memory usage
    const usedMemory = parseInt(memStats.used_memory || '0');
    const usedMemoryHuman = memStats.used_memory_human || '0B';
    const maxMemory = parseInt(memStats.maxmemory || '0');
    const maxMemoryHuman = memStats.maxmemory_human || 'unlimited';
    const memoryUsagePercent = maxMemory > 0 
      ? ((usedMemory / maxMemory) * 100).toFixed(2) 
      : '0.00';

    // 4. Build comprehensive response
    const analytics = {
      timestamp: new Date().toISOString(),
      
      // Application-level stats (from our redis-cache.ts)
      application: {
        hits: basicStats.hits,
        misses: basicStats.misses,
        errors: basicStats.errors,
        hitRate: basicStats.hits + basicStats.misses > 0
          ? ((basicStats.hits / (basicStats.hits + basicStats.misses)) * 100).toFixed(2) + '%'
          : '0%',
      },

      // Redis-level stats
      redis: {
        dbSize,
        totalHits: hits,
        totalMisses: misses,
        hitRate: hitRate + '%',
        totalCommands: parseInt(stats.total_commands_processed || '0'),
        opsPerSec: parseFloat(stats.instantaneous_ops_per_sec || '0'),
        connections: parseInt(stats.total_connections_received || '0'),
        evictedKeys: parseInt(stats.evicted_keys || '0'),
      },

      // Memory stats
      memory: {
        used: usedMemoryHuman,
        usedBytes: usedMemory,
        max: maxMemoryHuman,
        maxBytes: maxMemory,
        usagePercent: memoryUsagePercent + '%',
        peakUsed: memStats.used_memory_peak_human || '0B',
      },

      // Key analysis by type
      keys: keyAnalysis,

      // Sample key details
      samples: sampleKeys,

      // Performance recommendations
      recommendations: generateRecommendations({
        hitRate: parseFloat(hitRate),
        keyCount: dbSize,
        memoryUsage: parseFloat(memoryUsagePercent),
        keyAnalysis,
      }),
    };

    await redis.disconnect();

    return NextResponse.json(analytics, { status: 200 });

  } catch (error: any) {
    console.error('Cache analytics error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch cache analytics',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/cache-analytics/reset
 * 
 * Reset application-level cache statistics
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication check (admin only)
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { resetCacheStats } = await import('@/lib/cache/redis-cache');
    resetCacheStats();

    return NextResponse.json({
      success: true,
      message: 'Application cache statistics reset',
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('Cache stats reset error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to reset cache stats',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * Parse Redis INFO output into key-value object
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
 * Analyze cache keys by prefix/type
 */
function analyzeKeys(keys: string[]): Record<string, { count: number; examples: string[] }> {
  const analysis: Record<string, { count: number; examples: string[] }> = {};

  for (const key of keys) {
    // Extract prefix (first part before colon)
    const prefix = key.split(':')[0] || 'unknown';
    
    if (!analysis[prefix]) {
      analysis[prefix] = { count: 0, examples: [] };
    }
    
    analysis[prefix].count++;
    
    // Store up to 3 examples
    if (analysis[prefix].examples.length < 3) {
      analysis[prefix].examples.push(key);
    }
  }

  return analysis;
}

/**
 * Get details for sample keys
 */
async function getSampleKeyDetails(
  redis: Redis,
  keys: string[]
): Promise<Array<{ key: string; ttl: number; size: number }>> {
  const samples: Array<{ key: string; ttl: number; size: number }> = [];
  const sampleCount = Math.min(10, keys.length);

  for (let i = 0; i < sampleCount; i++) {
    const key = keys[i];
    try {
      const [ttl, value] = await Promise.all([
        redis.ttl(key),
        redis.get(key),
      ]);

      samples.push({
        key,
        ttl,
        size: value ? value.length : 0,
      });
    } catch (error) {
      // Skip this key if there's an error
      console.error(`Error getting details for key ${key}:`, error);
    }
  }

  return samples;
}

/**
 * Generate performance recommendations based on analytics
 */
function generateRecommendations(data: {
  hitRate: number;
  keyCount: number;
  memoryUsage: number;
  keyAnalysis: Record<string, { count: number; examples: string[] }>;
}): string[] {
  const recommendations: string[] = [];

  // Hit rate recommendations
  if (data.hitRate < 50) {
    recommendations.push('❌ CRITICAL: Cache hit rate is below 50%. Consider implementing cache warming or reviewing cache key strategies.');
  } else if (data.hitRate < 80) {
    recommendations.push('⚠️ WARNING: Cache hit rate is below target (80%). Review cache TTLs and key design.');
  } else {
    recommendations.push('✅ EXCELLENT: Cache hit rate meets or exceeds target (80%+).');
  }

  // Key count recommendations
  if (data.keyCount === 0) {
    recommendations.push('❌ CRITICAL: No keys in cache. Cache may not be functioning or needs warming.');
  } else if (data.keyCount < 100) {
    recommendations.push('⚠️ WARNING: Low number of cached items. Consider implementing cache warming for frequently accessed data.');
  } else {
    recommendations.push(`✅ GOOD: ${data.keyCount} items cached. Monitor growth and memory usage.`);
  }

  // Memory recommendations
  if (data.memoryUsage > 90) {
    recommendations.push('❌ CRITICAL: Memory usage above 90%. Risk of evictions. Consider increasing maxmemory or reviewing cache TTLs.');
  } else if (data.memoryUsage > 75) {
    recommendations.push('⚠️ WARNING: Memory usage above 75%. Monitor closely and plan for capacity increase.');
  } else if (data.memoryUsage > 0) {
    recommendations.push(`✅ GOOD: Memory usage at ${data.memoryUsage.toFixed(1)}%. Healthy level.`);
  }

  // Key type recommendations
  const matchKeys = data.keyAnalysis['match']?.count || 0;
  const aiKeys = data.keyAnalysis['ai']?.count || 0;

  if (matchKeys === 0 && aiKeys === 0) {
    recommendations.push('⚠️ INFO: No match or AI explanation keys cached. Consider cache warming for top matches.');
  }

  if (aiKeys > 0) {
    recommendations.push(`✅ GOOD: ${aiKeys} AI explanations cached. This reduces API costs significantly.`);
  }

  return recommendations;
}

