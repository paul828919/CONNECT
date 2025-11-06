#!/bin/bash
# Simple script to run 5 NTIS processor workers with staggered startup
# Usage: ./scripts/run-workers.sh

set -e

echo "🚀 NTIS Worker Manager"
echo "====================="
echo ""

# Number of workers to start
WORKERS=5
DELAY=20  # seconds between worker starts

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
echo ""

# Start workers with staggered delays
docker exec connect_dev_scraper bash -c "
for i in 1 2 3 4 5; do
  echo \"▶️  Starting worker-\$i at \$(date +%H:%M:%S)\"
  npx tsx scripts/scrape-ntis-processor.ts --workerId worker-\$i > /tmp/worker-\$i.log 2>&1 &

  if [ \$i -lt 5 ]; then
    echo \"   ⏳ Waiting ${DELAY}s for Hancom login before next worker...\"
    sleep ${DELAY}
  fi
done
echo \"\"
echo \"✅ All 5 workers started!\"
"

echo ""
echo "📊 Monitor commands (run in separate terminals):"
echo "   Terminal 1: docker exec connect_dev_scraper tail -f /tmp/worker-1.log"
echo "   Terminal 2: docker exec connect_dev_scraper tail -f /tmp/worker-2.log"
echo "   Terminal 3: docker exec connect_dev_scraper tail -f /tmp/worker-3.log"
echo "   Terminal 4: docker exec connect_dev_scraper tail -f /tmp/worker-4.log"
echo "   Terminal 5: docker exec connect_dev_scraper tail -f /tmp/worker-5.log"
echo ""
echo "🔍 Check progress:"
echo "   ./scripts/check-workers.sh"
echo ""
