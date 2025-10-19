# Phase 2: Performance Baselines & Load Testing
**Date**: October 17, 2025  
**Status**: 🔄 IN PROGRESS  
**Progress**: Phase 2 of 7 (Testing & Refinement)

---

## Overview

This document defines performance baselines and targets for the Connect Platform, established during Phase 2 load testing. These baselines serve as:

1. **Quality Gates** - Minimum acceptable performance before beta launch
2. **Regression Detection** - Metrics to monitor for performance degradation
3. **Capacity Planning** - Understanding system limits and scaling needs
4. **SLA Foundation** - Data to support future service level agreements

---

## Performance Targets (Phase 2)

### Overall System Performance

| Metric | Target | Measurement | Notes |
|--------|--------|-------------|-------|
| **Overall P95 Response Time** | <2s | 95th percentile | All HTTP requests |
| **Overall P50 Response Time** | <500ms | Median | Most requests should be fast |
| **Error Rate** | <0.1% | Percentage | 99.9% success rate |
| **Uptime** | >99.9% | Percentage | ~43 minutes downtime/month max |
| **Concurrent Users** | 150+ | Users | Peak load capacity |
| **Requests per Second** | 50+ | req/s | Sustained throughput |

---

## Operation-Specific Targets

### 1. READ Operations (60% of traffic)

**Definition**: Page loads, program browsing, search, match viewing

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| P95 Response Time | <1s | TBD | 🔄 Testing |
| P50 Response Time | <500ms | TBD | 🔄 Testing |
| Error Rate | <0.1% | TBD | 🔄 Testing |
| Cache Hit Rate | >80% | TBD | 🔄 Testing |

**Key Pages**:
- Homepage: P95 <1s
- Dashboard: P95 <1s
- Program Search: P95 <2s (includes database query)
- Program Details: P95 <1s

---

### 2. AI Operations (30% of traffic)

**Definition**: Match explanations, Q&A chat, AI-powered features

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| P95 Response Time | <5s | TBD | 🔄 Testing |
| P50 Response Time | <2.5s | TBD | 🔄 Testing |
| Error Rate | <1% | TBD | 🔄 Testing |
| Cache Hit Rate (AI) | >50% | TBD | 🔄 Testing |
| Rate Limit Errors | <10% | TBD | 🔄 Testing |

**Breakdown**:

#### AI Match Explanations
- **Uncached**: P95 <5s (includes Claude API call)
- **Cached**: P95 <500ms (Redis retrieval)
- **Target Cache Hit Rate**: >50% (24-hour TTL)

#### AI Chat
- **Response Time**: P95 <5s
- **Multi-turn Conversation**: Context maintained for 10 messages
- **Rate Limiting**: 10 messages/minute per user

---

### 3. WRITE Operations (10% of traffic)

**Definition**: Profile updates, save programs, feedback submission

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| P95 Response Time | <2s | TBD | 🔄 Testing |
| P50 Response Time | <800ms | TBD | 🔄 Testing |
| Error Rate | <0.1% | TBD | 🔄 Testing |
| Data Consistency | 100% | TBD | 🔄 Testing |

**Key Operations**:
- Profile Update: P95 <2s
- Save Program: P95 <1s
- AI Feedback: P95 <1s
- Match Generation: P95 <5s (intensive operation)

---

## Infrastructure Performance

### Database (PostgreSQL)

| Metric | Target | Notes |
|--------|--------|-------|
| Query Time P95 | <100ms | Individual queries |
| Query Time P99 | <200ms | Complex joins allowed |
| Connection Pool Utilization | <80% | Prevent exhaustion |
| Replication Lag | <100ms | Hot standby |
| Failover Time | <30s | Automatic via Patroni |

**Critical Queries**:
- Match generation: <2s (bulk scoring)
- Program search: <500ms (indexed)
- User dashboard: <200ms (optimized)

---

### Cache (Redis)

| Metric | Target | Notes |
|--------|--------|-------|
| Overall Hit Rate | >80% | All cached data |
| AI Explanation Hit Rate | >50% | 24-hour TTL |
| Match Data Hit Rate | >80% | Frequently accessed |
| Cache Response Time | <10ms | In-memory |
| Memory Utilization | <80% | Prevent eviction |

**Cache Strategy**:
- AI Explanations: 24 hours
- Match Results: 1 hour (stale ok)
- Program Data: 6 hours
- User Profiles: 30 minutes

---

### AI Services (Claude Sonnet 4.5)

