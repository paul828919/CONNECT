# Scraping Dashboard Fix Work Plan (Revision 3)

**Created**: 2025-11-29
**Revised**: 2025-11-30
**Status**: ✅ Deployed to Production (Nov 30, 2025)
**Estimated Total Effort**: 60 minutes (including local verification)
**Deployment Strategy**: Commit and push after local verification

---

## Revision History

| Date | Version | Changes |
|------|---------|---------|
| 2025-11-29 | v1 | Initial plan (approved) - Changed API to read from `scraping_jobs` |
| 2025-11-30 | v2 | **CORRECTION**: Revert to `scraping_logs` + Add session logging |
| 2025-11-30 | v3 | **ENHANCEMENT**: Add pagination (10 logs/page) to scraping logs table |

---

## Executive Summary

### Previous Understanding (INCORRECT)
> Dashboard reads `scraping_logs` but Discovery Scraper writes to `scraping_jobs`

### Corrected Understanding (v2)
After thorough investigation on Nov 30:
- `scraping_logs` = **Session-level** logs (when scraping ran, overall results) ✓ Correct for dashboard
- `scraping_jobs` = **Announcement-level** jobs (individual items to process) ✗ Wrong for dashboard

The Nov 29 change broke the dashboard by reading from the wrong table. The API must be **reverted** to read from `scraping_logs`.

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

## Task 2: Revert API to Read from `scraping_logs` (P1 - Critical Fix)

### Problem
The current API reads from `scraping_jobs` table which only has entries when announcements are actually scraped. When Discovery Scraper finds 0 new announcements (weekends, no new postings), no entries are created, causing the dashboard to show stale data.

### Evidence
| Table | Latest Entry | Count | Purpose |
|-------|--------------|-------|---------|
| `scraping_jobs` | Nov 14, 2025 | 1,750 | Individual announcement jobs |
| `scraping_logs` | Nov 19, 2025 | 84 | Session-level scraping activity |

### Solution
Revert the API to read from `scraping_logs` table which properly records session-level activity.

### Files to Modify
1. `app/api/admin/scraping-logs/route.ts`

### Current Code (INCORRECT - Lines 34-67)
```typescript
// 3. Fetch recent scraping jobs (last 50) from new Discovery Scraper architecture
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

// 4. Transform scraping_jobs to legacy ScrapingLog interface
const logs = jobs.map(job => ({
  id: job.id,
  agencyId: 'ntis',
  success: job.scrapingStatus === 'SCRAPED',
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

### Proposed Code (CORRECTED)
```typescript
// 3. Fetch recent scraping logs (last 50) - session-level data
const scrapingLogs = await db.scraping_logs.findMany({
  orderBy: {
    startedAt: 'desc',
  },
  take: 50,
});

// 4. Map to ScrapingLog interface for dashboard
const logs = scrapingLogs.map(log => ({
  id: log.id,
  agencyId: log.agencyId.toLowerCase(),
  success: log.success,
  programsFound: log.programsFound,
  programsNew: log.programsNew,
  programsUpdated: log.programsUpdated,
  errorMessage: log.error,
  startedAt: log.startedAt,
  completedAt: log.completedAt || log.startedAt,
  duration: log.duration || 0,
}));
```

### Schema Verification (`prisma/schema.prisma:506-524`)
```prisma
model scraping_logs {
  id              String    @id @default(uuid())
  agencyId        AgencyId              // ✓ Verified
  startedAt       DateTime              // ✓ Verified
  completedAt     DateTime?             // ✓ Verified
  duration        Int?                  // ✓ Verified
  success         Boolean               // ✓ Verified
  programsFound   Int       @default(0) // ✓ Verified
  programsNew     Int       @default(0) // ✓ Verified
  programsUpdated Int       @default(0) // ✓ Verified
  error           String?               // ✓ Maps to errorMessage
}
```

### Verification Steps
1. Local build: `npm run build`
2. Local Docker test: Start containers, access `/api/admin/scraping-logs`
3. Verify response contains Nov 17-19 records
4. Verify dashboard displays correct data

### Effort
- Implementation: 10 minutes
- Local verification: 10 minutes
- Commit: 1 minute

---

## Task 3: Add Session Logging for Zero-Result Runs (P2 - Enhancement)

### Problem
When Discovery Scraper finds 0 announcements, no entry is written to `scraping_logs`. This creates a visibility gap where scheduled runs appear to not have occurred.

### Current Behavior
```
Scheduler runs → Discovery finds 0 announcements → No scraping_jobs created →
Worker has nothing to process → No scraping_logs entry → Dashboard shows stale data
```

### Proposed Behavior
```
Scheduler runs → Discovery finds 0 announcements → Log session to scraping_logs →
Dashboard shows "0 found" entry → Full visibility of all scheduled runs
```

### Files to Modify
- `lib/scraping/scheduler.ts`

### Implementation Location
After line 51 in `runDiscoveryScraper()` function, add session logging.

### Proposed Code Addition
```typescript
// After Discovery Scraper completes (around line 51)
// Parse discovery result from stdout to get announcement count
const announcementsMatch = stdout.match(/Found (\d+) total announcements/);
const announcementsFound = announcementsMatch ? parseInt(announcementsMatch[1]) : 0;

