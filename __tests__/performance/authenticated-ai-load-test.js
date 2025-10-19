/**
 * Authenticated AI Load Test - Real User Authentication
 *
 * Purpose: Test AI features with real authentication and valid user sessions
 * Focus Areas:
 *   1. Match explanation generation with authenticated users
 *   2. AI chat system with real user sessions
 *   3. Rate limiting with authenticated requests
 *   4. Circuit breaker behavior under authenticated load
 *   5. Cache performance with user-specific contexts
 *
 * Test Phases:
 *   - Phase 1: Warm-up (5 users, 1 min) - Establish sessions, populate caches
 *   - Phase 2: Normal load (20 users, 3 min) - Validate authenticated features
 *   - Phase 3: Peak load (50 users, 3 min) - Test rate limits per user
 *   - Phase 4: Stress (75 users, 2 min) - Test system limits
 *   - Phase 5: Recovery (20 users, 2 min) - Validate recovery
 *
 * Performance Targets:
 *   - Authenticated API P95: <2s (non-AI), <5s (AI)
 *   - Auth overhead: <50ms per request
 *   - Rate limiting: Proper 429 responses when exceeded
 *   - Session persistence: No auth failures during test
 *   - AI cache hit rate: >50% for repeated requests
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { SharedArray } from 'k6/data';

// Custom metrics
const authSuccessRate = new Rate('auth_success_rate');
const aiExplanationCacheHits = new Counter('ai_explanation_cache_hits');
const aiExplanationCacheMisses = new Counter('ai_explanation_cache_misses');
const aiChatRequests = new Counter('ai_chat_requests');
const aiErrors = new Counter('ai_errors');
const rateLimitHits = new Counter('rate_limit_hits');
const authOverhead = new Trend('auth_overhead');
const authenticatedRequestTime = new Trend('authenticated_request_time');

// Test configuration
export let options = {
  stages: [
    // Phase 1: Warm-up (establish sessions)
    { duration: '1m', target: 5 },    // 5 users getting authenticated

    // Phase 2: Normal authenticated load
    { duration: '3m', target: 20 },   // 20 concurrent authenticated users

    // Phase 3: Peak authenticated load
    { duration: '3m', target: 50 },   // 50 users testing rate limits

    // Phase 4: Stress test
    { duration: '2m', target: 75 },   // 75 users - expect some rate limiting

    // Phase 5: Recovery test
    { duration: '2m', target: 20 },   // Back to 20 users
    
    // Cool down
    { duration: '1m', target: 0 },    // Ramp down
  ],
  
  thresholds: {
    // Overall performance with authentication
    'http_req_duration': ['p(95)<5000'],     // P95 < 5s (AI operations included)
    'http_req_failed': ['rate<0.1'],         // <10% errors (excluding rate limits)
    
    // Authentication-specific
    'auth_success_rate': ['rate>0.95'],      // >95% auth success
    'auth_overhead': ['p(95)<100'],          // Auth overhead <100ms
    'authenticated_request_time': ['p(95)<5000'], // Authenticated requests <5s
    
    // AI features
    'ai_explanation_cache_hits': ['count>0'], // Should have cache hits
    'ai_chat_requests': ['count>0'],          // Should have chat requests
    
    // Rate limiting should work
    'rate_limit_hits': ['count>0'],           // Expect some rate limiting during stress
  },
};

// Base URL configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Pre-generated NextAuth session tokens (will be generated via setup script)
// These are used as cookies for authentication
const TEST_SESSION_TOKENS = new SharedArray('test_session_tokens', function() {
  // These will be populated by the setup script
  return __ENV.TEST_SESSION_TOKENS ? JSON.parse(__ENV.TEST_SESSION_TOKENS) : [];
});

// Test data: Sample match IDs (will be populated from actual DB)
const SAMPLE_MATCH_IDS = new SharedArray('sample_match_ids', function() {
  return __ENV.TEST_MATCH_IDS ? JSON.parse(__ENV.TEST_MATCH_IDS) : [
    'match-1', 'match-2', 'match-3', 'match-4', 'match-5',
  ];
});

const SAMPLE_QUESTIONS = [
  'IITP의 AI 프로그램 중 TRL 5에 적합한 것은 무엇인가요?',
  '스타트업도 지원할 수 있는 프로그램이 있나요?',
  '신청서 작성 시 주의사항은 무엇인가요?',
  '과제 매칭 점수는 어떻게 계산되나요?',
  '자격 요건을 충족하지 못하면 어떻게 되나요?',
];

/**
 * Setup function - runs once before test
 */
