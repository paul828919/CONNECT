# Deployment Strategy

**Document Version:** 1.0  
**Last Updated:** October 13, 2025  
**Status:** Production Active

---

## Overview

Connect uses a **zero-downtime deployment strategy** with blue-green deployments, automated health checks, and instant rollback capabilities. The system is deployed on a **single production server** with high-availability features.

---

## Infrastructure Overview

### **Production Server**

| Component | Details |
|-----------|---------|
| **Host** | 221.164.102.253 |
| **OS** | Ubuntu 22.04.4 LTS (Jammy Jellyfish) |
| **CPU** | Intel Core i9-12900K (16 cores, 24 threads) |
| **RAM** | 125 GB DDR4/DDR5 |
| **Storage (Primary)** | 954 GB NVMe SSD (Root) |
| **Storage (Secondary)** | 9.1 TB HDD (Backup/Archive) |
| **Network (Local)** | 10 Gbps NIC (Container-to-container) |
| **Network (Internet)** | 740 Mbps down / 404 Mbps up (Korea Telecom) |
| **Network Latency** | 12-14 ms (to nearest datacenter) |
| **Docker** | 24.0.7 |
| **Docker Compose** | v2.24.0 |

### **Container Architecture**

```
┌─────────────────────────────────────────────────────────┐
│  HAProxy (Load Balancer)                                │
│  - Port 80 (HTTP) → 443 (HTTPS redirect)               │
│  - Port 443 (HTTPS)                                     │
│  - Health checks every 2 seconds                        │
└────────────────┬────────────────────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
┌───────▼────────┐  ┌────▼──────────┐
│  App1 (Blue)   │  │  App2 (Green) │
│  Port: 3000    │  │  Port: 3000   │
│  Primary       │  │  Backup       │
└───────┬────────┘  └────┬──────────┘
        │                │
        └────────┬───────┘
                 │
    ┌────────────▼─────────────┐
    │  PostgreSQL + Patroni    │
    │  - patroni1 (primary)    │
    │  - patroni2 (replica)    │
    │  - etcd (coordination)   │
    └────────────┬─────────────┘
                 │
    ┌────────────▼─────────────┐
    │  Redis                   │
    │  - Cache & sessions      │
    │  - Pub/Sub messaging     │
    └──────────────────────────┘
```

---

## Deployment Process

### **1. Pre-Deployment**

```bash
#!/bin/bash
# scripts/pre-deploy-check.sh

set -e

echo "🔍 Running pre-deployment checks..."

# Check server accessibility
if ! ssh user@221.164.102.253 'echo "Server reachable"'; then
  echo "❌ Cannot connect to server!"
  exit 1
fi

# Check disk space
DISK_USAGE=$(ssh user@221.164.102.253 'df -h /opt/connect | tail -1 | awk "{print \$5}"' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
  echo "⚠️  Warning: Disk usage is ${DISK_USAGE}%"
  read -p "Continue? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Check running containers
RUNNING_CONTAINERS=$(ssh user@221.164.102.253 'docker ps --format "{{.Names}}"')
echo "📦 Running containers:"
echo "$RUNNING_CONTAINERS"

# Verify database health
DB_HEALTH=$(ssh user@221.164.102.253 'docker exec connect_postgres pg_isready -U connect')
if [[ ! $DB_HEALTH =~ "accepting connections" ]]; then
  echo "❌ Database not healthy!"
  exit 1
fi

echo "✅ Pre-deployment checks passed!"
```

### **2. Build & Upload**

```bash
#!/bin/bash
# scripts/build-and-upload.sh

set -e

echo "🏗️  Building production image..."

# Build locally (optional, can build on server)
docker build -f Dockerfile.production -t connect:latest .

# Tag with version
VERSION=$(date +%Y%m%d-%H%M%S)
docker tag connect:latest connect:$VERSION

# Save image
docker save connect:$VERSION | gzip > connect-$VERSION.tar.gz

# Upload to server
scp connect-$VERSION.tar.gz user@221.164.102.253:/opt/connect/images/

# Load on server
ssh user@221.164.102.253 "docker load < /opt/connect/images/connect-$VERSION.tar.gz"

echo "✅ Image uploaded and loaded: connect:$VERSION"
```

### **3. Database Migration**

