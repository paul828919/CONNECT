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

export const dynamic = 'force-dynamic'; // Disable caching

export async function GET() {
  try {
    // TODO: Add actual health checks:
    // - Database connectivity (prisma.$queryRaw)
    // - Redis connectivity (redis.ping())
    // - Disk space check
    // - Memory usage check

    return NextResponse.json(
      {
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'Connect Platform',
        version: process.env.npm_package_version || '1.0.0',
        instance: process.env.INSTANCE_ID || 'unknown',
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Health check failed',
      },
      { status: 503 }
    );
  }
}