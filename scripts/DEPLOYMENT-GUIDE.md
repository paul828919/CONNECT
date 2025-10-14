# 🚀 Connect Platform - Deployment Guide

**Quick Reference for Solo Developers**

---

## 📋 Prerequisites

### 1. **Environment Variable**

Set your server password (one-time):

```bash
# Add to ~/.zshrc or ~/.bash_profile
export CONNECT_SERVER_PASSWORD='iw237877^^'

# Or set for current session
export CONNECT_SERVER_PASSWORD='iw237877^^'
```

**Note:** For security, consider setting up SSH key authentication instead:
```bash
ssh-copy-id user@221.164.102.253
```

### 2. **Required Tools**

```bash
# Install sshpass (for password authentication)
brew install sshpass

# Install Docker (already installed ✅)
```

---

## 🎯 Common Tasks

### **Deploy to Production**

```bash
# Full deployment with Blue-Green strategy
./scripts/deploy-production.sh
```

**What it does:**
1. ✅ Pre-flight checks (disk space, connectivity)
2. ✅ Builds Docker image on your M4 Max (faster!)
3. ✅ Uploads to production server
4. ✅ Runs database migrations (with backup)
5. ✅ Blue-Green deployment (zero downtime)
6. ✅ Health checks and verification
7. ✅ Deployment summary

**Duration:** ~3-4 minutes  
**Downtime:** 0 seconds (Blue-Green)

---

### **Emergency Rollback**

```bash
# If something goes wrong after deployment
./scripts/rollback-production.sh
```

**What it does:**
1. Shows current state
2. Asks for confirmation
3. Switches to previous version (< 5 seconds)
4. OR reverts Docker image (< 30 seconds)
5. Optional database rollback
6. Verifies health

**Duration:** 5-30 seconds  
**Downtime:** ~2 seconds

---

### **Check System Health**

```bash
# Quick health check (anytime)
./scripts/check-health.sh
```

**Shows:**
- ✅ Container status
- ✅ Application health (app1, app2, public)
- ✅ Database status
- ✅ Redis status
- ✅ System resources (CPU, memory, disk)
- ✅ Recent errors
- ✅ Traffic distribution

**Duration:** 10 seconds  
**No Changes:** Read-only

---

## 📖 Deployment Workflow

### **Normal Deployment (Weekly/Monthly)**

```bash
# 1. Make changes locally
cd /Users/paulkim/Downloads/connect
# ... edit code in Cursor ...

# 2. Test locally
npm run dev
# ... test changes ...

# 3. Commit changes
git add .
git commit -m "feat: add new feature"
git push origin main

# 4. Deploy to production
./scripts/deploy-production.sh

# 5. Monitor for 10 minutes
./scripts/check-health.sh

# 6. Check Grafana
open http://221.164.102.253:3100
```

---

### **Emergency Rollback (If Needed)**

```bash
# If users report issues:

# 1. Quick health check
./scripts/check-health.sh

# 2. If problems confirmed, rollback immediately
./scripts/rollback-production.sh

# 3. Verify rollback successful
./scripts/check-health.sh

# 4. Investigate issue locally
docker logs connect_app1 --tail 100

# 5. Fix issue, test, redeploy when ready
```

---

## 🎓 Educational: What Happens During Deployment

### **Phase 1: Pre-Deployment (30 sec)**

```
✅ Check SSH connection to server
✅ Verify local files exist (schema, package.json)
✅ Check remote disk space (alert if > 85%)
✅ Confirm you want to proceed
```

### **Phase 2: Build & Upload (90 sec)**

```
✅ Build Docker image on YOUR M4 Max
   (Faster than building on server!)
✅ Tag with timestamp: connect:20241014-153045
✅ Compress to tarball (~180 MB → ~60 MB gzipped)
✅ Upload to server (740 Mbps upload = ~1 min)
✅ Load image on server
```

### **Phase 3: Database Migration (20 sec)**

