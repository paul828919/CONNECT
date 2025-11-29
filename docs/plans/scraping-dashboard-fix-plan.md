# Scraping Dashboard Fix Work Plan

**Created**: 2025-11-29
**Status**: Approved
**Estimated Total Effort**: 1-1.5 hours (including single deployment)
**Deployment Strategy**: Batch commits, single push

---

## Executive Summary

The scraping dashboard at `/dashboard/admin/scraping` has two confirmed issues:
1. **Queue Status Spinner**: Missing environment variables cause Redis connection failure
2. **Stale Scraping Logs**: Dashboard reads legacy table while new architecture writes to different table

Both issues stem from incomplete integration after the Nov 20, 2025 architectural change (commit `ba28f40`).

---

## Task 1: Fix Queue Status Redis Connection (P1)

### Problem
`app1` and `app2` containers missing `REDIS_QUEUE_HOST` and `REDIS_QUEUE_PORT` environment variables, causing `getQueueStats()` to fallback to `localhost:6380` (non-existent).

### Solution
Add missing environment variables to `docker-compose.production.yml`.

### Files to Modify
- `docker-compose.production.yml`

### Changes Required

**app1 container (line ~45, after REDIS_QUEUE_URL):**
```yaml
REDIS_QUEUE_HOST: redis-queue
REDIS_QUEUE_PORT: 6379
```

**app2 container (line ~155, after REDIS_QUEUE_URL):**
```yaml
REDIS_QUEUE_HOST: redis-queue
REDIS_QUEUE_PORT: 6379
```

### Verification Steps
1. Local: `docker-compose -f docker-compose.dev.yml up -d` and test `/api/admin/scrape`
2. Production: After deployment, verify queue stats load without spinner

### Effort
- Implementation: 5 minutes
- Local verification: 5 minutes
- Commit: 1 minute

---

## Task 2: Align Dashboard with New Scraping Architecture (P2)

### Problem
Dashboard API reads from `scraping_logs` table (legacy BullMQ worker), but new Discovery Scraper writes to `scraping_jobs` table.

### Solution
Update dashboard API and page to display data from `scraping_jobs` table with appropriate field mapping.

### Files to Modify
1. `app/api/admin/scraping-logs/route.ts`
2. `app/dashboard/admin/scraping/page.tsx`

### Schema Comparison

| scraping_logs (legacy) | scraping_jobs (new) | Mapping Strategy |
|------------------------|---------------------|------------------|
| agencyId | - | Default to 'NTIS' |
| success | scrapingStatus | `SUCCESS` → true, else false |
| programsFound | - | Count from query |
| programsNew | - | Count new records |
| programsUpdated | - | Not applicable |
| duration | - | Calculate from timestamps |
| startedAt | scrapedAt | Direct map |
| completedAt | processedAt | Direct map |
| errorMessage | scrapingError | Direct map |

### API Changes (`app/api/admin/scraping-logs/route.ts`)

```typescript
// Query scraping_jobs instead of scraping_logs
const jobs = await db.scraping_jobs.findMany({
  orderBy: { scrapedAt: 'desc' },
  take: 50,
  select: {
    id: true,
    announcementTitle: true,
    scrapingStatus: true,
    scrapingError: true,
    scrapedAt: true,
    processingStatus: true,
    processedAt: true,
  },
});

// Transform to match existing interface
const logs = jobs.map(job => ({
  id: job.id,
  agencyId: 'ntis',
  success: job.scrapingStatus === 'SUCCESS',
  programsFound: 1,
  programsNew: job.processingStatus === 'PENDING' ? 1 : 0,
  programsUpdated: job.processingStatus === 'COMPLETED' ? 1 : 0,
  errorMessage: job.scrapingError,
  startedAt: job.scrapedAt,
  completedAt: job.processedAt || job.scrapedAt,
  duration: job.processedAt
    ? new Date(job.processedAt).getTime() - new Date(job.scrapedAt).getTime()
    : 0,
}));
```

### Alternative Approach: Summary View

Instead of individual job logs, provide aggregated summary:

```typescript
// Get daily scraping summaries
const summary = await db.scraping_jobs.groupBy({
  by: ['scrapingStatus'],
  _count: { id: true },
  where: {
    scrapedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
  },
});
```

### Dashboard Page Changes
- Update `ScrapingLog` interface to match new data structure
- Optionally add "Announcement Title" column for better visibility
- Consider adding link to announcement URL