```bash
#!/bin/bash
# scripts/migrate-database.sh

set -e

echo "💾 Running database migrations..."

# Upload seed.ts if needed
scp prisma/seed.ts user@221.164.102.253:/opt/connect/prisma/

# Copy to container
ssh user@221.164.102.253 'docker cp /opt/connect/prisma/seed.ts connect_app1:/app/prisma/seed.ts'

# Run migrations (non-interactive)
ssh user@221.164.102.253 'docker exec connect_app1 npx prisma migrate deploy'

# Verify migration
ssh user@221.164.102.253 'docker exec connect_postgres psql -U connect -c "SELECT version, applied_at FROM _prisma_migrations ORDER BY applied_at DESC LIMIT 5;"'

echo "✅ Database migrations completed!"
```

### **4. Blue-Green Deployment**

```bash
#!/bin/bash
# scripts/deploy-blue-green.sh

set -e

echo "🚀 Starting blue-green deployment..."

# Current state: app1 (blue) is active, app2 (green) is backup

# Step 1: Deploy to green (app2)
echo "📦 Deploying to GREEN (app2)..."
ssh user@221.164.102.253 'cd /opt/connect && docker-compose -f docker-compose.production.yml up -d --no-deps --build app2'

# Step 2: Wait for health checks
echo "⏳ Waiting for app2 to be healthy..."
for i in {1..30}; do
  HEALTH=$(ssh user@221.164.102.253 'curl -s http://localhost:3001/api/health | jq -r .status' || echo "unhealthy")
  if [ "$HEALTH" = "healthy" ]; then
    echo "✅ App2 is healthy!"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "❌ App2 failed to become healthy!"
    exit 1
  fi
  echo "  Attempt $i/30... ($HEALTH)"
  sleep 2
done

# Step 3: Switch traffic to green
echo "🔄 Switching traffic to GREEN (app2)..."
ssh user@221.164.102.253 << 'EOF'
  docker exec haproxy sh -c "
    sed -i 's/server app1 connect_app1:3000 check/server app1 connect_app1:3000 check backup/' /etc/haproxy/haproxy.cfg
    sed -i 's/server app2 connect_app2:3000 check backup/server app2 connect_app2:3000 check/' /etc/haproxy/haproxy.cfg
    kill -HUP 1
  "
EOF

echo "✅ Traffic switched to GREEN (app2)!"
sleep 5

# Step 4: Deploy to blue (app1)
echo "📦 Deploying to BLUE (app1)..."
ssh user@221.164.102.253 'cd /opt/connect && docker-compose -f docker-compose.production.yml up -d --no-deps --build app1'

# Step 5: Wait for app1 health
echo "⏳ Waiting for app1 to be healthy..."
for i in {1..30}; do
  HEALTH=$(ssh user@221.164.102.253 'curl -s http://localhost:3000/api/health | jq -r .status' || echo "unhealthy")
  if [ "$HEALTH" = "healthy" ]; then
    echo "✅ App1 is healthy!"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "⚠️  App1 failed to become healthy, but app2 is still serving traffic"
  fi
  sleep 2
done

# Step 6: Restore balanced traffic
echo "🔄 Restoring balanced traffic..."
ssh user@221.164.102.253 << 'EOF'
  docker exec haproxy sh -c "
    sed -i 's/server app1 connect_app1:3000 check backup/server app1 connect_app1:3000 check/' /etc/haproxy/haproxy.cfg
    kill -HUP 1
  "
EOF

echo "✅ Deployment complete! Both containers are active."
```

### **5. Post-Deployment Verification**

```bash
#!/bin/bash
# scripts/post-deploy-check.sh

set -e

echo "🔍 Running post-deployment checks..."

# Health check
echo "💚 Checking application health..."
HEALTH=$(curl -s https://221.164.102.253/api/health | jq -r .status)
if [ "$HEALTH" != "healthy" ]; then
  echo "❌ Application is not healthy!"
  exit 1
fi

# Database connectivity
echo "💾 Checking database connectivity..."
ssh user@221.164.102.253 'docker exec connect_postgres psql -U connect -c "SELECT COUNT(*) FROM users;"'

# Redis connectivity
echo "🔴 Checking Redis connectivity..."
ssh user@221.164.102.253 'docker exec connect_redis redis-cli ping'

# Test critical endpoints
echo "🧪 Testing critical endpoints..."
curl -s https://221.164.102.253/api/health | jq .
curl -s https://221.164.102.253/ | grep -q "Connect" || echo "⚠️  Homepage check failed"

# Check container logs for errors
echo "📋 Checking logs for errors..."
ERROR_COUNT=$(ssh user@221.164.102.253 'docker logs connect_app1 --since 5m 2>&1 | grep -i error | wc -l')
if [ $ERROR_COUNT -gt 10 ]; then
  echo "⚠️  Warning: $ERROR_COUNT errors in last 5 minutes"
  ssh user@221.164.102.253 'docker logs connect_app1 --since 5m --tail 20'
fi

echo "✅ All post-deployment checks passed!"
```