```
✅ Check Prisma migration status
✅ If migrations pending:
   - Create pre-migration backup
   - Apply migrations
   - Verify success
   - Generate Prisma client
✅ If no migrations: Skip
```

### **Phase 4: Blue-Green Deployment (60 sec)**

```
STEP 1: Deploy to GREEN (app2)
  ├─ Stop app2
  ├─ Start app2 with new image
  ├─ Wait 10 seconds
  └─ Health check (30 attempts × 2 sec)

STEP 2: Switch Traffic to GREEN
  ├─ Update HAProxy config
  ├─ Make app1 backup, app2 primary
  └─ Reload HAProxy (no connection drops!)

STEP 3: Deploy to BLUE (app1)
  ├─ Stop app1
  ├─ Start app1 with new image
  ├─ Wait 10 seconds
  └─ Health check

STEP 4: Restore Balanced Traffic
  ├─ Both containers now active
  └─ HAProxy load balances 50/50

STEP 5: Final Verification
  ├─ Health check app1 ✓
  ├─ Health check app2 ✓
  ├─ Health check public endpoint ✓
  └─ Check logs for errors
```

### **Phase 5: Summary (10 sec)**

```
✅ Show deployment summary
✅ Display container status
✅ Provide quick links
✅ Next steps guidance
```

---

## 🔍 Troubleshooting

### **Issue: SSH Connection Failed**

```bash
# Check if server is reachable
ping 221.164.102.253

# Test SSH manually
ssh user@221.164.102.253

# If password fails, check environment variable
echo $CONNECT_SERVER_PASSWORD
```

---

### **Issue: Docker Build Failed**

```bash
# Check if Docker is running
docker ps

# Check disk space on Mac
df -h

# Try building manually
docker build -f Dockerfile.production -t connect:test .
```

---

### **Issue: Migration Failed**

```bash
# Check migration status manually
ssh user@221.164.102.253
docker exec connect_app1 npx prisma migrate status

# View migration history
docker exec connect_postgres psql -U connect -c "SELECT * FROM _prisma_migrations;"

# If needed, restore from backup
./scripts/rollback-production.sh
# Choose "yes" for database rollback
```

---

### **Issue: Health Check Failed**

```bash
# Check application logs
ssh user@221.164.102.253 'docker logs connect_app1 --tail 100'

# Check if containers are running
ssh user@221.164.102.253 'docker ps'

# Try restarting
ssh user@221.164.102.253 'docker restart connect_app1'

# If all else fails, rollback
./scripts/rollback-production.sh
```

---

## 📊 Monitoring After Deployment

### **First 10 Minutes (Critical)**

```bash
# Minute 0: Deploy
./scripts/deploy-production.sh

# Minute 1: Check health
./scripts/check-health.sh

# Minute 2: Check Grafana
open http://221.164.102.253:3100

# Minute 3: Test features manually
open https://221.164.102.253

# Minute 5: Check logs
ssh user@221.164.102.253 'docker logs connect_app1 --tail 50'

# Minute 10: Final health check
./scripts/check-health.sh
```

### **What to Look For:**

**✅ Good Signs:**
- All health checks passing
- No error spikes in Grafana
- Response times normal (< 200ms)
- Error rate < 1%
- CPU/Memory/Disk normal

**⚠️ Warning Signs:**
- Response times > 500ms
- Error rate > 2%
- Memory usage increasing
- Unusual log errors

**❌ Critical Issues (Rollback Immediately):**
- Health checks failing
- Error rate > 5%
- Database connectivity lost
- Critical features broken

---

## 🔐 Security Best Practices

### **1. Use SSH Keys (Recommended)**

```bash
# Generate SSH key (one-time)
ssh-keygen -t ed25519 -C "paul@connect.co.kr"

# Copy to server
ssh-copy-id user@221.164.102.253

# Test
ssh user@221.164.102.253 'echo "SSH Key works!"'

# Remove password from scripts
unset CONNECT_SERVER_PASSWORD
```

