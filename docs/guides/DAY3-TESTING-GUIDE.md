# Day 3 Testing & QA Guide - Beta Week 1

**Date**: October 11, 2025 (Planned)
**Duration**: 6-8 hours
**Goal**: Comprehensive testing of Docker deployment before beta launch

---

## 📋 Overview

This guide covers three testing layers:
1. **Unit Tests** (Jest) - 2-3 hours
2. **E2E Tests** (Playwright) - 2-3 hours
3. **Performance Tests** (k6) - 1-2 hours

---

## 🧪 Part 1: Unit Testing with Jest (2-3 hours)

### Current Status

**Existing Tests**:
```
__tests__/
├── api/organizations.test.ts        ⚠️ FAILING (Request not defined)
├── auth/naver-oauth.test.ts         ✅ PASSING
├── lib/encryption.test.ts           ✅ PASSING
└── matching/algorithm.test.ts       ⚠️ FAILING (Score mismatch)
```

**Test Results** (as of Oct 10, 2025):
- ✅ 2 passing (auth, encryption)
- ⚠️ 2 failing (API routes, matching algorithm)
- Coverage: Unknown (needs first successful run)

### Step 1.1: Fix API Route Tests (30 min)

**Problem**: `ReferenceError: Request is not defined`

**Root Cause**: Next.js API routes use Web APIs (Request, Response) not available in Jest's Node environment

**Solution**: Mock Next.js server context

**Action**: Update `jest.setup.ts`

```typescript
// jest.setup.ts
import '@testing-library/jest-dom';

// Mock Next.js Request/Response
global.Request = jest.fn().mockImplementation((url, init) => ({
  url,
  method: init?.method || 'GET',
  headers: new Headers(init?.headers),
})) as any;

global.Response = jest.fn().mockImplementation((body, init) => ({
  body,
  status: init?.status || 200,
  headers: new Headers(init?.headers),
})) as any;

// Mock NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body, init) => ({
      body,
      status: init?.status || 200,
      headers: new Headers(init?.headers),
    })),
  },
}));

// Mock NextAuth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));
```

**Commands**:
```bash
# Update jest.setup.ts with mocks above
# Then rerun tests
npm run test -- __tests__/api/
```

### Step 1.2: Fix Matching Algorithm Tests (30 min)

**Problem**: Score calculation mismatch

**Root Cause**: Algorithm logic changed but tests not updated

**Action**: Review and update test expectations

```bash
# Read current test
cat __tests__/matching/algorithm.test.ts

# Read actual algorithm
cat lib/matching/algorithm.ts

# Update test expectations to match actual scoring logic
# Then rerun
npm run test -- __tests__/matching/
```

### Step 1.3: Expand Test Coverage (1-2 hours)

**Priority Test Suites** (create if missing):

#### A. Authentication Tests
```typescript
// __tests__/lib/auth.test.ts
describe('JWT Token Generation', () => {
  it('should generate valid JWT tokens');
  it('should validate token expiration');
  it('should reject tampered tokens');
});

describe('Session Management', () => {
  it('should create user sessions');
  it('should invalidate expired sessions');
  it('should handle concurrent sessions');
});
```

#### B. Database Tests
```typescript
// __tests__/lib/prisma.test.ts
describe('Prisma Client', () => {
  it('should connect to test database');
  it('should handle connection errors gracefully');
  it('should close connections properly');
});

describe('Organization CRUD', () => {
  it('should create organization with encrypted 사업자등록번호');
  it('should decrypt 사업자등록번호 on read');
  it('should prevent duplicate registrations');
});
```

#### C. Matching Engine Tests
```typescript
// __tests__/matching/scoring.test.ts
describe('Match Scoring', () => {
  it('should score industry match correctly (30 points)');
  it('should score TRL compatibility (20 points)');
  it('should score certifications (20 points)');
  it('should apply eligibility gates (ISMS-P, KC)');
});

describe('Korean Explanations', () => {
  it('should generate Korean explanation array');
  it('should include positive match reasons');
  it('should include improvement suggestions');
});
```

#### D. API Route Tests
```typescript
// __tests__/api/health.test.ts
describe('GET /api/health', () => {
  it('should return status ok');
  it('should return timestamp');
  it('should return service name and version');
  it('should return instance id (app1 or app2)');
});

// __tests__/api/matches.test.ts
describe('POST /api/matches', () => {
  it('should require authentication');
  it('should generate matches for authenticated user');
  it('should respect rate limits (Free: 10/month, Pro: unlimited)');
  it('should return top 10 matches sorted by score');
});
```

