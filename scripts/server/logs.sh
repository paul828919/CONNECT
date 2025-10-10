#!/bin/bash

# Connect Platform - View Service Logs
# This script views logs for various services on the production server
# Version: 1.0.0
# Last updated: October 11, 2025

# Source configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.sh"

# ============================================
# Usage
# ============================================

usage() {
    echo "Usage: $0 <service> [lines]"
    echo ""
    echo "Services:"
    echo "  nextjs        - Next.js application logs"
    echo "  nginx         - Nginx error logs"
    echo "  nginx-access  - Nginx access logs"
    echo "  postgres      - PostgreSQL logs"
    echo "  certbot       - SSL certificate renewal logs"
    echo "  system        - System logs (journalctl)"
    echo ""
    echo "Options:"
    echo "  lines         - Number of lines to show (default: 50)"
    echo ""
    echo "Examples:"
    echo "  $0 nextjs"
    echo "  $0 nginx 100"
    echo "  $0 nginx-access 200"
    echo "  $0 system"
    echo ""
    exit 1
}

# ============================================
# Main Script
# ============================================

# Check arguments
if [[ $# -eq 0 ]]; then
    error_exit "No service specified"
    usage
fi

SERVICE="$1"
LINES="${2:-50}"

# Check SSH connection
if ! check_ssh_connection; then
    error_exit "Cannot connect to ${SSH_HOST}. Please run setup-ssh.sh first."
fi

info_msg "Viewing logs for: $SERVICE (last $LINES lines)"
echo ""

# View logs based on service
case "$SERVICE" in
    nextjs)
        # Check if running with PM2
        if ssh "$SSH_HOST" "pm2 describe ${SERVICE_NEXTJS} >/dev/null 2>&1"; then
            ssh "$SSH_HOST" "pm2 logs ${SERVICE_NEXTJS} --lines $LINES --nostream"
        else
            # Check for nohup log
            if ssh "$SSH_HOST" "test -f /tmp/nextjs.log"; then
                ssh "$SSH_HOST" "tail -n $LINES /tmp/nextjs.log"
            else
                warning_msg "Next.js logs not found"
                echo ""
                echo "If using PM2: pm2 logs ${SERVICE_NEXTJS}"
                echo "If using npm: Check /tmp/nextjs.log on server"
            fi
        fi
        ;;

    nginx)
        ssh "$SSH_HOST" "sudo tail -n $LINES /var/log/nginx/error.log"
        ;;

    nginx-access)
        ssh "$SSH_HOST" "sudo tail -n $LINES /var/log/nginx/access.log"
        ;;

    postgres)
        # PostgreSQL log location varies by installation
        LOG_FILE=$(ssh "$SSH_HOST" "sudo find /var/log/postgresql /var/lib/postgresql -name '*.log' -type f 2>/dev/null | head -1" || echo "")

        if [[ -n "$LOG_FILE" ]]; then
            ssh "$SSH_HOST" "sudo tail -n $LINES $LOG_FILE"
        else
            warning_msg "PostgreSQL logs not found"
            echo ""
            echo "Try: journalctl -u postgresql -n $LINES"
        fi
        ;;

    certbot)
        ssh "$SSH_HOST" "sudo journalctl -u certbot.service -n $LINES"
        ;;

    system)
        ssh "$SSH_HOST" "sudo journalctl -n $LINES"
        ;;

    *)
        error_exit "Unknown service: $SERVICE"
        usage
        ;;
esac

echo ""
info_msg "Use 'tail -f' for live monitoring:"
case "$SERVICE" in
    nextjs)
        echo "  ./scripts/server/exec.sh 'pm2 logs ${SERVICE_NEXTJS}'"
        ;;
    nginx)
        echo "  ./scripts/server/exec.sh 'sudo tail -f /var/log/nginx/error.log'"
        ;;
    nginx-access)
        echo "  ./scripts/server/exec.sh 'sudo tail -f /var/log/nginx/access.log'"
        ;;
esac
echo ""
