# Docker Cache Troubleshooting Guide

**Last Updated**: October 13, 2025
**Session**: 51
**Related Issues**: SESSION 45 (OAuth callback cache), SESSION 51 (Match generation cache)

---

## Executive Summary

This guide documents the **Docker cache pollution problem** that caused production deployments to fail despite correct source code changes. This issue occurred twice (SESSION 45 and SESSION 51) with the same root cause but different symptoms.

**Key Insight**: Docker's `--no-cache` flag **does NOT invalidate all cache layers**. Next.js standalone mode has multiple cache layers that persist across rebuilds, causing old code to run in production even after source files are updated.

---

## The Problem: "Why Doesn't My Code Update?"

### Symptoms

After updating source files and running `docker-compose build --no-cache`:
- ✅ Build completes successfully
- ✅ New images created with recent timestamps
- ✅ Containers start and pass health checks
- ❌ **Runtime still executes old code**

### Root Cause: Multiple Cache Layers

Docker has **5 distinct cache layers**, and `--no-cache` only invalidates #1:

| Layer | What It Is | `--no-cache` Effect | Why It Persists |
|-------|-----------|-------------------|----------------|
| 1. Docker Layer Cache | Base image + RUN commands | ✅ Invalidated | N/A |
| 2. Build Cache Objects | Intermediate build artifacts | ❌ Persists | Stored separately from layers |
| 3. Webpack Module Cache | Next.js compiled modules | ❌ Persists | Reused if module ID unchanged |
| 4. Node Modules Cache | Native bindings + compiled deps | ❌ Persists | `node_modules/.cache` directory |
| 5. .next Directory | Previous build output on host | ❌ Persists | Copied into image via `COPY . .` |

**Result**: Even with `--no-cache`, layers 2-5 cause old code to run.

---

## Case Study 1: SESSION 45 - OAuth Callback Cache Pollution

### Issue
After fixing OAuth callback route, users still got 404 errors despite rebuilding Docker images.

### Investigation
```bash
# Source file was correct
$ cat app/api/auth/[...nextauth]/route.ts
✅ Correct callback configuration

# Docker image was rebuilt
$ docker images | grep connect-app
connect-app1   latest   abc123   2 minutes ago

# But runtime failed
$ curl https://connectplt.kr/api/auth/callback/kakao
❌ 404 Not Found
```

### Solution
Nuclear reset + `.next` directory cleanup solved the issue.

### Lesson
Webpack module cache persisted the old route structure even after rebuilding.

---

## Case Study 2: SESSION 51 - Match Generation "db is undefined"

### Issue
After fixing `import { db } from '@/lib/db'` to direct PrismaClient instantiation, API still failed with same error.

### Investigation Timeline

**Hour 0-1: Diagnosed as module resolution issue**
```bash
# Error in logs
TypeError: Cannot read properties of undefined (reading 'findUnique')

# Hypothesis
TypeScript path alias '@/lib/db' not resolving in standalone mode

# Solution attempted
Replace lib/db imports with direct PrismaClient in 4 API routes
```

**Hour 1-2: Multiple rebuild attempts**
```bash
# Attempt 1: Standard rebuild
$ docker-compose build --no-cache
❌ Still fails

# Attempt 2: Remove images, rebuild
$ docker rmi connect-app1 connect-app2
$ docker-compose build --no-cache
❌ Still fails

# Attempt 3: Clean .next, rebuild
$ rm -rf .next
$ docker-compose build --no-cache
❌ Still fails
```

**Hour 2-3: Nuclear reset**
```bash
# Stop everything
$ docker-compose down -v

# Remove ALL images
$ docker rmi connect-app1 connect-app2 connect-scraper

# Clean Docker system
$ docker system prune -af --volumes
✅ Removed 26.14GB of cached data

# Remove host artifacts
$ rm -rf .next node_modules/.cache

# Fresh build
$ BUILD_ID=$(date +%s) docker-compose build --no-cache --pull
✅ Build successful
```

**Hour 3: Discovery of actual error**
```bash
# After nuclear reset, new error appeared
PrismaClientKnownRequestError: The table 'public.organizations' does not exist

# Actual root causes (TWO problems!)
1. Docker cache pollution (solved by nuclear reset)
2. Database schema missing (caused by 'down -v' deleting volumes)
```

### Critical Lessons

1. **Misleading error messages**: "db is undefined" hid the real problem (cache pollution)
2. **Nuclear reset side effects**: `-v` flag deleted database with NO backups
3. **26GB of cache**: Build cache objects accumulated over weeks
4. **Pattern recognition**: Same issue as SESSION 45 but took 3 hours to recognize

---

## The Nuclear Reset Solution

### When to Use Nuclear Reset

