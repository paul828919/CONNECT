#!/bin/bash
# ============================================
# Deploy Health Check Fix to Production
# ============================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
REMOTE_SERVER="user@59.21.170.6"
SERVER_PASSWORD="${CONNECT_SERVER_PASSWORD:-}"
PROJECT_DIR="/opt/connect"

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                                                          ║${NC}"
echo -e "${CYAN}║       🚀 DEPLOYING HEALTH CHECK FIX 🚀                  ║${NC}"
echo -e "${CYAN}║                                                          ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check password
if [ -z "$SERVER_PASSWORD" ]; then
    echo -e "${RED}Error: CONNECT_SERVER_PASSWORD not set${NC}"
    echo "Run: export CONNECT_SERVER_PASSWORD='your-password'"
    exit 1
fi

# SSH wrapper
ssh_exec() {
    sshpass -p "$SERVER_PASSWORD" ssh "$REMOTE_SERVER" "$@"
}

# SCP wrapper  
scp_file() {
    sshpass -p "$SERVER_PASSWORD" scp "$@"
}

echo -e "${BLUE}Step 1/5:${NC} Backing up current deployment..."
ssh_exec "cd $PROJECT_DIR && cp -r app/api/health app/api/health.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true"
echo -e "${GREEN}✅ Backup created${NC}"

echo ""
echo -e "${BLUE}Step 2/5:${NC} Uploading updated health endpoint..."
scp_file app/api/health/route.ts "$REMOTE_SERVER:$PROJECT_DIR/app/api/health/route.ts"
echo -e "${GREEN}✅ Health endpoint updated${NC}"

echo ""
echo -e "${BLUE}Step 3/5:${NC} Uploading updated health check script..."
scp_file scripts/check-health.sh "$REMOTE_SERVER:$PROJECT_DIR/scripts/check-health.sh"
ssh_exec "chmod +x $PROJECT_DIR/scripts/check-health.sh"
echo -e "${GREEN}✅ Health check script updated${NC}"

echo ""
echo -e "${BLUE}Step 4/5:${NC} Rebuilding application containers..."

# Check if we need to rebuild or just restart
echo -e "${YELLOW}Checking if rebuild is needed...${NC}"
NEEDS_REBUILD=$(ssh_exec "cd $PROJECT_DIR && git diff HEAD app/api/health/route.ts | wc -l" || echo "1")

if [ "$NEEDS_REBUILD" -gt 0 ]; then
    echo -e "${YELLOW}Changes detected, rebuilding images...${NC}"
    
    # Build new images
    ssh_exec "cd $PROJECT_DIR && docker-compose -f docker-compose.production.yml build app1 app2"
    
    # Restart with zero downtime (one at a time)
    echo -e "${YELLOW}Restarting app1...${NC}"
    ssh_exec "cd $PROJECT_DIR && docker-compose -f docker-compose.production.yml up -d --no-deps app1"
    sleep 10
    
    echo -e "${YELLOW}Restarting app2...${NC}"
    ssh_exec "cd $PROJECT_DIR && docker-compose -f docker-compose.production.yml up -d --no-deps app2"
    sleep 10
    
    echo -e "${GREEN}✅ Containers rebuilt and restarted${NC}"
else
    echo -e "${YELLOW}No rebuild needed, restarting containers...${NC}"
    ssh_exec "cd $PROJECT_DIR && docker-compose -f docker-compose.production.yml restart app1 app2"
    echo -e "${GREEN}✅ Containers restarted${NC}"
fi

echo ""
echo -e "${BLUE}Step 5/5:${NC} Verifying deployment..."

sleep 5

# Test health endpoints
echo -e "${YELLOW}Testing app1 health endpoint...${NC}"
APP1_HEALTH=$(ssh_exec "docker exec connect_app1 curl -sf http://localhost:3001/api/health 2>&1" || echo "FAIL")
if echo "$APP1_HEALTH" | grep -q "\"status\":\"ok\""; then
    echo -e "${GREEN}✅ app1 health check passed${NC}"
else
    echo -e "${RED}❌ app1 health check failed${NC}"
    echo "$APP1_HEALTH"
fi

echo -e "${YELLOW}Testing app2 health endpoint...${NC}"
APP2_HEALTH=$(ssh_exec "docker exec connect_app2 curl -sf http://localhost:3002/api/health 2>&1" || echo "FAIL")
if echo "$APP2_HEALTH" | grep -q "\"status\":\"ok\""; then
    echo -e "${GREEN}✅ app2 health check passed${NC}"
else
    echo -e "${RED}❌ app2 health check failed${NC}"
    echo "$APP2_HEALTH"
fi

echo -e "${YELLOW}Testing public endpoint...${NC}"
PUBLIC_HEALTH=$(ssh_exec "curl -sf https://59.21.170.6/api/health 2>&1" || echo "FAIL")
if echo "$PUBLIC_HEALTH" | grep -q "\"status\":\"ok\""; then
    echo -e "${GREEN}✅ Public endpoint health check passed${NC}"
else
    echo -e "${RED}❌ Public endpoint health check failed${NC}"
    echo "$PUBLIC_HEALTH"
fi

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                                                          ║${NC}"
echo -e "${CYAN}║              ✅ DEPLOYMENT COMPLETE ✅                    ║${NC}"
echo -e "${CYAN}║                                                          ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════╝${NC}"

echo ""
echo -e "${GREEN}Next Steps:${NC}"
echo "  1. Run full health check: ./scripts/check-health.sh"
echo "  2. View detailed diagnostics: ./scripts/diagnose-production.sh"
echo "  3. Monitor logs: ssh $REMOTE_SERVER 'docker logs -f connect_app1'"
echo ""
echo -e "${BLUE}📊 Quick Health Check:${NC}"
echo "  curl -k https://59.21.170.6/api/health | jq"
echo ""

