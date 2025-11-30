# Local Scraping Dashboard Fix Work Plan

**Created**: 2025-11-30
**Status**: Pending Approval
**Estimated Effort**: 30 minutes (including local verification)

---

## Executive Summary

### Investigation Results

After thorough investigation comparing Git history, production state, and local architecture:

**Production (Working):**
- Latest `scraping_logs` entry: Nov 20, 2025
- Queue status displays correctly (no spinner)
- Redis env vars properly configured (commit `87de56e`)
- Session logging implemented (commit `cff374f`)

**Local (Broken - Screenshot):**
- Latest `scraping_logs` entry: Nov 14, 2025
- Queue status stuck with loading spinner
- **Root Cause 1**: `docker-compose.dev.yml` app service missing `REDIS_QUEUE_HOST/PORT`
- **Root Cause 2**: Manual CLI execution doesn't write to `scraping_logs`

---

## Root Cause Analysis

### Issue 1: Queue Status Loading Spinner

**Symptom**: Queue status section shows perpetual loading spinner

**Technical Details**:
- `lib/scraping/scheduler.ts:22-27` creates BullMQ Queue with:
  ```typescript
  connection: {
    host: process.env.REDIS_QUEUE_HOST || 'localhost',
    port: parseInt(process.env.REDIS_QUEUE_PORT || '6380'),
  }
  ```
- Production fix (commit `87de56e`) added these env vars to `docker-compose.production.yml`
- **`docker-compose.dev.yml` was NOT updated** - only scraper service has these vars, app service does not

**Evidence**:
```yaml
# docker-compose.dev.yml - app service (lines 23-25)
REDIS_CACHE_URL: redis://redis-cache:6379/0
REDIS_QUEUE_URL: redis://redis-queue:6379/0
# REDIS_QUEUE_HOST: MISSING
# REDIS_QUEUE_PORT: MISSING

# docker-compose.dev.yml - scraper service (lines 144-146)
REDIS_QUEUE_URL: redis://redis-queue:6379/0
REDIS_QUEUE_HOST: redis-queue     # EXISTS
REDIS_QUEUE_PORT: 6379            # EXISTS
```

### Issue 2: Scraping Logs Showing Old Data

**Symptom**: Dashboard shows Nov 8-14 data instead of today's run

**Technical Details**:
1. User ran manual `docker exec` commands to execute Discovery Scraper
2. CLI scripts (`scripts/scrape-ntis-discovery.ts`) write to `scraping_jobs` table
3. Dashboard API reads from `scraping_logs` table (correct per production fix)
4. Only `scheduler.ts` writes to `scraping_logs` when cron job runs

**Evidence (Local Database)**:
```sql
SELECT MAX("startedAt") FROM scraping_logs;
-- Result: 2025-11-14 06:00:00.718
```

**Evidence (Production Database)**:
```sql
SELECT MAX("startedAt") FROM scraping_logs;
-- Result: 2025-11-20 00:00:00.698
```

---

## Git History Verification

| Commit | Date | Change | Applied To |
|--------|------|--------|------------|
| `87de56e` | Nov 30 00:22 | Add REDIS_QUEUE_HOST/PORT | `docker-compose.production.yml` only |
| `3471d4d` | Nov 30 00:22 | Change API to read from scraping_jobs | Reverted |
| `2b7d413` | Nov 30 11:30 | Revert API to read from scraping_logs | Both (via git) |
| `cff374f` | Nov 30 11:30 | Add session logging to scheduler | Both (via git) |
| `a352028` | Nov 30 11:34 | Add pagination to dashboard | Both (via git) |

**Key Finding**: Commit `87de56e` was only applied to production config, not local dev config.

---

## Proposed Fix

### Task 1: Add Redis Queue Env Vars to Local App Service

**File**: `docker-compose.dev.yml`

**Change**: Add `REDIS_QUEUE_HOST` and `REDIS_QUEUE_PORT` to the `app` service environment section (after line 25).

**Before** (lines 23-25):
```yaml
REDIS_CACHE_URL: redis://redis-cache:6379/0
REDIS_QUEUE_URL: redis://redis-queue:6379/0
NEXTAUTH_URL: http://localhost:3000
```

