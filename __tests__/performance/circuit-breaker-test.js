/**
 * Circuit Breaker Stress Test
 *
 * Purpose: Validate circuit breaker behavior under AI service failures
 * 
 * Circuit Breaker Configuration (from lib/ai/client.ts):
 *   - Failure Threshold: 5 failures before OPEN
 *   - Failure Window: 60 seconds
 *   - Open Timeout: 30 seconds before HALF_OPEN
 *   - Half-Open Max Requests: 1 test request
 *
 * Test Phases:
 *   1. Normal Operation (CLOSED state) - Verify baseline
 *   2. Induce Failures - Trigger 5+ failures within 60s
 *   3. OPEN State Validation - Verify requests rejected
 *   4. Wait for HALF_OPEN - 30s timeout
 *   5. Recovery Test (HALF_OPEN → CLOSED) - Verify recovery
 *
 * Success Criteria:
 *   ✓ Circuit opens after 5 failures within 60s
 *   ✓ Requests rejected with appropriate error message during OPEN
 *   ✓ Transitions to HALF_OPEN after 30s
 *   ✓ Recovers to CLOSED on successful test request
 *   ✓ Fallback content served during outage
 *   ✓ No cascade failures to other services
 *
 * Week 7-8: Testing & Refinement (Day 2)
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Gauge } from 'k6/metrics';

// Custom metrics
const circuitBreakerState = new Gauge('circuit_breaker_state'); // 0=CLOSED, 1=OPEN, 2=HALF_OPEN
const failuresInduced = new Counter('failures_induced');
const requestsRejectedByCircuit = new Counter('requests_rejected_by_circuit');
const fallbackContentServed = new Counter('fallback_content_served');
const recoveryAttempts = new Counter('recovery_attempts');
const successfulRecoveries = new Counter('successful_recoveries');

// State tracking
let currentState = 'UNKNOWN';
let stateTransitions = [];

// Test configuration
export let options = {
  scenarios: {
    // Scenario 1: Baseline (normal operation)
    baseline: {
      executor: 'constant-vus',
      vus: 5,
      duration: '1m',
      startTime: '0s',
    },
    
    // Scenario 2: Induce failures (rapid requests to trigger circuit)
    induce_failures: {
      executor: 'constant-vus',
      vus: 20, // High concurrency to trigger failures
      duration: '30s',
      startTime: '1m',
    },
    
    // Scenario 3: Verify OPEN state (requests should be rejected)
    verify_open: {
      executor: 'constant-vus',
      vus: 10,
      duration: '30s',
      startTime: '1m30s',
    },
    
    // Scenario 4: Wait for HALF_OPEN transition (30s timeout)
    // No explicit scenario - just wait time
    
    // Scenario 5: Test HALF_OPEN → CLOSED recovery
    test_recovery: {
      executor: 'constant-vus',
      vus: 3, // Low concurrency for controlled recovery test
      duration: '1m',
      startTime: '2m30s', // After 30s wait (1m30s + 30s + 30s)
    },
  },
  
  thresholds: {
    // Circuit breaker should activate
    'requests_rejected_by_circuit': ['count>0'],
    
    // Fallback content should be served
    'fallback_content_served': ['count>0'],
    
    // Should successfully recover
    'successful_recoveries': ['count>0'],
    
    // Overall test should pass
    'checks': ['rate>0.7'], // Allow 30% failures during failure induction phase
  },
};

// Base URL configuration
const BASE_URL = __ENV.BASE_URL || 'https://connectplt.kr';
const AUTH_TOKEN = __ENV.TEST_AUTH_TOKEN || '';

/**
 * Setup function
 */
export function setup() {
  console.log('🔴 Starting Circuit Breaker Stress Test');
  console.log('');
  console.log('Circuit Breaker Configuration:');
  console.log('  Failure Threshold: 5 failures within 60s');
  console.log('  Open Timeout: 30 seconds');
  console.log('  Half-Open Test Requests: 1');
  console.log('');
  console.log('Test Plan:');
  console.log('  Phase 1 (0-1m):     Baseline - Normal operation (CLOSED)');
  console.log('  Phase 2 (1-1.5m):   Induce failures - Trigger OPEN state');
  console.log('  Phase 3 (1.5-2m):   Verify OPEN - Requests rejected');
  console.log('  Phase 4 (2-2.5m):   Wait - Automatic HALF_OPEN transition');
  console.log('  Phase 5 (2.5-3.5m): Recovery - Test HALF_OPEN → CLOSED');
  console.log('');

  return {
    timestamp: Date.now(),
    stateTransitions: [],
  };
}

/**
 * Main test function
 */
