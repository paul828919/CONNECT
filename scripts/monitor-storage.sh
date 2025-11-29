#!/bin/bash
# ============================================
# Storage Monitoring Script
# ============================================
# Monitors disk usage and Docker storage, sending alerts
# when thresholds are exceeded.
#
# Usage: ./monitor-storage.sh
#
# Exit codes:
#   0 - OK (below warning threshold)
#   1 - WARNING (above warning, below critical)
#   2 - CRITICAL (above critical threshold)
#
# Cron setup (every 6 hours):
#   0 */6 * * * /opt/connect/scripts/monitor-storage.sh >> /opt/connect/logs/storage-monitor.log 2>&1
#
# Created: 2025-11-30
# Part of: Storage Optimization Plan Phase 3.1
# ============================================

# Configuration
WARNING_THRESHOLD=70   # Percent - trigger warning
CRITICAL_THRESHOLD=80  # Percent - trigger critical alert
LOG_DIR="${LOG_DIR:-/opt/connect/logs}"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Colors for terminal output (disabled if not interactive)
if [ -t 1 ]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    NC='\033[0m'
else
    RED=''
    GREEN=''
    YELLOW=''
    NC=''
fi

# Get disk usage percentage for root filesystem
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | tr -d '%')
DISK_USED=$(df -h / | awk 'NR==2 {print $3}')
DISK_TOTAL=$(df -h / | awk 'NR==2 {print $2}')
DISK_AVAILABLE=$(df -h / | awk 'NR==2 {print $4}')

# Get Docker storage metrics
DOCKER_IMAGES_SIZE="N/A"
DOCKER_CONTAINERS_SIZE="N/A"
DOCKER_VOLUMES_SIZE="N/A"
DOCKER_TOTAL_SIZE="N/A"
IMAGE_COUNT="N/A"

if command -v docker &> /dev/null; then
    # Get Docker system df in JSON-like format
    DOCKER_DF=$(docker system df --format "{{.Type}}\t{{.Size}}\t{{.Reclaimable}}" 2>/dev/null)

    if [ -n "$DOCKER_DF" ]; then
        DOCKER_IMAGES_SIZE=$(echo "$DOCKER_DF" | grep "Images" | awk '{print $2}')
        DOCKER_CONTAINERS_SIZE=$(echo "$DOCKER_DF" | grep "Containers" | awk '{print $2}')
        DOCKER_VOLUMES_SIZE=$(echo "$DOCKER_DF" | grep "Volumes" | awk '{print $2}')

        # Count images
        IMAGE_COUNT=$(docker images -q 2>/dev/null | wc -l | tr -d ' ')
    fi
fi

# Log entry
echo "============================================"
echo "[$TIMESTAMP] Storage Monitor Report"
echo "============================================"
echo ""
echo "DISK USAGE"
echo "  Usage:     ${DISK_USAGE}%"
echo "  Used:      ${DISK_USED} / ${DISK_TOTAL}"
echo "  Available: ${DISK_AVAILABLE}"
echo ""
echo "DOCKER STORAGE"
echo "  Images:     ${DOCKER_IMAGES_SIZE} (${IMAGE_COUNT} images)"
echo "  Containers: ${DOCKER_CONTAINERS_SIZE}"
echo "  Volumes:    ${DOCKER_VOLUMES_SIZE}"
echo ""

# Determine status and exit code
if [ "$DISK_USAGE" -gt "$CRITICAL_THRESHOLD" ]; then
    echo -e "${RED}STATUS: CRITICAL${NC}"
    echo "Disk usage at ${DISK_USAGE}% exceeds critical threshold (${CRITICAL_THRESHOLD}%)"
    echo ""
    echo "RECOMMENDED ACTIONS:"
    echo "  1. Run: docker image prune -a --filter 'until=72h' -f"
    echo "  2. Run: docker builder prune -f"
    echo "  3. Check /var/log for large log files"
    echo "  4. Review legacy projects for archival"

    # Add notification logic here (Slack, email, etc.)
    # Example: curl -X POST -H 'Content-type: application/json' \
    #   --data '{"text":"CRITICAL: Disk usage at ${DISK_USAGE}%"}' \
    #   "$SLACK_WEBHOOK_URL"

    echo "============================================"
    exit 2

elif [ "$DISK_USAGE" -gt "$WARNING_THRESHOLD" ]; then
    echo -e "${YELLOW}STATUS: WARNING${NC}"
    echo "Disk usage at ${DISK_USAGE}% exceeds warning threshold (${WARNING_THRESHOLD}%)"
    echo ""
    echo "RECOMMENDED ACTIONS:"
    echo "  1. Schedule cleanup during next maintenance window"
    echo "  2. Review Docker images: docker images --format '{{.Size}}\t{{.Repository}}:{{.Tag}}' | sort -rh"

    echo "============================================"
    exit 1

else
    echo -e "${GREEN}STATUS: OK${NC}"
    echo "Disk usage at ${DISK_USAGE}% is within normal limits"
    echo "============================================"
    exit 0
fi
