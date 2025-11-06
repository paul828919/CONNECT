#!/bin/bash
# Run 2 NTIS processor workers with staggered startup (memory-optimized)
# Usage: ./scripts/run-workers-limited.sh

set -e

echo "🚀 NTIS Worker Manager (Memory-Optimized - 2 Workers)"
echo "=============================================="
echo ""

# Number of workers to start (reduced from 5 to 2 to prevent memory exhaustion)
WORKERS=2
DELAY=30  # seconds between worker starts (increased from 20 to 30 for safer stagger)

echo "📊 Current status:"
docker exec connect_dev_postgres psql -U connect -d connect -t -c "
SELECT '   ⏳ Pending: ' || COUNT(*) || ' jobs'
FROM scraping_jobs
WHERE \"scrapingStatus\" = 'SCRAPED' AND \"processingStatus\" = 'PENDING'
UNION ALL
SELECT '   🔄 Processing: ' || COUNT(*) || ' jobs'
FROM scraping_jobs
WHERE \"scrapingStatus\" = 'SCRAPED' AND \"processingStatus\" = 'PROCESSING';
" | grep -v "^$"

echo ""
echo "🔧 Starting $WORKERS workers with ${DELAY}s delays..."
echo "   ⚠️  Reduced from 5 to 2 workers to prevent browser memory exhaustion"
echo ""

# Start workers with staggered delays
docker exec connect_dev_scraper bash -c "
for i in 1 2; do
  echo \"▶️  Starting worker-\$i at \$(date +%H:%M:%S)\"
  npx tsx scripts/scrape-ntis-processor.ts --workerId worker-\$i > /tmp/worker-\$i.log 2>&1 &

  if [ \$i -lt 2 ]; then
    echo \"   ⏳ Waiting ${DELAY}s for Hancom login before next worker...\"
    sleep ${DELAY}
  fi
done
echo \"\"
echo \"✅ Both workers started!\"
"

echo ""
echo "📊 Monitor commands (run in separate terminals):"
echo "   Terminal 1: docker exec connect_dev_scraper tail -f /tmp/worker-1.log"
echo "   Terminal 2: docker exec connect_dev_scraper tail -f /tmp/worker-2.log"
echo ""
echo "🔍 Check progress:"
echo "   npx tsx scripts/check-ntis-status.ts"
echo ""
echo "💡 Why only 2 workers?"
echo "   Each worker browser = ~500MB memory"
echo "   Container has 7.7GB total, system uses ~2GB"
echo "   2 workers = 1GB browsers + 3GB headroom = Safe"
echo "   5 workers = 2.5GB browsers + OOM = Crash"
echo ""
