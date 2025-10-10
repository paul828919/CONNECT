# ✅ SCRAPER READY - EXECUTE NOW

**Status**: All systems verified and ready to launch  
**Time**: 3 commands, ~15 minutes to first results  
**Expected**: 20-50 real R&D programs, no more 404 errors

---

## 🎯 FASTEST METHOD (Recommended)

```bash
cd /Users/paulkim/Downloads/connect

# Make scripts executable
bash make-executable.sh

# Launch everything automatically (waits 15 min, then offers to clean fake data)
bash quick-start.sh
```

**That's it!** The script will:
1. Start Redis ✅
2. Start scraper in background ✅
3. Monitor progress for 15 minutes ✅
4. Ask if you want to clear fake data ✅

---

## 🔧 MANUAL METHOD (Full Control)

If you prefer step-by-step control:

### Terminal 1: Start Infrastructure
```bash
cd /Users/paulkim/Downloads/connect

# Optional: Check prerequisites first
bash make-executable.sh
bash check-status.sh

# Start Redis
docker compose -f docker-compose.dev.yml up -d
```

### Terminal 2: Start Scraper
```bash
cd /Users/paulkim/Downloads/connect
npm run scraper
```

Keep this terminal open. You'll see:
```
🤖 Connect Platform - Scraping Service
✓ Scraping scheduler started
✓ Next scraping: 9:00 AM / 3:00 PM KST
✓ Scraping worker started
✅ Scraping service is ready
```

### Terminal 3: Monitor Progress (Optional)
```bash
cd /Users/paulkim/Downloads/connect
npx tsx scripts/monitor-scraping.ts
```

Updates every 10 seconds with:
- Total programs count
- Programs by agency
- Latest 5 programs
- Time since last program

### After 15 Minutes: Clear Fake Data
```bash
cd /Users/paulkim/Downloads/connect
npx tsx scripts/clear-all-fake-data.ts
```

---

## 📊 VERIFICATION

### Check Database
```bash
npm run db:studio
```

Navigate to `funding_programs` table:
- **Before**: 8 programs (all fake seed data)
- **After**: 20-50+ programs (real scraped data)

### Check Web Interface
Open http://localhost:3000/dashboard

- **Before**: Matches show 404 errors
- **After**: Matches link to real R&D programs

### Check Logs
```bash
# Live scraper logs
tail -f logs/scraper/*.log

# Or if using quick-start.sh
tail -f logs/scraper-$(ls -t logs/scraper-* | head -1)
```

Look for:
```
✓ Processing scrape job for IITP
✓ Found 15 programs from IITP
✓ Saved 15 new programs
✓ Job completed successfully
```

---

## 🎯 WHAT TO EXPECT

### Immediate (0-5 min)
- Redis containers start
- Scraper service starts
- First scraping jobs queued

### Short Term (5-15 min)
- **IITP**: ~15-20 programs (ICT R&D)
- **KEIT**: ~10-15 programs (Industrial tech)
- **TIPA**: ~5-10 programs (SME support)
- **KIMST**: ~3-5 programs (Maritime)

### Medium Term (15-30 min)
- All agencies scraped
- Automatic matching to user profiles
- Dashboard shows real opportunities
- Source URLs work (no 404s)

### Long Term (24 hours)
- 100+ total programs
- Daily updates at 9 AM and 3 PM KST
- Continuous fresh opportunities

---

## 🚨 TROUBLESHOOTING

### "Redis connection refused"
```bash
# Check if Redis is running
docker ps | grep redis

# Should see 2 containers:
# - connect_dev_redis_cache (port 6379)
# - connect_dev_redis_queue (port 6380)

# If not running, start them
docker compose -f docker-compose.dev.yml up -d
```

### "No programs appearing"
```bash
# Check scraper is running
ps aux | grep "tsx lib/scraping"

# Check logs for errors
tail -f logs/scraper/*.log

# Manually trigger a scrape (for testing)
# This bypasses the scheduler
```

### "Playwright browser not found"
```bash
npx playwright install chromium
```

### "Database connection error"
```bash
# Check PostgreSQL is running
lsof -i :5432

# Verify connection in .env
cat .env | grep DATABASE_URL
```

---

## 🛑 STOP EVERYTHING

### If using quick-start.sh
```bash
# Stop scraper
kill $(cat .scraper.pid)

# Stop Redis
docker compose -f docker-compose.dev.yml down
```

### If using manual method
```bash
# In scraper terminal, press Ctrl+C

# Stop Redis
docker compose -f docker-compose.dev.yml down
```

---

## 📁 FILES CREATED

All ready to use:

```
/Users/paulkim/Downloads/connect/
├── make-executable.sh          ← Make scripts runnable
├── check-status.sh            ← Pre-flight check
├── launch-scraper.sh          ← Start Redis only
├── quick-start.sh             ← Full automated launch
├── LAUNCH-SCRIPTS-README.md   ← Detailed guide
├── EXECUTE-NOW.md             ← This file
└── scripts/
    ├── monitor-scraping.ts    ← Real-time dashboard
    └── clear-all-fake-data.ts ← Remove seed data
```

---

## 🎯 RECOMMENDED WORKFLOW

**For first-time launch:**
1. `bash quick-start.sh` - Let it run automatically
2. Wait for completion message
3. Check dashboard at http://localhost:3000

**For daily operation:**
1. Keep scraper running continuously
2. Scrapes automatically at 9 AM and 3 PM KST
3. Check `npx tsx scripts/monitor-scraping.ts` occasionally

**For debugging:**
1. `bash check-status.sh` - Verify system health
2. `tail -f logs/scraper/*.log` - Watch real-time logs
3. `npm run db:studio` - Inspect database

---

## ✅ SUCCESS CRITERIA

You'll know it's working when:

1. ✅ Monitor shows program count increasing
2. ✅ Database has >8 programs
3. ✅ Programs from multiple agencies (IITP, KEIT, etc.)
4. ✅ Dashboard matches have working links
5. ✅ No 404 errors on program pages
6. ✅ Timestamps show recent data

---

## 🚀 EXECUTE NOW

Copy and paste this:

```bash
cd /Users/paulkim/Downloads/connect && bash make-executable.sh && bash quick-start.sh
```

**Or** step-by-step:

```bash
cd /Users/paulkim/Downloads/connect
bash make-executable.sh
bash quick-start.sh
```

---

## 📞 NEXT STEPS AFTER LAUNCH

1. **Monitor for 15 minutes** - Watch program count increase
2. **Clear fake data** - Remove the 8 seed programs
3. **Test dashboard** - Verify matches work
4. **Keep running** - Leave scraper running for daily updates
5. **Check logs** - Review for any errors or issues

---

**Ready? Launch now! 🚀**
