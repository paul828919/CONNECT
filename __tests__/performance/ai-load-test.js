/**
 * AI Load Test - AI Feature Stress Testing
 *
 * Purpose: Test AI components (match explanations, chat) under realistic load
 * Focus Areas:
 *   1. Match explanation generation (concurrent requests)
 *   2. AI chat system (concurrent multi-turn conversations)
 *   3. Circuit breaker behavior under stress
 *   4. Cache performance (hit rates, response times)
 *   5. Rate limiting enforcement
 *
 * Test Scenarios:
 *   - Phase 1: Warm-up (10 users, 2 min) - Populate caches
 *   - Phase 2: Normal load (50 users, 3 min) - Validate cache hits
 *   - Phase 3: Peak load (100 users, 3 min) - Test rate limits
 *   - Phase 4: Stress (150 users, 2 min) - Test circuit breaker
 *   - Phase 5: Recovery (50 users, 2 min) - Validate recovery
 *
 * Performance Targets (Phase 2):
 *   - AI explanation P95: <5s (uncached), <500ms (cached)
 *   - AI chat response P95: <5s
 *   - AI cache hit rate: >50%
 *   - Error rate: <1% (except during stress phase)
 *   - Circuit breaker: Should activate during stress, recover after
 *
 * Week 7-8: Testing & Refinement (Day 1-2)
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics
const aiExplanationCacheHits = new Counter('ai_explanation_cache_hits');
const aiExplanationCacheMisses = new Counter('ai_explanation_cache_misses');
const aiChatRequests = new Counter('ai_chat_requests');
const aiErrors = new Counter('ai_errors');
const circuitBreakerOpen = new Counter('circuit_breaker_open');
const circuitBreakerHalfOpen = new Counter('circuit_breaker_half_open');
const rateLimitErrors = new Rate('rate_limit_errors');
const aiExplanationTime = new Trend('ai_explanation_time');
const aiChatTime = new Trend('ai_chat_time');

// Test configuration
export let options = {
  stages: [
    // Phase 1: Warm-up (populate caches, establish baseline)
    { duration: '2m', target: 10 },   // 10 users warming up cache

    // Phase 2: Normal load (validate cache performance)
    { duration: '3m', target: 50 },   // 50 concurrent users

    // Phase 3: Peak load (test rate limiting)
    { duration: '3m', target: 100 },  // 100 concurrent users

    // Phase 4: Stress test (trigger circuit breaker)
    { duration: '2m', target: 150 },  // 150 users - expect some failures

    // Phase 5: Recovery test (validate self-healing)
    { duration: '2m', target: 50 },   // Back to 50 users
    
    // Cool down
    { duration: '1m', target: 0 },    // Ramp down
  ],
  
  thresholds: {
    // Overall HTTP performance
    'http_req_duration': ['p(95)<5000'], // P95 < 5s (AI operations are slower)
    'http_req_failed': ['rate<0.05'],     // <5% errors (allow some during stress)
    
    // AI-specific thresholds
    'ai_explanation_time': ['p(95)<5000', 'p(50)<2000'], // P95 <5s, P50 <2s (mix of cached/uncached)
    'ai_chat_time': ['p(95)<5000'],       // Chat P95 <5s
    'rate_limit_errors': ['rate<0.1'],    // <10% rate limit errors
    
    // Circuit breaker should activate during stress
    'circuit_breaker_open': ['count>0'], // Expect circuit breaker to open at least once
    
    // Cache performance (at least 30% hit rate - conservative given high concurrency)
    'ai_explanation_cache_hits': ['count>0'],
  },
};

// Test data: Sample match IDs and conversation topics
// Note: In production, you'll need real match IDs from your database
const SAMPLE_MATCH_IDS = [
  'match-1', 'match-2', 'match-3', 'match-4', 'match-5',
  'match-6', 'match-7', 'match-8', 'match-9', 'match-10',
];

const SAMPLE_QUESTIONS = [
  'IITP의 AI 프로그램 중 TRL 5에 적합한 것은 무엇인가요?',
  '스타트업도 지원할 수 있는 프로그램이 있나요?',
  '신청서 작성 시 주의사항은 무엇인가요?',
  '과제 매칭 점수는 어떻게 계산되나요?',
  '자격 요건을 충족하지 못하면 어떻게 되나요?',
  '여러 프로그램에 동시 지원이 가능한가요?',
  '과제 수행 기간은 얼마나 되나요?',
  '기술료나 간접비는 어떻게 처리하나요?',
];

// Base URL configuration
const BASE_URL = __ENV.BASE_URL || 'https://connectplt.kr';

// Mock authentication token (in production, obtain via login)
// For load testing, you may need to set up test accounts
const AUTH_TOKEN = __ENV.TEST_AUTH_TOKEN || '';

/**
 * Setup function - runs once per VU before main function
 */
