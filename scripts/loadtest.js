/**
 * k6 Load Testing Script for Connect Platform
 *
 * This script simulates real user behavior across the platform:
 * - Authentication (Kakao/Naver OAuth simulation)
 * - Match generation (funding opportunities)
 * - Funding program listing
 * - Profile updates
 * - Rate limiting verification
 *
 * Test Types:
 * - smoke: Minimal load sanity check (1-5 VUs, 1 minute)
 * - load: Expected production load (0→100→0 VUs, 10 minutes)
 * - stress: Find breaking point (0→500→0 VUs, 15 minutes)
 *
 * Usage:
 * k6 run scripts/loadtest.js --env TEST_TYPE=smoke
 * k6 run scripts/loadtest.js --env TEST_TYPE=load
 * k6 run scripts/loadtest.js --env TEST_TYPE=stress
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// ============================================================================
// Configuration
// ============================================================================

const TARGET_URL = __ENV.TARGET_URL || 'http://localhost:3000';
const TEST_TYPE = __ENV.TEST_TYPE || 'smoke';

// Custom metrics
const matchGenerationTime = new Trend('match_generation_duration');
const authSuccessRate = new Rate('auth_success_rate');
const rateLimitHits = new Counter('rate_limit_hits');

// ============================================================================
// Test Scenarios
// ============================================================================

const scenarios = {
  smoke: {
    executor: 'ramping-vus',
    startVUs: 1,
    stages: [
      { duration: '30s', target: 5 },  // Ramp up to 5 users
      { duration: '30s', target: 5 },  // Stay at 5 users
    ],
    gracefulRampDown: '10s',
    tags: { test_type: 'smoke' },
  },
  load: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 50 },   // Ramp up to 50 VUs (MVP: 500 users)
      { duration: '5m', target: 100 },  // Ramp up to 100 VUs
      { duration: '2m', target: 100 },  // Stay at 100 VUs
      { duration: '1m', target: 0 },    // Ramp down to 0
    ],
    gracefulRampDown: '30s',
    tags: { test_type: 'load' },
  },
  stress: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 100 },  // Ramp up to 100 VUs
      { duration: '5m', target: 300 },  // Ramp up to 300 VUs (Growth Phase 2)
      { duration: '3m', target: 500 },  // Push to 500 VUs (stress)
      { duration: '2m', target: 500 },  // Hold at 500 VUs
      { duration: '3m', target: 0 },    // Ramp down
    ],
    gracefulRampDown: '30s',
    tags: { test_type: 'stress' },
  },
};

export const options = {
  scenarios: {
    [TEST_TYPE]: scenarios[TEST_TYPE],
  },
  thresholds: {
    // Response time thresholds (MVP: P95 < 500ms)
    http_req_duration: ['p(95)<500', 'p(99)<1000'],

    // Success rate thresholds (MVP: >99%)
    http_req_failed: ['rate<0.01'],

    // Custom metric thresholds
    match_generation_duration: ['p(95)<3000'], // Match generation < 3s
    auth_success_rate: ['rate>0.95'],          // Auth success > 95%
  },
  noConnectionReuse: false, // Reuse connections (realistic)
  userAgent: 'k6-load-test/1.0 (Connect Platform)',
};

// ============================================================================
// Test Data
// ============================================================================

const testUsers = [
  {
    email: `test${__VU}@loadtest.com`,
    name: `Test User ${__VU}`,
    organizationType: 'COMPANY',
  },
];

const testOrganizations = [
  {
    name: `Test Company ${__VU}`,
    type: 'COMPANY',
    industrySector: 'ICT',
    employeeCount: 'FROM_10_TO_50',
    revenueRange: 'FROM_1B_TO_10B',
    rdExperience: true,
    technologyReadinessLevel: 5,
  },
  {
    name: `Test Institute ${__VU}`,
    type: 'RESEARCH_INSTITUTE',
    instituteType: 'GOVERNMENT_FUNDED',
    researchFocusAreas: ['AI', 'Biotechnology', 'Clean Energy'],
    keyTechnologies: ['Machine Learning', 'Data Analytics', 'IoT'],
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Simulate user authentication (JWT token generation)
 */
