# 🚀 Scraper Launch Checklist

## Status: READY TO EXECUTE ✅

All infrastructure is in place. Follow these steps to start collecting real R&D program data.

---

## 📋 PRE-FLIGHT CHECK

### Current State
- ✅ Next.js app running (localhost:3000)
- ✅ PostgreSQL running (localhost:5432)
- ✅ Scraping infrastructure built (4 agencies configured)
- ❌ Redis Queue NOT running (need to start)
- ❌ Scraper service NOT running (never started)
- ⚠️  Database contains ONLY fake seed data (8 test programs)

### What Will Happen
1. Real R&D programs will be scraped from 4 government agencies
2. Fake seed data will be cleared
3. Real matches will be generated for users
4. Dashboard will show actual opportunities (no more 404 errors)

---

## 🎯 EXECUTION STEPS

### Step 1: Start Redis Services (Required)
```bash
cd /Users/paulkim/Downloads/connect

# Start Redis Cache + Queue with Docker
docker compose -f docker-compose.dev.yml up -d

# Verify Redis is running
docker ps | grep redis
# Expected output: 2 containers (redis_cache on 6379, redis_queue on 6380)
```

### Step 2: Start the Scraper Service
```bash
# In a new terminal window
cd /Users/paulkim/Downloads/connect

# Start scraper (will run continuously)
npm run scraper
```

**Expected Console Output:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 Connect Platform - Scraping Service
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Scraping scheduler started
✓ Next scraping: 9:00 AM / 3:00 PM KST
✓ Scraping worker started (max concurrency: 2)
✓ Monitoring Redis queue: localhost:6380

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Scraping service is ready
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Step 3: Monitor Scraping Progress (Optional)
```bash
# In a third terminal window
npx tsx scripts/monitor-scraping.ts
```

This will show real-time statistics:
- Programs collected by agency
- New programs in last 24h
- Latest 5 programs scraped
- Auto-refresh every 10 seconds

**Wait 10-15 minutes** for first scraping cycle to complete.

### Step 4: Verify Real Data Collection
```bash
# Check database via Prisma Studio
npm run db:studio
```

Navigate to:
1. **funding_programs** table - Should show NEW programs (not just the 8 seed ones)
2. **funding_matches** table - Check timestamps (old matches are from seed data)

### Step 5: Clear Fake Seed Data
```bash
# Once you confirm real programs exist (>8 programs)
npx tsx scripts/clear-all-fake-data.ts
```

**Expected Output:**
```
🧹 Starting cleanup of fake seed data...

📊 Current database state:
   - Funding Programs: 45  (8 seed + 37 real scraped)
   - Funding Matches: 156

🗑️  Deleting all funding matches...
   ✅ Deleted 156 matches

🗑️  Deleting fake seed programs...
   ✅ Deleted 8 seed programs

📊 Final database state:
   - Funding Programs: 37 (real scraped data)
   - Funding Matches: 0

✅ Cleanup completed successfully!
💡 New matches will be generated automatically from real scraped programs.
```

### Step 6: Trigger Match Generation
```bash
# Visit dashboard or trigger via API
curl http://localhost:3000/api/matches/generate
```

The matching algorithm will run automatically and create new matches based on REAL programs.

### Step 7: Verify in Dashboard
```bash
# Open browser
http://localhost:3000/dashboard
```

You should now see:
- Real R&D programs from IITP, KEIT, TIPA, KIMST
- Working links (no more 404 errors!)
- Fresh match scores based on actual eligibility criteria

---

## 🔧 TROUBLESHOOTING

### Redis Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:6380
```
**Fix:** Start Redis services
```bash
docker compose -f docker-compose.dev.yml up -d
```

### Playwright Browser Not Installed
```
Error: Executable doesn't exist at /path/to/chromium
```
**Fix:** Install Playwright browsers
```bash
npx playwright install chromium
```

### No Programs Scraped After 15 Minutes
**Possible causes:**
1. Agency websites are down (check manually)
2. Rate limiting triggered (wait 1 hour)
3. Parser errors (check logs)

**Debug:**
```bash
# Check scraper logs
tail -f logs/scraper/*.log

# Test individual parser
npx tsx scripts/test-scraping-parsers.ts
```

### Database Connection Errors
```
Error: Can't reach database server at localhost:5432
```
**Fix:** Ensure PostgreSQL is running (should already be running for Next.js app)

---

## 📊 SUCCESS METRICS

After 30 minutes, you should have:
- ✅ 20-50 real programs from 4 agencies
- ✅ 0 seed programs remaining
- ✅ New matches generated automatically
- ✅ Dashboard showing real opportunities
- ✅ No 404 errors on program detail pages

---

## ⏱️ SCRAPING SCHEDULE

**Normal Mode** (current):
- 9:00 AM KST
- 3:00 PM KST

**Peak Season Mode** (Jan-Mar):
- 9:00 AM, 12:00 PM, 3:00 PM, 6:00 PM KST

To trigger manual scraping immediately (for testing):
```bash
# In the scraper terminal, press Ctrl+C and restart
npm run scraper
```

The first scraping cycle runs immediately on startup, then follows the schedule.

---

## 🔄 NEXT STEPS AFTER SUCCESS

1. **Fix Critical Vulnerabilities** (5 items from analysis)
   - Add robots.txt compliance check
   - Implement database connection pooling protection
   - Fix browser memory leak
   - Add race condition prevention
   - Implement rate limiting for detail pages

2. **Deploy to Production**
   - Use Docker Compose production setup
   - Configure all 4 agencies on production schedule
   - Set up monitoring and alerting

3. **Monitor Performance**
   - Track scraping success rates
   - Monitor program freshness
   - Watch for IP bans or rate limiting

---

## 📝 NOTES

- Scraper runs as a **separate process** - keep it running in background
- Logs are written to `./logs/scraper/`
- Redis Queue persists jobs (survives restarts)
- Matches auto-generate when new programs are added
- First scraping cycle may take 15-30 minutes

**Current Time:** Check if next scheduled scrape is soon (9 AM or 3 PM KST)
If yes, just wait for automatic scraping. If no, restart scraper to trigger immediate run.

---

**Ready to execute? Start with Step 1! 🚀**
