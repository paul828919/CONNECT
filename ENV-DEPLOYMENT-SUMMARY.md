# 📦 Environment Variables Deployment - Complete Setup

**Date**: October 14, 2025  
**Status**: ✅ **READY TO USE**

---

## 🎯 **Your Question Answered**

> **"When the contents of my local .env file are updated, how should I deploy to production?"**

### **Answer:**

**Use the automated sync script for API keys and credentials:**

```bash
./scripts/sync-env-to-production.sh
```

**This is safe because:**
- ✅ Only syncs API keys and OAuth credentials
- ✅ NEVER syncs database URLs or secrets (they should be different)
- ✅ Shows preview before making changes
- ✅ Automatically restarts containers
- ✅ Includes verification

---

## 🛠️ **Tools Created for You**

### **1. Automated Deployment Script** ✨
```bash
./scripts/sync-env-to-production.sh
```

**What it does:**
- Safely syncs: NTIS_API_KEY, OAuth credentials, payment keys
- Protects: DATABASE_URL, JWT_SECRET, NEXTAUTH_URL, etc.
- Shows preview and asks for confirmation
- Automatically restarts containers
- Verifies deployment

### **2. Verification Scripts**
```bash
# Verify NTIS API key specifically
./scripts/verify-ntis-key.sh

# Verify all environment variables
./scripts/verify-production-env.sh
```

### **3. Documentation**
- ✅ `ENV-DEPLOYMENT-GUIDE.md` - Complete deployment guide
- ✅ `ENV-DEPLOYMENT-WORKFLOW.md` - Simple visual workflow
- ✅ `ENV-DEPLOYMENT-SUMMARY.md` - This summary
- ✅ `NTIS-QUICK-REFERENCE.md` - NTIS-specific reference
- ✅ `SESSION-ENV-NTIS-COMPLETE.md` - Today's session details

---

## 🚀 **How to Use - Step by Step**

### **When You Update API Keys in Local .env:**

```bash
# Step 1: Update local .env file
nano .env
# Example: Change NTIS_API_KEY=new_production_key

# Step 2: Run the sync script
./scripts/sync-env-to-production.sh

# Step 3: Review the preview
# The script shows what will be synced and what's protected

# Step 4: Confirm (y/n)
# Type 'y' to proceed

# Step 5: Automatic deployment
# Script updates production, restarts containers, verifies

# Step 6: Verify (optional but recommended)
./scripts/verify-ntis-key.sh
```

**That's it!** 🎉

---

## 📊 **What Gets Synced vs Protected**

### **✅ Synced Automatically (Safe):**
```
NTIS_API_KEY          → Production uses same key
KAKAO_CLIENT_ID       → OAuth credentials
KAKAO_CLIENT_SECRET   → OAuth credentials
NAVER_CLIENT_ID       → OAuth credentials
NAVER_CLIENT_SECRET   → OAuth credentials
TOSS_CLIENT_KEY       → Payment credentials
TOSS_SECRET_KEY       → Payment credentials
SENTRY_DSN            → Monitoring
GRAFANA_PASSWORD      → Can be same
```

### **🔒 Protected (Never Synced):**
```
DATABASE_URL          → localhost:6432 ≠ postgres:5432
REDIS_CACHE_URL       → localhost:6379 ≠ redis-cache:6379
REDIS_QUEUE_URL       → localhost:6380 ≠ redis-queue:6379
NEXTAUTH_URL          → localhost:3000 ≠ https://connectplt.kr
JWT_SECRET            → Dev value ≠ Production value (security)
NEXTAUTH_SECRET       → Dev value ≠ Production value (security)
DB_PASSWORD           → Simple ≠ Strong production password
ENCRYPTION_KEY        → Dev key ≠ Production key (security)
```

---

## 🎓 **Key Concepts**

### **1. Local .env ≠ Production .env (This is Correct!)**

| Aspect | Local (Mac) | Production (Server) |
|--------|-------------|---------------------|
| **Purpose** | Development | Deployment |
| **Database** | `localhost:6432` | `postgres:5432` |
| **Redis** | `localhost:6379` | `redis-cache:6379` |
| **URL** | `http://localhost:3000` | `https://connectplt.kr` |
| **API Keys** | ✅ Same production key | ✅ Same production key |
| **Secrets** | ❌ Dev values | ✅ Strong prod values |

### **2. Why NOT Deploy Entire .env File?**

```bash
# ❌ WRONG - This breaks production!
scp .env connect-prod:/opt/connect/.env

# Why it's wrong:
# 1. Your local uses localhost:6432
#    Production needs postgres:5432
# 2. Different network, different config
# 3. Would break all database connections!
```

### **3. CI/CD Does NOT Deploy .env**

```
Git Repository
├── app/                 ✅ Deployed via CI/CD
├── lib/                 ✅ Deployed via CI/CD
├── components/          ✅ Deployed via CI/CD
├── .env                 ❌ NOT in git (.gitignore)
└── .env.example         ✅ Template only

Secrets Management:
├── Local .env           → Manual (on your Mac)
├── Production .env      → Manual (on server)
└── Sync tool           → ./scripts/sync-env-to-production.sh
```

---

## 📝 **Common Scenarios**

