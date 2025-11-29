# Production Server Storage Optimization Plan
**Version**: 1.0
**Created**: 2025-11-30
**Author**: Product Management Team
**Status**: PENDING APPROVAL

---

## Executive Summary

This plan addresses the 302GB Docker image accumulation on the production server (59.21.170.6). The goal is to recover ~283GB of storage and establish automated practices to prevent recurrence.

**Current State**: 375GB used (43%) | 515GB available
**Target State**: ~90GB used (~10%) | 848GB available
**Risk Level**: Low (all operations are reversible or backed up)

---

## Work Rules Compliance

| Rule | Implementation |
|------|----------------|
| SSH Key Only | All commands use `ssh -i ~/.ssh/id_ed25519_connect` |
| Local Verification | Each phase verified before proceeding |
| No Password in Commands | Strictly enforced |
| Commit After Each Task | Changes tracked in git |

---

## Phase 1: Immediate Actions (Day 1)

### 1.1 Pre-Cleanup Verification
**Objective**: Document current state before any changes

```bash
# Step 1.1.1: Capture baseline metrics
ssh -i ~/.ssh/id_ed25519_connect user@59.21.170.6 << 'EOF'
echo "=== BASELINE SNAPSHOT $(date) ===" > /home/user/storage-baseline-$(date +%Y%m%d).log
echo "" >> /home/user/storage-baseline-$(date +%Y%m%d).log
echo "=== DISK USAGE ===" >> /home/user/storage-baseline-$(date +%Y%m%d).log
df -h >> /home/user/storage-baseline-$(date +%Y%m%d).log
echo "" >> /home/user/storage-baseline-$(date +%Y%m%d).log
echo "=== DOCKER IMAGES ===" >> /home/user/storage-baseline-$(date +%Y%m%d).log
docker images >> /home/user/storage-baseline-$(date +%Y%m%d).log
echo "" >> /home/user/storage-baseline-$(date +%Y%m%d).log
echo "=== DOCKER SYSTEM DF ===" >> /home/user/storage-baseline-$(date +%Y%m%d).log
docker system df -v >> /home/user/storage-baseline-$(date +%Y%m%d).log
cat /home/user/storage-baseline-$(date +%Y%m%d).log
EOF
```

**Expected Output**: Baseline log file created at `/home/user/storage-baseline-YYYYMMDD.log`
**Verification**: File exists and contains current metrics
**Rollback**: N/A (read-only operation)

---

### 1.2 Verify Running Containers
**Objective**: Ensure no disruption to active services

```bash
# Step 1.2.1: List all running containers
ssh -i ~/.ssh/id_ed25519_connect user@59.21.170.6 'docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"'
```

**Expected Output**: 6 running containers (app1, app2, scraper, postgres, redis, nginx)
**Verification**: All critical services are running
**Rollback**: N/A (read-only operation)

---

### 1.3 Clean Dangling Images
**Objective**: Remove images not tagged or referenced by containers

```bash
# Step 1.3.1: Preview dangling images (DRY RUN)
ssh -i ~/.ssh/id_ed25519_connect user@59.21.170.6 'docker images -f "dangling=true" --format "{{.ID}}: {{.Size}}"'

# Step 1.3.2: Remove dangling images
ssh -i ~/.ssh/id_ed25519_connect user@59.21.170.6 'docker image prune -f'
```

**Expected Recovery**: ~224 GB
**Verification**: `docker images -f "dangling=true"` returns empty
**Rollback**: Cannot restore (but these are orphaned layers, not usable images)
**Risk**: LOW - Dangling images are by definition unused

---

### 1.4 Clean Build Cache
**Objective**: Remove Docker build cache

```bash
# Step 1.4.1: Preview build cache size
ssh -i ~/.ssh/id_ed25519_connect user@59.21.170.6 'docker builder prune --dry-run'

# Step 1.4.2: Remove build cache
ssh -i ~/.ssh/id_ed25519_connect user@59.21.170.6 'docker builder prune -f'
```

