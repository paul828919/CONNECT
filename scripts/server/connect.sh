#!/bin/bash

# Connect Platform - SSH to Production Server
# This script opens an interactive SSH session to the production server
# Version: 1.0.0
# Last updated: October 11, 2025

# Source configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.sh"

# ============================================
# Main Script
# ============================================

echo "Connecting to ${SSH_HOST}..."
echo ""

# Check SSH connection
if ! check_ssh_connection; then
    error_exit "Cannot connect to ${SSH_HOST}. Please run setup-ssh.sh first."
fi

# Open SSH session and navigate to project directory
ssh -t "$SSH_HOST" "cd ${REMOTE_PROJECT_PATH} 2>/dev/null || cd ~; exec bash --login"
