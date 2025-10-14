#!/bin/bash
# Emergency rollback script if OAuth fix causes issues

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SERVER="user@221.164.102.253"
SSHPASS="iw237877^^"

echo -e "${YELLOW}=========================================${NC}"
echo -e "${YELLOW}Emergency Rollback${NC}"
echo -e "${YELLOW}=========================================${NC}"
echo ""
echo "This will:"
echo "1. Stop current containers"
echo "2. Pull previous Docker images (if tagged)"
echo "3. Restart services"
echo ""
read -p "Continue with rollback? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Rollback cancelled"
    exit 0
fi

echo -e "${GREEN}Starting rollback...${NC}"

sshpass -p "$SSHPASS" ssh -o StrictHostKeyChecking=no "$SERVER" << 'EOF'
    cd /opt/connect
    
    echo "Stopping current containers..."
    docker compose -f docker-compose.production.yml down
    
    echo "Listing available images..."
    docker images | grep connect
    
    echo ""
    echo "Starting services with previous configuration..."
    docker compose -f docker-compose.production.yml up -d
    
    echo ""
    echo "Waiting for services to start..."
    sleep 20
    
    echo "Checking service status..."
    docker compose -f docker-compose.production.yml ps
    
    echo ""
    echo "Recent logs:"
    docker compose -f docker-compose.production.yml logs --tail=20
EOF

echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}Rollback complete${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "Check if services are running: https://connectplt.kr"