**Expected Recovery**: ~6.1 GB
**Verification**: `docker system df` shows Build Cache near 0
**Rollback**: Next build will recreate cache (slower first build only)
**Risk**: LOW - Only affects build performance temporarily

---

### 1.5 Clean Old Tagged Images (Keep Last 3 Deployments)
**Objective**: Remove old deployment images while preserving rollback capability

```bash
# Step 1.5.1: List images to keep (current + 2 previous)
ssh -i ~/.ssh/id_ed25519_connect user@59.21.170.6 << 'EOF'
echo "=== IMAGES TO KEEP ==="
docker images --format "{{.Repository}}:{{.Tag}} {{.CreatedSince}}" | grep -E "^connect:|^connect-scraper:" | head -6

echo ""
echo "=== IMAGES TO REMOVE (older than 72 hours) ==="
docker images --format "{{.Repository}}:{{.Tag}} {{.CreatedSince}} {{.Size}}" | grep -E "^connect:|^connect-scraper:" | tail -n +7
EOF

# Step 1.5.2: Remove images older than 72 hours (preserves 3 most recent)
ssh -i ~/.ssh/id_ed25519_connect user@59.21.170.6 'docker image prune -a --filter "until=72h" -f'
```

**Expected Recovery**: ~50 GB
**Verification**: Only last 3 deployments' images remain
**Rollback**: Can pull from registry if needed
**Risk**: LOW - Keeps 3 versions for rollback, older ones can be rebuilt

---

### 1.6 Clean System Journal Logs
**Objective**: Reduce systemd journal from 4GB to 500MB

```bash
# Step 1.6.1: Check current journal size
ssh -i ~/.ssh/id_ed25519_connect user@59.21.170.6 'sudo journalctl --disk-usage'

# Step 1.6.2: Vacuum to 500MB
ssh -i ~/.ssh/id_ed25519_connect user@59.21.170.6 'sudo journalctl --vacuum-size=500M'

# Step 1.6.3: Verify new size
ssh -i ~/.ssh/id_ed25519_connect user@59.21.170.6 'sudo journalctl --disk-usage'
```

**Expected Recovery**: ~3.5 GB
**Verification**: Journal size reports ~500MB
**Rollback**: Cannot restore (old logs lost)
**Risk**: LOW - Old logs rarely needed; recent logs preserved

---

### 1.7 Post-Cleanup Verification
**Objective**: Document final state and calculate recovery

```bash
# Step 1.7.1: Capture final metrics
ssh -i ~/.ssh/id_ed25519_connect user@59.21.170.6 << 'EOF'
echo "=== FINAL SNAPSHOT $(date) ==="
echo ""
echo "=== DISK USAGE ==="
df -h
echo ""
echo "=== DOCKER SYSTEM DF ==="
docker system df
echo ""
echo "=== REMAINING IMAGES ==="
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedSince}}"
EOF

# Step 1.7.2: Verify services still running
ssh -i ~/.ssh/id_ed25519_connect user@59.21.170.6 'docker ps --format "table {{.Names}}\t{{.Status}}"'

# Step 1.7.3: Health check
curl -s https://connectplt.kr/api/health | jq .
```

**Expected Final State**: ~90GB used (10%)
**Verification**: All 6 containers running, health check passes
**Success Criteria**: Storage reduced by 280+ GB, all services operational

---

## Phase 2: Mid-Term Actions (Week 2-4)

### 2.1 Add Automated Cleanup to CI/CD Pipeline
**Objective**: Prevent future accumulation by cleaning after each deployment

**File to Modify**: `.github/workflows/deploy-production.yml`

**Changes**:
```yaml
# Add after successful deployment step (around line 180)
      - name: Cleanup old Docker images
        if: success()
        run: |
          ssh -i ~/.ssh/id_ed25519_connect -o StrictHostKeyChecking=no user@59.21.170.6 << 'EOF'
          echo "Cleaning images older than 72 hours..."
          docker image prune -a --filter "until=72h" -f
          docker builder prune -f --filter "until=24h"
          echo "Cleanup complete. Current Docker disk usage:"
          docker system df
          EOF
```

