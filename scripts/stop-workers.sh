#!/bin/bash
# Stop all NTIS processor workers
# Usage: ./scripts/stop-workers.sh

echo "🛑 Stopping NTIS Workers"
echo "========================"
echo ""

# Check if any workers are running
WORKER_COUNT=$(docker exec connect_dev_scraper ps aux | grep "tsx scripts/scrape-ntis-processor" | grep -v grep | wc -l | tr -d ' ')

if [ "$WORKER_COUNT" -eq 0 ]; then
  echo "✅ No workers running"
  exit 0
fi

echo "📋 Found $WORKER_COUNT worker(s) running"
echo ""

# Kill all workers
docker exec connect_dev_scraper pkill -f "tsx scripts/scrape-ntis-processor.ts"

sleep 2

# Verify they're stopped
REMAINING=$(docker exec connect_dev_scraper ps aux | grep "tsx scripts/scrape-ntis-processor" | grep -v grep | wc -l | tr -d ' ')

if [ "$REMAINING" -eq 0 ]; then
  echo "✅ All workers stopped successfully"
else
  echo "⚠️  Warning: $REMAINING worker(s) still running"
  echo "   Try: docker exec connect_dev_scraper pkill -9 -f 'tsx scripts/scrape-ntis-processor'"
fi

echo ""
echo "🔄 Resetting stuck PROCESSING jobs to PENDING..."
docker exec connect_dev_postgres psql -U connect -d connect -c "
UPDATE scraping_jobs
SET \"processingStatus\" = 'PENDING',
    \"processingWorker\" = NULL,
    \"processingStartedAt\" = NULL,
    \"processingError\" = NULL
WHERE \"processingStatus\" = 'PROCESSING';
" > /dev/null

echo "✅ Cleanup complete!"
echo ""
