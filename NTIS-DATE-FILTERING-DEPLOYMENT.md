# NTIS Date Filtering - Production Deployment Checklist

**Feature**: NTIS Daily Scraper Date Filtering
**Commit**: `0009426` - feat(scraper): Add NTIS date filtering to daily scraper
**Date**: October 26, 2025
**Status**: ✅ Ready for Deployment

---

## Pre-Deployment Verification

### ✅ Local Testing Completed
- [x] Date calculation tests passed (Asia/Seoul timezone)
- [x] Date validation tests passed (auto-correction detection)
- [x] jQuery datepicker integration verified
- [x] NTIS scraping with date filtering verified
- [x] Manual verification confirmed 24 results for Oct 1-26 range
- [x] Test script handles 0 results gracefully
- [x] All changes committed to git

### ✅ Code Changes Summary
**New Files (3):**
1. `lib/scraping/utils/date-utils.ts` (96 lines)
2. `lib/scraping/utils/ntis-date-filter.ts` (153 lines)
3. `scripts/test-ntis-date-filtering.ts` (324 lines)

**Modified Files (1):**
1. `lib/scraping/worker.ts` (+42 lines for NTIS date filtering)

**Configuration:**
- `.env.production` already contains `NTIS_SCRAPING_DAYS_BACK=2`

---

## Deployment Steps

### 1. Pre-Deployment Checks

```bash
# Verify commit is ready
git log -1 --oneline

# Expected output:
# 0009426 feat(scraper): Add NTIS date filtering to daily scraper

# Verify Docker is running
docker info > /dev/null 2>&1 && echo "✅ Docker is running" || echo "❌ Start Docker first"
```

### 2. Build Production Docker Image

⚠️ **CRITICAL**: Must build for linux/amd64 architecture

```bash
# Build scraper image with correct architecture
docker buildx build \
  --platform linux/amd64 \
  -f Dockerfile.scraper \
  -t ghcr.io/paul828919/connect-scraper:latest \
  .

# Verify architecture
docker inspect ghcr.io/paul828919/connect-scraper:latest --format='{{.Architecture}}'
# Expected: amd64
```

### 3. Push to GitHub

```bash
# Push commit to trigger GitHub Actions
git push origin main

# Monitor GitHub Actions
# User will manually check: https://github.com/paul828919/CONNECT/actions
```

### 4. GitHub Actions Deployment

**Automated steps (via `.github/workflows/deploy-production.yml`):**
1. ✅ Build Docker images (app + scraper)
2. ✅ Push to GitHub Container Registry
3. ✅ SSH to production server
4. ✅ Pull latest images
5. ✅ Rolling update with zero-downtime
6. ✅ Container health checks (90 seconds)
7. ✅ Verify deployment success

**Duration**: ~12 minutes

---

## Post-Deployment Verification

### 1. Verify Scraper Container Running

```bash
# SSH to production server
ssh -i ~/.ssh/id_ed25519_connect user@221.164.102.253

# Check scraper container status
docker ps -a | grep scraper

# Expected:
# scraper container should show "Up X minutes" with "healthy" status
```

### 2. Verify NTIS Date Filtering Configuration

```bash
# Check environment variable is set
docker exec $(docker ps -q -f name=scraper) env | grep NTIS_SCRAPING_DAYS_BACK

# Expected output:
# NTIS_SCRAPING_DAYS_BACK=2
```

### 3. Monitor Scraper Logs

```bash
# Watch scraper logs in real-time
docker logs -f $(docker ps -q -f name=scraper) 2>&1 | grep -i ntis

# Look for:
# ✅ "Applying date filter: YYYY-MM-DD to YYYY-MM-DD (2 days back)"
# ✅ "Date filter applied successfully"
# ✅ "Found N announcements"
```

### 4. Verify Database Records

```bash
# Connect to production database
docker exec -it $(docker ps -q -f name=db) psql -U connect -d connect

# Query recent NTIS announcements
SELECT
  COUNT(*) as total_ntis,
  COUNT(*) FILTER (WHERE "createdAt" >= NOW() - INTERVAL '24 hours') as last_24h,
  MAX("createdAt") as most_recent
FROM funding_programs
WHERE "agencyId" = 'NTIS';

# Expected:
# - total_ntis: Should increase after scraper runs
# - last_24h: Should show new records if announcements were posted
# - most_recent: Should be recent timestamp
```

### 5. Check for Duplicate Prevention

```bash
# Verify contentHash unique constraint is working
SELECT
  "contentHash",
  COUNT(*)
FROM funding_programs
WHERE "agencyId" = 'NTIS'
GROUP BY "contentHash"
HAVING COUNT(*) > 1;

# Expected: (0 rows) - No duplicates
```

---

## Rollback Procedure (If Needed)

### Option 1: Revert Git Commit

```bash
# Revert the NTIS date filtering commit
git revert 0009426

# Push revert
git push origin main

# Wait for GitHub Actions to deploy reverted version (~12 minutes)
```

### Option 2: Emergency Rollback (Docker Image)

```bash
# SSH to production server
ssh -i ~/.ssh/id_ed25519_connect user@221.164.102.253

# Find previous scraper image
docker images | grep scraper

# Tag previous version as latest
docker tag ghcr.io/paul828919/connect-scraper:<previous-sha> \
  ghcr.io/paul828919/connect-scraper:latest

# Restart scraper container
docker-compose -f docker-compose.production.yml restart scraper
```

---

