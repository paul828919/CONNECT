#!/bin/bash
# Add more NTIS processor workers with staggered startup
# Usage: ./scripts/add-workers.sh 3  (adds 3 more workers)

set -e

# Get number of workers to add (default 3)
NUM_WORKERS=${1:-3}
DELAY=20  # seconds between worker starts

echo "➕ Adding $NUM_WORKERS More Workers"
echo "===================================="
echo ""

# Find next available worker ID
EXISTING=$(docker exec connect_dev_scraper ps aux | grep "tsx scripts/scrape-ntis-processor" | grep -v grep | wc -l | tr -d ' ')
START_ID=$((EXISTING + 1))
END_ID=$((START_ID + NUM_WORKERS - 1))

echo "📊 Current state:"
echo "   🔄 Existing workers: $EXISTING"
echo "   ➕ New workers to add: $NUM_WORKERS (worker-$START_ID to worker-$END_ID)"
echo ""

# Check pending jobs
docker exec connect_dev_postgres psql -U connect -d connect -t -c "
SELECT '   ⏳ Pending: ' || COUNT(*) || ' jobs'
FROM scraping_jobs
WHERE \"scrapingStatus\" = 'SCRAPED' AND \"processingStatus\" = 'PENDING';
" | grep -v "^$"

echo ""
echo "🔧 Starting workers with ${DELAY}s delays to prevent bot detection..."
echo ""

# Start workers with staggered delays
docker exec connect_dev_scraper bash -c "
START=$START_ID
END=$END_ID
CURRENT=\$START

while [ \$CURRENT -le \$END ]; do
  echo \"▶️  Starting worker-\$CURRENT at \$(date +%H:%M:%S)\"
  npx tsx scripts/scrape-ntis-processor.ts --workerId worker-\$CURRENT > /tmp/worker-\$CURRENT.log 2>&1 &

  if [ \$CURRENT -lt \$END ]; then
    echo \"   ⏳ Waiting ${DELAY}s for Hancom login before next worker...\"
    sleep ${DELAY}
  fi

  CURRENT=\$((CURRENT + 1))
done

echo \"\"
echo \"✅ Added $NUM_WORKERS workers (worker-$START_ID to worker-$END_ID)\"
"

echo ""
echo "📊 Monitor the new workers:"
for i in $(seq $START_ID $END_ID); do
  echo "   docker exec connect_dev_scraper tail -f /tmp/worker-$i.log"
done

echo ""
echo "🔍 Check all workers:"
echo "   ./scripts/check-workers.sh"
echo ""
