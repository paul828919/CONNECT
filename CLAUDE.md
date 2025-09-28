# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Connect is an explainable matching platform for Korea's R&D ecosystem that connects Companies, Research Institutes, and Universities through Funding → Collaboration → Tech Transfer. The platform provides verified, real-time Korean R&D opportunities with warm introductions and compliance automation.

**Critical Timeline:**
- Target Launch: December 15, 2024
- Peak Season: January-March 2025 (must maintain 99.9% uptime)
- Beta Testing: December 1-14, 2024

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

# Deployment
./scripts/deploy.sh     # Deploy to production server
./scripts/health-check.sh  # Check system health
```

## Architecture Overview

### Single-Server Optimization Strategy
- **Target Hardware**: i9-12900K (16 cores) with 128GB RAM, 1TB NVMe SSD
- **Deployment**: Native services (NO Docker in production) for maximum performance
- **Development**: MacBook M4 Max (ARM) → Linux server (x86) deployment pipeline
- **Performance Target**: 10,000+ concurrent users with sub-second response times

### Technology Stack
```
Frontend: Next.js 14 + TypeScript + Tailwind CSS + Zustand
Backend:  Node.js 20 LTS + Express + PM2 cluster mode
Database: PostgreSQL 15 + PgBouncer (connection pooling)
Cache:    Redis (split: cache instance + queue instance)
Scraping: Playwright + Cheerio + node-cron
Auth:     NextAuth.js + JWT + Kakao/Naver OAuth
```

### Service Architecture
```
Nginx (reverse proxy, SSL) →
PM2 Cluster (8-12 Node.js processes) →
PgBouncer (transaction pooling) →
PostgreSQL 15 + Redis Cache/Queue
```

## Data Collection Strategy

The platform scrapes **all 19 NTIS commissioning agencies** using a tiered approach:

- **Tier 1** (4 agencies): 3x daily scraping (9:30 AM, 2:00 PM, 5:30 PM KST)
  - NRF, IITP, KEIT, TIPA (~70% of total R&D budget)
- **Tier 2** (5 agencies): 2x daily scraping (10:00 AM, 4:00 PM KST)
  - KHIDI, KOCCA, KEITI, IPET, KAIA
- **Tier 3** (5 agencies): Daily scraping (10:30 AM KST)
- **Tier 4** (4 agencies): 3x weekly scraping (Mon/Wed/Fri 11:00 AM KST)

**Peak Season Mode**: Increase scraping frequency by 50% during January-March funding rush.

## Critical Development Considerations

### Cross-Platform Build Requirements
- Development on ARM (MacBook M4) with deployment to x86 (Linux server)
- JavaScript builds on Mac, native modules (bcrypt, sharp, Prisma engines) compile on server
- Use `npm ci --production` on server for correct architecture bindings

### Performance Requirements
- API response time: < 200ms (P95)
- Match generation: < 3 seconds for top 5 results
- Database query optimization with PgBouncer connection pooling
- Redis split: cache (LRU eviction) + queue (no eviction, AOF persistence)

### Data Freshness
- Maximum 6 hours from government announcement to platform availability
- Real-time change detection and content hashing for updates
- Intelligent pattern matching for deadline extraction and categorization

## Database Schema Highlights

Key entities:
- `organizations` (companies, institutes, universities with 사업자등록번호 verification)
- `funding_programs` (19 agency programs with structured eligibility criteria)
- `funding_matches` (match scores with explanations)
- `announcements` (scraped data with content hashing and change detection)

## Deployment Workflow

### Atomic Deployment Pattern
```bash
# Symlink-based zero-downtime deployment
/opt/connect/
  current → releases/2024-12-15T10-30-00/  # Atomic symlink switch
  releases/
    2024-12-15T10-30-00/  # New version
    2024-12-14T15-20-00/  # Previous (rollback ready)
```

### Health Checks Required
1. API endpoint availability (`/api/health`)
2. Database connectivity via PgBouncer
3. Redis cache and queue connectivity
4. PM2 process status
5. Scraping job success rates

## Key Documentation Files

- `Connect_PRD_v7.0.md`: Complete product requirements and specifications
- `Connect_Deployment_Architecture_v2.md`: Detailed production deployment guide
- `Connect_NTIS_Agency_Scraping_Config.md`: Technical scraping implementation
- Package structure in `/connect-platform/`

## Business Context

### User Types (3 Core)
1. **Companies** (기업): Seeking R&D funding and university partnerships
2. **Research Institutes** (연구소): Multi-year budgets and industry collaboration
3. **Universities** (대학): Research grants and applied research partnerships

### Competitive Positioning
- vs. ChatGPT/Claude (₩28,000/month): Connect costs ₩9,900/month with verified Korean data
- vs. Manual search: Complete 19-agency coverage with real-time updates
- Unique value: Warm introductions + compliance automation + explainable matching

### Success Metrics
- Complete 19-agency coverage (100% vs competitors' ~20%)
- Data freshness: < 6 hours (vs days/weeks for manual sources)
- User capacity: 10,000+ concurrent users during peak season
- Revenue target: ₩120M+ ARR by end of Year 1

## Critical Constraints

1. **Never use Docker in production** - native services for performance
2. **Always optimize for single-server** - leverage 128GB RAM and 16 cores
3. **Maintain 99.9% uptime January-March** - peak funding application season
4. **Respect agency websites** - follow robots.txt and implement rate limiting
5. **Ensure data privacy** - encrypt 사업자등록번호 and implement PIPA compliance