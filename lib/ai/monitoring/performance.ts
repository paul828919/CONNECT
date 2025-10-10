/**
 * AI Performance Monitoring
 * Connect Platform - Week 3-4 AI Integration
 *
 * Tracks and analyzes AI request performance metrics:
 * - Response times (P50, P95, P99)
 * - Request success rates
 * - Cache hit rates
 * - Circuit breaker state transitions
 * - Cost per request trends
 *
 * Week 3, Day 22-23, Part 3
 */

import { Redis } from 'ioredis';
import { AIServiceType } from '@prisma/client';

// Redis client (lazy initialization)
let redis: Redis | null = null;

function getRedisClient(): Redis {
  if (!redis) {
    redis = new Redis(process.env.REDIS_CACHE_URL || 'redis://localhost:6379/0');
  }
  return redis;
}

/**
 * Performance metric interface
 */
export interface PerformanceMetric {
  timestamp: number;
  serviceType: AIServiceType;
  responseTime: number; // milliseconds
  success: boolean;
  cacheHit: boolean;
  cost: number; // KRW
  circuitBreakerState?: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
}

/**
 * Performance statistics
 */
export interface PerformanceStats {
  period: {
    start: Date;
    end: Date;
    minutes: number;
  };
  requests: {
    total: number;
    successful: number;
    failed: number;
    successRate: number;
  };
  responseTime: {
    p50: number; // 50th percentile (median)
    p95: number; // 95th percentile
    p99: number; // 99th percentile
    average: number;
    min: number;
    max: number;
  };
  cache: {
    hits: number;
    misses: number;
    hitRate: number;
  };
  cost: {
    total: number;
    average: number;
  };
  byService: {
    [key in AIServiceType]?: {
      requests: number;
      averageResponseTime: number;
      successRate: number;
      averageCost: number;
    };
  };
}

/**
 * Record a performance metric
 * Called after each AI request (success or failure)
 */
export async function recordPerformanceMetric(metric: PerformanceMetric): Promise<void> {
  try {
    const redis = getRedisClient();
    const now = Date.now();

    // Store in Redis sorted set (score = timestamp)
    const key = `ai:performance:${metric.serviceType}`;
    const value = JSON.stringify({
      responseTime: metric.responseTime,
      success: metric.success,
      cacheHit: metric.cacheHit,
      cost: metric.cost,
      circuitBreakerState: metric.circuitBreakerState,
    });

    await redis.zadd(key, metric.timestamp, `${metric.timestamp}-${Math.random()}:${value}`);

    // Keep only last 60 minutes of data
    const cutoffTime = now - 60 * 60 * 1000; // 1 hour ago
    await redis.zremrangebyscore(key, '-inf', cutoffTime);

    // Set expiration to 2 hours (cleanup)
    await redis.expire(key, 2 * 60 * 60);

    // Also store in general performance key for cross-service analysis
    const generalKey = 'ai:performance:all';
    const generalValue = JSON.stringify({
      serviceType: metric.serviceType,
      responseTime: metric.responseTime,
      success: metric.success,
      cacheHit: metric.cacheHit,
      cost: metric.cost,
    });

    await redis.zadd(generalKey, metric.timestamp, `${metric.timestamp}-${Math.random()}:${generalValue}`);
    await redis.zremrangebyscore(generalKey, '-inf', cutoffTime);
    await redis.expire(generalKey, 2 * 60 * 60);
  } catch (error) {
    console.error('Failed to record performance metric:', error);
    // Non-critical error, don't throw
  }
}

/**
 * Get performance statistics for a specific service type
 */
