# CI/CD Pipeline Architecture

**Document Version:** 1.0  
**Last Updated:** October 13, 2025  
**Status:** Production Active

---

## Overview

Connect's CI/CD pipeline is designed for **zero-downtime deployments** with automated testing, build optimization, and production rollout strategies. The pipeline supports multi-container orchestration with health checks and rollback capabilities.

---

## Pipeline Architecture

### 1. **Development Workflow**

```
Local Dev → Git Push → GitHub → Docker Build → Production Deploy
     ↓                              ↓                ↓
  Hot Reload            Multi-stage Build    Health Checks
  Type Check            Layer Caching        Blue-Green Deploy
  Linting               Image Optimization   Rollback Ready
```

### 2. **Build Stages**

#### **Stage 1: Dependencies Installation**
```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
```

**Key Features:**
- Alpine Linux for minimal image size
- `npm ci` for deterministic installs
- Layer caching for faster rebuilds

#### **Stage 2: Build Artifacts**
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build
```

**Optimizations:**
- Prisma client generation before build
- Static analysis during build
- Tree-shaking for minimal bundle

#### **Stage 3: Production Runtime**
```dockerfile
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static
```

**Security:**
- Non-root user execution
- Minimal attack surface
- No dev dependencies

---

## Deployment Pipeline

### 1. **Pre-Deployment Checks**

```bash
# Type checking
npx tsc --noEmit

# Linting
npm run lint

# Database migrations (dry-run)
npx prisma migrate deploy --preview
```

### 2. **Build & Test**

```bash
# Build production image
docker build -f Dockerfile.production -t connect:latest .

# Run integration tests
docker-compose -f docker-compose.test.yml up --abort-on-container-exit
```

### 3. **Production Deployment**

```bash
# Tag with version
docker tag connect:latest connect:v1.2.3

# Deploy with zero downtime
docker-compose -f docker-compose.production.yml up -d --no-deps --build app1
sleep 30  # Health check window
docker-compose -f docker-compose.production.yml up -d --no-deps --build app2
```

---

## Production Server Infrastructure

### **Server Specifications**

| Component | Details |
|-----------|---------|
| **Host** | 221.164.102.253 |
| **OS** | Ubuntu 22.04.4 LTS (Jammy Jellyfish) |
| **Kernel** | 6.8.0-64-generic (PREEMPT_DYNAMIC) |
| **CPU** | Intel Core i9-12900K (12th Gen Alder Lake) |
| **Physical Cores** | 16 cores (8 P-cores + 8 E-cores) |
| **Logical CPUs** | 24 threads (with Hyper-Threading) |
| **CPU Frequency** | Base: 3.2 GHz, Turbo: 5.2 GHz |
| **L3 Cache** | 30 MB |
| **RAM** | 125 GB DDR4/DDR5 |
| **Primary Storage** | 954 GB NVMe SSD (`/dev/nvme0n1`) |
| **Secondary Storage** | 9.1 TB HDD (`/dev/sda`) for backups/archive |
| **Network Interface** | eno1 @ 10 Gbps (Local/LAN) |
| **Internet Connection** | 740 Mbps down / 404 Mbps up (Korea Telecom) |
| **Network Latency** | 12-14 ms (to datacenter) |
| **Public IP** | 221.164.102.253/27 |
| **Docker Version** | 24.0.7 |
| **Docker Compose** | v2.24.0 |

### **Resource Utilization**

| Resource | Total | Used | Available | Usage % |
|----------|-------|------|-----------|---------|
| **RAM** | 125 GB | 2.2 GB | 121 GB | 1.7% |
| **Disk** | 938 GB | 53 GB | 838 GB | 6% |
| **Swap** | 2.0 GB | 0 GB | 2.0 GB | 0% |

**Performance Headroom:** The server has significant capacity for scaling:
- CPU: 24 threads available for parallel processing
- RAM: 121 GB available (60x current usage)
- Storage: 838 GB available (15x current usage)
- Network (Local): 10 Gbps for container-to-container communication
- Network (Internet): 740/404 Mbps capable of handling 1,000+ concurrent users

---

## Infrastructure Components

### 1. **Load Balancer (HAProxy)**

**Configuration:** `config/haproxy/haproxy.cfg`

```haproxy
frontend http_front
    bind *:80
    bind *:443 ssl crt /etc/ssl/certs/connect.pem
    
    # Health checks
    acl app1_up srv_is_up(http_back/app1)
    acl app2_up srv_is_up(http_back/app2)
    
    # Routing
    use_backend http_back
    
