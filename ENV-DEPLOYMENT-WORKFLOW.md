# 🔄 Environment Variables Deployment - Simple Workflow

**Quick Reference**: How to deploy .env changes to production

---

## 📍 **When You Update Local .env File...**

```
┌─────────────────────────────────────────────────────┐
│  Local .env Updated (on Mac)                        │
│  ─────────────────────────────────────              │
│  Example: NTIS_API_KEY=new_production_key           │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  What type of        │
              │  variable changed?   │
              └──────────────────────┘
                         │
           ┌─────────────┴─────────────┐
           ▼                           ▼
    ┌─────────────┐            ┌──────────────┐
    │  API Keys   │            │   Secrets    │
    │  OAuth      │            │   DB URLs    │
    │  Payments   │            │   App URLs   │
    └─────────────┘            └──────────────┘
           │                           │
           ▼                           ▼
    ┌─────────────┐            ┌──────────────┐
    │  Use Sync   │            │   Manual     │
    │  Script ✅  │            │   Update ⚠️  │
    └─────────────┘            └──────────────┘
```

---

## ✅ **Method 1: API Keys / OAuth / Payments** 

**Variables**: NTIS_API_KEY, KAKAO_CLIENT_ID, TOSS_CLIENT_KEY, etc.

### **Step-by-Step:**

```bash
# 1. Update local .env
nano .env
# Change the API key value

# 2. Run sync script
./scripts/sync-env-to-production.sh

# 3. Follow prompts (it shows preview, asks confirmation)

# 4. Done! Script handles:
#    ✅ Updating production .env
#    ✅ Restarting containers
#    ✅ Basic verification
```

### **What the Sync Script Does:**

```
Local .env                    Production .env
─────────────                 ─────────────────
NTIS_API_KEY=new_key    ──>   NTIS_API_KEY=new_key  ✅
KAKAO_CLIENT_ID=abc     ──>   KAKAO_CLIENT_ID=abc   ✅
                              
DATABASE_URL=localhost  ✗-->  DATABASE_URL=postgres  (Protected)
JWT_SECRET=dev_secret   ✗-->  JWT_SECRET=prod_sec    (Protected)
NEXTAUTH_URL=localhost  ✗-->  NEXTAUTH_URL=https://  (Protected)
```

---

## ⚠️ **Method 2: Secrets / URLs / Environment-Specific**

**Variables**: JWT_SECRET, NEXTAUTH_URL, DATABASE_URL, DB_PASSWORD, etc.

### **Step-by-Step:**

```bash
# These should be DIFFERENT in local vs production
# Update ONLY on production server, NOT via sync

# 1. SSH to production
ssh connect-prod

# 2. Edit .env directly
nano /opt/connect/.env

# 3. Change the value (e.g., JWT_SECRET)

# 4. Save and exit (Ctrl+O, Enter, Ctrl+X)

# 5. Restart containers
cd /opt/connect
docker-compose -f docker-compose.production.yml up -d --force-recreate app1 app2 scraper

# 6. Verify
docker exec connect_app1 printenv JWT_SECRET | cut -c1-20
```

---

## 🎯 **Quick Decision Tree**

```
Did you update an API key or OAuth credential?
├─ YES → Use: ./scripts/sync-env-to-production.sh
│
└─ NO → Is it a database URL or application URL?
    ├─ YES → These should be DIFFERENT in production
    │         Do NOT sync from local
    │         Update manually on server if needed
    │
    └─ Is it a secret (PASSWORD, SECRET, KEY)?
        ├─ YES → These should be DIFFERENT in production
        │         Do NOT sync from local
        │         Update manually on server with strong values
        │
        └─ Not sure? → Check ENV-DEPLOYMENT-GUIDE.md
```

---

## 📋 **What Gets Synced (Safe) ✅**

```bash
NTIS_API_KEY              # ✅ API keys
KAKAO_CLIENT_ID           # ✅ OAuth credentials
KAKAO_CLIENT_SECRET       # ✅ OAuth credentials
NAVER_CLIENT_ID           # ✅ OAuth credentials
NAVER_CLIENT_SECRET       # ✅ OAuth credentials
TOSS_CLIENT_KEY           # ✅ Payment credentials
TOSS_SECRET_KEY           # ✅ Payment credentials
SENTRY_DSN                # ✅ Monitoring
GRAFANA_PASSWORD          # ✅ Can be same
```

