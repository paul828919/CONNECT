#!/bin/bash

echo "🔐 GitHub Secrets Setup Helper"
echo "=============================="
echo ""
echo "This script will help you prepare all secrets for GitHub Actions."
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SSH_KEY_PATH="${HOME}/.ssh/id_ed25519_connect"

echo -e "${BLUE}📋 GitHub Secrets Checklist${NC}"
echo "────────────────────────────────────────"
echo ""

echo "You need to add these 7 secrets to GitHub:"
echo "Go to: Settings → Secrets and variables → Actions"
echo ""

# Secret 1
echo -e "${GREEN}1. PRODUCTION_SERVER_IP${NC}"
echo "   Value: 221.164.102.253"
echo ""

# Secret 2
echo -e "${GREEN}2. PRODUCTION_SERVER_USER${NC}"
echo "   Value: user"
echo ""

# Secret 3
echo -e "${GREEN}3. PRODUCTION_SERVER_SSH_KEY${NC}"
echo "   Getting SSH key..."
if [ -f "$SSH_KEY_PATH" ]; then
    echo -e "   ${YELLOW}✅ SSH key found at: $SSH_KEY_PATH${NC}"
    echo ""
    
    # Offer to copy to clipboard
    if command -v pbcopy &> /dev/null; then
        echo "   Would you like to copy the SSH key to clipboard? (y/n)"
        read -r response
        if [[ "$response" == "y" ]]; then
            cat "$SSH_KEY_PATH" | pbcopy
            echo -e "   ${GREEN}✅ SSH key copied to clipboard!${NC}"
            echo "   Now paste it into GitHub Secrets as PRODUCTION_SERVER_SSH_KEY"
        else
            echo "   You can copy it manually with: cat $SSH_KEY_PATH | pbcopy"
        fi
    else
        echo "   Copy the SSH key with: cat $SSH_KEY_PATH"
    fi
    
    echo ""
    echo "   ⚠️  IMPORTANT: Include ALL lines including:"
    echo "      -----BEGIN OPENSSH PRIVATE KEY-----"
    echo "      [all encoded content]"
    echo "      -----END OPENSSH PRIVATE KEY-----"
else
    echo -e "   ${YELLOW}❌ SSH key not found!${NC}"
    echo "   Please ensure the key exists at: $SSH_KEY_PATH"
fi
echo ""

# Secret 4
echo -e "${GREEN}4. DB_PASSWORD${NC}"
echo "   Value: 9LroqGz1xI+mKhcN9q0B52xHsiqr0DuLxs4vl686CRs="
echo ""

# Secret 5
echo -e "${GREEN}5. JWT_SECRET${NC}"
echo "   Value: rJdtXB1DjD/OvZ/b/LVeaohFaTXslthXXabuWYKVYdcgLwvn4b71h09pYOcufwa8"
echo ""

# Secret 6
echo -e "${GREEN}6. NEXTAUTH_SECRET${NC}"
echo "   Value: CXepV6txy7BXCM9Ffu8OuWYDo/iooZvgSqorqScQ/V0="
echo ""

# Secret 7
echo -e "${GREEN}7. GRAFANA_PASSWORD${NC}"
echo "   Value: aXzTqR1YfL2bTTJ2X21KQw=="
echo ""

echo "────────────────────────────────────────"
echo ""
echo -e "${BLUE}📝 Next Steps:${NC}"
echo ""
echo "1. Go to your GitHub repository"
echo "2. Navigate to: Settings → Secrets and variables → Actions"
echo "3. Click 'New repository secret'"
echo "4. Add each secret above (name and value exactly as shown)"
echo "5. Verify all 7 secrets are added"
echo ""
echo -e "${BLUE}🧪 After adding secrets:${NC}"
echo ""
echo "Run verification:"
echo "  ./scripts/verify-github-actions.sh"
echo ""
echo "Test deployment:"
echo "  git push origin main"
echo ""
echo "Monitor deployment:"
echo "  https://github.com/YOUR_USERNAME/connect/actions"
echo ""
echo -e "${GREEN}✅ Setup helper complete!${NC}"

