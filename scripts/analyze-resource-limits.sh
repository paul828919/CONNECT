#!/bin/bash
# Resource Limit Analysis Script
# Analyzes Docker container resource configuration and provides recommendations

echo "🔍 Resource Limit Analysis for connect_dev_scraper"
echo "═══════════════════════════════════════════════════════════"
echo ""

# 1. Container Resource Configuration
echo "📋 Current Resource Configuration:"
echo "─────────────────────────────────────────────────────────"
docker inspect connect_dev_scraper --format='
Memory Limit: {{.HostConfig.Memory}} bytes ({{div .HostConfig.Memory 1073741824}} GB)
Memory Reservation: {{.HostConfig.MemoryReservation}} bytes ({{div .HostConfig.MemoryReservation 1073741824}} GB)
Memory Swap: {{.HostConfig.MemorySwap}} bytes ({{div .HostConfig.MemorySwap 1073741824}} GB)
CPU Quota: {{.HostConfig.NanoCpus}} nanocpus ({{div .HostConfig.NanoCpus 1000000000}} CPUs)
OOM Killed: {{.State.OOMKilled}}
Exit Code: {{.State.ExitCode}}
'
echo ""

# 2. Current Resource Usage
echo "💻 Current Resource Usage:"
echo "─────────────────────────────────────────────────────────"
docker stats connect_dev_scraper --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}\t{{.BlockIO}}"
echo ""

# 3. Docker Desktop Settings (macOS)
echo "🖥️  Docker Desktop Resources (macOS):"
echo "─────────────────────────────────────────────────────────"
echo "To check Docker Desktop resource allocation:"
echo "  Docker Desktop → Settings → Resources"
echo ""
echo "Recommended minimum for scraping workload:"
echo "  CPUs: 4-6 cores"
echo "  Memory: 8-12 GB"
echo "  Swap: 2 GB"
echo "  Disk: 100 GB"
echo ""

# 4. Container Size
echo "📦 Container Disk Usage:"
echo "─────────────────────────────────────────────────────────"
docker ps -s --filter "name=connect_dev_scraper" --format "table {{.Names}}\t{{.Size}}"
echo ""

# 5. Scraping Job Statistics
echo "📊 Scraping Workload Analysis:"
echo "─────────────────────────────────────────────────────────"
docker exec connect_dev_scraper npx tsx -e "
import { db } from './lib/db';

async function analyze() {
  const total = await db.scraping_jobs.count();
  const completed = await db.scraping_jobs.count({ where: { processingStatus: 'COMPLETED' } });
  const pending = await db.scraping_jobs.count({ where: { processingStatus: 'PENDING' } });
  const processing = await db.scraping_jobs.count({ where: { processingStatus: 'PROCESSING' } });
  const skipped = await db.scraping_jobs.count({ where: { processingStatus: 'SKIPPED' } });

  console.log(\`  Total Jobs: \${total}\`);
  console.log(\`  Completed: \${completed} (\${(completed/total*100).toFixed(1)}%)\`);
  console.log(\`  Pending: \${pending} (\${(pending/total*100).toFixed(1)}%)\`);
  console.log(\`  Processing: \${processing} (\${(processing/total*100).toFixed(1)}%)\`);
  console.log(\`  Skipped: \${skipped} (\${(skipped/total*100).toFixed(1)}%)\`);
  console.log();
  console.log(\`  Workload remaining: \${pending + processing} jobs\`);
  console.log(\`  Estimated memory per job: ~50-100 MB\`);
  console.log(\`  Estimated total memory needed: \${Math.ceil((pending + processing) * 75 / 1024)} GB\`);

  await db.\$disconnect();
}

analyze();
" 2>/dev/null
echo ""

# 6. Recommendations
echo "═══════════════════════════════════════════════════════════"
echo "💡 Recommendations:"
echo "─────────────────────────────────────────────────────────"
echo ""
echo "OPTION 1: Increase Container Limits (Recommended)"
echo "  Edit docker-compose.dev.yml:"
echo "    resources:"
echo "      limits:"
echo "        cpus: '4.0'      # Increase from 2 to 4"
echo "        memory: 8G       # Increase from 4G to 8G"
echo "      reservations:"
echo "        memory: 4G       # Increase from 2G to 4G"
echo ""
echo "OPTION 2: Process in Smaller Batches"
echo "  Process one date range at a time instead of parallel"
echo ""
echo "OPTION 3: Reduce Concurrency"
echo "  Edit docker-compose.dev.yml:"
echo "    environment:"
echo "      SCRAPER_CONCURRENCY: 1  # Reduce from 2 to 1"
echo ""
echo "═══════════════════════════════════════════════════════════"