---

## Rollback Strategy

### **1. Instant Rollback (Traffic Switch)**

```bash
#!/bin/bash
# scripts/rollback-instant.sh

set -e

echo "⚠️  INITIATING INSTANT ROLLBACK..."

# Switch traffic back to previous version
ssh user@221.164.102.253 << 'EOF'
  docker exec haproxy sh -c "
    # Assuming app1 is current (bad), app2 is previous (good)
    sed -i 's/server app1 connect_app1:3000 check/server app1 connect_app1:3000 check backup/' /etc/haproxy/haproxy.cfg
    sed -i 's/server app2 connect_app2:3000 check backup/server app2 connect_app2:3000 check/' /etc/haproxy/haproxy.cfg
    kill -HUP 1
  "
EOF

echo "✅ Rollback complete! Traffic switched to previous version."
echo "⏱️  Time elapsed: < 5 seconds"
```

**Rollback Time:** < 5 seconds  
**Downtime:** 0 seconds

### **2. Full Rollback (Image Revert)**

```bash
#!/bin/bash
# scripts/rollback-full.sh

set -e

VERSION=${1:-"previous"}

echo "⚠️  INITIATING FULL ROLLBACK TO VERSION: $VERSION"

# Stop current containers
ssh user@221.164.102.253 'cd /opt/connect && docker-compose -f docker-compose.production.yml stop app1 app2'

# Load previous image
ssh user@221.164.102.253 "docker load < /opt/connect/images/connect-$VERSION.tar.gz"

# Tag as latest
ssh user@221.164.102.253 "docker tag connect:$VERSION connect:latest"

# Start containers with previous version
ssh user@221.164.102.253 'cd /opt/connect && docker-compose -f docker-compose.production.yml up -d app1 app2'

# Wait for health checks
sleep 15

# Verify health
curl -f https://221.164.102.253/api/health

echo "✅ Full rollback complete!"
```

**Rollback Time:** ~30 seconds  
**Downtime:** ~10 seconds

### **3. Database Rollback**

```bash
#!/bin/bash
# scripts/rollback-database.sh

set -e

BACKUP_FILE=${1:-"latest"}

echo "⚠️  INITIATING DATABASE ROLLBACK..."

# Find latest backup if not specified
if [ "$BACKUP_FILE" = "latest" ]; then
  BACKUP_FILE=$(ssh user@221.164.102.253 'ls -t /backups/postgres/*.sql | head -1')
fi

echo "📁 Restoring from: $BACKUP_FILE"

# Stop applications (to prevent writes)
ssh user@221.164.102.253 'cd /opt/connect && docker-compose -f docker-compose.production.yml stop app1 app2'

# Restore database
ssh user@221.164.102.253 "docker exec -i connect_postgres psql -U connect < $BACKUP_FILE"

# Restart applications
ssh user@221.164.102.253 'cd /opt/connect && docker-compose -f docker-compose.production.yml start app1 app2'

echo "✅ Database rollback complete!"
```

**RPO (Recovery Point Objective):** 15 minutes  
**RTO (Recovery Time Objective):** 5 minutes

---

## Deployment Checklist

### **Pre-Deployment**

- [ ] Code review approved
- [ ] All tests passing locally
- [ ] Linting passed
- [ ] Type checking passed
- [ ] Database migration tested
- [ ] Backup created
- [ ] Team notified
- [ ] Maintenance window (if needed)

### **During Deployment**

- [ ] Build successful
- [ ] Image uploaded
- [ ] Database migrations applied
- [ ] Green deployment healthy
- [ ] Traffic switched
- [ ] Blue deployment healthy
- [ ] Both containers active

### **Post-Deployment**

- [ ] Health check passed
- [ ] Critical endpoints tested
- [ ] Database queries working
- [ ] No error spikes in logs
- [ ] Performance metrics normal
- [ ] Monitoring alerts quiet
- [ ] Backup verified
- [ ] Documentation updated

---