backend http_back
    balance roundrobin
    option httpchk GET /api/health
    
    server app1 connect_app1:3000 check inter 2000
    server app2 connect_app2:3000 check inter 2000 backup
```

**Features:**
- Round-robin load balancing
- Health check intervals: 2s
- Automatic failover to backup
- SSL termination

### 2. **Application Containers**

**Primary:** `connect_app1:3000`  
**Secondary:** `connect_app2:3000` (backup)

**Health Endpoint:** `/api/health`
```typescript
// app/api/health/route.ts
export async function GET() {
  const dbHealthy = await prisma.$queryRaw`SELECT 1`;
  const redisHealthy = await redis.ping();
  
  return Response.json({
    status: 'healthy',
    database: !!dbHealthy,
    cache: redisHealthy === 'PONG',
    timestamp: new Date().toISOString()
  });
}
```

### 3. **Database (PostgreSQL + Patroni)**

**High Availability Setup:**
- Primary: `patroni1` (read/write)
- Replica: `patroni2` (read-only)
- Automatic failover via etcd

**Migration Strategy:**
```bash
# 1. Apply migrations to replica (offline)
docker exec patroni2 psql -U connect -c "SET synchronous_commit = off;"
docker exec connect_app1 npx prisma migrate deploy

# 2. Promote replica to primary (if needed)
docker exec patroni2 patronictl switchover --force

# 3. Verify schema consistency
docker exec patroni1 pg_dump -s > schema_v1.sql
docker exec patroni2 pg_dump -s > schema_v2.sql
diff schema_v1.sql schema_v2.sql
```

---

## Deployment Strategies

### 1. **Blue-Green Deployment**

```bash
# Current: app1 (blue), app2 (standby)
# Deploy to green (app2)
docker-compose up -d --no-deps --build app2

# Wait for health checks
timeout 60 bash -c 'until curl -f http://localhost:3001/api/health; do sleep 2; done'

# Switch traffic to green
docker exec haproxy sed -i 's/app1 check/app1 check backup/' /etc/haproxy/haproxy.cfg
docker exec haproxy sed -i 's/app2 check backup/app2 check/' /etc/haproxy/haproxy.cfg
docker exec haproxy kill -HUP 1

# Deploy to blue (app1)
docker-compose up -d --no-deps --build app1
```

### 2. **Rolling Update**

```bash
# Update app1 (50% capacity)
docker-compose up -d --no-deps --build app1
sleep 30  # Health check

# Update app2 (restore 100% capacity)
docker-compose up -d --no-deps --build app2
```

### 3. **Canary Deployment**

```haproxy
backend http_back
    balance roundrobin
    
    # 90% to stable version
    server app1 connect_app1:3000 weight 90 check
    
    # 10% to canary
    server app2 connect_app2:3000 weight 10 check
```

---

## Rollback Procedures

### 1. **Application Rollback**

```bash
# Immediate: switch to backup container
docker exec haproxy sed -i 's/app2 check/app2 check backup/' /etc/haproxy/haproxy.cfg
docker exec haproxy kill -HUP 1

# Full: revert to previous image
docker pull connect:v1.2.2
docker tag connect:v1.2.2 connect:latest
docker-compose up -d --no-deps app1 app2
```

**Rollback Time:** < 30 seconds

### 2. **Database Rollback**

```bash
# Revert migration (if backward-compatible)
docker exec connect_app1 npx prisma migrate resolve --rolled-back 20241013_add_field

# Restore from backup (if breaking change)
docker exec connect_postgres psql -U connect < /backups/postgres/connect_20241013.sql
```

**RPO (Recovery Point Objective):** 15 minutes (backup interval)  
**RTO (Recovery Time Objective):** 5 minutes

---

## Monitoring & Alerts

### 1. **Grafana Dashboards**

**URL:** `http://221.164.102.253:3100`