export async function getPerformanceStats(
  serviceType: AIServiceType | 'ALL',
  minutes: number = 60
): Promise<PerformanceStats> {
  try {
    const redis = getRedisClient();
    const now = Date.now();
    const startTime = now - minutes * 60 * 1000;

    // Get data from Redis
    const key = serviceType === 'ALL' ? 'ai:performance:all' : `ai:performance:${serviceType}`;
    const data = await redis.zrangebyscore(key, startTime, now);

    if (data.length === 0) {
      // No data available
      return {
        period: {
          start: new Date(startTime),
          end: new Date(now),
          minutes,
        },
        requests: {
          total: 0,
          successful: 0,
          failed: 0,
          successRate: 0,
        },
        responseTime: {
          p50: 0,
          p95: 0,
          p99: 0,
          average: 0,
          min: 0,
          max: 0,
        },
        cache: {
          hits: 0,
          misses: 0,
          hitRate: 0,
        },
        cost: {
          total: 0,
          average: 0,
        },
        byService: {},
      };
    }

    // Parse metrics
    const metrics: Array<{
      serviceType?: AIServiceType;
      responseTime: number;
      success: boolean;
      cacheHit: boolean;
      cost: number;
    }> = [];

    for (const item of data) {
      const [_, jsonStr] = item.split(':');
      if (jsonStr) {
        try {
          metrics.push(JSON.parse(jsonStr));
        } catch (e) {
          // Skip malformed data
        }
      }
    }

    // Calculate statistics
    const successful = metrics.filter((m) => m.success).length;
    const failed = metrics.length - successful;
    const cacheHits = metrics.filter((m) => m.cacheHit).length;
    const cacheMisses = metrics.length - cacheHits;

    const responseTimes = metrics.map((m) => m.responseTime).sort((a, b) => a - b);
    const p50Index = Math.floor(responseTimes.length * 0.5);
    const p95Index = Math.floor(responseTimes.length * 0.95);
    const p99Index = Math.floor(responseTimes.length * 0.99);

    const totalResponseTime = responseTimes.reduce((sum, rt) => sum + rt, 0);
    const totalCost = metrics.reduce((sum, m) => sum + m.cost, 0);

    // By-service breakdown (if serviceType === 'ALL')
    const byService: PerformanceStats['byService'] = {};
    if (serviceType === 'ALL') {
      const serviceTypes = Array.from(new Set(metrics.map((m) => m.serviceType).filter(Boolean))) as AIServiceType[];

      for (const st of serviceTypes) {
        const serviceMetrics = metrics.filter((m) => m.serviceType === st);
        const serviceSuccessful = serviceMetrics.filter((m) => m.success).length;
        const serviceTotalResponseTime = serviceMetrics.reduce((sum, m) => sum + m.responseTime, 0);
        const serviceTotalCost = serviceMetrics.reduce((sum, m) => sum + m.cost, 0);

        byService[st] = {
          requests: serviceMetrics.length,
          averageResponseTime: serviceMetrics.length > 0 ? serviceTotalResponseTime / serviceMetrics.length : 0,
          successRate: serviceMetrics.length > 0 ? (serviceSuccessful / serviceMetrics.length) * 100 : 0,
          averageCost: serviceMetrics.length > 0 ? serviceTotalCost / serviceMetrics.length : 0,
        };
      }
    }

    return {
      period: {
        start: new Date(startTime),
        end: new Date(now),
        minutes,
      },
      requests: {
        total: metrics.length,
        successful,
        failed,
        successRate: metrics.length > 0 ? (successful / metrics.length) * 100 : 0,
      },
      responseTime: {
        p50: responseTimes[p50Index] || 0,
        p95: responseTimes[p95Index] || 0,
        p99: responseTimes[p99Index] || 0,
        average: responseTimes.length > 0 ? totalResponseTime / responseTimes.length : 0,
        min: responseTimes[0] || 0,
        max: responseTimes[responseTimes.length - 1] || 0,
      },
      cache: {
        hits: cacheHits,
        misses: cacheMisses,
        hitRate: metrics.length > 0 ? (cacheHits / metrics.length) * 100 : 0,
      },
      cost: {
        total: totalCost,
        average: metrics.length > 0 ? totalCost / metrics.length : 0,
      },
      byService,
    };
  } catch (error) {
    console.error('Failed to get performance stats:', error);
    throw error;
  }
}

/**
 * Get recent slow requests (above threshold)
 */
export async function getSlowRequests(
  thresholdMs: number = 3000,
  minutes: number = 60,
  limit: number = 20
): Promise<
  Array<{
    timestamp: Date;
    serviceType?: AIServiceType;
    responseTime: number;
    success: boolean;
  }>
> {
  try {
    const redis = getRedisClient();
    const now = Date.now();
    const startTime = now - minutes * 60 * 1000;

    // Get all recent data
    const data = await redis.zrangebyscore('ai:performance:all', startTime, now);

    const slowRequests: Array<{
      timestamp: number;
      serviceType?: AIServiceType;
      responseTime: number;
      success: boolean;
    }> = [];

    for (const item of data) {
      const [timestampStr, jsonStr] = item.split(':');
      if (jsonStr) {
        try {
          const metric = JSON.parse(jsonStr);
          if (metric.responseTime >= thresholdMs) {
            slowRequests.push({
              timestamp: parseInt(timestampStr.split('-')[0], 10),
              serviceType: metric.serviceType,
              responseTime: metric.responseTime,
              success: metric.success,
            });
          }
        } catch (e) {
          // Skip malformed data
        }
      }
    }

    // Sort by response time (slowest first) and limit
    return slowRequests
      .sort((a, b) => b.responseTime - a.responseTime)
      .slice(0, limit)
      .map((r) => ({
        ...r,
        timestamp: new Date(r.timestamp),
      }));
  } catch (error) {
    console.error('Failed to get slow requests:', error);
    return [];
  }
}

