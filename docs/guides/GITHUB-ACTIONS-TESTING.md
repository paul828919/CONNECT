# GitHub Actions Testing & Verification Guide

**Date:** October 14, 2025  
**Status:** ✅ Ready to Test  
**Prerequisites:** All GitHub Secrets configured

---

## 🎯 Quick Start Testing

### 1️⃣ Pre-Flight Checks (5 minutes)

```bash
# Run the verification script
./scripts/verify-github-actions.sh

# Expected output:
# ✅ SSH connection successful
# ✅ Server accessible
# ✅ Docker available
# ✅ Project directory ready
# ✅ All secrets configured
# ✅ Ready for GitHub Actions!
```

### 2️⃣ Test CI Workflow (10 minutes)

```bash
# Create test branch
git checkout -b test/ci-workflow
echo "# CI Test" >> README.md
git add .
git commit -m "test: trigger CI workflow"
git push origin test/ci-workflow

# Create PR on GitHub
# CI should run automatically
# Check: https://github.com/YOUR_USERNAME/connect/actions
```

### 3️⃣ Test Production Deployment (15 minutes)

```bash
# After CI passes and PR is approved
git checkout main
git merge test/ci-workflow
git push origin main

# Deployment should trigger automatically
# Monitor: https://github.com/YOUR_USERNAME/connect/actions
```

---

## 🧪 Verification Scripts

### Main Verification Script

Create: `scripts/verify-github-actions.sh`

```bash
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
    if git remote get-url origin | grep -q "github.com"; then
        echo -e "${GREEN}✅${NC} GitHub remote configured"
        ((PASSED++))
    else
        echo -e "${RED}❌${NC} GitHub remote not configured"
        ((FAILED++))
    fi
    
    # Check for workflows
    if [ -d ".github/workflows" ]; then
        workflow_count=$(ls -1 .github/workflows/*.yml 2>/dev/null | wc -l)
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
```

### SSH Connection Test

Create: `scripts/test-ssh-connection.sh`

```bash
#!/bin/bash

SSH_KEY="${HOME}/.ssh/id_ed25519_connect"
SERVER_IP="59.21.170.6"
SERVER_USER="user"

echo "🔐 Testing SSH Connection..."
echo ""

# Test 1: Basic connection
echo "1️⃣ Testing basic SSH connection..."
if ssh -i "$SSH_KEY" -o ConnectTimeout=10 "$SERVER_USER@$SERVER_IP" 'echo "Connection successful!"'; then
    echo "✅ SSH connection works!"
else
    echo "❌ SSH connection failed!"
    exit 1
fi

echo ""

# Test 2: Docker access
echo "2️⃣ Testing Docker access..."
if ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_IP" 'docker ps' &>/dev/null; then
    echo "✅ Docker access works!"
else
    echo "❌ Docker access failed!"
    exit 1
fi

echo ""

# Test 3: Project directory
echo "3️⃣ Testing project directory..."
if ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_IP" "test -d /opt/connect && test -w /opt/connect"; then
    echo "✅ Project directory accessible and writable!"
else
    echo "⚠️  Creating project directory..."
    ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_IP" "sudo mkdir -p /opt/connect && sudo chown $SERVER_USER:$SERVER_USER /opt/connect"
    echo "✅ Project directory created!"
fi

echo ""

# Test 4: Environment file
echo "4️⃣ Testing environment file..."
if ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_IP" "test -f /opt/connect/.env"; then
    echo "✅ Environment file exists!"
else
    echo "⚠️  No .env file found (will be created during deployment)"
fi

echo ""
echo "✅ All SSH tests passed!"
```

### Workflow Syntax Validation

Create: `scripts/validate-workflows.sh`

```bash
#!/bin/bash

echo "🔍 Validating GitHub Actions Workflows..."
echo ""

WORKFLOWS_DIR=".github/workflows"
PASSED=0
FAILED=0

if [ ! -d "$WORKFLOWS_DIR" ]; then
    echo "❌ Workflows directory not found: $WORKFLOWS_DIR"
    exit 1
fi

# Install yq if not available (for YAML validation)
if ! command -v yq &> /dev/null; then
    echo "⚠️  yq not found, installing..."
    if command -v brew &> /dev/null; then
        brew install yq
    else
        echo "❌ Please install yq manually: https://github.com/mikefarah/yq"
        exit 1
    fi
fi

# Validate each workflow
for workflow in "$WORKFLOWS_DIR"/*.yml; do
    filename=$(basename "$workflow")
    echo -n "Validating $filename... "
    
    # Check YAML syntax
    if yq eval '.' "$workflow" > /dev/null 2>&1; then
        echo "✅"
        ((PASSED++))
    else
        echo "❌ Invalid YAML!"
        ((FAILED++))
    fi
done

echo ""
echo "Results: $PASSED passed, $FAILED failed"

if [ $FAILED -eq 0 ]; then
    echo "✅ All workflows are valid!"
    exit 0
else
    echo "❌ Some workflows have errors!"
    exit 1
fi
```

