#!/bin/bash
# ============================================
# Connect Platform - Emergency Rollback
# ============================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

COMPOSE_FILE="docker-compose.production.yml"

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
    exit 1
}

# Get current running image
get_current_image() {
    local service=$1
    docker inspect "connect_${service}" --format='{{.Config.Image}}' 2>/dev/null || echo "none"
}

# List available images
list_images() {
    log "Available Docker images:"
    docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.CreatedAt}}\t{{.Size}}" | grep connect || echo "No Connect images found"
}

# Confirm rollback
confirm_rollback() {
    warn "This will rollback the application to a previous version."
    warn "Current images:"
    echo "  app1: $(get_current_image app1)"
    echo "  app2: $(get_current_image app2)"
    echo ""

    read -p "Do you want to proceed with rollback? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        log "Rollback cancelled"
        exit 0
    fi
}

# Stop current containers
stop_services() {
    log "Stopping current application services..."
    docker compose -f "$COMPOSE_FILE" stop app1 app2 scraper
}

# Rollback to previous image
rollback_to_previous() {
    log "Rolling back to previous Docker image..."

    # Get previous image (second most recent)
    PREVIOUS_IMAGE=$(docker images connect-platform --format "{{.ID}}" | sed -n '2p')

    if [ -z "$PREVIOUS_IMAGE" ]; then
        error "No previous image found. Cannot rollback."
    fi

    log "Rolling back to image: $PREVIOUS_IMAGE"

    # Tag previous image as latest
    docker tag "$PREVIOUS_IMAGE" connect-platform:latest

    # Restart services with previous image
    docker compose -f "$COMPOSE_FILE" up -d app1 app2 scraper
}

# Wait for services to be healthy
wait_for_health() {
    local max_attempts=30
    local attempt=0

    log "Waiting for services to become healthy..."

    while [ $attempt -lt $max_attempts ]; do
        if docker exec connect_app1 wget --quiet --tries=1 --spider http://localhost:3001/api/health 2>/dev/null && \
           docker exec connect_app2 wget --quiet --tries=1 --spider http://localhost:3002/api/health 2>/dev/null; then
            log "✓ Services are healthy after rollback"
            return 0
        fi

        attempt=$((attempt + 1))
        echo -n "."
        sleep 5
    done

    error "Services did not become healthy after rollback"
}

# Main rollback process
main() {
    log "========================================="
    log "Connect Platform Emergency Rollback"
    log "========================================="

    list_images
    echo ""
    confirm_rollback

    stop_services
    rollback_to_previous
    wait_for_health

    log "========================================="
    log "✓ Rollback Completed Successfully!"
    log "========================================="

    log "Current service status:"
    docker compose -f "$COMPOSE_FILE" ps
}

main "$@"