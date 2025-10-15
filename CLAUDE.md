# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Connect is **Korea's R&D commercialization operating system** that transforms companies' grant-seeking journey from discovery through winning. The platform combines automated matching with professional execution services, targeting companies as primary paying customers (research institutes as supply-side for consortium matching).

**Strategic Positioning:**
- **Not just grant discovery** - Complete commercialization support (discovery → application → winning)
- **Hybrid business model** - Software (₩49-99K/month) + Services (₩2-7M per engagement)
- **Companies first** - 90% revenue from companies, institutes as free supply-side partners
- **Proprietary data moat** - Outcome tracking (win rates, cycle times) creates competitive advantage
- **Profitable Month 1** - Services provide immediate cash flow

**Critical Timeline:**
- MVP Development: 8 weeks (Weeks 1-2: Foundation, Weeks 3-4: Data + Outcomes, Weeks 5-6: Services, Weeks 7-8: Launch)
- Beta Launch: 50 users (45 companies, 5 institutes)
- Public Launch: Target 500 users by Month 4
- Expansion Gate: 1,000 users (if 70%+ retention after 3 months)
- Peak Season: January-March 2025 (99.9% uptime required with hot standby)

## 12-Week Execution Plan (October 9, 2025 → January 1, 2026)

**Current Status**: Executing 12-week accelerated plan for January 1, 2026 launch
**Master Plan**: See `docs/plans/EXECUTION-PLAN-MASTER.md` for detailed day-by-day tasks
**Progress Tracking**:
- **Master Tracker**: See `docs/plans/progress/MASTER-PROGRESS-TRACKER.md` (Complete journey Oct 9 → Jan 1)
- **Daily Logs**: See `docs/plans/progress/` for individual completion reports
**Quick Status**: See `IMPLEMENTATION-STATUS.md` at project root

**Timeline Overview**:
- **Week 1-2** (Oct 9-22): Hot Standby Infrastructure (PostgreSQL replication, Patroni, HAProxy)
- **Week 3-4** (Oct 23-Nov 5): AI Integration (Claude Sonnet 4.5, match explanations, Q&A chat)
- **Week 5** (Nov 6-12): Comprehensive Load Testing (k6 scenarios, performance optimization)
- **Week 6** (Nov 13-19): Security Hardening & Bug Fixes
- **Week 7** (Nov 20-26): Beta Infrastructure + Internal Testing
- **Week 8** (Nov 27-Dec 3): Beta Week 1 (5-10 companies)
- **Week 9** (Dec 4-10): Beta Week 2 (20-30 companies)
- **Week 10** (Dec 11-17): Beta Week 3 + Code Freeze
- **Week 11** (Dec 18-24): Final Testing + Launch Prep
- **Week 12** (Dec 25-31): Launch Week
- **LAUNCH** (Jan 1, 2026 00:00 KST): Public Launch 🚀

**Current Week**: See `IMPLEMENTATION-STATUS.md` for real-time status
**Development Tools**: MacBook Pro M4 Max + Claude Code + Claude Desktop

## Commands

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run lint            # ESLint checking
npm run type-check      # TypeScript type checking
npm test                # Run unit tests
npm run test:watch      # Run tests in watch mode
npm run test:e2e        # Run Playwright e2e tests

# Database
npm run db:generate     # Generate Prisma client
npm run db:push         # Push schema to database (dev)
npm run db:migrate      # Run database migrations
npm run db:studio       # Open Prisma Studio
npm run db:seed         # Seed database with initial data

# Scraping (Hybrid: NTIS API + Playwright)
npm run scraper:ntis         # NTIS API scraping only
npm run scraper:hybrid       # Both NTIS API + Playwright
npm run scraper:validate     # Validate NTIS integration health
npx tsx scripts/trigger-ntis-scraping.ts        # Manual NTIS trigger
npx tsx scripts/validate-ntis-integration.ts    # Comprehensive validation
npx tsx scripts/test-ntis-simple.ts             # API diagnostics

# Services & Outcomes
npm run outcomes:aggregate   # Calculate aggregate success patterns
npm run services:report      # Generate monthly services revenue report
npm run gates:calculate      # Recalculate sector gate scores (ISMS-P, KC)
npm run procurement:update   # Update procurement readiness scores

# Docker (Production)
npm run docker:build    # Build Docker images
npm run docker:up       # Start Docker stack
npm run docker:down     # Stop Docker stack
npm run docker:logs     # View container logs
npm run docker:clean    # Remove containers and volumes

# Deployment
./scripts/deploy.sh           # Zero-downtime Docker deployment
./scripts/rollback.sh         # Emergency rollback
./scripts/backup.sh           # Automated backup
./scripts/health-monitor.sh   # System health monitoring
./scripts/failover.sh         # Hot standby failover (Jan-March)

