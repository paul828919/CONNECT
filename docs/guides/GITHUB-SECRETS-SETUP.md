# GitHub Secrets Setup Guide

**Date:** October 14, 2025  
**For:** Connect Platform CI/CD Automation

---

## 🔐 Required GitHub Secrets

To enable automated deployments, you need to configure the following secrets in your GitHub repository.

### **How to Add Secrets**

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret below

---

## 📋 Production Deployment Secrets

### **1. PRODUCTION_SERVER_IP**

**Value:** `59.21.170.6`

**Purpose:** IP address of your production server

```bash
# To verify:
ping 59.21.170.6
```

### **2. PRODUCTION_SERVER_USER**

**Value:** `user`

**Purpose:** SSH username for production server

### **3. PRODUCTION_SERVER_PASSWORD**

**Value:** `iw237877^^`

**Purpose:** SSH password for production server authentication

**⚠️ Security Note:** For better security, consider using SSH keys instead of passwords. See [SSH Key Setup](#ssh-key-setup-recommended) below.

---

## 🔑 Application Secrets

These secrets are already in your production `.env` file. To retrieve them:

```bash
# SSH to production server
ssh user@59.21.170.6

# View environment variables
cat /opt/connect/.env
```

### **4. DB_PASSWORD**

**Get value from:**
```bash
ssh user@59.21.170.6 'cat /opt/connect/.env | grep DB_PASSWORD'
```

**Expected format:** Base64 encoded string

**Purpose:** PostgreSQL database password

### **5. JWT_SECRET**

**Get value from:**
```bash
ssh user@59.21.170.6 'cat /opt/connect/.env | grep JWT_SECRET'
```

**Purpose:** JWT token signing secret

### **6. NEXTAUTH_SECRET**

**Get value from:**
```bash
ssh user@59.21.170.6 'cat /opt/connect/.env | grep NEXTAUTH_SECRET'
```

**Purpose:** NextAuth.js session encryption secret

### **7. GRAFANA_PASSWORD**

**Get value from:**
```bash
ssh user@59.21.170.6 'cat /opt/connect/.env | grep GRAFANA_PASSWORD'
```

**Value:** `aXzTqR1YfL2bTTJ2X21KQw==`

**Purpose:** Grafana admin password

---

## 🔧 Optional Secrets

### **8. CODECOV_TOKEN** (Optional)

**Purpose:** Upload test coverage to Codecov

**How to get:**
1. Sign up at https://codecov.io
2. Add your repository
3. Copy the upload token

### **9. SLACK_WEBHOOK_URL** (Optional)

**Purpose:** Send deployment notifications to Slack

**How to get:**
1. Go to https://api.slack.com/apps
2. Create new app → Incoming Webhooks
3. Activate and add to channel
4. Copy webhook URL

---

## 🔒 SSH Key Setup (Recommended)

For better security, use SSH keys instead of passwords:

### **Step 1: Generate SSH Key (on your machine)**

```bash
ssh-keygen -t ed25519 -C "github-actions@connect" -f ~/.ssh/github_actions_connect
```

### **Step 2: Copy Public Key to Production**

```bash
# Method 1: Using ssh-copy-id
ssh-copy-id -i ~/.ssh/github_actions_connect.pub user@59.21.170.6

# Method 2: Manual
cat ~/.ssh/github_actions_connect.pub | \
  ssh user@59.21.170.6 'mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys'
```

### **Step 3: Add Private Key to GitHub Secrets**

```bash
# Copy private key content
cat ~/.ssh/github_actions_connect

# Add to GitHub as: PRODUCTION_SERVER_SSH_KEY
```

### **Step 4: Update Workflow**

Replace password authentication with key-based auth in `.github/workflows/deploy-production.yml`:

```yaml
- name: Setup SSH
  run: |
    mkdir -p ~/.ssh
    echo "${{ secrets.PRODUCTION_SERVER_SSH_KEY }}" > ~/.ssh/id_ed25519
    chmod 600 ~/.ssh/id_ed25519
    ssh-keyscan -H ${{ secrets.PRODUCTION_SERVER_IP }} >> ~/.ssh/known_hosts

- name: Deploy to production
  run: |
    ssh ${{ secrets.PRODUCTION_SERVER_USER }}@${{ secrets.PRODUCTION_SERVER_IP }} << 'EOF'
      # deployment commands
    EOF
```

---

## ✅ Verification Checklist

Before running workflows, verify all secrets are set:

### **Required for Deployment:**
- [ ] PRODUCTION_SERVER_IP
- [ ] PRODUCTION_SERVER_USER  
- [ ] PRODUCTION_SERVER_PASSWORD (or PRODUCTION_SERVER_SSH_KEY)
- [ ] DB_PASSWORD
- [ ] JWT_SECRET
- [ ] NEXTAUTH_SECRET

### **Optional:**
- [ ] GRAFANA_PASSWORD
- [ ] CODECOV_TOKEN
- [ ] SLACK_WEBHOOK_URL

---

## 🧪 Testing Secrets

### **Test Connection to Production**

```bash
# Using GitHub Actions (manual trigger)
# Go to Actions → Deploy to Production → Run workflow
# Select "Skip tests" for quick connection test
```

### **Test Locally (Simulate CI/CD)**

```bash
# Export secrets locally
export PRODUCTION_SERVER_IP="59.21.170.6"
export PRODUCTION_SERVER_USER="user"
export PRODUCTION_SERVER_PASSWORD="iw237877^^"

# Test SSH connection
sshpass -p "$PRODUCTION_SERVER_PASSWORD" ssh \
  $PRODUCTION_SERVER_USER@$PRODUCTION_SERVER_IP 'echo "Connection successful!"'
```

---

## 🚨 Security Best Practices

### **1. Rotate Secrets Regularly**

```bash
# Rotate every 90 days
# Update both GitHub and production .env
```

### **2. Use Environment-Specific Secrets**

- Development secrets (for testing)
- Staging secrets (if you have staging)
- Production secrets (most sensitive)

### **3. Audit Secret Usage**

```bash
# Check GitHub Actions logs
# Review who has access to secrets
# Monitor secret usage patterns
```

### **4. Never Commit Secrets**

```bash
# Add to .gitignore
.env*
secrets/
*.key
*.pem
```

### **5. Use GitHub Environments**

For additional protection, use GitHub Environments:

1. Go to **Settings** → **Environments**
2. Create "production" environment
3. Add protection rules:
   - Required reviewers
   - Wait timer
   - Deployment branches

---

## 📝 Quick Reference

### **Add Secret Command**

```bash
# Using GitHub CLI (if installed)
gh secret set SECRET_NAME --body "secret_value"

# Or manually via GitHub UI
# Settings → Secrets and variables → Actions → New repository secret
```

### **List All Secrets**

```bash
# Using GitHub CLI
gh secret list

# Output:
# PRODUCTION_SERVER_IP
# PRODUCTION_SERVER_USER
# PRODUCTION_SERVER_PASSWORD
# DB_PASSWORD
# JWT_SECRET
# NEXTAUTH_SECRET
```

### **Update Secret**

```bash
# GitHub UI: Same as adding, it will overwrite

# GitHub CLI:
gh secret set SECRET_NAME --body "new_value"
```

### **Delete Secret**

```bash
# GitHub CLI:
gh secret delete SECRET_NAME

# GitHub UI: Click "Remove" next to secret
```

---

## 🔗 Related Documentation

- [GitHub Actions Workflows](.github/workflows/)
- [Production Deployment Guide](./DEPLOYMENT-GUIDE.md)
- [Security Credentials Guide](../../SECURITY-CREDENTIALS-GUIDE.md)

---

## ❓ Troubleshooting

### **Problem: Workflow fails with "Secret not found"**

**Solution:**
1. Check secret name matches exactly (case-sensitive)
2. Verify secret is added to repository (not organization)
3. Check if using environment-specific secrets

### **Problem: SSH connection fails**

**Solution:**
```bash
# Test connection manually
ssh user@59.21.170.6

# Check firewall
ssh user@59.21.170.6 'sudo ufw status'

# Verify SSH service
ssh user@59.21.170.6 'sudo systemctl status ssh'
```

### **Problem: Secrets not updating in workflow**

**Solution:**
- Secrets are cached briefly
- Re-run workflow after 1-2 minutes
- Force refresh by updating secret value

---

**Last Updated:** October 14, 2025  
**Status:** Active Configuration Guide

