#!/bin/bash

# 🎯 Connect Platform - Quick Start (No Docker)
# Uses native Redis installation via Homebrew

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 Connect Platform - Quick Start (No Docker)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Step 1: Check Homebrew
echo "1️⃣  Checking Homebrew..."
if ! command -v brew &> /dev/null; then
    echo -e "${RED}❌ Homebrew not found${NC}"
    echo ""
    echo "Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    
    # Add to PATH for Apple Silicon Macs
    if [[ $(uname -m) == 'arm64' ]]; then
        echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
        eval "$(/opt/homebrew/bin/brew shellenv)"
    fi
else
    echo -e "${GREEN}✅ Homebrew installed${NC}"
fi

echo ""

# Step 2: Check/Install Redis
echo "2️⃣  Checking Redis..."
if ! command -v redis-server &> /dev/null; then
    echo "   Installing Redis via Homebrew..."
    brew install redis
    echo -e "${GREEN}✅ Redis installed${NC}"
else
    echo -e "${GREEN}✅ Redis already installed${NC}"
fi

echo ""

# Step 3: Stop any existing Redis instances
echo "3️⃣  Cleaning up existing Redis instances..."
pkill -f redis-server || true
sleep 2
echo -e "${GREEN}✅ Cleaned up${NC}"

echo ""

# Step 4: Start Redis services
echo "4️⃣  Starting Redis services..."

# Create Redis data directories
mkdir -p /tmp/redis-cache
mkdir -p /tmp/redis-queue

# Start Redis Cache (port 6379)
redis-server --port 6379 --maxmemory 512mb --maxmemory-policy allkeys-lru --daemonize yes --dir /tmp/redis-cache --logfile /tmp/redis-cache.log

# Start Redis Queue (port 6380)
redis-server --port 6380 --appendonly yes --daemonize yes --dir /tmp/redis-queue --logfile /tmp/redis-queue.log

sleep 2

# Verify Redis is running
if redis-cli -p 6379 ping > /dev/null 2>&1 && redis-cli -p 6380 ping > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Redis Cache running on port 6379${NC}"
    echo -e "${GREEN}✅ Redis Queue running on port 6380${NC}"
else
    echo -e "${RED}❌ Redis failed to start${NC}"
    echo "Check logs:"
    echo "  tail -f /tmp/redis-cache.log"
    echo "  tail -f /tmp/redis-queue.log"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 5: Start scraper in background
echo "5️⃣  Starting scraper service..."

# Create logs directory if it doesn't exist
mkdir -p logs

# Start scraper
npm run scraper > logs/scraper-$(date +%Y%m%d-%H%M%S).log 2>&1 &
SCRAPER_PID=$!

echo -e "${GREEN}✅ Scraper started (PID: $SCRAPER_PID)${NC}"
echo "   Log: logs/scraper-$(date +%Y%m%d-%H%M%S).log"

# Save PID
echo $SCRAPER_PID > .scraper.pid

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 6: Wait and monitor
echo "6️⃣  Monitoring scraping progress..."
echo "   Waiting for first programs (this may take 5-15 minutes)..."
echo ""

# Show initial state
INITIAL_COUNT=$(npx tsx -e "
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
p.fundingProgram.count().then(c => { console.log(c); process.exit(0); }).catch(() => { console.log('0'); process.exit(0); });
" 2>/dev/null || echo "0")

echo "   Starting program count: $INITIAL_COUNT"
echo ""

# Monitor for 15 minutes
for i in {1..15}; do
    echo -n "   [$i/15 min] "
    
    PROGRAMS=$(npx tsx -e "
    import { PrismaClient } from '@prisma/client';
    const p = new PrismaClient();
    p.fundingProgram.count().then(c => { console.log(c); process.exit(0); }).catch(() => { console.log('0'); process.exit(0); });
    " 2>/dev/null || echo "0")
    
    echo "$PROGRAMS programs"
    
    # Check if we have new programs
    if [ "$PROGRAMS" -gt "$INITIAL_COUNT" ]; then
        NEW_PROGRAMS=$((PROGRAMS - INITIAL_COUNT))
        echo ""
        echo -e "${GREEN}🎉 Success! $NEW_PROGRAMS new programs scraped!${NC}"
        break
    fi
    
    # Check if scraper is still running
    if ! ps -p $SCRAPER_PID > /dev/null; then
        echo ""
        echo -e "${RED}⚠️  Scraper process stopped. Check logs:${NC}"
        echo "   tail -f logs/scraper-*.log"
        break
    fi
    
    sleep 60
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 7: Offer to clean fake data
FINAL_COUNT=$(npx tsx -e "
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
p.fundingProgram.count().then(c => { console.log(c); process.exit(0); }).catch(() => { console.log('0'); process.exit(0); });
" 2>/dev/null || echo "0")

if [ "$FINAL_COUNT" -gt 8 ]; then
    echo "7️⃣  Ready to clear fake seed data"
    echo "   Current programs: $FINAL_COUNT"
    echo ""
    read -p "   Clear fake seed data now? (y/n): " -n 1 -r
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
    echo "   Scraper may need more time. Check:"
    echo "   • Logs: tail -f logs/scraper-*.log"
    echo "   • Monitor: npx tsx scripts/monitor-scraping.ts"
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
echo "🛑 Stop Everything:"
echo "   Scraper:     kill $SCRAPER_PID"
echo "   Redis:       pkill -f redis-server"
echo ""
echo "💡 Redis is running natively (no Docker needed!)"
echo "   Cache: localhost:6379"
echo "   Queue: localhost:6380"
echo ""
