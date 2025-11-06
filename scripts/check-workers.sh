#!/bin/bash
# Quick status check for NTIS processor workers
# Usage: ./scripts/check-workers.sh

echo "🔍 Worker Status Check"
echo "======================"
echo ""

# Check running workers
echo "📋 Running Workers:"
WORKER_COUNT=$(docker exec connect_dev_scraper ps aux | grep "tsx scripts/scrape-ntis-processor" | grep -v grep | wc -l | tr -d ' ')
if [ "$WORKER_COUNT" -eq 0 ]; then
  echo "   ❌ No workers running"
else
  docker exec connect_dev_scraper ps aux | grep "tsx scripts/scrape-ntis-processor" | grep -v grep | awk '{print "   ✅ Worker PID " $2 " - CPU: " $3 "% - Mem: " $4 "%"}'
fi

echo ""
echo "📊 Database Status:"
docker exec connect_dev_postgres psql -U connect -d connect -t -c "
SELECT
  '   ⏳ Pending: ' || COUNT(*) || ' jobs'
FROM scraping_jobs
WHERE \"scrapingStatus\" = 'SCRAPED' AND \"processingStatus\" = 'PENDING'
UNION ALL
SELECT
  '   🔄 Processing: ' || COUNT(*) || ' jobs'
FROM scraping_jobs
WHERE \"scrapingStatus\" = 'SCRAPED' AND \"processingStatus\" = 'PROCESSING'
UNION ALL
SELECT
  '   ✅ Completed: ' || COUNT(*) || ' jobs'
FROM scraping_jobs
WHERE \"scrapingStatus\" = 'SCRAPED' AND \"processingStatus\" = 'COMPLETED'
UNION ALL
SELECT
  '   ⏭️  Skipped: ' || COUNT(*) || ' jobs'
FROM scraping_jobs
WHERE \"scrapingStatus\" = 'SCRAPED' AND \"processingStatus\" = 'SKIPPED';
" | grep -v "^$"

echo ""
echo "🔄 Active Workers Detail:"
docker exec connect_dev_postgres psql -U connect -d connect -t -c "
SELECT
  '   ' || \"processingWorker\" || ' - Started: ' || TO_CHAR(\"processingStartedAt\", 'HH24:MI:SS')
FROM scraping_jobs
WHERE \"processingStatus\" = 'PROCESSING'
ORDER BY \"processingStartedAt\" DESC;
" | grep -v "^$" || echo "   (none)"

echo ""
