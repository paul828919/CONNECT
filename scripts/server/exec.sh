#!/bin/bash

# Connect Platform - Execute Remote Command
# This script executes a command on the production server
# Version: 1.0.0
# Last updated: October 11, 2025

# Source configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.sh"

# ============================================
# Usage
# ============================================

usage() {
    echo "Usage: $0 <command>"
    echo ""
    echo "Examples:"
    echo "  $0 'lsof -i :3000'"
    echo "  $0 'systemctl status nginx'"
    echo "  $0 'pm2 status'"
    echo "  $0 'tail -n 50 /var/log/nginx/error.log'"
    echo ""
    exit 1
}

# ============================================
# Main Script
# ============================================

# Check arguments
if [[ $# -eq 0 ]]; then
    error_exit "No command specified"
    usage
fi

COMMAND="$*"

# Check SSH connection
if ! check_ssh_connection; then
    error_exit "Cannot connect to ${SSH_HOST}. Please run setup-ssh.sh first."
fi

info_msg "Executing on ${SSH_HOST}: $COMMAND"
echo ""

# Execute command
ssh "$SSH_HOST" "$COMMAND"