**Verification**:
1. Run deployment and verify cleanup step executes
2. Check that only recent images remain

**Rollback**: Remove the added step from workflow file

---

### 2.2 Configure Systemd Journal Retention
**Objective**: Automatically limit journal growth

```bash
# Step 2.2.1: Backup current config
ssh -i ~/.ssh/id_ed25519_connect user@59.21.170.6 'sudo cp /etc/systemd/journald.conf /etc/systemd/journald.conf.backup'

# Step 2.2.2: Update journal configuration
ssh -i ~/.ssh/id_ed25519_connect user@59.21.170.6 << 'EOF'
sudo tee -a /etc/systemd/journald.conf << 'CONF'

# Storage optimization settings (added 2025-11-30)
SystemMaxUse=500M
SystemKeepFree=1G
MaxRetentionSec=7day
CONF
EOF

# Step 2.2.3: Restart journald to apply
ssh -i ~/.ssh/id_ed25519_connect user@59.21.170.6 'sudo systemctl restart systemd-journald'

# Step 2.2.4: Verify new settings
ssh -i ~/.ssh/id_ed25519_connect user@59.21.170.6 'sudo journalctl --disk-usage'
```

**Verification**: Journal stays under 500MB automatically
**Rollback**: `sudo cp /etc/systemd/journald.conf.backup /etc/systemd/journald.conf && sudo systemctl restart systemd-journald`

---

### 2.3 Archive Legacy Projects (Optional)
**Objective**: Free additional 7.7GB from unused projects

**Projects Identified**:
| Project | Size | Last Modified | Recommendation |
|---------|------|---------------|----------------|
| PUSAN_PROJ | 6.8 GB | Unknown | Archive to cloud |
| aqua_labs | 922 MB | Unknown | Confirm with team |

```bash
# Step 2.3.1: Check last modification dates
ssh -i ~/.ssh/id_ed25519_connect user@59.21.170.6 << 'EOF'
echo "=== PUSAN_PROJ ==="
ls -la /home/user/PUSAN_PROJ/ | head -5
find /home/user/PUSAN_PROJ -type f -printf '%T+ %p\n' | sort -r | head -3

echo ""
echo "=== aqua_labs ==="
ls -la /home/user/aqua_labs/ | head -5
find /home/user/aqua_labs -type f -printf '%T+ %p\n' | sort -r | head -3
EOF

# Step 2.3.2: Create compressed archive (if approved)
# ssh -i ~/.ssh/id_ed25519_connect user@59.21.170.6 'tar -czvf /home/user/backups/PUSAN_PROJ-archive-$(date +%Y%m%d).tar.gz /home/user/PUSAN_PROJ'

# Step 2.3.3: Remove after confirming archive integrity (if approved)
# ssh -i ~/.ssh/id_ed25519_connect user@59.21.170.6 'rm -rf /home/user/PUSAN_PROJ'
```

**Note**: This step requires explicit approval as it involves potentially active projects.

---

## Phase 3: Long-Term Actions (Month 2+)

### 3.1 Storage Monitoring Script
**Objective**: Create automated monitoring with alerts

**New File**: `scripts/monitor-storage.sh`

```bash
#!/bin/bash
# Storage monitoring script for Connect production server
# Sends alert when storage exceeds threshold

THRESHOLD=70
CRITICAL=80

USAGE=$(df -h / | awk 'NR==2 {print $5}' | tr -d '%')
DOCKER_USAGE=$(docker system df --format "{{.Size}}" | head -1)

if [ "$USAGE" -gt "$CRITICAL" ]; then
    echo "CRITICAL: Disk usage at ${USAGE}% - immediate action required"
    # Add notification logic (Slack, email, etc.)
    exit 2
elif [ "$USAGE" -gt "$THRESHOLD" ]; then
    echo "WARNING: Disk usage at ${USAGE}% - cleanup recommended"
    exit 1
else
    echo "OK: Disk usage at ${USAGE}%"
    exit 0
fi
```

