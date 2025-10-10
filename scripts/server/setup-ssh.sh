#!/bin/bash

# Connect Platform - SSH Configuration Setup Wizard
# This script helps configure SSH access to the production server
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
echo "Connect - SSH Setup Wizard"
echo "=========================================="
echo ""
echo "This wizard will help you configure SSH access to the production server."
echo ""

# Check if ~/.ssh directory exists
if [[ ! -d "$HOME/.ssh" ]]; then
    info_msg "Creating ~/.ssh directory..."
    mkdir -p "$HOME/.ssh"
    chmod 700 "$HOME/.ssh"
    success_msg "Created ~/.ssh directory"
    echo ""
fi

# Check if SSH config exists
SSH_CONFIG="$HOME/.ssh/config"
if [[ ! -f "$SSH_CONFIG" ]]; then
    info_msg "Creating ~/.ssh/config file..."
    touch "$SSH_CONFIG"
    chmod 600 "$SSH_CONFIG"
    success_msg "Created ~/.ssh/config file"
    echo ""
fi

# Check if connect-server entry already exists
if grep -q "Host connect-server" "$SSH_CONFIG"; then
    warning_msg "SSH config for 'connect-server' already exists"
    echo ""
    echo "Current configuration:"
    echo "----------------------------------------"
    sed -n '/Host connect-server/,/^Host\|^$/p' "$SSH_CONFIG" | grep -v '^Host[^-]'
    echo "----------------------------------------"
    echo ""
    read -p "Would you like to update it? (y/n): " update_config

    if [[ "$update_config" != "y" && "$update_config" != "Y" ]]; then
        info_msg "Keeping existing configuration"
        SKIP_CONFIG=true
    fi
else
    info_msg "No existing configuration found for 'connect-server'"
    SKIP_CONFIG=false
fi

# ============================================
# SSH Key Configuration
# ============================================

if [[ "$SKIP_CONFIG" != true ]]; then
    echo ""
    echo "SSH Key Configuration"
    echo "----------------------------------------"
    echo ""
    echo "Available SSH keys:"
    ls -1 "$HOME/.ssh/"*.pub 2>/dev/null | sed 's/.pub$//' || echo "  (none found)"
    echo ""

    read -p "Enter path to your SSH private key [~/.ssh/id_rsa]: " ssh_key
    ssh_key="${ssh_key:-$HOME/.ssh/id_rsa}"

    # Expand tilde
    ssh_key="${ssh_key/#\~/$HOME}"

    # Check if key exists
    if [[ ! -f "$ssh_key" ]]; then
        warning_msg "SSH key not found: $ssh_key"
        echo ""
        read -p "Would you like to generate a new SSH key? (y/n): " generate_key

        if [[ "$generate_key" == "y" || "$generate_key" == "Y" ]]; then
            info_msg "Generating new SSH key..."
            ssh-keygen -t rsa -b 4096 -f "$ssh_key" -C "connect-production-server"
            success_msg "SSH key generated"

            echo ""
            warning_msg "IMPORTANT: Copy the public key to the server"
            echo ""
            echo "Run this command on your LOCAL machine:"
            echo ""
            echo "  ssh-copy-id -i ${ssh_key}.pub ${SSH_USER}@${SSH_IP}"
            echo ""
            read -p "Press Enter after you've copied the key to continue..."
        else
            error_exit "Cannot proceed without an SSH key"
        fi
    else
        success_msg "SSH key found: $ssh_key"
    fi

    # ============================================
    # Create/Update SSH Config
    # ============================================

    echo ""
    info_msg "Configuring SSH connection..."

    # Remove existing connect-server config if updating
    if grep -q "Host connect-server" "$SSH_CONFIG"; then
        # Create temp file without connect-server config
        sed '/Host connect-server/,/^$/d' "$SSH_CONFIG" > "$SSH_CONFIG.tmp"
        mv "$SSH_CONFIG.tmp" "$SSH_CONFIG"
    fi

    # Append new configuration
    cat >> "$SSH_CONFIG" << EOF

