/**
 * Match Explanation Service
 * Generates AI-powered Korean explanations for funding program matches
 *
 * Features:
 * - Claude Sonnet 4.5 integration via AI client wrapper
 * - Redis caching with 24-hour TTL
 * - Structured XML parsing for consistent output
 * - Cost tracking and rate limiting
 * - Professional 존댓말 (formal Korean speech)
 *
 * Week 3-4: AI Integration (Day 16-17)
 */

import { Redis } from 'ioredis';
import { sendAIRequest } from '../client';
import {
  buildMatchExplanationPrompt,
  parseMatchExplanation,
  MATCH_EXPLANATION_TEMPERATURE,
  MATCH_EXPLANATION_MAX_TOKENS,
  type MatchExplanationInput,
  type ParsedMatchExplanation,
} from '../prompts/match-explanation';
import { getFallbackContent, getErrorMessage } from '../fallback-content';

// Redis client (lazy initialization)
let redis: Redis | null = null;

function getRedisClient(): Redis {
  if (!redis) {
    redis = new Redis(process.env.REDIS_CACHE_URL || 'redis://localhost:6379/0');
  }
  return redis;
}

// Cache configuration
const CACHE_TTL_SECONDS = 3; // TEMPORARY: 3 seconds for verification (revert to 6 * 60 * 60 after confirming fix)
const CACHE_KEY_PREFIX = 'match:explanation:';

/**
 * Match Explanation Response
 */
