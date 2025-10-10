#!/bin/bash

# 🚀 Connect Platform - Scraper Launch Script
# This script automates the scraper startup process

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Connect Platform - Scraper Launch"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 1: Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Must be run from project root"
    echo "   cd /Users/paulkim/Downloads/connect"
    exit 1
fi

# Step 2: Start Redis services
echo "📦 Step 1/3: Starting Redis services..."
docker compose -f docker-compose.dev.yml up -d

# Wait for Redis to be ready
echo "   Waiting for Redis to start..."
sleep 3

# Verify Redis is running
if docker ps | grep -q "connect_dev_redis"; then
    echo "   ✅ Redis services started successfully"
else
    echo "   ❌ Redis failed to start. Check Docker:"
    echo "   docker compose -f docker-compose.dev.yml logs"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Infrastructure Ready!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1️⃣  Start the scraper in a NEW terminal:"
echo "   cd /Users/paulkim/Downloads/connect"
echo "   npm run scraper"
echo ""
echo "2️⃣  Monitor progress in ANOTHER terminal (optional):"
echo "   npx tsx scripts/monitor-scraping.ts"
echo ""
echo "3️⃣  After 10-15 minutes, clear fake data:"
echo "   npx tsx scripts/clear-all-fake-data.ts"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "💡 Tip: Keep the scraper terminal open - it runs continuously"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
