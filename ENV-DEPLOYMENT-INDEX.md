# 📚 Environment Variables - Complete Documentation Index

**Last Updated**: October 14, 2025  
**Status**: ✅ All tools ready and tested

---

## 🎯 **Start Here**

### **Your Question:**
> "When the contents of my local .env file are updated, how should I deploy to production?"

### **Quick Answer:**
```bash
./scripts/sync-env-to-production.sh
```

**Read**: `ENV-DEPLOYMENT-SUMMARY.md` (5-minute overview)

---

## 📖 **Documentation**

### **📋 For Quick Reference:**
1. **`ENV-DEPLOYMENT-SUMMARY.md`** ⭐ **START HERE**
   - Quick answer to your question
   - Step-by-step workflow
   - Common scenarios
   - 5-minute read

2. **`ENV-DEPLOYMENT-WORKFLOW.md`**
   - Visual decision tree
   - Simple flowcharts
   - Quick commands
   - 3-minute read

3. **`NTIS-QUICK-REFERENCE.md`**
   - NTIS-specific commands
   - Quick verification
   - Troubleshooting
   - 2-minute read

### **📚 For Deep Dive:**
4. **`ENV-DEPLOYMENT-GUIDE.md`**
   - Complete deployment guide
   - All scenarios covered
   - Security best practices
   - Troubleshooting details
   - 15-minute read

5. **`ENV-VERIFICATION-REPORT.md`**
   - Environment requirements
   - Variable specifications
   - Comparison: local vs production

6. **`SESSION-ENV-NTIS-COMPLETE.md`**
   - Today's session log
   - What was done
   - Configuration details
   - Historical reference

7. **`SESSION-HANDOFF-ENV-VERIFICATION.md`**
   - Previous session context
   - Background information

---

## 🛠️ **Tools & Scripts**

### **Deployment:**
```bash
# Sync API keys to production (safe, automated)
./scripts/sync-env-to-production.sh
```
- ✅ Syncs: API keys, OAuth, payment credentials
- 🔒 Protects: Database URLs, secrets, app URLs
- 👀 Shows preview before deploying
- 🔄 Automatically restarts containers
- ✔️ Includes basic verification

### **Verification:**
```bash
# Verify NTIS API key specifically
./scripts/verify-ntis-key.sh

# Verify all environment variables
./scripts/verify-production-env.sh
```

---

## 🚀 **Common Tasks**

### **Task 1: Deploy Updated API Key**
```bash
# 1. Update local .env
nano .env  # Change API key value

# 2. Deploy to production
./scripts/sync-env-to-production.sh

# 3. Verify
./scripts/verify-ntis-key.sh
```
**Read**: `ENV-DEPLOYMENT-SUMMARY.md` → Scenario 1

### **Task 2: Add New OAuth Provider**
```bash
# 1. Add to local .env
echo "NEW_CLIENT_ID=xxx" >> .env
echo "NEW_CLIENT_SECRET=yyy" >> .env

# 2. Deploy (auto-detects new vars)
./scripts/sync-env-to-production.sh

# 3. Verify
ssh connect-prod "docker exec connect_app1 printenv | grep NEW"
```
**Read**: `ENV-DEPLOYMENT-SUMMARY.md` → Scenario 2

### **Task 3: Update Production Secret**
```bash
# Secrets should be DIFFERENT in production
# DO NOT use sync script for secrets!

# Generate new secret
NEW_SECRET=$(openssl rand -base64 32)

# Update on production only
ssh connect-prod "sed -i 's/^JWT_SECRET=.*/JWT_SECRET=$NEW_SECRET/' /opt/connect/.env"

# Restart containers
ssh connect-prod "cd /opt/connect && docker-compose -f docker-compose.production.yml restart"
```
**Read**: `ENV-DEPLOYMENT-GUIDE.md` → Scenario 4

### **Task 4: Verify Current Configuration**
```bash
# Quick NTIS check
./scripts/verify-ntis-key.sh

# Full environment check
./scripts/verify-production-env.sh

# Check specific variable
ssh connect-prod "docker exec connect_app1 printenv VARIABLE_NAME"
```
**Read**: `NTIS-QUICK-REFERENCE.md`

---

## 📊 **Quick Reference**

### **What to Sync:**
```
✅ NTIS_API_KEY          → Same in local & production
✅ KAKAO_CLIENT_ID       → OAuth credentials
✅ KAKAO_CLIENT_SECRET   
✅ NAVER_CLIENT_ID       
✅ NAVER_CLIENT_SECRET   
✅ TOSS_CLIENT_KEY       → Payment credentials
✅ TOSS_SECRET_KEY       
✅ SENTRY_DSN            → Monitoring
```

### **What NOT to Sync:**
```
❌ DATABASE_URL          → Different (localhost vs postgres)
❌ REDIS_CACHE_URL       → Different (localhost vs redis-cache)
❌ NEXTAUTH_URL          → Different (localhost vs https)
❌ JWT_SECRET            → Different (security)
❌ NEXTAUTH_SECRET       → Different (security)
❌ DB_PASSWORD           → Different (security)
❌ ENCRYPTION_KEY        → Different (security)
```

---

## 🎓 **Key Concepts**

### **1. Local .env ≠ Production .env**
- **Local**: For development on Mac (uses localhost)
- **Production**: For deployment on server (uses Docker containers)
- **They SHOULD be different!** This is correct architecture.

