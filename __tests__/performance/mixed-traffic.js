/**
 * Mixed Traffic Load Test - Realistic Usage Simulation
 *
 * Purpose: Simulate real-world user behavior with mixed traffic patterns
 * Traffic Distribution:
 *   - 60% READ:  Browse programs, view matches, search
 *   - 30% AI:    Match explanations, chat interactions
 *   - 10% WRITE: Profile updates, save programs, feedback
 *
 * User Scenarios:
 *   1. New Visitor:      Homepage → Browse → Search → View details
 *   2. Registered User:  Dashboard → Matches → AI explanation → Chat
 *   3. Active User:      Quick check → Save program → Update profile
 *   4. Power User:       Multiple AI interactions, heavy usage
 *
 * Test Phases:
 *   - Phase 1: Morning ramp-up (8-10 AM) - 20 → 50 users
 *   - Phase 2: Mid-day steady (10 AM-2 PM) - 50 → 100 users
 *   - Phase 3: Afternoon peak (2-5 PM) - 100 → 150 users
 *   - Phase 4: Evening decline (5-8 PM) - 150 → 30 users
 *   - Phase 5: Night baseline (8 PM-) - 30 → 10 users
 *
 * Performance Targets:
 *   - Overall P95: <2s
 *   - Read operations P95: <1s
 *   - AI operations P95: <5s
 *   - Write operations P95: <2s
 *   - Error rate: <0.1%
 *   - Cache hit rate: >80% for reads, >50% for AI
 *
 * Week 7-8: Testing & Refinement (Day 1-2)
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics by operation type
const readOperations = new Counter('read_operations');
const aiOperations = new Counter('ai_operations');
const writeOperations = new Counter('write_operations');

const readTime = new Trend('read_time');
const aiTime = new Trend('ai_time');
const writeTime = new Trend('write_time');

const readErrors = new Rate('read_errors');
const aiErrors = new Rate('ai_errors');
const writeErrors = new Rate('write_errors');

const cacheHits = new Counter('cache_hits');
const cacheMisses = new Counter('cache_misses');

// User behavior metrics
const newVisitors = new Counter('new_visitors');
const registeredUsers = new Counter('registered_users');
const activeUsers = new Counter('active_users');
const powerUsers = new Counter('power_users');

// Test configuration
export let options = {
  stages: [
    // Morning ramp-up (8-10 AM) - Users starting their day
    { duration: '3m', target: 20 },   // Early birds
    { duration: '2m', target: 50 },   // Morning rush

    // Mid-day steady state (10 AM-2 PM) - Normal operations
    { duration: '3m', target: 75 },   // Building up
    { duration: '4m', target: 100 },  // Steady mid-day traffic

    // Afternoon peak (2-5 PM) - Highest activity
    { duration: '2m', target: 125 },  // Ramping to peak
    { duration: '3m', target: 150 },  // Peak hours

    // Evening decline (5-8 PM) - Winding down
    { duration: '3m', target: 100 },  // After work
    { duration: '2m', target: 50 },   // Evening users
    { duration: '2m', target: 30 },   // Late evening

    // Night baseline (8 PM-) - Minimal activity
    { duration: '2m', target: 10 },   // Night owls
    { duration: '1m', target: 0 },    // Cool down
  ],

  thresholds: {
    // Overall performance
    'http_req_duration': ['p(95)<2000'],      // Overall P95 < 2s
    'http_req_failed': ['rate<0.001'],        // <0.1% errors
    
    // Operation-specific thresholds
    'read_time': ['p(95)<1000', 'p(50)<500'], // Read: P95 <1s, P50 <500ms
    'ai_time': ['p(95)<5000', 'p(50)<2500'],  // AI: P95 <5s, P50 <2.5s
    'write_time': ['p(95)<2000', 'p(50)<800'], // Write: P95 <2s, P50 <800ms
    
    // Error rates by type
    'read_errors': ['rate<0.001'],   // <0.1% read errors
    'ai_errors': ['rate<0.01'],      // <1% AI errors (higher tolerance)
    'write_errors': ['rate<0.001'],  // <0.1% write errors
    
    // Minimum activity levels
    'read_operations': ['count>0'],
    'ai_operations': ['count>0'],
    'write_operations': ['count>0'],
  },
};

// Base URL configuration
const BASE_URL = __ENV.BASE_URL || 'https://connectplt.kr';
const AUTH_TOKEN = __ENV.TEST_AUTH_TOKEN || '';

// Sample data for realistic tests
const SEARCH_KEYWORDS = ['AI', 'IoT', '스마트팜', '바이오', '반도체', '클라우드'];
const AGENCIES = ['IITP', 'KEIT', 'TIPA', 'KIMST'];
const TRL_LEVELS = [3, 4, 5, 6, 7];

/**
 * Setup function
 */