# GitHub Actions CI/CD (Automated)
git push origin main                      # Triggers automated deployment
./scripts/verify-github-actions.sh        # Verify CI/CD setup
./scripts/test-ssh-connection.sh          # Test SSH connection
./scripts/verify-deployment.sh            # Verify deployment success
```

## GitHub Actions CI/CD (Production Ready)

**Status:** ✅ **Complete** (October 14, 2025)
**Achievement:** 87% faster deployments (35 min → 4 min)
**Security:** SSH key authentication (enterprise-grade)

### Automated Deployment Flow

```
git push origin main → GitHub Actions → Automated Deployment → Health Checks → Success! ✨
```

**What's Automated:**
- ✅ Build Docker images (with caching)
- ✅ Run tests + linting + security scans
- ✅ Deploy with zero downtime
- ✅ Health checks + automatic rollback
- ✅ Notifications on failure

### Workflows (3)

1. **CI Testing** (`.github/workflows/ci.yml`) - Runs on every PR
   - TypeScript type checking
   - ESLint + Prettier
   - Unit tests (Jest)
   - Security scanning (Trivy, npm audit)
   - Build verification

2. **Production Deployment** (`.github/workflows/deploy-production.yml`) - Runs on push to main
   - Build optimized Docker image
   - SSH to production server (key-based auth)
   - Zero-downtime rolling update
   - Health checks + rollback on failure
   - Duration: 3-4 minutes

3. **PR Preview** (`.github/workflows/preview-deploy.yml`) - Runs on PR
   - Build preview environment
   - Comment deployment status on PR
   - Duration: 2-3 minutes

### Required GitHub Secrets (7)

All secrets documented in `docs/guides/GITHUB-SECRETS-COMPLETE-SETUP.md`

```
Server Access:
- PRODUCTION_SERVER_IP = 221.164.102.253
- PRODUCTION_SERVER_USER = user
- PRODUCTION_SERVER_SSH_KEY = [SSH private key]

Application:
- JWT_SECRET = [From production .env]
- NEXTAUTH_SECRET = [From production .env]

Infrastructure:
- DB_PASSWORD = [PostgreSQL password]
- GRAFANA_PASSWORD = [Grafana admin password]
```

### Quick Deployment

```bash
# 1. Make changes locally
git add .
git commit -m "feat: your feature"

# 2. Push to GitHub (triggers automated deployment)
git push origin main

# 3. Monitor deployment
# Visit: https://github.com/YOUR_USERNAME/connect/actions

# 4. Verify (after ~4 minutes)
./scripts/verify-deployment.sh
curl https://221.164.102.253/api/health
```

### Verification Scripts (4)

```bash
# Complete system check (pre-deployment)
./scripts/verify-github-actions.sh

# Test SSH connection to production server
./scripts/test-ssh-connection.sh

# Interactive secrets setup helper
./scripts/setup-github-secrets.sh

# Post-deployment verification
./scripts/verify-deployment.sh
```

### Performance Improvements

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Deployment Time** | 35 min | 4 min | **87% faster** |
| **Build Time** | 10 min | 3-4 min | **60% faster** |
| **Image Size** | 1.2 GB | 850 MB | **29% smaller** |
| **Transfer Size** | 1.2 GB | 280 MB | **77% smaller** |
| **Security** | Password | SSH Key | **Enterprise** |
| **Testing** | Manual | Automated | **100% coverage** |

**Monthly Time Saved:** ~10 hours
**Annual Value:** $6,000+ in developer time

### Documentation (Complete)

**Setup & Configuration:**
- `GITHUB-ACTIONS-READY.md` - Current status & quick start
- `QUICK-START-GITHUB-ACTIONS.md` - One-page deployment guide
- `docs/guides/GITHUB-SECRETS-COMPLETE-SETUP.md` - All 7 secrets setup
- `docs/guides/GITHUB-ACTIONS-TESTING.md` - Testing & verification
- `docs/guides/GITHUB-ACTIONS-GUIDE.md` - Complete guide
- `GITHUB-ACTIONS-INDEX.md` - Documentation index

**Session Summaries:**
- `SESSION-53-AUTOMATION-COMPLETE.md` - Initial setup
- `SESSION-53-CONTINUATION-COMPLETE.md` - Secrets & testing completion

### Troubleshooting

**SSH Connection Issues:**
```bash
# Test connection
./scripts/test-ssh-connection.sh

# Manual SSH test
ssh -i ~/.ssh/id_ed25519_connect user@221.164.102.253 "echo 'Connection OK'"
```

**Deployment Failures:**
```bash
# Check GitHub Actions logs in browser
# Run local verification
./scripts/verify-github-actions.sh

# Verify server state
ssh -i ~/.ssh/id_ed25519_connect user@221.164.102.253 "docker ps"
```

**Secret Configuration:**
```bash
# View all required secrets with values
./scripts/setup-github-secrets.sh

