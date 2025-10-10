/**
 * API Stress Test (Short Version) - High load simulation (8 minutes)
 *
 * Purpose: Find breaking point and validate performance under stress
 * Stages:
 *   - Ramp up to 100 users (1 min)
 *   - Ramp up to 300 users (2 min)
 *   - Spike to 500 users (2 min) ← Find breaking point
 *   - Drop back to 200 users (2 min) ← Recovery test
 *   - Ramp down (1 min)
 * Target: P95 < 500ms at 200 users, <10% errors during spike
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '1m', target: 100 },  // Ramp up to 100
    { duration: '2m', target: 300 },  // Ramp up to 300 (high load)
    { duration: '2m', target: 500 },  // Spike to 500 (stress test)
    { duration: '2m', target: 200 },  // Drop back to 200 (recovery)
    { duration: '1m', target: 0 },    // Ramp down
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
