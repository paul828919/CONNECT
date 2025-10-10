#!/bin/bash
# ============================================
# Connect Platform - Zero-Downtime Deployment
# ============================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.production.yml"
MAX_HEALTH_CHECKS=30
HEALTH_CHECK_INTERVAL=5

# Functions
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

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

# Check if script is run as root (if needed)
check_permissions() {
    if [ "$(id -u)" -eq 0 ]; then
        warn "Running as root. Consider using a non-root user with Docker permissions."
    fi
}

# Check if required files exist
check_files() {
    log "Checking required files..."

    if [ ! -f "$COMPOSE_FILE" ]; then
        error "Docker Compose file not found: $COMPOSE_FILE"
    fi

    if [ ! -f ".env.production" ]; then
        error "Environment file not found: .env.production"
    fi

    if [ ! -f "Dockerfile.production" ]; then
        error "Production Dockerfile not found"
    fi
}

# Check Docker and Docker Compose
check_docker() {
    log "Checking Docker installation..."

    if ! command -v docker &> /dev/null; then
        error "Docker is not installed"
    fi

    if ! docker ps &> /dev/null; then
        error "Cannot connect to Docker daemon. Is Docker running?"
    fi

    info "Docker version: $(docker --version)"
    info "Docker Compose version: $(docker compose version)"
}

# Check system resources
check_resources() {
    log "Checking system resources..."

    # Check available disk space
    DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    if [ "$DISK_USAGE" -gt 85 ]; then
        warn "Disk usage is at ${DISK_USAGE}%. Consider freeing up space."
    fi

    info "Disk usage: ${DISK_USAGE}%"
    info "Available memory: $(free -h | awk 'NR==2{print $7}')"
}

# Build Docker images
build_images() {
    log "Building Docker images..."

    docker compose -f "$COMPOSE_FILE" build \
        --parallel \
        --no-cache \
        app1 app2 scraper

    if [ $? -ne 0 ]; then
        error "Docker image build failed"
    fi
}

# Pre-migration database backup
backup_database() {
    log "Creating pre-migration database backup..."

    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_dir="/opt/connect/backups/pre-migration"
    local backup_file="${backup_dir}/connect_${timestamp}.sql"

    # Create backup directory if it doesn't exist
    mkdir -p "$backup_dir"

    # Create PostgreSQL backup
    docker compose -f "$COMPOSE_FILE" exec -T db \
        pg_dump -U connect -d connect -F c -f "/tmp/backup_${timestamp}.dump"

    # Copy backup from container to host
    docker cp "connect_db:/tmp/backup_${timestamp}.dump" "$backup_file.dump"

    if [ $? -eq 0 ]; then
        log "✓ Database backup created: $backup_file.dump"
        echo "$backup_file.dump" > /tmp/last_migration_backup
    else
        error "Database backup failed. Aborting deployment for safety."
    fi

    # Keep only last 5 pre-migration backups
    ls -t "${backup_dir}"/connect_*.dump 2>/dev/null | tail -n +6 | xargs -r rm
}

# Check pending migrations
check_migrations() {
    log "Checking for pending migrations..."

    # Get migration status
    local migration_status=$(docker compose -f "$COMPOSE_FILE" run --rm app1 \
        npx prisma migrate status 2>&1)

    if echo "$migration_status" | grep -q "No pending migrations"; then
        info "✓ No pending migrations to apply"
        return 0
    fi

    if echo "$migration_status" | grep -q "pending migration"; then
        warn "Pending migrations detected:"
        echo "$migration_status" | grep "migration"

        # Ask for confirmation (optional - remove in CI/CD)
        # read -p "Continue with migration? (yes/no): " confirm
        # if [ "$confirm" != "yes" ]; then
        #     error "Migration cancelled by user"
        # fi

        return 1
    else
        warn "Could not determine migration status"
        info "$migration_status"
        return 1
    fi
}

# Test database connectivity before migration
test_database_connection() {
    log "Testing database connection..."

    local db_check=$(docker compose -f "$COMPOSE_FILE" exec -T db \
        pg_isready -U connect -d connect 2>&1)

    if echo "$db_check" | grep -q "accepting connections"; then
        log "✓ Database is accepting connections"
        return 0
    else
        error "Database is not accessible: $db_check"
        return 1
    fi
}