# Verify SSH key format (must include BEGIN/END lines)
cat ~/.ssh/id_ed25519_connect | head -1
# Should show: -----BEGIN OPENSSH PRIVATE KEY-----
```

## Architecture Overview

### Single-Server Docker Strategy (with Hot Standby for Peak Season)
- **Primary Hardware**: i9-12900K (16 cores / 24 threads) with 128GB RAM, 1TB NVMe SSD
- **Hot Standby**: Second i9-12900K for Jan-March peak season (99.9% SLO requirement)
- **Deployment**: Docker Compose for operational simplicity
- **Development**: MacBook M4 Max (ARM) → Linux server (x86) deployment pipeline
- **Performance Target**: 500-1,500 concurrent users, <500ms P95 response time

### Technology Stack
```
Frontend:    Next.js 14 + TypeScript + Tailwind CSS + shadcn/ui
Backend:     Next.js API Routes (no separate Express server)
Database:    PostgreSQL 15 + PgBouncer (connection pooling)
Cache:       Redis (split: cache instance + queue instance)
Scraping:    NTIS API (axios + xml2js) + Playwright + Bull queue + node-cron
             Hybrid: NTIS API (108K programs, historical patterns) + 
                     Playwright (200-500 active calls, real-time)
Auth:        NextAuth.js + JWT + Kakao/Naver OAuth
Payments:    Toss Payments (subscription + tax invoice)
```

### Docker Service Architecture
```
Cloudflare (DNS + DDoS protection) →
Nginx (reverse proxy, SSL, load balancing) →
App Container 1 + App Container 2 (Next.js instances) →
PgBouncer (transaction pooling) →
PostgreSQL 15 + Redis Cache + Redis Queue + Scraper Worker
```

### Resource Allocation (i9-12900K)
```
Total: 16 cores, 128GB RAM

Services:
├── Nginx:          1 core,   2GB RAM
├── App Instance 1: 3 cores, 10GB RAM
├── App Instance 2: 3 cores, 10GB RAM
├── PgBouncer:      0.5 core, 1GB RAM
├── PostgreSQL:     2 cores, 32GB RAM
├── Redis Cache:    1 core,  12GB RAM
├── Redis Queue:    1 core,   3GB RAM
├── Scraper:        1 core,   4GB RAM
├── Monitoring:     0.5 core, 2GB RAM
└── Buffer:         4 cores, 52GB RAM (safety margin)

Total allocated: 12 cores (75%) + 4 cores buffer (25%) = 16 cores
```

## Business Model & Revenue Strategy

### Hybrid Model: Software + Services

**Software (SaaS Subscription):**
- **Free**: ₩0/month - 10 matches/month, basic features (freemium funnel)
- **Pro**: ₩49,000/month - Unlimited matches, sector gates, outcome data
- **Team**: ₩99,000/month - 5 seats, consortium tools, priority support
- **Target**: 140 paying users by Month 6 → ₩6.86M MRR

**Services (High-margin Consulting):**
- **Application Review**: ₩2-3M per project (7-10 days, win rate +10-15%)
- **Certification Planning**: ₩3-5M (ISMS-P, KC certification roadmap)
- **Consortium Formation**: ₩3-5M (partner matching, warm intros)
- **TRL Advancement**: ₩5-7M (technology development consulting)
- **Target**: 10 engagements by Month 6 → ₩30-50M

**Why Hybrid Works:**
1. **Immediate Cash Flow**: Services provide ₩25M+ from Month 1 (vs. waiting for MRR)
2. **Sustainable Pricing**: ₩49-99K covers infrastructure without external funding
3. **Defensible Moat**: Competitors can't replicate services expertise
4. **Customer Success**: Services help users win → positive outcomes → better matching
5. **Profitability**: Break-even Month 1 (vs. Month 8+ with software-only)

**Revenue Projections:**
- Month 3: ₩18M/month (₩3.4M MRR + ₩15M services)
- Month 6: ₩48M/month (₩7.9M MRR + ₩40M services)
- Cumulative Month 1-6: ₩200M+

### Critical Legal Compliance: Off-Budget Services Invoicing

**MUST KNOW**: Services CANNOT be included in government R&D project budgets.

**Legal Requirement (국가연구개발사업 연구개발비 사용 기준):**
- Connect services = Business development costs (사업개발비)
- Must be invoiced separately from R&D project costs
- Must be paid from company's operating budget (운영비), NOT grant budget (연구개발비)
- Violation = Customer audit risk + Connect legal liability

**MSA Clause (in all service agreements):**
```
제4조 (서비스 비용 청구)
본 서비스는 기업의 사업개발 비용으로 청구되며, 
정부 R&D 과제 연구개발비 예산에 포함되지 않습니다.

