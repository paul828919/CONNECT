/**
 * Redis Cache Utility for Connect Platform
 *
 * Provides intelligent caching for frequently accessed, slowly-changing data.
 *
 * Cache Layers:
 * 1. Match Generation Results (24h TTL) - Highest impact
 * 2. Organization Profiles (1h TTL) - Moderate impact
 * 3. Active Programs List (6h TTL) - Moderate impact
 * 4. AI Explanations (24h TTL) - Already implemented
 *
 * Design Principles:
 * - Fail open: Redis failures shouldn't break the app
 * - Observable: Log cache hits/misses for monitoring
 * - Invalidation: Time-based (TTL) + event-based (on updates)
 */

import { createClient } from 'redis';

// Import optimized TTL strategies
import { BASE_TTL } from './ttl-optimizer';

// TTL constants (in seconds) - now using optimized values
export const CACHE_TTL = {
  MATCH_RESULTS: BASE_TTL.MATCH_RESULTS,      // 24 hours - matches change on scraping
  ORG_PROFILE: BASE_TTL.ORGANIZATION_PROFILE, // 2 hours - profiles updated infrequently (optimized)
  PROGRAMS: BASE_TTL.PROGRAMS,                // 4 hours - updated 2-4x daily by scraper (optimized)
  AI_EXPLANATION: BASE_TTL.AI_EXPLANATION,    // 7 days - AI explanations are expensive (optimized)
} as const;

// Cache schema version - increment on breaking changes (e.g., field renames, type changes)
// This auto-invalidates stale cached data when schema changes
export const CACHE_SCHEMA_VERSION = '2.0'; // Tier 1A/1B schema (Oct 2025)

// Cache key prefixes
export const CACHE_PREFIX = {
  MATCH: 'match:org',               // match:org:{orgId}:results
  ORG: 'org:profile',               // org:profile:{orgId}
  PROGRAMS: 'programs:active',      // programs:active:list
  AI: 'ai:explanation',             // ai:explanation:{matchId}
} as const;

// Redis client singleton
let cacheClient: ReturnType<typeof createClient> | null = null;

/**
 * Get Redis cache client (singleton)
 *
 * IMPORTANT: Redis v4+ requires explicit .connect() call before use.
 * This function handles connection state and auto-reconnects if needed.
 */
export async function getCacheClient() {
  if (!cacheClient) {
    cacheClient = createClient({
      url: process.env.REDIS_CACHE_URL || 'redis://localhost:6379',
    });

    cacheClient.on('error', (err) => {
      console.error('[CACHE] Redis connection error:', err.message);
    });

    cacheClient.on('connect', () => {
      console.log('[CACHE] Redis connected successfully');
    });

    cacheClient.on('reconnecting', () => {
      console.log('[CACHE] Redis reconnecting...');
    });

    // Redis v4+ requires explicit connect() call
    await cacheClient.connect();
  }

  // Auto-reconnect if connection was lost
  if (!cacheClient.isOpen) {
    console.log('[CACHE] Redis connection lost, reconnecting...');
    await cacheClient.connect();
  }

  return cacheClient;
}

/**
 * Cache statistics for monitoring
 */
interface CacheStats {
  hits: number;
  misses: number;
  errors: number;
}

const stats: CacheStats = {
  hits: 0,
  misses: 0,
  errors: 0,
};

/**
 * Get cache statistics (for monitoring dashboard)
 */
export function getCacheStats(): CacheStats {
  return { ...stats };
}

/**
 * Reset cache statistics (for testing)
 */
export function resetCacheStats(): void {
  stats.hits = 0;
  stats.misses = 0;
  stats.errors = 0;
}

/**
 * Get value from cache
 *
 * @param key - Cache key
 * @returns Cached value or null if not found
 *
 * @example
 * const orgProfile = await getCache('org:profile:123');
 */
