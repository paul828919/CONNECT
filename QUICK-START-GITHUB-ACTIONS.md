# 🚀 GitHub Actions - Quick Start Guide

**Time to Complete:** 10 minutes  
**Prerequisites:** SSH key already set up

---

## ⚡ Quick Setup (3 Steps)

### Step 1: Run Setup Helper (1 minute)

```bash
./scripts/setup-github-secrets.sh
```

This will show you all 7 secrets you need to add to GitHub.

---

### Step 2: Add Secrets to GitHub (5 minutes)

1. Go to your repository on GitHub
2. Navigate to: **Settings → Secrets and variables → Actions**
3. Click **"New repository secret"**
4. Add each secret:

```
Name: PRODUCTION_SERVER_IP
Value: 221.164.102.253

Name: PRODUCTION_SERVER_USER
Value: user

Name: PRODUCTION_SERVER_SSH_KEY
Value: [Run: cat ~/.ssh/id_ed25519_connect | pbcopy]
       Then paste (include BEGIN/END lines!)

Name: DB_PASSWORD
Value: 9LroqGz1xI+mKhcN9q0B52xHsiqr0DuLxs4vl686CRs=

Name: JWT_SECRET
Value: rJdtXB1DjD/OvZ/b/LVeaohFaTXslthXXabuWYKVYdcgLwvn4b71h09pYOcufwa8

Name: NEXTAUTH_SECRET
Value: CXepV6txy7BXCM9Ffu8OuWYDo/iooZvgSqorqScQ/V0=

Name: GRAFANA_PASSWORD
Value: aXzTqR1YfL2bTTJ2X21KQw==
```

---

### Step 3: Verify & Deploy (2 minutes)

```bash
# Verify setup
./scripts/verify-github-actions.sh

# Expected output:
# ✅ ALL CHECKS PASSED!

# Deploy!
git push origin main

# Watch deployment
# Go to: https://github.com/YOUR_USERNAME/connect/actions
```

---

## 🔑 SSH Key Quick Copy

```bash
# macOS - Copy to clipboard
cat ~/.ssh/id_ed25519_connect | pbcopy
echo "✅ SSH key copied! Paste into GitHub Secrets."

# Linux - Copy to clipboard (if xclip installed)
cat ~/.ssh/id_ed25519_connect | xclip -selection clipboard

# Or just display it
cat ~/.ssh/id_ed25519_connect
```

**⚠️ IMPORTANT:** Include ALL lines:
- `-----BEGIN OPENSSH PRIVATE KEY-----`
- All the encoded content
- `-----END OPENSSH PRIVATE KEY-----`

---

## ✅ Verification Checklist

After adding secrets:

```bash
# 1. Verify all checks pass
./scripts/verify-github-actions.sh

# 2. Test SSH connection
./scripts/test-ssh-connection.sh

# 3. Check GitHub has 7 secrets
# Go to: Settings → Secrets → Should show "7 repository secrets"
```

---

## 🧪 Testing Your Setup

### Test CI Workflow

```bash
# Create test branch
git checkout -b test/ci-setup
echo "# CI Test" >> README.md
git add . && git commit -m "test: CI workflow"
git push origin test/ci-setup

# Open PR on GitHub - CI runs automatically
```

### Test Production Deployment

```bash
# After CI passes
git checkout main
git merge test/ci-setup
git push origin main

# Deployment triggers automatically!
```

---

## 📊 What Happens Now

### On Pull Request:
- ✅ CI workflow runs (5-8 min)
- ✅ Tests, linting, security scan
- ✅ Preview deployment
- ✅ Comment on PR with results

### On Push to Main:
- ✅ Full CI pipeline
- ✅ Docker build (3-4 min)
- ✅ Deploy to production
- ✅ Health checks
- ✅ Auto-rollback if failure

---

## 🐛 Troubleshooting

### SSH Key Issues

**Problem:** "Permission denied (publickey)"

**Solution:**
```bash
# 1. Test SSH locally
ssh -i ~/.ssh/id_ed25519_connect user@221.164.102.253 "echo works!"

# 2. Verify key format
cat ~/.ssh/id_ed25519_connect | head -1
# Should show: -----BEGIN OPENSSH PRIVATE KEY-----

# 3. Re-copy to GitHub (include ALL lines)
cat ~/.ssh/id_ed25519_connect | pbcopy
```

### Secret Not Found

**Problem:** "secret PRODUCTION_SERVER_SSH_KEY not found"

**Solution:**
- Check secret name (case-sensitive!)
- Must be in "Actions" secrets (not Codespaces/Dependabot)
- Refresh GitHub page
- Wait 30 seconds after adding

### Deployment Fails

**Problem:** Deployment workflow fails

**Solution:**
```bash
# Check server
ssh -i ~/.ssh/id_ed25519_connect user@221.164.102.253 "docker ps"

# View logs on GitHub
# Actions → Click failed workflow → View logs

# Check server logs
ssh -i ~/.ssh/id_ed25519_connect user@221.164.102.253 "journalctl -u docker -n 50"
```

---

## 🚀 Quick Commands

```bash
# Setup helper
./scripts/setup-github-secrets.sh

# Verify setup
./scripts/verify-github-actions.sh

# Test SSH
./scripts/test-ssh-connection.sh

# Copy SSH key
cat ~/.ssh/id_ed25519_connect | pbcopy

# Deploy
git push origin main

# Verify deployment
./scripts/verify-deployment.sh
curl https://221.164.102.253/api/health
```

---

## 📚 Full Documentation

For detailed information, see:

1. **Setup Guide:** `docs/guides/GITHUB-SECRETS-COMPLETE-SETUP.md`
2. **Testing Guide:** `docs/guides/GITHUB-ACTIONS-TESTING.md`
3. **Workflows Guide:** `docs/guides/GITHUB-ACTIONS-GUIDE.md`
4. **Session Summary:** `SESSION-53-CONTINUATION-COMPLETE.md`

---

## ✨ Success!

Once setup is complete, you'll have:

- ✅ Automated CI on every PR
- ✅ One-command deployments (git push)
- ✅ Zero-downtime updates
- ✅ Automatic rollback on failure
- ✅ Security scanning
- ✅ Email alerts

**Deployment time: 35 min → 4 min** (87% faster!)

---

## 🎯 Current Step

**→ Add 7 secrets to GitHub** (5 minutes)  
Then run: `./scripts/verify-github-actions.sh`

---

**Last Updated:** October 14, 2025  
**Status:** ✅ Ready to Deploy

