#!/bin/bash
# macOS-compatible watch alternative for scraping progress monitoring
# Usage: ./scripts/watch-scraping-progress.sh [interval_seconds]

INTERVAL=${1:-10}  # Default 10 seconds

echo "🔍 Starting scraping progress monitor (refreshing every ${INTERVAL}s)"
echo "Press Ctrl+C to stop"
echo ""

while true; do
  clear
  docker exec connect_dev_scraper npx tsx scripts/monitor-scraping-progress.ts
  sleep "$INTERVAL"
done
