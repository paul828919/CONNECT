/**
 * Smoke Test - Quick validation (30 seconds)
 *
 * Purpose: Verify basic API health before running longer tests
 * VUs: 10 concurrent users
 * Duration: 30 seconds
 * Target: Health endpoint responds < 500ms
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  vus: 10, // 10 virtual users
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests < 500ms
    http_req_failed: ['rate<0.01'],   // Error rate < 1%
  },
};

export default function () {
  const BASE_URL = __ENV.BASE_URL || 'https://connectplt.kr';
  const res = http.get(`${BASE_URL}/api/health`);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
    'has status ok': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.status === 'ok';
      } catch (e) {
        return false;
      }
    },
  });

  sleep(1); // 1 second between requests
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options) {
  const indent = options.indent || '';
  const enableColors = options.enableColors || false;

  // Safely access nested properties with fallback values
  const safeValue = (value, decimals = 2) => {
    return (value !== undefined && value !== null) ? value.toFixed(decimals) : 'N/A';
  };

  const httpReqs = data.metrics?.http_reqs?.values || {};
  const httpDuration = data.metrics?.http_req_duration?.values || {};
  const httpFailed = data.metrics?.http_req_failed?.values || {};
  const checks = data.metrics?.checks?.values || {};

  let summary = `
${indent}Smoke Test Summary
${indent}==================
${indent}
${indent}Total Requests: ${httpReqs.count || 0}
${indent}Request Rate:   ${safeValue(httpReqs.rate)} req/s
${indent}
${indent}Response Times:
${indent}  P50: ${safeValue(httpDuration['p(50)'])}ms
${indent}  P95: ${safeValue(httpDuration['p(95)'])}ms
${indent}  P99: ${safeValue(httpDuration['p(99)'])}ms
${indent}  Max: ${safeValue(httpDuration.max)}ms
${indent}
${indent}Success Rate: ${httpFailed.rate !== undefined ? ((1 - httpFailed.rate) * 100).toFixed(2) : 'N/A'}%
${indent}
${indent}Checks Passed: ${checks.passes || 0}/${(checks.passes || 0) + (checks.fails || 0)}
  `;

  return summary;
}