export function setup() {
  console.log('🚀 Starting Mixed Traffic Load Test');
  console.log(`   Base URL: ${BASE_URL}`);
  console.log(`   Auth: ${AUTH_TOKEN ? 'Configured' : 'Not configured'}`);
  console.log('');
  console.log('Traffic Distribution:');
  console.log('  60% READ operations  (browse, search, view)');
  console.log('  30% AI operations    (explanations, chat)');
  console.log('  10% WRITE operations (save, update, feedback)');
  console.log('');
  console.log('Test Phases (Daily Pattern Simulation):');
  console.log('  Phase 1 (0-5m):    20-50 users   Morning ramp-up');
  console.log('  Phase 2 (5-12m):   75-100 users  Mid-day steady');
  console.log('  Phase 3 (12-17m):  125-150 users Afternoon peak');
  console.log('  Phase 4 (17-23m):  100-30 users  Evening decline');
  console.log('  Phase 5 (23-27m):  10-0 users    Night baseline');
  console.log('');

  return { timestamp: Date.now() };
}

/**
 * Main test function - Simulate realistic user behavior
 */
export default function (data) {
  // Determine user type based on probability
  const userType = Math.random();
  
  if (userType < 0.40) {
    // 40% - New Visitors (mostly read operations)
    simulateNewVisitor();
    newVisitors.add(1);
  } else if (userType < 0.70) {
    // 30% - Registered Users (read + some AI)
    simulateRegisteredUser();
    registeredUsers.add(1);
  } else if (userType < 0.90) {
    // 20% - Active Users (balanced mix)
    simulateActiveUser();
    activeUsers.add(1);
  } else {
    // 10% - Power Users (heavy AI + write)
    simulatePowerUser();
    powerUsers.add(1);
  }
}

/**
 * Scenario 1: New Visitor
 * Behavior: Browse homepage → Search programs → View details
 * Pattern: 90% read, 10% AI, 0% write
 */
function simulateNewVisitor() {
  group('New Visitor Journey', () => {
    // Step 1: Visit homepage
    executeReadOperation('Homepage', `${BASE_URL}/`);
    sleep(2 + Math.random() * 2); // Read content 2-4 seconds
    
    // Step 2: Browse programs
    const keyword = SEARCH_KEYWORDS[Math.floor(Math.random() * SEARCH_KEYWORDS.length)];
    executeReadOperation('Search', `${BASE_URL}/api/funding-programs?keyword=${keyword}`);
    sleep(3 + Math.random() * 3); // Review results 3-6 seconds
    
    // Step 3: View program details (70% of visitors)
    if (Math.random() < 0.7) {
      executeReadOperation('Program Details', `${BASE_URL}/api/funding-programs/1`);
      sleep(5 + Math.random() * 5); // Read details 5-10 seconds
    }
    
    // Step 4: Check sign-in page (30% of visitors)
    if (Math.random() < 0.3) {
      executeReadOperation('Sign-in Page', `${BASE_URL}/sign-in`);
      sleep(2);
    }
  });
}

/**
 * Scenario 2: Registered User
 * Behavior: Dashboard → View matches → Request AI explanation
 * Pattern: 60% read, 35% AI, 5% write
 */
function simulateRegisteredUser() {
  group('Registered User Journey', () => {
    // Step 1: Check dashboard
    executeReadOperation('Dashboard', `${BASE_URL}/dashboard`, true);
    sleep(2 + Math.random() * 2);
    
    // Step 2: View matches
    executeReadOperation('Matches', `${BASE_URL}/api/matches`, true);
    sleep(3 + Math.random() * 2);
    
    // Step 3: Request AI explanation (60% of users)
    if (Math.random() < 0.6) {
      executeAIOperation('Match Explanation', `${BASE_URL}/api/matches/1/explanation`, true);
      sleep(4 + Math.random() * 3); // Read AI explanation
    }
    
    // Step 4: Save a program (30% of users)
    if (Math.random() < 0.3) {
      executeWriteOperation('Save Program', `${BASE_URL}/api/programs/1/save`, {}, true);
      sleep(1);
    }
  });
}