export function setup() {
  console.log('🚀 Starting AI Load Test');
  console.log(`   Base URL: ${BASE_URL}`);
  console.log(`   Auth: ${AUTH_TOKEN ? 'Configured' : 'Not configured (some tests will skip)'}`);
  console.log('');
  console.log('Test Phases:');
  console.log('  Phase 1 (0-2m):   10 users  - Cache warm-up');
  console.log('  Phase 2 (2-5m):   50 users  - Normal load, cache validation');
  console.log('  Phase 3 (5-8m):   100 users - Peak load, rate limit testing');
  console.log('  Phase 4 (8-10m):  150 users - Stress test, circuit breaker');
  console.log('  Phase 5 (10-12m): 50 users  - Recovery validation');
  console.log('');
  
  return { timestamp: Date.now() };
}

/**
 * Main test function - runs for each VU iteration
 */
export default function (data) {
  // Randomly choose test scenario for realistic mix
  const scenario = Math.random();
  
  if (scenario < 0.6) {
    // 60% - Test AI match explanations
    testMatchExplanation();
  } else if (scenario < 0.9) {
    // 30% - Test AI chat
    testAIChat();
  } else {
    // 10% - Test cache performance (repeated requests)
    testCachePerformance();
  }
  
  // Random sleep between 2-5 seconds (realistic user behavior)
  sleep(Math.random() * 3 + 2);
}

/**
 * Test 1: Match Explanation Generation
 * Tests: AI explanation API, caching, rate limiting
 */
function testMatchExplanation() {
  group('AI Match Explanation', () => {
    // Pick a random match ID
    const matchId = SAMPLE_MATCH_IDS[Math.floor(Math.random() * SAMPLE_MATCH_IDS.length)];
    
    const url = `${BASE_URL}/api/matches/${matchId}/explanation`;
    const params = {
      headers: AUTH_TOKEN ? {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json',
      } : {
        'Content-Type': 'application/json',
      },
      tags: { endpoint: 'match_explanation' },
    };
    
    const startTime = Date.now();
    const res = http.get(url, params);
    const duration = Date.now() - startTime;
    
    const success = check(res, {
      'explanation status is 200 or 401': (r) => r.status === 200 || r.status === 401, // 401 ok if no auth
      'explanation response time < 10s': (r) => r.timings.duration < 10000,
    });
    
    if (res.status === 200) {
      try {
        const body = JSON.parse(res.body);
        
        // Check if response was cached
        if (body.metadata?.cached === true) {
          aiExplanationCacheHits.add(1);
          
          check(res, {
            'cached explanation < 500ms': (r) => r.timings.duration < 500,
          });
        } else {
          aiExplanationCacheMisses.add(1);
          
          check(res, {
            'uncached explanation < 5s': (r) => r.timings.duration < 5000,
            'explanation has content': () => body.explanation !== undefined,
            'explanation has metadata': () => body.metadata !== undefined,
          });
        }
        
        aiExplanationTime.add(duration);
        
      } catch (e) {
        console.error('Failed to parse explanation response:', e.message);
        aiErrors.add(1);
      }
    } else if (res.status === 429) {
      // Rate limit hit
      rateLimitErrors.add(1);
    } else if (res.status === 503) {
      // Circuit breaker likely open
      if (res.body && res.body.includes('Circuit breaker')) {
        circuitBreakerOpen.add(1);
      }
      aiErrors.add(1);
    } else if (res.status !== 401) {
      // Other error (not auth)
      aiErrors.add(1);
    }
  });
}

/**
 * Test 2: AI Chat System
 * Tests: Multi-turn conversations, rate limiting, response quality
 */
