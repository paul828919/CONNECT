#!/bin/bash

SERVER="221.164.102.253"
SSH_KEY="${HOME}/.ssh/id_ed25519_connect"
SERVER_USER="user"

echo "🔍 Verifying Deployment..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
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

# 1. Health endpoint
check "Health endpoint" "curl -sf https://$SERVER/api/health"

# 2. Application is running
check "Application containers" "ssh -i $SSH_KEY $SERVER_USER@$SERVER 'docker ps | grep connect'"

# 3. Database connectivity
check "Database connection" "curl -sf https://$SERVER/api/health/db"

# 4. Redis connectivity
check "Redis connection" "curl -sf https://$SERVER/api/health/redis"

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