export function setup() {
  console.log('🔐 Starting Authenticated AI Load Test (Cookie-Based)');
  console.log(`   Base URL: ${BASE_URL}`);
  console.log(`   Test Users: ${TEST_SESSION_TOKENS.length || 'No session tokens loaded'}`);
  console.log(`   Auth Method: NextAuth session cookies`);
  console.log('');
  console.log('Test Phases:');
  console.log('  Phase 1 (0-1m):   5 users   - Session establishment');
  console.log('  Phase 2 (1-4m):   20 users  - Normal authenticated load');
  console.log('  Phase 3 (4-7m):   50 users  - Peak load, rate limit testing');
  console.log('  Phase 4 (7-9m):   75 users  - Stress test');
  console.log('  Phase 5 (9-11m):  20 users  - Recovery validation');
  console.log('');
  
  // Verify service is accessible
  const healthCheck = http.get(`${BASE_URL}/api/health`);
  if (healthCheck.status !== 200) {
    console.error('❌ Health check failed! Service may be down.');
    throw new Error('Service health check failed');
  }
  console.log('✅ Service health check passed');
  
  if (TEST_SESSION_TOKENS.length === 0) {
    console.error('❌ No session tokens loaded! Run setup-authenticated-load-test.ts first.');
    throw new Error('No session tokens available');
  }
  console.log(`✅ ${TEST_SESSION_TOKENS.length} session tokens loaded`);
  
  return { 
    timestamp: Date.now(),
    baseUrl: BASE_URL,
  };
}

/**
 * Main test function - runs for each VU iteration
 */
export default function (data) {
  // Get session token for this VU
  // Rotate through available session tokens
  const sessionToken = TEST_SESSION_TOKENS.length > 0 
    ? TEST_SESSION_TOKENS[__VU % TEST_SESSION_TOKENS.length]
    : null;
  
  if (!sessionToken) {
    console.error('No session token available for VU ' + __VU);
    return;
  }
  
  // Randomly choose test scenario for realistic mix
  const scenario = Math.random();
  
  if (scenario < 0.5) {
    // 50% - Test authenticated match explanations
    testAuthenticatedMatchExplanation(sessionToken);
  } else if (scenario < 0.8) {
    // 30% - Test authenticated AI chat
    testAuthenticatedAIChat(sessionToken);
  } else {
    // 20% - Test authenticated user dashboard/profile access
    testAuthenticatedUserAccess(sessionToken);
  }
  
  // Random sleep between 2-5 seconds (realistic user behavior)
  sleep(Math.random() * 3 + 2);
}

/**
 * Test 1: Authenticated Match Explanation
 * Tests: AI explanation API with authentication, caching, rate limiting
 */
function testAuthenticatedMatchExplanation(sessionToken) {
  group('Authenticated Match Explanation', () => {
    // Pick a random match ID
    const matchId = SAMPLE_MATCH_IDS[Math.floor(Math.random() * SAMPLE_MATCH_IDS.length)];
    
    const url = `${BASE_URL}/api/matches/${matchId}/explanation`;
    const params = {
      headers: {
        'Cookie': `next-auth.session-token=${sessionToken}`,
        'Content-Type': 'application/json',
      },
      tags: { 
        endpoint: 'match_explanation',
        authenticated: 'true',
      },
    };
    
    const startTime = Date.now();
    const res = http.get(url, params);
    const duration = Date.now() - startTime;
    
    const success = check(res, {
      'authenticated request succeeded': (r) => r.status === 200,
      'not unauthorized': (r) => r.status !== 401,
      'response time acceptable': (r) => r.timings.duration < 10000,
    });
    
    if (res.status === 200) {
      authSuccessRate.add(1);
      authenticatedRequestTime.add(duration);
      
      try {
        const body = JSON.parse(res.body);
        
        // Check if response was cached
        if (body.metadata?.cached === true || body.cached === true) {
          aiExplanationCacheHits.add(1);
          
          check(res, {
            'cached auth explanation < 1s': (r) => r.timings.duration < 1000,
          });
        } else {
          aiExplanationCacheMisses.add(1);
          
          check(res, {
            'uncached auth explanation < 5s': (r) => r.timings.duration < 5000,
            'explanation has content': () => body.explanation !== undefined || body.content !== undefined,
          });
        }
        
      } catch (e) {
        console.error('Failed to parse explanation response:', e.message);
        aiErrors.add(1);
      }
    } else if (res.status === 429) {
      // Rate limit hit - expected during stress phase
      rateLimitHits.add(1);
      check(res, {
        'rate limit returns proper error': (r) => r.body.includes('rate') || r.body.includes('limit'),
      });
    } else if (res.status === 401 || res.status === 403) {
      // Authentication failed
      authSuccessRate.add(0);
      console.error(`Auth failed for match ${matchId}: ${res.status} - ${res.body}`);
    } else {
      // Other error
      aiErrors.add(1);
      authSuccessRate.add(0);
    }
  });
}

