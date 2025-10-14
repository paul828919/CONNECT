# GitHub Secrets - Complete Setup Guide

**Date:** October 14, 2025  
**Status:** ✅ Ready to Configure  
**All Values Collected**

---

## 🎯 Quick Setup (5 Minutes)

### Step 1: Navigate to GitHub Secrets

```bash
# Go to your repository on GitHub:
# https://github.com/YOUR_USERNAME/connect

# Then navigate to:
# Settings → Secrets and variables → Actions → New repository secret
```

### Step 2: Add All Secrets

Copy and paste these **exact values** into GitHub Secrets:

---

## 🔐 Required GitHub Secrets

### 1. Server Connection Secrets

#### **PRODUCTION_SERVER_IP**
```
221.164.102.253
```
**Description:** Production server IP address

---

#### **PRODUCTION_SERVER_USER**
```
user
```
**Description:** SSH username for production server

---

#### **PRODUCTION_SERVER_SSH_KEY**

```bash
# Get the private key content:
cat ~/.ssh/id_ed25519_connect
```

**Copy the ENTIRE output** including:
- `-----BEGIN OPENSSH PRIVATE KEY-----`
- All the encoded content
- `-----END OPENSSH PRIVATE KEY-----`

**⚠️ IMPORTANT:** 
- Include the BEGIN and END lines
- Include ALL lines in between
- Do NOT modify or remove any characters
- This is your private SSH key - keep it secret!

**Example format:**
```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtz
c2gtZWQyNTUxOQAAACBxxx...
[many more lines]
...xxxxxx==
-----END OPENSSH PRIVATE KEY-----
```

---

### 2. Database Secrets

#### **DB_PASSWORD**
```
9LroqGz1xI+mKhcN9q0B52xHsiqr0DuLxs4vl686CRs=
```
**Description:** PostgreSQL database password

---

### 3. Application Secrets

#### **JWT_SECRET**
```
rJdtXB1DjD/OvZ/b/LVeaohFaTXslthXXabuWYKVYdcgLwvn4b71h09pYOcufwa8
```
**Description:** JWT token signing secret (from production server)

---

#### **NEXTAUTH_SECRET**
```
CXepV6txy7BXCM9Ffu8OuWYDo/iooZvgSqorqScQ/V0=
```
**Description:** NextAuth.js session secret (from production server)

---

### 4. Monitoring Secrets

#### **GRAFANA_PASSWORD**
```
aXzTqR1YfL2bTTJ2X21KQw==
```
**Description:** Grafana admin password

---

## 📋 Complete Secret Checklist

Use this checklist to ensure all secrets are added:

- [ ] **PRODUCTION_SERVER_IP** = `221.164.102.253`
- [ ] **PRODUCTION_SERVER_USER** = `user`
- [ ] **PRODUCTION_SERVER_SSH_KEY** = [From `~/.ssh/id_ed25519_connect`]
- [ ] **DB_PASSWORD** = `9LroqGz1xI+mKhcN9q0B52xHsiqr0DuLxs=`
- [ ] **JWT_SECRET** = `rJdtXB1DjD/OvZ/b/LVeaohFaTXslthXXabuWYKVYdcgLwvn4b71h09pYOcufwa8`
- [ ] **NEXTAUTH_SECRET** = `CXepV6txy7BXCM9Ffu8OuWYDo/iooZvgSqorqScQ/V0=`
- [ ] **GRAFANA_PASSWORD** = `aXzTqR1YfL2bTTJ2X21KQw==`

**Total Secrets:** 7

---

## 🔧 How to Add SSH Key Secret

### Method 1: Using Terminal (Recommended)

```bash
# 1. Display your private key
cat ~/.ssh/id_ed25519_connect

# 2. Copy the ENTIRE output (Cmd+A, Cmd+C on Mac)

# 3. Go to GitHub → Settings → Secrets → New secret
#    Name: PRODUCTION_SERVER_SSH_KEY
#    Value: [Paste the key]

# 4. Click "Add secret"
```