**Key Metrics:**
- **Application:** Request rate, error rate, response time (p50/p95/p99)
- **Database:** Connection pool, query time, replication lag
- **Infrastructure:** CPU, memory, disk I/O, network

### 2. **Alerting Rules**

```yaml
# Prometheus alerts
groups:
  - name: connect_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_errors_total[5m]) > 0.05
        for: 2m
        annotations:
          summary: "Error rate > 5% for 2 minutes"
          
      - alert: DatabaseDown
        expr: up{job="postgres"} == 0
        for: 30s
        annotations:
          summary: "PostgreSQL is down"
          
      - alert: HighLatency
        expr: histogram_quantile(0.95, http_request_duration_seconds) > 2
        for: 5m
        annotations:
          summary: "95th percentile latency > 2s"
```

---

## Performance Optimization

### 1. **Build Optimization**

| Technique | Before | After | Improvement |
|-----------|--------|-------|-------------|
| Multi-stage build | 1.2 GB | 180 MB | 85% reduction |
| Layer caching | 8 min | 45 sec | 90% faster |
| Standalone output | 450 MB | 120 MB | 73% reduction |

### 2. **Deployment Speed**

| Stage | Duration | Notes |
|-------|----------|-------|
| Image build | 45 sec | With layer caching |
| Container start | 8 sec | Next.js standalone |
| Health check | 10 sec | Database + Redis |
| Traffic switch | 2 sec | HAProxy reload |
| **Total** | **65 sec** | Zero downtime |

---

## Security Practices

### 1. **Image Security**

```bash
# Scan for vulnerabilities
docker scan connect:latest

# Use non-root user
USER nextjs

# Read-only filesystem (where possible)
docker run --read-only connect:latest
```

### 2. **Secret Management**

```bash
# Never commit secrets to Git
.env.production  # In .gitignore

# Use Docker secrets (production)
docker secret create db_password /run/secrets/db_password
```

### 3. **Network Security**

```yaml
# docker-compose.production.yml
networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true  # No external access
```

---

## Disaster Recovery

### 1. **Backup Strategy**

| Component | Frequency | Retention | Location |
|-----------|-----------|-----------|----------|
| PostgreSQL | Every 15 min | 7 days | `/backups/postgres/` |
| Redis | Daily | 7 days | `/backups/redis/` |
| Uploads | Hourly | 30 days | `/backups/uploads/` |
| Config | On change | Forever | Git repository |

### 2. **Recovery Procedures**

```bash
# Full system restore
cd /opt/connect

# 1. Restore database
docker exec -i connect_postgres psql -U connect < /backups/postgres/latest.sql

# 2. Restore Redis
docker cp /backups/redis/dump.rdb connect_redis:/data/

# 3. Restore uploads
rsync -av /backups/uploads/ /opt/connect/uploads/

# 4. Restart services
docker-compose -f docker-compose.production.yml restart
```

**RTO:** 10 minutes  
**RPO:** 15 minutes

---

## Future Enhancements

### 1. **Kubernetes Migration**
- Auto-scaling based on load
- Multi-region deployment
- Service mesh (Istio)

### 2. **GitOps**
- ArgoCD for declarative deployments
- Automated rollbacks on failure
- Infrastructure as Code (Terraform)

### 3. **Advanced Monitoring**
- Distributed tracing (Jaeger)
- APM (Application Performance Monitoring)
- Real User Monitoring (RUM)

---

## References

- **Docker Compose:** `docker-compose.production.yml`
- **Dockerfile:** `Dockerfile.production`
- **HAProxy Config:** `config/haproxy/haproxy.cfg`
- **Patroni Config:** `config/patroni/patroni1.yml`
- **Launch Scripts:** `scripts/deploy-production.sh`

---

**Related Documents:**
- [BUILD-PROCESS.md](./BUILD-PROCESS.md)
- [DEPLOYMENT-STRATEGY.md](./DEPLOYMENT-STRATEGY.md)
- [DEV-ENVIRONMENT.md](./DEV-ENVIRONMENT.md)

