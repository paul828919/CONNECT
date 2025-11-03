#!/bin/bash
# Rebuild scraper container with hwp5tools support for testing
# Usage: ./scripts/rebuild-scraper-for-test.sh

set -e

echo "🔧 Rebuilding Scraper Container with pyhwp (hwp5txt)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. Stop current workers (if any)
echo "⏸️  Step 1: Stopping current workers..."
docker exec connect_dev_scraper pkill -f "tsx scripts/scrape-ntis-processor.ts" 2>/dev/null || echo "   (no workers running)"
echo ""

# 2. Rebuild scraper container
echo "🏗️  Step 2: Rebuilding scraper container..."
echo "   (This will take 3-5 minutes - installing Python pip + pyhwp)"
echo ""

docker-compose -f docker-compose.dev.yml build scraper

echo ""
echo "✓ Container rebuilt successfully!"
echo ""

# 3. Restart containers
echo "🔄 Step 3: Restarting containers..."
docker-compose -f docker-compose.dev.yml up -d

# Wait for containers to be healthy
echo ""
echo "⏳ Waiting for containers to be healthy..."
sleep 10

echo ""
echo "✅ Setup complete!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 Next Step: Run the HWP extraction comparison test"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "   docker exec connect_dev_scraper npx tsx scripts/test-hwp-extraction-comparison.ts"
echo ""
echo "Expected runtime: 3-5 minutes for 10 files"
echo "Report location: test-results/hwp-extraction-comparison/"
echo ""
