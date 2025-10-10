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
  const res = http.get('https://connectplt.kr/api/health');

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

  let summary = `
${indent}Smoke Test Summary
${indent}==================
${indent}
${indent}Total Requests: ${data.metrics.http_reqs.values.count}
${indent}Request Rate:   ${data.metrics.http_reqs.values.rate.toFixed(2)} req/s
${indent}
${indent}Response Times:
${indent}  P50: ${data.metrics.http_req_duration.values['p(50)'].toFixed(2)}ms
${indent}  P95: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms
${indent}  P99: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms
${indent}  Max: ${data.metrics.http_req_duration.values.max.toFixed(2)}ms
${indent}
${indent}Success Rate: ${((1 - data.metrics.http_req_failed.values.rate) * 100).toFixed(2)}%
${indent}
${indent}Checks Passed: ${data.metrics.checks.values.passes}/${data.metrics.checks.values.passes + data.metrics.checks.values.fails}
  `;

  return summary;
}