export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const redis = await getCacheClient();
    const value = await redis.get(key);

    if (value === null) {
      stats.misses++;
      console.log('[CACHE] MISS', key);
      return null;
    }

    const parsed = JSON.parse(value);

    // Schema version validation - auto-invalidate stale data
    if (parsed.schemaVersion !== CACHE_SCHEMA_VERSION) {
      console.log('[CACHE] SCHEMA MISMATCH - invalidating', key,
        `(cached: ${parsed.schemaVersion}, expected: ${CACHE_SCHEMA_VERSION})`);
      await deleteCache(key);
      stats.misses++;
      return null;
    }

    stats.hits++;
    console.log('[CACHE] HIT', key, `(schema: ${parsed.schemaVersion})`);
    return parsed.data as T;
  } catch (error) {
    stats.errors++;
    console.error('[CACHE] Get error:', key, error instanceof Error ? error.message : error);
    // Fail open - return null so app can fetch from DB
    return null;
  }
}

/**
 * Set value in cache with TTL
 *
 * @param key - Cache key
 * @param value - Value to cache (will be JSON stringified)
 * @param ttl - Time to live in seconds
 *
 * @example
 * await setCache('org:profile:123', orgData, CACHE_TTL.ORG_PROFILE);
 */
export async function setCache<T>(
  key: string,
  value: T,
  ttl: number
): Promise<void> {
  try {
    const redis = await getCacheClient();

    // Wrap data with schema version for future-proofing
    const versionedValue = {
      schemaVersion: CACHE_SCHEMA_VERSION,
      data: value,
    };

    // Custom JSON serializer that handles BigInt
    const serialized = JSON.stringify(versionedValue, (_, v) =>
      typeof v === 'bigint' ? v.toString() : v
    );

    await redis.set(key, serialized, {
      EX: ttl, // Expire after ttl seconds
    });
    console.log('[CACHE] SET', key, `(TTL: ${ttl}s, schema: ${CACHE_SCHEMA_VERSION})`);
  } catch (error) {
    stats.errors++;
    console.error('[CACHE] Set error:', key, error instanceof Error ? error.message : error);
    // Fail open - don't throw error, just log
  }
}

/**
 * Delete value from cache
 *
 * @param key - Cache key to delete
 *
 * @example
 * await deleteCache('org:profile:123');
 */
export async function deleteCache(key: string): Promise<void> {
  try {
    const redis = await getCacheClient();
    await redis.del(key);
    console.log('[CACHE] DELETE', key);
  } catch (error) {
    stats.errors++;
    console.error('[CACHE] Delete error:', key, error instanceof Error ? error.message : error);
  }
}

/**
 * Delete multiple keys matching a pattern
 *
 * @param pattern - Redis key pattern (e.g., 'match:org:*')
 * @returns Number of keys deleted
 *
 * @example
 * // Invalidate all match caches
 * await invalidatePattern('match:org:*');
 */
export async function invalidatePattern(pattern: string): Promise<number> {
  try {
    const redis = await getCacheClient();
    const keys = await redis.keys(pattern);

    if (keys.length === 0) {
      console.log('[CACHE] INVALIDATE pattern (0 keys)', pattern);
      return 0;
    }

    await redis.del(keys);
    console.log('[CACHE] INVALIDATE pattern', pattern, `(${keys.length} keys deleted)`);
    return keys.length;
  } catch (error) {
    stats.errors++;
    console.error('[CACHE] Invalidate pattern error:', pattern, error instanceof Error ? error.message : error);
    return 0;
  }
}

/**
 * Check if key exists in cache
 *
 * @param key - Cache key to check
 * @returns true if key exists, false otherwise
 */
export async function existsInCache(key: string): Promise<boolean> {
  try {
    const redis = await getCacheClient();
    const exists = await redis.exists(key);
    return exists === 1;
  } catch (error) {
    stats.errors++;
    console.error('[CACHE] Exists error:', key, error instanceof Error ? error.message : error);
    return false;
  }
}

/**
 * Get remaining TTL for a key
 *
 * @param key - Cache key
 * @returns Remaining TTL in seconds, or -1 if key doesn't exist, -2 if no TTL
 */
export async function getTTL(key: string): Promise<number> {
  try {
    const redis = await getCacheClient();
    return await redis.ttl(key);
  } catch (error) {
    stats.errors++;
    console.error('[CACHE] TTL error:', key, error instanceof Error ? error.message : error);
    return -1;
  }
}

