#!/bin/bash

# Connect Platform - Restart Next.js on Production Server
# This script restarts the Next.js application using PM2 (production) or npm (fallback)
# Version: 1.0.0
# Last updated: October 11, 2025

set -e  # Exit on any error

# Source configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.sh"

# ============================================
# Main Script
# ============================================

echo "=========================================="
echo "Connect - Restart Next.js"
echo "=========================================="
echo ""

# Check SSH connection
info_msg "Checking SSH connection to ${SSH_HOST}..."
if ! check_ssh_connection; then
    error_exit "Cannot connect to ${SSH_HOST}. Please run setup-ssh.sh first."
fi
success_msg "SSH connection established"
echo ""

# Check if Next.js is currently running
info_msg "Checking if Next.js is currently running..."
if ssh "$SSH_HOST" "lsof -Pi :${PORT_NEXTJS} -sTCP:LISTEN -t >/dev/null 2>&1"; then
    warning_msg "Next.js is currently running on port ${PORT_NEXTJS}"
    echo ""
    echo "What would you like to do?"
    echo "  1) Restart with PM2 (recommended)"
    echo "  2) Restart with npm + nohup"
    echo "  3) Stop and exit"
    echo ""
    read -p "Choose option [1-3]: " choice

    case $choice in
        1)
            MODE="pm2-restart"
            ;;
        2)
            MODE="npm-restart"
            ;;
        3)
            info_msg "Exiting without changes"
            exit 0
            ;;
        *)
            error_exit "Invalid choice"
            ;;
    esac
else
    info_msg "Next.js is not currently running"
    echo ""
    echo "How would you like to start Next.js?"
    echo "  1) Start with PM2 (recommended for production)"
    echo "  2) Start with npm + nohup (simple)"
    echo ""
    read -p "Choose option [1-2]: " choice

    case $choice in
        1)
            MODE="pm2-start"
            ;;
        2)
            MODE="npm-start"
            ;;
        *)
            error_exit "Invalid choice"
            ;;
    esac
fi

echo ""

# ============================================
# PM2 Mode
# ============================================

if [[ "$MODE" == "pm2-restart" || "$MODE" == "pm2-start" ]]; then
    info_msg "Checking if PM2 is installed..."

    if ! ssh "$SSH_HOST" "command -v pm2 >/dev/null 2>&1"; then
        warning_msg "PM2 is not installed"
        echo ""
        read -p "Would you like to install PM2? (y/n): " install_pm2

        if [[ "$install_pm2" == "y" || "$install_pm2" == "Y" ]]; then
            info_msg "Installing PM2 globally..."
            ssh "$SSH_HOST" "sudo npm install -g pm2"
            success_msg "PM2 installed successfully"
        else
            error_exit "Cannot proceed without PM2. Use npm mode instead."
        fi
    else
        success_msg "PM2 is installed"
    fi

    echo ""

    if [[ "$MODE" == "pm2-restart" ]]; then
        info_msg "Restarting Next.js with PM2..."

        # Check if process exists
        if ssh "$SSH_HOST" "pm2 describe ${SERVICE_NEXTJS} >/dev/null 2>&1"; then
            ssh "$SSH_HOST" "cd ${REMOTE_PROJECT_PATH} && pm2 restart ${SERVICE_NEXTJS}"
            success_msg "Next.js restarted with PM2"
        else
            # Process doesn't exist, start it
            warning_msg "PM2 process '${SERVICE_NEXTJS}' not found, starting fresh..."
            ssh "$SSH_HOST" "cd ${REMOTE_PROJECT_PATH} && pm2 start npm --name '${SERVICE_NEXTJS}' -- start"
            ssh "$SSH_HOST" "pm2 save"
            success_msg "Next.js started with PM2"
        fi
    else
        info_msg "Starting Next.js with PM2..."
        ssh "$SSH_HOST" "cd ${REMOTE_PROJECT_PATH} && pm2 start npm --name '${SERVICE_NEXTJS}' -- start"
        ssh "$SSH_HOST" "pm2 save"
        success_msg "Next.js started with PM2"

        echo ""
        info_msg "Configuring PM2 to start on boot..."
        ssh "$SSH_HOST" "pm2 startup | grep sudo | bash"
        success_msg "PM2 startup configured"
    fi

    echo ""
    info_msg "PM2 status:"
    ssh "$SSH_HOST" "pm2 status"
fi

# ============================================
# npm Mode
# ============================================

if [[ "$MODE" == "npm-restart" || "$MODE" == "npm-start" ]]; then
    if [[ "$MODE" == "npm-restart" ]]; then
        info_msg "Stopping current Next.js process..."
        ssh "$SSH_HOST" "pkill -f 'next dev' || pkill -f 'next start' || true"
        sleep 2
    fi

    info_msg "Starting Next.js with npm..."
    ssh "$SSH_HOST" "cd ${REMOTE_PROJECT_PATH} && nohup npm run dev > /tmp/nextjs.log 2>&1 &"
    sleep 3
    success_msg "Next.js started with npm"

    echo ""
    warning_msg "Note: Process will stop if SSH session ends"
    warning_msg "Consider using PM2 for production"
fi

# ============================================
# Verification
# ============================================

echo ""
info_msg "Verifying Next.js is running..."
sleep 2

if ssh "$SSH_HOST" "lsof -Pi :${PORT_NEXTJS} -sTCP:LISTEN -t >/dev/null 2>&1"; then
    success_msg "Next.js is running on port ${PORT_NEXTJS}"

    # Test health endpoint
    if ssh "$SSH_HOST" "curl -s http://localhost:${PORT_NEXTJS}/api/health >/dev/null 2>&1"; then
        success_msg "Health check passed"
    else
        warning_msg "Health check failed, but process is running"
    fi
else
    error_exit "Next.js is not running on port ${PORT_NEXTJS}"
fi

echo ""
echo "=========================================="
success_msg "Next.js restart complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "  1. Test HTTPS: curl -I https://connectplt.kr"
echo "  2. Check status: ./scripts/server/status.sh"
echo "  3. View logs: ./scripts/server/logs.sh nextjs"
echo ""