**Commands**:
```bash
# Create new test files
touch __tests__/lib/auth.test.ts
touch __tests__/lib/prisma.test.ts
touch __tests__/matching/scoring.test.ts
touch __tests__/api/health.test.ts
touch __tests__/api/matches.test.ts

# Run all tests with coverage
npm run test -- --coverage

# Target: 70% coverage (jest.config.ts threshold)
```

### Step 1.4: Generate Coverage Report (15 min)

```bash
# Run full test suite with coverage
npm run test -- --coverage --verbose

# View HTML report
open coverage/lcov-report/index.html

# Identify untested code
# Priority: API routes, matching algorithm, authentication
```

**Success Criteria**:
- ✅ All existing tests passing (4/4)
- ✅ New test suites created (5 files minimum)
- ✅ Coverage >70% for critical paths (auth, matching, API)
- ✅ No console errors or warnings

---

## 🌐 Part 2: E2E Testing with Playwright (2-3 hours)

### Current Status

**Existing E2E Tests**:
```
__tests__/e2e/
└── auth-flow.spec.ts    (Status unknown)
```

**Playwright Config**:
- Browsers: Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari
- Base URL: `http://localhost:3000` (development)
- Screenshots: On failure
- Traces: On first retry

### Step 2.1: Update Playwright Config for Production Testing (15 min)

**Problem**: Tests point to localhost (development)

**Solution**: Support both development and production testing

```typescript
// playwright.config.ts (update)
export default defineConfig({
  testDir: './__tests__/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    // Support testing against production
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',

    // Add timeout for slower production servers
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  // ... rest of config
});
```

**Commands**:
```bash
# Test against local dev server
npm run test:e2e

# Test against production (without starting local server)
PLAYWRIGHT_BASE_URL=https://connectplt.kr npx playwright test --config=playwright.config.ts
```

### Step 2.2: Homepage & Navigation Tests (30 min)

```typescript
// __tests__/e2e/homepage.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should load successfully', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Connect/);
  });

  test('should display hero section in Korean', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('국가 R&D 사업');
  });

  test('should show 4 agency logos', async ({ page }) => {
    await page.goto('/');
    const agencies = page.locator('[alt*="IITP"], [alt*="KEIT"], [alt*="TIPA"], [alt*="KIMST"]');
    await expect(agencies).toHaveCount(4);
  });

  test('should navigate to sign-in from CTA button', async ({ page }) => {
    await page.goto('/');
    await page.click('text=무료로 시작하기');
    await expect(page).toHaveURL(/\/auth\/signin/);
  });
});
```

### Step 2.3: Authentication Flow Tests (45 min)

```typescript
// __tests__/e2e/auth-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should display sign-in page', async ({ page }) => {
    await page.goto('/auth/signin');
    await expect(page.locator('text=시작하기')).toBeVisible();
  });

  test('should show Kakao OAuth button', async ({ page }) => {
    await page.goto('/auth/signin');
    const kakaoButton = page.locator('button:has-text("카카오로 시작하기")');
    await expect(kakaoButton).toBeVisible();
    await expect(kakaoButton).toHaveCSS('background-color', /yellow|#FEE500/i);
  });

  test('should show Naver OAuth button', async ({ page }) => {
    await page.goto('/auth/signin');
    const naverButton = page.locator('button:has-text("네이버로 시작하기")');
    await expect(naverButton).toBeVisible();
    await expect(naverButton).toHaveCSS('background-color', /green|#03C75A/i);
  });

  test('should redirect to Kakao OAuth when clicked', async ({ page }) => {
    await page.goto('/auth/signin');

    // Click Kakao button and wait for navigation
    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      page.click('button:has-text("카카오로 시작하기")')
    ]);

    // Should redirect to Kakao login
    await expect(popup).toHaveURL(/kauth\.kakao\.com/);
  });

  test('should protect dashboard route', async ({ page }) => {
    await page.goto('/dashboard');
    // Should redirect to sign-in
    await expect(page).toHaveURL(/\/auth\/signin/);
  });
});
```

### Step 2.4: Dashboard & User Flow Tests (45 min)

**Note**: Requires OAuth credentials for full flow. Can use session mocking for now.

```typescript
// __tests__/e2e/dashboard.spec.ts
import { test, expect } from '@playwright/test';

// Helper to set authenticated session cookie
async function mockAuthSession(page: Page) {
  await page.context().addCookies([{
    name: 'next-auth.session-token',
    value: 'mock-session-token-for-testing',
    domain: 'localhost',
    path: '/',
  }]);
}

test.describe('Dashboard (Authenticated)', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthSession(page);
  });

  test('should load dashboard for authenticated user', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('text=대시보드')).toBeVisible();
  });

  test('should display user profile section', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('text=프로필')).toBeVisible();
  });

  test('should show match results', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('[data-testid="match-card"]')).toBeVisible();
  });
});
```