/**
 * Scenario 3: Active User
 * Behavior: Quick checks → Multiple interactions → Some saves
 * Pattern: 50% read, 35% AI, 15% write
 */
function simulateActiveUser() {
  group('Active User Journey', () => {
    // Step 1: Quick dashboard check
    executeReadOperation('Dashboard', `${BASE_URL}/dashboard`, true);
    sleep(1 + Math.random());
    
    // Step 2: Check new matches
    executeReadOperation('New Matches', `${BASE_URL}/api/matches?status=new`, true);
    sleep(2);
    
    // Step 3: Multiple AI explanations (active exploration)
    for (let i = 0; i < 2; i++) {
      executeAIOperation('Match Explanation', `${BASE_URL}/api/matches/${i + 1}/explanation`, true);
      sleep(3 + Math.random() * 2);
    }
    
    // Step 4: Ask chat question (50% chance)
    if (Math.random() < 0.5) {
      const question = { message: 'IITP AI 프로그램에 대해 알려주세요' };
      executeAIOperation('AI Chat', `${BASE_URL}/api/chat`, true, question);
      sleep(3);
    }
    
    // Step 5: Save multiple programs
    for (let i = 0; i < 2; i++) {
      if (Math.random() < 0.7) {
        executeWriteOperation('Save Program', `${BASE_URL}/api/programs/${i + 1}/save`, {}, true);
        sleep(0.5);
      }
    }
    
    // Step 6: Update profile (20% chance)
    if (Math.random() < 0.2) {
      const profile = { trl: 5, industry: 'AI' };
      executeWriteOperation('Update Profile', `${BASE_URL}/api/organizations/1`, profile, true);
      sleep(1);
    }
  });
}

/**
 * Scenario 4: Power User
 * Behavior: Heavy AI usage → Multiple chats → Frequent updates
 * Pattern: 30% read, 50% AI, 20% write
 */
function simulatePowerUser() {
  group('Power User Journey', () => {
    // Step 1: Dashboard overview
    executeReadOperation('Dashboard', `${BASE_URL}/dashboard`, true);
    sleep(1);
    
    // Step 2: Rapid match review
    executeReadOperation('All Matches', `${BASE_URL}/api/matches`, true);
    sleep(1);
    
    // Step 3: Batch AI explanation requests (3-5 matches)
    const numExplanations = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < numExplanations; i++) {
      executeAIOperation('Match Explanation', `${BASE_URL}/api/matches/${i + 1}/explanation`, true);
      sleep(2); // Quickly scan AI responses
    }
    
    // Step 4: Extended chat conversation (multiple turns)
    const numChatTurns = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < numChatTurns; i++) {
      const question = {
        message: `질문 ${i + 1}: 프로그램 신청 절차는?`,
        conversationId: `power-user-${__VU}`,
      };
      executeAIOperation('AI Chat', `${BASE_URL}/api/chat`, true, question);
      sleep(2);
    }
    
    // Step 5: Provide feedback
    const feedback = { rating: 5, comment: 'Very helpful' };
    executeWriteOperation('AI Feedback', `${BASE_URL}/api/ai-feedback`, feedback, true);
    sleep(0.5);
    
    // Step 6: Save multiple programs
    for (let i = 0; i < 3; i++) {
      executeWriteOperation('Save Program', `${BASE_URL}/api/programs/${i + 1}/save`, {}, true);
      sleep(0.3);
    }
  });
}

/**
 * Execute READ operation (60% of traffic)
 */
function executeReadOperation(name, url, requireAuth = false) {
  const params = {
    headers: requireAuth && AUTH_TOKEN ? {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
    } : {},
    tags: { operation: 'read', name: name },
  };
  
  const startTime = Date.now();
  const res = http.get(url, params);
  const duration = Date.now() - startTime;
  
  readOperations.add(1);
  readTime.add(duration);
  
  const success = check(res, {
    [`${name} - status ok`]: (r) => r.status === 200 || r.status === 401,
    [`${name} - response < 2s`]: (r) => r.timings.duration < 2000,
  });
  
  if (!success && res.status !== 401) {
    readErrors.add(1);
  }
  
  // Track cache hits for read operations
  if (res.headers['X-Cache-Hit'] === 'true' || res.headers['x-cache-hit'] === 'true') {
    cacheHits.add(1);
  } else if (res.status === 200) {
    cacheMisses.add(1);
  }
}

/**
 * Execute AI operation (30% of traffic)
 */
