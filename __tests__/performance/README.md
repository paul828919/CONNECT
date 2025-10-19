# Load Testing Guide - Phase 2

This directory contains k6 load test scripts for Phase 2: Load Testing with AI Features.

---

## 📋 Prerequisites

### 1. Install k6

**macOS** (via Homebrew):
```bash
brew install k6
```

**Linux**:
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

**Windows** (via Chocolatey):
```bash
choco install k6
```

Verify installation:
```bash
k6 version
```

### 2. Optional: Authentication Token

For authenticated tests (recommended for accurate results):
```bash
# Set auth token as environment variable
export TEST_AUTH_TOKEN="your-jwt-token-here"
```

To obtain a test auth token:
1. Sign in to https://connectplt.kr
2. Open browser DevTools → Application → Cookies
3. Copy the `next-auth.session-token` value

---

## 🧪 Test Scripts

### 1. `smoke-test.js` - Quick Validation (30s)
**Purpose**: Quick health check before running longer tests

```bash
k6 run smoke-test.js
```

**Configuration**:
- VUs: 10
- Duration: 30 seconds
- Target: Health endpoint <500ms
- When to run: Before every deployment

---

### 2. `ai-load-test.js` - AI Feature Testing (13 min)
**Purpose**: Validate AI components under realistic load

```bash
# Basic run
k6 run ai-load-test.js

# With auth token
k6 run --env TEST_AUTH_TOKEN="your-token" ai-load-test.js

# Against local dev
k6 run --env BASE_URL="http://localhost:3000" ai-load-test.js
```

**Configuration**:
- Duration: ~13 minutes
- Peak VUs: 150
- Focus: Match explanations, chat, circuit breaker

**Phases**:
1. Warm-up: 10 users (2 min)
2. Normal: 50 users (3 min)
3. Peak: 100 users (3 min)
4. Stress: 150 users (2 min)
5. Recovery: 50 users (2 min)

**Success Criteria**:
- ✅ AI explanation P95 <5s
- ✅ Chat P95 <5s
- ✅ Cache hit rate >30%
- ✅ Circuit breaker activates during stress

---

### 3. `mixed-traffic.js` - Realistic Usage (27 min)
**Purpose**: Simulate real-world daily traffic patterns

```bash
# Basic run
k6 run mixed-traffic.js

# With auth token (recommended)
k6 run --env TEST_AUTH_TOKEN="your-token" mixed-traffic.js
```

**Configuration**:
- Duration: ~27 minutes
- Peak VUs: 150
- Traffic Mix: 60% read, 30% AI, 10% write

**User Types**:
- 40% New Visitors
- 30% Registered Users
- 20% Active Users
- 10% Power Users

**Success Criteria**:
- ✅ Overall P95 <2s
- ✅ Read P95 <1s
- ✅ AI P95 <5s
- ✅ Write P95 <2s
- ✅ Error rate <0.1%

---

### 4. `circuit-breaker-test.js` - Resilience Testing (3.5 min)
**Purpose**: Validate circuit breaker under AI failures

```bash
k6 run circuit-breaker-test.js
```

**Configuration**:
- Duration: ~3.5 minutes
- Peak VUs: 20
- Focus: State transitions (CLOSED → OPEN → HALF_OPEN → CLOSED)

**Success Criteria**:
- ✅ Circuit opens after 5 failures
- ✅ Requests rejected in OPEN
- ✅ Fallback content served
- ✅ Recovery to CLOSED

---

### 5. `homepage-load.js` - Homepage Performance (9 min)
**Purpose**: Test homepage under load

```bash
k6 run homepage-load.js
```

**Configuration**:
- Duration: 9 minutes
- Peak VUs: 100
- Target: Homepage P95 <2s

---

### 6. `api-stress.js` - Breaking Point Test (16 min)
**Purpose**: Find system breaking point

```bash
k6 run api-stress.js
```

**Configuration**:
- Duration: 16 minutes
- Peak VUs: 500 (stress spike)
- Target: P95 <2s at 200 users, <10% errors at 500

---

## 🎯 Recommended Test Sequence

### Local Testing (Before Deployment)

```bash
# 1. Quick validation (30s)
k6 run smoke-test.js

# 2. AI features (13 min) - If time permits
k6 run ai-load-test.js

# 3. If all pass, deploy to production
```

### Production Testing (After Deployment)

```bash
# 1. Smoke test (30s)
k6 run smoke-test.js

# 2. AI load test (13 min) - Full AI validation
k6 run --env BASE_URL="https://connectplt.kr" ai-load-test.js

# 3. Mixed traffic (27 min) - Comprehensive test
k6 run --env BASE_URL="https://connectplt.kr" mixed-traffic.js

# 4. Circuit breaker (3.5 min) - Resilience validation
k6 run --env BASE_URL="https://connectplt.kr" circuit-breaker-test.js
```

**Total Testing Time**: ~44 minutes for full suite

---

## 📊 Interpreting Results

### Success Indicators

✅ **PASS**: All thresholds met
- P95 response times within targets
- Error rates below thresholds
- Cache hit rates above minimums
- Circuit breaker activates as expected

⚠️ **ACCEPTABLE**: Minor deviations
- P95 slightly over target (within 20%)
- Cache hit rates slightly below target
- Transient errors during stress phase

❌ **FAIL**: Significant issues
- P95 consistently >2x target
- Error rates >1%
- System crashes or becomes unresponsive
- Circuit breaker doesn't activate

### Key Metrics to Monitor

1. **Response Times**
   - P50 (median): Most users' experience
   - P95: 95% of users' experience
   - P99: Worst-case scenarios

