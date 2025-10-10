/**
 * API Stress Test - High load simulation (16 minutes)
 *
 * Purpose: Find breaking point and validate performance under stress
 * Stages:
 *   - Ramp up to 100 users (2 min)
 *   - Ramp up to 200 users (5 min)
 *   - Spike to 500 users (2 min) ← Find breaking point
 *   - Drop back to 200 users (5 min) ← Recovery test
 *   - Ramp down (2 min)
 * Target: P95 < 500ms at 200 users, <10% errors during spike
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp up to 100
    { duration: '5m', target: 200 },  // Ramp up to 200 (normal peak)
    { duration: '2m', target: 500 },  // Spike to 500 (stress test)
    { duration: '5m', target: 200 },  // Drop back to 200 (recovery)
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    'http_req_duration{endpoint:health}': ['p(95)<500'],  // Health: P95 < 500ms
    'http_req_duration{endpoint:homepage}': ['p(95)<2000'], // Homepage: P95 < 2s
    'http_req_failed': ['rate<0.1'], // Allow 10% errors during spike
  },
};

export default function () {
  // Test 1: Health endpoint (fast, should handle high load)
  const health = http.get('https://connectplt.kr/api/health', {
    tags: { endpoint: 'health' },
  });

  check(health, {
    'health check ok': (r) => r.status === 200,
    'health < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(0.5); // Short pause

  // Test 2: Homepage (heavier, includes SSR)
  const homepage = http.get('https://connectplt.kr/', {
    tags: { endpoint: 'homepage' },
  });

  check(homepage, {
    'homepage ok': (r) => r.status === 200,
    'homepage < 2s': (r) => r.timings.duration < 2000,
  });

  // Random wait between 1-3 seconds
  sleep(Math.random() * 2 + 1);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options) {
  const indent = options.indent || '';

  // Calculate metrics by endpoint
  const healthP95 = data.metrics['http_req_duration{endpoint:health}']?.values['p(95)'];
  const homepageP95 = data.metrics['http_req_duration{endpoint:homepage}']?.values['p(95)'];

  let summary = `
${indent}API Stress Test Summary
${indent}=======================
${indent}
${indent}Total Requests: ${data.metrics.http_reqs.values.count}
${indent}Request Rate:   ${data.metrics.http_reqs.values.rate.toFixed(2)} req/s
${indent}
${indent}Overall Response Times:
${indent}  P50: ${data.metrics.http_req_duration.values['p(50)'].toFixed(2)}ms
${indent}  P95: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms
${indent}  P99: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms
${indent}  Max: ${data.metrics.http_req_duration.values.max.toFixed(2)}ms
${indent}
${indent}Endpoint Breakdown:
${indent}  Health API P95:   ${healthP95 ? healthP95.toFixed(2) + 'ms ← Target: <500ms' : 'N/A'}
${indent}  Homepage P95:     ${homepageP95 ? homepageP95.toFixed(2) + 'ms ← Target: <2000ms' : 'N/A'}
${indent}
${indent}Success Rate: ${((1 - data.metrics.http_req_failed.values.rate) * 100).toFixed(2)}%
${indent}
${indent}Checks Passed: ${data.metrics.checks.values.passes}/${data.metrics.checks.values.passes + data.metrics.checks.values.fails}
${indent}
${indent}Peak Virtual Users: 500 (stress spike)
${indent}Test Duration: 16 minutes
${indent}
${indent}Performance Assessment:
${indent}  ✓ Normal Load (200 users): ${data.metrics.http_req_duration.values['p(95)'] < 2000 ? 'PASS' : 'FAIL'}
${indent}  ✓ Stress Resilience (500 spike): ${data.metrics.http_req_failed.values.rate < 0.1 ? 'PASS' : 'FAIL'}
  `;

  return summary;
}