| Metric | Target | Notes |
|--------|--------|-------|
| API Response Time P95 | <3s | Claude's baseline |
| Rate Limit | 50 RPM | Anthropic Tier 1 |
| Daily Budget | ₩50,000 | Cost control |
| Error Rate | <2% | API reliability |
| Circuit Breaker Activation | As needed | Protect from cascade |

**Circuit Breaker Configuration**:
- **Failure Threshold**: 5 failures within 60s → OPEN
- **Open Timeout**: 30s before HALF_OPEN
- **Recovery**: 1 successful request → CLOSED

**Cost Estimates**:
- Match Explanation: ~₩200 per request (uncached)
- Chat Message: ~₩150 per message
- Daily Active Users: 100
- Est. Daily Cost: ₩20,000-₩40,000

---

## Traffic Patterns

### Expected Distribution

| Type | % of Traffic | Operations/Day | Peak RPS |
|------|--------------|----------------|----------|
| READ | 60% | ~43,200 | 30 req/s |
| AI | 30% | ~21,600 | 15 req/s |
| WRITE | 10% | ~7,200 | 5 req/s |
| **Total** | **100%** | **~72,000** | **50 req/s** |

### Daily Pattern (Expected)

| Time | Users | Load | Notes |
|------|-------|------|-------|
| 00:00-06:00 | 5-10 | Minimal | Night |
| 06:00-09:00 | 10-30 | Low | Morning |
| 09:00-12:00 | 30-75 | Medium | Mid-morning |
| 12:00-14:00 | 50-100 | High | Lunch peak |
| 14:00-18:00 | 75-150 | Peak | Afternoon |
| 18:00-22:00 | 30-75 | Medium | Evening |
| 22:00-00:00 | 10-30 | Low | Late night |

---

## Load Test Scenarios

### Test 1: AI Load Test (`ai-load-test.js`)

**Purpose**: Validate AI components under stress

**Configuration**:
- Duration: ~13 minutes
- Peak VUs: 150
- Focus: AI explanations, chat, circuit breaker

**Phases**:
1. Warm-up: 10 users (2 min) - Populate caches
2. Normal: 50 users (3 min) - Validate cache hits
3. Peak: 100 users (3 min) - Test rate limits
4. Stress: 150 users (2 min) - Trigger circuit breaker
5. Recovery: 50 users (2 min) - Validate self-healing

**Success Criteria**:
- ✅ AI explanation P95 <5s
- ✅ Chat response P95 <5s
- ✅ Cache hit rate >30% (conservative given high concurrency)
- ✅ Circuit breaker activates during stress
- ✅ System recovers after stress

---

### Test 2: Mixed Traffic (`mixed-traffic.js`)

**Purpose**: Simulate realistic daily usage patterns

**Configuration**:
- Duration: ~27 minutes
- Peak VUs: 150
- Traffic Mix: 60% read, 30% AI, 10% write

**User Types**:
- 40% New Visitors (browse, search)
- 30% Registered Users (dashboard, matches, AI)
- 20% Active Users (multiple AI interactions, saves)
- 10% Power Users (heavy AI usage, frequent updates)

**Success Criteria**:
- ✅ Overall P95 <2s
- ✅ Read operations P95 <1s
- ✅ AI operations P95 <5s
- ✅ Write operations P95 <2s
- ✅ Error rate <0.1%
- ✅ Cache hit rate >80%

---

### Test 3: Circuit Breaker (`circuit-breaker-test.js`)

**Purpose**: Validate resilience under AI service failures

**Configuration**:
- Duration: ~3.5 minutes
- Focus: Circuit breaker state transitions

**Phases**:
1. Baseline: Normal operation (CLOSED)
2. Induce Failures: Trigger 5+ failures
3. Verify OPEN: Requests rejected appropriately
4. Wait: 30s for HALF_OPEN transition
5. Recovery: Successful recovery to CLOSED

**Success Criteria**:
- ✅ Circuit opens after 5 failures
- ✅ Requests rejected in OPEN state
- ✅ Fallback content served
- ✅ Transitions to HALF_OPEN after 30s
- ✅ Recovers to CLOSED on success

---

### Test 4: Existing Tests

#### Smoke Test (`smoke-test.js`)
- Duration: 30 seconds
- VUs: 10
- Target: Health endpoint <500ms

#### Homepage Load (`homepage-load.js`)
- Duration: 9 minutes
- Peak VUs: 100
- Target: Homepage P95 <2s

#### API Stress (`api-stress.js`)
- Duration: 16 minutes
- Peak VUs: 500
- Target: Find breaking point

---

## Monitoring & Alerting

### Grafana Dashboards

**Key Metrics to Monitor**:

1. **System Health**
   - HTTP response times (P50, P95, P99)
   - Error rates by endpoint
   - Request throughput (req/s)
   - Active connections