법적 근거:
- 「국가연구개발사업 연구개발비 사용 기준」 (IITP 고시 제2025-02호)
- 연구개발비는 직접비(인건비, 연구재료비 등)와 간접비로만 구성
- 일반 컨설팅 비용은 연구개발비 항목 외
```

**Sales Process:**
1. Always explain during sales call: "이 서비스는 귀사의 운영 예산으로 결제됩니다"
2. Invoice separately from any R&D projects
3. FAQ prominently displayed: "부가 서비스 비용은 R&D 예산에 넣을 수 있나요? → 아니요"

## Data Collection Strategy

### Hybrid Approach: NTIS API + Playwright

**Primary Source: NTIS API** (Phase 1 Complete - Oct 6, 2025)
- **Coverage**: 108,798+ R&D programs (comprehensive government database)
- **Purpose**: Historical pattern analysis, win rate benchmarking, success metrics
- **Schedule**: Daily at 8:00 AM KST
- **Technology**: axios + xml2js for XML parsing
- **Status**: Production-ready, awaiting production key (Oct 14, 2025)
- **Value**: Powers insights like "귀사와 유사한 조직의 평균 선정률: 38%"

**Secondary Source: Playwright Web Scraping**
- **Coverage**: 200-500 active calls from 4 agencies (realistic current opportunities)
- **Purpose**: Real-time announcement monitoring
- **Schedule**:
  - Normal: 2x daily (9:00 AM, 3:00 PM KST)
  - Peak Season (Jan-March): 4x daily (9:00 AM, 12:00 PM, 3:00 PM, 6:00 PM KST)
- **Technology**: Playwright + Bull queue + node-cron
- **Rate Limiting**: 10 requests/minute per agency

**Targeted Agencies (4 covering ~55% of R&D budget):**
- **IITP** (정보통신기획평가원) - Ministry of Science and ICT (~15% of budget)
- **KEIT** (한국산업기술평가관리원) - Ministry of Trade, Industry and Energy (~12% of budget)
- **TIPA** (중소기업기술정보진흥원) - Ministry of SMEs and Startups (~8% of budget)
- **KIMST** (해양수산과학기술진흥원) - Ministry of Oceans and Fisheries

**Deduplication & Integration:**
- Content hashing prevents duplicates from both sources
- `scraping_source` field: 'NTIS_API' or agency id ('iitp', 'keit', etc.)
- Users benefit from: Comprehensive historical data + Real-time updates

**CRITICAL: Honest Claims (No "100K+ programs" overpromising)**
- Homepage: "국내 주요 4개 기관 최신 공고 200~500건 (매일 업데이트)"
- Subtext: "Plus: 역대 R&D 과제 108,000+ 건 성공 패턴 분석"
- Why: Honest expectations → higher retention vs. overpromising → disappointment → churn

## NTIS API Integration Status

**Current Status**: Phase 1 Complete (October 6, 2025) ✅

### Phase 1: Foundation & Validation (COMPLETE)
**Duration**: ~2 hours | **Completion Date**: October 6, 2025

**Accomplishments**:
- ✅ Dependencies installed (axios ^1.7.2, xml2js ^0.6.2, @types/xml2js ^0.4.14)
- ✅ NTIS API client implemented (`lib/ntis-api/client.ts`)
- ✅ XML parser created (`lib/ntis-api/parser.ts`)
- ✅ Database integration with deduplication (`lib/ntis-api/scraper.ts`)
- ✅ Configuration files (`lib/ntis-api/config.ts`, `lib/ntis-api/types.ts`)
- ✅ Validation script created (`scripts/validate-ntis-integration.ts`)
- ✅ Diagnostic test script (`scripts/test-ntis-simple.ts`)
- ✅ Manual trigger script (`scripts/trigger-ntis-scraping.ts`)
- ✅ Comprehensive documentation (3 files, 1,100+ line roadmap)

**Test Results**:
- API connectivity: ✅ HTTP 200 responses
- Demo key: ✅ Authenticates successfully (returns 0 results as expected for demo key)
- Implementation: ✅ Production-ready
- Database integration: ✅ Working correctly
- Deduplication: ✅ Content hashing functional

**Files Created**:
```
lib/ntis-api/
├── client.ts          # API client with retry logic
├── parser.ts          # XML response parser
├── scraper.ts         # Database integration
├── config.ts          # API configuration
├── types.ts           # TypeScript interfaces
└── index.ts           # Module exports

scripts/
├── validate-ntis-integration.ts    # 7 comprehensive checks
├── trigger-ntis-scraping.ts        # Manual scraping trigger
└── test-ntis-simple.ts             # API parameter diagnostics