// Log session to scraping_logs for audit trail (even for 0-result runs)
const { db } = await import('@/lib/db');
const { AgencyId } = await import('@prisma/client');

const sessionStartTime = new Date(Date.now() - 60000); // Approximate start
const sessionEndTime = new Date();

await db.scraping_logs.create({
  data: {
    agencyId: 'NTIS' as AgencyId,
    success: true,
    programsFound: announcementsFound,
    programsNew: 0, // Discovery phase doesn't determine new vs updated
    programsUpdated: 0,
    startedAt: sessionStartTime,
    completedAt: sessionEndTime,
    duration: sessionEndTime.getTime() - sessionStartTime.getTime(),
  },
});

console.log(`  📝 Session logged (found: ${announcementsFound} announcements)`);
```

### Verification Steps
1. Local build: `npm run build`
2. Manual trigger test: `npx tsx scripts/scrape-ntis-discovery.ts --fromDate 2025-11-29 --toDate 2025-11-30`
3. Verify new entry appears in `scraping_logs` table
4. Verify dashboard shows the new session

### Effort
- Implementation: 15 minutes
- Local verification: 10 minutes
- Commit: 1 minute

---

## Task 4: Add Pagination to Scraping Logs Table (P2 - Enhancement)

### Problem
The scraping logs table currently displays all logs without pagination, making it difficult to navigate when there are many entries. The current implementation:
- Fetches 50 logs from API
- Displays only first 20 via hardcoded `logs.slice(0, 20)`
- No page navigation or page numbers

### Requirements
1. Display 10 scraping logs per page (not 20)
2. Add page numbers for navigation
3. Display in descending order (most recent first) - already implemented by API
4. Show current page indicator
5. Provide Previous/Next navigation buttons

### Files to Modify
- `app/dashboard/admin/scraping/page.tsx`

### Current Code (Lines 200-242)
```tsx
{logs && logs.length > 0 ? (
  <div className="overflow-x-auto">
    <Table>
      {/* ... table header ... */}
      <TableBody>
        {logs.slice(0, 20).map((log) => (
          <TableRow key={log.id}>
            {/* ... row content ... */}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
) : (
  <p className="text-muted-foreground text-center py-8">사용 가능한 스크래핑 로그 없음</p>
)}
```

### Proposed Code Changes

**1. Add pagination state (after line 53):**
```tsx
const [currentPage, setCurrentPage] = useState(1);
const LOGS_PER_PAGE = 10;
```

**2. Calculate pagination values (inside the component, before return):**
```tsx
// Pagination calculations
const totalPages = logs ? Math.ceil(logs.length / LOGS_PER_PAGE) : 0;
const startIndex = (currentPage - 1) * LOGS_PER_PAGE;
const endIndex = startIndex + LOGS_PER_PAGE;
const paginatedLogs = logs?.slice(startIndex, endIndex) || [];
```

**3. Replace table rendering with paginated version:**
```tsx
{logs && logs.length > 0 ? (
  <div className="space-y-4">
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>소스</TableHead>
            <TableHead>상태</TableHead>
            <TableHead className="text-right">발견</TableHead>
            <TableHead className="text-right">신규</TableHead>
            <TableHead className="text-right">업데이트</TableHead>
            <TableHead className="text-right">소요 시간</TableHead>
            <TableHead>타임스탬프</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedLogs.map((log) => (
            <TableRow key={log.id}>
              <TableCell className="font-medium">{log.agencyId.toUpperCase()}</TableCell>
              <TableCell>
                {log.success ? (
                  <Badge variant="default" className="bg-green-500">성공</Badge>
                ) : (
                  <Badge variant="destructive">실패</Badge>
                )}
              </TableCell>
              <TableCell className="text-right">{log.programsFound}</TableCell>
              <TableCell className="text-right font-semibold text-blue-600">
                {log.programsNew}
              </TableCell>
              <TableCell className="text-right text-muted-foreground">
                {log.programsUpdated}
              </TableCell>
              <TableCell className="text-right">
                {(log.duration / 1000).toFixed(1)}초
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {new Date(log.completedAt).toLocaleString('ko-KR')}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>

    {/* Pagination Controls */}
    {totalPages > 1 && (
      <div className="flex items-center justify-between border-t pt-4">
        <div className="text-sm text-muted-foreground">
          총 {logs.length}개 중 {startIndex + 1}-{Math.min(endIndex, logs.length)}개 표시
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            이전
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <Button
                key={page}
                variant={currentPage === page ? 'default' : 'outline'}
                size="sm"
                className="w-8 h-8 p-0"
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </Button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            다음
          </Button>
        </div>
      </div>
    )}
  </div>
) : (
  <p className="text-muted-foreground text-center py-8">사용 가능한 스크래핑 로그 없음</p>
)}
```

### Verification Steps
1. Local build: `npm run build`
2. Local Docker test: Access dashboard and verify:
   - Page 1 shows 10 most recent logs
   - Page numbers are clickable and update the table
   - Previous/Next buttons work correctly
   - "총 X개 중 Y-Z개 표시" counter is accurate
3. Verify descending order (most recent first)

### Effort
- Implementation: 15 minutes
- Local verification: 5 minutes

---

## ~~Task 5: Scheduler Resilience~~ (Already Implemented)

**Status:** ✅ Completed on Nov 29, 2025 (commit `77ec3d8`)

The retry logic for transient failures was already implemented in `lib/scraping/scheduler.ts`:
- `runDiscoveryScraperWithRetry()` function with 2 retry attempts
- 30-second delay between retries
- Handles ENOTFOUND, ECONNREFUSED, ETIMEDOUT errors

---

## Implementation Order (Revision 3)

**Strategy**: Fix critical issue first (Task 2) → Add enhancements (Task 3 & 4) → Single deployment

```
┌─────────────────────────────────────────────────────────────────┐
│                      LOCAL DEVELOPMENT                          │
├─────────────────────────────────────────────────────────────────┤
│  Task 2: Revert API to scraping_logs    →  npm run build        │
│           ↓                                                     │
│  Local Docker verification              →  Verify Nov 17-19 data│
│           ↓                                                     │
│  Task 3: Add session logging            →  npm run build        │
│           ↓                                                     │
│  Task 4: Add pagination (10/page)       →  npm run build        │
│           ↓                                                     │
│  Full local verification                →  Verify all features  │
├─────────────────────────────────────────────────────────────────┤
│                      DEPLOYMENT                                 │
├─────────────────────────────────────────────────────────────────┤
│  git commit + push                      →  GitHub Actions       │
│           ↓                                                     │
│  Production verification                →  Dashboard works      │
└─────────────────────────────────────────────────────────────────┘
```

| Step | Action | Time |
|------|--------|------|
| 1 | Task 2: Revert API to read from `scraping_logs` | 10 min |
| 2 | Local build verification: `npm run build` | 2 min |
| 3 | Task 3: Add session logging to scheduler | 15 min |
| 4 | Local build verification: `npm run build` | 2 min |
| 5 | Task 4: Add pagination to dashboard | 15 min |
| 6 | Local build verification: `npm run build` | 2 min |
| 7 | Local Docker test: Full verification | 5 min |
| 8 | **Commit**: `fix: revert scraping dashboard to scraping_logs + add pagination` | 1 min |
| 9 | **Push** | 1 min |
| 10 | **GitHub Actions deployment** | ~12 min |
| 11 | **Production verification** | 5 min |

**Total Time**: ~60 minutes

### Note on Task 1 (Redis Env Vars)
Task 1 from the original plan may still be relevant if queue stats show spinner.
However, this is a separate issue from the scraping logs display problem.
Can be addressed in a follow-up if needed.

---

## Rollback Plan

### Task 2 Rollback
If the API change causes issues:
```bash
git revert HEAD~1  # Revert the commit
git push origin main
```

### Task 3 Rollback
If session logging causes duplicate entries or errors:
- Remove the session logging code from `lib/scraping/scheduler.ts`
- The API fix (Task 2) will still work independently

---

## Success Criteria

| Metric | Before (Current) | After (Expected) |
|--------|------------------|------------------|
| Scraping logs freshness | Nov 14, 2025 (16+ days old) | Nov 17-19 records visible |
| Zero-result run visibility | Not logged | Logged with "0 found" |
| Dashboard data source | `scraping_jobs` (wrong) | `scraping_logs` (correct) |
| Pagination | None (hardcoded 20 rows) | 10 logs/page with page navigation |
| Page numbers | Not displayed | Displayed with Previous/Next buttons |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| API returns different data structure | Low | Medium | Schema verified, direct field mapping |
| Type errors from AgencyId enum | Low | Low | Using string literal 'NTIS' as in existing code |
| Duplicate session logs | Medium | Low | Worker logs separately when processing; scheduler logs discovery phase only |

---

## Files Summary

| File | Change Type | Task |
|------|-------------|------|
| `app/api/admin/scraping-logs/route.ts` | Modify | Task 2 |
| `lib/scraping/scheduler.ts` | Modify | Task 3 |
| `app/dashboard/admin/scraping/page.tsx` | Modify | Task 4 |

---

## Notes

- All changes require local `npm run build` verification before commit
- Production deployment takes ~12 minutes via GitHub Actions
- Dashboard URL: `https://connectplt.kr/dashboard/admin/scraping`
- **Important**: Do not use Task 1 Redis env vars fix unless queue stats spinner persists after this fix

---

## Approval Checklist

Please confirm:
- [ ] Task 2 (Revert API to `scraping_logs`) approach approved
- [ ] Task 3 (Add session logging for zero-result runs) approach approved
- [ ] Task 4 (Add pagination: 10 logs/page with page numbers) approach approved
- [ ] Implementation order approved
- [ ] Ready to proceed with implementation