export default function (data) {
  const scenario = __ENV.SCENARIO || 'baseline';
  
  if (__ITER === 0) {
    console.log(`[${new Date().toISOString()}] Starting scenario: ${scenario}`);
  }
  
  // Execute appropriate test based on scenario
  if (scenario === 'baseline') {
    testBaseline();
  } else if (scenario === 'induce_failures') {
    induceFailures();
  } else if (scenario === 'verify_open') {
    verifyOpenState();
  } else if (scenario === 'test_recovery') {
    testRecovery();
  } else {
    // Auto-detect based on execution time (for single run mode)
    const elapsed = Date.now() - data.timestamp;
    
    if (elapsed < 60000) {
      testBaseline();
    } else if (elapsed < 90000) {
      induceFailures();
    } else if (elapsed < 120000) {
      verifyOpenState();
    } else {
      testRecovery();
    }
  }
}

/**
 * Phase 1: Baseline Test (CLOSED state)
 * Verify normal AI operations work correctly
 */
function testBaseline() {
  group('Baseline - Normal Operation', () => {
    const url = `${BASE_URL}/api/matches/1/explanation`;
    const params = {
      headers: AUTH_TOKEN ? {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
      } : {},
      tags: { phase: 'baseline' },
    };
    
    const res = http.get(url, params);
    
    const success = check(res, {
      'baseline - status ok': (r) => r.status === 200 || r.status === 401,
      'baseline - no circuit breaker error': (r) => !r.body || !r.body.includes('Circuit breaker'),
      'baseline - response time reasonable': (r) => r.timings.duration < 10000,
    });
    
    if (success && res.status === 200) {
      updateCircuitBreakerState('CLOSED', res);
    }
    
    sleep(2); // Normal user pacing
  });
}

/**
 * Phase 2: Induce Failures (Trigger OPEN state)
 * Make rapid requests to overwhelm AI service and trigger circuit
 */
function induceFailures() {
  group('Induce Failures - Trigger Circuit', () => {
    // Rapid-fire requests to AI endpoints (no sleep)
    // This simulates a sudden spike or AI service degradation
    
    for (let i = 0; i < 3; i++) {
      const url = `${BASE_URL}/api/matches/${i + 1}/explanation`;
      const params = {
        headers: AUTH_TOKEN ? {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
        } : {},
        tags: { phase: 'induce_failures' },
        timeout: '2s', // Short timeout to trigger failures faster
      };
      
      const res = http.get(url, params);
      
      // Track failures
      if (res.status >= 500 || res.status === 503 || res.timings.duration > 10000) {
        failuresInduced.add(1);
      }
      
      check(res, {
        'failure phase - request completed': (r) => r.status !== 0,
      });
      
      // Check for circuit breaker state change
      if (res.status === 503 && res.body && res.body.includes('Circuit breaker')) {
        updateCircuitBreakerState('OPEN', res);
        requestsRejectedByCircuit.add(1);
        console.log(`🔴 Circuit Breaker OPENED at ${new Date().toISOString()}`);
      }
      
      // No sleep - continuous pressure
    }
  });
}

/**
 * Phase 3: Verify OPEN State
 * Confirm circuit breaker is rejecting requests appropriately
 */
function verifyOpenState() {
  group('Verify OPEN State', () => {
    const url = `${BASE_URL}/api/matches/1/explanation`;
    const params = {
      headers: AUTH_TOKEN ? {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
      } : {},
      tags: { phase: 'verify_open' },
    };
    
    const res = http.get(url, params);
    
    const isCircuitOpen = res.status === 503 && res.body && res.body.includes('Circuit breaker');
    
    check(res, {
      'open state - circuit breaker active': (r) => isCircuitOpen || r.body.includes('temporarily unavailable'),
      'open state - appropriate error message': (r) => r.body && (r.body.includes('Circuit breaker') || r.body.includes('try again')),
      'open state - fast rejection': (r) => r.timings.duration < 1000, // Should reject quickly, not timeout
    });
    
    if (isCircuitOpen) {
      updateCircuitBreakerState('OPEN', res);
      requestsRejectedByCircuit.add(1);
    }
    
    // Check if fallback content is served
    if (res.status === 200 && res.body) {
      try {
        const body = JSON.parse(res.body);
        if (body.explanation && body.explanation.includes('일시 중단')) {
          fallbackContentServed.add(1);
        }
      } catch (e) {
        // Not JSON or parsing failed
      }
    }
    
    sleep(1);
  });
}

/**
 * Phase 4: Test Recovery (HALF_OPEN → CLOSED)
 * Verify circuit breaker can recover successfully
 */
function testRecovery() {
  group('Test Recovery', () => {
    recoveryAttempts.add(1);
    
    const url = `${BASE_URL}/api/matches/1/explanation`;
    const params = {
      headers: AUTH_TOKEN ? {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
      } : {},
      tags: { phase: 'recovery' },
    };
    
    const res = http.get(url, params);
    
    // Check for HALF_OPEN state (allows limited test requests)
    const isHalfOpen = res.status === 200 || (res.status === 503 && res.body && res.body.includes('testing recovery'));
    
    check(res, {
      'recovery - request allowed': (r) => r.status === 200 || r.status === 401 || isHalfOpen,
      'recovery - response time ok': (r) => r.timings.duration < 10000,
    });
    
    if (res.status === 200) {
      updateCircuitBreakerState('CLOSED', res);
      successfulRecoveries.add(1);
      console.log(`🟢 Circuit Breaker RECOVERED to CLOSED at ${new Date().toISOString()}`);
    } else if (isHalfOpen) {
      updateCircuitBreakerState('HALF_OPEN', res);
      console.log(`🟡 Circuit Breaker in HALF_OPEN (testing recovery) at ${new Date().toISOString()}`);
    }
    
    sleep(3); // Slow pacing during recovery
  });
}

