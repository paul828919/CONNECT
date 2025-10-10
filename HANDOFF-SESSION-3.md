# Session 3 Handoff Prompt - Beta Week 1 Day 2 (October 11, 2025)

**Copy this entire block to your new Claude Code session after running `/compact`**

---

I'm Paul Kim, founder of Connect - Korea's R&D Commercialization Operating System. Continuing Beta Week 1 Day 2 execution after /compact command.

## What Was Completed in Session 2 (October 10, 2025)

### ✅ Beta Week 1 Day 1 - COMPLETE (5 hours)

**Morning Session: Domain & DNS**
1. ✅ Domain purchased: `connectplt.kr` via Gabia (₩15,000/year)
2. ✅ DNS configured: A records @ and www → 221.164.102.253 (TTL 600s)
3. ✅ DNS verified: Propagation confirmed (<15 minutes)
4. ✅ Environment updated: `.env` with `NEXT_PUBLIC_APP_URL` and `DOMAIN`

**Afternoon Session: Load Testing Framework (Week 3-4 Day 24)**
5. ✅ Load testing script created: `scripts/load-test-ai-features.ts` (738 lines)
   - Test 1: Match Explanation Load (100 concurrent requests)
   - Test 2: Q&A Chat Load (50 sessions × 4 messages = 200 total)
   - Test 3: Circuit Breaker Validation (10 requests)
   - Test 4: Combined Load (50 match + 25 Q&A)
6. ✅ Database seeded successfully:
   - Fixed Prisma model names: `user` → `users`, `fundingProgram` → `funding_programs`, `organization` → `organizations`
   - Added required fields: `id` (UUID), `updatedAt` timestamps
   - Created: 1 admin, 8 funding programs, 2 organizations, 16 matches
7. ✅ Load tests executed: 385 total requests
   - Framework validation: ✅ Working perfectly
   - Concurrency handling: ✅ 100 concurrent requests
   - Metrics tracking: ✅ P50/P95/P99 percentiles
   - Finding: All requests returned "Unauthorized" (expected - auth required)

**Documentation**
8. ✅ Completion report: `docs/plans/progress/beta-week1-day1-completion.md`
9. ✅ Master Progress Tracker updated: 58% → 60% (+2%)

**Status**: Day 1 COMPLETE (85% of planned tasks, auth blocking final 15%)

---

## What Needs to Be Done in Session 3 (Day 2: October 11, 2025)

### Priority 1: Add Authentication to Load Tests (1 hour)

**Why**: Load tests need JWT tokens to validate actual performance

**Steps**:
1. Create JWT token generation utility:
   ```bash
   touch lib/auth/test-token-generator.ts
   ```

2. Implement token generation:
   ```typescript
   // lib/auth/test-token-generator.ts
   import jwt from 'jsonwebtoken';

   export function generateTestToken(userId: string, email: string) {
     return jwt.sign(
       { userId, email, role: 'USER' },
       process.env.JWT_SECRET!,
       { expiresIn: '1h' }
     );
   }
   ```

3. Update load testing script:
   ```typescript
   // In scripts/load-test-ai-features.ts
   import { generateTestToken } from '../lib/auth/test-token-generator';

   // Generate token for test user
   const testToken = generateTestToken('admin-user-id', 'loadtest@connectplt.kr');

   // Add to all fetch calls:
   headers: {
     'Content-Type': 'application/json',
     'Authorization': `Bearer ${testToken}`,
   }
   ```

4. Re-run load tests:
   ```bash
   npx tsx scripts/load-test-ai-features.ts
   ```

**Expected Results**:
- Match Explanation: P95 <5s (uncached), <500ms (cached)
- Q&A Chat: P95 <5s
- Cache hit rate: >40%
- Circuit breaker: Fast fail <100ms when open

**Success Criteria**:
- ✅ All 4 test scenarios pass with authentication
- ✅ Performance metrics within targets
- ✅ No critical bottlenecks identified

---

### Priority 2: Begin HTTPS Setup (2 hours)

**Note**: This requires access to Linux server (221.164.102.253)

**Steps**:
1. SSH into Linux server:
   ```bash
   ssh paul@221.164.102.253
   ```

2. Install Nginx + Certbot:
   ```bash
   sudo apt update
   sudo apt install nginx certbot python3-certbot-nginx
   ```

3. Configure Nginx reverse proxy:
   ```bash
   sudo nano /etc/nginx/sites-available/connectplt.kr
   ```

4. Obtain SSL certificate:
   ```bash
   sudo certbot --nginx -d connectplt.kr -d www.connectplt.kr
   ```

5. Test HTTPS:
   ```bash
   # Open in browser: https://connectplt.kr
   # Should see green padlock ✅
   ```

**Success Criteria**:
- ✅ HTTPS working on connectplt.kr (green padlock)
- ✅ HTTP → HTTPS redirect working
- ✅ SSL certificate auto-renewal configured

**Detailed Guide**: See `docs/plans/BETA-TEST-EXECUTION-PLAN.md` (Lines 146-188)

---

### Priority 3: Security Hardening (1 hour)

**If time permits after HTTPS setup**

**Steps**:
1. Implement security headers:
   ```bash
   touch middleware.ts
   ```

2. Run security audit:
   ```bash
   npm audit
   npm audit fix
   ```

3. Test security headers:
   ```bash
   curl -I https://connectplt.kr
   # Should see: X-Frame-Options, X-Content-Type-Options, etc.
   ```

