/**
 * Health Check Endpoint
 *
 * Used by:
 * - Docker health checks
 * - Nginx upstream health checks
 * - Load testing (k6)
 * - External monitoring (UptimeRobot)
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Redis } from 'ioredis';

export const dynamic = 'force-dynamic'; // Disable caching

// Initialize Redis clients (reuse from cache module if possible)
const redisCache = process.env.REDIS_CACHE_URL 
  ? new Redis(process.env.REDIS_CACHE_URL, { 
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
      lazyConnect: true
    })
  : null;

const redisQueue = process.env.REDIS_QUEUE_URL
  ? new Redis(process.env.REDIS_QUEUE_URL, {
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
      lazyConnect: true
    })
  : null;

export async function GET() {
  const startTime = Date.now();
  const checks: Record<string, { status: string; latency?: number; error?: string }> = {};

  try {
    // Check Database
    try {
      const dbStart = Date.now();
      await db.$queryRaw`SELECT 1`;
      checks.database = {
        status: 'healthy',
        latency: Date.now() - dbStart
      };
    } catch (error) {
      checks.database = {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Database check failed'
      };
    }

    // Check Redis Cache
    if (redisCache) {
      try {
        const cacheStart = Date.now();
        await redisCache.ping();
        checks.redis_cache = {
          status: 'healthy',
          latency: Date.now() - cacheStart
        };
      } catch (error) {
        checks.redis_cache = {
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Redis cache check failed'
        };
      }
    }

    // Check Redis Queue
    if (redisQueue) {
      try {
        const queueStart = Date.now();
        await redisQueue.ping();
        checks.redis_queue = {
          status: 'healthy',
          latency: Date.now() - queueStart
        };
      } catch (error) {
        checks.redis_queue = {
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Redis queue check failed'
        };
      }
    }

    // Determine overall status
    const allHealthy = Object.values(checks).every(check => check.status === 'healthy');
    const totalLatency = Date.now() - startTime;

    const response = {
      status: allHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      service: 'Connect Platform',
      version: process.env.npm_package_version || '1.0.0',
      instance: process.env.INSTANCE_ID || 'unknown',
      uptime: process.uptime(),
      latency: totalLatency,
      checks
    };

    return NextResponse.json(
      response,
      { status: allHealthy ? 200 : 503 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Health check failed',
        checks
      },
      { status: 503 }
    );
  }
}