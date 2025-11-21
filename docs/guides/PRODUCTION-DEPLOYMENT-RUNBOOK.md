# Production Deployment Runbook
**Connect Platform - Zero-Downtime Deployment Guide**

**Version**: 1.0
**Last Updated**: October 11, 2025 (Session 35)
**Target Environment**: Production Server (59.21.170.6)

**⚠️ CRITICAL**: Run `./deployment-verification.sh` BEFORE following this runbook!

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Deployment Process](#deployment-process)
3. [Post-Deployment Verification](#post-deployment-verification)
4. [Rollback Procedures](#rollback-procedures)
5. [Troubleshooting](#troubleshooting)
6. [Emergency Contacts](#emergency-contacts)

---

## Pre-Deployment Checklist

### Phase 0: Deployment Verification (MANDATORY)

**Time**: 5 minutes
**Blocker**: If ANY checks fail, DO NOT proceed with deployment

```bash
# 1. Run deployment verification script
./deployment-verification.sh

# Expected output: "✅ Local and production are IN SYNC" (exit code 0)
# OR: "🔴 DEPLOYMENT GAP DETECTED!" (exit code 1)

# If exit code 1: Proceed with deployment (deployment needed)
# If exit code 0: Stop (already deployed, no action needed)
```

**Manual Verification** (if script doesn't exist):
```bash
# Local commit
LOCAL_COMMIT=$(git log --oneline -1 | cut -d' ' -f1)
echo "Local: $LOCAL_COMMIT"

# Production commit
PROD_COMMIT=$(sshpass -p 'iw237877^^' ssh -o StrictHostKeyChecking=no user@59.21.170.6 \
  'cd /opt/connect && git log --oneline -1' | cut -d' ' -f1)
echo "Production: $PROD_COMMIT"

# Compare
if [ "$LOCAL_COMMIT" = "$PROD_COMMIT" ]; then
  echo "✅ Already deployed (no action needed)"
  exit 0
else
  echo "🔴 Deployment needed"
  echo "Commits to deploy:"
  git log --oneline $PROD_COMMIT..$LOCAL_COMMIT
  exit 1
fi
```

---

### Phase 1: Pre-Flight Checks (5-10 minutes)

**Step 1: Local Build Verification**
```bash
# Clean build
rm -rf .next

# Type check (optional but recommended)
npm run type-check
# Expected: 0 errors (or document known non-critical errors)

# Build
npm run build
# Expected: "✓ Creating an optimized production build" with no errors

# If build fails: FIX BEFORE DEPLOYING
```

**Step 2: Git Status Check**
```bash
# Verify clean working directory
git status

# Expected output:
# "On branch main"
# "Your branch is ahead of 'origin/main' by X commits"
# "nothing to commit, working tree clean"

# If uncommitted changes: Commit or stash them
```

**Step 3: Environment Variables Check**
```bash
# Verify .env.production exists
ls -la .env.production

# Expected: File exists with production configuration

# If missing: Copy from .env.production.example and configure
```

**Step 4: Backup Current Production State**
```bash
# SSH to production and create backup
sshpass -p 'iw237877^^' ssh -o StrictHostKeyChecking=no user@59.21.170.6 \
  'cd /opt/connect && \
   git log --oneline -1 > /opt/connect/backups/pre-deploy-$(date +%Y%m%d-%H%M%S).commit && \
   docker compose -f docker-compose.production.yml ps > /opt/connect/backups/pre-deploy-$(date +%Y%m%d-%H%M%S).services'

# Verify backup created
sshpass -p 'iw237877^^' ssh -o StrictHostKeyChecking=no user@59.21.170.6 \
  'ls -lh /opt/connect/backups/pre-deploy-* | tail -2'
```

**Phase 1 Success Criteria**:
- ✅ Local build successful
- ✅ Git working tree clean
- ✅ `.env.production` exists
- ✅ Production backup created

**If ANY check fails**: STOP and fix before proceeding

---

## Deployment Process

### Phase 2: Code Deployment (20-30 minutes)

**Step 1: Sync Code to Production**
```bash
# From local machine: /Users/paulkim/Downloads/connect

# Sync code (excludes node_modules, .next, .git, logs, uploads, backups, data, .env files)
sshpass -p 'iw237877^^' rsync -avz --progress \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='.git' \
  --exclude='logs' \
  --exclude='uploads' \
  --exclude='backups' \
  --exclude='data' \
  --exclude='.env' \
  --exclude='.env.local' \
  --exclude='.env.production' \
  --exclude='*.log' \
  --exclude='.scraper.pid' \
  --exclude='.playwright-mcp' \
  --exclude='playwright-report' \
  --exclude='test-results' \
  . user@59.21.170.6:/opt/connect/

# Expected output: File transfer progress, "sent X bytes, received Y bytes"
# Time: 5-10 minutes depending on changes

# Verify sync completed
echo $?
# Expected: 0 (success)
```

**Step 2: Deploy .env.production**
```bash
# Copy .env.production to production server
sshpass -p 'iw237877^^' scp -o StrictHostKeyChecking=no \
  /Users/paulkim/Downloads/connect/.env.production \
  user@59.21.170.6:/opt/connect/

# Verify .env.production copied
sshpass -p 'iw237877^^' ssh -o StrictHostKeyChecking=no user@59.21.170.6 \
  'ls -lh /opt/connect/.env.production'

# Expected: File exists with recent timestamp
```

**Step 3: Verify File Permissions**
```bash
# SSH to production and check ownership
sshpass -p 'iw237877^^' ssh -o StrictHostKeyChecking=no user@59.21.170.6 \
  'ls -la /opt/connect/ | head -20'

# Expected: Files owned by 'user:user'
# If owned by root: Run `sudo chown -R user:user /opt/connect`
```

---

### Phase 3: Docker Rebuild (30-40 minutes)

**Step 1: Stop Current Containers**
```bash
# SSH to production
sshpass -p 'iw237877^^' ssh -o StrictHostKeyChecking=no user@59.21.170.6

# Navigate to project directory
cd /opt/connect

# Stop containers (zero-downtime: keep nginx running if using separate nginx)
docker compose -f docker-compose.production.yml stop app1 app2

# Verify containers stopped
docker compose -f docker-compose.production.yml ps
# Expected: app1 and app2 show "Exited"
```

**Step 2: Rebuild Docker Images**
```bash
# Still SSH'd to production: cd /opt/connect

# Remove old images (optional, saves disk space)
docker compose -f docker-compose.production.yml down app1 app2
# Note: This removes containers but not volumes (data preserved)

# Rebuild images
docker compose -f docker-compose.production.yml build app1 app2

# Expected output:
# "Building app1..."
# "Building app2..."
# "Successfully built ..."
# Time: 10-20 minutes

# Verify images built
docker images | grep connect
# Expected: New images with recent timestamps
```

**Step 3: Database Migrations**
```bash
# Still SSH'd to production: cd /opt/connect

# Run migrations (if any schema changes)
docker compose -f docker-compose.production.yml run --rm app1 \
  npx prisma migrate deploy

# Expected output:
# "X migrations applied"
# OR: "No pending migrations"

# Generate Prisma client (if schema changed)
docker compose -f docker-compose.production.yml run --rm app1 \
  npx prisma generate

# Expected: "✔ Generated Prisma Client"
```

**Step 4: Start New Containers**
```bash
# Still SSH'd to production: cd /opt/connect

# Start containers
docker compose -f docker-compose.production.yml up -d app1 app2

# Expected output:
# "Container connect_app1 Started"
# "Container connect_app2 Started"

# Verify containers running
docker compose -f docker-compose.production.yml ps

# Expected: app1 and app2 show "Up" with "(healthy)" status
# Note: Health check may take 30-60 seconds
```

**Step 5: Wait for Health Checks**
```bash
# Still SSH'd to production

# Watch container status (Ctrl+C to exit)
watch -n 2 'docker compose -f docker-compose.production.yml ps'

# Wait until BOTH app1 and app2 show "(healthy)"
# Time: 30-60 seconds

# Or check logs
docker logs connect_app1 --tail 50
docker logs connect_app2 --tail 50

# Expected: "Server listening on port 3001" (or 3002)
#           "✓ Ready in Xms"
```

---

## Post-Deployment Verification

### Phase 4: Smoke Tests (5-10 minutes)

**Step 1: Health Endpoint Check**
```bash
# From local machine or production

# Health check via direct IP
curl -sI http://59.21.170.6/api/health
# Expected: HTTP/1.1 200 OK

# Health check via domain
curl -sI https://connectplt.kr/api/health
# Expected: HTTP/1.1 200 OK
```

**Step 2: Homepage Load Test**
```bash
# From local machine

# Test homepage loads
curl -sI https://connectplt.kr/
# Expected: HTTP/1.1 200 OK

# Test with browser (manual)
open https://connectplt.kr/
# Expected:
# - Green padlock (HTTPS valid)
# - Korean text rendering correctly
# - No console errors (except favicon 404, cosmetic)
```

**Step 3: Authentication Flow Test**
```bash
# Manual test in browser

# 1. Navigate to https://connectplt.kr/auth/signin
# Expected: OAuth buttons (Kakao, Naver) visible

# 2. Navigate to https://connectplt.kr/dashboard/profile/create (without login)
# Expected: Redirect to /auth/signin with callbackUrl parameter

# 3. Check middleware working:
curl -sI https://connectplt.kr/dashboard/profile/create
# Expected: HTTP/1.1 307 Temporary Redirect
#           location: /auth/signin?callbackUrl=...
```

**Step 4: Database Connectivity Test**
```bash
# SSH to production
sshpass -p 'iw237877^^' ssh -o StrictHostKeyChecking=no user@59.21.170.6

# Check PostgreSQL connection
docker exec connect_postgres psql -U paulkim -d connect -c "SELECT COUNT(*) FROM users;"

# Expected: Query result (count may be 0 if no users yet)
# OR: Table exists confirmation

# Check Redis connection
docker exec connect_redis_cache redis-cli PING
# Expected: PONG

docker exec connect_redis_queue redis-cli PING
# Expected: PONG
```

**Step 5: E2E Test Validation (Optional but Recommended)**
```bash
# From local machine: /Users/paulkim/Downloads/connect

# Run E2E tests against production
PLAYWRIGHT_BASE_URL=https://connectplt.kr \
  npx playwright test __tests__/e2e/homepage.spec.ts \
  __tests__/e2e/auth-flow.spec.ts \
  __tests__/e2e/dashboard.spec.ts \
  --project=chromium \
  --reporter=line

# Expected: 24/24 tests passing (or current baseline)
# Time: 2-3 minutes
```

**Phase 4 Success Criteria**:
- ✅ Health endpoint returns 200 OK
- ✅ Homepage loads with HTTPS
- ✅ Middleware protection working (dashboard redirects)
- ✅ Database connectivity confirmed
- ✅ Redis connectivity confirmed
- ✅ E2E tests passing (optional)

**If ANY check fails**: See [Rollback Procedures](#rollback-procedures)

---

## Rollback Procedures

### Emergency Rollback (5-10 minutes)

**When to Rollback**:
- Health checks failing after 5 minutes
- Critical functionality broken (auth, database, API)
- Unacceptable performance degradation (P95 >5 seconds)
- Security vulnerability introduced

**Step 1: Identify Last Good Commit**
```bash
# Check backup files
sshpass -p 'iw237877^^' ssh -o StrictHostKeyChecking=no user@59.21.170.6 \
  'cat /opt/connect/backups/pre-deploy-*.commit | tail -1'

# Expected: Last known good commit hash (e.g., "ff92164")
```

**Step 2: Revert Code**
```bash
# SSH to production
sshpass -p 'iw237877^^' ssh -o StrictHostKeyChecking=no user@59.21.170.6

# Navigate to project
cd /opt/connect

# Hard reset to last good commit (DESTRUCTIVE)
git reset --hard <LAST_GOOD_COMMIT_HASH>

# Example:
# git reset --hard ff92164

# Verify reset
git log --oneline -1
# Expected: Shows last good commit
```

**Step 3: Rebuild and Restart**
```bash
# Still SSH'd to production: cd /opt/connect

# Stop current containers
docker compose -f docker-compose.production.yml down app1 app2

# Rebuild images
docker compose -f docker-compose.production.yml build app1 app2

# Start containers
docker compose -f docker-compose.production.yml up -d app1 app2

# Wait for health checks (30-60 seconds)
watch -n 2 'docker compose -f docker-compose.production.yml ps'
```

**Step 4: Verify Rollback Success**
```bash
# Check health endpoint
curl -sI https://connectplt.kr/api/health
# Expected: HTTP/1.1 200 OK

# Check homepage
curl -sI https://connectplt.kr/
# Expected: HTTP/1.1 200 OK

# Check logs for errors
docker logs connect_app1 --tail 100
docker logs connect_app2 --tail 100
```

**Step 5: Document Rollback**
```bash
# Create rollback report
cat > /opt/connect/backups/rollback-$(date +%Y%m%d-%H%M%S).md <<EOF
# Rollback Report

**Date**: $(date)
**Rolled Back From**: <BAD_COMMIT_HASH>
**Rolled Back To**: <GOOD_COMMIT_HASH>
**Reason**: <REASON_FOR_ROLLBACK>
**Verification**: Health checks passing, functionality restored

**Next Steps**:
1. Investigate root cause locally
2. Fix issues in development environment
3. Re-test before next deployment attempt
EOF
```

**Rollback Success Criteria**:
- ✅ Code reverted to last good commit
- ✅ Containers running and healthy
- ✅ Health checks passing
- ✅ Functionality restored
- ✅ Rollback documented

---

## Troubleshooting

### Common Issues & Solutions

#### Issue 1: rsync Permission Denied

**Symptom**:
```
rsync: failed to set permissions on "/opt/connect/...": Permission denied
```

**Solution**:
```bash
# SSH to production
sshpass -p 'iw237877^^' ssh -o StrictHostKeyChecking=no user@59.21.170.6

# Fix ownership
sudo chown -R user:user /opt/connect

# Verify
ls -la /opt/connect | head -20
# Expected: All files owned by 'user:user'
```

---

#### Issue 2: Docker Build Fails (Out of Disk Space)

**Symptom**:
```
Error: no space left on device
```

**Solution**:
```bash
# SSH to production
sshpass -p 'iw237877^^' ssh -o StrictHostKeyChecking=no user@59.21.170.6

# Clean up old images
docker image prune -a --force
# Expected: "Total reclaimed space: X GB"

# Clean up old containers
docker container prune --force

# Clean up volumes (CAUTION: Only if you know what you're doing)
# docker volume prune --force
# NOTE: This deletes unused volumes (data loss possible)

# Check disk space
df -h
# Expected: /opt has >10GB free
```

---

#### Issue 3: Container Stuck in "Restarting" State

**Symptom**:
```
connect_app1    Restarting (1) X seconds ago
```

**Solution**:
```bash
# Check logs
docker logs connect_app1 --tail 100

# Common causes:
# 1. Port already in use
# 2. Environment variable missing
# 3. Database connection failed

# Fix: Stop container and check config
docker compose -f docker-compose.production.yml down app1

# Verify port not in use
sudo lsof -i :3001
# Expected: No output (port free)

# Verify .env.production correct
cat /opt/connect/.env.production | grep DATABASE_URL
# Expected: Correct PostgreSQL connection string

# Restart
docker compose -f docker-compose.production.yml up -d app1
```

---

#### Issue 4: Database Migration Fails

**Symptom**:
```
Error: P1001: Can't reach database server
```

**Solution**:
```bash
# Check PostgreSQL running
docker compose -f docker-compose.production.yml ps postgres
# Expected: "Up (healthy)"

# Check PostgreSQL logs
docker logs connect_postgres --tail 100

# Test connection manually
docker exec connect_postgres psql -U paulkim -d connect -c "SELECT 1;"
# Expected: "1" (connection successful)

# If connection fails: Check DATABASE_URL in .env.production
# Format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public

# Retry migration
docker compose -f docker-compose.production.yml run --rm app1 \
  npx prisma migrate deploy
```

---

#### Issue 5: Health Check Timeout

**Symptom**:
```
connect_app1    Up (health: starting)  # Stuck for >5 minutes
```

**Solution**:
```bash
# Check if app is actually running
docker logs connect_app1 --tail 50
# Expected: "Server listening on port 3001"

# Test health endpoint directly inside container
docker exec connect_app1 curl -f http://localhost:3001/api/health
# Expected: {"status":"ok"}

# If health endpoint works inside container but healthcheck fails:
# Issue is with healthcheck URL in docker-compose.production.yml

# Fix healthcheck (if using localhost):
# Replace: http://localhost:3001/api/health
# With: http://172.25.0.21:3001/api/health (use container IP)

# Get container IP:
docker inspect connect_app1 | grep IPAddress
```

---

#### Issue 6: HTTPS Not Working After Deployment

**Symptom**:
```
curl: (60) SSL certificate problem: certificate has expired
```

**Solution**:
```bash
# SSH to production
sshpass -p 'iw237877^^' ssh -o StrictHostKeyChecking=no user@59.21.170.6

# Check Nginx configuration
sudo nginx -t
# Expected: "configuration file /etc/nginx/nginx.conf syntax is ok"

# Check SSL certificate expiry
sudo certbot certificates
# Expected: Certificate valid, not expired

# If expired: Renew certificate
sudo certbot renew --nginx
# Expected: Certificate renewed successfully

# Restart Nginx
sudo systemctl restart nginx

# Verify
curl -sI https://connectplt.kr/
# Expected: HTTP/1.1 200 OK with valid SSL
```

---

## Emergency Contacts

### Platform Owner
- **Name**: Paul Kim
- **Role**: Founder, Connect Platform
- **Contact**: See internal documentation

### Infrastructure
- **Server Provider**: N/A (Self-hosted)
- **Domain Provider**: Gabia (https://www.gabia.com)
- **SSL Provider**: Let's Encrypt (Certbot)

### Monitoring
- **Health Endpoint**: https://connectplt.kr/api/health
- **Container Status**: `docker compose -f docker-compose.production.yml ps`
- **Logs**: `docker logs connect_app1 --tail 100`

---

## Deployment Checklist (Quick Reference)

**Pre-Deployment**:
- [ ] Run `./deployment-verification.sh` (exit code 1 = deploy needed)
- [ ] Local build successful (`npm run build`)
- [ ] Git working tree clean
- [ ] `.env.production` exists and correct
- [ ] Production backup created

**Deployment**:
- [ ] Code synced via rsync
- [ ] `.env.production` deployed
- [ ] Containers stopped (app1, app2)
- [ ] Images rebuilt
- [ ] Database migrations applied (if any)
- [ ] Containers started and healthy

**Verification**:
- [ ] Health endpoint returns 200 OK
- [ ] Homepage loads with HTTPS
- [ ] Middleware protection working
- [ ] Database connectivity confirmed
- [ ] Redis connectivity confirmed
- [ ] E2E tests passing (optional)

**Post-Deployment**:
- [ ] Deployment documented in git commit message
- [ ] `MASTER-PROGRESS-TRACKER.md` updated with new "Last Deployed"
- [ ] `IMPLEMENTATION-STATUS.md` "Deployment Status" section updated
- [ ] Monitor for 1 hour (check logs every 15 min)

**Rollback (If Needed)**:
- [ ] Revert code to last good commit
- [ ] Rebuild images
- [ ] Restart containers
- [ ] Verify health checks
- [ ] Document rollback reason

---

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Oct 11, 2025 | Claude Code (Session 35) | Initial runbook based on Day 2 deployment |

---

## Next Steps After Successful Deployment

1. **Update Documentation**:
   ```bash
   # Update MASTER-PROGRESS-TRACKER.md
   # Update "Last Deployed" section in IMPLEMENTATION-STATUS.md
   ```

2. **Monitor for 1 Hour**:
   ```bash
   # Check logs every 15 minutes
   docker logs connect_app1 --tail 100 --follow
   ```

3. **Run Full E2E Test Suite**:
   ```bash
   PLAYWRIGHT_BASE_URL=https://connectplt.kr \
     npx playwright test --project=chromium
   ```

4. **Create Deployment Report**:
   ```bash
   # Document what was deployed, verification results, any issues encountered
   # Store in docs/status/deployment-YYYYMMDD.md
   ```

---

**Status**: ✅ Runbook Ready for Production Use

**Last Verified**: October 11, 2025 (Session 35)

**Maintainer**: Paul Kim (Connect Platform)

---

*This runbook is a living document. Update after each deployment to reflect lessons learned and process improvements.*