**After**:
```yaml
REDIS_CACHE_URL: redis://redis-cache:6379/0
REDIS_QUEUE_URL: redis://redis-queue:6379/0
REDIS_QUEUE_HOST: redis-queue
REDIS_QUEUE_PORT: 6379
NEXTAUTH_URL: http://localhost:3000
```

**Effort**: 5 minutes

---

### Task 2: Restart App Container with New Config

**Commands**:
```bash
docker compose -f docker-compose.dev.yml down app
docker compose -f docker-compose.dev.yml up -d app
```

**Effort**: 2 minutes

---

### Task 3: Verify Queue Status Display

**Verification Steps**:
1. Access `http://localhost:3000/dashboard/admin/scraping`
2. Confirm queue status section shows numbers (0/0/0/0/0) instead of spinner
3. Check browser console for no Redis connection errors

**Effort**: 3 minutes

---

### Task 4: (Optional) Run Scheduler to Populate Logs

If fresh scraping logs are needed for testing:

**Option A**: Run scheduler manually (writes to scraping_logs):
```bash
docker exec connect_dev_scraper npx tsx -e "
const { startScheduler, triggerManualScrape } = require('./lib/scraping/scheduler');
triggerManualScrape('ntis').then(console.log);
"
```

**Option B**: Insert test log entry directly:
```bash
docker exec connect_dev_postgres psql -U connect -d connect -c "
INSERT INTO scraping_logs (id, \"agencyId\", success, \"programsFound\", \"programsNew\", \"programsUpdated\", \"startedAt\", \"completedAt\", duration)
VALUES (gen_random_uuid(), 'NTIS', true, 5, 2, 3, NOW() - interval '1 minute', NOW(), 60000);
"
```

**Effort**: 5 minutes (if needed)

---

## Implementation Order

```
┌─────────────────────────────────────────────────────────────────┐
│                      LOCAL FIX                                   │
├─────────────────────────────────────────────────────────────────┤
│  Task 1: Add REDIS_QUEUE_HOST/PORT to docker-compose.dev.yml    │
│           ↓                                                     │
│  Task 2: Restart app container                                  │
│           ↓                                                     │
│  Task 3: Verify queue status displays correctly                 │
│           ↓                                                     │
│  Task 4: (Optional) Populate scraping_logs for testing          │
├─────────────────────────────────────────────────────────────────┤
│                      COMMIT & PUSH                               │
├─────────────────────────────────────────────────────────────────┤
│  git commit: "fix: add REDIS_QUEUE_HOST/PORT to local dev"      │
│           ↓                                                     │
│  git push → Production deployment (ensures parity)              │
└─────────────────────────────────────────────────────────────────┘
```

| Step | Action | Time |
|------|--------|------|
| 1 | Task 1: Edit docker-compose.dev.yml | 5 min |
| 2 | Task 2: Restart app container | 2 min |
| 3 | Task 3: Verify dashboard queue status | 3 min |
| 4 | Task 4: (Optional) Populate test logs | 5 min |
| 5 | Commit and push | 2 min |

**Total Time**: ~15-20 minutes

---

## Architecture Comparison Summary

| Aspect | Production | Local (Before Fix) | Local (After Fix) |
|--------|------------|-------------------|-------------------|
| REDIS_QUEUE_HOST in app | redis-queue | Missing | redis-queue |
| REDIS_QUEUE_PORT in app | 6379 | Missing | 6379 |
| Queue stats API | Working | Spinner/timeout | Working |
| scraping_logs data | Nov 20 (scheduler runs) | Nov 14 (old) | Nov 14 (or fresh if Task 4) |

---

## Success Criteria

| Metric | Before Fix | After Fix |
|--------|------------|-----------|
| Queue status display | Loading spinner | Shows 0/0/0/0/0 |
| Redis connection errors | Yes (in API logs) | None |
| Local/Production parity | Mismatched | Aligned |

---

## Approval Checklist

Please confirm:
- [ ] Task 1 (Add REDIS_QUEUE_HOST/PORT to docker-compose.dev.yml) approved
- [ ] Task 2 (Restart app container) approved
- [ ] Task 3 (Verify queue status) approved
- [ ] Task 4 (Optional: Populate test logs) - Needed? Yes/No
- [ ] Ready to proceed with implementation
