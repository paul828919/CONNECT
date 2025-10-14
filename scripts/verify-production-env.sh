#!/bin/bash
# Verify Production Environment Variables
# Checks if all required variables are set on production server

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                                                          ║${NC}"
echo -e "${CYAN}║     🔍 PRODUCTION ENVIRONMENT VERIFICATION 🔍           ║${NC}"
echo -e "${CYAN}║                                                          ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

REMOTE_SERVER="${CONNECT_REMOTE_SERVER:-connect-prod}"

# Required variables
REQUIRED_VARS=(
    "DB_PASSWORD"
    "JWT_SECRET"
    "NEXTAUTH_SECRET"
    "NEXTAUTH_URL"
    "KAKAO_CLIENT_ID"
    "KAKAO_CLIENT_SECRET"
    "NAVER_CLIENT_ID"
    "NAVER_CLIENT_SECRET"
    "ENCRYPTION_KEY"
)

# Optional variables
OPTIONAL_VARS=(
    "TOSS_CLIENT_KEY"
    "TOSS_SECRET_KEY"
    "SENTRY_DSN"
    "GRAFANA_PASSWORD"
)

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}1. Checking .env File Existence${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if ssh "$REMOTE_SERVER" "test -f /opt/connect/.env" 2>/dev/null; then
    echo -e "${GREEN}✅ .env file exists at /opt/connect/.env${NC}"
    
    # Check permissions
    PERMS=$(ssh "$REMOTE_SERVER" "stat -c %a /opt/connect/.env 2>/dev/null || stat -f %A /opt/connect/.env")
    if [ "$PERMS" = "600" ]; then
        echo -e "${GREEN}✅ Permissions are secure (600)${NC}"
    else
        echo -e "${YELLOW}⚠️  Permissions: $PERMS (recommended: 600)${NC}"
        echo -e "${YELLOW}   Fix with: ssh $REMOTE_SERVER 'chmod 600 /opt/connect/.env'${NC}"
    fi
else
    echo -e "${RED}❌ .env file NOT found at /opt/connect/.env${NC}"
    echo -e "${YELLOW}   You need to create it. See: ENV-VERIFICATION-REPORT.md${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}2. Checking Required Environment Variables${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

MISSING_COUNT=0

for var in "${REQUIRED_VARS[@]}"; do
    if ssh "$REMOTE_SERVER" "grep -q '^${var}=' /opt/connect/.env 2>/dev/null"; then
        # Check if value is not empty
        VALUE=$(ssh "$REMOTE_SERVER" "grep '^${var}=' /opt/connect/.env | cut -d'=' -f2- | tr -d '\"' | tr -d \"'\"")
        if [ -n "$VALUE" ]; then
            # Check for development/insecure values
            if echo "$VALUE" | grep -qE '(dev_|test_|change_in_production|localhost|127.0.0.1)'; then
                echo -e "${YELLOW}⚠️  ${var}: SET (but appears to be development value)${NC}"
                ((MISSING_COUNT++))
            else
                echo -e "${GREEN}✅ ${var}: SET${NC}"
            fi
        else
            echo -e "${RED}❌ ${var}: EMPTY${NC}"
            ((MISSING_COUNT++))
        fi
    else
        echo -e "${RED}❌ ${var}: NOT FOUND${NC}"
        ((MISSING_COUNT++))
    fi
done

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}3. Checking Optional Environment Variables${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

for var in "${OPTIONAL_VARS[@]}"; do
    if ssh "$REMOTE_SERVER" "grep -q '^${var}=' /opt/connect/.env 2>/dev/null"; then
        VALUE=$(ssh "$REMOTE_SERVER" "grep '^${var}=' /opt/connect/.env | cut -d'=' -f2- | tr -d '\"' | tr -d \"'\"")
        if [ -n "$VALUE" ]; then
            echo -e "${GREEN}✅ ${var}: SET${NC}"
        else
            echo -e "${BLUE}ℹ️  ${var}: EMPTY (optional)${NC}"
        fi
    else
        echo -e "${BLUE}ℹ️  ${var}: NOT FOUND (optional)${NC}"
    fi
done

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}4. Checking Docker Compose Configuration${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

WARNINGS=$(ssh "$REMOTE_SERVER" "cd /opt/connect && docker-compose -f docker-compose.production.yml config 2>&1 | grep -i 'warning.*not set' || true")

if [ -z "$WARNINGS" ]; then
    echo -e "${GREEN}✅ No warnings from docker-compose${NC}"
else
    echo -e "${YELLOW}⚠️  Docker-compose warnings:${NC}"
    echo "$WARNINGS" | while read -r line; do
        echo -e "${YELLOW}   $line${NC}"
    done
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}5. Checking Critical Values${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check NEXTAUTH_URL
NEXTAUTH_URL=$(ssh "$REMOTE_SERVER" "grep '^NEXTAUTH_URL=' /opt/connect/.env 2>/dev/null | cut -d'=' -f2- | tr -d '\"' | tr -d \"'\"" || echo "")
if [ -n "$NEXTAUTH_URL" ]; then
    if echo "$NEXTAUTH_URL" | grep -q "https://"; then
        echo -e "${GREEN}✅ NEXTAUTH_URL: Using HTTPS${NC}"
        echo -e "${GREEN}   Value: $NEXTAUTH_URL${NC}"
    elif echo "$NEXTAUTH_URL" | grep -q "localhost\|127.0.0.1"; then
        echo -e "${RED}❌ NEXTAUTH_URL: Using localhost (must be production URL)${NC}"
        echo -e "${YELLOW}   Current: $NEXTAUTH_URL${NC}"
        echo -e "${YELLOW}   Should be: https://221.164.102.253 (or your domain)${NC}"
        ((MISSING_COUNT++))
    else
        echo -e "${YELLOW}⚠️  NEXTAUTH_URL: Not using HTTPS${NC}"
        echo -e "${YELLOW}   Current: $NEXTAUTH_URL${NC}"
    fi
else
    echo -e "${RED}❌ NEXTAUTH_URL: Not set${NC}"
    ((MISSING_COUNT++))
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}📊 SUMMARY${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ $MISSING_COUNT -eq 0 ]; then
    echo -e "${GREEN}╔════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                    ║${NC}"
    echo -e "${GREEN}║     ✅ ALL ENVIRONMENT VARIABLES CONFIGURED ✅     ║${NC}"
    echo -e "${GREEN}║                                                    ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${GREEN}Your production environment is properly configured!${NC}"
else
    echo -e "${RED}╔════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║                                                    ║${NC}"
    echo -e "${RED}║     ❌ CONFIGURATION ISSUES DETECTED ❌            ║${NC}"
    echo -e "${RED}║                                                    ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${RED}Issues found: $MISSING_COUNT${NC}"
    echo ""
    echo -e "${YELLOW}Next Steps:${NC}"
    echo -e "  1. Review ENV-VERIFICATION-REPORT.md"
    echo -e "  2. Update /opt/connect/.env on production server"
    echo -e "  3. Run this script again to verify"
    echo -e "  4. Restart containers: ssh $REMOTE_SERVER 'cd /opt/connect && docker-compose -f docker-compose.production.yml up -d'"
    echo ""
    exit 1
fi

echo ""
echo -e "${BLUE}🔗 Additional Checks:${NC}"
echo ""
echo -e "  • View ENV report: cat ENV-VERIFICATION-REPORT.md"
echo -e "  • Check containers: connect-status"
echo -e "  • Test health: connect-health"
echo ""

