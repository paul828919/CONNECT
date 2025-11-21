#!/bin/bash

set -e

echo "🧪 GitHub Actions Verification Script"
echo "====================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SSH_KEY="${HOME}/.ssh/id_ed25519_connect"
SERVER_IP="59.21.170.6"
SERVER_USER="user"
PROJECT_DIR="/opt/connect"

# Test counter
PASSED=0
FAILED=0

# Test function
test_step() {
    local name="$1"
    local command="$2"
    
    echo -n "Testing: $name... "
    if eval "$command" &>/dev/null; then
        echo -e "${GREEN}✅ PASS${NC}"
        ((PASSED++))
    else
        echo -e "${RED}❌ FAIL${NC}"
        ((FAILED++))
        return 1
    fi
}

echo "1️⃣ LOCAL ENVIRONMENT CHECKS"
echo "─────────────────────────────"

test_step "Git installed" "git --version"
test_step "Node.js installed" "node --version"
test_step "npm installed" "npm --version"
test_step "Docker installed" "docker --version"
test_step "SSH key exists" "test -f $SSH_KEY"

echo ""
echo "2️⃣ SERVER CONNECTIVITY CHECKS"
echo "──────────────────────────────"

test_step "Server is reachable" "ping -c 1 $SERVER_IP"
test_step "SSH port is open" "nc -zv $SERVER_IP 22"
test_step "SSH connection works" "ssh -i $SSH_KEY -o ConnectTimeout=5 $SERVER_USER@$SERVER_IP 'echo ok'"

echo ""
echo "3️⃣ SERVER ENVIRONMENT CHECKS"
echo "─────────────────────────────"

test_step "Docker is running" "ssh -i $SSH_KEY $SERVER_USER@$SERVER_IP 'docker ps'"
test_step "Docker Compose installed" "ssh -i $SSH_KEY $SERVER_USER@$SERVER_IP 'docker-compose --version'"
test_step "Project directory exists" "ssh -i $SSH_KEY $SERVER_USER@$SERVER_IP 'test -d $PROJECT_DIR'"
test_step "Has write permissions" "ssh -i $SSH_KEY $SERVER_USER@$SERVER_IP 'test -w $PROJECT_DIR'"

echo ""
echo "4️⃣ GITHUB CONFIGURATION CHECKS"
echo "───────────────────────────────"

# Check if we're in a git repo
if git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${GREEN}✅${NC} Git repository detected"
    ((PASSED++))
    
    # Check for GitHub remote
    if git remote get-url origin 2>/dev/null | grep -q "github.com"; then
        echo -e "${GREEN}✅${NC} GitHub remote configured"
        ((PASSED++))
    else
        echo -e "${RED}❌${NC} GitHub remote not configured"
        ((FAILED++))
    fi
    
    # Check for workflows
    if [ -d ".github/workflows" ]; then
        workflow_count=$(ls -1 .github/workflows/*.yml 2>/dev/null | wc -l | tr -d ' ')
        echo -e "${GREEN}✅${NC} Workflows found: $workflow_count"
        ((PASSED++))
    else
        echo -e "${RED}❌${NC} No workflows directory found"
        ((FAILED++))
    fi
else
    echo -e "${RED}❌${NC} Not a git repository"
    ((FAILED++))
fi

echo ""
echo "5️⃣ WORKFLOW FILES CHECK"
echo "───────────────────────"

test_step "CI workflow exists" "test -f .github/workflows/ci.yml"
test_step "Deploy workflow exists" "test -f .github/workflows/deploy-production.yml"
test_step "Preview workflow exists" "test -f .github/workflows/preview-deploy.yml"

echo ""
echo "6️⃣ DEPENDENCIES CHECK"
echo "──────────────────────"

test_step "package.json exists" "test -f package.json"
test_step "Dependencies installed" "test -d node_modules"
test_step "Build script exists" "grep -q '\"build\"' package.json"
test_step "Test script exists" "grep -q '\"test\"' package.json"

echo ""
echo "═══════════════════════════════════════"
echo "📊 VERIFICATION SUMMARY"
echo "═══════════════════════════════════════"
echo -e "Tests Passed: ${GREEN}${PASSED}${NC}"
echo -e "Tests Failed: ${RED}${FAILED}${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ ALL CHECKS PASSED!${NC}"
    echo ""
    echo "🚀 Ready for GitHub Actions deployment!"
    echo ""
    echo "Next steps:"
    echo "  1. Push code to GitHub: git push origin main"
    echo "  2. Configure secrets in GitHub repository"
    echo "  3. Create a test PR to trigger CI"
    echo "  4. Monitor workflows in GitHub Actions tab"
    echo ""
    exit 0
else
    echo -e "${RED}❌ SOME CHECKS FAILED!${NC}"
    echo ""
    echo "Please fix the failed checks before proceeding."
    echo "See the documentation for help: docs/guides/GITHUB-ACTIONS-TESTING.md"
    echo ""
    exit 1
fi