function authenticate() {
  const payload = JSON.stringify({
    email: testUsers[0].email,
    name: testUsers[0].name,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: { name: 'Authentication' },
  };

  const response = http.post(`${TARGET_URL}/api/auth/test-login`, payload, params);

  const success = check(response, {
    'auth status is 200': (r) => r.status === 200,
    'auth returns token': (r) => r.json('token') !== undefined,
  });

  authSuccessRate.add(success);

  if (success) {
    return response.json('token');
  }
  return null;
}

/**
 * Create or get test organization
 */
function setupOrganization(token) {
  const org = testOrganizations[__VU % testOrganizations.length];
  const payload = JSON.stringify(org);

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    tags: { name: 'Create Organization' },
  };

  const response = http.post(`${TARGET_URL}/api/organizations`, payload, params);

  check(response, {
    'organization created': (r) => r.status === 200 || r.status === 201,
    'organization has id': (r) => r.json('id') !== undefined,
  });

  if (response.status === 200 || response.status === 201) {
    return response.json('id');
  }
  return null;
}

/**
 * Get funding programs list
 */
function getFundingPrograms(token) {
  const params = {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    tags: { name: 'List Funding Programs' },
  };

  const response = http.get(`${TARGET_URL}/api/funding-programs?limit=20`, params);

  check(response, {
    'programs status is 200': (r) => r.status === 200,
    'programs list is array': (r) => Array.isArray(r.json('data')),
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  return response;
}

/**
 * Generate funding matches (core feature test)
 */
function generateMatches(token, organizationId) {
  const params = {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    tags: { name: 'Generate Matches' },
  };

  const startTime = Date.now();
  const response = http.post(
    `${TARGET_URL}/api/matches/generate?organizationId=${organizationId}`,
    null,
    params
  );
  const duration = Date.now() - startTime;

  matchGenerationTime.add(duration);

  const success = check(response, {
    'matches status is 200': (r) => r.status === 200,
    'matches generated': (r) => r.json('matches') !== undefined,
    'top 3 matches returned': (r) => r.json('matches')?.length === 3,
    'match generation < 3s': (r) => duration < 3000,
  });

  // Check rate limiting for free tier (3 matches/month)
  if (response.status === 429) {
    rateLimitHits.add(1);
    check(response, {
      'rate limit message present': (r) => r.json('error') !== undefined,
      'retry-after header set': (r) => r.headers['Retry-After'] !== undefined,
    });
  }

  return response;
}

/**
 * Get specific funding program details
 */
function getProgramDetails(token, programId) {
  const params = {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    tags: { name: 'Get Program Details' },
  };

  const response = http.get(`${TARGET_URL}/api/funding-programs/${programId}`, params);

  check(response, {
    'program details status is 200': (r) => r.status === 200,
    'program has title': (r) => r.json('title') !== undefined,
    'program has agency': (r) => r.json('agencyId') !== undefined,
  });

  return response;
}

/**
 * Update organization profile
 */
function updateOrganizationProfile(token, organizationId) {
  const updates = {
    description: `Updated at ${new Date().toISOString()}`,
    website: `https://test-company-${__VU}.com`,
  };

  const payload = JSON.stringify(updates);
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    tags: { name: 'Update Profile' },
  };

  const response = http.patch(
    `${TARGET_URL}/api/organizations/${organizationId}`,
    payload,
    params
  );

  check(response, {
    'profile update status is 200': (r) => r.status === 200,
    'profile updated': (r) => r.json('updated') === true,
  });

  return response;
}

/**
 * Health check
 */
function healthCheck() {
  const response = http.get(`${TARGET_URL}/api/health`, {
    tags: { name: 'Health Check' },
  });

  check(response, {
    'health check status is 200': (r) => r.status === 200,
    'system is healthy': (r) => r.json('status') === 'ok',
  });

  return response;
}

// ============================================================================
// Main Test Scenario
// ============================================================================

export default function () {
  let token, organizationId;

  // Group 1: Health Check (lightweight, always runs)
  group('Health Check', () => {
    healthCheck();
    sleep(1);
  });

  // Group 2: Authentication
  group('Authentication', () => {
    token = authenticate();
    if (!token) {
      console.error(`[VU ${__VU}] Authentication failed, skipping test iteration`);
      return;
    }
    sleep(1);
  });

  // Group 3: Organization Setup (first time only)
  group('Organization Setup', () => {
    organizationId = setupOrganization(token);
    if (!organizationId) {
      console.error(`[VU ${__VU}] Organization setup failed`);
      return;
    }
    sleep(1);
  });

  // Group 4: Browse Funding Programs
  group('Browse Funding Programs', () => {
    const programsResponse = getFundingPrograms(token);

    if (programsResponse.status === 200) {
      const programs = programsResponse.json('data');

      // View details of first 3 programs
      if (programs && programs.length > 0) {
        for (let i = 0; i < Math.min(3, programs.length); i++) {
          getProgramDetails(token, programs[i].id);
          sleep(0.5);
        }
      }
    }
    sleep(2);
  });

  // Group 5: Generate Matches (Core Feature)
  group('Generate Matches', () => {
    generateMatches(token, organizationId);
    sleep(2);
  });

  // Group 6: Update Profile (occasional action)
  if (__ITER % 5 === 0) {
    group('Update Profile', () => {
      updateOrganizationProfile(token, organizationId);
      sleep(1);
    });
  }

  // Realistic user think time (3-5 seconds between actions)
  sleep(Math.random() * 2 + 3);
}

// ============================================================================
// Setup and Teardown
// ============================================================================

export function setup() {
  console.log(`\n========================================`);
  console.log(`Starting ${TEST_TYPE.toUpperCase()} test`);
  console.log(`Target: ${TARGET_URL}`);
  console.log(`========================================\n`);

  // Verify system is healthy before starting test
  const health = http.get(`${TARGET_URL}/api/health`);
  if (health.status !== 200) {
    throw new Error(`System is not healthy! Status: ${health.status}`);
  }

  return {
    startTime: Date.now(),
    targetUrl: TARGET_URL,
    testType: TEST_TYPE,
  };
}

export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;

  console.log(`\n========================================`);
  console.log(`${TEST_TYPE.toUpperCase()} test completed`);
  console.log(`Duration: ${duration.toFixed(2)}s`);
  console.log(`========================================\n`);
}