export interface MatchExplanationResponse {
  explanation: ParsedMatchExplanation;
  cached: boolean;
  cost: number; // Cost in KRW (0 if cached)
  responseTime: number; // Response time in milliseconds
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

/**
 * Generate cache key for match explanation
 * Uses IDs for consistency and to avoid issues with name changes
 * Includes program status to prevent stale ACTIVE advice on EXPIRED programs
 */
function getCacheKey(organizationId: string, programId: string, status: string): string {
  return `${CACHE_KEY_PREFIX}${organizationId}:${programId}:${status}`;
}

/**
 * Get cached explanation from Redis
 */
async function getCachedExplanation(
  organizationId: string,
  programId: string,
  status: string
): Promise<ParsedMatchExplanation | null> {
  try {
    const redis = getRedisClient();
    const key = getCacheKey(organizationId, programId, status);
    const cached = await redis.get(key);

    if (cached) {
      console.log('[CACHE] HIT - AI Explanation:', key);
      return JSON.parse(cached) as ParsedMatchExplanation;
    }

    console.log('[CACHE] MISS - AI Explanation:', key);
    return null;
  } catch (error) {
    console.error('[CACHE] Read error - AI Explanation:', error);
    return null; // Fall through to generate new explanation
  }
}

/**
 * Cache explanation in Redis
 */
async function cacheExplanation(
  organizationId: string,
  programId: string,
  status: string,
  explanation: ParsedMatchExplanation
): Promise<void> {
  try {
    const redis = getRedisClient();
    const key = getCacheKey(organizationId, programId, status);
    await redis.setex(key, CACHE_TTL_SECONDS, JSON.stringify(explanation));
    console.log('[CACHE] SET - AI Explanation:', key, `(TTL: ${CACHE_TTL_SECONDS}s)`);
  } catch (error) {
    console.error('[CACHE] Write error - AI Explanation:', error);
    // Non-critical error, don't throw
  }
}

/**
 * Detect state inconsistency in AI-generated content
 * Logs warnings when EXPIRED/ARCHIVED programs contain ACTIVE-like language
 */
function detectStateInconsistency(
  explanation: ParsedMatchExplanation,
  programStatus: string,
  programTitle: string,
  organizationId: string
): void {
  const fullText = `${explanation.summary} ${explanation.reasons.join(' ')} ${explanation.cautions || ''} ${explanation.recommendation}`.toLowerCase();

  let inconsistencyDetected = false;
  const issues: string[] = [];

  // Check for EXPIRED/ARCHIVED programs with ACTIVE-like language
  if (programStatus === 'EXPIRED' || programStatus === 'ARCHIVED') {
    // Detect active application language
    if (fullText.includes('신청하세요') || fullText.includes('지원하세요')) {
      issues.push('ACTIVE_LANGUAGE_IN_NON_ACTIVE_PROGRAM');
      inconsistencyDetected = true;
    }

    // Detect apologetic closure language (negative framing)
    if (fullText.includes('마감') && (fullText.includes('죄송') || fullText.includes('불가능'))) {
      issues.push('APOLOGETIC_CLOSURE_LANGUAGE');
      inconsistencyDetected = true;
    }

    // Detect error mentions that destroy user trust
    if (fullText.includes('시스템 오류') || fullText.includes('오류로 보입니다')) {
      issues.push('ERROR_MENTION_IN_EXPLANATION');
      inconsistencyDetected = true;
    }
  }

  if (inconsistencyDetected) {
    console.warn('[AI_STATE_INCONSISTENCY] Detected potential content mismatch:', {
      programTitle,
      programStatus,
      organizationId,
      issues,
      timestamp: new Date().toISOString(),
      metric: 'ai.explanation.state_inconsistency',
      count: issues.length,
      summary: explanation.summary.substring(0, 100), // First 100 chars for debugging
    });
  }
}

/**
 * Main function: Generate match explanation with AI
 */
export async function generateMatchExplanation(
  input: MatchExplanationInput,
  userId?: string,
  organizationId?: string,
  programId?: string
): Promise<MatchExplanationResponse> {
  const startTime = Date.now();

  // Try to get from cache first (use IDs if available, fallback to names)
  const cacheOrgId = organizationId || input.companyName;
  const cacheProgramId = programId || input.programTitle;
  const cached = await getCachedExplanation(cacheOrgId, cacheProgramId, input.programStatus);

  if (cached) {
    const responseTime = Date.now() - startTime;
    return {
      explanation: cached,
      cached: true,
      cost: 0,
      responseTime,
    };
  }

  // Generate new explanation with AI
  try {
    const prompt = buildMatchExplanationPrompt(input);

    const aiResponse = await sendAIRequest({
      system: undefined, // System prompt is included in buildMatchExplanationPrompt
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      maxTokens: MATCH_EXPLANATION_MAX_TOKENS,
      temperature: MATCH_EXPLANATION_TEMPERATURE,
      retries: 3,
      // Cost tracking metadata
      serviceType: 'MATCH_EXPLANATION',
      userId,
      organizationId,
      endpoint: '/api/matches/[id]/explanation',
      cacheHit: false,
    });

    // Parse XML response
    const explanation = parseMatchExplanation(aiResponse.content);

    // Detect state inconsistency (logs warnings for monitoring)
    detectStateInconsistency(
      explanation,
      input.programStatus,
      input.programTitle,
      organizationId || 'UNKNOWN'
    );

    // Cache the result (use IDs if available, fallback to names)
    await cacheExplanation(cacheOrgId, cacheProgramId, input.programStatus, explanation);

    const responseTime = Date.now() - startTime;

    return {
      explanation,
      cached: false,
      cost: aiResponse.cost,
      responseTime,
      usage: aiResponse.usage,
    };
  } catch (error: any) {
    // Log error for debugging
    console.error('Match explanation generation failed:', {
      error: error.message,
      company: input.companyName,
      program: input.programTitle,
    });

    // Fallback strategy: Return manual fallback content
    console.warn('⚠️ Using fallback content for match explanation');

    const fallback = getFallbackContent('MATCH_EXPLANATION', {
      programTitle: input.programTitle,
      organizationName: input.companyName,
      matchScore: input.matchScore || 75,
      programStatus: input.programStatus,
    });

    // Parse fallback content into expected format
    const fallbackExplanation: ParsedMatchExplanation = {
      summary: fallback.korean,
      reasons: [
        '귀사의 사업 분야와 과제의 목적이 일치합니다',
        '과제 요구사항과 귀사의 역량이 부합합니다',
        '매칭 점수가 지원 기준을 충족합니다',
      ],
      cautions: 'AI 서비스 일시 중단으로 상세 분석을 제공할 수 없습니다. 과제 공고문을 직접 검토하여 세부 요건을 확인하세요.',
      recommendation: '과제 공고문 상세 검토 (지원 자격, TRL 요구사항) 후 필요한 인증 및 서류를 준비하고 신청 마감일을 확인하세요.',
    };

    const responseTime = Date.now() - startTime;

    // Return fallback response (not cached)
    return {
      explanation: fallbackExplanation,
      cached: false,
      cost: 0,
      responseTime,
    };
  }
}

/**
 * Batch generate explanations for multiple matches
 * Useful for pre-generating explanations for top matches
 */
export async function batchGenerateExplanations(
  inputs: MatchExplanationInput[],
  userId?: string,
  organizationId?: string
): Promise<MatchExplanationResponse[]> {
  // Process sequentially to respect rate limits (50 RPM)
  const results: MatchExplanationResponse[] = [];

  for (const input of inputs) {
    try {
      const result = await generateMatchExplanation(input, userId, organizationId);
      results.push(result);

      // Small delay to avoid rate limit bursts (1.2s per request = 50 RPM)
      if (results.length < inputs.length) {
        await new Promise((resolve) => setTimeout(resolve, 1200));
      }
    } catch (error: any) {
      console.error('Batch generation error for', input.programTitle, ':', error.message);
      // Continue with next match instead of failing entire batch
    }
  }

  return results;
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  totalKeys: number;
  cacheSize: string;
  hitRate?: number;
}> {
  try {
    const redis = getRedisClient();

    // Count keys matching the prefix
    const keys = await redis.keys(`${CACHE_KEY_PREFIX}*`);
    const totalKeys = keys.length;

    // Estimate cache size (rough approximation)
    let totalSize = 0;
    if (keys.length > 0) {
      // Sample first 10 keys to estimate average size
      const sampleKeys = keys.slice(0, Math.min(10, keys.length));
      for (const key of sampleKeys) {
        const value = await redis.get(key);
        if (value) {
          totalSize += value.length;
        }
      }
      // Extrapolate to all keys
      totalSize = (totalSize / sampleKeys.length) * keys.length;
    }

    const cacheSizeKB = (totalSize / 1024).toFixed(2);

    return {
      totalKeys,
      cacheSize: `${cacheSizeKB} KB`,
    };
  } catch (error) {
    console.error('Cache stats error:', error);
    return {
      totalKeys: 0,
      cacheSize: '0 KB',
    };
  }
}

/**
 * Clear cache for specific organization, program, and status
 */
export async function clearExplanationCache(
  organizationId: string,
  programId: string,
  status: string
): Promise<void> {
  try {
    const redis = getRedisClient();
    const key = getCacheKey(organizationId, programId, status);
    await redis.del(key);
  } catch (error) {
    console.error('Cache clear error:', error);
  }
}

/**
 * Clear all match explanation caches
 * Use with caution - only for maintenance or testing
 */
export async function clearAllExplanationCaches(): Promise<number> {
  try {
    const redis = getRedisClient();
    const keys = await redis.keys(`${CACHE_KEY_PREFIX}*`);

    if (keys.length === 0) {
      return 0;
    }

    await redis.del(...keys);
    return keys.length;
  } catch (error) {
    console.error('Cache clear all error:', error);
    return 0;
  }
}

const matchExplanationService = {
  generateMatchExplanation,
  batchGenerateExplanations,
  getCacheStats,
  clearExplanationCache,
  clearAllExplanationCaches,
};

export default matchExplanationService;