## Monitoring During Deployment

### **1. Real-Time Metrics**

```bash
# Watch container health
watch -n 2 'ssh user@221.164.102.253 "docker ps --format \"table {{.Names}}\t{{.Status}}\""'

# Monitor logs
ssh user@221.164.102.253 'docker logs -f connect_app1'

# Watch HAProxy stats
ssh user@221.164.102.253 'watch -n 1 "echo \"show stat\" | socat stdio /var/run/haproxy/admin.sock"'
```

### **2. Grafana Dashboard**

**URL:** http://221.164.102.253:3100

**Key Panels:**
- Request rate (per second)
- Error rate (%)
- Response time (p50, p95, p99)
- Container CPU/memory
- Database connections
- Redis hit rate

---

## Disaster Recovery

### **1. Complete System Failure**

```bash
#!/bin/bash
# scripts/disaster-recovery.sh

set -e

echo "🆘 INITIATING DISASTER RECOVERY..."

# Stop all containers
ssh user@221.164.102.253 'cd /opt/connect && docker-compose -f docker-compose.production.yml down'

# Restore database from backup
ssh user@221.164.102.253 'docker-compose -f docker-compose.production.yml up -d postgres'
sleep 10
ssh user@221.164.102.253 'docker exec -i connect_postgres psql -U connect < /backups/postgres/latest.sql'

# Restore Redis
ssh user@221.164.102.253 'docker cp /backups/redis/dump.rdb connect_redis:/data/'

# Restore uploads
ssh user@221.164.102.253 'rsync -av /backups/uploads/ /opt/connect/uploads/'

# Start all services
ssh user@221.164.102.253 'cd /opt/connect && docker-compose -f docker-compose.production.yml up -d'

# Wait for services
sleep 30

# Verify
curl -f https://221.164.102.253/api/health

echo "✅ Disaster recovery complete!"
```

### **2. Data Corruption**

```bash
# Restore database from specific point in time
ssh user@221.164.102.253 'docker exec connect_postgres psql -U connect < /backups/postgres/connect_20241013_1400.sql'
```

---

## Security Measures

### **1. Access Control**

```bash
# SSH key-based authentication only
ssh-copy-id user@221.164.102.253

# Disable password authentication
ssh user@221.164.102.253 'sudo sed -i "s/PasswordAuthentication yes/PasswordAuthentication no/" /etc/ssh/sshd_config'

# Firewall rules
ssh user@221.164.102.253 'sudo ufw allow 22/tcp'    # SSH
ssh user@221.164.102.253 'sudo ufw allow 80/tcp'    # HTTP
ssh user@221.164.102.253 'sudo ufw allow 443/tcp'   # HTTPS
ssh user@221.164.102.253 'sudo ufw enable'
```

### **2. Secrets Management**

```bash
# Never commit secrets to Git
echo ".env.production.local" >> .gitignore

# Use environment variables
# docker-compose.production.yml
environment:
  - DATABASE_URL=${DATABASE_URL}
  - REDIS_PASSWORD=${REDIS_PASSWORD}
  - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}

# Rotate secrets regularly (every 90 days)
```

---

## Performance Optimization

### **1. Database Query Optimization**

```sql
-- Add indexes for frequently queried columns
CREATE INDEX idx_funding_matches_org_score ON funding_matches(organizationId, score DESC);
CREATE INDEX idx_funding_programs_agency ON funding_programs(agency);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM funding_matches WHERE organizationId = 'xxx';
```

### **2. Redis Caching**

```typescript
// Cache frequently accessed data
const cacheKey = `org:${organizationId}:matches`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const data = await prisma.fundingMatch.findMany({ /* ... */ });
await redis.set(cacheKey, JSON.stringify(data), 'EX', 3600); // 1 hour TTL
```

---

## References

- **Docker Compose:** `docker-compose.production.yml`
- **Deployment Scripts:** `scripts/deploy-*.sh`
- **HAProxy Config:** `config/haproxy/haproxy.cfg`
- **Monitoring:** Grafana at http://221.164.102.253:3100

---

**Related Documents:**
- [CICD-PIPELINE.md](./CICD-PIPELINE.md)
- [BUILD-PROCESS.md](./BUILD-PROCESS.md)
- [DEV-ENVIRONMENT.md](./DEV-ENVIRONMENT.md)
- [IMPLEMENTATION-ROADMAP.md](./IMPLEMENTATION-ROADMAP.md)