### Method 2: Using Script

```bash
# Copy key to clipboard (macOS)
cat ~/.ssh/id_ed25519_connect | pbcopy
echo "✅ SSH key copied to clipboard!"
echo "Now paste it into GitHub Secrets as PRODUCTION_SERVER_SSH_KEY"

# Or save to a file temporarily
cat ~/.ssh/id_ed25519_connect > /tmp/ssh_key_for_github.txt
echo "✅ SSH key saved to /tmp/ssh_key_for_github.txt"
echo "Open this file and copy the contents to GitHub"
```

**⚠️ Remember to delete the temporary file after use:**
```bash
rm /tmp/ssh_key_for_github.txt
```

---

## ✅ Verification Steps

### Step 1: Verify SSH Key Format

Your SSH key in GitHub should:
- [ ] Start with `-----BEGIN OPENSSH PRIVATE KEY-----`
- [ ] End with `-----END OPENSSH PRIVATE KEY-----`
- [ ] Have multiple lines of base64-encoded content
- [ ] Have NO extra spaces or characters
- [ ] Match exactly with your local key

### Step 2: Verify All Secrets Are Added

```bash
# Check GitHub secrets count
# Go to: Settings → Secrets and variables → Actions
# You should see: 7 repository secrets
```

### Step 3: Test SSH Connection (Local)

```bash
# Test that your SSH key works
ssh -i ~/.ssh/id_ed25519_connect user@221.164.102.253 "echo 'SSH connection successful!'"

# Expected output:
# SSH connection successful!
```

---

## 🚀 Quick Copy Commands

### For macOS Users:

```bash
# Copy SSH key to clipboard
cat ~/.ssh/id_ed25519_connect | pbcopy
echo "✅ SSH key copied! Paste into GitHub Secrets."

# Verify it's copied correctly
pbpaste | head -1
# Should show: -----BEGIN OPENSSH PRIVATE KEY-----

pbpaste | tail -1
# Should show: -----END OPENSSH PRIVATE KEY-----
```

### For Linux Users:

```bash
# Copy SSH key to clipboard (if xclip is installed)
cat ~/.ssh/id_ed25519_connect | xclip -selection clipboard
echo "✅ SSH key copied! Paste into GitHub Secrets."

# Or just display it
cat ~/.ssh/id_ed25519_connect
```

---

## 🔒 Security Best Practices

### DO ✅

- ✅ Use SSH key authentication (more secure than password)
- ✅ Keep private keys private (never commit to Git)
- ✅ Use strong, unique secrets for production
- ✅ Rotate secrets periodically (every 90 days)
- ✅ Use different secrets for dev/staging/production
- ✅ Enable 2FA on your GitHub account
- ✅ Restrict repository access

### DON'T ❌

- ❌ Share private keys via email/chat
- ❌ Commit secrets to Git
- ❌ Use the same secrets in multiple environments
- ❌ Use weak or default secrets
- ❌ Store secrets in plain text files
- ❌ Share secrets with unauthorized people
- ❌ Use password authentication when SSH key is available

---

## 🐛 Troubleshooting

### Problem: SSH Key Not Working

**Symptoms:**
- Deployment fails with "Permission denied (publickey)"
- SSH authentication errors

**Solutions:**

```bash
# 1. Verify key format
cat ~/.ssh/id_ed25519_connect | head -1
# Should show: -----BEGIN OPENSSH PRIVATE KEY-----

# 2. Check if key is authorized on server
ssh -i ~/.ssh/id_ed25519_connect user@221.164.102.253 "cat ~/.ssh/authorized_keys"
# Should contain your public key

# 3. Test connection manually
ssh -v -i ~/.ssh/id_ed25519_connect user@221.164.102.253
# Look for "Authentication succeeded (publickey)"

# 4. Verify GitHub secret has correct format
# - No extra spaces
# - Complete key (BEGIN to END)
# - Exact match with local key
```