// ============================================================================
// Custom Summary
// ============================================================================

export function handleSummary(data) {
  const summary = {
    test_type: TEST_TYPE,
    timestamp: new Date().toISOString(),
    duration: data.state.testRunDurationMs / 1000,
    metrics: {
      http_reqs: data.metrics.http_reqs.values.count,
      http_req_duration_p95: data.metrics.http_req_duration.values['p(95)'],
      http_req_duration_p99: data.metrics.http_req_duration.values['p(99)'],
      http_req_failed: data.metrics.http_req_failed.values.rate,
      vus_max: data.metrics.vus_max.values.max,
    },
    thresholds: data.metrics.http_req_duration.thresholds,
  };

  return {
    'stdout': textSummary(data, { indent: '  ', enableColors: true }),
    [`results/${TEST_TYPE}-${Date.now()}.json`]: JSON.stringify(summary, null, 2),
  };
}

/**
 * Text summary formatter
 */
function textSummary(data, options) {
  const indent = options.indent || '';
  const enableColors = options.enableColors || false;

  let summary = '';

  // Test overview
  summary += `\n${indent}Test Type: ${TEST_TYPE}\n`;
  summary += `${indent}Duration: ${(data.state.testRunDurationMs / 1000).toFixed(2)}s\n`;
  summary += `${indent}Target URL: ${TARGET_URL}\n\n`;

  // Key metrics
  summary += `${indent}Key Metrics:\n`;
  summary += `${indent}  Requests: ${data.metrics.http_reqs.values.count}\n`;
  summary += `${indent}  Request Rate: ${data.metrics.http_reqs.values.rate.toFixed(2)}/s\n`;
  summary += `${indent}  VUs (max): ${data.metrics.vus_max.values.max}\n\n`;

  // Response times
  summary += `${indent}Response Times:\n`;
  summary += `${indent}  Average: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
  summary += `${indent}  P95: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
  summary += `${indent}  P99: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms\n\n`;

  // Success rate
  const successRate = (1 - data.metrics.http_req_failed.values.rate) * 100;
  summary += `${indent}Success Rate: ${successRate.toFixed(2)}%\n`;

  // Threshold results
  const p95Threshold = data.metrics.http_req_duration.values['p(95)'] < 500;
  const successRateThreshold = data.metrics.http_req_failed.values.rate < 0.01;

  summary += `\n${indent}Threshold Results:\n`;
  summary += `${indent}  P95 < 500ms: ${p95Threshold ? '✓ PASS' : '✗ FAIL'}\n`;
  summary += `${indent}  Success Rate > 99%: ${successRateThreshold ? '✓ PASS' : '✗ FAIL'}\n`;

  return summary;
}