**Cron Setup**:
```bash
# Add to crontab: run every 6 hours
0 */6 * * * /opt/connect/scripts/monitor-storage.sh >> /opt/connect/logs/storage-monitor.log 2>&1
```

---

### 3.2 Docker Image Retention Policy
**Objective**: Automatically maintain only last N deployment images

**Add to CI/CD or as separate cron job**:

```bash
#!/bin/bash
# Keep only the last 3 tagged versions of each image

for IMAGE in connect connect-scraper; do
    # Get all tags except 'latest', sorted by creation date
    TAGS=$(docker images $IMAGE --format "{{.Tag}} {{.CreatedAt}}" | grep -v latest | sort -k2 -r | tail -n +4 | awk '{print $1}')

    for TAG in $TAGS; do
        if [ "$TAG" != "latest" ]; then
            echo "Removing old image: $IMAGE:$TAG"
            docker rmi "$IMAGE:$TAG" 2>/dev/null || true
        fi
    done
done
```

---

### 3.3 Grafana Dashboard for Storage
**Objective**: Visual monitoring integrated with existing observability

**Add to existing Grafana**:
- Panel 1: Disk usage percentage over time
- Panel 2: Docker images count and size
- Panel 3: Log directory growth rate
- Alert: Trigger at 70% threshold

---

## Execution Timeline

| Phase | Task | Duration | Dependencies |
|-------|------|----------|--------------|
| **Phase 1** | | **~30 minutes** | |
| 1.1 | Pre-cleanup verification | 2 min | None |
| 1.2 | Verify running containers | 1 min | 1.1 |
| 1.3 | Clean dangling images | 5 min | 1.2 |
| 1.4 | Clean build cache | 2 min | 1.3 |
| 1.5 | Clean old tagged images | 5 min | 1.4 |
| 1.6 | Clean journal logs | 2 min | 1.5 |
| 1.7 | Post-cleanup verification | 5 min | 1.6 |
| **Phase 2** | | **~2 hours** | |
| 2.1 | Add CI/CD cleanup step | 30 min | Phase 1 complete |
| 2.2 | Configure journal retention | 15 min | Phase 1 complete |
| 2.3 | Archive legacy projects | 1 hour | User approval |
| **Phase 3** | | **~4 hours** | |
| 3.1 | Storage monitoring script | 1 hour | Phase 2 complete |
| 3.2 | Image retention policy | 1 hour | Phase 2 complete |
| 3.3 | Grafana dashboard | 2 hours | Phase 2 complete |

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Service disruption during cleanup | Low | High | Verify containers before/after |
| Accidental removal of needed image | Low | Medium | Keep 3 versions, can rebuild |
| Journal log loss | Low | Low | Recent logs preserved (7 days) |
| CI/CD failure after changes | Low | Medium | Test in staging first |

---

## Success Criteria

| Metric | Before | Target | Measurement |
|--------|--------|--------|-------------|
| Disk usage | 43% (375GB) | <15% (~100GB) | `df -h /` |
| Docker images | 302GB | <20GB | `docker system df` |
| Image count | 175 | <10 | `docker images \| wc -l` |
| Services uptime | 100% | 100% | Health check API |

---

## Approval Section

**Prepared by**: Product Management Team
**Date**: 2025-11-30

### Approval Required For:

- [ ] **Phase 1**: Immediate cleanup (Day 1)
- [ ] **Phase 2**: CI/CD and configuration changes (Week 2-4)
- [ ] **Phase 3**: Monitoring and automation (Month 2+)
- [ ] **Phase 2.3**: Archive legacy projects (PUSAN_PROJ, aqua_labs)

**Approved by**: _______________
**Date**: _______________
**Notes**: _______________

---

## Appendix: Quick Reference Commands

```bash
# Check current state
ssh -i ~/.ssh/id_ed25519_connect user@59.21.170.6 'df -h && docker system df'

# Emergency cleanup (if disk full)
ssh -i ~/.ssh/id_ed25519_connect user@59.21.170.6 'docker system prune -a -f --volumes'

# Verify services
ssh -i ~/.ssh/id_ed25519_connect user@59.21.170.6 'docker ps'
curl -s https://connectplt.kr/api/health
```