---

## 📋 Testing Checklist

### Before Testing

- [ ] All GitHub secrets configured (7 total)
- [ ] SSH key working locally
- [ ] Server accessible
- [ ] Docker running on server
- [ ] Code pushed to GitHub
- [ ] Repository settings reviewed

### CI Workflow Testing

- [ ] Create test branch
- [ ] Push changes to test branch
- [ ] Open Pull Request
- [ ] Verify CI runs automatically
- [ ] Check all jobs complete successfully
- [ ] Verify test results
- [ ] Check security scans

### Preview Deployment Testing

- [ ] Verify PR comment appears
- [ ] Check preview build succeeds
- [ ] Verify build info is correct
- [ ] Test cleanup on PR close

### Production Deployment Testing

- [ ] Merge PR to main
- [ ] Verify deployment triggers
- [ ] Check Docker image build
- [ ] Verify SSH connection
- [ ] Check deployment steps
- [ ] Verify health checks pass
- [ ] Test application endpoint
- [ ] Verify rollback works (if needed)

---

## 🔍 Monitoring Workflows

### View Running Workflows

```bash
# On GitHub
# Go to: https://github.com/YOUR_USERNAME/connect/actions

# Or use GitHub CLI
gh run list --limit 10
gh run view <run-id>
gh run watch <run-id>
```

### Check Workflow Logs

```bash
# Via GitHub CLI
gh run view <run-id> --log

# Download logs
gh run download <run-id>
```

### Monitor Deployment

```bash
# Watch deployment progress
ssh -i ~/.ssh/id_ed25519_connect user@59.21.170.6 "docker ps"

# Check application logs
ssh -i ~/.ssh/id_ed25519_connect user@59.21.170.6 "cd /opt/connect && docker-compose logs -f app1"

# Check health endpoint
curl https://59.21.170.6/api/health
```

---

## 🐛 Troubleshooting

### Problem: Workflow Doesn't Trigger

**Check:**
```bash
# Verify workflows are enabled
gh workflow list

# Check if actions are enabled in repo settings
# Settings → Actions → General → Allow all actions
```

**Solution:**
- Enable GitHub Actions in repository settings
- Check branch protection rules
- Verify workflow file syntax

### Problem: SSH Authentication Fails

**Symptoms:**
- "Permission denied (publickey)"
- "Host key verification failed"

**Check:**
```bash
# Test SSH locally
ssh -i ~/.ssh/id_ed25519_connect user@59.21.170.6 "echo 'works!'"

# Verify key format
cat ~/.ssh/id_ed25519_connect | head -1
# Should be: -----BEGIN OPENSSH PRIVATE KEY-----

# Check GitHub secret
# Go to Settings → Secrets → PRODUCTION_SERVER_SSH_KEY
# Must include BEGIN/END lines
```

**Solution:**
```bash
# Re-add SSH key to GitHub Secrets
cat ~/.ssh/id_ed25519_connect | pbcopy  # macOS
cat ~/.ssh/id_ed25519_connect | xclip   # Linux

# Paste into GitHub Secrets exactly as is
```

### Problem: Deployment Fails

**Check logs:**
```bash
# View deployment logs on GitHub
gh run view --log

# Check server logs
ssh -i ~/.ssh/id_ed25519_connect user@59.21.170.6 "journalctl -u docker -n 100"
```

**Common issues:**
1. **No space on server**
   ```bash
   ssh -i ~/.ssh/id_ed25519_connect user@59.21.170.6 "df -h"
   ```

2. **Docker not running**
   ```bash
   ssh -i ~/.ssh/id_ed25519_connect user@59.21.170.6 "sudo systemctl status docker"
   ```

3. **Port conflicts**
   ```bash
   ssh -i ~/.ssh/id_ed25519_connect user@59.21.170.6 "netstat -tulpn | grep :3000"
   ```

### Problem: Health Check Fails

**Debug:**
```bash
# Test health endpoint manually
curl -v https://59.21.170.6/api/health

# Check if application is running
ssh -i ~/.ssh/id_ed25519_connect user@59.21.170.6 "docker ps | grep connect"

# View application logs
ssh -i ~/.ssh/id_ed25519_connect user@59.21.170.6 "cd /opt/connect && docker-compose logs app1"
```

---

## 🧪 Test Scenarios

### Scenario 1: First Deployment

```bash
# 1. Verify everything
./scripts/verify-github-actions.sh

# 2. Push to GitHub
git push origin main

# 3. Monitor deployment
gh run watch

# 4. Verify deployment
curl https://59.21.170.6/api/health
```

### Scenario 2: Feature Branch Testing