### Problem: Secret Not Found

**Symptoms:**
- Workflow fails with "secret PRODUCTION_SERVER_SSH_KEY not found"

**Solutions:**

```bash
# 1. Check secret name (case-sensitive)
#    Must be exactly: PRODUCTION_SERVER_SSH_KEY
#    Not: production_server_ssh_key

# 2. Verify in correct location
#    Settings → Secrets and variables → Actions (not Codespaces, not Dependabot)

# 3. Check repository
#    Must be in YOUR repository, not a fork

# 4. Wait a moment
#    GitHub may take a few seconds to propagate secrets
```

### Problem: Deployment Fails

**Symptoms:**
- Workflow runs but deployment fails
- Connection timeout or refused

**Solutions:**

```bash
# 1. Verify server is accessible
ping 221.164.102.253

# 2. Check SSH port
nc -zv 221.164.102.253 22

# 3. Verify Docker is running on server
ssh -i ~/.ssh/id_ed25519_connect user@221.164.102.253 "docker ps"

# 4. Check server logs
ssh -i ~/.ssh/id_ed25519_connect user@221.164.102.253 "tail -f /var/log/syslog"
```

---

## 🧪 Testing Secrets

### Test Script

Create a test file: `test-secrets.sh`

```bash
#!/bin/bash

echo "🧪 Testing GitHub Secrets Setup..."
echo ""

# Test SSH connection
echo "1️⃣ Testing SSH connection..."
if ssh -i ~/.ssh/id_ed25519_connect user@221.164.102.253 "echo 'Connected!'" &>/dev/null; then
    echo "✅ SSH connection successful!"
else
    echo "❌ SSH connection failed!"
    exit 1
fi

# Test server accessibility
echo ""
echo "2️⃣ Testing server accessibility..."
if ping -c 1 221.164.102.253 &>/dev/null; then
    echo "✅ Server is reachable!"
else
    echo "❌ Server is unreachable!"
    exit 1
fi

# Test Docker on server
echo ""
echo "3️⃣ Testing Docker on server..."
if ssh -i ~/.ssh/id_ed25519_connect user@221.164.102.253 "docker --version" &>/dev/null; then
    echo "✅ Docker is available!"
else
    echo "❌ Docker is not available!"
    exit 1
fi

# Test project directory
echo ""
echo "4️⃣ Testing project directory..."
if ssh -i ~/.ssh/id_ed25519_connect user@221.164.102.253 "test -d /opt/connect" &>/dev/null; then
    echo "✅ Project directory exists!"
else
    echo "❌ Project directory not found!"
    echo "ℹ️  Creating /opt/connect..."
    ssh -i ~/.ssh/id_ed25519_connect user@221.164.102.253 "sudo mkdir -p /opt/connect && sudo chown user:user /opt/connect"
fi

echo ""
echo "✅ All tests passed! Ready for GitHub Actions deployment."
```

### Run Test:

```bash
chmod +x test-secrets.sh
./test-secrets.sh
```

---

## 📊 Secret Reference Table

| Secret Name | Type | Used In | Purpose |
|-------------|------|---------|---------|
| `PRODUCTION_SERVER_IP` | String | All workflows | Server IP address |
| `PRODUCTION_SERVER_USER` | String | All workflows | SSH username |
| `PRODUCTION_SERVER_SSH_KEY` | Private Key | All workflows | SSH authentication |
| `DB_PASSWORD` | String | Application | Database access |
| `JWT_SECRET` | String | Application | Token signing |
| `NEXTAUTH_SECRET` | String | Application | Session encryption |
| `GRAFANA_PASSWORD` | String | Monitoring | Grafana access |

---

## 🎯 Next Steps

### After Adding All Secrets:

