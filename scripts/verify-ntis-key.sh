#!/bin/bash
# Quick NTIS API Key Verification
# Checks if NTIS_API_KEY is properly configured in production

set -euo pipefail

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

REMOTE_SERVER="${CONNECT_REMOTE_SERVER:-connect-prod}"

echo ""
echo -e "${CYAN}🔍 NTIS API Key Verification${NC}"
echo ""

# 1. Check .env file
echo -e "${BLUE}1. Checking production .env file...${NC}"
if ssh "$REMOTE_SERVER" "grep -q '^NTIS_API_KEY=' /opt/connect/.env 2>/dev/null"; then
    echo -e "${GREEN}✅ NTIS_API_KEY found in /opt/connect/.env${NC}"
    # Show first 20 chars only (for security)
    VALUE=$(ssh "$REMOTE_SERVER" "grep '^NTIS_API_KEY=' /opt/connect/.env | cut -c1-30")
    echo -e "   ${BLUE}Value: ${VALUE}...${NC}"
else
    echo -e "${RED}❌ NTIS_API_KEY not found in /opt/connect/.env${NC}"
    exit 1
fi

echo ""

# 2. Check docker-compose configuration
echo -e "${BLUE}2. Checking docker-compose.production.yml...${NC}"
COUNT=$(ssh "$REMOTE_SERVER" "grep -c 'NTIS_API_KEY:' /opt/connect/docker-compose.production.yml")
if [ "$COUNT" -ge 3 ]; then
    echo -e "${GREEN}✅ NTIS_API_KEY configured in docker-compose ($COUNT services)${NC}"
else
    echo -e "${RED}❌ NTIS_API_KEY not properly configured in docker-compose${NC}"
    exit 1
fi

echo ""

# 3. Check containers
echo -e "${BLUE}3. Checking container environments...${NC}"

for container in connect_app1 connect_app2 connect_scraper; do
    if ssh "$REMOTE_SERVER" "docker exec $container printenv NTIS_API_KEY >/dev/null 2>&1"; then
        VALUE=$(ssh "$REMOTE_SERVER" "docker exec $container printenv NTIS_API_KEY | cut -c1-20")
        echo -e "${GREEN}✅ $container: NTIS_API_KEY=${VALUE}...${NC}"
    else
        echo -e "${RED}❌ $container: NTIS_API_KEY not set${NC}"
        exit 1
    fi
done

echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                        ║${NC}"
echo -e "${GREEN}║  ✅ NTIS API KEY PROPERLY CONFIGURED  ║${NC}"
echo -e "${GREEN}║                                        ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}All checks passed! NTIS API is ready to use.${NC}"
echo ""

