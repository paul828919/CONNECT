#!/bin/bash
# ============================================
# Connect Platform - Emergency Rollback
# Server: 59.21.170.6
# Rollback Time: < 30 seconds
# ============================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
REMOTE_SERVER="user@59.21.170.6"
REMOTE_DIR="/opt/connect"
SERVER_PASSWORD="${CONNECT_SERVER_PASSWORD:-}"

# Functions
log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"
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

# SSH wrapper
ssh_exec() {
    if [ -n "$SERVER_PASSWORD" ]; then
        sshpass -p "$SERVER_PASSWORD" ssh "$REMOTE_SERVER" "$@"
    else
        ssh "$REMOTE_SERVER" "$@"
    fi
}

# Banner
show_banner() {
    echo ""
    echo -e "${RED}╔════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║                                                    ║${NC}"
    echo -e "${RED}║         🚨 EMERGENCY ROLLBACK 🚨                   ║${NC}"
    echo -e "${RED}║                                                    ║${NC}"
    echo -e "${RED}║   This will revert to the previous version       ║${NC}"
    echo -e "${RED}║   Rollback time: < 30 seconds                    ║${NC}"
    echo -e "${RED}║                                                    ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# List available versions
list_versions() {
    log "📋 Available Docker images on server:"
    ssh_exec "docker images connect --format 'table {{.Repository}}\t{{.Tag}}\t{{.CreatedAt}}' | head -10"
    echo ""
}

# Show current state
show_current_state() {
    log "📊 Current container state:"
    
    local app1_image=$(ssh_exec "docker inspect connect_app1 --format='{{.Config.Image}}'" 2>/dev/null || echo "unknown")
    local app2_image=$(ssh_exec "docker inspect connect_app2 --format='{{.Config.Image}}'" 2>/dev/null || echo "unknown")
    
    echo "  • app1: ${app1_image}"
    echo "  • app2: ${app2_image}"
    echo ""
    
    # Check which version is serving traffic
    local haproxy_config=$(ssh_exec "docker exec haproxy cat /etc/haproxy/haproxy.cfg 2>/dev/null | grep 'server app'" || echo "")
    
    if echo "$haproxy_config" | grep -q "app1.*backup"; then
        warn "Current: app2 (GREEN) is primary, app1 (BLUE) is backup"
    elif echo "$haproxy_config" | grep -q "app2.*backup"; then
        warn "Current: app1 (BLUE) is primary, app2 (GREEN) is backup"
    else
        warn "Current: Both app1 and app2 are active (balanced)"
    fi
    echo ""
}

# Confirm rollback
confirm_rollback() {
    warn "⚠️  THIS WILL ROLLBACK TO PREVIOUS VERSION ⚠️"
    echo ""
    read -p "Type 'ROLLBACK' to confirm: " confirm
    
    if [ "$confirm" != "ROLLBACK" ]; then
        log "Rollback cancelled"
        exit 0
    fi
    
    echo ""
    log "🚀 Starting emergency rollback..."
}

# Method 1: Traffic switch (< 5 seconds)
instant_rollback() {
    log "⚡ METHOD 1: Instant Traffic Switch (< 5 seconds)"
    
    local haproxy_running=$(ssh_exec "docker ps | grep haproxy" || echo "")
    
    if [ -z "$haproxy_running" ]; then
        warn "HAProxy not running - using Method 2 instead"
        return 1
    fi
    
    # Check current primary
    local app1_is_backup=$(ssh_exec "docker exec haproxy cat /etc/haproxy/haproxy.cfg | grep 'server app1.*backup'" || echo "")
    
    if [ -n "$app1_is_backup" ]; then
        log "Switching from app2 (GREEN) to app1 (BLUE)..."
        
        # Make app1 primary, app2 backup
        ssh_exec "docker exec haproxy sed -i 's/server app1 connect_app1:3000 check backup/server app1 connect_app1:3000 check/' /etc/haproxy/haproxy.cfg"
        ssh_exec "docker exec haproxy sed -i 's/server app2 connect_app2:3000 check$/server app2 connect_app2:3000 check backup/' /etc/haproxy/haproxy.cfg"
        ssh_exec "docker exec haproxy kill -HUP 1"
        
        success "Traffic switched to app1 (BLUE) - ROLLBACK COMPLETE ✓"
    else
        log "Switching from app1 (BLUE) to app2 (GREEN)..."
        
        # Make app2 primary, app1 backup
        ssh_exec "docker exec haproxy sed -i 's/server app2 connect_app2:3000 check backup/server app2 connect_app2:3000 check/' /etc/haproxy/haproxy.cfg"
        ssh_exec "docker exec haproxy sed -i 's/server app1 connect_app1:3000 check$/server app1 connect_app1:3000 check backup/' /etc/haproxy/haproxy.cfg"
        ssh_exec "docker exec haproxy kill -HUP 1"
        
        success "Traffic switched to app2 (GREEN) - ROLLBACK COMPLETE ✓"
    fi
    
    return 0
}

# Method 2: Image rollback (< 30 seconds)
image_rollback() {
    log "🔄 METHOD 2: Image Rollback (~30 seconds)"
    
    # Get previous image (second most recent)
    log "Finding previous Docker image..."
    local previous_image=$(ssh_exec "docker images connect --format '{{.ID}}' | sed -n '2p'")
    
    if [ -z "$previous_image" ]; then
        error "No previous image found - cannot rollback"
    fi
    
    local image_info=$(ssh_exec "docker images connect --format 'table {{.Tag}}\t{{.CreatedAt}}' | sed -n '2p'")
    log "Rolling back to image: ${previous_image}"
    info "Details: ${image_info}"
    
    # Tag previous as latest
    ssh_exec "docker tag ${previous_image} connect:latest"
    
    # Restart containers with previous image
    log "Restarting app1..."
    ssh_exec "cd ${REMOTE_DIR} && docker-compose -f docker-compose.production.yml stop app1"
    ssh_exec "cd ${REMOTE_DIR} && docker-compose -f docker-compose.production.yml up -d app1"
    
    sleep 5
    
    log "Restarting app2..."
    ssh_exec "cd ${REMOTE_DIR} && docker-compose -f docker-compose.production.yml stop app2"
    ssh_exec "cd ${REMOTE_DIR} && docker-compose -f docker-compose.production.yml up -d app2"
    
    sleep 5
    
    success "Containers restarted with previous image"
}

# Method 3: Database rollback (if needed)
database_rollback() {
    log "💾 METHOD 3: Database Rollback (if needed)"
    
    read -p "Do you need to rollback the database too? (yes/no): " db_rollback
    
    if [ "$db_rollback" != "yes" ]; then
        log "Skipping database rollback"
        return 0
    fi
    
    # List available backups
    log "📋 Available database backups:"
    ssh_exec "ls -lth ${REMOTE_DIR}/backups/postgres/*.sql | head -5"
    echo ""
    
    read -p "Enter backup filename (or 'cancel'): " backup_file
    
    if [ "$backup_file" = "cancel" ]; then
        warn "Database rollback cancelled"
        return 1
    fi
    
    # Confirm database rollback
    warn "⚠️  This will restore the database to a previous state"
    warn "⚠️  Any data created after backup will be LOST"
    echo ""
    read -p "Type 'RESTORE DATABASE' to confirm: " db_confirm
    
    if [ "$db_confirm" != "RESTORE DATABASE" ]; then
        warn "Database rollback cancelled"
        return 1
    fi
    
    # Restore database
    log "Restoring database from backup..."
    ssh_exec "docker exec -i connect_postgres psql -U connect -d connect < ${REMOTE_DIR}/backups/postgres/${backup_file}"
    
    if [ $? -eq 0 ]; then
        success "Database restored successfully"
    else
        error "Database restore failed"
    fi
}

# Health check
verify_rollback() {
    log "🔍 Verifying rollback..."
    
    sleep 5
    
    # Check app1
    local app1_health=$(ssh_exec "docker exec connect_app1 curl -sf http://localhost:3000/api/health 2>&1" || echo "FAIL")
    if echo "$app1_health" | grep -q "healthy"; then
        success "app1 healthy ✓"
    else
        warn "app1 health check failed"
    fi
    
    # Check app2
    local app2_health=$(ssh_exec "docker exec connect_app2 curl -sf http://localhost:3000/api/health 2>&1" || echo "FAIL")
    if echo "$app2_health" | grep -q "healthy"; then
        success "app2 healthy ✓"
    else
        warn "app2 health check failed"
    fi
    
    # Check public endpoint
    local public_health=$(ssh_exec "curl -sf https://59.21.170.6/api/health 2>&1" || echo "FAIL")
    if echo "$public_health" | grep -q "healthy"; then
        success "Public endpoint healthy ✓"
    else
        warn "Public endpoint check failed"
    fi
    
    # Check error logs
    log "Checking recent logs..."
    local errors=$(ssh_exec "docker logs connect_app1 --since 1m 2>&1 | grep -i error | wc -l")
    
    if [ "$errors" -gt 5 ]; then
        warn "Found ${errors} errors in logs - investigate"
    else
        success "No significant errors in logs"
    fi
}

# Show summary
show_summary() {
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                    ║${NC}"
    echo -e "${GREEN}║         ✅ ROLLBACK COMPLETED! ✅                  ║${NC}"
    echo -e "${GREEN}║                                                    ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    log "📊 Current State:"
    ssh_exec "docker ps --format 'table {{.Names}}\t{{.Status}}' | grep connect_app"
    echo ""
    
    log "🔗 Quick Links:"
    echo "  • Website: https://59.21.170.6"
    echo "  • Health: https://59.21.170.6/api/health"
    echo "  • Logs: ssh ${REMOTE_SERVER} 'docker logs -f connect_app1'"
    echo ""
    
    log "📝 Next Steps:"
    echo "  1. Monitor application for 10 minutes"
    echo "  2. Check Grafana: http://59.21.170.6:3100"
    echo "  3. Test critical features"
    echo "  4. Investigate what went wrong"
    echo "  5. Fix issue before redeploying"
    echo ""
    
    warn "💡 Remember: Find and fix the root cause before next deployment!"
    echo ""
}

# Main rollback
main() {
    local start_time=$(date +%s)
    
    show_banner
    list_versions
    show_current_state
    confirm_rollback
    
    # Try instant rollback first
    if instant_rollback; then
        log "✨ Used Method 1: Instant traffic switch"
    else
        # Fall back to image rollback
        image_rollback
        log "✨ Used Method 2: Image rollback"
    fi
    
    # Optional database rollback
    database_rollback || true
    
    # Verify
    verify_rollback
    
    # Show summary
    show_summary
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    success "Rollback completed in ${duration} seconds! 🎉"
}

# Handle errors
trap 'error "Rollback failed at line $LINENO"' ERR

# Run
main "$@"