### Verification Steps
1. Local: Seed test data in `scraping_jobs`, verify dashboard displays
2. Production: Verify real scraping data appears after deployment

### Effort
- Implementation: 30 minutes
- Local verification: 10 minutes
- Commit: 1 minute

---

## Task 3: Improve Scheduler Resilience (P3 - Optional)

### Problem
Transient failures during container restarts cause DNS resolution errors and missed scheduled runs.

### Solution
Add startup delay and retry logic to scheduler initialization.

### Files to Modify
- `lib/scraping/scheduler.ts`
- `lib/scraping/worker.ts`

### Changes Required

**Add startup delay in `worker.ts`:**
```typescript
// Wait for DNS resolution to stabilize after container start
async function waitForRedis(retries = 5, delay = 3000) {
  for (let i = 0; i < retries; i++) {
    try {
      await scrapingQueue.client;
      console.log('  Redis connection established');
      return true;
    } catch (err) {
      console.log(`  Waiting for Redis... (attempt ${i + 1}/${retries})`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error('Failed to connect to Redis after retries');
}
```

**Add retry wrapper in `scheduler.ts`:**
```typescript
async function runDiscoveryScraperWithRetry(maxRetries = 2) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await runDiscoveryScraper();
      return;
    } catch (err) {
      if (attempt === maxRetries) throw err;
      console.log(`  Retry ${attempt}/${maxRetries} after failure...`);
      await new Promise(r => setTimeout(r, 30000)); // 30s delay
    }
  }
}
```

### Verification Steps
1. Local: Restart containers, verify scheduler recovers
2. Production: Monitor next scheduled run (10 AM or 2 PM KST)

### Effort
- Implementation: 30 minutes
- Local verification: 10 minutes
- Commit: 1 minute

---

## Implementation Order (Batched Deployment)

**Strategy**: Complete all tasks locally → Commit after each task → Push all commits at once → Single deployment

```
┌─────────────────────────────────────────────────────────────────┐
│                      LOCAL DEVELOPMENT                          │
├─────────────────────────────────────────────────────────────────┤
│  Task 1: Add env vars          →  git commit (5 min)            │
│           ↓                                                     │
│  Task 2: Update dashboard API  →  git commit (30 min)           │
│           ↓                                                     │
│  Task 3: Scheduler resilience  →  git commit (30 min)           │
├─────────────────────────────────────────────────────────────────┤
│                      DEPLOYMENT (ONCE)                          │
├─────────────────────────────────────────────────────────────────┤
│  git push origin main          →  GitHub Actions (~30 min)      │
│           ↓                                                     │
│  Production verification       →  All fixes live                │
└─────────────────────────────────────────────────────────────────┘
```

| Step | Action | Time |
|------|--------|------|
| 1 | Task 1: Add env vars to docker-compose.production.yml | 5 min |
| 2 | **Commit**: `fix: add REDIS_QUEUE_HOST/PORT to app containers` | 1 min |
| 3 | Task 2: Update scraping-logs API to read from scraping_jobs | 30 min |
| 4 | **Commit**: `fix: align dashboard with Discovery Scraper architecture` | 1 min |
| 5 | Task 3: Add scheduler retry logic and startup delay | 30 min |
| 6 | **Commit**: `fix: add scheduler resilience for transient failures` | 1 min |
| 7 | **Push all commits** | 1 min |
| 8 | **GitHub Actions deployment** | ~30 min |
| 9 | **Production verification** | 5 min |

**Total Time**: ~1-1.5 hours (vs. ~2.5 hours with individual deployments)

---

## Rollback Plan

### Task 1 Rollback
Remove added environment variables from `docker-compose.production.yml`.

### Task 2 Rollback
Revert API to query `scraping_logs` table (git revert).

### Task 3 Rollback
Remove retry logic and startup delay (git revert).

---

## Success Criteria

| Metric | Before | After |
|--------|--------|-------|
| Queue stats load | Perpetual spinner | Displays 0/0/0/0 or actual counts |
| Scraping logs freshness | Nov 18-20 (9+ days old) | Today or yesterday |
| Scheduled run success | Intermittent failures | Consistent daily runs |

---

## Notes

- All changes require local verification before commit
- **Batched deployment**: Commit after each task, push all commits once at the end
- Production deployment takes ~30 minutes via GitHub Actions
- Dashboard at `connectplt.kr/dashboard/admin/scraping` for verification
- Time savings: ~1 hour saved by avoiding 3 separate deployments
