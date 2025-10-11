/**
 * Anthropic Claude AI Client Wrapper
 * Connect Platform - Week 3-4 AI Integration
 *
 * Features:
 * - Rate limiting (50 RPM Tier 1, configurable)
 * - Error handling with exponential backoff
 * - Cost tracking and budget alerts
 * - Request logging
 * - Retry logic for transient errors
 */

import Anthropic from '@anthropic-ai/sdk';
import { Redis } from 'ioredis';
import { logAICost } from './monitoring/cost-logger';
import { checkBudgetAndAlert } from './monitoring/budget-alerts';
import { recordPerformanceMetric } from './monitoring/performance';
import { AIServiceType } from '@prisma/client';

// Lazy initialization to avoid environment loading issues
let anthropic: Anthropic | null = null;
let redis: Redis | null = null;

/**
 * Get Anthropic client (lazy initialization)
 */
function getAnthropicClient(): Anthropic {
  if (!anthropic) {
    if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your_api_key_here') {
      throw new Error(
        'ANTHROPIC_API_KEY not configured. Get your key from https://console.anthropic.com/'
      );
    }
    anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return anthropic;
}

/**
 * Get Redis client (lazy initialization)
 */
function getRedisClient(): Redis {
  if (!redis) {
    redis = new Redis(process.env.REDIS_CACHE_URL || 'redis://localhost:6379/0');
  }
  return redis;
}

// Configuration
const CONFIG = {
  model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929',
  maxTokens: parseInt(process.env.ANTHROPIC_MAX_TOKENS || '4096', 10),
  temperature: parseFloat(process.env.ANTHROPIC_TEMPERATURE || '0.7'),
  rateLimitPerMinute: parseInt(process.env.AI_RATE_LIMIT_PER_MINUTE || '50', 10),
  dailyBudgetKRW: parseInt(process.env.AI_DAILY_BUDGET_KRW || '50000', 10),
  // Circuit breaker configuration
  circuitBreaker: {
    failureThreshold: parseInt(process.env.AI_CIRCUIT_BREAKER_THRESHOLD || '5', 10), // Failures before opening
    failureWindowMs: parseInt(process.env.AI_CIRCUIT_BREAKER_WINDOW || '60000', 10), // 60 seconds
    openTimeoutMs: parseInt(process.env.AI_CIRCUIT_BREAKER_TIMEOUT || '30000', 10), // 30 seconds before HALF_OPEN
    halfOpenMaxRequests: parseInt(process.env.AI_CIRCUIT_BREAKER_HALF_OPEN_MAX || '1', 10), // Test requests in HALF_OPEN
  },
};

// Circuit breaker states
export enum CircuitBreakerState {
  CLOSED = 'CLOSED', // Normal operation
  OPEN = 'OPEN', // Failing, reject requests
  HALF_OPEN = 'HALF_OPEN', // Testing recovery
}

// Circuit breaker state interface
interface CircuitBreakerStatus {
  state: CircuitBreakerState;
  failures: number;
  lastFailureTime: number | null;
  openedAt: number | null;
  halfOpenRequests: number;
}

// Cost calculation (USD to KRW conversion at 1 USD = ₩1,300)
const COST_PER_1K_INPUT_TOKENS = 0.003 * 1300; // ₩3.90
const COST_PER_1K_OUTPUT_TOKENS = 0.015 * 1300; // ₩19.50

/**
 * Rate limiter using Redis sliding window
 */
async function checkRateLimit(): Promise<boolean> {
  const redis = getRedisClient();
  const key = 'ai:ratelimit:minute';
  const now = Date.now();
  const windowStart = now - 60000; // 1 minute ago

  // Remove old entries
  await redis.zremrangebyscore(key, '-inf', windowStart);

  // Count requests in current window
  const count = await redis.zcard(key);

  if (count >= CONFIG.rateLimitPerMinute) {
    return false; // Rate limit exceeded
  }

  // Add current request
  await redis.zadd(key, now, `${now}-${Math.random()}`);
  await redis.expire(key, 60); // Expire after 1 minute

  return true;
}

/**
 * Check daily budget
 */