## 🚫 **What NEVER Gets Synced (Protected) ❌**

```bash
DATABASE_URL              # ❌ Different (localhost vs container)
REDIS_CACHE_URL           # ❌ Different (localhost vs container)
NEXTAUTH_URL              # ❌ Different (localhost vs https)
JWT_SECRET                # ❌ Must be different (security)
NEXTAUTH_SECRET           # ❌ Must be different (security)
DB_PASSWORD               # ❌ Must be different (security)
ENCRYPTION_KEY            # ❌ Must be different (security)
```

---

## 🔧 **Common Commands**

### **Deploy API Key Updates:**
```bash
./scripts/sync-env-to-production.sh
```

### **Verify What Changed:**
```bash
# Before deploying, check what will be synced
grep -E '^(NTIS|KAKAO|NAVER|TOSS|SENTRY)' .env
```

### **After Deployment Verification:**
```bash
# Verify NTIS specifically
./scripts/verify-ntis-key.sh

# Verify all environment
./scripts/verify-production-env.sh

# Check specific variable in container
ssh connect-prod "docker exec connect_app1 printenv NTIS_API_KEY"
```

### **Manual Update (for secrets):**
```bash
# Update specific variable on production
ssh connect-prod "sed -i 's/^VAR_NAME=.*/VAR_NAME=new_value/' /opt/connect/.env"

# Restart containers
ssh connect-prod "cd /opt/connect && docker-compose -f docker-compose.production.yml up -d --force-recreate app1 app2 scraper"
```

---

## 🎓 **Remember**

### **The Golden Rule:**
> **Local .env** and **Production .env** are DIFFERENT files for DIFFERENT purposes.
> Only sync what SHOULD be the same (API keys, OAuth credentials).

### **Safe Workflow:**
1. Update local .env
2. Run `./scripts/sync-env-to-production.sh`
3. Review preview
4. Confirm
5. Verify with `./scripts/verify-ntis-key.sh`

### **Why NOT Deploy Entire .env:**
```bash
# ❌ WRONG - This breaks production!
scp .env connect-prod:/opt/connect/.env

# Reason:
# - Your local .env has localhost:6432
# - Production needs postgres:5432
# - Different environments = Different configs
```

---

## 📊 **Example Scenarios**

### **Scenario 1: NTIS API Key Updated**
```bash
# 1. Edit local .env
nano .env  # Change NTIS_API_KEY=new_key

# 2. Deploy
./scripts/sync-env-to-production.sh

# 3. Verify
./scripts/verify-ntis-key.sh
```

### **Scenario 2: Added Toss Payment**
```bash
# 1. Add to local .env
echo "TOSS_CLIENT_KEY=your_key" >> .env
echo "TOSS_SECRET_KEY=your_secret" >> .env

# 2. Deploy (script auto-detects new variables)
./scripts/sync-env-to-production.sh

# 3. Verify
ssh connect-prod "docker exec connect_app1 printenv | grep TOSS"
```

### **Scenario 3: Need to Change JWT Secret**
```bash
# DO NOT use sync script!
# JWT_SECRET must be different in production

# 1. Generate new secret
NEW_SECRET=$(openssl rand -base64 32)

# 2. Update on production only
ssh connect-prod "sed -i 's/^JWT_SECRET=.*/JWT_SECRET=$NEW_SECRET/' /opt/connect/.env"

# 3. Restart all containers
ssh connect-prod "cd /opt/connect && docker-compose -f docker-compose.production.yml restart"
```

---

## 🚀 **That's It!**

**Simple rule:**
- **API keys / OAuth?** → Use sync script ✅
- **Secrets / URLs?** → Update manually, keep different ⚠️

**Always verify after deployment:**
```bash
./scripts/verify-ntis-key.sh
./scripts/verify-production-env.sh
```

---

**Need more details?** See: `ENV-DEPLOYMENT-GUIDE.md`

**Quick help:**
```bash
# Show what sync script does
cat scripts/sync-env-to-production.sh | grep "SYNC_VARS=\|NEVER_SYNC="
```