### Step 2.5: Mobile Responsiveness Tests (30 min)

```typescript
// __tests__/e2e/mobile.spec.ts
import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['iPhone 12'] });

test.describe('Mobile Experience', () => {
  test('should display mobile-friendly navigation', async ({ page }) => {
    await page.goto('/');
    // Check for hamburger menu or mobile nav
    const viewportSize = page.viewportSize();
    expect(viewportSize?.width).toBeLessThan(768);
  });

  test('should wrap text correctly on small screens', async ({ page }) => {
    await page.goto('/');
    const hero = page.locator('h1');
    const box = await hero.boundingBox();
    expect(box?.width).toBeLessThan(400);
  });
});
```

### Step 2.6: Run E2E Test Suite (15 min)

```bash
# Install Playwright browsers if not already installed
npx playwright install

# Run all E2E tests (local dev server)
npm run test:e2e

# Run specific test file
npx playwright test __tests__/e2e/homepage.spec.ts

# Run tests against production
PLAYWRIGHT_BASE_URL=https://connectplt.kr npx playwright test

# View HTML report
npx playwright show-report

# Debug failed tests
npx playwright test --debug
```

**Success Criteria**:
- ✅ All E2E tests passing on Chromium
- ✅ Homepage loads and renders Korean text
- ✅ Sign-in page displays OAuth buttons
- ✅ Dashboard redirects unauthenticated users
- ✅ Mobile tests pass on iPhone and Android simulators

---

## ⚡ Part 3: Performance Testing with k6 (1-2 hours)

### Step 3.1: Install k6 (10 min)

```bash
# macOS
brew install k6

# Verify installation
k6 version
```

### Step 3.2: Create Load Test Scripts (30 min)

#### A. Health Endpoint Smoke Test

```javascript
// __tests__/performance/smoke-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  vus: 10, // 10 virtual users
  duration: '30s',
};

export default function () {
  const res = http.get('https://connectplt.kr/api/health');

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
    'has status ok': (r) => r.json('status') === 'ok',
  });

  sleep(1);
}
```

#### B. Homepage Load Test

```javascript
// __tests__/performance/homepage-load.js
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
    http_req_failed: ['rate<0.01'],    // Error rate < 1%
  },
};

export default function () {
  const res = http.get('https://connectplt.kr/');

  check(res, {
    'status is 200': (r) => r.status === 200,
    'page contains title': (r) => r.body.includes('Connect'),
    'response time < 2s': (r) => r.timings.duration < 2000,
  });

  sleep(Math.random() * 3 + 2); // 2-5 second random wait
}
```

#### C. API Stress Test

```javascript
// __tests__/performance/api-stress.js
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp up to 100
    { duration: '5m', target: 200 },  // Ramp up to 200
    { duration: '2m', target: 500 },  // Spike to 500
    { duration: '5m', target: 200 },  // Drop back to 200
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // Target: P95 < 500ms
    http_req_failed: ['rate<0.1'],    // Allow 10% errors during spike
  },
};

export default function () {
  // Test health endpoint
  const health = http.get('https://connectplt.kr/api/health');
  check(health, {
    'health check ok': (r) => r.status === 200,
  });
}
```

### Step 3.3: Run Performance Tests (30 min)

```bash
# Smoke test (quick validation)
k6 run __tests__/performance/smoke-test.js

# Homepage load test (9 minutes)
k6 run __tests__/performance/homepage-load.js

# API stress test (16 minutes) - WARNING: High load!
k6 run __tests__/performance/api-stress.js

# Run with cloud results (requires k6 Cloud account)
k6 run --out cloud __tests__/performance/api-stress.js
```

### Step 3.4: Analyze Results (15 min)

**Key Metrics to Check**:

1. **Response Times**:
   - P50 (median): < 200ms target
   - P95: < 500ms target (Docker deployment goal)
   - P99: < 2000ms acceptable

2. **Throughput**:
   - Requests/second: Target 100+ RPS
   - Data transferred: Monitor bandwidth usage

3. **Error Rate**:
   - Normal load: < 0.1% (1 in 1000)
   - Spike load: < 10% acceptable

4. **Resource Usage** (monitor during tests):
```bash
# SSH to production server
sshpass -p 'iw237877^^' ssh user@59.21.170.6

# Monitor Docker containers
watch -n 2 'docker stats --no-stream'

# Monitor PostgreSQL connections
docker exec connect_postgres psql -U postgres -d connect -c "SELECT count(*) FROM pg_stat_activity;"
```

