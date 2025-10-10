#!/bin/bash

# 🎯 Connect Platform - Quick Start (All-in-One)
# Automated scraper launch with monitoring and cleanup

set -e  # Exit on error

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 Connect Platform - Quick Start"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Start Redis
echo "📦 Starting Redis services..."
docker compose -f docker-compose.dev.yml up -d

sleep 3

# Verify Redis
if docker ps | grep -q "connect_dev_redis"; then
    echo -e "${GREEN}✅ Redis started successfully${NC}"
else
    echo -e "${RED}❌ Redis failed to start${NC}"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 2: Start scraper in background
echo "🤖 Starting scraper service..."
npm run scraper > logs/scraper-$(date +%Y%m%d-%H%M%S).log 2>&1 &
SCRAPER_PID=$!

echo -e "${GREEN}✅ Scraper started (PID: $SCRAPER_PID)${NC}"
echo "   Log: logs/scraper-$(date +%Y%m%d-%H%M%S).log"

# Save PID for later
echo $SCRAPER_PID > .scraper.pid

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 3: Wait for first scraping cycle
echo "⏳ Waiting for first scraping cycle (15 minutes)..."
echo "   You can monitor progress with: npx tsx scripts/monitor-scraping.ts"
echo ""

# Progress bar
for i in {1..15}; do
    echo -n "   [$i/15 min] "
    
    # Quick check: count programs
    PROGRAMS=$(npx tsx -e "
    import { PrismaClient } from '@prisma/client';
    const p = new PrismaClient();
    p.fundingProgram.count().then(c => { console.log(c); process.exit(0); }).catch(() => { console.log('0'); process.exit(0); });
    " 2>/dev/null || echo "0")
    
    echo "$PROGRAMS programs in database"
    
    # If we have more than 8 programs, scraping has started!
    if [ "$PROGRAMS" -gt 8 ]; then
        echo ""
        echo -e "${GREEN}🎉 Real programs detected! Scraper is working!${NC}"
        break
    fi
    
    sleep 60
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 4: Check if we should clean fake data
FINAL_COUNT=$(npx tsx -e "
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
p.fundingProgram.count().then(c => { console.log(c); process.exit(0); }).catch(() => { console.log('0'); process.exit(0); });
" 2>/dev/null || echo "0")

if [ "$FINAL_COUNT" -gt 8 ]; then
    echo "🧹 Real programs found ($FINAL_COUNT total)"
    echo "   Ready to clear fake seed data?"
    echo ""
    read -p "   Clear fake data now? (y/n): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        npx tsx scripts/clear-all-fake-data.ts
        echo ""
        echo -e "${GREEN}✅ Fake data cleared!${NC}"
    else
        echo "   Skipped. Run manually: npx tsx scripts/clear-all-fake-data.ts"
    fi
else
    echo -e "${YELLOW}⚠️  Only $FINAL_COUNT programs found${NC}"
    echo "   Scraper may need more time. Check logs:"
    echo "   tail -f logs/scraper-*.log"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ LAUNCH COMPLETE!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Status Commands:"
echo "   Monitor:     npx tsx scripts/monitor-scraping.ts"
echo "   View DB:     npm run db:studio"
echo "   Check logs:  tail -f logs/scraper-*.log"
echo ""
echo "🛑 Stop Scraper:"
echo "   kill $SCRAPER_PID"
echo "   OR: kill \$(cat .scraper.pid)"
echo ""
echo "💡 The scraper runs continuously (2x daily at 9 AM & 3 PM KST)"
echo ""