/**
 * Get performance trends over time
 * Returns stats for each time bucket (e.g., every 5 minutes)
 */
export async function getPerformanceTrends(
  minutes: number = 60,
  bucketSizeMinutes: number = 5
): Promise<
  Array<{
    timestamp: Date;
    requests: number;
    averageResponseTime: number;
    successRate: number;
    cacheHitRate: number;
  }>
> {
  try {
    const redis = getRedisClient();
    const now = Date.now();
    const startTime = now - minutes * 60 * 1000;
    const bucketSizeMs = bucketSizeMinutes * 60 * 1000;

    // Get all data
    const data = await redis.zrangebyscore('ai:performance:all', startTime, now);

    // Group by time bucket
    const buckets: Map<
      number,
      Array<{ responseTime: number; success: boolean; cacheHit: boolean }>
    > = new Map();

    for (const item of data) {
      const [timestampStr, jsonStr] = item.split(':');
      if (jsonStr) {
        try {
          const metric = JSON.parse(jsonStr);
          const timestamp = parseInt(timestampStr.split('-')[0], 10);
          const bucketTimestamp = Math.floor(timestamp / bucketSizeMs) * bucketSizeMs;

          if (!buckets.has(bucketTimestamp)) {
            buckets.set(bucketTimestamp, []);
          }

          buckets.get(bucketTimestamp)!.push({
            responseTime: metric.responseTime,
            success: metric.success,
            cacheHit: metric.cacheHit,
          });
        } catch (e) {
          // Skip malformed data
        }
      }
    }

    // Calculate stats for each bucket
    const trends: Array<{
      timestamp: Date;
      requests: number;
      averageResponseTime: number;
      successRate: number;
      cacheHitRate: number;
    }> = [];

    for (const [bucketTimestamp, metrics] of buckets.entries()) {
      const successful = metrics.filter((m) => m.success).length;
      const cacheHits = metrics.filter((m) => m.cacheHit).length;
      const totalResponseTime = metrics.reduce((sum, m) => sum + m.responseTime, 0);

      trends.push({
        timestamp: new Date(bucketTimestamp),
        requests: metrics.length,
        averageResponseTime: metrics.length > 0 ? totalResponseTime / metrics.length : 0,
        successRate: metrics.length > 0 ? (successful / metrics.length) * 100 : 0,
        cacheHitRate: metrics.length > 0 ? (cacheHits / metrics.length) * 100 : 0,
      });
    }

    // Sort by timestamp
    return trends.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  } catch (error) {
    console.error('Failed to get performance trends:', error);
    return [];
  }
}

/**
 * Alert if performance degrades
 * Returns true if alert conditions are met
 */
export async function checkPerformanceAlerts(): Promise<{
  alert: boolean;
  reasons: string[];
}> {
  try {
    const stats = await getPerformanceStats('ALL', 15); // Last 15 minutes

    const reasons: string[] = [];

    // Alert conditions
    if (stats.requests.total >= 10) {
      // Only alert if enough data

      // High failure rate (>20%)
      if (stats.requests.successRate < 80) {
        reasons.push(
          `High failure rate: ${stats.requests.successRate.toFixed(1)}% success (threshold: 80%)`
        );
      }

      // Slow response times (P95 > 5 seconds)
      if (stats.responseTime.p95 > 5000) {
        reasons.push(
          `Slow response times: P95 = ${stats.responseTime.p95.toFixed(0)}ms (threshold: 5000ms)`
        );
      }

      // Low cache hit rate (<40%)
      if (stats.cache.hitRate < 40 && stats.requests.total >= 20) {
        reasons.push(
          `Low cache hit rate: ${stats.cache.hitRate.toFixed(1)}% (threshold: 40%)`
        );
      }
    }

    return {
      alert: reasons.length > 0,
      reasons,
    };
  } catch (error) {
    console.error('Failed to check performance alerts:', error);
    return {
      alert: false,
      reasons: [],
    };
  }
}

export default {
  recordPerformanceMetric,
  getPerformanceStats,
  getSlowRequests,
  getPerformanceTrends,
  checkPerformanceAlerts,
};
