#!/bin/bash
# ============================================
# Connect Platform - Database Migration Rollback
# ============================================
#
# Purpose: Rollback failed database migrations using pre-migration backups
# Usage: ./scripts/rollback-migration.sh [backup_file]
#
# CRITICAL: This script should ONLY be used when:
# 1. A migration has failed
# 2. The application is not functioning
# 3. You have confirmed the backup file is correct
#
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
BACKUP_DIR="/opt/connect/backups/pre-migration"
BACKUP_FILE="${1:-}"

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

# Check if running as correct user
check_permissions() {
    if [ "$(id -u)" -eq 0 ]; then
        warn "Running as root. Ensure Docker permissions are correct."
    fi
}

# Verify Docker is running
check_docker() {
    if ! docker ps &> /dev/null; then
        error "Cannot connect to Docker daemon. Is Docker running?"
    fi
}

# List available backups
list_backups() {
    log "Available pre-migration backups:"
    echo ""

    if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -A $BACKUP_DIR 2>/dev/null)" ]; then
        warn "No backup files found in $BACKUP_DIR"
        return 1
    fi

    ls -lh "$BACKUP_DIR"/*.dump 2>/dev/null | while read -r line; do
        echo "  $line"
    done

    echo ""

    # Show last migration backup if exists
    if [ -f /tmp/last_migration_backup ]; then
        local last_backup=$(cat /tmp/last_migration_backup)
        warn "Last migration backup: $last_backup"
    fi
}

# Confirm rollback action
confirm_rollback() {
    warn "======================================"
    warn "DATABASE ROLLBACK CONFIRMATION"
    warn "======================================"
    warn ""
    warn "This will:"
    warn "  1. Stop all application services"
    warn "  2. Drop and recreate the database"
    warn "  3. Restore from backup: $BACKUP_FILE"
    warn "  4. Restart all services"
    warn ""
    warn "⚠️  ALL DATA CHANGES SINCE THE BACKUP WILL BE LOST"
    warn ""

    read -p "Are you ABSOLUTELY SURE you want to continue? (type 'ROLLBACK' to confirm): " confirmation

    if [ "$confirmation" != "ROLLBACK" ]; then
        error "Rollback cancelled by user"
    fi
}

# Create safety backup before rollback
create_safety_backup() {
    log "Creating safety backup before rollback..."

    local timestamp=$(date +%Y%m%d_%H%M%S)
    local safety_backup_dir="/opt/connect/backups/pre-rollback"
    local safety_backup_file="${safety_backup_dir}/connect_${timestamp}.dump"

    mkdir -p "$safety_backup_dir"

    # Try to create backup (may fail if database is corrupted)
    docker compose -f "$COMPOSE_FILE" exec -T db \
        pg_dump -U connect -d connect -F c -f "/tmp/safety_backup_${timestamp}.dump" 2>/dev/null || true

    docker cp "connect_db:/tmp/safety_backup_${timestamp}.dump" "$safety_backup_file" 2>/dev/null || true

    if [ -f "$safety_backup_file" ]; then
        log "✓ Safety backup created: $safety_backup_file"
    else
        warn "Could not create safety backup (database may be corrupted)"
    fi

    # Keep only last 3 safety backups
    ls -t "${safety_backup_dir}"/connect_*.dump 2>/dev/null | tail -n +4 | xargs -r rm
}

# Stop application services
stop_services() {
    log "Stopping application services..."

    # Stop app instances and scraper (keep database and redis running)
    docker compose -f "$COMPOSE_FILE" stop app1 app2 scraper

    log "✓ Application services stopped"
}

# Verify backup file exists
verify_backup() {
    if [ ! -f "$BACKUP_FILE" ]; then
        error "Backup file not found: $BACKUP_FILE"
    fi

    local file_size=$(du -h "$BACKUP_FILE" | cut -f1)
    info "Backup file size: $file_size"

    # Basic validation: check if file is a valid PostgreSQL dump
    if ! file "$BACKUP_FILE" | grep -q "PostgreSQL"; then
        error "File does not appear to be a valid PostgreSQL dump"
    fi

    log "✓ Backup file verified: $BACKUP_FILE"
}

# Restore database from backup
restore_database() {
    log "Restoring database from backup..."

    # Copy backup file into database container
    local container_backup_path="/tmp/restore.dump"
    docker cp "$BACKUP_FILE" "connect_db:$container_backup_path"

    # Terminate active connections
    log "Terminating active database connections..."
    docker compose -f "$COMPOSE_FILE" exec -T db \
        psql -U connect -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'connect' AND pid <> pg_backend_pid();" 2>/dev/null || true

    # Drop existing database
    log "Dropping existing database..."
    docker compose -f "$COMPOSE_FILE" exec -T db \
        psql -U connect -d postgres -c "DROP DATABASE IF EXISTS connect;"

    if [ $? -ne 0 ]; then
        error "Failed to drop database"
    fi

    # Recreate database
    log "Recreating database..."
    docker compose -f "$COMPOSE_FILE" exec -T db \
        psql -U connect -d postgres -c "CREATE DATABASE connect OWNER connect;"

    if [ $? -ne 0 ]; then
        error "Failed to create database"
    fi

    # Restore from backup
    log "Restoring data from backup (this may take several minutes)..."
    docker compose -f "$COMPOSE_FILE" exec -T db \
        pg_restore -U connect -d connect -F c --no-owner --no-acl "$container_backup_path"

    local restore_exit_code=$?

    # Clean up temporary backup file in container
    docker compose -f "$COMPOSE_FILE" exec -T db rm "$container_backup_path"

    if [ $restore_exit_code -ne 0 ]; then
        error "Database restore failed"
    fi

    log "✓ Database restored successfully"
}

# Verify database integrity
verify_database() {
    log "Verifying database integrity..."

    # Check if database is accessible
    local db_check=$(docker compose -f "$COMPOSE_FILE" exec -T db \
        pg_isready -U connect -d connect 2>&1)

    if ! echo "$db_check" | grep -q "accepting connections"; then
        error "Database is not accepting connections after restore"
    fi

    # Count tables
    local table_count=$(docker compose -f "$COMPOSE_FILE" exec -T db \
        psql -U connect -d connect -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')

    info "Tables restored: $table_count"

    if [ "$table_count" -lt 5 ]; then
        error "Unexpected number of tables. Database may be corrupted."
    fi

    # Check critical tables exist
    local critical_tables=("users" "organizations" "funding_programs" "subscriptions")
    for table in "${critical_tables[@]}"; do
        local exists=$(docker compose -f "$COMPOSE_FILE" exec -T db \
            psql -U connect -d connect -t -c "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '$table');" | tr -d ' ')

        if [ "$exists" != "t" ]; then
            error "Critical table missing: $table"
        fi
    done

    log "✓ Database integrity verified"
}

# Sync Prisma schema with restored database
sync_prisma() {
    log "Syncing Prisma schema with restored database..."

    # Generate Prisma client matching database state
    docker compose -f "$COMPOSE_FILE" run --rm app1 \
        npx prisma generate

    if [ $? -ne 0 ]; then
        error "Prisma client generation failed"
    fi

    # Pull database schema to Prisma (updates schema.prisma if needed)
    # NOTE: This is commented out by default to prevent accidental schema changes
    # docker compose -f "$COMPOSE_FILE" run --rm app1 \
    #     npx prisma db pull

    log "✓ Prisma schema synced"
}

# Restart application services
restart_services() {
    log "Restarting application services..."

    # Start app instances
    docker compose -f "$COMPOSE_FILE" up -d app1 app2 scraper

    # Wait for services to be healthy
    local max_attempts=30
    local attempt=0

    while [ $attempt -lt $max_attempts ]; do
        if docker compose -f "$COMPOSE_FILE" exec -T app1 wget --quiet --tries=1 --spider "http://localhost:3001/api/health" 2>/dev/null; then
            log "✓ Application services restarted successfully"
            return 0
        fi

        attempt=$((attempt + 1))
        info "Waiting for application to be healthy... ($attempt/$max_attempts)"
        sleep 5
    done

    warn "Application health check did not pass. Check logs for errors."
}

# Main rollback process
main() {
    log "========================================="
    log "Database Migration Rollback"
    log "========================================="

    # Pre-rollback checks
    check_permissions
    check_docker

    # Determine backup file
    if [ -z "$BACKUP_FILE" ]; then
        list_backups

        # Use last migration backup if no file specified
        if [ -f /tmp/last_migration_backup ]; then
            BACKUP_FILE=$(cat /tmp/last_migration_backup)
            warn "Using last migration backup: $BACKUP_FILE"
        else
            echo ""
            error "No backup file specified. Usage: $0 <backup_file>"
        fi
    fi

    # Verify backup file
    verify_backup

    # Get user confirmation
    confirm_rollback

    # Execute rollback
    create_safety_backup
    stop_services
    restore_database
    verify_database
    sync_prisma
    restart_services

    log "========================================="
    log "✓ Database Rollback Completed"
    log "========================================="
    log ""
    info "Next steps:"
    info "1. Verify application is functioning: curl http://localhost/api/health"
    info "2. Check application logs: docker compose -f $COMPOSE_FILE logs -f app1"
    info "3. Test critical user flows"
    info "4. Review what caused the migration failure"
    info "5. Fix migration issues before re-deploying"
    log ""
    warn "Safety backup location: /opt/connect/backups/pre-rollback/"
    warn "Original backup used: $BACKUP_FILE"
}

# Run main function
main "$@"