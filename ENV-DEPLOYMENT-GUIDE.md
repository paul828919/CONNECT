# 🚀 Environment Variables Deployment Guide

**Last Updated**: October 14, 2025  
**For**: Connect Platform Production Deployment

---

## 📋 **Table of Contents**

1. [Understanding Environment Files](#understanding-environment-files)
2. [What to Sync vs What to Keep Different](#what-to-sync-vs-what-to-keep-different)
3. [Deployment Workflows](#deployment-workflows)
4. [Common Scenarios](#common-scenarios)
5. [Security Best Practices](#security-best-practices)

---

## 🎯 **Understanding Environment Files**

### **Two Separate .env Files, Two Different Purposes:**

| File | Purpose | Location | Connection Type |
|------|---------|----------|-----------------|
| **Local .env** | Development on Mac | `/Users/paulkim/Downloads/connect/.env` | Localhost (port forwarding) |
| **Production .env** | Production deployment | `/opt/connect/.env` (on server) | Docker containers |

### **Key Principle:**
> **Local .env ≠ Production .env**  
> They MUST be different because they serve different environments!

---

## ✅ **What to Sync vs What to Keep Different**

### **🔄 Variables That SHOULD Match (Safe to Sync):**

```bash
# API Keys - Same key for both environments
NTIS_API_KEY=production_key

# OAuth Credentials - If using same OAuth app
KAKAO_CLIENT_ID=your_client_id
KAKAO_CLIENT_SECRET=your_client_secret
NAVER_CLIENT_ID=your_client_id
NAVER_CLIENT_SECRET=your_client_secret

# Payment Gateway - Same credentials
TOSS_CLIENT_KEY=your_client_key
TOSS_SECRET_KEY=your_secret_key

# Monitoring - Can be same or different
SENTRY_DSN=your_sentry_dsn
GRAFANA_PASSWORD=your_password
```

### **🚫 Variables That MUST BE DIFFERENT (Never Sync):**

```bash
# Database URLs - Different connection strings
DATABASE_URL=
  Local:      postgresql://connect:password@localhost:6432/connect
  Production: postgresql://connect:${DB_PASSWORD}@postgres:5432/connect

# Redis URLs - Different connection strings  
REDIS_CACHE_URL=
  Local:      redis://localhost:6379/0
  Production: redis://redis-cache:6379/0

REDIS_QUEUE_URL=
  Local:      redis://localhost:6380/0
  Production: redis://redis-queue:6379/0

# Application URLs - Different domains
NEXTAUTH_URL=
  Local:      http://localhost:3000
  Production: https://connectplt.kr

# Security Secrets - MUST be different
JWT_SECRET=
  Local:      dev_jwt_secret_change_in_production
  Production: [Strong random 32+ char string]

NEXTAUTH_SECRET=
  Local:      dev_nextauth_secret_change_in_production
  Production: [Strong random 32+ char string]

DB_PASSWORD=
  Local:      simple_dev_password
  Production: [Strong random password]

ENCRYPTION_KEY=
  Local:      dev_encryption_key
  Production: [32 bytes hex random]
```

---

## 🚀 **Deployment Workflows**

### **Method 1: Automated Sync Script (Recommended)**

Use the safe sync script that only updates API keys and credentials:

```bash
# When you update API keys in local .env
./scripts/sync-env-to-production.sh
```

**What it does:**
- ✅ Syncs only safe variables (API keys, OAuth credentials)
- ✅ NEVER syncs database URLs or secrets
- ✅ Shows preview before syncing
- ✅ Automatically restarts containers
- ✅ Verifies deployment

**Example:**
```bash
$ ./scripts/sync-env-to-production.sh

🔄 SYNC ENVIRONMENT VARIABLES TO PRODUCTION

Variables that will be synced:
  ✓ NTIS_API_KEY=6f5cioc70502fi63...
  ✓ KAKAO_CLIENT_ID=bd3fa10fd919f067...
  ○ TOSS_CLIENT_KEY (empty, will skip)

Variables that will NOT be synced (environment-specific):
  ✗ DATABASE_URL (protected)
  ✗ JWT_SECRET (protected)
  ✗ NEXTAUTH_URL (protected)

Do you want to proceed? [y/N]: y
```

---

### **Method 2: Manual Single Variable Update**

For updating just one variable:

```bash
# 1. Update the variable on production server
ssh connect-prod "sed -i 's/^NTIS_API_KEY=.*/NTIS_API_KEY=new_value/' /opt/connect/.env"

# 2. Restart affected containers
ssh connect-prod "cd /opt/connect && docker-compose -f docker-compose.production.yml up -d --force-recreate app1 app2 scraper"

# 3. Verify
ssh connect-prod "docker exec connect_app1 printenv NTIS_API_KEY"
```

---

### **Method 3: Interactive Edit on Server**

For multiple changes or complex updates:

```bash
# 1. SSH to production server
ssh connect-prod

# 2. Edit .env file
nano /opt/connect/.env

# 3. Save changes (Ctrl+O, Enter, Ctrl+X)

# 4. Restart containers
cd /opt/connect
docker-compose -f docker-compose.production.yml up -d --force-recreate app1 app2 scraper

# 5. Verify
docker exec connect_app1 printenv | grep -E 'NTIS|KAKAO|NAVER'
```

---

## 📝 **Common Scenarios**

### **Scenario 1: Updated NTIS API Key**

**You got a new NTIS API key and want to deploy it:**

```bash
# 1. Update local .env
nano .env
# Change: NTIS_API_KEY=new_production_key

# 2. Use sync script
./scripts/sync-env-to-production.sh

# 3. Verify
./scripts/verify-ntis-key.sh
```

---

### **Scenario 2: New OAuth Provider**

**You added Toss payment credentials:**

```bash
# 1. Add to local .env
echo "TOSS_CLIENT_KEY=your_client_key" >> .env
echo "TOSS_SECRET_KEY=your_secret_key" >> .env

# 2. Use sync script (it will detect and sync new variables)
./scripts/sync-env-to-production.sh

# 3. Verify
ssh connect-prod "docker exec connect_app1 printenv | grep TOSS"
```

---

### **Scenario 3: Multiple API Keys Updated**

**You updated several API keys at once:**

```bash
# 1. Update all keys in local .env
nano .env
# Update: NTIS_API_KEY, KAKAO_CLIENT_SECRET, etc.

# 2. Use sync script (syncs all changed values)
./scripts/sync-env-to-production.sh

# 3. Full verification
./scripts/verify-production-env.sh
```

---

### **Scenario 4: Changed Production Secret (Manual)**

**You need to change JWT_SECRET (NOT synced by script):**

```bash
# 1. Generate new secret
NEW_SECRET=$(openssl rand -base64 32)
echo "Generated: $NEW_SECRET"

# 2. Update on production server directly
ssh connect-prod "sed -i 's/^JWT_SECRET=.*/JWT_SECRET=$NEW_SECRET/' /opt/connect/.env"

# 3. Restart ALL containers (secrets affect everything)
ssh connect-prod "cd /opt/connect && docker-compose -f docker-compose.production.yml restart"

# 4. Verify
ssh connect-prod "docker exec connect_app1 printenv JWT_SECRET | cut -c1-20"
```

---

## 🔐 **Security Best Practices**

### **DO's ✅**

1. **Keep .env files secure**
   ```bash
   # Local
   chmod 600 .env
   
   # Production
   ssh connect-prod "chmod 600 /opt/connect/.env"
   ```

2. **Use different secrets for dev/prod**
   - JWT_SECRET: Different
   - NEXTAUTH_SECRET: Different
   - DB_PASSWORD: Different
   - ENCRYPTION_KEY: Different

3. **Never commit .env to git**
   ```bash
   # Verify .env is in .gitignore
   grep -q "^\.env$" .gitignore && echo "✅ Protected" || echo "❌ Add .env to .gitignore"
   ```

4. **Verify after deployment**
   ```bash
   ./scripts/verify-production-env.sh
   ./scripts/verify-ntis-key.sh
   ```

5. **Use sync script for API keys**
   ```bash
   # Safe, automated, with preview
   ./scripts/sync-env-to-production.sh
   ```

### **DON'Ts ❌**

1. **❌ Never copy entire .env file to production**
   ```bash
   # WRONG - This will break production!
   scp .env connect-prod:/opt/connect/
   ```

2. **❌ Never deploy .env via git/CI/CD**
   - .env contains secrets
   - .env is in .gitignore
   - .env has environment-specific values

3. **❌ Never use same secrets in dev and prod**
   ```bash
   # WRONG - Security risk!
   JWT_SECRET=same_value_everywhere
   ```

4. **❌ Never share .env file contents publicly**
   - Don't post in Slack/Discord
   - Don't commit to git
   - Don't share in screenshots

---

## 🛠️ **Verification Tools**

### **After Any Deployment:**

```bash
# 1. Verify specific variable
ssh connect-prod "docker exec connect_app1 printenv VARIABLE_NAME"

# 2. Verify NTIS API key
./scripts/verify-ntis-key.sh

# 3. Verify all environment variables
./scripts/verify-production-env.sh

# 4. Check container health
ssh connect-prod "cd /opt/connect && docker-compose -f docker-compose.production.yml ps"

# 5. Check application logs
ssh connect-prod "docker logs connect_app1 --tail 50"
```

---

## 📊 **Deployment Checklist**

When deploying environment variable changes:

- [ ] Identify which variables changed
- [ ] Determine if they should be synced (see "What to Sync" section)
- [ ] Update local .env if needed
- [ ] Choose deployment method:
  - [ ] Use `./scripts/sync-env-to-production.sh` for API keys
  - [ ] Use manual update for secrets/protected variables
- [ ] Restart affected containers
- [ ] Verify deployment:
  - [ ] Run verification scripts
  - [ ] Check container health
  - [ ] Test application functionality
- [ ] Document changes in session notes

---

## 🆘 **Troubleshooting**

### **Problem: Variable not updating in container**

**Solution:**
```bash
# 1. Verify it's in .env file
ssh connect-prod "grep '^VARIABLE_NAME' /opt/connect/.env"

# 2. Check docker-compose has it configured
ssh connect-prod "grep 'VARIABLE_NAME:' /opt/connect/docker-compose.production.yml"

# 3. Force recreate containers (not just restart)
ssh connect-prod "cd /opt/connect && docker-compose -f docker-compose.production.yml up -d --force-recreate app1 app2 scraper"

# 4. Verify again
ssh connect-prod "docker exec connect_app1 printenv VARIABLE_NAME"
```

### **Problem: Sync script not working**

**Solution:**
```bash
# 1. Check script permissions
ls -la scripts/sync-env-to-production.sh
chmod +x scripts/sync-env-to-production.sh

# 2. Verify SSH connection
ssh connect-prod "echo 'Connection OK'"

# 3. Check local .env exists
ls -la .env

# 4. Run with verbose output
bash -x ./scripts/sync-env-to-production.sh
```

---

## 📚 **Related Documentation**

- **`SESSION-ENV-NTIS-COMPLETE.md`** - NTIS API key setup
- **`NTIS-QUICK-REFERENCE.md`** - Quick reference for NTIS
- **`ENV-VERIFICATION-REPORT.md`** - Environment requirements
- **`SECURITY-CREDENTIALS-GUIDE.md`** - Security best practices
- **`scripts/sync-env-to-production.sh`** - Automated sync script
- **`scripts/verify-production-env.sh`** - Full verification

---

## 🎯 **Quick Commands Reference**

```bash
# Sync API keys to production (safe, automated)
./scripts/sync-env-to-production.sh

# Verify NTIS API key
./scripts/verify-ntis-key.sh

# Verify all environment variables
./scripts/verify-production-env.sh

# Manual update single variable
ssh connect-prod "sed -i 's/^VAR=.*/VAR=new_value/' /opt/connect/.env"

# Restart containers after .env change
ssh connect-prod "cd /opt/connect && docker-compose -f docker-compose.production.yml up -d --force-recreate app1 app2 scraper"

# Check container environment
ssh connect-prod "docker exec connect_app1 printenv | grep VARIABLE_NAME"

# View production .env (sanitized)
ssh connect-prod "grep '^[A-Z_]*=' /opt/connect/.env | grep -v 'PASSWORD\|SECRET\|KEY' | sort"
```

---

## 🎓 **Key Takeaways**

1. **Local .env ≠ Production .env** - This is correct and necessary!
2. **Sync only API keys and credentials** - Never sync URLs or secrets
3. **Use the sync script** - Safe, automated, with preview
4. **Always verify after deployment** - Use verification scripts
5. **Keep secrets different** - Dev secrets ≠ Production secrets
6. **Never commit .env to git** - .env is in .gitignore for a reason

---

**Remember**: 
> The sync script is your friend! It knows what to sync and what to protect.  
> Use `./scripts/sync-env-to-production.sh` whenever you update API keys.

---

*Last verified: October 14, 2025 - All workflows tested ✅*