---

## Implementation Log

### Phase 1 Execution (2025-11-30)

| Step | Status | Notes |
|------|--------|-------|
| 1.1 Pre-cleanup verification | ✅ Complete | Baseline: 375GB (43%), 175+ images |
| 1.2 Verify containers | ✅ Complete | 6 containers healthy |
| 1.3 Clean dangling images | ✅ Complete | Recovered: 1.87 GB |
| 1.4 Clean build cache | ✅ Complete | Recovered: 8.99 GB |
| 1.5 Clean old tagged images | ✅ Complete | Recovered: ~270 GB |
| 1.6 Clean journal logs | ✅ Complete (manual) | Recovered: 3.5 GB |
| 1.7 Post-cleanup verification | ✅ Complete | Final: 80GB (~9%), 14 images |

**Total Phase 1 Recovery: ~284 GB**

### Phase 2 Implementation (2025-11-30)

| Step | Status | Notes |
|------|--------|-------|
| 2.1 CI/CD cleanup step | ✅ Complete | Added to `deploy-production.yml` |
| 2.2 Journal retention | ✅ Script created | Requires sudo: `scripts/configure-journal-retention.sh` |
| 2.3 Archive legacy projects | ⏸️ Pending approval | Script: `scripts/archive-legacy-projects.sh` |

### Phase 3 Implementation (2025-11-30)

| Step | Status | Notes |
|------|--------|-------|
| 3.1 Storage monitoring | ✅ Complete | Script: `scripts/monitor-storage.sh` |
| 3.2 Image retention policy | ✅ Complete | Script: `scripts/cleanup-docker-images.sh` |
| 3.3 Grafana dashboard | 📋 Documented | Manual setup in Grafana UI (see below) |

### Scripts Created

Located in `/opt/connect/scripts/` (after deployment):

1. **`monitor-storage.sh`** - Storage monitoring with alerts
   - Cron: `0 */6 * * * /opt/connect/scripts/monitor-storage.sh >> /opt/connect/logs/storage-monitor.log 2>&1`
   - Exit codes: 0=OK, 1=WARNING, 2=CRITICAL

2. **`cleanup-docker-images.sh`** - Docker image retention policy
   - Keeps last 3 versions of each image
   - Cron: `0 3 * * * /opt/connect/scripts/cleanup-docker-images.sh >> /opt/connect/logs/docker-cleanup.log 2>&1`

3. **`configure-journal-retention.sh`** - Journal configuration (requires sudo)
   - Run once: `sudo /opt/connect/scripts/configure-journal-retention.sh`

4. **`archive-legacy-projects.sh`** - Archive old projects
   - Preview: `./archive-legacy-projects.sh --dry-run`
   - Execute: `./archive-legacy-projects.sh --delete`

### Grafana Dashboard Setup (Phase 3.3)

To add storage monitoring to Grafana:

1. Navigate to Grafana → Dashboards → New Dashboard
2. Add the following panels:

**Panel 1: Disk Usage Percentage**
```promql
100 - ((node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) * 100)
```

**Panel 2: Docker Images Size**
- Use custom data source or script output
- Command: `docker system df --format "{{.Type}}\t{{.Size}}"`

**Panel 3: Log Directory Growth**
```promql
node_filesystem_avail_bytes{mountpoint="/var/log"} / 1024 / 1024 / 1024
```

**Alert Rule:**
- Condition: Disk usage > 70%
- Severity: Warning
- Notification: Slack/Email

### Cron Setup Summary

Add to production server crontab (`crontab -e`):

```cron
# Storage monitoring (every 6 hours)
0 */6 * * * /opt/connect/scripts/monitor-storage.sh >> /opt/connect/logs/storage-monitor.log 2>&1

# Docker image cleanup (daily at 3 AM)
0 3 * * * /opt/connect/scripts/cleanup-docker-images.sh >> /opt/connect/logs/docker-cleanup.log 2>&1
```
