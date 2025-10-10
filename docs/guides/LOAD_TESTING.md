# Load Testing Guide - Connect Platform

This guide explains how to perform load testing on Connect Platform using **k6** (100% free, open-source load testing tool).

## Table of Contents

1. [Why Load Testing?](#why-load-testing)
2. [k6 Installation](#k6-installation)
3. [Test Scenarios](#test-scenarios)
4. [Running Tests](#running-tests)
5. [Interpreting Results](#interpreting-results)
6. [Performance Targets](#performance-targets)
7. [Troubleshooting](#troubleshooting)

---

## Why Load Testing?

Connect Platform must handle:
- **MVP Launch**: 500 concurrent users
- **Growth Phase 1**: 1,000 concurrent users
- **Growth Phase 2**: 1,500 concurrent users
- **Peak Season**: January-March (higher traffic during funding application season)

Load testing ensures:
1. System can handle target user load without degradation
2. Response times meet SLA (<500ms P95 for MVP)
3. Database connections are properly pooled (PgBouncer)
4. Redis cache is effective
5. Resource allocation is appropriate (16 cores, 128GB RAM)

---

## k6 Installation

### macOS (Development)
```bash
brew install k6
```

### Ubuntu/Debian (Production Server)
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

### Verify Installation
```bash
k6 version
# Expected: k6 v0.48.0 or higher
```

---

## Test Scenarios

We have 3 primary load test scenarios (located in `scripts/loadtest.js`):

### 1. **Smoke Test** (Sanity Check)
- **Purpose**: Verify system works with minimal load
- **Virtual Users**: 1-5 VUs
- **Duration**: 1 minute
- **Run before deployments**: Always

```bash
npm run loadtest:smoke
```

### 2. **Load Test** (Normal Operation)
- **Purpose**: Test system under expected load
- **Virtual Users**: Ramps from 0 → 100 → 0 over 10 minutes
- **Scenarios**:
  - MVP Launch: 100 VUs (500 users)
  - Growth Phase 1: 200 VUs (1,000 users)
  - Growth Phase 2: 300 VUs (1,500 users)
- **Run**: Weekly during development, daily during peak season

```bash
npm run loadtest:load
```

### 3. **Stress Test** (Breaking Point)
- **Purpose**: Find system limits and identify bottlenecks
- **Virtual Users**: Ramps from 0 → 500 → 0 over 15 minutes
- **Scenarios**: Push system beyond expected load
- **Run**: Monthly or before major releases

```bash
npm run loadtest:stress
```

---

## Running Tests

### Prerequisites

1. **Ensure system is running**:
```bash
docker compose -f docker-compose.production.yml up -d
docker compose -f docker-compose.production.yml ps
# All services should be "Up"
```

2. **Verify health endpoints**:
```bash
curl http://localhost:3000/api/health
# Expected: {"status":"ok"}
```

3. **Set environment variables** (if testing external domain):
```bash
export TARGET_URL=https://your-domain.com
```

### Test Execution

#### **Smoke Test** (1 minute)
```bash
k6 run --out json=results/smoke.json scripts/loadtest.js --env TEST_TYPE=smoke

# Expected results:
# - http_req_duration: p95 < 500ms
# - http_req_failed: < 1%
# - All checks passed: 100%
```

#### **Load Test** (10 minutes)
```bash
k6 run --out json=results/load.json scripts/loadtest.js --env TEST_TYPE=load

# Scenarios tested:
# - Authentication (Kakao/Naver OAuth)
# - Match generation (top 3 matches per user)
# - Funding program listing
# - Profile updates
```

#### **Stress Test** (15 minutes)
```bash
k6 run --out json=results/stress.json scripts/loadtest.js --env TEST_TYPE=stress

# Goals:
# - Find maximum capacity (users before degradation)
# - Identify bottlenecks (CPU, RAM, database connections)
# - Test error recovery
```

---

## Interpreting Results

### Key Metrics

k6 provides these critical metrics:

#### 1. **Response Time (http_req_duration)**
```
http_req_duration............: avg=245ms min=50ms med=200ms max=1.2s p(90)=380ms p(95)=450ms
```

**Targets**:
- P95 < 500ms (MVP requirement)
- P99 < 1s
- Average < 300ms

**Action if exceeded**:
- Check slow queries: `docker exec -it connect-db psql -U connect -c "SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"`
- Review Redis hit rate: `docker exec -it connect-redis redis-cli info stats | grep keyspace`
- Check CPU usage: `docker stats --no-stream`

#### 2. **Request Success Rate (http_req_failed)**
```
http_req_failed..............: 0.15% (15 of 10000)
```

**Targets**:
- < 1% failure rate (MVP)
- < 0.1% for production

**Action if exceeded**:
- Check error logs: `docker logs connect-app1 --tail=100 | grep ERROR`
- Verify PgBouncer connections: `docker exec -it connect-pgbouncer psql -h localhost -p 6432 -U connect -c "SHOW POOLS;"`
- Check database health: `docker exec -it connect-db pg_isready`

#### 3. **Throughput (http_reqs)**
```
http_reqs........................: 10000 (166.6/s)
```

**Targets**:
- 100 VUs: >150 requests/second
- 200 VUs: >300 requests/second
- 300 VUs: >450 requests/second

**Action if below target**:
- Scale app instances: Increase from 2 to 3-4 instances in `docker-compose.production.yml`
- Check network bottleneck: `iftop -i eth0`
- Review Nginx worker processes: Should match CPU cores

#### 4. **Virtual User Load (vus)**
```
vus..........................: 100 min=1 max=100
vus_max......................: 100
```

**Monitoring**:
- Track with Grafana dashboard (see `config/grafana/dashboards/k6-dashboard.json`)
- Compare with system resources (CPU, RAM, connections)

---

## Performance Targets

### MVP Launch (500 users = 100 VUs)

| Metric | Target | Critical Threshold |
|--------|--------|-------------------|
| P95 Response Time | < 500ms | < 1s |
| P99 Response Time | < 1s | < 2s |
| Request Success Rate | > 99% | > 98% |
| Throughput | > 150 req/s | > 100 req/s |
| Database Connections | < 40 (of 50) | < 45 |
| CPU Usage | < 60% (7.2 of 12 cores) | < 75% |
| RAM Usage | < 70GB (of 76GB allocated) | < 85GB |

### Growth Phase 1 (1,000 users = 200 VUs)

| Metric | Target | Critical Threshold |
|--------|--------|-------------------|
| P95 Response Time | < 500ms | < 1s |
| P99 Response Time | < 1s | < 2s |
| Request Success Rate | > 99% | > 98% |
| Throughput | > 300 req/s | > 200 req/s |
| Database Connections | < 45 (of 50) | < 48 |
| CPU Usage | < 75% (9 of 12 cores) | < 85% |
| RAM Usage | < 85GB (of 76GB allocated) | < 100GB |

### Growth Phase 2 (1,500 users = 300 VUs)

| Metric | Target | Critical Threshold |
|--------|--------|-------------------|
| P95 Response Time | < 600ms | < 1.2s |
| P99 Response Time | < 1.2s | < 2.5s |
| Request Success Rate | > 99% | > 97% |
| Throughput | > 450 req/s | > 300 req/s |
| Database Connections | < 48 (of 50) | < 50 |
| CPU Usage | < 85% (10.2 of 12 cores) | < 95% |
| RAM Usage | < 100GB (of 76GB allocated) | < 120GB |

**⚠️ Warning**: If growth continues beyond 1,500 users, consider:
1. Vertical scaling (128GB → 256GB RAM)
2. Horizontal scaling (add second server with load balancer)
3. Database read replicas for read-heavy queries

---

## Troubleshooting

### Problem 1: High Response Times (P95 > 1s)

**Diagnosis**:
```bash
# Check slow queries
docker exec -it connect-db psql -U connect -c "SELECT query, mean_exec_time, calls FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"

# Check PgBouncer queue
docker exec -it connect-pgbouncer psql -h localhost -p 6432 -U connect -c "SHOW POOLS;"
# Look for "cl_waiting" (queued clients)

# Check Redis latency
docker exec -it connect-redis redis-cli --latency-history
```

**Solutions**:
1. Add missing database indexes (check `EXPLAIN ANALYZE` on slow queries)
2. Increase PgBouncer pool size: `pool_size=50` → `pool_size=100` in `config/pgbouncer/pgbouncer.ini`
3. Review Redis cache hit rate: Should be >90%

### Problem 2: High Failure Rate (>1%)

**Diagnosis**:
```bash
# Check application errors
docker logs connect-app1 --tail=100 --follow | grep ERROR

# Check connection pool exhaustion
docker exec -it connect-pgbouncer psql -h localhost -p 6432 -U connect -c "SHOW STATS;"
# Look for "maxwait_us" (wait time for connection)

# Check Redis connectivity
docker exec -it connect-redis redis-cli ping
```

**Solutions**:
1. Check database connection leaks (missing `await prisma.$disconnect()`)
2. Verify Redis is running: `docker compose ps redis-cache redis-queue`
3. Review rate limiting: Free tier users hitting 3 matches/month limit?

### Problem 3: Database Connection Exhaustion

**Diagnosis**:
```bash
# Check active PostgreSQL connections
docker exec -it connect-db psql -U connect -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';"

# Check PgBouncer stats
docker exec -it connect-pgbouncer psql -h localhost -p 6432 -U connect -c "SHOW POOLS;"
```

**Solutions**:
1. Verify PgBouncer is between app and database (not bypassed)
2. Check app instances are using `DATABASE_URL=postgresql://connect:password@pgbouncer:6432/connect`
3. Increase PgBouncer pool: Edit `config/pgbouncer/pgbouncer.ini`

### Problem 4: Memory Issues (OOM Killer)

**Diagnosis**:
```bash
# Check container memory usage
docker stats --no-stream

# Check Linux OOM killer logs
sudo dmesg | grep -i "out of memory"

# Check PostgreSQL memory
docker exec -it connect-db psql -U connect -c "SELECT pg_size_pretty(pg_database_size('connect'));"
```

**Solutions**:
1. Reduce PostgreSQL `shared_buffers`: 8GB → 4GB in `config/postgresql/postgresql.conf`
2. Reduce Redis cache size: 12GB → 8GB in `docker-compose.production.yml`
3. Check for memory leaks in application code

---

## Advanced: Load Testing Workflow

### Pre-Deployment Checklist

```bash
# 1. Run smoke test
npm run loadtest:smoke
# Must pass before deployment

# 2. Run load test (10 minutes)
npm run loadtest:load
# Verify P95 < 500ms

# 3. Check system resources
docker stats --no-stream
# CPU < 75%, RAM < 85GB

# 4. Review logs for errors
docker logs connect-app1 --tail=100 | grep ERROR
# Should be 0 errors
```

### Post-Deployment Verification

```bash
# 1. Wait 5 minutes for system to stabilize

# 2. Run smoke test against production
export TARGET_URL=https://your-domain.com
npm run loadtest:smoke

# 3. Monitor for 15 minutes
watch -n 5 'curl -s https://your-domain.com/api/health | jq'

# 4. Check error rates in Grafana
open http://localhost:3001/d/app-metrics
```

---

## Integration with CI/CD

Add to `.github/workflows/deploy.yml` (if using GitHub Actions):

```yaml
- name: Load Test (Smoke)
  run: |
    k6 run --out json=results/smoke.json scripts/loadtest.js --env TEST_TYPE=smoke
    # Fail deployment if smoke test fails
    if [ $? -ne 0 ]; then
      echo "Smoke test failed!"
      exit 1
    fi
```

---

## Resources

- **k6 Documentation**: https://k6.io/docs/
- **k6 Examples**: https://k6.io/docs/examples/
- **k6 Cloud (Optional)**: https://k6.io/cloud/ (paid, but has free tier)
- **Grafana k6 Dashboard**: https://grafana.com/grafana/dashboards/2587

---

## Next Steps

1. ✅ Install k6: `brew install k6` (macOS) or see installation guide above
2. ✅ Run smoke test: `npm run loadtest:smoke`
3. ✅ Review results and set baseline metrics
4. ✅ Schedule weekly load tests during development
5. ✅ Automate smoke tests in CI/CD pipeline

**Questions?** See `docs/current/Deployment_Architecture_v3.md` Section 8 for monitoring and performance optimization.