async function checkDailyBudget(): Promise<{ allowed: boolean; spent: number; remaining: number }> {
  const redis = getRedisClient();
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const key = `ai:budget:${today}`;

  const spentStr = await redis.get(key);
  const spent = spentStr ? parseFloat(spentStr) : 0;
  const remaining = CONFIG.dailyBudgetKRW - spent;

  return {
    allowed: remaining > 0,
    spent,
    remaining,
  };
}

/**
 * Track cost in Redis
 */
async function trackCost(inputTokens: number, outputTokens: number): Promise<number> {
  const redis = getRedisClient();
  const inputCost = (inputTokens / 1000) * COST_PER_1K_INPUT_TOKENS;
  const outputCost = (outputTokens / 1000) * COST_PER_1K_OUTPUT_TOKENS;
  const totalCost = inputCost + outputCost;

  const today = new Date().toISOString().split('T')[0];
  const key = `ai:budget:${today}`;

  await redis.incrbyfloat(key, totalCost);
  await redis.expire(key, 86400 * 2); // Keep for 2 days

  // Alert if budget threshold exceeded
  const budget = await checkDailyBudget();
  if (budget.spent > CONFIG.dailyBudgetKRW * 0.8) {
    console.warn(`⚠️  AI Budget Alert: ${budget.spent.toFixed(0)}₩ / ${CONFIG.dailyBudgetKRW}₩ spent today (${((budget.spent / CONFIG.dailyBudgetKRW) * 100).toFixed(1)}%)`);
  }

  return totalCost;
}

/**
 * Sleep utility for retry backoff
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Get circuit breaker status from Redis
 */
async function getCircuitBreakerStatus(): Promise<CircuitBreakerStatus> {
  const redis = getRedisClient();
  const key = 'ai:circuit-breaker:status';

  const data = await redis.get(key);
  if (!data) {
    // Default: CLOSED state (normal operation)
    return {
      state: CircuitBreakerState.CLOSED,
      failures: 0,
      lastFailureTime: null,
      openedAt: null,
      halfOpenRequests: 0,
    };
  }

  return JSON.parse(data) as CircuitBreakerStatus;
}

/**
 * Save circuit breaker status to Redis
 */
async function saveCircuitBreakerStatus(status: CircuitBreakerStatus): Promise<void> {
  const redis = getRedisClient();
  const key = 'ai:circuit-breaker:status';
  await redis.set(key, JSON.stringify(status), 'EX', 300); // Expire after 5 minutes
}

/**
 * Record a failure in circuit breaker
 */
async function recordCircuitBreakerFailure(): Promise<CircuitBreakerState> {
  const status = await getCircuitBreakerStatus();
  const now = Date.now();

  // Check if failure is within the time window
  const windowStart = now - CONFIG.circuitBreaker.failureWindowMs;
  const isWithinWindow = status.lastFailureTime && status.lastFailureTime > windowStart;

  if (!isWithinWindow) {
    // Reset failure count if outside window
    status.failures = 1;
  } else {
    status.failures += 1;
  }

  status.lastFailureTime = now;

  // Transition to OPEN if threshold exceeded
  if (status.failures >= CONFIG.circuitBreaker.failureThreshold && status.state === CircuitBreakerState.CLOSED) {
    status.state = CircuitBreakerState.OPEN;
    status.openedAt = now;
    status.halfOpenRequests = 0;
    console.error(`🔴 Circuit Breaker OPENED after ${status.failures} failures`);
  }

  await saveCircuitBreakerStatus(status);
  return status.state;
}

/**
 * Record a success in circuit breaker
 */
async function recordCircuitBreakerSuccess(): Promise<void> {
  const status = await getCircuitBreakerStatus();

  if (status.state === CircuitBreakerState.HALF_OPEN) {
    // Successful test request in HALF_OPEN → Transition to CLOSED
    status.state = CircuitBreakerState.CLOSED;
    status.failures = 0;
    status.lastFailureTime = null;
    status.openedAt = null;
    status.halfOpenRequests = 0;
    console.log('🟢 Circuit Breaker CLOSED (recovered)');
  } else if (status.state === CircuitBreakerState.CLOSED) {
    // Reset failure count on success
    status.failures = 0;
    status.lastFailureTime = null;
  }

  await saveCircuitBreakerStatus(status);
}