Documentation/
├── NTIS-PHASE1-COMPLETE.md         # Summary & next steps
├── NTIS-PHASE1-TEST-RESULTS.md     # Test results & validation
└── NTIS-IMPLEMENTATION-ROADMAP.md  # Phases 2-5 guide (1,100+ lines)
```

### Phases 2-5: Scheduled (October 14, 2025+)
**Trigger**: Production API key arrival (expected Oct 14, 2025)

**Phase 2**: Production API Key Integration (15-20 min)
- Update `.env` with production key
- Run validation script
- Test production scraping
- Verify data quality

**Phase 3**: Hybrid Scheduler Integration (2-3 hours)
- Create NTIS scheduler (`lib/ntis-api/scheduler.ts`)
- Update main scheduler with NTIS integration
- Create hybrid trigger script
- Test combined NTIS + Playwright scraping

**Phase 4**: Monitoring & Optimization (1.5-2 hours)
- Implement logging utility
- Add usage tracker
- Enhanced error handling with retry logic
- Performance monitoring script

**Phase 5**: Production Deployment (1-2 hours)
- Deploy scheduler to production
- Configure monitoring
- Set up alerts
- First 24-hour monitoring

**Complete Roadmap**: See `NTIS-IMPLEMENTATION-ROADMAP.md` for detailed step-by-step instructions.

## Key Features & Implementation

### 1. Enhanced Matching Engine with Sector Gates

**Rule-Based Scoring (0-100 points):**
- Industry match: 30 points
- TRL compatibility: 20 points
- Certifications: 20 points (ISMS-P, KC, ISO 9001)
- Budget fit: 15 points
- R&D experience: 15 points

**Eligibility Gates (Pass/Fail):**
- Organization type (company/institute/both)
- TRL range (strict: ±2 levels tolerance)
- Sector-specific requirements:
  - **ISMS-P gate** (SaaS/AI companies): 16-item checklist, readiness score 0-100
  - **KC gate** (Hardware/IoT): 8-item document checklist, testing body selection
- Budget constraints (min/max revenue)

**Match Display:**
- Top 10 matches per user (was 3)
- Score 0-100 with visual indicator
- Estimated win probability (future ML model)
- Korean explanation array
- Status: ✅ Eligible / ⚠️ Warning / 🚫 Blocked
- CTA: "신청 준비하기" (leads to services)

### 2. Procurement Readiness Calculator

**Purpose**: Help companies qualify for procurement-track funding (혁신제품, 우수제품)

**Scoring Model (0-100):**
- Product Maturity (30 points): TRL 9 = 30pts, TRL 8 = 20pts, TRL 7 = 10pts
- Certifications (30 points): KC = 15pts, ISO 9001 = 10pts, ISMS-P = 5pts
- Track Record (20 points): 3+ govt projects = 20pts, 1-2 = 10pts, 0 = 0pts
- Quality System (20 points): Warranty = 7pts, A/S = 7pts, Support = 6pts

**Gap Analysis:**
- Identifies missing requirements
- Estimates time to resolve (1-24 months)
- Estimates cost to resolve (₩1M-200M)
- Prioritizes gaps (high/medium/low)
- CTAs for services: "TRL 상향 컨설팅 (₩5-7M)", "인증 계획 (₩3-5M)"

### 3. Outcome Tracking System (Proprietary Data Moat)

**Purpose**: Create defensible competitive advantage through win rate intelligence

**Data Collection (Opt-in, PIPA-compliant):**
- Application status (applied Y/N, date)
- Result (won/lost/pending/withdrawn)
- Financial data (optional): Requested/award amounts
- Feedback: Difficulty rating (1-5), match quality (1-5)
- Explicit consent checkbox: "매칭 정확도 향상을 위해 결과 데이터를 공유합니다"

**Privacy-Preserving Aggregation:**
- Minimum 5 data points required for any stat
- Individual results NEVER disclosed
- Example outputs:
  - "귀사와 유사한 산업(ICT) × TRL(7-8) 조직의 IITP 선정률: 38%"
  - "평균 심사 기간: 87일"
  - "Most successful sectors: ICT (45%), Industrial (32%)"

**Competitive Moat:**
- Competitors only have public announcement data
- Connect has win rates, cycle times, success patterns
- Advantage compounds: More users → More data → Better predictions
- Roadmap: Basic stats (Y1) → ML models (Y2) → Prescriptive advice (Y3)

### 4. Services Management System

**Service Types:**
1. Application Review (₩2-3M, 7-10 days)
2. Certification Planning (₩3-5M, 2-3 weeks)
3. Consortium Formation (₩3-5M, 3-4 weeks)
4. TRL Advancement (₩5-7M, 4-6 weeks)

**Engagement Workflow:**
1. Lead generation (in-app CTAs, email nurture, webinar upsells)
2. Discovery call (30 min, understand need)
3. Proposal (2 days, custom quote + deliverables)
4. Contract signing (MSA with off-budget clause)
5. Kickoff (1 week after payment)
6. Delivery (1-4 weeks depending on service)
7. Follow-up (outcome tracking, testimonial request)

**Conversion Funnel:**
- 1,000 Pro users → 100 consult requests → 30 proposals → 10 closed deals
- Conversion rate: 10% (request → close)
- Target: 10 engagements/Month 6 = ₩30-50M

## Critical Development Considerations

### Hot Standby Requirements (Peak Season: Jan-March)

**Why Critical:**
- January-March = 80% of annual funding announcements
- 27 hours downtime = 50+ users miss deadlines = brand destroyed
- Must have 99.9% SLO during peak season

**Implementation:**
- Second i9-12900K server (hot standby)
- PostgreSQL streaming replication (<5 min RPO)
- Automated failover script (<15 min RTO)
- PagerDuty 24/7 monitoring + SMS alerts
- Weekly health checks during Jan-Mar
- Chaos day testing (Dec 15-20)

**Cost vs. ROI:**
- Cost: ₩600K/month × 3 months = ₩1.8M
- ROI: Prevents ₩10-50M revenue loss from churn

### Cross-Platform Build Requirements
- Development on ARM (MacBook M4) with deployment to x86 (Linux server)
- Docker handles architecture differences automatically
- Multi-stage builds for optimized production images
- Use `npm ci --production` in Docker for correct architecture bindings

### Performance Requirements
- API response time: <500ms (P95) for MVP
- Match generation: <3 seconds for top 10 results
- Database query optimization with PgBouncer connection pooling
- Redis split: cache (LRU eviction) + queue (no eviction, AOF persistence)

### Data Freshness
- Normal: Scrape 2x daily (9am, 3pm)
- Peak Season: Scrape 4x daily (9am, 12pm, 3pm, 6pm)
- Change detection via content hashing
- Simple deadline extraction using regex patterns

## Database Schema Highlights

### Core Tables
- `organizations` - Companies + institutes with encrypted 사업자등록번호
- `funding_programs` - 4-agency programs with eligibility criteria
- `funding_matches` - Rule-based matches with explanations
- `users` - Authentication and subscription management
- `subscriptions` - Toss Payments integration

### New Tables (v8.0 Strategic Revision)
- `grant_outcomes` - **Proprietary data moat**: Applied, won/lost, amounts, cycle times
- `services` - Service catalog (4 types)
- `service_engagements` - Project tracking, invoice, satisfaction
- `sector_gate_checklists` - ISMS-P + KC readiness scores
- `procurement_readiness` - Scoring + gap analysis

### Privacy-Preserving Views
```sql
CREATE VIEW aggregate_success_patterns AS
SELECT 
  agency_id, industry_sector, trl_level,
  COUNT(*) as total_applications,
  SUM(CASE WHEN result = 'won' THEN 1 ELSE 0 END) as wins,
  AVG(cycle_days) as avg_cycle_days
