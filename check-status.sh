#!/bin/bash

# 🔍 Connect Platform - Pre-Launch Status Check
# Verifies all prerequisites before launching scraper

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Connect Platform - Status Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check 1: Docker
echo "1️⃣  Checking Docker..."
if command -v docker &> /dev/null; then
    echo "   ✅ Docker installed: $(docker --version)"
else
    echo "   ❌ Docker not found. Install from: https://docker.com"
    exit 1
fi

# Check 2: Docker running
if docker ps &> /dev/null; then
    echo "   ✅ Docker daemon is running"
else
    echo "   ❌ Docker daemon not running. Start Docker Desktop"
    exit 1
fi

# Check 3: Node.js
echo ""
echo "2️⃣  Checking Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "   ✅ Node.js installed: $NODE_VERSION"
else
    echo "   ❌ Node.js not found. Install from: https://nodejs.org"
    exit 1
fi

# Check 4: npm packages
echo ""
echo "3️⃣  Checking dependencies..."
if [ -d "node_modules" ]; then
    echo "   ✅ node_modules exists"
else
    echo "   ⚠️  node_modules missing. Run: npm install"
    exit 1
fi

# Check 5: Environment file
echo ""
echo "4️⃣  Checking environment..."
if [ -f ".env" ]; then
    echo "   ✅ .env file exists"
    
    # Check Redis URLs
    if grep -q "REDIS_CACHE_URL" .env && grep -q "REDIS_QUEUE_URL" .env; then
        echo "   ✅ Redis URLs configured"
    else
        echo "   ⚠️  Redis URLs missing in .env"
    fi
    
    # Check Database URL
    if grep -q "DATABASE_URL" .env; then
        echo "   ✅ Database URL configured"
    else
        echo "   ⚠️  Database URL missing in .env"
    fi
else
    echo "   ❌ .env file not found"
    exit 1
fi

# Check 6: PostgreSQL
echo ""
echo "5️⃣  Checking database..."
if command -v psql &> /dev/null; then
    if psql "postgresql://connect:password@localhost:5432/connect" -c "SELECT 1" &> /dev/null; then
        echo "   ✅ PostgreSQL is accessible"
    else
        echo "   ⚠️  Cannot connect to PostgreSQL"
        echo "      Check if database is running: lsof -i :5432"
    fi
else
    echo "   ⚠️  psql not found (optional - database may still work)"
fi

# Check 7: Redis status
echo ""
echo "6️⃣  Checking Redis..."
REDIS_RUNNING=$(docker ps --filter "name=connect_dev_redis" --format "{{.Names}}" | wc -l)
if [ "$REDIS_RUNNING" -eq 2 ]; then
    echo "   ✅ Redis containers already running"
    docker ps --filter "name=connect_dev_redis" --format "   - {{.Names}} ({{.Status}})"
else
    echo "   ⚠️  Redis not running - will start during launch"
fi

# Check 8: Scraping files
echo ""
echo "7️⃣  Checking scraper files..."
if [ -f "lib/scraping/index.ts" ]; then
    echo "   ✅ Scraper entry point exists"
else
    echo "   ❌ lib/scraping/index.ts not found"
    exit 1
fi

if [ -f "docker-compose.dev.yml" ]; then
    echo "   ✅ Docker compose file exists"
else
    echo "   ❌ docker-compose.dev.yml not found"
    exit 1
fi

# Check 9: Database current state
echo ""
echo "8️⃣  Checking database state..."
PROGRAM_COUNT=$(npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.fundingProgram.count()
  .then(c => { console.log(c); process.exit(0); })
  .catch(() => { console.log('0'); process.exit(0); });
" 2>/dev/null)

MATCH_COUNT=$(npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.fundingMatch.count()
  .then(c => { console.log(c); process.exit(0); })
  .catch(() => { console.log('0'); process.exit(0); });
" 2>/dev/null)

echo "   Current Programs: $PROGRAM_COUNT"
echo "   Current Matches:  $MATCH_COUNT"

if [ "$PROGRAM_COUNT" -eq 8 ]; then
    echo "   ⚠️  Only fake seed data detected"
elif [ "$PROGRAM_COUNT" -gt 8 ]; then
    echo "   ✅ Real scraped data exists!"
else
    echo "   ℹ️  Database is empty"
fi

# Final verdict
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ ALL CHECKS PASSED - READY TO LAUNCH!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Run: bash launch-scraper.sh"
echo ""