/**
 * Helper: Generate cache key for match results
 *
 * @param organizationId - Organization ID
 * @returns Cache key for match results
 */
export function getMatchCacheKey(organizationId: string): string {
  return `${CACHE_PREFIX.MATCH}:${organizationId}:results`;
}

/**
 * Helper: Generate cache key for organization profile
 *
 * @param organizationId - Organization ID
 * @returns Cache key for organization profile
 */
export function getOrgCacheKey(organizationId: string): string {
  return `${CACHE_PREFIX.ORG}:${organizationId}`;
}

/**
 * Helper: Generate cache key for active programs
 *
 * @returns Cache key for active programs list
 */
export function getProgramsCacheKey(): string {
  return `${CACHE_PREFIX.PROGRAMS}:list`;
}

/**
 * Helper: Generate cache key for AI explanation
 *
 * @param matchId - Match ID
 * @returns Cache key for AI explanation
 */
export function getAIExplanationCacheKey(matchId: string): string {
  return `${CACHE_PREFIX.AI}:${matchId}`;
}

/**
 * Helper: Generate cache key for historical matches
 *
 * @param organizationId - Organization ID
 * @returns Cache key for historical match results
 */
export function getHistoricalMatchCacheKey(organizationId: string): string {
  return `historical-match:${organizationId}`;
}

/**
 * Invalidate all match caches (call after scraping completes)
 *
 * @example
 * // After scraper adds new programs:
 * await invalidateAllMatches();
 */
export async function invalidateAllMatches(): Promise<number> {
  return await invalidatePattern(`${CACHE_PREFIX.MATCH}:*`);
}

/**
 * Invalidate match cache for specific organization
 *
 * @param organizationId - Organization ID
 *
 * @example
 * // After user updates their profile:
 * await invalidateOrgMatches('org-123');
 */
export async function invalidateOrgMatches(organizationId: string): Promise<void> {
  const key = getMatchCacheKey(organizationId);
  await deleteCache(key);
}

/**
 * Invalidate organization profile cache
 *
 * @param organizationId - Organization ID
 *
 * @example
 * // After user updates their profile:
 * await invalidateOrgProfile('org-123');
 */
export async function invalidateOrgProfile(organizationId: string): Promise<void> {
  const key = getOrgCacheKey(organizationId);
  await deleteCache(key);
}

/**
 * Invalidate active programs cache
 *
 * @example
 * // After scraper completes:
 * await invalidateProgramsCache();
 */
export async function invalidateProgramsCache(): Promise<void> {
  const key = getProgramsCacheKey();
  await deleteCache(key);
}

/**
 * Invalidate historical match cache for specific organization
 *
 * @param organizationId - Organization ID
 *
 * @example
 * // After generating or clearing historical matches:
 * await invalidateHistoricalMatches('org-123');
 */
export async function invalidateHistoricalMatches(organizationId: string): Promise<void> {
  const key = getHistoricalMatchCacheKey(organizationId);
  await deleteCache(key);
}

/**
 * Graceful shutdown - close Redis connection
 */
export async function closeCacheConnection(): Promise<void> {
  if (cacheClient) {
    try {
      await cacheClient.quit();
      console.log('[CACHE] Redis connection closed');
    } catch (error) {
      console.error('[CACHE] Error closing connection:', error instanceof Error ? error.message : error);
    }
    cacheClient = null;
  }
}

// Export everything
const redisCache = {
  getCache,
  setCache,
  deleteCache,
  invalidatePattern,
  existsInCache,
  getTTL,
  getMatchCacheKey,
  getOrgCacheKey,
  getProgramsCacheKey,
  getAIExplanationCacheKey,
  getHistoricalMatchCacheKey,
  invalidateAllMatches,
  invalidateOrgMatches,
  invalidateOrgProfile,
  invalidateProgramsCache,
  invalidateHistoricalMatches,
  getCacheStats,
  resetCacheStats,
  closeCacheConnection,
};

export default redisCache;