/**
 * Check if circuit breaker allows request
 * Returns: { allowed: boolean, state: CircuitBreakerState, reason?: string }
 */
async function checkCircuitBreaker(): Promise<{
  allowed: boolean;
  state: CircuitBreakerState;
  reason?: string;
}> {
  const status = await getCircuitBreakerStatus();
  const now = Date.now();

  // CLOSED: Allow all requests
  if (status.state === CircuitBreakerState.CLOSED) {
    return { allowed: true, state: CircuitBreakerState.CLOSED };
  }

  // OPEN: Check if timeout has passed to transition to HALF_OPEN
  if (status.state === CircuitBreakerState.OPEN) {
    const openDuration = status.openedAt ? now - status.openedAt : 0;

    if (openDuration >= CONFIG.circuitBreaker.openTimeoutMs) {
      // Transition to HALF_OPEN
      status.state = CircuitBreakerState.HALF_OPEN;
      status.halfOpenRequests = 0;
      await saveCircuitBreakerStatus(status);
      console.warn('🟡 Circuit Breaker transitioned to HALF_OPEN (testing recovery)');
      return { allowed: true, state: CircuitBreakerState.HALF_OPEN };
    }

    // Still OPEN, reject request
    const remainingMs = CONFIG.circuitBreaker.openTimeoutMs - openDuration;
    return {
      allowed: false,
      state: CircuitBreakerState.OPEN,
      reason: `Circuit breaker is OPEN. Service will retry in ${Math.ceil(remainingMs / 1000)} seconds.`,
    };
  }

  // HALF_OPEN: Allow limited test requests
  if (status.state === CircuitBreakerState.HALF_OPEN) {
    if (status.halfOpenRequests < CONFIG.circuitBreaker.halfOpenMaxRequests) {
      status.halfOpenRequests += 1;
      await saveCircuitBreakerStatus(status);
      return { allowed: true, state: CircuitBreakerState.HALF_OPEN };
    }

    // Max test requests reached, reject
    return {
      allowed: false,
      state: CircuitBreakerState.HALF_OPEN,
      reason: 'Circuit breaker is testing recovery. Please wait...',
    };
  }

  // Fallback: Reject
  return { allowed: false, state: status.state, reason: 'Circuit breaker blocked request' };
}

/**
 * AI Request Options
 */
export interface AIRequestOptions {
  system?: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
  retries?: number; // Number of retry attempts (default: 3)
  // Metadata for cost tracking
  serviceType?: AIServiceType;
  userId?: string;
  organizationId?: string;
  endpoint?: string;
  cacheHit?: boolean;
}

/**
 * AI Response
 */
export interface AIResponse {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  cost: number; // Cost in KRW
  model: string;
  stopReason: string;
}

/**
 * Main AI request function with error handling and retries
 */