/**
 * Update circuit breaker state tracking
 */
function updateCircuitBreakerState(state, response) {
  if (state !== currentState) {
    const transition = {
      from: currentState,
      to: state,
      timestamp: new Date().toISOString(),
    };
    
    stateTransitions.push(transition);
    currentState = state;
    
    // Update gauge metric
    if (state === 'CLOSED') {
      circuitBreakerState.add(0);
    } else if (state === 'OPEN') {
      circuitBreakerState.add(1);
    } else if (state === 'HALF_OPEN') {
      circuitBreakerState.add(2);
    }
  }
}

/**
 * Teardown function
 */
export function teardown(data) {
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Circuit Breaker Test Complete');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('State Transitions:');
  stateTransitions.forEach((t) => {
    console.log(`  ${t.timestamp}: ${t.from} → ${t.to}`);
  });
  console.log('');
}

/**
 * Custom summary function
 */
export function handleSummary(data) {
  const indent = '  ';
  
  // Extract metrics
  const failuresCount = data.metrics.failures_induced?.values?.count || 0;
  const rejectedCount = data.metrics.requests_rejected_by_circuit?.values?.count || 0;
  const fallbackCount = data.metrics.fallback_content_served?.values?.count || 0;
  const recoveryAttemptCount = data.metrics.recovery_attempts?.values?.count || 0;
  const recoverySuccessCount = data.metrics.successful_recoveries?.values?.count || 0;
  
  const checksPass = data.metrics.checks?.values?.passes || 0;
  const checksFail = data.metrics.checks?.values?.fails || 0;
  const checkRate = checksPass + checksFail > 0 ? ((checksPass / (checksPass + checksFail)) * 100).toFixed(1) : '0';
  
  let summary = `
${indent}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${indent}CIRCUIT BREAKER STRESS TEST SUMMARY
${indent}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${indent}🔴 FAILURE INDUCTION
${indent}─────────────────────────────────────────────────────────────
${indent}Failures Induced:           ${failuresCount}
${indent}Expected: ≥5 failures within 60s to trigger circuit

${indent}🛡️ CIRCUIT BREAKER ACTIVATION
${indent}─────────────────────────────────────────────────────────────
${indent}Requests Rejected:          ${rejectedCount} ${rejectedCount > 0 ? '✓' : '✗'}
${indent}Fallback Content Served:    ${fallbackCount} ${fallbackCount > 0 ? '✓' : '✗'}
${indent}Circuit Activated:          ${rejectedCount > 0 ? 'YES ✓' : 'NO ✗'}

${indent}🔄 RECOVERY TESTING
${indent}─────────────────────────────────────────────────────────────
${indent}Recovery Attempts:          ${recoveryAttemptCount}
${indent}Successful Recoveries:      ${recoverySuccessCount} ${recoverySuccessCount > 0 ? '✓' : '✗'}
${indent}Recovery Rate:              ${recoveryAttemptCount > 0 ? ((recoverySuccessCount / recoveryAttemptCount) * 100).toFixed(1) : '0'}%

${indent}📊 OVERALL VALIDATION
${indent}─────────────────────────────────────────────────────────────
${indent}Total Checks:               ${checksPass + checksFail}
${indent}Checks Passed:              ${checksPass} (${checkRate}%)
${indent}Checks Failed:              ${checksFail}

${indent}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${indent}✅ TEST RESULTS
${indent}─────────────────────────────────────────────────────────────

${indent}Circuit Opens on Failure:   ${rejectedCount > 0 ? '✓ PASS' : '✗ FAIL'}
${indent}Requests Rejected in OPEN:  ${rejectedCount > 0 ? '✓ PASS' : '✗ FAIL'}
${indent}Fallback Content Served:    ${fallbackCount > 0 ? '✓ PASS' : '⚠ NEEDS REVIEW'}
${indent}Recovery Mechanism Works:   ${recoverySuccessCount > 0 ? '✓ PASS' : '✗ FAIL'}
${indent}Overall Check Rate:         ${parseFloat(checkRate) > 70 ? '✓ PASS' : '✗ FAIL'} (>70% required)

${indent}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${indent}State Transition Summary:
${indent}  Expected: CLOSED → OPEN → HALF_OPEN → CLOSED
${indent}  Actual: See log output above for timestamps

${indent}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `;
  
  return {
    'stdout': summary,
  };
}

