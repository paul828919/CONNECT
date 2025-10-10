/**
 * Homepage Load Test - Realistic user traffic (9 minutes)
 *
 * Purpose: Test homepage performance under realistic load
 * Stages:
 *   - Ramp up to 50 users (1 min)
 *   - Sustain 50 users (3 min)
 *   - Ramp up to 100 users (1 min)
 *   - Sustain 100 users (3 min)
 *   - Ramp down (1 min)
 * Target: P95 < 2 seconds (first-time page load)
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '1m', target: 50 },   // Ramp up to 50 users
    { duration: '3m', target: 50 },   // Stay at 50 users
    { duration: '1m', target: 100 },  // Ramp up to 100 users
    { duration: '3m', target: 100 },  // Stay at 100 users
    { duration: '1m', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests < 2s
    http_req_failed: ['rate<0.01'],     // Error rate < 1%
  },
};

export default function () {
  // Simulate user browsing homepage
  const res = http.get('https://connectplt.kr/');

  check(res, {
    'status is 200': (r) => r.status === 200,
    'page contains title': (r) => r.body.includes('Connect'),
    'page contains Korean text': (r) => r.body.includes('R&D'),
    'response time < 2s': (r) => r.timings.duration < 2000,
    'response time < 1s': (r) => r.timings.duration < 1000,
  });

  // Random wait between 2-5 seconds (realistic user behavior)
  sleep(Math.random() * 3 + 2);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options) {
  const indent = options.indent || '';

  let summary = `
${indent}Homepage Load Test Summary
${indent}==========================
${indent}
${indent}Total Requests: ${data.metrics.http_reqs.values.count}
${indent}Request Rate:   ${data.metrics.http_reqs.values.rate.toFixed(2)} req/s
${indent}
${indent}Response Times:
${indent}  P50: ${data.metrics.http_req_duration.values['p(50)'].toFixed(2)}ms
${indent}  P95: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms ← Target: <2000ms
${indent}  P99: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms
${indent}  Max: ${data.metrics.http_req_duration.values.max.toFixed(2)}ms
${indent}
${indent}Success Rate: ${((1 - data.metrics.http_req_failed.values.rate) * 100).toFixed(2)}%
${indent}
${indent}Checks Passed: ${data.metrics.checks.values.passes}/${data.metrics.checks.values.passes + data.metrics.checks.values.fails}
${indent}
${indent}Peak Virtual Users: 100
${indent}Test Duration: 9 minutes
  `;

  return summary;
}