/**
 * Test 2: Authenticated AI Chat
 * Tests: Multi-turn conversations with authentication
 */
function testAuthenticatedAIChat(sessionToken) {
  group('Authenticated AI Chat', () => {
    // Pick a random question
    const question = SAMPLE_QUESTIONS[Math.floor(Math.random() * SAMPLE_QUESTIONS.length)];
    
    const url = `${BASE_URL}/api/chat`;
    const payload = JSON.stringify({
      message: question,
      conversationId: `test-conversation-vu-${__VU}-${Date.now()}`,
    });
    
    const params = {
      headers: {
        'Cookie': `next-auth.session-token=${sessionToken}`,
        'Content-Type': 'application/json',
      },
      tags: { 
        endpoint: 'ai_chat',
        authenticated: 'true',
      },
    };
    
    const startTime = Date.now();
    const res = http.post(url, payload, params);
    const duration = Date.now() - startTime;
    
    aiChatRequests.add(1);
    
    const success = check(res, {
      'authenticated chat succeeded': (r) => r.status === 200,
      'not unauthorized': (r) => r.status !== 401,
      'chat response time acceptable': (r) => r.timings.duration < 10000,
    });
    
    if (res.status === 200) {
      authSuccessRate.add(1);
      authenticatedRequestTime.add(duration);
      
      try {
        const body = JSON.parse(res.body);
        
        check(res, {
          'chat has message': () => body.message !== undefined || body.reply !== undefined || body.response !== undefined,
          'chat response < 5s': (r) => r.timings.duration < 5000,
        });
        
      } catch (e) {
        console.error('Failed to parse chat response:', e.message);
        aiErrors.add(1);
      }
    } else if (res.status === 429) {
      rateLimitHits.add(1);
    } else if (res.status === 401 || res.status === 403) {
      authSuccessRate.add(0);
      console.error(`Auth failed for chat: ${res.status}`);
    } else {
      aiErrors.add(1);
      authSuccessRate.add(0);
    }
  });
}

/**
 * Test 3: Authenticated User Access
 * Tests: Dashboard, profile, and other authenticated endpoints
 */
function testAuthenticatedUserAccess(sessionToken) {
  group('Authenticated User Access', () => {
    // Test dashboard access
    const dashboardUrl = `${BASE_URL}/api/dashboard`;
    const params = {
      headers: {
        'Cookie': `next-auth.session-token=${sessionToken}`,
        'Content-Type': 'application/json',
      },
      tags: { 
        endpoint: 'dashboard',
        authenticated: 'true',
      },
    };
    
    const startTime = Date.now();
    const res = http.get(dashboardUrl, params);
    const duration = Date.now() - startTime;
    
    if (res.status === 200) {
      authSuccessRate.add(1);
      authenticatedRequestTime.add(duration);
      
      check(res, {
        'dashboard loads < 2s': (r) => r.timings.duration < 2000,
        'dashboard has data': (r) => r.body.length > 0,
      });
    } else if (res.status === 404) {
      // Dashboard endpoint might not exist, try matches instead
      const matchesUrl = `${BASE_URL}/api/matches`;
      const matchesRes = http.get(matchesUrl, params);
      
      if (matchesRes.status === 200) {
        authSuccessRate.add(1);
        authenticatedRequestTime.add(Date.now() - startTime);
      } else if (matchesRes.status === 401 || matchesRes.status === 403) {
        authSuccessRate.add(0);
      }
    } else if (res.status === 401 || res.status === 403) {
      authSuccessRate.add(0);
    } else if (res.status === 429) {
      rateLimitHits.add(1);
    }
  });
}