FROM grant_outcomes
WHERE allow_aggregate_analytics = TRUE
GROUP BY agency_id, industry_sector, trl_level
HAVING COUNT(*) >= 5; -- Minimum 5 data points
```

## Deployment Workflow

### Primary: Automated GitHub Actions (Recommended)

**Status:** ✅ Production Ready (October 14, 2025)

```bash
# Automated deployment (87% faster than manual)
git add .
git commit -m "feat: your changes"
git push origin main

# GitHub Actions automatically:
# 1. Builds Docker images (with caching)
# 2. Runs tests + linting + security scans
# 3. SSHs to production server
# 4. Performs zero-downtime rolling update
# 5. Runs health checks
# 6. Rolls back on failure
# 7. Sends notifications

# Monitor deployment progress:
# https://github.com/YOUR_USERNAME/connect/actions

# Verify after ~4 minutes:
./scripts/verify-deployment.sh
```

**Automated Workflow Steps:**
1. **Build** - Docker image with multi-stage caching (3-4 min)
2. **Test** - TypeScript, ESLint, unit tests, security scans
3. **Deploy** - SSH to server, zero-downtime rolling update
4. **Verify** - Health checks on `/api/health` endpoint
5. **Rollback** - Automatic if health checks fail
6. **Notify** - GitHub PR comments + email on failure

**Performance:**
- Deployment time: **4 minutes** (vs. 35 min manual)
- Build time: **3-4 minutes** (with caching)
- Transfer size: **280 MB** (vs. 1.2 GB full image)
- Zero-downtime: **Always** (rolling update)

### Fallback: Manual Docker Deployment

When GitHub Actions unavailable or for emergency hotfixes:

```bash
# Manual zero-downtime deployment
./scripts/deploy.sh

