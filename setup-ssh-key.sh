#!/bin/bash
# Setup SSH Key Authentication for Production Server
# Eliminates need for password storage

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                    ║${NC}"
echo -e "${BLUE}║       🔐 SSH Key Authentication Setup 🔐          ║${NC}"
echo -e "${BLUE}║                                                    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════╝${NC}"
echo ""

REMOTE_SERVER="user@59.21.170.6"
SSH_KEY_PATH="$HOME/.ssh/id_ed25519_connect"

# Check if key already exists
if [ -f "$SSH_KEY_PATH" ]; then
    echo -e "${YELLOW}SSH key already exists at $SSH_KEY_PATH${NC}"
    read -p "Do you want to use existing key? (y/n): " use_existing
    if [ "$use_existing" != "y" ]; then
        SSH_KEY_PATH="$HOME/.ssh/id_ed25519_connect_$(date +%Y%m%d)"
        echo -e "${GREEN}Creating new key at $SSH_KEY_PATH${NC}"
    fi
fi

# Generate SSH key if needed
if [ ! -f "$SSH_KEY_PATH" ]; then
    echo -e "${GREEN}Generating SSH key...${NC}"
    ssh-keygen -t ed25519 -C "connect-production-access" -f "$SSH_KEY_PATH" -N ""
    echo -e "${GREEN}✅ SSH key generated${NC}"
fi

# Copy key to server
echo ""
echo -e "${YELLOW}Copying SSH key to production server...${NC}"
echo -e "${YELLOW}You'll need to enter the server password one last time${NC}"
echo ""

if ssh-copy-id -i "$SSH_KEY_PATH.pub" "$REMOTE_SERVER"; then
    echo -e "${GREEN}✅ SSH key successfully copied to server${NC}"
else
    echo -e "${RED}❌ Failed to copy SSH key${NC}"
    exit 1
fi

# Test connection
echo ""
echo -e "${YELLOW}Testing SSH connection...${NC}"
if ssh -i "$SSH_KEY_PATH" "$REMOTE_SERVER" "echo 'SSH key authentication successful!'" 2>/dev/null; then
    echo -e "${GREEN}✅ SSH key authentication working!${NC}"
else
    echo -e "${RED}❌ SSH key authentication failed${NC}"
    exit 1
fi

# Update SSH config
echo ""
echo -e "${YELLOW}Updating SSH configuration...${NC}"

SSH_CONFIG="$HOME/.ssh/config"
CONFIG_ENTRY="
# Connect Production Server
Host connect-prod
    HostName 59.21.170.6
    User user
    IdentityFile $SSH_KEY_PATH
    ServerAliveInterval 60
    ServerAliveCountMax 3
"

if ! grep -q "Host connect-prod" "$SSH_CONFIG" 2>/dev/null; then
    echo "$CONFIG_ENTRY" >> "$SSH_CONFIG"
    echo -e "${GREEN}✅ SSH config updated${NC}"
else
    echo -e "${YELLOW}SSH config already contains connect-prod entry${NC}"
fi

# Create convenient aliases
echo ""
echo -e "${YELLOW}Creating shell aliases...${NC}"

ALIAS_FILE="$HOME/.connect-aliases"
cat > "$ALIAS_FILE" << 'EOF'
# Connect Platform Aliases (No password needed!)

# SSH to production
alias connect-ssh='ssh connect-prod'

# Health checks
alias connect-health='cd ~/Downloads/connect && ./scripts/check-health.sh'
alias connect-diagnose='cd ~/Downloads/connect && ./scripts/diagnose-production.sh'

# View logs
alias connect-logs-app1='ssh connect-prod "docker logs -f connect_app1"'
alias connect-logs-app2='ssh connect-prod "docker logs -f connect_app2"'

# Quick status
alias connect-status='ssh connect-prod "docker ps --format \"table {{.Names}}\t{{.Status}}\""'
EOF

# Add to shell config if not already there
SHELL_CONFIG="$HOME/.zshrc"
if ! grep -q ".connect-aliases" "$SHELL_CONFIG" 2>/dev/null; then
    echo "" >> "$SHELL_CONFIG"
    echo "# Connect Platform Aliases" >> "$SHELL_CONFIG"
    echo "[ -f ~/.connect-aliases ] && source ~/.connect-aliases" >> "$SHELL_CONFIG"
    echo -e "${GREEN}✅ Aliases added to $SHELL_CONFIG${NC}"
fi

# Update health check scripts to use SSH key
echo ""
echo -e "${YELLOW}Updating health check scripts...${NC}"

# Create a simple wrapper that uses SSH config
cat > "$HOME/Downloads/connect/scripts/check-health-secure.sh" << 'EOF'
#!/bin/bash
# Health check using SSH key authentication (no password needed)

# Just use the connect-prod SSH alias
REMOTE_SERVER="connect-prod"

# Include the original check-health.sh logic but with SSH key
source "$(dirname "$0")/check-health.sh"
EOF

chmod +x "$HOME/Downloads/connect/scripts/check-health-secure.sh"

echo -e "${GREEN}✅ Setup complete!${NC}"

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                    ║${NC}"
echo -e "${BLUE}║              🎉 SUCCESS! 🎉                        ║${NC}"
echo -e "${BLUE}║                                                    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${GREEN}Available commands (no password needed):${NC}"
echo ""
echo -e "  ${YELLOW}connect-ssh${NC}          - SSH to production server"
echo -e "  ${YELLOW}connect-health${NC}       - Run health check"
echo -e "  ${YELLOW}connect-diagnose${NC}     - Run diagnostics"
echo -e "  ${YELLOW}connect-status${NC}       - Quick container status"
echo -e "  ${YELLOW}connect-logs-app1${NC}    - View app1 logs"
echo -e "  ${YELLOW}connect-logs-app2${NC}    - View app2 logs"
echo ""
echo -e "${YELLOW}To activate aliases in current session:${NC}"
echo -e "  ${BLUE}source ~/.zshrc${NC}"
echo ""
echo -e "${GREEN}✅ SSH key authentication is now configured!${NC}"
echo -e "${GREEN}✅ No more password storage needed!${NC}"
echo ""