**Success Criteria**:
- ✅ Health endpoint: 100 RPS, P95 < 100ms
- ✅ Homepage: 50 concurrent users, P95 < 2s
- ✅ API stress: 200 concurrent users, P95 < 500ms
- ✅ Error rate: < 1% during normal load
- ✅ Server resources: < 80% CPU, < 70% RAM

---

## 📊 Day 3 Completion Checklist

### Unit Tests
- [ ] Fix API route tests (Request/Response mocking)
- [ ] Fix matching algorithm tests (update expectations)
- [ ] Create auth tests (JWT, sessions)
- [ ] Create database tests (Prisma, CRUD)
- [ ] Create match scoring tests
- [ ] Create API health tests
- [ ] Run coverage report (target: >70%)

### E2E Tests
- [ ] Update Playwright config for production testing
- [ ] Create homepage tests (loading, Korean text, navigation)
- [ ] Create auth flow tests (sign-in, OAuth buttons, redirects)
- [ ] Create dashboard tests (protected routes, mock sessions)
- [ ] Create mobile tests (responsive design)
- [ ] Run full E2E suite on Chromium
- [ ] Generate HTML report

### Performance Tests
- [ ] Install k6
- [ ] Create smoke test (health endpoint)
- [ ] Create homepage load test (50-100 users)
- [ ] Create API stress test (100-500 users)
- [ ] Run smoke test
- [ ] Run homepage load test
- [ ] Analyze results (P95, error rate, throughput)
- [ ] Document bottlenecks

### Documentation
- [ ] Create test results summary report
- [ ] Document test failures and fixes
- [ ] Update IMPLEMENTATION-STATUS.md (64% → 66%)
- [ ] Git commit with test coverage improvements

---

## 🐛 Known Issues & Solutions

### Issue 1: Jest Tests Fail with "Request is not defined"
**Solution**: Add global mocks in `jest.setup.ts` (see Step 1.1)

### Issue 2: Playwright Can't Connect to Production
**Solution**: Ensure HTTPS certificate is valid, check firewall rules

### Issue 3: k6 Tests Show High Error Rates
**Solution**: Check Docker container health, PostgreSQL connection pool, Redis cache

### Issue 4: E2E Tests Flaky (Sometimes Pass, Sometimes Fail)
**Solution**: Increase timeouts in `playwright.config.ts`, add explicit waits

---

## 📁 Files to Create

1. `__tests__/lib/auth.test.ts` - JWT and session tests
2. `__tests__/lib/prisma.test.ts` - Database tests
3. `__tests__/matching/scoring.test.ts` - Match scoring tests
4. `__tests__/api/health.test.ts` - Health endpoint tests
5. `__tests__/e2e/homepage.spec.ts` - Homepage E2E tests
6. `__tests__/e2e/dashboard.spec.ts` - Dashboard E2E tests
7. `__tests__/e2e/mobile.spec.ts` - Mobile responsiveness tests
8. `__tests__/performance/smoke-test.js` - k6 smoke test
9. `__tests__/performance/homepage-load.js` - k6 homepage load test
10. `__tests__/performance/api-stress.js` - k6 API stress test
11. `docs/status/day3-testing-results.md` - Test results report

---

## 🚀 Quick Commands Reference

```bash
# Unit Tests
npm run test                        # Run all Jest tests
npm run test:watch                  # Watch mode
npm run test -- --coverage          # With coverage report

# E2E Tests
npm run test:e2e                    # Run Playwright tests (local)
PLAYWRIGHT_BASE_URL=https://connectplt.kr npx playwright test  # Production
npx playwright show-report          # View HTML report

# Performance Tests
k6 run __tests__/performance/smoke-test.js        # Quick smoke test
k6 run __tests__/performance/homepage-load.js     # Homepage load
k6 run __tests__/performance/api-stress.js        # API stress test

# Docker Monitoring (during performance tests)
sshpass -p 'iw237877^^' ssh user@59.21.170.6 'docker stats --no-stream'
```

---

## 📈 Expected Outcomes

By end of Day 3, you should have:
1. ✅ All unit tests passing with >70% coverage
2. ✅ E2E tests validating critical user flows
3. ✅ Performance baseline established (P95 response times)
4. ✅ Identified bottlenecks and optimization opportunities
5. ✅ Documented test results for Day 4 bug fixes

**Time Budget**:
- Unit Tests: 2-3 hours
- E2E Tests: 2-3 hours
- Performance Tests: 1-2 hours
- **Total**: 6-8 hours

**Progress Update**: 64% → 66% (Day 3 completion)

---

**Next Day (Day 4)**: Bug Fixes based on Day 3 test results

---

*Created: October 10, 2025 by Claude Code*
*Purpose: Comprehensive testing guide for Beta Week 1 Day 3*