1. **Verify Secrets Count**
   ```bash
   # Go to GitHub → Settings → Secrets
   # Should show: 7 repository secrets
   ```

2. **Test Workflows**
   ```bash
   # Create a test branch
   git checkout -b test/ci-setup
   git push origin test/ci-setup
   
   # Open a PR - CI should run automatically
   ```

3. **Monitor First Deployment**
   ```bash
   # After secrets are configured
   git checkout main
   git push origin main
   
   # Watch GitHub Actions tab for deployment
   ```

4. **Verify Deployment**
   ```bash
   # Check production
   curl https://221.164.102.253/api/health
   
   # Should return: {"status":"ok"}
   ```

---

## 🔄 Updating Secrets

### When to Update:

- Every 90 days (routine rotation)
- After a security incident
- When team member leaves
- If secret is compromised

### How to Update:

```bash
# 1. Go to GitHub → Settings → Secrets
# 2. Click on secret name (e.g., JWT_SECRET)
# 3. Click "Update"
# 4. Enter new value
# 5. Click "Update secret"

# 6. Re-deploy to apply changes
git tag -a secret-rotation-$(date +%Y%m%d) -m "Secret rotation"
git push origin main
```

---

## 📱 Quick Reference Card

```
┌─────────────────────────────────────────────────┐
│           GITHUB SECRETS QUICK REF              │
├─────────────────────────────────────────────────┤
│                                                 │
│  📍 Location:                                   │
│     Settings → Secrets and variables → Actions │
│                                                 │
│  🔢 Total Secrets: 7                           │
│                                                 │
│  🔑 Server Access (3):                         │
│     - PRODUCTION_SERVER_IP                     │
│     - PRODUCTION_SERVER_USER                   │
│     - PRODUCTION_SERVER_SSH_KEY                │
│                                                 │
│  💾 Database (1):                              │
│     - DB_PASSWORD                              │
│                                                 │
│  🔐 Application (2):                           │
│     - JWT_SECRET                               │
│     - NEXTAUTH_SECRET                          │
│                                                 │
│  📊 Monitoring (1):                            │
│     - GRAFANA_PASSWORD                         │
│                                                 │
│  ✅ Test Connection:                           │
│     ssh -i ~/.ssh/id_ed25519_connect \        │
│         user@221.164.102.253                   │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## ✅ Completion Checklist

Before proceeding to testing:

### Secrets Configuration
- [ ] All 7 secrets added to GitHub
- [ ] SSH key format verified (BEGIN/END lines present)
- [ ] Secret names match exactly (case-sensitive)
- [ ] No extra spaces or characters in values

### Server Verification
- [ ] SSH connection tested manually
- [ ] Server accessible (ping successful)
- [ ] Docker installed and running
- [ ] `/opt/connect` directory exists

### GitHub Configuration
- [ ] Repository secrets (not Codespaces/Dependabot)
- [ ] Correct repository (not a fork)
- [ ] Admin access to repository
- [ ] Workflows enabled in repository settings

### Ready for Deployment
- [ ] All secrets verified
- [ ] Test script passed
- [ ] Workflows reviewed
- [ ] Team notified (if applicable)

---

## 🎉 Success!

Once all secrets are configured:

```bash
# Your workflows will now:
✅ Authenticate to production server via SSH
✅ Deploy automatically on push to main
✅ Run tests on every PR
✅ Create preview environments
✅ Send email alerts
✅ Perform zero-downtime deployments

# No more manual deployments! 🚀
```

---

## 📞 Support

**If you encounter issues:**

1. Review this guide
2. Check troubleshooting section
3. Run test script
4. Verify all secrets
5. Check GitHub Actions logs

**Common Issues:**
- SSH key format → Must include BEGIN/END lines
- Secret name → Case-sensitive, must match exactly
- Server access → Verify IP and SSH key work locally

---

**Ready to automate your deployments!** 🚀

**Last Updated:** October 14, 2025  
**Status:** ✅ Production Ready