export async function sendAIRequest(options: AIRequestOptions): Promise<AIResponse> {
  const {
    system,
    messages,
    maxTokens,
    temperature,
    stream = false,
    retries = 3,
    serviceType,
    userId,
    organizationId,
    endpoint,
    cacheHit = false,
  } = options;

  // Circuit breaker check
  const circuitCheck = await checkCircuitBreaker();
  if (!circuitCheck.allowed) {
    console.warn(`⚠️ Circuit Breaker ${circuitCheck.state}: ${circuitCheck.reason}`);
    throw new Error(circuitCheck.reason || 'AI service temporarily unavailable. Please try again later.');
  }

  // Rate limit check
  const rateLimitOk = await checkRateLimit();
  if (!rateLimitOk) {
    throw new Error('Rate limit exceeded. Please try again in a moment.');
  }

  // Budget check
  const budget = await checkDailyBudget();
  if (!budget.allowed) {
    throw new Error(
      `Daily budget exceeded: ${budget.spent.toFixed(0)}₩ / ${CONFIG.dailyBudgetKRW}₩ spent. Budget resets at midnight KST.`
    );
  }

  let lastError: Error | null = null;
  let startTime = Date.now();

  // Retry loop with exponential backoff
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      startTime = Date.now();

      const anthropicClient = getAnthropicClient();
      const response = await anthropicClient.messages.create({
        model: CONFIG.model,
        max_tokens: maxTokens || CONFIG.maxTokens,
        temperature: temperature !== undefined ? temperature : CONFIG.temperature,
        system,
        messages,
        stream,
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Handle streaming response
      if (stream) {
        throw new Error('Streaming not yet implemented in this wrapper. Use non-streaming mode.');
      }

      // Type assertion: we know response is Message (not Stream) after stream check
      const message = response as Anthropic.Message;

      // Extract text content
      const content = message.content
        .filter((block: any) => block.type === 'text')
        .map((block: any) => ('text' in block ? block.text : ''))
        .join('\n');

      // Track usage and cost
      const inputTokens = message.usage.input_tokens;
      const outputTokens = message.usage.output_tokens;
      const cost = await trackCost(inputTokens, outputTokens);

      // Log to database for persistent tracking
      if (serviceType && endpoint) {
        await logAICost({
          serviceType,
          userId,
          organizationId,
          endpoint,
          model: CONFIG.model,
          inputTokens,
          outputTokens,
          costKRW: cost,
          duration,
          success: true,
          cacheHit,
        });
      }

      // Check budget and send alerts if needed
      const budget = await checkDailyBudget();
      await checkBudgetAndAlert(budget.spent, CONFIG.dailyBudgetKRW);

      // Record circuit breaker success
      await recordCircuitBreakerSuccess();

      // Record performance metric
      if (serviceType) {
        const circuitBreakerStatus = await getCircuitBreakerStatus();
        await recordPerformanceMetric({
          timestamp: Date.now(),
          serviceType,
          responseTime: duration,
          success: true,
          cacheHit,
          cost,
          circuitBreakerState: circuitBreakerStatus.state,
        });
      }

      // Log request (development only)
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ AI Request:', {
          duration: `${duration}ms`,
          inputTokens,
          outputTokens,
          cost: `₩${cost.toFixed(2)}`,
          stopReason: message.stop_reason,
          cacheHit,
        });
      }

      return {
        content,
        usage: {
          inputTokens,
          outputTokens,
        },
        cost,
        model: message.model,
        stopReason: message.stop_reason || 'unknown',
      };
    } catch (error: any) {
      lastError = error;

      // Record circuit breaker failure for severe errors
      const isSevereError =
        error.status === 500 || // Server error
        error.status === 503 || // Service unavailable
        error.code === 'ECONNRESET' || // Connection reset
        error.code === 'ETIMEDOUT' || // Timeout
        error.message?.includes('network') ||
        error.message?.includes('timeout');

      if (isSevereError) {
        await recordCircuitBreakerFailure();
      }

      // Record performance metric for failure
      if (serviceType) {
        const circuitBreakerStatus = await getCircuitBreakerStatus();
        await recordPerformanceMetric({
          timestamp: Date.now(),
          serviceType,
          responseTime: Date.now() - startTime,
          success: false,
          cacheHit: false,
          cost: 0,
          circuitBreakerState: circuitBreakerStatus.state,
        });
      }

      // Log failed request to database
      if (serviceType && endpoint) {
        await logAICost({
          serviceType,
          userId,
          organizationId,
          endpoint,
          model: CONFIG.model,
          inputTokens: 0,
          outputTokens: 0,
          costKRW: 0,
          duration: Date.now() - startTime,
          success: false,
          errorMessage: error.message,
          cacheHit,
        });
      }

      // Check if error is retryable
      const isRetryable =
        error.status === 429 || // Rate limit
        error.status === 500 || // Server error
        error.status === 503 || // Service unavailable
        error.code === 'ECONNRESET' || // Connection reset
        error.code === 'ETIMEDOUT'; // Timeout

      if (!isRetryable || attempt === retries) {
        // Log error
        console.error('❌ AI Request failed:', {
          attempt: attempt + 1,
          error: error.message,
          status: error.status,
          type: error.type,
        });

        // Transform error message for user-friendly display
        if (error.status === 401) {
          throw new Error('API key is invalid. Please check your ANTHROPIC_API_KEY configuration.');
        } else if (error.status === 429) {
          throw new Error('Rate limit exceeded. Please try again in a moment.');
        } else if (error.status === 400) {
          throw new Error(`Bad request: ${error.message}`);
        } else {
          throw new Error(`AI request failed: ${error.message}`);
        }
      }

      // Exponential backoff: 1s, 2s, 4s
      const backoffMs = Math.pow(2, attempt) * 1000;
      console.warn(`⚠️  Retrying AI request (attempt ${attempt + 1}/${retries}) after ${backoffMs}ms...`);
      await sleep(backoffMs);
    }
  }

  // Should never reach here, but TypeScript needs this
  throw lastError || new Error('AI request failed after retries');
}