function executeAIOperation(name, url, requireAuth = false, payload = null) {
  const params = {
    headers: requireAuth && AUTH_TOKEN ? {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json',
    } : {
      'Content-Type': 'application/json',
    },
    tags: { operation: 'ai', name: name },
  };
  
  const startTime = Date.now();
  const res = payload
    ? http.post(url, JSON.stringify(payload), params)
    : http.get(url, params);
  const duration = Date.now() - startTime;
  
  aiOperations.add(1);
  aiTime.add(duration);
  
  const success = check(res, {
    [`${name} - status ok`]: (r) => r.status === 200 || r.status === 401,
    [`${name} - response < 10s`]: (r) => r.timings.duration < 10000,
  });
  
  if (!success && res.status !== 401) {
    aiErrors.add(1);
  }
  
  // Track AI cache hits
  if (res.status === 200) {
    try {
      const body = JSON.parse(res.body);
      if (body.metadata?.cached === true) {
        cacheHits.add(1);
      } else {
        cacheMisses.add(1);
      }
    } catch (e) {
      // Silent fail
    }
  }
}

/**
 * Execute WRITE operation (10% of traffic)
 */
function executeWriteOperation(name, url, payload, requireAuth = false) {
  const params = {
    headers: requireAuth && AUTH_TOKEN ? {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json',
    } : {
      'Content-Type': 'application/json',
    },
    tags: { operation: 'write', name: name },
  };
  
  const startTime = Date.now();
  const res = http.post(url, JSON.stringify(payload), params);
  const duration = Date.now() - startTime;
  
  writeOperations.add(1);
  writeTime.add(duration);
  
  const success = check(res, {
    [`${name} - status ok`]: (r) => r.status === 200 || r.status === 201 || r.status === 401,
    [`${name} - response < 3s`]: (r) => r.timings.duration < 3000,
  });
  
  if (!success && res.status !== 401) {
    writeErrors.add(1);
  }
}

/**
 * Teardown function
 */
export function teardown(data) {
  console.log('');
  console.log('✅ Mixed Traffic Test Complete');
  console.log(`   Duration: ${Math.round((Date.now() - data.timestamp) / 1000)}s`);
  console.log('');
}

/**
 * Custom summary function
 */