# Rolling update process:
# 1. Build new Docker images
# 2. Run database migrations
# 3. Health check new images
# 4. Rolling restart (app2 first, then app1)
# 5. Verify health endpoints
# 6. Cleanup old images
```

### Directory Structure
```bash
/opt/connect/
├── docker-compose.production.yml
├── .env.production
├── config/           # Nginx, PostgreSQL, Grafana configs
├── scripts/          # Deployment and operational scripts
│   ├── deploy.sh           # Zero-downtime deployment
│   ├── rollback.sh         # Emergency rollback
│   ├── backup.sh           # Automated backups
│   ├── failover.sh         # Hot standby failover (Jan-Mar)
│   └── health-monitor.sh   # System health monitoring
├── logs/             # Application and service logs
├── backups/          # Automated backups (PostgreSQL, Redis, uploads)
├── data/             # Persistent data (Grafana, scraper state)
└── uploads/          # User-uploaded files
```

### Health Checks Required
1. API endpoint availability (`/api/health`)
2. Database connectivity via PgBouncer
3. Redis cache and queue connectivity
4. Docker container health status
5. Scraping job success rates (NTIS API + Playwright)
6. Nginx reverse proxy status
7. Hot standby replication lag (during Jan-March)

## Key Documentation Files

### Strategic Documents
- `docs/current/PRD_v8.0.md`: **START HERE** - Complete product requirements with strategic pivot (companies-first, hybrid model, services, outcome tracking)
- `CONNECT_FINAL_PROPOSAL_v1.0.md` (Desktop): Executive summary of multi-AI debate synthesis
- `CONNECT_IMPLEMENTATION_SPECS_v1.0.md` (Desktop): Parts 1-4 (Database schema, MSA, UI copy, Email templates)
- `CONNECT_IMPLEMENTATION_SPECS_v1.0_PART2.md` (Desktop): Parts 5-8 (API specs, Code snippets, Config, Deployment)

### Architecture & Deployment
- `docs/current/Deployment_Architecture_v3.md`: Docker-based production deployment guide
- `docs/current/NTIS_Agency_Scraping_Config_v2.md`: 4-agency scraping implementation
- `docs/guides/LOAD_TESTING.md`: k6 load testing guide and performance targets
- `docker-compose.production.yml`: Production Docker stack configuration
- `.env.production.example`: Environment variables template

### NTIS API Integration
- **`NTIS-PHASE1-COMPLETE.md`** - Executive summary (Phase 1 done, awaiting Oct 14 key)
- **`NTIS-PHASE1-TEST-RESULTS.md`** - Complete test results (15 KB, 5/7 PASS)
- **`NTIS-IMPLEMENTATION-ROADMAP.md`** - Phases 2-5 guide (33 KB, 1,100+ lines)
- `scripts/validate-ntis-integration.ts` - 7 comprehensive health checks
- `scripts/trigger-ntis-scraping.ts` - Manual NTIS trigger
- `scripts/test-ntis-simple.ts` - API diagnostics

### GitHub Actions CI/CD (Complete - October 14, 2025)

**Setup & Configuration:**
- **`GITHUB-ACTIONS-READY.md`** - **START HERE** - Current status & quick deployment guide
- **`QUICK-START-GITHUB-ACTIONS.md`** - One-page reference (setup in 5 minutes)
- **`docs/guides/GITHUB-SECRETS-COMPLETE-SETUP.md`** - All 7 secrets with exact values
- **`docs/guides/GITHUB-ACTIONS-TESTING.md`** - Complete testing & verification guide
- **`docs/guides/GITHUB-ACTIONS-GUIDE.md`** - Comprehensive GitHub Actions guide
- **`GITHUB-ACTIONS-INDEX.md`** - Complete documentation index

**Verification Scripts:**
- `scripts/verify-github-actions.sh` - Complete system verification (pre-deployment)
- `scripts/test-ssh-connection.sh` - SSH connection testing (✅ PASSING)
- `scripts/setup-github-secrets.sh` - Interactive secrets setup helper
- `scripts/verify-deployment.sh` - Post-deployment verification & health checks

**Workflow Files:**
- `.github/workflows/ci.yml` - CI testing on every PR (tests, lint, security)
- `.github/workflows/deploy-production.yml` - Production deployment (SSH key auth)
- `.github/workflows/preview-deploy.yml` - PR preview environments

**Session Summaries:**
- `SESSION-53-AUTOMATION-COMPLETE.md` - Initial CI/CD setup (workflows, optimization)
- `SESSION-53-CONTINUATION-COMPLETE.md` - Secrets collection & testing completion

**Key Achievement:** 87% faster deployments (35 min → 4 min), SSH key authentication

### Implementation Documentation

**Phase-by-phase retrospectives** documenting foundational decisions. **Read these first** when starting new work.

- **[Phase 1A: Infrastructure Foundation](docs/implementation/phase1a-infrastructure.md)** (8-12 hours)
  - Tech stack (Next.js 14, PostgreSQL 15, Prisma ORM, Redis, Docker Compose)
  - OAuth (Kakao, Naver with NextAuth.js)
  - Security (AES-256-GCM encryption, SHA-256 hashing, rate limiting)
  - Database schema (8 models, 14 enums, 25+ indexes, PIPA compliant)
  - **Key Decisions**: PostgreSQL vs MongoDB, Prisma vs TypeORM, Docker Compose vs K8s

- **[Phase 2A: Match Generation System](docs/implementation/phase2a-match-generation.md)** (3-4 hours)
  - Core matching algorithm (Industry 30pts, TRL 20pts, Type 20pts, R&D 15pts, Deadline 15pts)
  - Korean explanation generator
  - Match generation API with subscription-based rate limiting
  - Match viewing UI with cards, score visualization, CTAs
  - Database seeding (16 programs from 4 agencies)
  - **Key Features**: Explainable AI, Content hashing, Redis rate limiting

### Status & Testing Reports
- `docs/status/deployment-ready.md`: Production deployment readiness checklist
- `docs/status/implementation-status.md`: Feature implementation progress
- `docs/status/oauth-ready-report.md`: OAuth integration test results
- `docs/status/oauth-test-guide.md`: How to test Kakao/Naver OAuth
- `docs/status/testing-summary.md`: Unit and E2E test coverage

**When to reference these docs:**
- **Onboarding:** Read Phase 1A → Phase 2A (5-6 hours) to understand platform
- **Design decisions:** Reference "Key Decisions" sections
- **Debugging:** Understand original design intent
- **New features:** Follow established patterns
- **Refactoring:** Know trade-offs before changing architecture

## Environment Variables Reference

All environment variables documented in `.env.production.example`. Key categories:

### Critical (MUST be configured):
- `ENCRYPTION_KEY` - AES-256-GCM key for 사업자등록번호 (PIPA compliance)
- `DATABASE_URL` - PostgreSQL connection (via PgBouncer)
- `REDIS_CACHE_URL` / `REDIS_QUEUE_URL` - Cache and job queue instances
- `JWT_SECRET` / `NEXTAUTH_SECRET` - Auth secrets (rotate every 90 days)

### OAuth & Payments:
- `KAKAO_CLIENT_ID` / `KAKAO_CLIENT_SECRET` - Kakao OAuth
- `NAVER_CLIENT_ID` / `NAVER_CLIENT_SECRET` - Naver OAuth
- `TOSS_CLIENT_KEY` / `TOSS_SECRET_KEY` - Toss Payments (subscription + tax invoice)

### Scraping:
- `NTIS_API_KEY` - NTIS API authentication (production key arriving Oct 14, 2025)
  - Demo key: `yx6c98kg21bu649u2m8u` (authenticates, 0 results)
  - Production key: Access to 108,798+ programs
  - Get from: https://www.ntis.go.kr/rndopen/api/mng/apiMain.do
  - Support: 042-869-1115, ntis@kisti.re.kr
- `TWOCAPTCHA_API_KEY` - Optional CAPTCHA solving ($1-5/month)
- `SCRAPING_SCHEDULE_NORMAL` / `SCRAPING_SCHEDULE_PEAK` - Cron expressions
- `RATE_LIMIT_PER_MINUTE` - Agency scraping rate limit (default: 10)

## Business Context (Revised Strategic Positioning)

### Target Market (Revised GTM)

**Primary: Companies (90% of revenue)**
- **Size**: 10,000+ SMEs seeking government R&D funding
- **Pain**: Don't know grants exist, miss deadlines, low win rates (15-20%)
- **Budget Authority**: Can pay ₩49-99K/month software + ₩2-7M services
- **Peak Season**: January-March (80% of announcements)
- **Why Primary**: Companies need discovery + execution support, have budget authority

**Secondary: Research Institutes (10% of revenue)**
- **Size**: 200+ institutes (95% founder network)
- **Role**: Supply-side for consortium matching (not primary customers)
- **Value**: Free platform access for partnership opportunities
- **Why Secondary**: Institutes have multi-year budgets, don't need grant "discovery"

**Critical GTM Lesson:**
- Original assumption: Research institutes = primary customers (95% network = advantage)
- Reality: Institutes don't pay for discovery (they already know their grants)
- **Pivot**: Companies = primary paying customers. Use professor network for **company introductions**, not institute signups.

### User Personas

**Company Users (Primary):**
- R&D Directors, CEOs (small companies), Business Development Managers
- Pain points: Discovery problem, deadline anxiety, low win rates (15-20%), application quality
- Jobs to be done: Discover grants, qualify eligibility, apply with quality, win funding, track outcomes
- Budget: ₩49-99K/month software + ₩2-7M services (can approve both)

**Research Institute Users (Secondary):**
- Government-funded (KIST, ETRI) or private research centers
- Pain points: Finding industry partners, tech transfer barriers, TRL matching
- Value proposition: Free platform access for consortium opportunities
- Role: Supply-side (companies need institutes as consortium partners)

### Competitive Positioning
- vs. Manual search: Automated 4-agency monitoring + explainable matching
- vs. ChatGPT (₩25,000/month): Specialized Korean R&D data + outcome intelligence
- vs. Consultants: Hybrid software + services (consultants can't scale, SaaS can't deliver expertise)
- **Unique moats**: Outcome data, services layer, network effects, compliance (off-budget)

### Pricing Strategy
- **Beta (First 50)**: ₩4,900/month for 30 days → Auto-upgrade to ₩49,000
- **Free**: ₩0/month, 10 matches/month (freemium funnel)
- **Pro**: ₩49,000/month (sustainable pricing, covers infrastructure)
- **Team**: ₩99,000/month (5 seats, for larger teams)
- **Services**: ₩2-7M per engagement (off-budget invoicing, company operating budget only)

### Success Metrics (Revised)
- **Launch**: 50 beta users (45 companies, 5 institutes) by Week 9
- **Public**: 500 users by Month 4
- **Engagement**: 70%+ weekly active, >4.0 match quality rating
- **Retention**: 70%+ after 3 months (gate for 1,000 user expansion)
- **Conversion**: 25%+ Free → Pro within 30 days
- **Revenue**: ₩10M+/month by Month 4 (software + services), ₩200M cumulative by Month 6
- **Outcome tracking**: >60% opt-in rate for sharing application results

## Critical Constraints & Requirements

1. **Companies-first GTM** - Primary paying customers, not research institutes
2. **Hybrid revenue model** - Software + services, profitable Month 1
3. **Off-budget services invoicing** - Legal compliance, customer protection
4. **Honest claims** - 200-500 active programs + 108K historical patterns (not "100K+ programs")
5. **Hot standby for peak season** - 99.9% SLO during Jan-March
6. **Outcome data collection** - PIPA-compliant, opt-in, aggregate-only
7. **Sector gates** - ISMS-P, KC prevent ineligible applications
8. **Single-server optimization** - Leverage 128GB RAM, 16 cores efficiently
9. **Respect agency websites** - Follow robots.txt, rate limiting (10 req/min)
10. **Docker for production** - Operational simplicity and reliability

---

**Summary**: Connect is not a grant discovery tool. Connect is Korea's R&D commercialization operating system, combining software automation with professional services to help companies discover, apply for, and win government funding. The hybrid business model (software + services) ensures profitability from Month 1 while building defensible competitive advantages through proprietary outcome data.