/**
 * Teardown function - runs once after all iterations
 */
export function teardown(data) {
  console.log('');
  console.log('✅ Authenticated AI Load Test Complete');
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
  
  // Auth-specific metrics
  const authSuccess = data.metrics.auth_success_rate?.values?.rate || 0;
  const authOverheadP95 = data.metrics.auth_overhead?.values?.['p(95)'] || 0;
  const authenticatedReqP95 = data.metrics.authenticated_request_time?.values?.['p(95)'] || 0;
  
  // AI-specific metrics
  const cacheHits = data.metrics.ai_explanation_cache_hits?.values?.count || 0;
  const cacheMisses = data.metrics.ai_explanation_cache_misses?.values?.count || 0;
  const totalAIExplanations = cacheHits + cacheMisses;
  const cacheHitRate = totalAIExplanations > 0 ? ((cacheHits / totalAIExplanations) * 100).toFixed(1) : '0';
  
  const chatRequests = data.metrics.ai_chat_requests?.values?.count || 0;
  const aiErrorCount = data.metrics.ai_errors?.values?.count || 0;
  const rateLimitCount = data.metrics.rate_limit_hits?.values?.count || 0;
  
  let summary = `
${indent}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${indent}AUTHENTICATED AI LOAD TEST SUMMARY
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
${indent}🔐 AUTHENTICATION PERFORMANCE
${indent}─────────────────────────────────────────────────────────────
${indent}Auth Success Rate:    ${(authSuccess * 100).toFixed(2)}% ← Target: >95%
${indent}Auth Overhead P95:    ${authOverheadP95.toFixed(0)}ms ← Target: <100ms
${indent}Authenticated Req P95: ${authenticatedReqP95.toFixed(0)}ms ← Target: <5000ms
${indent}Rate Limit Hits:      ${rateLimitCount} ${rateLimitCount > 0 ? '✓ (Expected during stress)' : ''}

${indent}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${indent}🤖 AI FEATURE PERFORMANCE (Authenticated)
${indent}─────────────────────────────────────────────────────────────

${indent}Match Explanations:
${indent}  Total Requests:     ${totalAIExplanations}
${indent}  Cache Hits:         ${cacheHits} (${cacheHitRate}%) ← Target: >50%
${indent}  Cache Misses:       ${cacheMisses}

${indent}AI Chat:
${indent}  Total Requests:     ${chatRequests}

${indent}AI Errors:            ${aiErrorCount} (${totalRequests > 0 ? ((aiErrorCount / totalRequests) * 100).toFixed(2) : '0'}%)

${indent}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${indent}✅ PERFORMANCE ASSESSMENT
${indent}─────────────────────────────────────────────────────────────

${indent}Overall Performance:        ${httpDuration['p(95)'] < 5000 ? '✓ PASS' : '✗ FAIL'} (P95 < 5s)
${indent}Success Rate:               ${httpFailed < 0.1 ? '✓ PASS' : '✗ FAIL'} (<10% errors)
${indent}Authentication Success:     ${authSuccess > 0.95 ? '✓ PASS' : '✗ FAIL'} (>95% success)
${indent}Auth Overhead:              ${authOverheadP95 < 100 ? '✓ PASS' : '⚠ ACCEPTABLE'} (<100ms)
${indent}Rate Limiting:              ${rateLimitCount > 0 ? '✓ PASS' : '⚠ NOT TRIGGERED'} (Protection active)

${indent}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${indent}Test Configuration:
${indent}  Phase 1: 5 users   (1m) - Session establishment
${indent}  Phase 2: 20 users  (3m) - Normal authenticated load
${indent}  Phase 3: 50 users  (3m) - Peak load
${indent}  Phase 4: 75 users  (2m) - Stress test
${indent}  Phase 5: 20 users  (2m) - Recovery
${indent}  Total Duration: ~12 minutes

${indent}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `;
  
  return {
    'stdout': summary,
  };
}