### **2. Never Commit Secrets**

```bash
# Already in .gitignore:
.env.production.local
.env*.local

# Double-check:
git status | grep .env
# Should show nothing
```

### **3. Rotate Passwords Quarterly**

```bash
# Change server password every 3 months
ssh user@221.164.102.253
passwd

# Update your environment variable
export CONNECT_SERVER_PASSWORD='new_password'
```

---

## 📈 Deployment History

Keep a log of deployments:

```bash
# Create deployment log
echo "$(date): Deployed version $(git rev-parse --short HEAD) - $(git log -1 --pretty=%B)" >> deployment-history.txt
```

---

## 🎯 Quick Command Reference

| Task | Command | Duration |
|------|---------|----------|
| Deploy | `./scripts/deploy-production.sh` | 3-4 min |
| Rollback | `./scripts/rollback-production.sh` | 5-30 sec |
| Health Check | `./scripts/check-health.sh` | 10 sec |
| View Logs | `ssh user@221.164.102.253 'docker logs -f connect_app1'` | Continuous |
| Check Containers | `ssh user@221.164.102.253 'docker ps'` | Instant |
| Restart Container | `ssh user@221.164.102.253 'docker restart connect_app1'` | 10 sec |

---

## 💡 Pro Tips

### **Tip 1: Deploy During Low Traffic**

Best times:
- 🌙 Late night (2-4 AM KST)
- 🌅 Early morning (6-8 AM KST)
- 🎯 Avoid: Business hours (9 AM - 6 PM KST)

### **Tip 2: Test Locally First**

```bash
# Always test before deploying:
npm test                    # Run tests
npm run type-check         # TypeScript
npm run lint               # Code quality
npm run build              # Verify build works
```

### **Tip 3: Small, Frequent Deploys**

- ✅ Deploy small changes often (less risk)
- ❌ Avoid huge changes (hard to debug)
- 🎯 Aim for: 1-3 changes per deployment

### **Tip 4: Monitor Grafana**

```bash
# Bookmark Grafana
open http://221.164.102.253:3100

# Check these metrics:
# - Request rate (should be stable)
# - Error rate (should be < 1%)
# - Response time (should be < 200ms)
# - CPU/Memory (should be < 70%)
```

### **Tip 5: Document Issues**

```bash
# If rollback needed, document why:
echo "$(date): Rolled back - Reason: ..." >> deployment-issues.txt

# This helps you learn and improve
```

---

## 🆘 Getting Help

### **Check Documentation**

```bash
# Read architecture docs
ls docs/architecture/

# Key docs:
# - CICD-PIPELINE.md (technical details)
# - CICD-EXPLAINED.md (educational guide)
# - DEPLOYMENT-STRATEGY.md (strategies)
```

### **Ask Claude**

```
"I deployed and got error X. Logs show Y. What should I do?"
```

### **Community Resources**

- Docker Discord
- Next.js GitHub Discussions
- Stack Overflow (tag: docker, nextjs, prisma)

---

## ✅ Post-Deployment Checklist

After every deployment:

- [ ] Health check passed
- [ ] No errors in logs (< 5 errors)
- [ ] Features tested manually
- [ ] Grafana metrics normal
- [ ] Monitored for 10 minutes
- [ ] Documented any issues
- [ ] Committed changes to Git

---

## 🎓 Learning Resources

Want to understand more?

1. **Read:** `docs/architecture/CICD-EXPLAINED.md` (comprehensive guide)
2. **Practice:** Deploy a small change weekly
3. **Experiment:** Try rollback when nothing is wrong (practice!)
4. **Monitor:** Check Grafana daily (understand patterns)
5. **Ask:** No question is too basic

---

**Remember: Deployment should be boring (predictable, reliable).**  
**If deployment is stressful, something needs to be automated!**

🚀 Happy deploying!

---

**Last Updated:** October 14, 2025  
**Maintained By:** Paul Kim  
**Questions?** Ask Claude in Cursor!