/**
 * Get current budget status
 */
export async function getBudgetStatus(): Promise<{
  spent: number;
  remaining: number;
  percentage: number;
  dailyLimit: number;
}> {
  const budget = await checkDailyBudget();
  return {
    spent: budget.spent,
    remaining: budget.remaining,
    percentage: (budget.spent / CONFIG.dailyBudgetKRW) * 100,
    dailyLimit: CONFIG.dailyBudgetKRW,
  };
}

/**
 * Get rate limit status
 */
export async function getRateLimitStatus(): Promise<{
  used: number;
  limit: number;
  remaining: number;
}> {
  const redis = getRedisClient();
  const key = 'ai:ratelimit:minute';
  const now = Date.now();
  const windowStart = now - 60000;

  await redis.zremrangebyscore(key, '-inf', windowStart);
  const used = await redis.zcard(key);

  return {
    used,
    limit: CONFIG.rateLimitPerMinute,
    remaining: CONFIG.rateLimitPerMinute - used,
  };
}

/**
 * Get circuit breaker status for monitoring
 */
export async function getCircuitBreakerStatusExternal(): Promise<{
  state: CircuitBreakerState;
  failures: number;
  lastFailureTime: number | null;
  openedAt: number | null;
  config: {
    failureThreshold: number;
    failureWindowMs: number;
    openTimeoutMs: number;
  };
}> {
  const status = await getCircuitBreakerStatus();
  return {
    state: status.state,
    failures: status.failures,
    lastFailureTime: status.lastFailureTime,
    openedAt: status.openedAt,
    config: {
      failureThreshold: CONFIG.circuitBreaker.failureThreshold,
      failureWindowMs: CONFIG.circuitBreaker.failureWindowMs,
      openTimeoutMs: CONFIG.circuitBreaker.openTimeoutMs,
    },
  };
}

/**
 * Health check for AI client
 */
export async function healthCheck(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  details: {
    apiKeyConfigured: boolean;
    redisConnected: boolean;
    budgetRemaining: number;
    rateLimitRemaining: number;
    circuitBreakerState: CircuitBreakerState;
  };
}> {
  try {
    // Check Redis connection
    const redis = getRedisClient();
    await redis.ping();

    // Check budget and rate limit
    const budget = await checkDailyBudget();
    const rateLimit = await getRateLimitStatus();
    const circuitBreaker = await getCircuitBreakerStatus();

    const status =
      budget.remaining > 0 && rateLimit.remaining > 0 && circuitBreaker.state === CircuitBreakerState.CLOSED
        ? 'healthy'
        : budget.remaining <= 0 || circuitBreaker.state === CircuitBreakerState.OPEN
        ? 'unhealthy'
        : 'degraded';

    return {
      status,
      details: {
        apiKeyConfigured: !!process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your_api_key_here',
        redisConnected: true,
        budgetRemaining: budget.remaining,
        rateLimitRemaining: rateLimit.remaining,
        circuitBreakerState: circuitBreaker.state,
      },
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      details: {
        apiKeyConfigured: !!process.env.ANTHROPIC_API_KEY,
        redisConnected: false,
        budgetRemaining: 0,
        rateLimitRemaining: 0,
        circuitBreakerState: CircuitBreakerState.OPEN,
      },
    };
  }
}

export default {
  sendAIRequest,
  getBudgetStatus,
  getRateLimitStatus,
  getCircuitBreakerStatusExternal,
  healthCheck,
};
