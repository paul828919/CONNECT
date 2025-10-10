/**
 * Rate Limiting Middleware for Connect Platform
 *
 * Enforces:
 * - General API rate limits (prevent DDoS)
 * - Free tier usage limits (3 matches/month)
 * - Pro tier rate limits (unlimited matches, but rate limited to prevent abuse)
 * - Authentication endpoint protection (prevent brute force)
 *
 * Uses Redis for distributed rate limiting across multiple app instances
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from 'redis';

// Redis client for rate limiting
// Note: Use separate Redis instance (redis-cache) for rate limiting
let redisClient: ReturnType<typeof createClient> | null = null;

async function getRedisClient() {
  if (!redisClient) {
    redisClient = createClient({
      url: process.env.REDIS_CACHE_URL || 'redis://localhost:6379',
    });

    redisClient.on('error', (err) => {
      console.error('Redis rate limit error:', err);
    });

    await redisClient.connect();
  }

  return redisClient;
}

/**
 * Rate limiter configuration types
 */
export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  max: number; // Maximum requests per window
  message?: string; // Error message
  keyGenerator?: (req: NextApiRequest) => string; // Custom key generator
  skip?: (req: NextApiRequest) => boolean; // Skip rate limiting for certain requests
}

/**
 * Rate limit response
 */
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: Date;
}

/**
 * General API rate limiter
 * Applies to all API endpoints (except health checks)
 *
 * Limit: 100 requests per 15 minutes per IP
 */
export const apiRateLimiter: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many API requests. Please try again later.',
  keyGenerator: (req) => {
    // Use IP address as key
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded ? (forwarded as string).split(',')[0] : req.socket.remoteAddress;
    return `ratelimit:api:${ip}`;
  },
  skip: (req) => {
    // Skip health check endpoint
    return req.url === '/api/health';
  },
};

/**
 * Authentication endpoint rate limiter
 * Prevents brute force attacks
 *
 * Limit: 10 requests per minute per IP
 */
export const authRateLimiter: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: 'Too many login attempts. Please try again in 1 minute.',
  keyGenerator: (req) => {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded ? (forwarded as string).split(',')[0] : req.socket.remoteAddress;
    return `ratelimit:auth:${ip}`;
  },
};

/**
 * Match generation rate limiter (per user)
 * Enforces free tier limit: 3 matches/month
 *
 * This is critical for business model - prevents free tier abuse
 */
export async function checkMatchLimit(
  userId: string,
  subscriptionPlan: 'free' | 'pro' | 'team'
): Promise<{ allowed: boolean; remaining: number; resetDate: Date }> {
  const redis = await getRedisClient();

  // Pro and Team users have unlimited matches
  if (subscriptionPlan === 'pro' || subscriptionPlan === 'team') {
    return {
      allowed: true,
      remaining: 999999, // Effectively unlimited
      resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    };
  }

  // Free tier: 3 matches per month
  const key = `match:limit:${userId}:${getMonthKey()}`;
  const currentCount = await redis.get(key);
  const count = currentCount ? parseInt(currentCount, 10) : 0;

  const MAX_FREE_MATCHES = 3;

  if (count >= MAX_FREE_MATCHES) {
    return {
      allowed: false,
      remaining: 0,
      resetDate: getNextMonthStart(),
    };
  }

  // Increment counter (expires at end of month)
  await redis.set(key, count + 1, {
    EXAT: Math.floor(getNextMonthStart().getTime() / 1000), // Unix timestamp
  });

  return {
    allowed: true,
    remaining: MAX_FREE_MATCHES - (count + 1),
    resetDate: getNextMonthStart(),
  };
}

/**
 * Middleware wrapper for rate limiting
 *
 * @param config - Rate limit configuration
 * @returns Middleware function
 *
 * @example
 * ```typescript
 * // In API route:
 * import { withRateLimit, apiRateLimiter } from '@/lib/rateLimit';
 *
 * async function handler(req: NextApiRequest, res: NextApiResponse) {
 *   // Your API logic
 * }
 *
 * export default withRateLimit(apiRateLimiter)(handler);
 * ```
 */
export function withRateLimit(config: RateLimitConfig) {
  return function (
    handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void
  ) {
    return async (req: NextApiRequest, res: NextApiResponse) => {
      try {
        // Skip if configured
        if (config.skip && config.skip(req)) {
          return handler(req, res);
        }

        const redis = await getRedisClient();

        // Generate key for this request
        const key = config.keyGenerator
          ? config.keyGenerator(req)
          : `ratelimit:default:${req.socket.remoteAddress}`;

        // Get current count
        const currentCount = await redis.get(key);
        const count = currentCount ? parseInt(currentCount, 10) : 0;

        // Calculate reset time
        const resetTime = new Date(Date.now() + config.windowMs);

        // Set rate limit headers
        res.setHeader('X-RateLimit-Limit', config.max);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, config.max - count - 1));
        res.setHeader('X-RateLimit-Reset', resetTime.toISOString());

        // Check if limit exceeded
        if (count >= config.max) {
          res.setHeader('Retry-After', Math.ceil(config.windowMs / 1000));
          return res.status(429).json({
            error: config.message || 'Too many requests',
            retryAfter: resetTime.toISOString(),
          });
        }

        // Increment counter
        if (count === 0) {
          // First request in window - set with expiration
          await redis.set(key, 1, {
            PX: config.windowMs, // Expire after window
          });
        } else {
          // Increment existing counter
          await redis.incr(key);
        }

        // Continue to handler
        return handler(req, res);
      } catch (error) {
        // If Redis fails, allow request through (fail open)
        // Better to allow requests than to block all users due to Redis failure
        console.error('Rate limiter error:', error);
        return handler(req, res);
      }
    };
  };
}