## Expected Behavior After Deployment

### Normal Operation (Announcements Exist)
```
📅 Applying date filter: 2025-10-24 to 2025-10-26 (2 days back)
✅ Date filter applied successfully
📊 Found 5 announcements
✅ Processed 5 announcements
💾 Saved 3 new announcements (2 duplicates skipped via contentHash)
```

### Normal Operation (No New Announcements)
```
📅 Applying date filter: 2025-10-24 to 2025-10-26 (2 days back)
✅ Date filter applied successfully
📊 Found 0 announcements
ℹ️  No new NTIS announcements in date range (normal for weekends/holidays)
```

### Error Condition (Requires Investigation)
```
❌ NTIS returned 0 announcements (possible maintenance window or filter error)
⚠️  Recent NTIS announcements exist in database - triggering retry
```

---

## Monitoring & Alerts

### Key Metrics to Monitor

1. **NTIS Scraping Success Rate**
   - Should remain >95% daily
   - Temporary 0% is OK during NTIS maintenance windows

2. **Duplicate Rate**
   - Should remain <5% with 2-day lookback window
   - Higher duplicates = wider overlap = expected with date filtering

3. **New Announcement Detection Latency**
   - Announcements should appear in database within 2-3 days of posting
   - Date filtering ensures no announcements older than lookback window are missed

### Logging Enhancements (Future)

Consider adding:
- Prometheus metrics for date filter success/failure rates
- Alert when 0 announcements returned for >3 consecutive days
- Track date range coverage (min/max announcement dates scraped)

---

## Configuration Tuning

### Adjust Lookback Window (If Needed)

```bash
# Edit .env.production on production server
vim /opt/connect/.env.production

# Change from:
NTIS_SCRAPING_DAYS_BACK=2

# To (example - 3 days for more safety margin):
NTIS_SCRAPING_DAYS_BACK=3

# Restart scraper
docker-compose -f docker-compose.production.yml restart scraper
```

**Recommendations:**
- `NTIS_SCRAPING_DAYS_BACK=1`: Minimal (scrapes yesterday + today)
- `NTIS_SCRAPING_DAYS_BACK=2`: **Recommended** (good balance, current setting)
- `NTIS_SCRAPING_DAYS_BACK=3`: Conservative (use if scraper runs are unreliable)

**Tradeoffs:**
- Smaller window = Fewer duplicates, faster scraping
- Larger window = More safety margin, more duplicates (but handled by contentHash)

---

## Success Criteria

✅ Deployment is successful if:
1. Scraper container starts and remains healthy
2. NTIS scraping logs show "Date filter applied successfully"
3. New NTIS announcements appear in database (if any posted in last 2 days)
4. No duplicate announcements created (contentHash constraint working)
5. No errors in scraper logs related to date filtering
6. Zero-downtime deployment (app continues serving traffic)

❌ Rollback required if:
1. Scraper container fails to start or crashes repeatedly
2. Date filter application fails (logs show verification errors)
3. Database constraints violated (duplicate contentHash errors)
4. Scraper stops finding any NTIS announcements for >3 days

---

## Additional Notes

### Architecture Context
- This implementation follows the **entrypoint pattern** (industry standard)
- Migrations run inside containers, not externally
- Self-healing: Container failure = automatic rollback by Docker Compose

### Database Deduplication
- `contentHash` unique constraint prevents duplicates
- Overlapping date windows are **intentional** and **safe**
- Example: Day 1 scrapes Oct 24-26, Day 2 scrapes Oct 25-27
  - Oct 25-26 overlap is caught by contentHash
  - Oct 27 new announcements are saved
  - Result: Complete coverage, no duplicates

### Timezone Considerations
- All date calculations use **Asia/Seoul timezone (UTC+9)**
- NTIS posts announcements in Korean business hours
- Date filter aligns with announcement publication times

---

## Contacts & Resources

**Documentation:**
- Main deployment docs: `START-HERE-DEPLOYMENT-DOCS.md`
- Architecture lessons: `DEPLOYMENT-ARCHITECTURE-LESSONS.md`
- Quick reference: `DEPLOYMENT-ARCHITECTURE-QUICK-REFERENCE.md`

**Support:**
- GitHub Issues: https://github.com/paul828919/CONNECT/issues
- NTIS Website: https://www.ntis.go.kr/rndgate/eg/un/ra/mng.do

**Related Commits:**
- Historical NTIS scraping: `7df37b3` (2025-01-01 to 2025-10-24 backfill)
- Scripts directory fix: `3314be9` (Docker containerization)

---

## Appendix: Testing Commands

### Local Testing (Before Deployment)

```bash
# Run test suite
npx tsx scripts/test-ntis-date-filtering.ts

# Expected output:
# ✅ Date range calculation passed
# ✅ Date validation passed
# ✅ jQuery datepicker integration passed
# ✅ NTIS scraping with date filtering passed
# 🚀 Ready for production deployment
```

### Production Testing (After Deployment)

```bash
# Manually trigger NTIS scraping (if needed)
ssh -i ~/.ssh/id_ed25519_connect user@221.164.102.253
docker exec $(docker ps -q -f name=scraper) npx tsx scripts/trigger-ntis-scrape.ts

# Watch real-time logs
docker logs -f $(docker ps -q -f name=scraper)
```

---

**Deployment Prepared By**: Claude Code
**Review Required By**: User (manual GitHub Actions check)
**Deployment Approval**: Pending user confirmation to push to production