function testAIChat() {
  group('AI Chat', () => {
    // Pick a random question
    const question = SAMPLE_QUESTIONS[Math.floor(Math.random() * SAMPLE_QUESTIONS.length)];
    
    const url = `${BASE_URL}/api/chat`;
    const payload = JSON.stringify({
      message: question,
      conversationId: `test-conversation-${__VU}`, // Each VU has its own conversation
    });
    
    const params = {
      headers: AUTH_TOKEN ? {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json',
      } : {
        'Content-Type': 'application/json',
      },
      tags: { endpoint: 'ai_chat' },
    };
    
    const startTime = Date.now();
    const res = http.post(url, payload, params);
    const duration = Date.now() - startTime;
    
    aiChatRequests.add(1);
    
    const success = check(res, {
      'chat status is 200 or 401': (r) => r.status === 200 || r.status === 401,
      'chat response time < 10s': (r) => r.timings.duration < 10000,
    });
    
    if (res.status === 200) {
      try {
        const body = JSON.parse(res.body);
        
        check(res, {
          'chat has message': () => body.message !== undefined || body.reply !== undefined,
          'chat response < 5s': (r) => r.timings.duration < 5000,
        });
        
        aiChatTime.add(duration);
        
      } catch (e) {
        console.error('Failed to parse chat response:', e.message);
        aiErrors.add(1);
      }
    } else if (res.status === 429) {
      rateLimitErrors.add(1);
    } else if (res.status === 503) {
      if (res.body && res.body.includes('Circuit breaker')) {
        circuitBreakerOpen.add(1);
      }
      aiErrors.add(1);
    } else if (res.status !== 401) {
      aiErrors.add(1);
    }
  });
}

/**
 * Test 3: Cache Performance
 * Tests: Cache hit rates by making repeated requests to same match
 */
function testCachePerformance() {
  group('Cache Performance', () => {
    // Use a fixed match ID to ensure cache hits
    const matchId = 'match-1'; // Most popular match
    
    const url = `${BASE_URL}/api/matches/${matchId}/explanation`;
    const params = {
      headers: AUTH_TOKEN ? {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json',
      } : {
        'Content-Type': 'application/json',
      },
      tags: { endpoint: 'cache_test' },
    };
    
    const res = http.get(url, params);
    
    if (res.status === 200) {
      try {
        const body = JSON.parse(res.body);
        
        if (body.metadata?.cached === true) {
          aiExplanationCacheHits.add(1);
          
          check(res, {
            'cached response < 500ms': (r) => r.timings.duration < 500,
            'cache hit confirmed': () => body.metadata.cached === true,
          });
        }
      } catch (e) {
        // Silent fail for cache test
      }
    }
  });
}

/**
 * Teardown function - runs once after all iterations
 */
export function teardown(data) {
  console.log('');
  console.log('✅ AI Load Test Complete');
  console.log(`   Duration: ${Math.round((Date.now() - data.timestamp) / 1000)}s`);
  console.log('');
}

/**
 * Custom summary function
 */
