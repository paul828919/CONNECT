/**
 * Example API Route with Rate Limiting
 *
 * Demonstrates how to use lib/rateLimit.ts to protect API endpoints
 * from abuse and DDoS attacks.
 *
 * Week 8: Security Hardening - Rate Limiting Example
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCacheClient } from '@/lib/cache/redis-cache';

/**
 * Rate limiter config (per IP address)
 *
 * Limit: 100 requests per 15 minutes
 */
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = 100;

export const dynamic = 'force-dynamic';

/**
 * Protected API route with rate limiting
 *
 * @example
 * curl http://localhost:3000/api/example-with-ratelimit
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Extract client IP
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : 'unknown';

    // 2. Generate rate limit key
    const rateLimitKey = `ratelimit:example:${ip}`;

    // 3. Check rate limit
    const redis = await getCacheClient();

    // If Redis unavailable, allow request through (fail open)
    if (!redis) {
      console.warn('[RATE-LIMIT] Redis unavailable, allowing request through');
      return NextResponse.json({
        message: 'Request successful (rate limiting unavailable)',
        ip,
        requestsRemaining: RATE_LIMIT_MAX_REQUESTS,
      });
    }

    const currentCount = await redis.get(rateLimitKey);
    const count = currentCount ? parseInt(currentCount, 10) : 0;

    // 4. Calculate reset time
    const resetTime = new Date(Date.now() + RATE_LIMIT_WINDOW_MS);

    // 5. Set rate limit headers
    const headers = {
      'X-RateLimit-Limit': RATE_LIMIT_MAX_REQUESTS.toString(),
      'X-RateLimit-Remaining': Math.max(0, RATE_LIMIT_MAX_REQUESTS - count - 1).toString(),
      'X-RateLimit-Reset': resetTime.toISOString(),
    };

    // 6. Check if limit exceeded
    if (count >= RATE_LIMIT_MAX_REQUESTS) {
      return NextResponse.json(
        {
          error: 'Too many requests. Please try again later.',
          retryAfter: resetTime.toISOString(),
        },
        {
          status: 429,
          headers: {
            ...headers,
            'Retry-After': Math.ceil(RATE_LIMIT_WINDOW_MS / 1000).toString(),
          },
        }
      );
    }

    // 7. Increment counter
    await redis.set(rateLimitKey, count + 1, {
      EX: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000),
    });

    // 8. Process request (your business logic here)
    return NextResponse.json(
      {
        message: 'Request successful',
        ip,
        requestsRemaining: RATE_LIMIT_MAX_REQUESTS - count - 1,
      },
      { headers }
    );

  } catch (error) {
    console.error('Rate limit error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
