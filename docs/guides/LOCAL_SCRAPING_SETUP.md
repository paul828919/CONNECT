# Local Scraping Setup Guide

**Platform:** MacBook M4 Max (ARM Architecture)
**Estimated Setup Time:** 15-20 minutes
**Purpose:** Run the Connect scraping system locally for testing and development

---

## Prerequisites

Before starting, ensure you have:

- ✅ Node.js 20+ installed (`node --version`)
- ✅ PostgreSQL 15 running (via `psql` or Docker)
- ✅ Redis installed (`brew install redis` if needed)
- ✅ Environment variables configured (`.env.local`)

---

## Step 1: Install Redis (if not already installed)

Redis is required for the Bull queue system that manages scraping jobs.

```bash
# Install Redis via Homebrew
brew install redis

# Verify installation
redis-server --version
# Expected output: Redis server v=7.x.x
```

---

## Step 2: Start Redis on Port 6380

The scraping system uses **port 6380** for the job queue (separate from cache on 6379).

```bash
# Start Redis on port 6380 in background
redis-server --port 6380 --daemonize yes

# Verify Redis is running
redis-cli -p 6380 ping
# Expected output: PONG
```

**Troubleshooting:**
- If port 6380 is already in use: `lsof -ti:6380 | xargs kill -9`
- If Redis fails to start: Check logs at `/usr/local/var/log/redis.log`

---

## Step 3: Configure Environment Variables

Ensure `.env.local` has the required scraping configuration:

```bash
# Redis Queue Configuration
REDIS_QUEUE_HOST=localhost
REDIS_QUEUE_PORT=6380

# Scraping Configuration
SCRAPER_USER_AGENT="Mozilla/5.0 (compatible; ConnectBot/1.0; +https://connect.kr/bot)"
ENABLE_HEALTH_SERVER=true
HEALTH_PORT=3100

# Optional: CAPTCHA solving (for protected sites)
# TWOCAPTCHA_API_KEY=your_api_key_here
```

---

## Step 4: Start the Development Server

Open **Terminal 1** and start the Next.js development server:

```bash
# Terminal 1: Next.js App
npm run dev
```

Expected output:
```
✓ Ready on http://localhost:3000
✓ Compiled /dashboard in 1.2s
```

---

## Step 5: Start the Scraping Service

Open **Terminal 2** and start the scraping worker:

```bash
# Terminal 2: Scraping Service
npm run scraper
```

Expected output:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 Connect Platform - Scraping Service
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚀 Starting scraping scheduler...
✓ Scraping scheduler started successfully
  - Normal mode: 9 AM, 3 PM KST (2x daily)
  - Peak season (Jan-Mar): 9 AM, 12 PM, 3 PM, 6 PM KST (4x daily)
  - Current mode: NORMAL (2x)

✓ Scraping worker started (max concurrency: 2)
✓ Monitoring Redis queue: localhost:6380

✓ Health check server running on port 3100

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Scraping service is ready
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Step 6: Access the Admin Scraping Dashboard

1. **Sign in to Connect** (if not already):
   - Visit: http://localhost:3000/auth/signin
   - Sign in with Kakao or Naver OAuth
   - (Or use test credentials if configured)

2. **Ensure Admin Access**:
   - Check your user role in Prisma Studio: `npm run db:studio`
   - Navigate to `User` table → Find your user → Set `role = ADMIN`

3. **Access Dashboard**:
   - Visit: http://localhost:3000/dashboard/admin/scraping

You should see:
- **Manual Trigger Controls** - 4 agency buttons + "Scrape All" button
- **Queue Status** - Waiting, Active, Completed, Failed job counts
- **Recent Scraping Logs** - Table showing scraping history

---

## Step 7: Trigger a Manual Scrape

Test the scraping system with a manual trigger:

1. Click **"Scrape IITP"** button in the dashboard
2. Watch Terminal 2 for live scraping logs:

```
[2025-10-02T23:00:00.000Z] [IITP] ✓ Starting scrape job 1...
[2025-10-02T23:00:01.000Z] [IITP] ✓ Navigating to https://www.iitp.kr/kr/1/business/business.it...
[2025-10-02T23:00:03.500Z] [IITP] ✓ Found 15 announcements
[2025-10-02T23:00:04.000Z] [IITP] ✓ New program: AI 핵심기술개발 지원사업...
[2025-10-02T23:00:06.200Z] [IITP] ✓ Parsed details: deadline=found, budget=found, targetType=BOTH
[2025-10-02T23:00:07.000Z] [IITP] ✓ Scraping completed: 2 new, 13 updated
```

3. Verify in Dashboard:
   - Queue Status should show "Completed: 1"
   - Scraping Logs table should show new IITP entry with "Success" badge