export function handleSummary(data) {
  const indent = '  ';
  
  // Extract metrics
  const totalRequests = data.metrics.http_reqs?.values?.count || 0;
  const requestRate = data.metrics.http_reqs?.values?.rate || 0;
  const httpFailed = data.metrics.http_req_failed?.values?.rate || 0;
  const httpDuration = data.metrics.http_req_duration?.values || {};
  
  // Operation counts
  const readCount = data.metrics.read_operations?.values?.count || 0;
  const aiCount = data.metrics.ai_operations?.values?.count || 0;
  const writeCount = data.metrics.write_operations?.values?.count || 0;
  const totalOps = readCount + aiCount + writeCount;
  
  const readPct = totalOps > 0 ? ((readCount / totalOps) * 100).toFixed(1) : '0';
  const aiPct = totalOps > 0 ? ((aiCount / totalOps) * 100).toFixed(1) : '0';
  const writePct = totalOps > 0 ? ((writeCount / totalOps) * 100).toFixed(1) : '0';
  
  // Response times by operation
  const readP95 = data.metrics.read_time?.values?.['p(95)'] || 0;
  const aiP95 = data.metrics.ai_time?.values?.['p(95)'] || 0;
  const writeP95 = data.metrics.write_time?.values?.['p(95)'] || 0;
  
  const readP50 = data.metrics.read_time?.values?.['p(50)'] || 0;
  const aiP50 = data.metrics.ai_time?.values?.['p(50)'] || 0;
  const writeP50 = data.metrics.write_time?.values?.['p(50)'] || 0;
  
  // Error rates
  const readErrorRate = data.metrics.read_errors?.values?.rate || 0;
  const aiErrorRate = data.metrics.ai_errors?.values?.rate || 0;
  const writeErrorRate = data.metrics.write_errors?.values?.rate || 0;
  
  // Cache stats
  const cacheHitCount = data.metrics.cache_hits?.values?.count || 0;
  const cacheMissCount = data.metrics.cache_misses?.values?.count || 0;
  const totalCacheOps = cacheHitCount + cacheMissCount;
  const cacheHitRate = totalCacheOps > 0 ? ((cacheHitCount / totalCacheOps) * 100).toFixed(1) : '0';
  
  // User types
  const newVisitorsCount = data.metrics.new_visitors?.values?.count || 0;
  const registeredUsersCount = data.metrics.registered_users?.values?.count || 0;
  const activeUsersCount = data.metrics.active_users?.values?.count || 0;
  const powerUsersCount = data.metrics.power_users?.values?.count || 0;
  
  let summary = `
${indent}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${indent}MIXED TRAFFIC LOAD TEST SUMMARY - Phase 2: Load Testing
${indent}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${indent}📊 OVERALL PERFORMANCE
${indent}─────────────────────────────────────────────────────────────
${indent}Total Requests:       ${totalRequests}
${indent}Request Rate:         ${requestRate.toFixed(2)} req/s
${indent}Success Rate:         ${((1 - httpFailed) * 100).toFixed(2)}% ← Target: >99.9%
${indent}Overall P95:          ${httpDuration['p(95)']?.toFixed(0) || 'N/A'}ms ← Target: <2000ms

${indent}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${indent}🔀 TRAFFIC DISTRIBUTION
${indent}─────────────────────────────────────────────────────────────

${indent}READ Operations:      ${readCount} (${readPct}%) ← Target: 60%
${indent}  P50: ${readP50.toFixed(0)}ms    P95: ${readP95.toFixed(0)}ms ← Target: <1000ms
${indent}  Error Rate: ${(readErrorRate * 100).toFixed(3)}% ← Target: <0.1%

${indent}AI Operations:        ${aiCount} (${aiPct}%) ← Target: 30%
${indent}  P50: ${aiP50.toFixed(0)}ms    P95: ${aiP95.toFixed(0)}ms ← Target: <5000ms
${indent}  Error Rate: ${(aiErrorRate * 100).toFixed(3)}% ← Target: <1%

${indent}WRITE Operations:     ${writeCount} (${writePct}%) ← Target: 10%
${indent}  P50: ${writeP50.toFixed(0)}ms    P95: ${writeP95.toFixed(0)}ms ← Target: <2000ms
${indent}  Error Rate: ${(writeErrorRate * 100).toFixed(3)}% ← Target: <0.1%

${indent}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${indent}👥 USER BEHAVIOR SIMULATION
${indent}─────────────────────────────────────────────────────────────

${indent}New Visitors:         ${newVisitorsCount} (40% target)
${indent}Registered Users:     ${registeredUsersCount} (30% target)
${indent}Active Users:         ${activeUsersCount} (20% target)
${indent}Power Users:          ${powerUsersCount} (10% target)

${indent}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${indent}💾 CACHE PERFORMANCE
${indent}─────────────────────────────────────────────────────────────

${indent}Cache Hits:           ${cacheHitCount}
${indent}Cache Misses:         ${cacheMissCount}
${indent}Hit Rate:             ${cacheHitRate}% ← Target: >80% overall, >50% AI

${indent}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${indent}✅ PERFORMANCE ASSESSMENT
${indent}─────────────────────────────────────────────────────────────

${indent}Overall Performance:  ${httpDuration['p(95)'] < 2000 ? '✓ PASS' : '✗ FAIL'} (P95 < 2s)
${indent}Success Rate:         ${httpFailed < 0.001 ? '✓ PASS' : '✗ FAIL'} (>99.9%)
${indent}READ Performance:     ${readP95 < 1000 ? '✓ PASS' : '✗ FAIL'} (P95 < 1s)
${indent}AI Performance:       ${aiP95 < 5000 ? '✓ PASS' : '✗ FAIL'} (P95 < 5s)
${indent}WRITE Performance:    ${writeP95 < 2000 ? '✓ PASS' : '✗ FAIL'} (P95 < 2s)
${indent}Traffic Mix:          ${Math.abs(parseFloat(readPct) - 60) < 10 ? '✓ PASS' : '~ ACCEPTABLE'} (Read: ${readPct}%, AI: ${aiPct}%, Write: ${writePct}%)
${indent}Cache Efficiency:     ${parseFloat(cacheHitRate) >= 50 ? '✓ PASS' : '~ NEEDS IMPROVEMENT'} (${cacheHitRate}% hit rate)

${indent}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${indent}Test Configuration: Daily Traffic Pattern Simulation
${indent}  Morning (0-5m):    20-50 users   Ramp-up
${indent}  Mid-day (5-12m):   75-100 users  Steady state
${indent}  Peak (12-17m):     125-150 users Peak traffic
${indent}  Evening (17-23m):  100-30 users  Decline
${indent}  Night (23-27m):    10-0 users    Minimal
${indent}  Total Duration: ~27 minutes

${indent}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `;
  
  return {
    'stdout': summary,
  };
}

