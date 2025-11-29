#!/bin/bash
# ============================================
# Archive Legacy Projects Script
# ============================================
# This script archives old projects to free disk space.
#
# WARNING: This will archive and optionally delete projects.
# Only run this after confirming the projects are no longer needed.
#
# Usage: ./archive-legacy-projects.sh [--dry-run] [--delete]
#
# Options:
#   --dry-run   Preview what will be archived (no changes)
#   --delete    Delete original after successful archive
#
# Created: 2025-11-30
# Part of: Storage Optimization Plan Phase 2.3
# ============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKUP_DIR="/home/user/backups/legacy-projects"
PROJECTS=(
    "/home/user/PUSAN_PROJ:6.8GB"
    "/home/user/aqua_labs:922MB"
)

# Parse arguments
DRY_RUN=false
DELETE_AFTER=false

for arg in "$@"; do
    case $arg in
        --dry-run)
            DRY_RUN=true
            ;;
        --delete)
            DELETE_AFTER=true
            ;;
        *)
            echo "Unknown option: $arg"
            echo "Usage: $0 [--dry-run] [--delete]"
            exit 1
            ;;
    esac
done

echo "============================================"
echo " Legacy Projects Archive Script"
echo "============================================"
echo ""
echo "Mode: $([ "$DRY_RUN" = true ] && echo 'DRY RUN (no changes)' || echo 'LIVE')"
echo "Delete after archive: $([ "$DELETE_AFTER" = true ] && echo 'YES' || echo 'NO')"
echo ""

# Create backup directory
if [ "$DRY_RUN" = false ]; then
    mkdir -p "$BACKUP_DIR"
    echo -e "${GREEN}✓ Backup directory: $BACKUP_DIR${NC}"
fi
echo ""

# Process each project
for project_info in "${PROJECTS[@]}"; do
    PROJECT_PATH=$(echo "$project_info" | cut -d: -f1)
    PROJECT_SIZE=$(echo "$project_info" | cut -d: -f2)
    PROJECT_NAME=$(basename "$PROJECT_PATH")
    ARCHIVE_NAME="${PROJECT_NAME}-archive-$(date +%Y%m%d).tar.gz"

    echo "-------------------------------------------"
    echo -e "${BLUE}Project: $PROJECT_NAME${NC}"
    echo "Path: $PROJECT_PATH"
    echo "Expected Size: $PROJECT_SIZE"
    echo ""

    # Check if project exists
    if [ ! -d "$PROJECT_PATH" ]; then
        echo -e "${YELLOW}⚠ Project not found, skipping${NC}"
        echo ""
        continue
    fi

    # Show last modification time
    echo "Last modified files:"
    find "$PROJECT_PATH" -type f -printf '%T+ %p\n' 2>/dev/null | sort -r | head -5
    echo ""

    # Show actual size
    echo "Actual disk usage:"
    du -sh "$PROJECT_PATH"
    echo ""

    if [ "$DRY_RUN" = true ]; then
        echo -e "${YELLOW}[DRY RUN] Would create: $BACKUP_DIR/$ARCHIVE_NAME${NC}"
        if [ "$DELETE_AFTER" = true ]; then
            echo -e "${YELLOW}[DRY RUN] Would delete: $PROJECT_PATH${NC}"
        fi
    else
        # Create archive
        echo "Creating archive..."
        tar -czvf "$BACKUP_DIR/$ARCHIVE_NAME" -C "$(dirname $PROJECT_PATH)" "$PROJECT_NAME"

        # Verify archive
        echo ""
        echo "Verifying archive..."
        ARCHIVE_SIZE=$(du -sh "$BACKUP_DIR/$ARCHIVE_NAME" | cut -f1)
        if tar -tzf "$BACKUP_DIR/$ARCHIVE_NAME" > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Archive created successfully: $ARCHIVE_NAME ($ARCHIVE_SIZE)${NC}"

            if [ "$DELETE_AFTER" = true ]; then
                echo ""
                echo -e "${RED}Deleting original: $PROJECT_PATH${NC}"
                rm -rf "$PROJECT_PATH"
                echo -e "${GREEN}✓ Original deleted${NC}"
            fi
        else
            echo -e "${RED}✗ Archive verification failed!${NC}"
            exit 1
        fi
    fi
    echo ""
done

# Summary
echo "============================================"
if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}DRY RUN COMPLETE - No changes made${NC}"
    echo ""
    echo "To actually archive, run without --dry-run:"
    echo "  $0"
    echo ""
    echo "To archive AND delete originals:"
    echo "  $0 --delete"
else
    echo -e "${GREEN}✅ Archive complete!${NC}"
    echo ""
    echo "Archives saved to: $BACKUP_DIR"
    ls -lh "$BACKUP_DIR"/*.tar.gz 2>/dev/null || echo "(No archives found)"
fi
echo "============================================"