# Run database migrations with safety checks
run_migrations() {
    log "========================================="
    log "Database Migration Process"
    log "========================================="

    # Step 1: Test database connectivity
    test_database_connection

    # Step 2: Check for pending migrations
    check_migrations
    local has_migrations=$?

    if [ $has_migrations -eq 0 ]; then
        info "Skipping migration - no changes to apply"
        return 0
    fi

    # Step 3: Create pre-migration backup
    backup_database

    # Step 4: Verify backup exists
    if [ ! -f /tmp/last_migration_backup ]; then
        error "Cannot proceed without backup confirmation"
    fi

    # Step 5: Run migrations
    log "Applying database migrations..."
    local migration_log="/tmp/migration_${timestamp}.log"

    docker compose -f "$COMPOSE_FILE" run --rm app1 \
        npx prisma migrate deploy 2>&1 | tee "$migration_log"

    local migration_exit_code=${PIPESTATUS[0]}

    if [ $migration_exit_code -ne 0 ]; then
        error "======================================"
        error "DATABASE MIGRATION FAILED"
        error "======================================"
        error ""
        error "Backup location: $(cat /tmp/last_migration_backup)"
        error "Migration log: $migration_log"
        error ""
        error "To rollback, run:"
        error "  ./scripts/rollback-migration.sh"
        error ""
        exit 1
    fi

    # Step 6: Verify migration success
    log "Verifying migration completed successfully..."
    local verify_status=$(docker compose -f "$COMPOSE_FILE" run --rm app1 \
        npx prisma migrate status 2>&1)

    if echo "$verify_status" | grep -q "No pending migrations"; then
        log "✓ Database migrations applied successfully"
    else
        warn "Migration status unclear - manual verification recommended"
        info "$verify_status"
    fi

    # Step 7: Generate Prisma Client (ensures schema matches database)
    log "Regenerating Prisma Client..."
    docker compose -f "$COMPOSE_FILE" run --rm app1 \
        npx prisma generate

    if [ $? -ne 0 ]; then
        error "Prisma client generation failed"
    fi

    log "========================================="
    log "✓ Migration Process Completed"
    log "========================================="
}

# Health check function
health_check() {
    local service=$1
    local port=$2
    local max_attempts=$3
    local attempt=0

    info "Performing health check for $service..."

    while [ $attempt -lt $max_attempts ]; do
        if docker exec "connect_$service" wget --quiet --tries=1 --spider "http://localhost:$port/api/health" 2>/dev/null; then
            log "✓ $service is healthy"
            return 0
        fi

        attempt=$((attempt + 1))
        info "Health check attempt $attempt/$max_attempts for $service..."
        sleep $HEALTH_CHECK_INTERVAL
    done

    error "$service health check failed after $max_attempts attempts"
    return 1
}

# Rolling update for application instances
rolling_update() {
    log "Performing rolling update..."

    # Update app2 first (maintaining 50% capacity)
    info "Updating app2..."
    docker compose -f "$COMPOSE_FILE" up -d --no-deps --force-recreate app2

    sleep 10
    health_check "app2" "3002" "$MAX_HEALTH_CHECKS"

    # Update app1 (restoring full capacity)
    info "Updating app1..."
    docker compose -f "$COMPOSE_FILE" up -d --no-deps --force-recreate app1

    sleep 10
    health_check "app1" "3001" "$MAX_HEALTH_CHECKS"

    # Reload Nginx to recognize healthy backends
    info "Reloading Nginx..."
    docker compose -f "$COMPOSE_FILE" exec nginx nginx -s reload
}

# Update scraper
update_scraper() {
    log "Updating scraper service..."
    docker compose -f "$COMPOSE_FILE" up -d --no-deps --force-recreate scraper
}

# Final health check
final_health_check() {
    log "Performing final health checks..."

    # Check all services
    health_check "app1" "3001" 10
    health_check "app2" "3002" 10

    # Check via Nginx
    info "Checking via Nginx..."
    if docker exec connect_nginx wget --quiet --tries=1 --spider "http://localhost/health" 2>/dev/null; then
        log "✓ Nginx health check passed"
    else
        warn "Nginx health check failed (this is non-fatal)"
    fi
}

# Cleanup old images
cleanup() {
    log "Cleaning up old Docker images..."
    docker image prune -f

    # Remove dangling images
    docker images -f "dangling=true" -q | xargs -r docker rmi
}

# Main deployment process
main() {
    log "========================================="
    log "Connect Platform Deployment Starting"
    log "========================================="

    # Pre-deployment checks
    check_permissions
    check_files
    check_docker
    check_resources

    # Build and deploy
    build_images
    run_migrations
    rolling_update
    update_scraper

    # Verify deployment
    final_health_check

    # Cleanup
    cleanup

    log "========================================="
    log "✓ Deployment Completed Successfully!"
    log "========================================="

    info "Services status:"
    docker compose -f "$COMPOSE_FILE" ps

    info ""
    info "Next steps:"
    info "1. Monitor logs: docker compose -f $COMPOSE_FILE logs -f"
    info "2. Check metrics: http://localhost:3100 (Grafana)"
    info "3. View health: curl http://localhost/api/health"
}

# Run main function
main "$@"