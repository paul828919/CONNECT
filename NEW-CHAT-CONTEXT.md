# CONNECT Platform: New Chat Context Summary

## 🎯 Project Overview
**Product:** CONNECT - AI-powered R&D commercialization OS for Korean companies  
**Purpose:** Match companies with government grants from 19 NTIS agencies  
**Target Launch:** January 1, 2026 (peak season starts)  
**Current Date:** October 9, 2025 (12 weeks until launch)  
**Developer:** Solo developer using Claude Code  
**Project Location:** `/Users/paulkim/Downloads/connect`

## 📊 Current Status (As of Oct 9, 2025)

### ✅ Completed in 10 Days
- Full Next.js/TypeScript production architecture
- Comprehensive Prisma schema (User, Organization, FundingProgram, FundingMatch, Subscription, etc.)
- NTIS API integration (108k+ programs, 20-40x faster than scraping)
- Playwright scraper (3/4 agencies working: IITP, TIPA, KIMST)
- Authentication system (NextAuth with Kakao/Naver OAuth ready)
- Docker production setup + Redis manager
- Testing framework (Jest + Playwright)
- PostgreSQL with optimized indexes

### ❌ Not Yet Implemented
- Matching algorithm (scoring and generation)
- User-facing UI (dashboard, search, filters)
- AI integration (Claude Sonnet 4.5)
- Hot standby infrastructure
- Beta testing

## 📋 APPROVED STRATEGY: 12-Week Integrated Plan

### Phase 1: Core Platform (Oct 9 - Nov 5, 4 weeks)
**Weeks 1-2: Matching Engine + Basic UI**
- Build rule-based matching algorithm (TRL, sector, budget, deadline scoring)
- Create matches dashboard, program detail pages, search/filters
- Generate FundingMatch records automatically
- Goal: Working MVP where users see personalized matches

**Weeks 3-4: Hot Standby Infrastructure**
- PostgreSQL streaming replication (Primary → Standby)
- Redis cluster for sessions + caching
- Automated failover (<30 second recovery)
- Load testing (10x traffic simulation)
- Goal: Infrastructure that won't crash during peak season

### Phase 2: AI Layer (Nov 6 - Dec 3, 4 weeks)
**Weeks 5-6: AI Integration (Claude Sonnet 4.5)**
- AI match explanations ("This is 85% match because..." in Korean)
- AI Q&A chat (real-time program answers)
- Background job system for batch AI generation
- Goal: AI-powered advisor, not just aggregator

**Weeks 7-8: Testing & Refinement**
- Full system load testing
- AI prompt optimization
- Performance tuning + bug fixes
- Security hardening
- Goal: Beta-ready system

### Phase 3: Beta Testing (Dec 4-31, 4 weeks)
**Week 9 (Dec 4-10): Internal Testing**
- Test all flows end-to-end with synthetic data

**Week 10 (Dec 11-17): Small Beta (5-10 companies)**
- Real user validation of match quality and AI

**Week 11 (Dec 18-24): Expanded Beta (20-30 companies)**
- Load testing with real users, final refinements

**Week 12 (Dec 25-31): Final Polish**
- Critical bug fixes only, launch preparation

**Launch: January 1, 2026 🚀**

## 🔑 Key Strategic Decisions

### 1. AI Without Outcome Intelligence (V1)
**Decision:** Launch AI features using existing data (company profile + program requirements) without waiting for 8-week outcome intelligence database.

**Rationale:**
- V1 AI already valuable: "85% match because your TRL 5-6 matches program's TRL 4-7"
- Competitors just show lists - we have personalized explanations from day 1
- Outcome intelligence deferred to Phase 2 (Feb-Mar) - enhances by 60-70% but not blocking

### 2. Hot Standby is Non-Negotiable
**Decision:** Implement hot standby infrastructure in Weeks 3-4, before AI features.

**Rationale:**
- 10x traffic during Jan-Mar peak season
- ₩40-50M revenue at stake
- Single database failure = entire site down = users miss deadlines
- Automatic failover <30s prevents catastrophic loss

### 3. 4-Week Beta Testing Required
**Decision:** Allocate full 4 weeks for beta (not 5-7 days).

**Rationale:**
- AI prompt refinement requires multiple iterations
- Infrastructure stress testing needs real user patterns
- User feedback essential for match algorithm accuracy
- Cannot validate all this in 5-7 days

