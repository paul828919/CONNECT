#!/bin/bash
# ============================================
# Connect Platform - Automated Backup Script
# Run daily via cron: 0 2 * * * /path/to/backup.sh
# ============================================

set -euo pipefail

# Configuration
BACKUP_DIR="/opt/connect/backups"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30
COMPOSE_FILE="docker-compose.production.yml"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

# Create backup directories
prepare_directories() {
    log "Preparing backup directories..."
    mkdir -p "$BACKUP_DIR"/{postgres,redis,uploads,config,logs}
}

# Backup PostgreSQL database
backup_postgres() {
    log "Backing up PostgreSQL database..."

    local backup_file="$BACKUP_DIR/postgres/db_${DATE}.dump"

    docker exec connect_postgres pg_dump -U connect -Fc connect > "$backup_file"

    if [ $? -eq 0 ]; then
        # Compress backup
        gzip "$backup_file"
        log "✓ PostgreSQL backup created: ${backup_file}.gz"

        # Get backup size
        local size=$(du -h "${backup_file}.gz" | cut -f1)
        log "  Backup size: $size"
    else
        error "PostgreSQL backup failed"
    fi
}

# Backup Redis queue data
backup_redis() {
    log "Backing up Redis queue data..."

    # Trigger Redis save
    docker exec connect_redis_queue redis-cli BGSAVE
    sleep 10

    # Copy dump file
    docker cp connect_redis_queue:/data/dump.rdb "$BACKUP_DIR/redis/queue_${DATE}.rdb"

    if [ $? -eq 0 ]; then
        gzip "$BACKUP_DIR/redis/queue_${DATE}.rdb"
        log "✓ Redis backup created: queue_${DATE}.rdb.gz"
    else
        warn "Redis backup failed (non-critical)"
    fi
}

# Backup uploaded files
backup_uploads() {
    log "Backing up uploaded files..."

    local upload_dir="./uploads"

    if [ -d "$upload_dir" ] && [ "$(ls -A $upload_dir 2>/dev/null)" ]; then
        tar -czf "$BACKUP_DIR/uploads/uploads_${DATE}.tar.gz" "$upload_dir"

        if [ $? -eq 0 ]; then
            local size=$(du -h "$BACKUP_DIR/uploads/uploads_${DATE}.tar.gz" | cut -f1)
            log "✓ Uploads backup created (size: $size)"
        else
            warn "Uploads backup failed"
        fi
    else
        log "  No uploads to backup"
    fi
}

# Backup configuration files
backup_config() {
    log "Backing up configuration files..."

    tar -czf "$BACKUP_DIR/config/config_${DATE}.tar.gz" \
        .env.production \
        docker-compose.production.yml \
        config/ \
        2>/dev/null || true

    if [ $? -eq 0 ]; then
        log "✓ Configuration backup created"
    else
        warn "Configuration backup failed"
    fi
}

# Backup application logs
backup_logs() {
    log "Backing up application logs..."

    if [ -d "./logs" ]; then
        tar -czf "$BACKUP_DIR/logs/logs_${DATE}.tar.gz" logs/ 2>/dev/null || true
        log "✓ Logs backup created"
    fi
}

# Cleanup old backups
cleanup_old_backups() {
    log "Cleaning up old backups (keeping last $RETENTION_DAYS days)..."

    # PostgreSQL backups
    find "$BACKUP_DIR/postgres" -name "*.dump.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true

    # Redis backups
    find "$BACKUP_DIR/redis" -name "*.rdb.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true

    # Upload backups
    find "$BACKUP_DIR/uploads" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true

    # Config backups
    find "$BACKUP_DIR/config" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true

    # Log backups
    find "$BACKUP_DIR/logs" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true

    log "✓ Old backups cleaned up"
}

# Verify backup integrity
verify_backups() {
    log "Verifying backup integrity..."

    # Check if PostgreSQL backup can be read
    local latest_db_backup=$(ls -t "$BACKUP_DIR/postgres"/*.dump.gz 2>/dev/null | head -1)
    if [ -n "$latest_db_backup" ]; then
        if gunzip -t "$latest_db_backup" 2>/dev/null; then
            log "✓ PostgreSQL backup is valid"
        else
            error "PostgreSQL backup is corrupted!"
        fi
    fi
}

# Generate backup report
generate_report() {
    log "Generating backup report..."

    local report_file="$BACKUP_DIR/backup_report_${DATE}.txt"

    {
        echo "Connect Platform Backup Report"
        echo "Date: $(date)"
        echo "======================================"
        echo ""
        echo "PostgreSQL Backups:"
        ls -lh "$BACKUP_DIR/postgres" | tail -5
        echo ""
        echo "Redis Backups:"
        ls -lh "$BACKUP_DIR/redis" | tail -5
        echo ""
        echo "Upload Backups:"
        ls -lh "$BACKUP_DIR/uploads" | tail -5
        echo ""
        echo "Total Backup Size:"
        du -sh "$BACKUP_DIR"
        echo ""
        echo "Disk Space:"
        df -h /
    } > "$report_file"

    log "✓ Backup report generated: $report_file"
}

# Main backup process
main() {
    log "========================================="
    log "Connect Platform Backup Starting"
    log "========================================="

    prepare_directories
    backup_postgres
    backup_redis
    backup_uploads
    backup_config
    backup_logs
    verify_backups
    cleanup_old_backups
    generate_report

    log "========================================="
    log "✓ Backup Completed Successfully!"
    log "========================================="
    log "Backup location: $BACKUP_DIR"
    log "Backup date: $DATE"
}

main "$@"