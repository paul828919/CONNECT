#!/bin/bash
# ============================================
# Docker Image Retention Policy Script
# ============================================
# Maintains only the last N tagged versions of each image.
# Designed to be run via cron or after deployments.
#
# Usage: ./cleanup-docker-images.sh [--dry-run]
#
# Options:
#   --dry-run   Preview what would be deleted (no changes)
#
# Configuration:
#   KEEP_VERSIONS: Number of versions to retain (default: 3)
#
# Cron setup (daily at 3 AM):
#   0 3 * * * /opt/connect/scripts/cleanup-docker-images.sh >> /opt/connect/logs/docker-cleanup.log 2>&1
#
# Created: 2025-11-30
# Part of: Storage Optimization Plan Phase 3.2
# ============================================

set -e

# Configuration
KEEP_VERSIONS=${KEEP_VERSIONS:-3}
IMAGES_TO_MANAGE=(
    "connect"
    "connect-scraper"
)
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Parse arguments
DRY_RUN=false
for arg in "$@"; do
    case $arg in
        --dry-run)
            DRY_RUN=true
            ;;
        *)
            echo "Unknown option: $arg"
            echo "Usage: $0 [--dry-run]"
            exit 1
            ;;
    esac
done

# Colors
if [ -t 1 ]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    BLUE='\033[0;34m'
    NC='\033[0m'
else
    RED=''
    GREEN=''
    YELLOW=''
    BLUE=''
    NC=''
fi

echo "============================================"
echo "[$TIMESTAMP] Docker Image Cleanup"
echo "============================================"
echo ""
echo "Mode: $([ "$DRY_RUN" = true ] && echo 'DRY RUN' || echo 'LIVE')"
echo "Keep versions: $KEEP_VERSIONS per image"
echo ""

# Pre-cleanup stats
echo "PRE-CLEANUP STATS"
echo "-----------------"
docker system df
echo ""

TOTAL_REMOVED=0
TOTAL_SIZE_FREED="0B"

for IMAGE in "${IMAGES_TO_MANAGE[@]}"; do
    echo -e "${BLUE}Processing: $IMAGE${NC}"
    echo "-------------------------------------------"

    # Get all tags for this image, sorted by creation date (newest first)
    # Skip 'latest' tag as it's usually just a pointer
    TAGS=$(docker images "$IMAGE" --format "{{.Tag}} {{.CreatedAt}}" 2>/dev/null | \
           grep -v "^latest " | \
           sort -k2,3 -r)

    if [ -z "$TAGS" ]; then
        echo "  No tagged images found"
        echo ""
        continue
    fi

    # Show all versions
    echo "  All versions (newest first):"
    echo "$TAGS" | head -10 | while read line; do
        echo "    $line"
    done

    # Count total tags
    TOTAL_TAGS=$(echo "$TAGS" | wc -l | tr -d ' ')
    echo ""
    echo "  Total versions: $TOTAL_TAGS"
    echo "  Keeping: $KEEP_VERSIONS"

    # Calculate how many to remove
    if [ "$TOTAL_TAGS" -le "$KEEP_VERSIONS" ]; then
        echo -e "  ${GREEN}✓ Nothing to remove${NC}"
        echo ""
        continue
    fi

    TO_REMOVE=$((TOTAL_TAGS - KEEP_VERSIONS))
    echo "  To remove: $TO_REMOVE"
    echo ""

    # Get tags to remove (oldest ones, beyond KEEP_VERSIONS)
    REMOVE_TAGS=$(echo "$TAGS" | tail -n +"$((KEEP_VERSIONS + 1))" | awk '{print $1}')

    for TAG in $REMOVE_TAGS; do
        if [ "$TAG" = "latest" ]; then
            echo -e "  ${YELLOW}Skipping: $IMAGE:latest (protected)${NC}"
            continue
        fi

        IMAGE_SIZE=$(docker images "$IMAGE:$TAG" --format "{{.Size}}" 2>/dev/null)

        if [ "$DRY_RUN" = true ]; then
            echo -e "  ${YELLOW}[DRY RUN] Would remove: $IMAGE:$TAG ($IMAGE_SIZE)${NC}"
        else
            echo -e "  ${RED}Removing: $IMAGE:$TAG ($IMAGE_SIZE)${NC}"
            docker rmi "$IMAGE:$TAG" 2>/dev/null || echo "    (already removed or in use)"
            TOTAL_REMOVED=$((TOTAL_REMOVED + 1))
        fi
    done
    echo ""
done

# Clean up dangling images
echo "-------------------------------------------"
echo -e "${BLUE}Cleaning dangling images...${NC}"
DANGLING_COUNT=$(docker images -f "dangling=true" -q 2>/dev/null | wc -l | tr -d ' ')
echo "  Dangling images found: $DANGLING_COUNT"

if [ "$DANGLING_COUNT" -gt 0 ]; then
    if [ "$DRY_RUN" = true ]; then
        echo -e "  ${YELLOW}[DRY RUN] Would remove $DANGLING_COUNT dangling images${NC}"
    else
        docker image prune -f
        TOTAL_REMOVED=$((TOTAL_REMOVED + DANGLING_COUNT))
    fi
fi
echo ""

# Clean build cache older than 24 hours
echo "-------------------------------------------"
echo -e "${BLUE}Cleaning build cache older than 24 hours...${NC}"
if [ "$DRY_RUN" = true ]; then
    echo -e "  ${YELLOW}[DRY RUN] Would run: docker builder prune -f --filter 'until=24h'${NC}"
else
    docker builder prune -f --filter "until=24h" 2>/dev/null || echo "  (no build cache to clean)"
fi
echo ""

# Post-cleanup stats
echo "============================================"
echo "POST-CLEANUP STATS"
echo "-------------------------------------------"
docker system df
echo ""

if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}DRY RUN COMPLETE - No changes made${NC}"
    echo "Run without --dry-run to execute cleanup"
else
    echo -e "${GREEN}✅ Cleanup complete!${NC}"
    echo "Total images processed: $TOTAL_REMOVED"
fi
echo "============================================"