2. **Database**
   - Query performance
   - Connection pool usage
   - Replication lag
   - Slow queries

3. **Redis Cache**
   - Hit rates
   - Memory usage
   - Eviction rate
   - Command latency

4. **AI Services**
   - API response times
   - Cost tracking (daily spend)
   - Rate limit usage
   - Circuit breaker state
   - Fallback activation rate

5. **Infrastructure**
   - CPU usage
   - Memory usage
   - Disk I/O
   - Network traffic

---

### Alert Thresholds

| Alert | Threshold | Severity | Action |
|-------|-----------|----------|--------|
| Error rate spike | >1% for 5 min | P0 | Immediate investigation |
| Response time slow | P95 >5s for 5 min | P1 | Check database/AI |
| Circuit breaker open | >5 min | P1 | Check AI service |
| Cache hit rate low | <50% for 10 min | P2 | Review cache strategy |
| Daily AI budget exceeded | >₩50,000 | P2 | Review usage patterns |
| Database lag high | >1s for 1 min | P1 | Check replication |
| CPU usage high | >90% for 5 min | P1 | Consider scaling |

---

## Regression Testing

### Pre-Deployment Checks

Before deploying to production:

1. ✅ Run smoke test (30s quick validation)
2. ✅ Run AI load test (13 min full AI validation)
3. ✅ Check linter errors (0 errors required)
4. ✅ Run type check (`npm run type-check`)
5. ✅ Verify Docker build succeeds
6. ✅ Review Grafana dashboards for anomalies

### Post-Deployment Validation

After production deployment:

1. ✅ Run smoke test against production
2. ✅ Check error rates (should be <0.1%)
3. ✅ Verify cache hit rates (should be >80%)
4. ✅ Monitor circuit breaker (should be CLOSED)
5. ✅ Review response times (P95 targets met)
6. ✅ Check AI cost tracking (within budget)

---

## Capacity Planning

### Current Capacity

| Resource | Capacity | Headroom | Notes |
|----------|----------|----------|-------|
| Web Server | 150 concurrent users | 33% | Current load ~100 peak |
| Database | 100 connections | 20% | Connection pool: 100 max |
| Redis | 1GB memory | 40% | Current usage ~600MB |
| AI API | 50 RPM | Varies | Rate limit shared across users |

### Scaling Thresholds

**When to Scale**:

1. **Horizontal Scaling** (add more web servers):
   - CPU usage >70% sustained
   - Active connections >100 sustained
   - Response times consistently above P95 targets

2. **Database Scaling** (vertical or read replicas):
   - Connection pool >80% utilized
   - Query times P95 >200ms
   - Replication lag >500ms

3. **Cache Scaling** (increase Redis memory):
   - Memory usage >80%
   - Eviction rate >100/min
   - Cache hit rate <70%

4. **AI Rate Limit Increase** (upgrade Anthropic tier):
   - Consistent rate limit errors >5%
   - Daily budget exceeded regularly
   - Circuit breaker opening frequently

---

## Test Results

### Will be updated after local testing

| Test | Date | Duration | VUs | Result | Notes |
|------|------|----------|-----|--------|-------|
| AI Load Test | TBD | 13 min | 150 | 🔄 Pending | |
| Mixed Traffic | TBD | 27 min | 150 | 🔄 Pending | |
| Circuit Breaker | TBD | 3.5 min | 20 | 🔄 Pending | |
| Smoke Test | TBD | 30 sec | 10 | 🔄 Pending | |

---

## Next Steps

### Phase 2 Remaining Tasks

1. ✅ Create load test scripts (COMPLETE)
2. 🔄 Run tests locally
3. 🔄 Document baseline results
4. 🔄 Run tests in production
5. 🔄 Analyze Grafana metrics
6. 🔄 Create Phase 2 summary report

### Phase 3 Preview (Performance Optimization)

Based on Phase 2 results, we'll:
- Add database indexes for slow queries
- Optimize cache strategies
- Implement code splitting
- Add CDN for static assets
- Fine-tune connection pools

---

## References

- **Implementation Plan**: `IMPLEMENTATION-PLAN-12WEEKS.md` (lines 260-438)
- **Phase 1 Summary**: `docs/testing/phase1-e2e-test-summary.md`
- **Work Rules**: `CLAUDE.md` (local verification mandatory)
- **Test Scripts**: `__tests__/performance/*.js`
- **Monitoring**: Grafana dashboard at https://connectplt.kr/grafana

---

*Generated: October 17, 2025*  
*Phase: 2 of 7 (Load Testing)*  
*Status: In Progress - Establishing Baselines*