### 4. Integrated Development (Not Sequential)
**Decision:** Build platform + AI + infrastructure in parallel, not sequentially.

**Rationale:**
- Sequential would put AI at end with inadequate testing time
- Integrated approach maintains competitive differentiation from launch
- Proven velocity with Claude Code makes parallel development feasible

## 📁 Key Files & Documentation

**Implementation Plan:**
- `IMPLEMENTATION-PLAN-12WEEKS.md` - Complete day-by-day roadmap (just created)

**Project Documentation:**
- `prisma/schema.prisma` - Complete database schema
- `lib/ntis-api/` - NTIS API integration (working)
- `lib/scraping/` - Playwright scraper (3/4 agencies working)
- `IMPLEMENTATION-SUMMARY.md` - NTIS integration technical details
- `SCRAPER-STATUS.md` - Current scraper status
- `README.md` - Project overview

**Strategic Documents:**
- PRD v7.0 (Production Ready)
- Deployment Architecture v2
- NTIS Scraping Config (19 agencies mapped)

## 🎯 Success Criteria for Jan 1 Launch

**Infrastructure:**
- ✅ Hot standby failover <30s recovery
- ✅ Handles 10x traffic with <2s response time
- ✅ 99.9% uptime during beta

**Matching System:**
- ✅ 80%+ user satisfaction with match relevance
- ✅ <5% false positive rate
- ✅ Automatic match generation

**AI Layer:**
- ✅ Match explanations rated "helpful" by 70%+ users
- ✅ Q&A chat 90%+ accuracy
- ✅ Claude API stable with fallbacks

**User Experience:**
- ✅ Profile completion rate >60%
- ✅ Users understand match scores
- ✅ Zero critical bugs

## 🚀 Immediate Next Steps (Week 1-2)

**Starting:** October 9, 2025  
**Focus:** Matching Engine + Basic UI

**Day 1-2 Tasks:**
1. Design matching algorithm scoring logic
2. Create `lib/matching/scoring.ts` module
3. Define match score calculation (TRL + sector + budget + deadline)

**This Week Goal:**
- Working matching algorithm
- Match generation pipeline
- Users can see personalized program matches

## 💻 Development Context

**Environment:**
- Primary: MacBook M4 Max
- Production: Linux i9-12900K (128GB RAM)
- Database: PostgreSQL + Prisma
- Framework: Next.js + TypeScript
- AI: Claude Sonnet 4.5 (Anthropic API)

**Working Solo with Claude Code:**
- Proven 10-day velocity for complex infrastructure
- Comfortable with integrated development
- HIGH confidence level

## 📦 Features Deferred to Phase 2 (Post-Launch)

**Feb-Mar 2026 (after stable operation):**
- Outcome intelligence database (enhance AI 60-70%)
- Sector gates (ISMS-P, KC certifications)
- Procurement calculator
- Partner search/discovery
- AI draft generator

**Rationale:** These enhance a working product, not critical for V1

## 🔥 Critical Reminders

1. **Peak season is Jan-Mar** - 10x traffic, ₩40-50M revenue at stake
2. **No infrastructure = no business** - Hot standby is non-negotiable
3. **AI differentiation from day 1** - Competitors are just aggregators
4. **4-week beta is minimum** - Quality validation takes time
5. **Integrated plan approved** - Don't revert to sequential development

---

## 📋 Copy This for New Chat

**When starting a new chat, paste:**

```
I'm working on CONNECT platform - AI-powered R&D grant matching for Korean companies.

Project: /Users/paulkim/Downloads/connect
Launch: January 1, 2026 (12 weeks from now)
Status: 10 days of foundation complete, starting Week 1-2 implementation

Key context:
- 108k+ NTIS programs loaded via API
- Prisma schema complete
- Need to build: matching engine, UI, AI layer, hot standby
- 12-week integrated plan documented in IMPLEMENTATION-PLAN-12WEEKS.md
- Working solo with Claude Code

Current task: [describe what you're working on]

Please reference IMPLEMENTATION-PLAN-12WEEKS.md and NEW-CHAT-CONTEXT.md for full context.
```

---

**This summary contains everything needed to continue development in a new chat without losing strategic context.**