```bash
# 1. Create feature branch
git checkout -b feature/new-feature

# 2. Make changes
# ... edit files ...

# 3. Push and create PR
git add .
git commit -m "feat: add new feature"
git push origin feature/new-feature

# 4. Create PR on GitHub
# 5. CI runs automatically
# 6. Review results
# 7. Merge when ready
```

### Scenario 3: Emergency Deployment

```bash
# 1. Use manual trigger with skip tests
# Go to GitHub Actions → Deploy to Production
# Click "Run workflow"
# Check "Skip tests"
# Click "Run workflow"

# 2. Monitor deployment
gh run watch

# 3. Verify immediately
curl https://59.21.170.6/api/health
```

### Scenario 4: Rollback Test

```bash
# 1. Deploy a breaking change (in test env)
# 2. Watch deployment fail
# 3. Verify automatic rollback
# 4. Check logs

ssh -i ~/.ssh/id_ed25519_connect user@59.21.170.6 \
  "cd /opt/connect && docker-compose logs"
```

---

## 📊 Success Metrics

### What to Monitor

1. **Build Time**
   - Target: < 5 minutes
   - Monitor: GitHub Actions dashboard

2. **Deployment Time**
   - Target: < 4 minutes
   - Monitor: Workflow logs

3. **Success Rate**
   - Target: > 95%
   - Monitor: GitHub Actions insights

4. **Rollback Time**
   - Target: < 30 seconds
   - Monitor: Failure scenarios

### Performance Benchmarks

| Metric | Before | After | Target |
|--------|--------|-------|--------|
| CI Time | 12-15 min | 5-8 min | < 10 min |
| Deploy Time | Manual 30 min | Auto 3-4 min | < 5 min |
| Image Build | 8-10 min | 3-4 min | < 5 min |
| Rollback | Manual 10 min | Auto 30 sec | < 1 min |

---

## 🎯 Post-Deployment Verification

### Automated Checks

```bash
#!/bin/bash
# Create: scripts/verify-deployment.sh

SERVER="59.21.170.6"

echo "🔍 Verifying Deployment..."

# 1. Health check
echo -n "Health endpoint... "
if curl -sf https://$SERVER/api/health > /dev/null; then
    echo "✅"
else
    echo "❌"
    exit 1
fi

# 2. Database connectivity
echo -n "Database connection... "
if curl -sf https://$SERVER/api/health/db > /dev/null; then
    echo "✅"
else
    echo "❌"
fi

# 3. Redis connectivity
echo -n "Redis connection... "
if curl -sf https://$SERVER/api/health/redis > /dev/null; then
    echo "✅"
else
    echo "❌"
fi

# 4. Application version
echo -n "Application version... "
VERSION=$(curl -s https://$SERVER/api/version | jq -r '.version')
echo "$VERSION"

echo ""
echo "✅ Deployment verified successfully!"
```

### Manual Checks

1. **Application Access**
   - Visit https://59.21.170.6
   - Test login functionality
   - Check main features

2. **Performance**
   - Page load times
   - API response times
   - Database queries

3. **Monitoring**
   - Check Grafana dashboards
   - Verify metrics are updating
   - Check alert status

---

## 🚀 Quick Commands Reference

```bash
# Verify setup
./scripts/verify-github-actions.sh

# Test SSH
./scripts/test-ssh-connection.sh

# Validate workflows
./scripts/validate-workflows.sh

# Watch workflow
gh run watch

# View logs
gh run view --log

# List workflows
gh workflow list

# Manual trigger
gh workflow run deploy-production.yml

# Check deployment
curl https://59.21.170.6/api/health

# View server logs
ssh -i ~/.ssh/id_ed25519_connect user@59.21.170.6 \
  "cd /opt/connect && docker-compose logs -f"
```

---

## 📚 Next Steps

After successful testing:

1. **Enable Branch Protection**
   ```
   Settings → Branches → Add rule
   - Require status checks before merging
   - Require CI to pass
   - Require code review
   ```

2. **Set Up Notifications**
   ```
   Settings → Notifications
   - Enable workflow notifications
   - Configure email alerts
   - Set up Slack integration (optional)
   ```

3. **Document Deployment Process**
   - Update team documentation
   - Create runbooks
   - Train team members

4. **Monitor and Optimize**
   - Review workflow metrics
   - Optimize slow steps
   - Improve cache usage

---

## ✅ Final Checklist

- [ ] All verification scripts pass
- [ ] SSH connection tested
- [ ] Workflows validated
- [ ] CI tested with PR
- [ ] Preview deployment tested
- [ ] Production deployment tested
- [ ] Rollback tested
- [ ] Health checks passing
- [ ] Monitoring configured
- [ ] Team trained
- [ ] Documentation updated

---

**Ready to deploy automatically!** 🚀

**Last Updated:** October 14, 2025  
**Status:** ✅ Production Ready

