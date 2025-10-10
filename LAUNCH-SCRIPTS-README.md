# 🚀 Scraper Launch Scripts

This directory contains automated scripts to launch the Connect platform scraper.

## Quick Start (Recommended)

The easiest way to launch everything:

```bash
bash quick-start.sh
```

This will:
1. ✅ Start Redis services
2. ✅ Start scraper in background
3. ✅ Wait 15 minutes for first data
4. ✅ Offer to clear fake data
5. ✅ Provide monitoring commands

## Step-by-Step Launch

If you prefer manual control:

### 1. Check Prerequisites
```bash
bash check-status.sh
```

Verifies:
- Docker is installed and running
- Node.js is installed
- Dependencies are installed
- Environment variables are configured
- Database is accessible

### 2. Launch Infrastructure
```bash
bash launch-scraper.sh
```

Starts Redis services, then provides next steps.

### 3. Start Scraper (in new terminal)
```bash
cd /Users/paulkim/Downloads/connect
npm run scraper
```

### 4. Monitor Progress (in another terminal)
```bash
npx tsx scripts/monitor-scraping.ts
```

### 5. Clear Fake Data (after 15 min)
```bash
npx tsx scripts/clear-all-fake-data.ts
```

## What Gets Scraped

- **IITP**: 정보통신기획평가원 (ICT R&D)
- **KEIT**: 한국산업기술평가관리원 (Industrial Tech)
- **TIPA**: 중소기업기술정보진흥원 (SME Support)
- **KIMST**: 해양수산과학기술진흥원 (Maritime/Fisheries)

## Scraping Schedule

- **9:00 AM KST**: Morning scrape
- **3:00 PM KST**: Afternoon scrape
- Runs automatically while scraper service is active

## Expected Results

**First 30 minutes:**
- 20-50 new programs
- Programs from multiple agencies
- Automatic matching to user profiles
- Working source URLs (no more 404s)

**After 24 hours:**
- 100+ programs
- Daily updates from agencies
- Fresh opportunities for users

## Troubleshooting

### Redis won't start
```bash
# Check Docker
docker ps

# Restart Redis
docker compose -f docker-compose.dev.yml down
docker compose -f docker-compose.dev.yml up -d
```

### Scraper crashes
```bash
# Check logs
tail -f logs/scraper-*.log

# Restart scraper
npm run scraper
```

### No programs appearing
```bash
# Check database
npm run db:studio

# Run monitor
npx tsx scripts/monitor-scraping.ts

# Check worker is processing
# Look for "Processing scrape job" in logs
```

### Playwright errors
```bash
# Install Chromium
npx playwright install chromium
```

## Stopping Everything

```bash
# Stop scraper (if started with quick-start.sh)
kill $(cat .scraper.pid)

# Stop Redis
docker compose -f docker-compose.dev.yml down
```

## Logs Location

All logs are saved in `logs/` directory:
- `logs/scraper-YYYYMMDD-HHMMSS.log` - Scraper output
- View in real-time: `tail -f logs/scraper-*.log`

## Database Access

```bash
# Open Prisma Studio
npm run db:studio

# Then navigate to:
# - funding_programs table (see scraped data)
# - funding_matches table (see generated matches)
```

## Scripts Summary

| Script | Purpose | Runtime |
|--------|---------|---------|
| `quick-start.sh` | All-in-one automated launch | 15+ min |
| `check-status.sh` | Verify prerequisites | 30 sec |
| `launch-scraper.sh` | Start Redis only | 10 sec |
| `scripts/monitor-scraping.ts` | Real-time dashboard | Continuous |
| `scripts/clear-all-fake-data.ts` | Remove seed data | 5 sec |

## Next Steps

After successful launch:

1. **Verify in browser**: http://localhost:3000/dashboard
2. **Check matches**: Should see real R&D opportunities
3. **Click links**: All source URLs should work (no 404s)
4. **Let it run**: Scraper runs continuously, collecting daily updates

## Support

If you encounter issues:

1. Check logs: `tail -f logs/scraper-*.log`
2. Verify Redis: `docker ps | grep redis`
3. Check database: `npm run db:studio`
4. Review SCRAPER-LAUNCH-GUIDE.md for detailed info
