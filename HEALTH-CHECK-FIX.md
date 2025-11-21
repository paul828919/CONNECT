# Health Check System - Complete Fix

## 🐛 Issues Identified

### 1. **Incorrect Port Numbers**
- **Problem**: Health check script was testing port `3000`, but containers run on:
  - app1: `3001`
  - app2: `3002`
- **Impact**: All app health checks failed

### 2. **Wrong Redis Container Names**
- **Problem**: Script looked for `connect_redis`, but actual containers are:
  - `connect_redis_cache`
  - `connect_redis_queue`
- **Impact**: Redis health checks always failed

### 3. **Wrong Status String**
- **Problem**: Script searched for `"healthy"` in response, but endpoint returns `"status":"ok"`
- **Impact**: Even successful responses marked as failed

### 4. **Basic Health Endpoint**
- **Problem**: Health endpoint didn't actually test database or Redis connectivity
- **Impact**: False positives - endpoint could return "ok" even when services are down

---

## ✅ Fixes Applied

### 1. Updated `scripts/check-health.sh`
```bash
# Before:
docker exec connect_app1 curl -sf http://localhost:3000/api/health
docker exec connect_redis redis-cli ping
grep -q "healthy"

# After:
docker exec connect_app1 curl -sf http://localhost:3001/api/health
docker exec connect_redis_cache redis-cli ping
docker exec connect_redis_queue redis-cli ping
grep -q "\"status\":\"ok\""
```

### 2. Enhanced Health Endpoint (`app/api/health/route.ts`)
Now performs actual connectivity checks:
- ✅ Database query test (`SELECT 1`)
- ✅ Redis Cache ping test
- ✅ Redis Queue ping test
- ✅ Latency measurements
- ✅ Detailed error reporting

**New Response Format:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-14T...",
  "service": "Connect Platform",
  "version": "1.0.0",
  "instance": "app1",
  "uptime": 12345.67,
  "latency": 45,
  "checks": {
    "database": {
      "status": "healthy",
      "latency": 23
    },
    "redis_cache": {
      "status": "healthy", 
      "latency": 5
    },
    "redis_queue": {
      "status": "healthy",
      "latency": 4
    }
  }
}
```

### 3. Created Diagnostic Script (`scripts/diagnose-production.sh`)
Comprehensive troubleshooting tool that checks:
- Application logs
- Health endpoints (with correct ports)
- Redis connectivity (both instances)
- Port bindings & network
- Environment variables
- Reverse proxy status
- Database connectivity
- Container processes

---

## 🚀 Deployment Steps

### Step 1: Build Updated Docker Image
```bash
cd /Users/paulkim/Downloads/connect

# Build new image with updated health endpoint
docker build -f Dockerfile.production -t connect-app:latest .
```

### Step 2: Deploy to Production Server
```bash
# Set server password
export CONNECT_SERVER_PASSWORD='iw237877^^'

# Use the updated deployment script
./scripts/deploy-production.sh
```

### Step 3: Verify Health Checks
```bash
# Run the fixed health check script
./scripts/check-health.sh

# Expected output:
# ✅ app1: Healthy
# ✅ app2: Healthy
# ✅ Public endpoint: Healthy
# ✅ Redis Cache: Responding
# ✅ Redis Queue: Responding
```

---

## 🔍 Testing Commands

### Test Health Endpoints Directly
```bash
# On production server:
ssh user@59.21.170.6

# Test app1 (port 3001)
docker exec connect_app1 curl http://localhost:3001/api/health | jq

# Test app2 (port 3002)
docker exec connect_app2 curl http://localhost:3002/api/health | jq

# Test public endpoint
curl -k https://59.21.170.6/api/health | jq
```

### Test Redis Connectivity
```bash
# Redis Cache
docker exec connect_redis_cache redis-cli ping

# Redis Queue  
docker exec connect_redis_queue redis-cli ping