### **2. CI/CD Does NOT Deploy .env**
- .env files contain secrets
- .env files are in .gitignore
- .env files have environment-specific values
- Secrets managed manually or via secret management tools

### **3. Safe Deployment Workflow**
```
Update local .env
       ↓
./scripts/sync-env-to-production.sh
       ↓
Review preview
       ↓
Confirm deployment
       ↓
Automatic: update, restart, verify
       ↓
Manual verify: ./scripts/verify-ntis-key.sh
```

---

## 🔧 **Command Cheat Sheet**

```bash
# ─── Deployment ───────────────────────────────────────
./scripts/sync-env-to-production.sh        # Deploy API keys to prod

# ─── Verification ─────────────────────────────────────
./scripts/verify-ntis-key.sh               # Verify NTIS API key
./scripts/verify-production-env.sh         # Verify all environment

# ─── Manual Operations ────────────────────────────────
ssh connect-prod "nano /opt/connect/.env"  # Edit prod .env
ssh connect-prod "grep '^VAR=' /opt/connect/.env"  # Check variable

# ─── Container Management ─────────────────────────────
ssh connect-prod "cd /opt/connect && docker-compose -f docker-compose.production.yml up -d --force-recreate app1 app2 scraper"  # Restart

# ─── Debugging ────────────────────────────────────────
ssh connect-prod "docker exec connect_app1 printenv | grep VAR"  # Check env
ssh connect-prod "docker logs connect_app1 --tail 50"            # Check logs
ssh connect-prod "cd /opt/connect && docker-compose -f docker-compose.production.yml ps"  # Check status
```

---

## 🆘 **Troubleshooting**

| Problem | Solution | Documentation |
|---------|----------|---------------|
| Variable not updating | Force recreate containers | `ENV-DEPLOYMENT-GUIDE.md` → Troubleshooting |
| Sync script failing | Check permissions & SSH | `ENV-DEPLOYMENT-GUIDE.md` → Troubleshooting |
| NTIS API not working | Verify key in container | `NTIS-QUICK-REFERENCE.md` → Troubleshooting |
| Container not healthy | Check logs & .env config | `ENV-DEPLOYMENT-GUIDE.md` → Verification |

---

## 📁 **File Locations**

### **Documentation:**
```
connect/
├── ENV-DEPLOYMENT-INDEX.md         # This file (index)
├── ENV-DEPLOYMENT-SUMMARY.md       # ⭐ Start here
├── ENV-DEPLOYMENT-WORKFLOW.md      # Visual workflow
├── ENV-DEPLOYMENT-GUIDE.md         # Complete guide
├── ENV-VERIFICATION-REPORT.md      # Requirements
├── NTIS-QUICK-REFERENCE.md         # NTIS reference
├── SESSION-ENV-NTIS-COMPLETE.md    # Session log
└── SESSION-HANDOFF-ENV-VERIFICATION.md  # Context
```

### **Scripts:**
```
connect/scripts/
├── sync-env-to-production.sh       # ⭐ Main deployment script
├── verify-ntis-key.sh              # NTIS verification
└── verify-production-env.sh        # Full verification
```

### **Environment Files:**
```
Local (Mac):
└── /Users/paulkim/Downloads/connect/.env

Production (Server):
└── /opt/connect/.env
```

---

## 🎯 **Workflow Summary**

### **When API Keys Change:**
1. Update local `.env`
2. Run `./scripts/sync-env-to-production.sh`
3. Confirm when prompted
4. Verify with `./scripts/verify-ntis-key.sh`

### **When Secrets Change:**
1. Update on production server directly (SSH)
2. Keep DIFFERENT from local .env
3. Restart containers
4. Verify

### **When URLs Change:**
1. Local and production URLs should be DIFFERENT
2. Update each independently
3. Never sync URLs from local to production

---

## ✅ **Checklist**

After completing this session, you now have:

- ✅ Understanding of local vs production .env differences
- ✅ Automated deployment script for API keys
- ✅ Verification scripts for checking configuration
- ✅ Complete documentation for all scenarios
- ✅ Security best practices guide
- ✅ Troubleshooting procedures

---

## 🏆 **Success Criteria**

Your environment deployment workflow is successful:

- ✅ API keys deploy correctly via sync script
- ✅ Database URLs remain different (localhost vs containers)
- ✅ Secrets remain different (dev vs production)
- ✅ Containers restart and become healthy after changes
- ✅ Verification scripts confirm proper configuration
- ✅ Application functions correctly in production

---

## 📞 **Need Help?**

### **Quick Questions:**
- Check `ENV-DEPLOYMENT-SUMMARY.md`
- Check `ENV-DEPLOYMENT-WORKFLOW.md`

### **Detailed Questions:**
- Check `ENV-DEPLOYMENT-GUIDE.md`
- Check specific scenario sections

### **NTIS-Specific:**
- Check `NTIS-QUICK-REFERENCE.md`

### **Troubleshooting:**
- Check `ENV-DEPLOYMENT-GUIDE.md` → Troubleshooting section
- Run verification scripts
- Check container logs

---

## 🎉 **You're All Set!**

**Your deployment workflow is ready:**

```bash
# When you update API keys in local .env:
./scripts/sync-env-to-production.sh

# That's it! 🚀
```

The script handles everything:
- ✅ Safe variable selection
- ✅ Preview and confirmation
- ✅ Production update
- ✅ Container restart
- ✅ Basic verification

**Happy deploying!** 🎊

---

*Environment deployment workflow completed: October 14, 2025* ✅