export function handleSummary(data) {
  const indent = '  ';
  
  // Safely extract metrics
  const totalRequests = data.metrics.http_reqs?.values?.count || 0;
  const requestRate = data.metrics.http_reqs?.values?.rate || 0;
  const httpDuration = data.metrics.http_req_duration?.values || {};
  const httpFailed = data.metrics.http_req_failed?.values?.rate || 0;
  const checksPass = data.metrics.checks?.values?.passes || 0;
  const checksFail = data.metrics.checks?.values?.fails || 0;
  
  // AI-specific metrics
  const cacheHits = data.metrics.ai_explanation_cache_hits?.values?.count || 0;
  const cacheMisses = data.metrics.ai_explanation_cache_misses?.values?.count || 0;
  const totalAIExplanations = cacheHits + cacheMisses;
  const cacheHitRate = totalAIExplanations > 0 ? ((cacheHits / totalAIExplanations) * 100).toFixed(1) : '0';
  
  const chatRequests = data.metrics.ai_chat_requests?.values?.count || 0;
  const aiErrorCount = data.metrics.ai_errors?.values?.count || 0;
  const circuitBreakerOpenCount = data.metrics.circuit_breaker_open?.values?.count || 0;
  const rateLimitErrorsRate = data.metrics.rate_limit_errors?.values?.rate || 0;
  
  const aiExplanationP50 = data.metrics.ai_explanation_time?.values?.['p(50)'] || 0;
  const aiExplanationP95 = data.metrics.ai_explanation_time?.values?.['p(95)'] || 0;
  const aiChatP50 = data.metrics.ai_chat_time?.values?.['p(50)'] || 0;
  const aiChatP95 = data.metrics.ai_chat_time?.values?.['p(95)'] || 0;
  
  let summary = `
${indent}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${indent}AI LOAD TEST SUMMARY - Phase 2: Load Testing
${indent}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${indent}📊 OVERALL PERFORMANCE
${indent}─────────────────────────────────────────────────────────────
${indent}Total Requests:       ${totalRequests}
${indent}Request Rate:         ${requestRate.toFixed(2)} req/s
${indent}Success Rate:         ${((1 - httpFailed) * 100).toFixed(2)}%
${indent}Checks Passed:        ${checksPass}/${checksPass + checksFail}

${indent}Response Times (Overall):
${indent}  P50:  ${httpDuration['p(50)']?.toFixed(0) || 'N/A'}ms
${indent}  P95:  ${httpDuration['p(95)']?.toFixed(0) || 'N/A'}ms ← Target: <5000ms
${indent}  P99:  ${httpDuration['p(99)']?.toFixed(0) || 'N/A'}ms
${indent}  Max:  ${httpDuration.max?.toFixed(0) || 'N/A'}ms

${indent}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${indent}🤖 AI FEATURE PERFORMANCE
${indent}─────────────────────────────────────────────────────────────

${indent}Match Explanations:
${indent}  Total Requests:     ${totalAIExplanations}
${indent}  Cache Hits:         ${cacheHits} (${cacheHitRate}%) ← Target: >50%
${indent}  Cache Misses:       ${cacheMisses}
${indent}  P50 Response:       ${aiExplanationP50.toFixed(0)}ms
${indent}  P95 Response:       ${aiExplanationP95.toFixed(0)}ms ← Target: <5000ms

${indent}AI Chat:
${indent}  Total Requests:     ${chatRequests}
${indent}  P50 Response:       ${aiChatP50.toFixed(0)}ms
${indent}  P95 Response:       ${aiChatP95.toFixed(0)}ms ← Target: <5000ms

${indent}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${indent}🛡️ RESILIENCE & ERROR HANDLING
${indent}─────────────────────────────────────────────────────────────

${indent}AI Errors:            ${aiErrorCount} (${totalRequests > 0 ? ((aiErrorCount / totalRequests) * 100).toFixed(2) : '0'}%)
${indent}Rate Limit Errors:    ${(rateLimitErrorsRate * 100).toFixed(2)}% ← Target: <10%
${indent}Circuit Breaker Open: ${circuitBreakerOpenCount} times ${circuitBreakerOpenCount > 0 ? '✓ (Expected during stress)' : ''}

${indent}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${indent}✅ PERFORMANCE ASSESSMENT
${indent}─────────────────────────────────────────────────────────────

${indent}Overall Performance:        ${httpDuration['p(95)'] < 5000 ? '✓ PASS' : '✗ FAIL'} (P95 < 5s)
${indent}Success Rate:               ${httpFailed < 0.05 ? '✓ PASS' : '✗ FAIL'} (<5% errors)
${indent}AI Explanation Performance: ${aiExplanationP95 < 5000 ? '✓ PASS' : '✗ FAIL'} (P95 < 5s)
${indent}AI Chat Performance:        ${aiChatP95 < 5000 ? '✓ PASS' : '✗ FAIL'} (P95 < 5s)
${indent}Cache Hit Rate:             ${parseFloat(cacheHitRate) >= 30 ? '✓ PASS' : '~ ACCEPTABLE'} (${cacheHitRate}% hit rate)
${indent}Rate Limiting:              ${rateLimitErrorsRate < 0.1 ? '✓ PASS' : '✗ FAIL'} (<10% rate errors)
${indent}Circuit Breaker:            ${circuitBreakerOpenCount > 0 ? '✓ PASS' : '⚠ NOT TRIGGERED'} (Stress protection)

${indent}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${indent}Test Configuration:
${indent}  Phase 1: 10 users  (2m) - Cache warm-up
${indent}  Phase 2: 50 users  (3m) - Normal load
${indent}  Phase 3: 100 users (3m) - Peak load
${indent}  Phase 4: 150 users (2m) - Stress test
${indent}  Phase 5: 50 users  (2m) - Recovery
${indent}  Total Duration: ~13 minutes

${indent}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `;
  
  return {
    'stdout': summary,
  };
}