Use nuclear reset when:
- ✅ Multiple `--no-cache` rebuilds fail
- ✅ Source files verified correct on server
- ✅ Timestamps show recent builds
- ✅ Runtime behaves as if old code is running
- ✅ You've tried standard troubleshooting (restart containers, clear .next)

**Do NOT use if:**
- ❌ You haven't verified recent backups exist
- ❌ Database data is critical and unbackeduped
- ❌ You're in production serving live traffic
- ❌ It's your first troubleshooting attempt

### Nuclear Reset Procedure

```bash
# STEP 0: VERIFY BACKUPS EXIST (CRITICAL!)
ls -lah /opt/connect/backups/postgres/
# If empty, STOP and create backup first

# STEP 1: Stop all containers and remove volumes
docker-compose -f docker-compose.production.yml down -v

# STEP 2: Remove application images (preserve base images if possible)
docker rmi connect-app1 connect-app2 connect-scraper

# STEP 3: Clean Docker system (removes 20-30GB typically)
docker system prune -af --volumes

# STEP 4: Remove host build artifacts
cd /opt/connect
rm -rf .next node_modules/.cache

# STEP 5: Verify clean state
docker images | grep connect  # Should be empty
ls -la .next  # Should not exist

# STEP 6: Fresh build with cache busting
BUILD_ID=$(date +%s) docker-compose -f docker-compose.production.yml build --no-cache --pull

# STEP 7: Verify new images
docker images | grep connect  # Should show fresh timestamps

# STEP 8: Start services
docker-compose -f docker-compose.production.yml up -d

# STEP 9: Restore database if needed
cat backup.sql | docker exec -i connect_postgres psql -U connect -d connect
```

### Expected Results

After nuclear reset:
- ✅ 20-30GB disk space freed
- ✅ All Docker cache cleared
- ✅ Fresh Next.js compilation
- ✅ Runtime uses new code
- ⚠️ Database empty (needs restore)
- ⚠️ Volumes recreated (data lost)

---

## Why --no-cache Isn't Enough

### Docker's Cache Invalidation

```dockerfile
# What --no-cache DOES invalidate
FROM node:20-slim  # ✅ Always pulls fresh base
RUN npm ci         # ✅ Reinstalls packages
COPY . .           # ✅ Copies latest files
RUN npm run build  # ✅ Runs build command

# What --no-cache DOESN'T invalidate
# - Build cache objects from previous builds
# - .next directory if copied from host
# - node_modules/.cache if preserved
# - Webpack module IDs if unchanged
```

### Next.js Standalone Mode Complications

Next.js `output: 'standalone'` creates optimized production builds but:

1. **Module tracing**: Analyzes imports and bundles only needed modules
2. **Module IDs**: Assigns numeric IDs to modules (e.g., module 9487)
3. **Incremental compilation**: Reuses modules if source hash unchanged
4. **Standalone output**: Self-contained in `.next/standalone/`

**Problem**: If `.next` exists on host during `COPY . .`, Next.js build sees existing modules and does incremental compilation instead of full rebuild.

---

## Prevention Strategies

### 1. Explicit Cache Busting

Add to Dockerfile:

```dockerfile
# Add build argument for cache busting
ARG BUILD_ID
ENV BUILD_ID=${BUILD_ID}

# Before COPY . ., ensure clean state
RUN rm -rf .next node_modules/.cache

# During build
COPY . .
RUN echo "Build ID: ${BUILD_ID}"
RUN npm run build
```

Usage:
```bash
BUILD_ID=$(date +%s) docker-compose build
```

### 2. Separate Build from Runtime

**Current (Problematic)**:
```
Development → Build on Production → Hope it works
```

**Better**:
```
Development → CI/CD Build → Registry → Production Pull
```

Benefits:
- Fresh build environment every time
- No cache pollution
- Versioned images
- Easy rollback

### 3. Blue-Green Deployment

Instead of `docker-compose down -v`, use:

```bash
# Build new version
docker-compose -f docker-compose.blue.yml build

# Start new stack (keeps old running)
docker-compose -f docker-compose.blue.yml up -d

# Test new stack
curl http://localhost:3003/api/health

# Switch traffic (update nginx)
# Then stop old stack
docker-compose -f docker-compose.green.yml down
```

### 4. Automated Backups

**CRITICAL**: Never use `-v` flag without backups

```bash
# Daily automated backup
0 2 * * * /opt/connect/scripts/backup.sh

# backup.sh
#!/bin/bash
DATE=$(date +%Y%m%d-%H%M%S)
docker exec connect_postgres pg_dump -U connect connect > \
  /opt/connect/backups/postgres/backup-${DATE}.sql

# Keep 7 days of backups
find /opt/connect/backups/postgres/ -name "backup-*.sql" -mtime +7 -delete
```

---

## Troubleshooting Decision Tree

