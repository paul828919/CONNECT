/**
 * AI Response Cache
 * Redis-based caching for AI responses
 * Target: 80%+ cache hit rate = significant cost reduction
 * 
 * Phase 3: Cache Optimization - Complete Implementation
 */

import { createHash } from 'crypto';
import { getCache, setCache } from '@/lib/cache/redis-cache';
import { BASE_TTL } from '@/lib/cache/ttl-optimizer';

export interface CacheConfig {
  ttl: number; // Time to live in seconds
  keyPrefix: string;
}

export interface CachedResponse {
  response: string;
  tokenUsage: {
    input: number;
    output: number;
  };
  timestamp: number;
  cachedAt: number;
}

export class AIResponseCache {
  private config: CacheConfig;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      ttl: config.ttl || BASE_TTL.AI_EXPLANATION,
      keyPrefix: config.keyPrefix || 'ai:response'
    };
  }

  /**
   * Generate cache key from prompt and context
   * Uses SHA-256 hash for consistent, collision-resistant keys
   */
  generateKey(prompt: string, companyId?: string, additionalContext?: string): string {
    const contextStr = [prompt, companyId || '', additionalContext || ''].join('::');
    const hash = createHash('sha256')
      .update(contextStr)
      .digest('hex');
    return `${this.config.keyPrefix}:${hash}`;
  }

  /**
   * Cache AI response with metadata
   */
  async cacheResponse(
    key: string,
    response: string,
    tokenUsage: { input: number; output: number }
  ): Promise<void> {
    try {
      const cacheData: CachedResponse = {
        response,
        tokenUsage,
        timestamp: Date.now(),
        cachedAt: Date.now(),
      };

      await setCache(key, cacheData, this.config.ttl);
      console.log('[AI CACHE] Cached response:', key, `(TTL: ${this.config.ttl}s)`);
    } catch (error) {
      console.error('[AI CACHE] Error caching response:', error);
      // Non-critical error, continue execution
    }
  }

  /**
   * Get cached AI response
   * Returns null if not found or expired
   */
  async getCachedResponse(key: string): Promise<CachedResponse | null> {
    try {
      const cached = await getCache<CachedResponse>(key);
      
      if (cached) {
        console.log('[AI CACHE] HIT:', key);
        return cached;
      }
      
      console.log('[AI CACHE] MISS:', key);
      return null;
    } catch (error) {
      console.error('[AI CACHE] Error retrieving response:', error);
      return null;
    }
  }

  /**
   * Get or generate response with automatic caching
   * 
   * @param key - Cache key
   * @param generator - Function that generates the response if not cached
   * @returns Cached response or newly generated response
   */
  async getOrGenerate(
    key: string,
    generator: () => Promise<{ response: string; tokenUsage: { input: number; output: number } }>
  ): Promise<{ response: string; cached: boolean; tokenUsage: { input: number; output: number } }> {
    // Try cache first
    const cached = await this.getCachedResponse(key);
    
    if (cached) {
      return {
        response: cached.response,
        cached: true,
        tokenUsage: cached.tokenUsage,
      };
    }

    // Generate new response
    const result = await generator();
    
    // Cache the result
    await this.cacheResponse(key, result.response, result.tokenUsage);

    return {
      ...result,
      cached: false,
    };
  }
}

/**
 * Cache strategy by feature
 * Updated with optimized TTLs based on Phase 3 analysis
 */
export const CACHE_STRATEGIES = {
  matchExplanation: {
    ttl: BASE_TTL.AI_EXPLANATION, // 7 days (expensive to generate, rarely changes)
    keyStrategy: 'organizationId + programId (use IDs, not names)',
    invalidateOn: ['program update', 'company profile change'],
    priority: 'HIGH', // Most expensive AI operation
  },
  qaGeneric: {
    ttl: 14 * 24 * 60 * 60, // 14 days (generic Q&A doesn't change)
    keyStrategy: 'question text hash only (ignore company context)',
    invalidateOn: ['manual invalidation', 'policy updates'],
    priority: 'MEDIUM',
  },
  qaPersonalized: {
    ttl: BASE_TTL.AI_CHAT, // 1 hour (company-specific advice needs freshness)
    reason: 'Company-specific advice changes with profile updates',
    keyStrategy: 'question + organizationId + relevantProfileFields',
    invalidateOn: ['company profile change', 'program updates'],
    priority: 'LOW',
  },
  programSummary: {
    ttl: BASE_TTL.PROGRAMS, // 4 hours
    keyStrategy: 'programId',
    invalidateOn: ['program update'],
    priority: 'MEDIUM',
  },
} as const;

/**
 * Create specialized cache instances for different use cases
 */
export const matchExplanationCache = new AIResponseCache({
  ttl: CACHE_STRATEGIES.matchExplanation.ttl,
  keyPrefix: 'ai:match-explanation',
});

export const qaGenericCache = new AIResponseCache({
  ttl: CACHE_STRATEGIES.qaGeneric.ttl,
  keyPrefix: 'ai:qa-generic',
});

export const qaPersonalizedCache = new AIResponseCache({
  ttl: CACHE_STRATEGIES.qaPersonalized.ttl,
  keyPrefix: 'ai:qa-personalized',
});

export const programSummaryCache = new AIResponseCache({
  ttl: CACHE_STRATEGIES.programSummary.ttl,
  keyPrefix: 'ai:program-summary',
});