# Test from app container
docker exec connect_app1 sh -c 'nc -zv redis-cache 6379'
docker exec connect_app1 sh -c 'nc -zv redis-queue 6380'
```

### Run Diagnostics
```bash
# Full diagnostic report
./scripts/diagnose-production.sh
```

---

## 📊 Configuration Reference

### Docker Compose Settings (Correct)
```yaml
app1:
  environment:
    PORT: 3001
    REDIS_CACHE_URL: redis://redis-cache:6379/0
    REDIS_QUEUE_URL: redis://redis-queue:6380/0
  healthcheck:
    test: ["CMD", "curl", "-f", "http://172.25.0.21:3001/api/health"]

app2:
  environment:
    PORT: 3002
    REDIS_CACHE_URL: redis://redis-cache:6379/0
    REDIS_QUEUE_URL: redis://redis-queue:6380/0
  healthcheck:
    test: ["CMD", "curl", "-f", "http://172.25.0.22:3002/api/health"]

redis-cache:
  container_name: connect_redis_cache
  # Port 6379 (default)

redis-queue:
  container_name: connect_redis_queue
  # Port 6379 internally (mapped to 6380 externally if needed)
```

---

## 🎯 Expected Results After Fix

### Before Fix
```
🌐 Application Health:
  ❌ app1: Unhealthy or not responding
  ❌ app2: Unhealthy or not responding
  ❌ Public endpoint: Unhealthy or not responding

🔴 Redis Status:
  ❌ Redis: Not responding
```

### After Fix
```
🌐 Application Health:
  ✅ app1: Healthy
  ✅ app2: Healthy
  ✅ Public endpoint: Healthy

🔴 Redis Status:
  ✅ Redis Cache: Responding
  ✅ Redis Queue: Responding
  ✅ Cache memory: 156.32M
  ✅ Queue memory: 12.45M

╔════════════════════════════════════════════════════╗
║                                                    ║
║      ✅ ALL SYSTEMS OPERATIONAL ✅                 ║
║                                                    ║
╚════════════════════════════════════════════════════╝
```

---

## 📝 Notes

1. **Health Check Frequency**: Docker health checks run every 30 seconds
2. **Start Period**: 60 seconds grace period for app startup
3. **Retries**: 3 failed checks before marking unhealthy
4. **Timeout**: 10 seconds per health check

5. **Redis Queue Port**: Internally uses 6379, configured separately from cache
6. **Load Balancing**: HAProxy/Nginx should use updated health check URL

---

## 🔗 Related Files Modified

1. `/scripts/check-health.sh` - Fixed port numbers, Redis names, status string
2. `/app/api/health/route.ts` - Added real connectivity checks
3. `/scripts/diagnose-production.sh` - New comprehensive diagnostic tool
4. `/docker-compose.production.yml` - Reference (no changes needed)

---

## ✨ Additional Improvements Made

### Enhanced Health Endpoint Features
- Individual service health status
- Latency measurements for each check
- Graceful degradation (returns 503 if any service unhealthy)
- Detailed error messages
- Process uptime reporting

### Better Monitoring
- Separate health checks for cache and queue Redis
- Memory usage for each Redis instance
- More descriptive error messages
- Diagnostic script for deep troubleshooting

---

## 🚨 Troubleshooting

If health checks still fail after deployment:

1. **Check application logs:**
   ```bash
   docker logs connect_app1 --tail 50
   docker logs connect_app2 --tail 50
   ```

2. **Verify environment variables:**
   ```bash
   docker exec connect_app1 env | grep -E 'PORT|REDIS|DATABASE'
   ```

3. **Test connectivity manually:**
   ```bash
   docker exec connect_app1 curl http://localhost:3001/api/health
   ```

4. **Run full diagnostics:**
   ```bash
   ./scripts/diagnose-production.sh
   ```

5. **Check Docker health status:**
   ```bash
   docker ps
   # Look for "(healthy)" status
   ```

---

**Last Updated**: 2025-10-14  
**Status**: Ready for deployment ✅

