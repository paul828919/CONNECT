#!/bin/bash

SERVER="59.21.170.6"
SSH_KEY="${HOME}/.ssh/id_ed25519_connect"
SERVER_USER="user"

echo "🔍 Verifying Deployment..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASSED=0
FAILED=0

# Test function
check() {
    local name="$1"
    local command="$2"
    
    echo -n "Checking: $name... "
    if eval "$command" &>/dev/null; then
        echo -e "${GREEN}✅${NC}"
        ((PASSED++))
    else
        echo -e "${RED}❌${NC}"
        ((FAILED++))
    fi
}

# 1. Health endpoint (try multiple ports)
echo -n "Checking: Health endpoint... "
if curl -sf http://$SERVER:3001/api/health >/dev/null 2>&1; then
    echo -e "${GREEN}✅${NC} (port 3001)"
    ((PASSED++))
elif curl -sf http://$SERVER:3002/api/health >/dev/null 2>&1; then
    echo -e "${GREEN}✅${NC} (port 3002)"
    ((PASSED++))
elif curl -sf http://$SERVER/api/health >/dev/null 2>&1; then
    echo -e "${GREEN}✅${NC} (port 80)"
    ((PASSED++))
else
    echo -e "${RED}❌${NC}"
    ((FAILED++))
fi

# 2. Application containers
check "Application containers" "ssh -i $SSH_KEY $SERVER_USER@$SERVER 'docker ps | grep connect'"

# 3. Database connectivity (using port 3001)
check "Database connection" "curl -sf http://$SERVER:3001/api/health | grep -q database"

# 4. Redis connectivity (using port 3001)
check "Redis connection" "curl -sf http://$SERVER:3001/api/health | grep -q redis"

echo ""
echo "═══════════════════════════════════════"
echo "📊 DEPLOYMENT VERIFICATION SUMMARY"
echo "═══════════════════════════════════════"
echo -e "Checks Passed: ${GREEN}${PASSED}${NC}"
echo -e "Checks Failed: ${RED}${FAILED}${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ Deployment verified successfully!${NC}"
    
    # Get application version if available
    if VERSION=$(curl -s https://$SERVER/api/version 2>/dev/null | jq -r '.version' 2>/dev/null); then
        echo "Application Version: $VERSION"
    fi
    
    echo ""
    exit 0
else
    echo -e "${RED}❌ Some checks failed!${NC}"
    echo "Please investigate the failed checks."
    echo ""
    exit 1
fi