/**
 * Get current month key for match limit tracking
 * Format: YYYY-MM
 */
function getMonthKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Get start of next month for reset time calculation
 */
function getNextMonthStart(): Date {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth;
}

/**
 * Reset rate limit for a specific key (admin function)
 *
 * @param key - Redis key to reset
 *
 * Usage: Emergency reset if rate limit is incorrectly triggered
 */
export async function resetRateLimit(key: string): Promise<void> {
  const redis = await getRedisClient();
  await redis.del(key);
}

/**
 * Get rate limit status for a user (for API responses)
 *
 * @param key - Redis key to check
 * @returns Current count and remaining requests
 */
export async function getRateLimitStatus(
  key: string,
  max: number
): Promise<RateLimitInfo> {
  const redis = await getRedisClient();
  const currentCount = await redis.get(key);
  const count = currentCount ? parseInt(currentCount, 10) : 0;

  const ttl = await redis.ttl(key);
  const resetTime = new Date(Date.now() + ttl * 1000);

  return {
    limit: max,
    remaining: Math.max(0, max - count),
    resetTime,
  };
}

/**
 * IP-based rate limiter (for unauthenticated endpoints)
 *
 * @param req - Next.js API request
 * @param windowMs - Time window in milliseconds
 * @param max - Maximum requests per window
 * @returns true if allowed, false if rate limited
 */
export async function checkIpRateLimit(
  req: NextApiRequest,
  windowMs: number = 60000, // 1 minute default
  max: number = 60
): Promise<boolean> {
  const redis = await getRedisClient();

  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded ? (forwarded as string).split(',')[0] : req.socket.remoteAddress;
  const key = `ratelimit:ip:${ip}`;

  const currentCount = await redis.get(key);
  const count = currentCount ? parseInt(currentCount, 10) : 0;

  if (count >= max) {
    return false;
  }

  if (count === 0) {
    await redis.set(key, 1, { PX: windowMs });
  } else {
    await redis.incr(key);
  }

  return true;
}

/**
 * Usage tracking for analytics
 * Track API calls per user for business intelligence
 *
 * @param userId - User ID
 * @param endpoint - API endpoint called
 */
export async function trackApiUsage(
  userId: string,
  endpoint: string
): Promise<void> {
  try {
    const redis = await getRedisClient();
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    const key = `analytics:api:${date}:${userId}:${endpoint}`;
    await redis.incr(key);

    // Expire after 90 days (PIPA retention policy)
    await redis.expire(key, 90 * 24 * 60 * 60);
  } catch (error) {
    // Don't throw error - tracking failure should not block request
    console.error('Failed to track API usage:', error);
  }
}

/**
 * Get user's API usage for current month (for dashboard display)
 *
 * @param userId - User ID
 * @returns Usage statistics
 */
export async function getUserApiUsage(userId: string): Promise<{
  matchesGenerated: number;
  apiCallsToday: number;
  subscriptionPlan: string;
}> {
  const redis = await getRedisClient();

  // Get matches generated this month
  const matchKey = `match:limit:${userId}:${getMonthKey()}`;
  const matchCount = await redis.get(matchKey);

  // Get API calls today
  const date = new Date().toISOString().split('T')[0];
  const keys = await redis.keys(`analytics:api:${date}:${userId}:*`);

  let totalCalls = 0;
  for (const key of keys) {
    const count = await redis.get(key);
    totalCalls += count ? parseInt(count, 10) : 0;
  }

  return {
    matchesGenerated: matchCount ? parseInt(matchCount, 10) : 0,
    apiCallsToday: totalCalls,
    subscriptionPlan: 'free', // TODO: Get from database
  };
}

/**
 * Clean up expired rate limit keys (maintenance task)
 *
 * Run this weekly to clean up any keys that didn't auto-expire
 */
export async function cleanupExpiredKeys(): Promise<number> {
  const redis = await getRedisClient();

  // Get all rate limit keys
  const keys = await redis.keys('ratelimit:*');

  let deleted = 0;
  for (const key of keys) {
    const ttl = await redis.ttl(key);
    // If TTL is -1, key exists but has no expiration (shouldn't happen)
    // If TTL is -2, key doesn't exist
    if (ttl === -1) {
      await redis.del(key);
      deleted++;
    }
  }

  console.log(`Cleaned up ${deleted} expired rate limit keys`);
  return deleted;
}

// Export everything
export default {
  withRateLimit,
  apiRateLimiter,
  authRateLimiter,
  checkMatchLimit,
  resetRateLimit,
  getRateLimitStatus,
  checkIpRateLimit,
  trackApiUsage,
  getUserApiUsage,
  cleanupExpiredKeys,
};