### **Scenario 1: New NTIS API Key**
```bash
# 1. Update local .env
nano .env  # NTIS_API_KEY=new_key

# 2. Deploy
./scripts/sync-env-to-production.sh

# 3. Verify
./scripts/verify-ntis-key.sh
```

### **Scenario 2: Added Toss Payment**
```bash
# 1. Add to local .env
echo "TOSS_CLIENT_KEY=xxx" >> .env
echo "TOSS_SECRET_KEY=yyy" >> .env

# 2. Deploy (auto-detects new vars)
./scripts/sync-env-to-production.sh

# 3. Verify
ssh connect-prod "docker exec connect_app1 printenv | grep TOSS"
```

### **Scenario 3: Change JWT Secret (Manual)**
```bash
# JWT_SECRET should be DIFFERENT in production
# DO NOT use sync script!

# Generate new secret
NEW_SECRET=$(openssl rand -base64 32)

# Update on production only
ssh connect-prod "sed -i 's/^JWT_SECRET=.*/JWT_SECRET=$NEW_SECRET/' /opt/connect/.env"

# Restart containers
ssh connect-prod "cd /opt/connect && docker-compose -f docker-compose.production.yml restart"
```

---

## ✅ **Verification Checklist**

After any deployment:

```bash
# 1. Verify specific variable
ssh connect-prod "docker exec connect_app1 printenv NTIS_API_KEY"

# 2. Verify NTIS setup
./scripts/verify-ntis-key.sh

# 3. Verify all environment
./scripts/verify-production-env.sh

# 4. Check container health
ssh connect-prod "cd /opt/connect && docker-compose -f docker-compose.production.yml ps"

# 5. Check application works
curl https://connectplt.kr/api/health
```

---

## 🆘 **Troubleshooting**

### **Problem: Variable not in container after sync**

```bash
# 1. Check it's in .env
ssh connect-prod "grep '^VARIABLE_NAME' /opt/connect/.env"

# 2. Check docker-compose config
ssh connect-prod "grep 'VARIABLE_NAME:' /opt/connect/docker-compose.production.yml"

# 3. Force recreate (not just restart)
ssh connect-prod "cd /opt/connect && docker-compose -f docker-compose.production.yml up -d --force-recreate app1 app2 scraper"

# 4. Verify
ssh connect-prod "docker exec connect_app1 printenv VARIABLE_NAME"
```

### **Problem: Sync script not working**

```bash
# Check permissions
chmod +x ./scripts/sync-env-to-production.sh

# Verify SSH
ssh connect-prod "echo 'Connection OK'"

# Run manually with debug
bash -x ./scripts/sync-env-to-production.sh
```

---

## 📚 **Documentation Reference**

| Document | Purpose | When to Use |
|----------|---------|-------------|
| **ENV-DEPLOYMENT-WORKFLOW.md** | Simple visual guide | Quick reference |
| **ENV-DEPLOYMENT-GUIDE.md** | Complete detailed guide | Deep dive, troubleshooting |
| **ENV-DEPLOYMENT-SUMMARY.md** | This summary | Quick overview |
| **NTIS-QUICK-REFERENCE.md** | NTIS-specific commands | NTIS API tasks |
| **SESSION-ENV-NTIS-COMPLETE.md** | Today's session log | Historical reference |

---

## 🎯 **Quick Commands**

```bash
# Deploy API keys/credentials to production
./scripts/sync-env-to-production.sh

# Verify NTIS API key
./scripts/verify-ntis-key.sh

# Verify all environment
./scripts/verify-production-env.sh

# Check what's in local .env
grep '^[A-Z_]*=' .env | sort

# Check production .env (sanitized)
ssh connect-prod "grep '^[A-Z_]*=' /opt/connect/.env | grep -v 'PASSWORD\|SECRET\|KEY' | sort"

# Manual update single variable
ssh connect-prod "sed -i 's/^VAR=.*/VAR=value/' /opt/connect/.env"

# Restart containers
ssh connect-prod "cd /opt/connect && docker-compose -f docker-compose.production.yml up -d --force-recreate app1 app2 scraper"
```

---

## 🏆 **Success Criteria**

Your deployment workflow is successful if:

- ✅ API keys sync correctly to production
- ✅ Database URLs remain different (localhost vs postgres)
- ✅ Secrets remain different (dev vs strong production)
- ✅ Containers restart and become healthy
- ✅ Verification scripts pass
- ✅ Application works in production

**All tools are ready and tested!** ✨

---

## 🎉 **Summary**

### **The Answer to Your Question:**

**When you update local .env (API keys, OAuth, etc.):**
```bash
./scripts/sync-env-to-production.sh
```

**That's it!** The script:
1. Knows what to sync (API keys) ✅
2. Knows what to protect (URLs, secrets) ✅
3. Shows preview, asks confirmation ✅
4. Restarts containers ✅
5. Basic verification ✅

**For secrets (JWT_SECRET, DB_PASSWORD, etc.):**
- Keep them DIFFERENT in local vs production
- Update manually on production server
- Never sync from local .env

---

**You're all set!** 🚀

Use `./scripts/sync-env-to-production.sh` anytime you update API keys in your local .env file.

---

*Deployment workflow configured and tested: October 14, 2025* ✅

