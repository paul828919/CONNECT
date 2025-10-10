#!/bin/bash

# Connect Platform - Server Management Configuration
# This file is sourced by all server management scripts
# Version: 1.0.0
# Last updated: October 11, 2025

# ============================================
# SSH Configuration
# ============================================

# SSH host alias (defined in ~/.ssh/config)
# User should configure: Host connect-server
#   HostName 221.164.102.253
#   User user
#   IdentityFile ~/.ssh/id_rsa
export SSH_HOST="221.164.102.253"

# Fallback direct connection (if ~/.ssh/config not configured)
export SSH_USER="user"
export SSH_IP="221.164.102.253"
export SSH_PW="iw237877^^"

# ============================================
# Remote Server Paths
# ============================================

# Main project directory on server
export REMOTE_PROJECT_PATH="/opt/connect"

# Log directories
export REMOTE_LOG_PATH="/opt/connect/logs"
export REMOTE_NGINX_LOG_PATH="/var/log/nginx"

# SSL certificate path
export REMOTE_SSL_PATH="/etc/letsencrypt/live/connectplt.kr"

# ============================================
# Service Configuration
# ============================================

# Service names and ports
export SERVICE_NEXTJS="connect"  # PM2 process name
export SERVICE_NGINX="nginx"
export SERVICE_POSTGRES="postgresql"
export SERVICE_REDIS_CACHE="redis-server"  # Port 6379
export SERVICE_REDIS_QUEUE="redis-server"  # Port 6380
export SERVICE_CERTBOT="certbot.timer"

# Ports to check
export PORT_NEXTJS="3000"
export PORT_NGINX_HTTP="80"
export PORT_NGINX_HTTPS="443"
export PORT_POSTGRES="5432"
export PORT_REDIS_CACHE="6379"
export PORT_REDIS_QUEUE="6380"

# ============================================
# Colors for Output
# ============================================

export RED='\033[0;31m'
export GREEN='\033[0;32m'
export YELLOW='\033[1;33m'
export BLUE='\033[0;34m'
export CYAN='\033[0;36m'
export NC='\033[0m'  # No Color

# ============================================
# Helper Functions
# ============================================

# Check if SSH connection works
check_ssh_connection() {
    if ssh -o BatchMode=yes -o ConnectTimeout=5 "$SSH_HOST" exit 2>/dev/null; then
        return 0
    else
        # Try fallback direct connection
        if ssh -o BatchMode=yes -o ConnectTimeout=5 "${SSH_USER}@${SSH_IP}" exit 2>/dev/null; then
            export SSH_HOST="${SSH_USER}@${SSH_IP}"
            return 0
        fi
        return 1
    fi
}

# Print error message and exit
error_exit() {
    echo -e "${RED}Error: $1${NC}" >&2
    exit 1
}

# Print success message
success_msg() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Print warning message
warning_msg() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Print info message
info_msg() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}
