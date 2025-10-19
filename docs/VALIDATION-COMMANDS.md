# Validation Commands - Week 9 Internal Testing

**Purpose**: Execute these commands to validate system readiness before Week 9 internal testing.

---

## 1. Database Seeding

**Test Organization Seeding (5 orgs):**
```bash
npx tsx scripts/seed-test-orgs.ts
```

**Expected Output:**
```
🌱 Seeding test organizations...
✅ Created: QuantumEdge AI (STARTUP)
✅ Created: BioPharm Solutions (SME)
✅ Created: GreenEnergy Systems (LARGE_CORP)
✅ Created: NanoMaterials Lab (RESEARCH_INSTITUTE)
✅ Created: SmartFactory Korea (SME)
✅ Successfully seeded 5 test organizations!
```

---

## 2. E2E Tests (Playwright)

**All E2E Tests:**
```bash
PLAYWRIGHT_BASE_URL=https://connectplt.kr npm run test:e2e
```

**Homepage Tests Only:**
```bash
PLAYWRIGHT_BASE_URL=https://connectplt.kr npx playwright test __tests__/e2e/homepage.spec.ts --project=chromium
```

**Auth Flow Tests:**
```bash
PLAYWRIGHT_BASE_URL=https://connectplt.kr npx playwright test __tests__/e2e/auth-flow.spec.ts --project=chromium --reporter=line
```

**Dashboard Tests:**
```bash
PLAYWRIGHT_BASE_URL=https://connectplt.kr npx playwright test __tests__/e2e/dashboard.spec.ts --project=chromium --reporter=line
```

---

## 3. Load Tests (k6)

**Smoke Test (10 VUs, 30s):**
```bash
k6 run __tests__/performance/smoke-test.js
```

**AI Load Test (50 VUs, 2min):**
```bash
k6 run __tests__/performance/ai-load-test.js
```

**Authenticated Load Test (requires tokens):**
```bash
k6 run __tests__/performance/authenticated-ai-load-test.js
```

**Mixed Traffic (API + AI + Static):**
```bash
k6 run __tests__/performance/mixed-traffic.js
```

---

## 4. Cache Validation

**Warm Cache:**
```bash
curl -X POST https://connectplt.kr/api/admin/cache-warming \
  -H "Content-Type: application/json" \
  -d '{"strategy": "smart"}'
```

**Check Hit Rate:**
```bash
curl https://connectplt.kr/api/admin/cache-dashboard | jq '.summary.hitRate'
```

**View Cached Keys:**
```bash
docker-compose -f docker-compose.dev.yml exec redis-cache redis-cli KEYS "*"
```

---

## 5. Rate Limiting Validation

**Test Rate Limited Endpoint (100 req/15min):**
```bash
curl http://localhost:3000/api/example-with-ratelimit
```

**Expected Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 2025-10-19T...
```

---

## 6. Security Validation

**Check CSP Header:**
```bash
curl -I https://connectplt.kr | grep -i content-security-policy
```

**Check Cookie Flags:**
```bash
curl -I https://connectplt.kr/api/auth/session | grep -i set-cookie
```

**Expected:** `HttpOnly; Secure; SameSite=Lax`

---

**Estimated Execution Time:** 15-20 minutes
**Run Before:** Week 9, Day 1 (October 21, 2025)