2. **Error Rates**
   - HTTP 500/503: Server errors
   - HTTP 429: Rate limiting
   - HTTP 401: Auth issues (ok if no token)

3. **Throughput**
   - Requests per second (req/s)
   - Data transfer rates

4. **Custom Metrics**
   - Cache hit rates
   - Circuit breaker state
   - AI operation counts

---

## 🐛 Troubleshooting

### Issue: "connection refused"

**Cause**: Server not running or wrong URL

**Fix**:
```bash
# Check if server is running
curl -I https://connectplt.kr

# Or for local
lsof -i :3000
npm run dev  # If not running
```

---

### Issue: "authentication required" (401 errors)

**Cause**: Missing or invalid auth token

**Fix**:
1. Tests can run without auth (some operations will skip)
2. Or provide valid auth token:
```bash
export TEST_AUTH_TOKEN="your-token"
k6 run ai-load-test.js
```

---

### Issue: High error rates (>10%)

**Possible Causes**:
1. **Rate limiting**: Too many requests
2. **Circuit breaker**: AI service under stress
3. **Database**: Connection pool exhausted
4. **Memory**: Server out of resources

**Investigation**:
```bash
# Check server logs
docker logs connect-web-1

# Check database
docker logs connect-db-1

# Check Redis
docker logs connect-redis-1

# Check Grafana dashboards
open https://connectplt.kr/grafana
```

---

### Issue: Circuit breaker doesn't activate

**Cause**: Not enough failures or failures too spread out

**Fix**:
1. Circuit requires 5 failures within 60s
2. Try higher concurrency or shorter timeout:
```bash
# Modify circuit-breaker-test.js:
# Increase VUs in induce_failures phase
# Or decrease timeout in request params
```

---

### Issue: Low cache hit rates (<30%)

**Possible Causes**:
1. **First run**: Cache is empty
2. **High churn**: Too many unique requests
3. **TTL too short**: Cache expiring too fast

**Investigation**:
1. Run test twice (second run should have better hit rate)
2. Check Redis:
```bash
docker exec -it connect-redis-1 redis-cli
> KEYS *
> TTL match:explanation:*
```

---

## 📈 Performance Targets

### Overall System
- Overall P95: <2s
- Error Rate: <0.1%
- Concurrent Users: 150+

### By Operation Type
| Type | P95 Target | P50 Target | Error Rate |
|------|------------|------------|------------|
| READ | <1s | <500ms | <0.1% |
| AI | <5s | <2.5s | <1% |
| WRITE | <2s | <800ms | <0.1% |

### Infrastructure
| Resource | Target | Notes |
|----------|--------|-------|
| DB Query P95 | <100ms | Individual queries |
| Cache Hit Rate | >80% | Overall |
| AI Cache Hit Rate | >50% | 24-hour TTL |
| Circuit Breaker | Activates | During stress |

---

## 🔧 Advanced Usage

### Custom Configuration

```bash
# Test against local dev
k6 run --env BASE_URL="http://localhost:3000" ai-load-test.js

# Shorter test (dev mode)
k6 run --duration 30s --vus 10 ai-load-test.js

# Higher load
k6 run --vus 200 --duration 5m api-stress.js

# JSON output for analysis
k6 run --out json=results.json ai-load-test.js

# CSV output
k6 run --out csv=results.csv ai-load-test.js
```

### Environment Variables

```bash
# Base URL (default: https://connectplt.kr)
export BASE_URL="http://localhost:3000"

# Auth token (optional)
export TEST_AUTH_TOKEN="your-token"

# Test duration multiplier (dev mode: shorter tests)
export K6_DURATION_SCALE="0.5"  # 50% duration
```

### Cloud Testing (Optional)

For distributed load testing:

```bash
# Sign up at k6.io
k6 cloud login

# Run test in cloud
k6 cloud ai-load-test.js
```

---

## 📝 Logging & Analysis

### Real-time Monitoring

```bash
# Run test with verbose output
k6 run --verbose ai-load-test.js

# Watch specific metric
k6 run ai-load-test.js | grep "ai_cache_hit"
```

### Post-Test Analysis

```bash
# Save results to file
k6 run ai-load-test.js > test-results.txt

# JSON for programmatic analysis
k6 run --out json=results.json ai-load-test.js
cat results.json | jq '.metrics.http_req_duration.values'
```

### Grafana Integration (Production)

k6 can send metrics directly to Grafana:

```bash
# Install k6 with xk6-output-prometheus-remote
# See: https://grafana.com/docs/k6/latest/results-output/real-time/prometheus-remote-write/

# Then run with Prometheus remote write
k6 run --out prometheus-remote=http://connectplt.kr:9090 ai-load-test.js
```

---

## 📚 Additional Resources

- **k6 Documentation**: https://k6.io/docs/
- **Performance Baselines**: `docs/testing/phase2-performance-baselines.md`
- **Implementation Plan**: `IMPLEMENTATION-PLAN-12WEEKS.md` (lines 260-438)
- **Monitoring**: https://connectplt.kr/grafana
- **Work Rules**: `CLAUDE.md`

---

## ✅ Phase 2 Checklist

Before marking Phase 2 complete:

- [ ] All 6 load tests created
- [ ] k6 installed and verified
- [ ] Smoke test passes locally
- [ ] AI load test passes locally
- [ ] Mixed traffic test passes locally
- [ ] Circuit breaker test validates resilience
- [ ] Performance baselines documented
- [ ] Tests run in production
- [ ] Grafana dashboards reviewed
- [ ] Phase 2 summary report created

---

*Last Updated: October 17, 2025*  
*Phase: 2 of 7 (Load Testing)*  
*Status: Tests created, ready for local execution*

