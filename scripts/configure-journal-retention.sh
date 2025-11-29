#!/bin/bash
# ============================================
# Configure Systemd Journal Retention
# ============================================
# This script configures journal log retention to prevent
# unbounded growth of system logs.
#
# Usage: sudo ./configure-journal-retention.sh
# Requires: sudo privileges
#
# Created: 2025-11-30
# Part of: Storage Optimization Plan Phase 2.2
# ============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "============================================"
echo " Journal Retention Configuration Script"
echo "============================================"
echo ""

# Check for root privileges
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Error: This script must be run with sudo${NC}"
    echo "Usage: sudo $0"
    exit 1
fi

JOURNALD_CONF="/etc/systemd/journald.conf"
BACKUP_FILE="${JOURNALD_CONF}.backup-$(date +%Y%m%d-%H%M%S)"

# Step 1: Show current journal disk usage
echo "Step 1: Current journal disk usage"
echo "-----------------------------------"
journalctl --disk-usage
echo ""

# Step 2: Backup current configuration
echo "Step 2: Backing up current configuration..."
if [ -f "$JOURNALD_CONF" ]; then
    cp "$JOURNALD_CONF" "$BACKUP_FILE"
    echo -e "${GREEN}✓ Backup created: $BACKUP_FILE${NC}"
else
    echo -e "${YELLOW}Warning: $JOURNALD_CONF not found, creating new file${NC}"
fi
echo ""

# Step 3: Check if settings already exist
echo "Step 3: Checking for existing retention settings..."
if grep -q "^SystemMaxUse=" "$JOURNALD_CONF" 2>/dev/null; then
    echo -e "${YELLOW}Warning: SystemMaxUse already configured${NC}"
    grep "^SystemMaxUse=" "$JOURNALD_CONF"
    echo ""
    read -p "Overwrite existing settings? (y/N): " confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        echo "Aborted by user."
        exit 0
    fi
    # Remove existing settings
    sed -i '/^SystemMaxUse=/d' "$JOURNALD_CONF"
    sed -i '/^SystemKeepFree=/d' "$JOURNALD_CONF"
    sed -i '/^MaxRetentionSec=/d' "$JOURNALD_CONF"
    sed -i '/^# Storage optimization settings/d' "$JOURNALD_CONF"
fi
echo ""

# Step 4: Add retention settings
echo "Step 4: Adding retention settings..."
cat >> "$JOURNALD_CONF" << 'EOF'

# Storage optimization settings (added 2025-11-30)
# - SystemMaxUse: Maximum disk space for journal files (500MB)
# - SystemKeepFree: Minimum free space to maintain (1GB)
# - MaxRetentionSec: Maximum age of journal entries (7 days)
SystemMaxUse=500M
SystemKeepFree=1G
MaxRetentionSec=7day
EOF

echo -e "${GREEN}✓ Settings added to $JOURNALD_CONF${NC}"
echo ""

# Step 5: Verify configuration
echo "Step 5: Verifying configuration..."
echo "New settings in $JOURNALD_CONF:"
grep -E "^(SystemMaxUse|SystemKeepFree|MaxRetentionSec)=" "$JOURNALD_CONF"
echo ""

# Step 6: Restart journald service
echo "Step 6: Restarting systemd-journald service..."
systemctl restart systemd-journald
echo -e "${GREEN}✓ Service restarted${NC}"
echo ""

# Step 7: Verify new disk usage
echo "Step 7: Verifying journal disk usage after configuration..."
sleep 2  # Brief wait for service to stabilize
journalctl --disk-usage
echo ""

# Summary
echo "============================================"
echo -e "${GREEN}✅ Journal retention configured successfully!${NC}"
echo "============================================"
echo ""
echo "Configuration applied:"
echo "  - Maximum journal size: 500MB"
echo "  - Minimum free space: 1GB"
echo "  - Maximum retention: 7 days"
echo ""
echo "Backup saved to: $BACKUP_FILE"
echo ""
echo "To revert, run:"
echo "  sudo cp $BACKUP_FILE $JOURNALD_CONF"
echo "  sudo systemctl restart systemd-journald"
echo ""