```
Code not updating?
├─ Did you verify source files on server?
│  ├─ No → Check with: docker exec <container> cat <file>
│  └─ Yes → Continue
│
├─ Did you restart containers?
│  ├─ No → Try: docker-compose restart
│  └─ Yes → Continue
│
├─ Did you rebuild with --no-cache?
│  ├─ No → Try: docker-compose build --no-cache
│  └─ Yes → Continue
│
├─ Did you remove .next directory?
│  ├─ No → Try: rm -rf .next && rebuild
│  └─ Yes → Continue
│
├─ Did you remove images before rebuild?
│  ├─ No → Try: docker rmi <images> && rebuild
│  └─ Yes → Continue
│
└─ Still failing after 3 rebuild attempts?
   ├─ YES → Nuclear reset (with backup verification!)
   └─ NO → Check application logs for different error
```

---

## Comparison: SESSION 45 vs SESSION 51

| Aspect | SESSION 45 (OAuth) | SESSION 51 (Match Gen) |
|--------|-------------------|----------------------|
| **Symptom** | 404 on OAuth callbacks | "db is undefined" error |
| **Duration** | ~2 hours | ~3 hours |
| **Rebuilds Attempted** | 2-3 times | 5-6 times |
| **Root Cause** | Webpack cached old routes | Multiple: Cache + DB schema |
| **Solution** | Nuclear reset | Nuclear reset + DB restore |
| **Data Loss** | None (backup existed) | All data (no backup) |
| **Lesson** | Cache persists across --no-cache | Need backup verification |
| **Prevention** | CI/CD pipeline | CI/CD + automated backups |

---

## Red Flags: When to Suspect Cache Issues

1. **"It works locally but not in production"**
   - If dev works but prod fails after deployment → cache pollution

2. **"I updated the code but the error is the same"**
   - If error message identical after fix → old code still running

3. **"Build succeeds but runtime fails"**
   - If build logs show success but app crashes → cache mismatch

4. **"Timestamps are recent but behavior is old"**
   - If `docker images` shows recent timestamp but app acts old → incremental compilation

5. **"Multiple rebuilds don't help"**
   - If 3+ `--no-cache` rebuilds fail → definitely cache pollution

---

## Cost-Benefit: Nuclear Reset vs CI/CD

### Nuclear Reset (Current Approach)

**Pros**:
- Immediate solution
- No infrastructure changes needed
- Works 100% when properly executed

**Cons**:
- 3-4 hours per incident
- Risk of data loss
- Manual process
- Scary (`down -v` command)
- Only fixes symptoms

**Cost**: 3-4 hours engineer time per incident

### CI/CD Pipeline (Recommended)

**Pros**:
- Prevents cache issues entirely
- Fresh build every time
- Versioned deployments
- Easy rollback
- Automated testing
- Professional standard

**Cons**:
- 4-8 hours initial setup
- Requires GitHub Actions knowledge
- Needs Docker registry

**Cost**: 4-8 hours one-time setup

**ROI**: After 2 incidents, CI/CD pays for itself

---

## Action Items for Next Phase

### Immediate (Week 9)
- [x] Document this troubleshooting guide
- [ ] Create database backup script
- [ ] Test backup restore procedure
- [ ] Add BUILD_ID to Dockerfile

### Short-term (Week 10)
- [ ] Set up GitHub Actions CI/CD
- [ ] Configure Docker registry
- [ ] Implement blue-green deployment
- [ ] Add pre-deployment backup check

### Long-term (Week 11+)
- [ ] Automated daily backups
- [ ] Monitoring and alerting
- [ ] Deployment health gates
- [ ] Chaos engineering tests

---

## Conclusion

**The Real Lesson**: Docker cache pollution is not a bug in Docker or Next.js. It's a **systems architecture problem** that requires:

1. **Proper separation**: Build ≠ Runtime environment
2. **Immutable infrastructure**: Tagged images, not `latest`
3. **Safety nets**: Backups, rollbacks, health checks
4. **Professional practices**: CI/CD, monitoring, alerts

The nuclear reset works, but it's a **tactical fix** for a **strategic problem**. The solution is not better cache-busting techniques—it's building infrastructure that makes cache issues impossible.

---

## Further Reading

- [Docker Build Cache Documentation](https://docs.docker.com/build/cache/)
- [Next.js Standalone Output](https://nextjs.org/docs/advanced-features/output-file-tracing)
- [Webpack Module Caching](https://webpack.js.org/configuration/cache/)
- [Blue-Green Deployment Pattern](https://martinfowler.com/bliki/BlueGreenDeployment.html)
- [Immutable Infrastructure](https://www.hashicorp.com/resources/what-is-mutable-vs-immutable-infrastructure)

---

**Document Version**: 1.0
**Author**: SESSION 51 Analysis
**Next Review**: After implementing CI/CD pipeline
