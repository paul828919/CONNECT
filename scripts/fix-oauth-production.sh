#!/bin/bash
# ============================================
# OAuth Fix - Force Rebuild with Fresh Prisma Client
# ============================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"; }
warn() { echo -e "${YELLOW}[$(date +'%H:%M:%S')] ⚠${NC} $1"; }
error() { echo -e "${RED}[$(date +'%H:%M:%S')] ✗${NC} $1"; exit 1; }
info() { echo -e "${BLUE}[$(date +'%H:%M:%S')] ℹ${NC} $1"; }

# Configuration
SERVER="user@221.164.102.253"
SERVER_PATH="/opt/connect"
LOCAL_PATH="/Users/paulkim/Downloads/connect"
COMPOSE_FILE="docker-compose.production.yml"
SSHPASS="iw237877^^"

log "========================================="
log "OAuth Fix - Production Deployment"
log "========================================="

# Step 1: Verify local schema is correct
log "Step 1: Verifying local Prisma schema..."
if grep -q '@@map("accounts")' "$LOCAL_PATH/prisma/schema.prisma" && \
   grep -q '@@map("users")' "$LOCAL_PATH/prisma/schema.prisma" && \
   grep -q '@@map("sessions")' "$LOCAL_PATH/prisma/schema.prisma"; then
    info "✓ Local schema has correct @@map directives"
else
    error "Local schema missing @@map directives!"
fi

# Step 2: Verify auth config uses standard adapter
log "Step 2: Verifying auth configuration..."
if grep -q 'PrismaAdapter(db)' "$LOCAL_PATH/lib/auth.config.ts"; then
    info "✓ Auth config using standard PrismaAdapter"
else
    error "Auth config not using PrismaAdapter correctly!"
fi

# Step 3: Sync files to server
log "Step 3: Syncing files to production server..."
info "Syncing schema.prisma..."
sshpass -p "$SSHPASS" scp -o StrictHostKeyChecking=no \
    "$LOCAL_PATH/prisma/schema.prisma" \
    "$SERVER:$SERVER_PATH/prisma/schema.prisma"

info "Syncing auth.config.ts..."
sshpass -p "$SSHPASS" scp -o StrictHostKeyChecking=no \
    "$LOCAL_PATH/lib/auth.config.ts" \
    "$SERVER:$SERVER_PATH/lib/auth.config.ts"

info "Syncing Dockerfile.production..."
sshpass -p "$SSHPASS" scp -o StrictHostKeyChecking=no \
    "$LOCAL_PATH/Dockerfile.production" \
    "$SERVER:$SERVER_PATH/Dockerfile.production"

log "✓ Files synced to server"

# Step 4: Rebuild on server with NO CACHE
log "Step 4: Rebuilding Docker images (no cache)..."
sshpass -p "$SSHPASS" ssh -o StrictHostKeyChecking=no "$SERVER" << 'EOF'
    cd /opt/connect
    
    echo "Stopping containers..."
    docker compose -f docker-compose.production.yml down
    
    echo "Pruning Docker build cache..."
    docker builder prune -af
    
    echo "Building fresh images..."
    docker compose -f docker-compose.production.yml build \
        --no-cache \
        --pull \
        --parallel \
        app1 app2
    
    echo "✓ Fresh images built"
EOF

# Step 5: Deploy with rolling update
log "Step 5: Deploying containers..."
sshpass -p "$SSHPASS" ssh -o StrictHostKeyChecking=no "$SERVER" << 'EOF'
    cd /opt/connect
    
    echo "Starting app2..."
    docker compose -f docker-compose.production.yml up -d app2
    sleep 15
    
    echo "Regenerating Prisma Client in app2..."
    docker compose -f docker-compose.production.yml exec -T app2 npx prisma generate
    
    echo "Starting app1..."
    docker compose -f docker-compose.production.yml up -d app1
    sleep 15
    
    echo "Regenerating Prisma Client in app1..."
    docker compose -f docker-compose.production.yml exec -T app1 npx prisma generate
    
    echo "Restarting containers to load new Prisma Client..."
    docker compose -f docker-compose.production.yml restart app1 app2
    
    echo "✓ Containers deployed and restarted"
EOF

# Step 6: Wait for services to stabilize
log "Step 6: Waiting for services to stabilize..."
sleep 20

# Step 7: Test OAuth login
log "Step 7: Testing OAuth endpoints..."
sshpass -p "$SSHPASS" ssh -o StrictHostKeyChecking=no "$SERVER" << 'EOF'
    echo "Testing app1 health..."
    docker exec connect_app1 wget -q -O- http://localhost:3001/api/health
    
    echo "Testing app2 health..."
    docker exec connect_app2 wget -q -O- http://localhost:3002/api/health
    
    echo "Checking for errors in logs..."
    docker compose -f /opt/connect/docker-compose.production.yml logs --tail=50 app1 app2 | grep -i "prisma\|account\|adapter" || echo "No obvious errors"
EOF

# Step 8: Verify Prisma Client models
log "Step 8: Verifying Prisma Client has correct models..."
sshpass -p "$SSHPASS" ssh -o StrictHostKeyChecking=no "$SERVER" << 'EOF'
    echo "Checking Prisma Client models in app1..."
    docker exec connect_app1 node -e "
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        console.log('Available models:', Object.keys(prisma).filter(k => !k.startsWith('_')));
        console.log('Has account model:', typeof prisma.account !== 'undefined');
        console.log('Has user model:', typeof prisma.user !== 'undefined');
        console.log('Has session model:', typeof prisma.session !== 'undefined');
    "
EOF

log "========================================="
log "✓ OAuth Fix Deployment Complete!"
log "========================================="
info ""
info "Next steps:"
info "1. Visit https://connectplt.kr"
info "2. Try logging in with Naver OAuth"
info "3. Check logs: ssh user@221.164.102.253 'cd /opt/connect && docker compose -f docker-compose.production.yml logs -f app1 app2'"
info ""
warn "If OAuth still fails, check the logs for the specific error message"