# Connect Platform - Production Server
Host connect-server
    HostName ${SSH_IP}
    User ${SSH_USER}
    IdentityFile ${ssh_key}
    StrictHostKeyChecking yes
    ServerAliveInterval 60
    ServerAliveCountMax 3

EOF

    chmod 600 "$SSH_CONFIG"
    success_msg "SSH configuration updated"
fi

# ============================================
# Test Connection
# ============================================

echo ""
echo "Testing SSH Connection"
echo "----------------------------------------"
echo ""
info_msg "Connecting to ${SSH_HOST}..."

if ssh -o BatchMode=yes -o ConnectTimeout=10 "$SSH_HOST" exit 2>/dev/null; then
    success_msg "SSH connection successful!"
else
    error_exit "SSH connection failed. Please check:
  1. Server is reachable: ping ${SSH_IP}
  2. SSH key is added to server: ssh-copy-id -i ${ssh_key}.pub ${SSH_USER}@${SSH_IP}
  3. Firewall allows SSH (port 22)
  4. Server SSH service is running"
fi

# ============================================
# Test Sudo Access
# ============================================

echo ""
info_msg "Testing sudo access..."

if ssh "$SSH_HOST" "sudo -n true 2>/dev/null"; then
    success_msg "Passwordless sudo is configured"
else
    warning_msg "Passwordless sudo is NOT configured"
    echo ""
    echo "Some operations require sudo access. To configure passwordless sudo:"
    echo "  1. SSH to server: ssh ${SSH_HOST}"
    echo "  2. Run: sudo visudo"
    echo "  3. Add line: ${SSH_USER} ALL=(ALL) NOPASSWD:ALL"
    echo "  4. Save and exit"
    echo ""
    read -p "Continue without passwordless sudo? (y/n): " continue_without_sudo

    if [[ "$continue_without_sudo" != "y" && "$continue_without_sudo" != "Y" ]]; then
        exit 0
    fi
fi

# ============================================
# Verify Server Environment
# ============================================

echo ""
echo "Verifying Server Environment"
echo "----------------------------------------"
echo ""

# Check project directory
info_msg "Checking project directory..."
if ssh "$SSH_HOST" "test -d ${REMOTE_PROJECT_PATH}"; then
    success_msg "Project directory exists: ${REMOTE_PROJECT_PATH}"
else
    warning_msg "Project directory not found: ${REMOTE_PROJECT_PATH}"
    echo ""
    echo "Please ensure the Connect project is deployed to the server."
fi

# Check Node.js
info_msg "Checking Node.js..."
NODE_VERSION=$(ssh "$SSH_HOST" "node --version 2>/dev/null" || echo "not installed")
if [[ "$NODE_VERSION" != "not installed" ]]; then
    success_msg "Node.js installed: $NODE_VERSION"
else
    warning_msg "Node.js is not installed on the server"
fi

# Check npm
info_msg "Checking npm..."
NPM_VERSION=$(ssh "$SSH_HOST" "npm --version 2>/dev/null" || echo "not installed")
if [[ "$NPM_VERSION" != "not installed" ]]; then
    success_msg "npm installed: $NPM_VERSION"
else
    warning_msg "npm is not installed on the server"
fi

# Check Nginx
info_msg "Checking Nginx..."
if ssh "$SSH_HOST" "systemctl is-active --quiet nginx 2>/dev/null"; then
    success_msg "Nginx is running"
else
    warning_msg "Nginx is not running or not installed"
fi

# ============================================
# Summary
# ============================================

echo ""
echo "=========================================="
success_msg "SSH Setup Complete!"
echo "=========================================="
echo ""
echo "You can now use the following scripts:"
echo "  • ./scripts/server/connect.sh          - SSH to server"
echo "  • ./scripts/server/restart-nextjs.sh   - Restart Next.js"
echo "  • ./scripts/server/status.sh           - Check service statuses"
echo "  • ./scripts/server/logs.sh <service>   - View logs"
echo "  • ./scripts/server/exec.sh <command>   - Run remote commands"
echo ""
echo "SSH Connection:"
echo "  Host: ${SSH_HOST}"
echo "  User: ${SSH_USER}@${SSH_IP}"
echo "  Key:  ${ssh_key}"
echo ""