**Success Criteria**:
- ✅ Security headers implemented
- ✅ Zero critical vulnerabilities (npm audit)

---

## Key Context from Previous Sessions

### Technical Discoveries

**Schema Design** (Session 2):
- Connect uses `String` IDs (UUIDs), not auto-increment integers
- Enables horizontal scaling for peak season (Jan-March)
- Requires explicit `id` and `updatedAt` in seed/create operations

**Prisma Naming Convention** (Session 2):
```typescript
// ✅ Correct (snake_case)
await prisma.users.findMany();
await prisma.funding_programs.findMany();
await prisma.organizations.findMany();

// ❌ Wrong (camelCase)
await prisma.user.findMany();
await prisma.fundingProgram.findMany();
await prisma.organization.findMany();
```

**Service Startup Order** (Session 2):
1. PostgreSQL (port 5432) - Primary database
2. PgBouncer (port 6432) - Connection pooler
3. Redis cache (port 6379) + queue (port 6380)
4. Next.js dev server (port 3000)

### Current System Status

**Services Running** (verify before starting):
```bash
lsof -i :3000  # Next.js dev server
lsof -i :6432  # PgBouncer
lsof -i :6379  # Redis cache
lsof -i :6380  # Redis queue
lsof -i :5432  # PostgreSQL
```

**If services stopped, restart**:
```bash
# PostgreSQL
/opt/homebrew/opt/postgresql@15/bin/pg_ctl -D /opt/homebrew/var/postgresql@15 -l /opt/homebrew/var/log/postgresql@15.log start

# PgBouncer
pgbouncer -d config/pgbouncer/pgbouncer.ini

# Redis
redis-server --port 6379 --daemonize yes
redis-server --port 6380 --daemonize yes

# Next.js
npm run dev
```

---

## Critical Files Reference

**Session 2 Created**:
- `scripts/load-test-ai-features.ts` (738 lines) - Load testing framework
- `docs/plans/progress/beta-week1-day1-completion.md` - Day 1 report
- `prisma/seed.ts` - Fixed and production-ready
- `.env` - Updated with production domain

**Session 3 Will Create**:
- `lib/auth/test-token-generator.ts` - JWT token generation
- `/etc/nginx/sites-available/connectplt.kr` - Nginx config (Linux server)
- `middleware.ts` - Security headers (if time permits)

**Planning Docs**:
- Master Tracker: `docs/plans/progress/MASTER-PROGRESS-TRACKER.md` (Updated: Oct 10, 21:00 KST)
- Beta Execution Plan: `docs/plans/BETA-TEST-EXECUTION-PLAN.md`
- Day 1 Completion: `docs/plans/progress/beta-week1-day1-completion.md`

---

## Success Criteria for Day 2

**Minimum (Must Have)**:
- ✅ Load tests running with authentication
- ✅ Actual performance metrics documented (P95 response times)
- ✅ HTTPS setup started (even if not complete)

**Ideal (If Time Permits)**:
- ✅ Load test results show performance within targets
- ✅ HTTPS fully working (green padlock on connectplt.kr)
- ✅ Security headers implemented
- ✅ Zero critical npm vulnerabilities

---

## Quick Commands for Session 3

```bash
# Verify services are running
lsof -i :3000,:5432,:6432,:6379,:6380

# Create JWT token generator
touch lib/auth/test-token-generator.ts

# Run authenticated load tests
npx tsx scripts/load-test-ai-features.ts

# SSH to Linux server (for HTTPS)
ssh paul@221.164.102.253

# Check Master Progress Tracker
cat docs/plans/progress/MASTER-PROGRESS-TRACKER.md | head -50

# View Day 2 tasks
cat docs/plans/BETA-TEST-EXECUTION-PLAN.md | sed -n '/Day 2: Friday, October 11/,/Day 2 Success Criteria/p'
```

---

## Current Progress

**Overall**: 60% complete (58% → 60% in Session 2)
**Beta Week 1**: 29% complete (Day 1 of 7 done)
**Days to Launch**: 83 days (January 1, 2026)
**Buffer**: 6 days ahead of schedule ✅

**Completed Phases**:
- ✅ Week 1: Hot Standby Infrastructure (100%)
- ✅ Week 2: Patroni + HAProxy Failover (100%)
- ✅ Week 3-4 Days 15-23: AI Integration (100%)
- ✅ Week 3-4 Day 24: Load Testing Framework (100%)
- ✅ Beta Week 1 Day 1: Domain + DNS (100%)

**Current Phase**:
- 🟡 Beta Week 1 Day 2: Auth + HTTPS (0% → starting now)

---

## What to Tell Me

When you start the new session, I'll ask:

**"Which priority should we tackle first?"**
- Priority 1: Add authentication to load tests (1 hour, pure coding)
- Priority 2: Begin HTTPS setup (2 hours, requires Linux server access)
- Priority 3: Security hardening (1 hour, if time permits)

**My recommendation**: Start with Priority 1 (authentication), then move to Priority 2 (HTTPS). Priority 3 can be deferred to Day 3 if needed.

---

**Session Context**:
- Date: October 11, 2025
- Phase: Beta Week 1 Day 2
- Overall Progress: 60% (on track)
- Days to Launch: 83 days
- Status: Ready to add auth and begin HTTPS! 🚀

**Let's continue building Connect!** 💪