4. Check Database:
   ```bash
   npm run db:studio
   ```
   - Open `FundingProgram` table
   - Verify new programs have:
     - ✅ `deadline` populated
     - ✅ `budgetAmount` populated
     - ✅ `targetType` set correctly
     - ✅ `description` with 1000+ characters
     - ✅ `minTrl` and `maxTrl` (if found)
     - ✅ `eligibilityCriteria` JSON (if found)

---

## Step 8: Test All 4 Agencies

Click **"Scrape All Agencies"** to test all parsers:

```bash
# Terminal 2 will show parallel scraping:
[IITP] ✓ Starting scrape job 2...
[KEIT] ✓ Starting scrape job 3...
# (Note: Max concurrency is 2, so TIPA/KIMST will queue)
```

Wait for completion (usually 2-3 minutes for all 4 agencies).

**Expected Results:**
- All 4 agencies complete successfully
- Dashboard shows 4 new log entries
- Database has new programs from each agency
- No critical errors in Terminal 2

---

## Step 9: Verify Data Quality

Run the parser test script to validate extraction quality:

```bash
# In Terminal 3:
npx tsx scripts/test-scraping-parsers.ts
```

Expected output:
```
🧪 Testing IITP Parser
============================================================
URL: https://www.iitp.kr/kr/1/business/business.it

✅ Parsing Results:
────────────────────────────────────────────────────────────
Description: ✅ AI 핵심기술개발 지원사업...
Deadline: ✅ 2025-04-15
Budget Amount: ✅ ₩1,000,000,000
Target Type: BOTH
TRL Range: ✅ 4-7
Eligibility Criteria: ✅ {"industries":["AI","ICT"],...}

📊 Data Quality Score:   90/100
✅ EXCELLENT - All critical fields extracted
```

---

## Troubleshooting

### Issue: Redis Connection Refused
**Error:** `Error: connect ECONNREFUSED 127.0.0.1:6380`

**Solution:**
```bash
# Check if Redis is running
redis-cli -p 6380 ping

# If not running, start it
redis-server --port 6380 --daemonize yes
```

---

### Issue: Scraping Worker Not Starting
**Error:** `Module not found: Can't resolve './parsers'`

**Solution:**
```bash
# Ensure all parsers are created
ls lib/scraping/parsers/
# Expected: iitp-parser.ts, keit-parser.ts, tipa-parser.ts, kimst-parser.ts, index.ts

# Regenerate if missing
npm run db:generate
```

---

### Issue: Admin Dashboard Shows "Unauthorized"
**Solution:**
```bash
# Set user role to ADMIN in Prisma Studio
npm run db:studio

# Navigate to User table → Find your user → Set:
role = "ADMIN"
```

---

### Issue: Parsing Fails with "Deadline: None"
**Cause:** Agency website structure changed

**Solution:**
1. Visit the agency website manually
2. Inspect the HTML structure for deadline elements
3. Update selectors in `lib/scraping/parsers/{agency}-parser.ts`
4. Test with: `npx tsx scripts/test-scraping-parsers.ts`

---

## Testing Checklist

Before deploying to production, verify:

- [ ] Redis running on port 6380
- [ ] Scraper service starts without errors
- [ ] All 4 agencies scrape successfully
- [ ] Data quality score ≥ 70/100 for all agencies
- [ ] Deadline extraction working (≥ 80% success rate)
- [ ] Budget extraction working (≥ 70% success rate)
- [ ] Target type detection accurate
- [ ] Admin dashboard accessible and functional
- [ ] Queue stats updating in real-time
- [ ] Scraping logs displayed correctly
- [ ] Email notifications triggered for high-score matches (≥70)

---

## Next Steps

Once local testing is complete:

1. **UI/UX Testing**:
   - Sign up as a regular user
   - Create organization profile
   - Generate matches (`POST /api/matches/generate`)
   - View matches in dashboard
   - Test partner discovery and consortium features

2. **Performance Testing**:
   - Run load tests: `npm run loadtest:smoke`
   - Monitor scraping duration (target: < 60s per agency)
   - Check memory usage during scraping

3. **Production Deployment**:
   - Follow `docs/current/Deployment_Architecture_v3.md`
   - Configure production Redis cluster
   - Set up monitoring and alerting
   - Enable peak season mode (Jan-March)

---

## Useful Commands

```bash
# Check Redis queue length
redis-cli -p 6380 LLEN "bull:scraping-queue:wait"

# Monitor Redis in real-time
redis-cli -p 6380 MONITOR

# View scraping worker health
curl http://localhost:3100/health

# Clear Redis queue (caution: deletes all jobs)
redis-cli -p 6380 FLUSHDB

# Restart scraping service
# Terminal 2: Ctrl+C to stop
npm run scraper
```

---

## Support

If you encounter issues not covered here:
1. Check logs in Terminal 2 (scraper service)
2. Review Prisma Studio for database state
3. Test individual parsers with test script
4. Consult `docs/current/NTIS_Agency_Scraping_Config_v2.md`
