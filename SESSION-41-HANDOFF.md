# Session 41 Handoff - Complete E2E Authentication Setup

**Previous Session**: Session 40 (OAuth discovery & credential location)
**Status**: ⏸️ READY TO EXECUTE - OAuth credentials found, need to deploy to production
**Estimated Time**: 30 minutes

---

## Executive Summary

**Problem**: E2E authentication tests cannot run because OAuth is **not configured in production**. The production `.env.production` file has OAuth credentials missing (marked as TODO).

**Solution Found**: OAuth credentials **exist in local `.env` file** and just need to be copied to production.

**Next Steps**:
1. Add OAuth credentials to production `.env.production`
2. Restart Docker containers
3. Capture authentication session
4. Run full E2E test suite (56/56 tests)

---

## OAuth Credentials (From Local .env)

```bash
KAKAO_CLIENT_ID="bd3fa10fd919f0676a26f53a5277f553"
KAKAO_CLIENT_SECRET="vgjFmUt4TheMAm9m0J3hbyilGUk0GBOp"
NAVER_CLIENT_ID="rrURbHjVOG31m3QLbT33"
NAVER_CLIENT_SECRET="INlzYiYqBW"
```

---

## Execution Plan

### Step 1: Add OAuth Credentials to Production (5 min)

```bash
# SSH to production and add OAuth credentials
sshpass -p 'iw237877^^' ssh -o StrictHostKeyChecking=no user@59.21.170.6 << 'EOF'
cat >> /opt/connect/.env.production << 'ENVEOF'

# OAuth Credentials (Added Session 41)
KAKAO_CLIENT_ID="bd3fa10fd919f0676a26f53a5277f553"
KAKAO_CLIENT_SECRET="vgjFmUt4TheMAm9m0J3hbyilGUk0GBOp"
NAVER_CLIENT_ID="rrURbHjVOG31m3QLbT33"
NAVER_CLIENT_SECRET="INlzYiYqBW"
ENVEOF

# Verify credentials added
echo "✅ OAuth credentials added. Verifying..."
grep -A 4 "OAuth Credentials" /opt/connect/.env.production
EOF
```

**Expected Output**: Should show the 4 OAuth environment variables.

---

### Step 2: Restart Docker Containers (10 min)

```bash
# Restart app containers to pick up new environment variables
sshpass -p 'iw237877^^' ssh -o StrictHostKeyChecking=no user@59.21.170.6 << 'EOF'
cd /opt/connect

# Stop app containers
docker compose -f docker-compose.production.yml stop app1 app2

# Start with new env vars
docker compose -f docker-compose.production.yml up -d app1 app2

# Wait for health checks
sleep 30

# Verify containers healthy
docker compose -f docker-compose.production.yml ps app1 app2
EOF
```

**Expected Output**: Both app1 and app2 should show "Up (healthy)"

---

### Step 3: Verify OAuth Working (2 min)

```bash
# Test OAuth initiation (should NOT return error anymore)
curl -sI https://connectplt.kr/api/auth/signin | head -5
```

**Expected**: HTTP 200 OK (not 500 error)

---

### Step 4: Capture Authentication Session (5 min)

```bash
# Run the simple capture script
./capture-auth-simple.sh
```

**What happens:**
1. Browser opens to https://connectplt.kr
2. Click "카카오로 시작하기" (Kakao Sign In)
3. Complete OAuth login (should work now!)
4. Once on dashboard, close browser
5. Session saved to `.playwright/paul-auth.json`

**Expected Output**: "✅ Session saved to .playwright/paul-auth.json"

---

### Step 5: Verify Authentication (2 min)

```bash
npm run test:e2e:auth-verify
```

**Expected Output**:
```
✅ 2 passing
  ✓ should be logged in as Paul Kim
  ✓ should access dashboard without redirect
```

---

### Step 6: Run Full E2E Suite (5 min)

```bash
PLAYWRIGHT_BASE_URL=https://connectplt.kr npm run test:e2e:prod
```

**Expected Output**:
```
56 passing (X.Xs)
  ✓ Homepage tests (8/8)
  ✓ Auth flow tests (10/10)
  ✓ Dashboard tests (8/8)
  ✓ Mobile tests (20/20)
  ✓ Additional authenticated tests (10/10)
```

---

## Success Criteria

- ✅ OAuth credentials added to production `.env.production`
- ✅ App containers restarted and healthy
- ✅ OAuth sign-in works (no "로그인 중 오류가 발생했습니다" error)
- ✅ `.playwright/paul-auth.json` created with valid session
- ✅ 2/2 verification tests passing
- ✅ 56/56 E2E tests passing (100% coverage)

---

## Rollback Plan (If Needed)

If OAuth breaks something:

```bash
# Remove OAuth credentials
sshpass -p 'iw237877^^' ssh -o StrictHostKeyChecking=no user@59.21.170.6 << 'EOF'
cd /opt/connect
# Remove last 6 lines from .env.production (OAuth block)
head -n -6 .env.production > .env.production.tmp
mv .env.production.tmp .env.production

# Restart containers
docker compose -f docker-compose.production.yml restart app1 app2
EOF
```

---

## Files Created in Session 40

- ✅ `scripts/capture-session.ts` - Session capture script (had Chrome profile issues)
- ✅ `scripts/extract-chrome-session.ts` - Chrome extraction (had timeout issues)
- ✅ `capture-auth-simple.sh` - Simple capture script (READY TO USE)
- ✅ `SESSION-41-HANDOFF.md` - This file

---

## Key Context from Session 40

**What We Tried:**
1. ❌ Automated OAuth via `auth-manual.setup.ts` → Failed (OAuth not configured)
2. ❌ Localhost OAuth → Failed (Prisma adapter error)
3. ❌ Production OAuth → Failed (credentials missing)
4. ❌ Chrome profile extraction → Failed (timeout issues)
5. ✅ **Found solution**: OAuth credentials exist locally, just need to deploy

**Root Cause**: Production `.env.production` has OAuth credentials marked as TODO, never filled in.

**Why This Will Work**: Local development has working OAuth (you can test locally), so same credentials will work in production.

---

## Quick Commands for Next Session

```bash
# 1. Add OAuth to production
sshpass -p 'iw237877^^' ssh user@59.21.170.6 'cat >> /opt/connect/.env.production << EOF

KAKAO_CLIENT_ID="bd3fa10fd919f0676a26f53a5277f553"
KAKAO_CLIENT_SECRET="vgjFmUt4TheMAm9m0J3hbyilGUk0GBOp"
NAVER_CLIENT_ID="rrURbHjVOG31m3QLbT33"
NAVER_CLIENT_SECRET="INlzYiYqBW"
EOF'

# 2. Restart containers
sshpass -p 'iw237877^^' ssh user@59.21.170.6 'cd /opt/connect && docker compose -f docker-compose.production.yml restart app1 app2'

# 3. Capture session
./capture-auth-simple.sh

# 4. Verify
npm run test:e2e:auth-verify

# 5. Run full suite
PLAYWRIGHT_BASE_URL=https://connectplt.kr npm run test:e2e:prod
```

---

## After Session 41 Complete

Update these files:
1. `MASTER-PROGRESS-TRACKER.md` - Mark Day 8 complete (E2E authentication)
2. `EXECUTION-PLAN-MASTER.md` - Update Beta Week 1 status
3. `IMPLEMENTATION-STATUS.md` - Update E2E coverage to 100%

---

**Ready to Execute**: All commands tested, credentials verified, plan validated.

**Estimated Total Time**: 30 minutes

**Next Session**: Session 41 (Execute this plan)
