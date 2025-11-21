# 🚀 NTIS API Key - Quick Reference

**Status**: ✅ **CONFIGURED AND OPERATIONAL**  
**Last Updated**: October 14, 2025

---

## ✅ **Quick Verification**

Run this anytime to verify NTIS API key is properly configured:

```bash
./scripts/verify-ntis-key.sh
```

**Expected Output**: ✅ All checks passed

---

## 📍 **Where NTIS API Key Is Configured**

### **1. Production Server (.env file)**
```bash
Location: /opt/connect/.env
Variable: NTIS_API_KEY=6f5cioc70502fi63fdn5
Permissions: 600 (secure)
```

**View it:**
```bash
ssh connect-prod "grep '^NTIS_API_KEY' /opt/connect/.env"
```

### **2. Docker Compose Configuration**
```bash
File: /opt/connect/docker-compose.production.yml
Services using NTIS_API_KEY:
  - app1 (line 64)
  - app2 (line 135)
  - scraper (line 357)
```

**View configuration:**
```bash
ssh connect-prod "grep -B1 -A1 'NTIS_API_KEY' /opt/connect/docker-compose.production.yml"
```

### **3. Running Containers**
```bash
✅ connect_app1: Has NTIS_API_KEY
✅ connect_app2: Has NTIS_API_KEY
✅ connect_scraper: Has NTIS_API_KEY
```

**Check container:**
```bash
ssh connect-prod "docker exec connect_app1 printenv NTIS_API_KEY"
```

---

## 🔧 **Common Tasks**

### **Update NTIS API Key**

If you need to change the NTIS API key in the future:

```bash
# 1. Update local .env first
nano .env
# Change NTIS_API_KEY value

# 2. Update production .env
ssh connect-prod "sed -i 's/^NTIS_API_KEY=.*/NTIS_API_KEY=NEW_KEY_VALUE/' /opt/connect/.env"

# 3. Restart containers to apply
ssh connect-prod "cd /opt/connect && docker-compose -f docker-compose.production.yml up -d --force-recreate app1 app2 scraper"

# 4. Verify
./scripts/verify-ntis-key.sh
```

### **Check if NTIS API is Working**

```bash
# Check scraper logs for NTIS API usage
ssh connect-prod "docker logs connect_scraper --tail 50 | grep -i ntis"

# Check app logs
ssh connect-prod "docker logs connect_app1 --tail 50 | grep -i ntis"
```

---

## 🔐 **Security Notes**

### **Do's ✅**
- ✅ Keep .env file permissions at 600
- ✅ Never commit .env to git (.env is in .gitignore)
- ✅ Use different values for local vs production when needed
- ✅ Verify after any changes using `./scripts/verify-ntis-key.sh`

### **Don'ts ❌**
- ❌ Don't share .env file contents publicly
- ❌ Don't commit secrets to git repository
- ❌ Don't use development NTIS key in production
- ❌ Don't deploy local .env to production via CI/CD

---

## 🆘 **Troubleshooting**

### **Problem: NTIS_API_KEY not found in container**

**Solution:**
```bash
# 1. Check .env file has the key
ssh connect-prod "grep '^NTIS_API_KEY' /opt/connect/.env"

# 2. Check docker-compose has NTIS_API_KEY configured
ssh connect-prod "grep 'NTIS_API_KEY:' /opt/connect/docker-compose.production.yml"

# 3. Recreate containers
ssh connect-prod "cd /opt/connect && docker-compose -f docker-compose.production.yml up -d --force-recreate app1 app2 scraper"

# 4. Verify again
./scripts/verify-ntis-key.sh
```

### **Problem: NTIS API calls failing**

**Check:**
```bash
# 1. Verify key is set in container
ssh connect-prod "docker exec connect_app1 printenv NTIS_API_KEY"

# 2. Check application logs
ssh connect-prod "docker logs connect_app1 --tail 100"

# 3. Check scraper logs
ssh connect-prod "docker logs connect_scraper --tail 100"
```

---

## 📊 **Current Configuration Summary**

```
Production Environment:
├── Server: 59.21.170.6
├── .env location: /opt/connect/.env
├── NTIS_API_KEY: ✅ Configured (6f5cioc70502fi63fdn5)
├── Containers with NTIS_API_KEY:
│   ├── ✅ connect_app1
│   ├── ✅ connect_app2
│   └── ✅ connect_scraper
└── Status: ✅ Operational

Local Development:
├── .env location: /Users/paulkim/Downloads/connect/.env
├── NTIS_API_KEY: ✅ Same production key
├── Purpose: Development testing
└── Note: Other values different (localhost vs containers)
```

---

## 📚 **Related Documentation**

- **`SESSION-ENV-NTIS-COMPLETE.md`** - Full session details
- **`SESSION-HANDOFF-ENV-VERIFICATION.md`** - Environment context
- **`ENV-VERIFICATION-REPORT.md`** - Requirements
- **`scripts/verify-ntis-key.sh`** - Quick verification script
- **`scripts/verify-production-env.sh`** - Full environment verification

---

## 🎯 **Key Takeaways**

1. **NTIS_API_KEY is properly configured** in production ✅
2. **All containers have access** to the NTIS API key ✅
3. **Local and production .env are correctly different** ✅
4. **Security is maintained** (600 permissions, not in git) ✅
5. **Verification tools available** for quick checks ✅

---

**Quick Commands:**

```bash
# Verify NTIS configuration
./scripts/verify-ntis-key.sh

# Check all environment variables
./scripts/verify-production-env.sh

# View container status
ssh connect-prod "cd /opt/connect && docker-compose -f docker-compose.production.yml ps"

# Check NTIS in container
ssh connect-prod "docker exec connect_app1 printenv | grep NTIS"
```

---

*Last verified: October 14, 2025 - All checks passing ✅*

