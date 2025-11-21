#!/bin/bash
# ============================================
# Connect Platform - Production Deployment
# Server: 59.21.170.6
# Strategy: Blue-Green Zero-Downtime
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
REMOTE_DIR="/opt/connect"
SERVER_PASSWORD="${CONNECT_SERVER_PASSWORD:-}"
HEALTH_CHECK_TIMEOUT=60
VERSION=$(date +%Y%m%d-%H%M%S)

# Functions
log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"
}

info() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date +'%H:%M:%S')] ⚠️  ${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%H:%M:%S')] ❌ ${NC} $1"
    exit 1
}

success() {
    echo -e "${CYAN}[$(date +'%H:%M:%S')] ✅ ${NC} $1"
}

# Banner
show_banner() {
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                                                    ║${NC}"
    echo -e "${CYAN}║       🚀 Connect Platform Deployment 🚀           ║${NC}"
    echo -e "${CYAN}║                                                    ║${NC}"
    echo -e "${CYAN}║   Strategy: Blue-Green Zero-Downtime             ║${NC}"
    echo -e "${CYAN}║   Server: 59.21.170.6                        ║${NC}"
    echo -e "${CYAN}║   Version: ${VERSION}                   ║${NC}"
    echo -e "${CYAN}║                                                    ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# Check SSH connectivity
check_ssh() {
    log "🔐 Checking SSH connection to production server..."
    
    if ssh -o ConnectTimeout=5 -o BatchMode=yes "$REMOTE_SERVER" "echo 'SSH OK'" &>/dev/null; then
        success "SSH connection successful"
    else
        warn "SSH key authentication not configured"
        info "Trying with sshpass..."
        
        if ! command -v sshpass &>/dev/null; then
            error "sshpass not installed. Install it or set up SSH keys."
        fi
        
        if [ -z "$SERVER_PASSWORD" ]; then
            error "CONNECT_SERVER_PASSWORD environment variable not set"
        fi
    fi
}

# SSH command wrapper
ssh_exec() {
    if [ -n "$SERVER_PASSWORD" ]; then
        sshpass -p "$SERVER_PASSWORD" ssh "$REMOTE_SERVER" "$@"
    else
        ssh "$REMOTE_SERVER" "$@"
    fi
}

# SCP command wrapper
scp_copy() {
    if [ -n "$SERVER_PASSWORD" ]; then
        sshpass -p "$SERVER_PASSWORD" scp "$@"
    else
        scp "$@"
    fi
}

# Pre-deployment checks
pre_flight_checks() {
    log "🔍 Running pre-flight checks..."
    
    # Check if required files exist locally
    if [ ! -f "prisma/schema.prisma" ]; then
        error "Not in Connect project root directory"
    fi
    
    if [ ! -f "package.json" ]; then
        error "package.json not found"
    fi
    
    if [ ! -f "next.config.js" ]; then
        error "next.config.js not found"
    fi
    
    success "Local files OK"
    
    # Check remote server status
    info "Checking remote server status..."
    
    local disk_usage=$(ssh_exec "df / | tail -1 | awk '{print \$5}' | sed 's/%//'")
    if [ "$disk_usage" -gt 85 ]; then
        warn "Disk usage is ${disk_usage}% (high)"
        read -p "Continue anyway? (yes/no): " confirm
        [ "$confirm" != "yes" ] && error "Deployment cancelled"
    fi
    
    success "Remote server OK (disk: ${disk_usage}%)"
}

# Build locally (faster on M4 Max)
build_local() {
    log "🏗️  Building Docker image locally..."
    
    info "Your M4 Max will build faster than the server"
    
    # Build for production (AMD64 architecture)
    docker buildx build \
        --platform linux/amd64 \
        -f Dockerfile.production \
        -t connect:${VERSION} \
        -t connect:latest \
        --load \
        .
    
    if [ $? -eq 0 ]; then
        success "Docker image built successfully"
    else
        error "Docker build failed"
    fi
}

# Upload to server
upload_to_server() {
    log "📤 Uploading Docker image to server..."
    
    # Save image to tar.gz
    info "Saving image to tarball..."
    docker save connect:${VERSION} | gzip > /tmp/connect-${VERSION}.tar.gz
    
    local size=$(du -h /tmp/connect-${VERSION}.tar.gz | awk '{print $1}')
    info "Image size: ${size}"
    
    # Upload to server
    info "Uploading to server (this may take a few minutes)..."
    scp_copy /tmp/connect-${VERSION}.tar.gz ${REMOTE_SERVER}:/tmp/
    
    # Load on server
    info "Loading image on server..."
    ssh_exec "docker load < /tmp/connect-${VERSION}.tar.gz"
    
    # Cleanup
    rm /tmp/connect-${VERSION}.tar.gz
    ssh_exec "rm /tmp/connect-${VERSION}.tar.gz"
    
    success "Image uploaded and loaded on server"
}

# Database migration
run_migrations() {
    log "💾 Checking database migrations..."
    
    # Upload seed.ts if exists
    if [ -f "prisma/seed.ts" ]; then
        info "Uploading seed.ts..."
        scp_copy prisma/seed.ts ${REMOTE_SERVER}:${REMOTE_DIR}/prisma/
    fi
    
    # Check migration status
    info "Checking migration status..."
    local migration_status=$(ssh_exec "docker exec connect_app1 npx prisma migrate status 2>&1" || echo "")
    
    if echo "$migration_status" | grep -q "No pending migrations"; then
        success "No pending migrations"
        return 0
    fi
    
    if echo "$migration_status" | grep -q "pending migration"; then
        warn "Pending migrations detected!"
        echo "$migration_status" | grep "migration"
        
        read -p "Apply migrations? (yes/no): " confirm
        if [ "$confirm" != "yes" ]; then
            error "Migration cancelled - deployment aborted"
        fi
        
        # Backup database first
        info "Creating database backup..."
        ssh_exec "docker exec connect_postgres pg_dump -U connect -d connect > ${REMOTE_DIR}/backups/postgres/pre_migration_${VERSION}.sql"
        
        # Apply migrations
        info "Applying migrations..."
        ssh_exec "docker exec connect_app1 npx prisma migrate deploy"
        
        if [ $? -eq 0 ]; then
            success "Migrations applied successfully"
        else
            error "Migration failed - check logs"
        fi
    fi
}

# Health check function
health_check() {
    local container=$1
    local max_attempts=${2:-30}
    local attempt=0
    
    info "Checking health of ${container}..."
    
    while [ $attempt -lt $max_attempts ]; do
        local status=$(ssh_exec "docker exec ${container} curl -sf http://localhost:3000/api/health 2>&1" || echo "FAIL")
        
        if echo "$status" | grep -q "healthy"; then
            success "${container} is healthy ✓"
            return 0
        fi
        
        attempt=$((attempt + 1))
        echo -n "."
        sleep 2
    done
    
    echo ""
    error "${container} failed health check after ${max_attempts} attempts"
}

# Blue-Green deployment
blue_green_deploy() {
    log "🔄 Starting Blue-Green deployment..."
    
    # Current state: app1 and app2 both running old version
    info "Current state: Both containers on previous version"
    
    # ============================================
    # STEP 1: Deploy to GREEN (app2)
    # ============================================
    log "📦 STEP 1/5: Deploying to GREEN (app2)..."
    
    ssh_exec "cd ${REMOTE_DIR} && docker-compose -f docker-compose.production.yml stop app2"
    ssh_exec "cd ${REMOTE_DIR} && docker-compose -f docker-compose.production.yml up -d app2"
    
    sleep 10
    health_check "connect_app2" 30
    
    success "GREEN (app2) deployed and healthy"
    
    # ============================================
    # STEP 2: Switch traffic to GREEN
    # ============================================
    log "🔀 STEP 2/5: Switching traffic to GREEN..."
    
    # Verify HAProxy is running
    local haproxy_running=$(ssh_exec "docker ps | grep haproxy" || echo "")
    
    if [ -n "$haproxy_running" ]; then
        info "Updating HAProxy configuration..."
        
        # Make app1 backup, app2 primary
        ssh_exec "docker exec haproxy sed -i 's/server app1 connect_app1:3000 check/server app1 connect_app1:3000 check backup/' /etc/haproxy/haproxy.cfg"
        ssh_exec "docker exec haproxy sed -i 's/server app2 connect_app2:3000 check backup/server app2 connect_app2:3000 check/' /etc/haproxy/haproxy.cfg"
        ssh_exec "docker exec haproxy kill -HUP 1"
        
        success "Traffic switched to GREEN (app2)"
    else
        warn "HAProxy not detected - both containers serving traffic"
    fi
    
    sleep 5
    
    # ============================================
    # STEP 3: Deploy to BLUE (app1)
    # ============================================
    log "📦 STEP 3/5: Deploying to BLUE (app1)..."
    
    ssh_exec "cd ${REMOTE_DIR} && docker-compose -f docker-compose.production.yml stop app1"
    ssh_exec "cd ${REMOTE_DIR} && docker-compose -f docker-compose.production.yml up -d app1"
    
    sleep 10
    health_check "connect_app1" 30
    
    success "BLUE (app1) deployed and healthy"
    
    # ============================================
    # STEP 4: Restore balanced traffic
    # ============================================
    log "⚖️  STEP 4/5: Restoring balanced load..."
    
    if [ -n "$haproxy_running" ]; then
        # Both containers active
        ssh_exec "docker exec haproxy sed -i 's/server app1 connect_app1:3000 check backup/server app1 connect_app1:3000 check/' /etc/haproxy/haproxy.cfg"
        ssh_exec "docker exec haproxy kill -HUP 1"
        
        success "Traffic balanced across both containers"
    fi
    
    # ============================================
    # STEP 5: Final verification
    # ============================================
    log "🔍 STEP 5/5: Final verification..."
    
    # Check both containers
    health_check "connect_app1" 10
    health_check "connect_app2" 10
    
    # Check via public endpoint
    info "Checking public endpoint..."
    local public_health=$(ssh_exec "curl -sf https://59.21.170.6/api/health 2>&1" || echo "FAIL")
    
    if echo "$public_health" | grep -q "healthy"; then
        success "Public endpoint healthy ✓"
    else
        warn "Public endpoint check failed (may be normal)"
    fi
    
    success "Blue-Green deployment completed!"
}

# Post-deployment checks
post_deployment_checks() {
    log "🔎 Running post-deployment checks..."
    
    # Container status
    info "Container status:"
    ssh_exec "docker ps --format 'table {{.Names}}\t{{.Status}}' | grep connect_app"
    
    # Log check
    info "Checking recent logs for errors..."
    local errors=$(ssh_exec "docker logs connect_app1 --since 1m 2>&1 | grep -i error | wc -l")
    
    if [ "$errors" -gt 5 ]; then
        warn "Found ${errors} errors in recent logs"
        info "Check logs: ssh ${REMOTE_SERVER} 'docker logs connect_app1 --tail 50'"
    else
        success "No significant errors in logs"
    fi
    
    # Database check
    info "Checking database..."
    local db_health=$(ssh_exec "docker exec connect_postgres pg_isready -U connect" || echo "FAIL")
    
    if echo "$db_health" | grep -q "accepting connections"; then
        success "Database healthy ✓"
    else
        warn "Database check failed"
    fi
    
    # Redis check
    info "Checking Redis..."
    local redis_health=$(ssh_exec "docker exec connect_redis redis-cli ping" || echo "FAIL")
    
    if [ "$redis_health" = "PONG" ]; then
        success "Redis healthy ✓"
    else
        warn "Redis check failed"
    fi
}

# Deployment summary
show_summary() {
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                    ║${NC}"
    echo -e "${GREEN}║         ✅ DEPLOYMENT SUCCESSFUL! ✅               ║${NC}"
    echo -e "${GREEN}║                                                    ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    info "📊 Deployment Summary:"
    echo "  • Version: ${VERSION}"
    echo "  • Strategy: Blue-Green (zero downtime)"
    echo "  • Duration: ~3 minutes"
    echo "  • Server: 59.21.170.6"
    echo ""
    
    info "🔗 Quick Links:"
    echo "  • Website: https://59.21.170.6"
    echo "  • Health: https://59.21.170.6/api/health"
    echo "  • Grafana: http://59.21.170.6:3100"
    echo ""
    
    info "📝 Next Steps:"
    echo "  1. Monitor Grafana: http://59.21.170.6:3100"
    echo "  2. Check logs: ssh ${REMOTE_SERVER} 'docker logs -f connect_app1'"
    echo "  3. Test features manually"
    echo "  4. Monitor for 10 minutes"
    echo ""
    
    info "🔄 If Problems Occur:"
    echo "  • Quick rollback: ./scripts/rollback-production.sh"
    echo "  • Check logs: docker logs connect_app1 --tail 100"
    echo "  • Check health: curl https://59.21.170.6/api/health"
    echo ""
}

# Main deployment
main() {
    show_banner
    
    log "Starting deployment at $(date)"
    
    # Pre-deployment
    check_ssh
    pre_flight_checks
    
    # Build and upload
    build_local
    upload_to_server
    
    # Database
    run_migrations
    
    # Deploy
    blue_green_deploy
    
    # Verify
    post_deployment_checks
    
    # Summary
    show_summary
    
    success "Deployment completed successfully! 🎉"
}

# Handle errors
trap 'error "Deployment failed at line $LINENO"' ERR

# Run
main "$@"

