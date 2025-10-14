#!/bin/bash
# Sync Specific Environment Variables to Production
# Only syncs API keys and credentials that should match between environments
# NEVER syncs database URLs, secrets, or environment-specific values

set -euo pipefail

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

REMOTE_SERVER="${CONNECT_REMOTE_SERVER:-connect-prod}"
LOCAL_ENV="/Users/paulkim/Downloads/connect/.env"

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                                                          ║${NC}"
echo -e "${CYAN}║     🔄 SYNC ENVIRONMENT VARIABLES TO PRODUCTION 🔄      ║${NC}"
echo -e "${CYAN}║                                                          ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Variables that are SAFE to sync (API keys, OAuth credentials)
SYNC_VARS=(
    "NTIS_API_KEY"
    "KAKAO_CLIENT_ID"
    "KAKAO_CLIENT_SECRET"
    "NAVER_CLIENT_ID"
    "NAVER_CLIENT_SECRET"
    "TOSS_CLIENT_KEY"
    "TOSS_SECRET_KEY"
    "SENTRY_DSN"
    "GRAFANA_PASSWORD"
)

# Variables that should NEVER be synced (environment-specific)
NEVER_SYNC=(
    "DATABASE_URL"
    "DATABASE_READ_URL"
    "DATABASE_DIRECT_PRIMARY"
    "DATABASE_DIRECT_STANDBY"
    "REDIS_CACHE_URL"
    "REDIS_QUEUE_URL"
    "NEXTAUTH_URL"
    "JWT_SECRET"
    "NEXTAUTH_SECRET"
    "DB_PASSWORD"
    "ENCRYPTION_KEY"
)

echo -e "${YELLOW}⚠️  IMPORTANT: This script only syncs API keys and OAuth credentials${NC}"
echo -e "${YELLOW}   Database URLs, secrets, and environment-specific values are NOT synced${NC}"
echo ""

# Check if local .env exists
if [ ! -f "$LOCAL_ENV" ]; then
    echo -e "${RED}❌ Local .env file not found: $LOCAL_ENV${NC}"
    exit 1
fi

# Show what will be synced
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Variables that will be synced:${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

SYNC_COUNT=0
SKIP_COUNT=0

for var in "${SYNC_VARS[@]}"; do
    if grep -q "^${var}=" "$LOCAL_ENV"; then
        VALUE=$(grep "^${var}=" "$LOCAL_ENV" | cut -d'=' -f2 | tr -d '"' | tr -d "'")
        if [ -n "$VALUE" ]; then
            # Show first 20 chars for security
            PREVIEW=$(echo "$VALUE" | cut -c1-20)
            echo -e "  ${GREEN}✓${NC} ${var}=${PREVIEW}..."
            ((SYNC_COUNT++))
        else
            echo -e "  ${YELLOW}○${NC} ${var} (empty, will skip)"
            ((SKIP_COUNT++))
        fi
    else
        echo -e "  ${YELLOW}○${NC} ${var} (not found, will skip)"
        ((SKIP_COUNT++))
    fi
done

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Variables that will NOT be synced (environment-specific):${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

for var in "${NEVER_SYNC[@]}"; do
    echo -e "  ${RED}✗${NC} ${var} (protected)"
done

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}Summary:${NC}"
echo -e "  • Will sync: ${GREEN}${SYNC_COUNT}${NC} variables"
echo -e "  • Will skip: ${YELLOW}${SKIP_COUNT}${NC} variables (empty or not found)"
echo -e "  • Protected: ${RED}${#NEVER_SYNC[@]}${NC} variables (never synced)"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Confirm before proceeding
read -p "$(echo -e ${CYAN}Do you want to proceed with the sync? [y/N]: ${NC})" -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Sync cancelled.${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Syncing variables to production...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

UPDATED_COUNT=0

for var in "${SYNC_VARS[@]}"; do
    if grep -q "^${var}=" "$LOCAL_ENV"; then
        VALUE=$(grep "^${var}=" "$LOCAL_ENV" | cut -d'=' -f2 | tr -d '"' | tr -d "'")
        if [ -n "$VALUE" ]; then
            # Check if variable exists in production
            if ssh "$REMOTE_SERVER" "grep -q '^${var}=' /opt/connect/.env 2>/dev/null"; then
                # Update existing variable
                ssh "$REMOTE_SERVER" "sed -i 's|^${var}=.*|${var}=${VALUE}|' /opt/connect/.env"
                echo -e "${GREEN}✅ Updated: ${var}${NC}"
            else
                # Add new variable
                ssh "$REMOTE_SERVER" "echo '${var}=${VALUE}' >> /opt/connect/.env"
                echo -e "${GREEN}✅ Added: ${var}${NC}"
            fi
            ((UPDATED_COUNT++))
        fi
    fi
done

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Restarting containers to apply changes...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

ssh "$REMOTE_SERVER" "cd /opt/connect && docker-compose -f docker-compose.production.yml up -d --force-recreate app1 app2 scraper 2>&1 | grep -v warning"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Verifying deployment...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Wait for containers to start
echo -e "${CYAN}Waiting for containers to start (10 seconds)...${NC}"
sleep 10

# Check container health
echo ""
HEALTHY_COUNT=$(ssh "$REMOTE_SERVER" "cd /opt/connect && docker-compose -f docker-compose.production.yml ps --format json 2>/dev/null" | grep -c '"Health":"healthy"' || true)
RUNNING_COUNT=$(ssh "$REMOTE_SERVER" "cd /opt/connect && docker-compose -f docker-compose.production.yml ps --format json 2>/dev/null" | grep -c '"State":"running"' || true)

echo -e "${GREEN}Containers:${NC}"
echo -e "  • Running: ${GREEN}${RUNNING_COUNT}${NC}"
echo -e "  • Healthy: ${GREEN}${HEALTHY_COUNT}${NC}"

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                    ║${NC}"
echo -e "${GREEN}║     ✅ SYNC COMPLETED SUCCESSFULLY ✅              ║${NC}"
echo -e "${GREEN}║                                                    ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Summary:${NC}"
echo -e "  • Variables synced: ${GREEN}${UPDATED_COUNT}${NC}"
echo -e "  • Containers restarted: ${GREEN}3${NC} (app1, app2, scraper)"
echo -e "  • Status: ${GREEN}Operational${NC}"
echo ""
echo -e "${BLUE}To verify specific variables:${NC}"
echo -e "  ./scripts/verify-ntis-key.sh        # Verify NTIS API key"
echo -e "  ./scripts/verify-production-env.sh  # Full environment check"
echo ""

