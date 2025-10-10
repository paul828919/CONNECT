# Week 3-4 AI Integration Handoff Prompt
## For New Session After /compact

**Copy and paste this entire prompt into the new chat session**

---

I'm continuing development on the Connect Platform 12-week execution plan (January 1, 2026 launch).

## CURRENT STATUS (October 9, 2025)

**Project**: /Users/paulkim/Downloads/connect
**Phase**: Week 3-4 Preparation COMPLETE ✅ - Ready to Execute AI Integration
**Overall Progress**: 40% (Week 1-2 Infrastructure + Week 3-4 Prep Complete)
**Timeline Status**: 6 days ahead of schedule

## WEEK 1-2 COMPLETED ✅

**Infrastructure achievements**:
- PostgreSQL 15.14 streaming replication (0 byte lag)
- PgBouncer connection pooling (3,571 QPS)
- etcd 3.6.5 + Patroni 4.1.0 automated failover (~2 seconds!)
- HAProxy 3.2.6 intelligent load balancing
- 2-node cluster operational (1 Leader + 1 Replica)
- Load test: 100% success rate (180/180 writes)
- Validation: 27/27 checks passed

**Key files**:
- `docs/plans/progress/week01-complete.md` - Week 1 summary
- `docs/plans/progress/week02-complete.md` - Week 2 summary
- `IMPLEMENTATION-STATUS.md` - Overall progress (40% complete)

## WEEK 3-4 PREPARATION COMPLETED ✅ (Just Finished!)

**All 6 days of preparation complete in 1 day** (Oct 9, 2025):

### Day 1-2: Research & Domain Knowledge ✅
- Anthropic API documentation reviewed (250+ lines)
- @anthropic-ai/sdk installed and tested
- Korean R&D glossary created (100+ terms, all 9 TRL levels)
- Grant examples collected (5 detailed programs from 4 agencies)
- Cost projections: ₩954,000/month with 50% caching

### Day 3-4: Prompt Engineering & Cost Optimization ✅
- Match explanation prompt template with XML parsing
- Q&A chat prompt template with conversation context
- Token counter utility
- Response caching architecture (50% cost reduction)
- Budget tracker with alerts

### Day 5-6: Architecture & Planning ✅
- Conversation schema designed (Prisma models)
- Context manager for message history
- Week 3-4 execution checklist (Days 15-22)
- Risk assessment complete
- Preparation summary documented

**Files created** (13 total, 3,000+ lines):
```
docs/plans/
├── week3-4-preparation-plan.md (850 lines)
├── week3-4-execution-checklist.md (300 lines)
└── week3-4-preparation-summary.md (400 lines)

docs/research/
├── anthropic-api-notes.md (250 lines)
├── korean-rd-glossary.md (400 lines)
└── grant-examples.md (600 lines)

lib/ai/
├── prompts/
│   ├── match-explanation.ts (150 lines)
│   └── qa-chat.ts (200 lines)
├── utils/
│   └── token-counter.ts (80 lines)
├── cache/
│   └── response-cache.ts (100 lines)
├── tracking/
│   └── budget-tracker.ts (100 lines)
└── conversation/
    ├── types.ts (40 lines)
    └── context-manager.ts (60 lines)

scripts/
└── test-anthropic-basic.ts (120 lines)
```

## WHAT I NEED NOW

### Primary Task: Execute Week 3-4 AI Integration (Claude Sonnet 4.5)

**Start Date**: October 16, 2025 (recommended, using 6-day buffer wisely)
**Target Completion**: November 1, 2025
**Duration**: 8 days (Days 15-22)

Please execute the following in order:

### Day 15 (Oct 23): Anthropic SDK Setup & Client Wrapper
1. Guide me to obtain Anthropic API key from console.anthropic.com
2. Create `lib/ai/client.ts` with:
   - Anthropic client initialization
   - Rate limiting (50 RPM for Tier 1)
   - Error handling (429, 401, 400)
   - Retry logic with exponential backoff
   - Request logging for cost tracking

3. Update `.env` with production key
4. Test connectivity with `scripts/test-anthropic-basic.ts`

### Day 16-17 (Oct 24-25): Match Explanations Integration
1. Create `lib/ai/services/match-explanation.ts`:
   - Import prompt template from `lib/ai/prompts/match-explanation.ts`
   - Implement `generateMatchExplanation()` function
   - Parse XML response
   - Add error handling

2. Create API endpoint `app/api/matches/[id]/explanation/route.ts`
3. Implement Redis caching (24-hour TTL)
4. Create UI component `components/match-explanation.tsx`
5. Test with 10+ real programs
6. Measure response time (<2s target)

### Day 18-19 (Oct 26-27): Q&A Chat System
1. Create conversation API endpoints:
   - `app/api/chat/route.ts` (POST new message)
   - `app/api/chat/[id]/route.ts` (GET conversation)
   - `app/api/chat/[id]/messages/route.ts` (GET messages)

2. Implement `lib/ai/services/conversation.ts`:
   - Load last 10 messages
   - Summarize old messages (if >20 total)
   - Build prompt with context
   - Parse response

3. Add streaming responses (Server-Sent Events)
4. Build chat UI `components/chat/chat-interface.tsx`
5. Test multi-turn conversations

### Day 20-21 (Oct 28-29): Korean Prompt Optimization
1. Test 5+ prompt variations
2. Test temperature settings (0.5, 0.7, 0.9)
3. Collect user feedback from 10+ beta users
4. Measure helpfulness (>70% target)
5. Refine prompts based on feedback

### Day 22 (Oct 30): Cost Tracking & Monitoring
1. Deploy budget tracker
2. Set up daily alerts (80%, 95%, 100%)
3. Create cost dashboard `app/dashboard/ai-usage/page.tsx`
4. Document cost optimization results

## KEY REFERENCE DOCUMENTS

**Must read before starting**:
1. `docs/plans/week3-4-execution-checklist.md` - Detailed task breakdown
2. `docs/plans/week3-4-preparation-summary.md` - Complete preparation overview
3. `docs/research/anthropic-api-notes.md` - API best practices
4. `docs/research/korean-rd-glossary.md` - Korean terminology reference
5. `CLAUDE.md` - Project overview and commands
6. `IMPLEMENTATION-STATUS.md` - Overall progress

## SUCCESS CRITERIA

**Technical Metrics**:
- Response time: Match <2s, Q&A <3s (with caching)
- Cache hit rate: >50%
- Error rate: <0.1%
- Daily cost: <₩50,000

**Korean Quality Metrics**:
- Natural 존댓말: >4.0/5.0 rating
- Helpfulness: >70% positive feedback
- Domain terminology accuracy: 100%

**Business Metrics**:
- Feature adoption: >30% of Pro users
- Pro conversion impact: +5-10%
- User satisfaction: >70%

## CRITICAL REMINDERS

1. **Cost Optimization First**: Implement caching from Day 1 (50% savings)
2. **Korean Quality Critical**: Professional 존댓말, accurate terminology
3. **All prep complete**: Prompts, utilities, architecture ready to use
4. **6 days ahead**: Use buffer for quality, not speed
5. **Temperature 0.7**: Optimal for conversational balance

## CURRENT INFRASTRUCTURE STATUS

All services operational:
- etcd: localhost:2379 (healthy)
- Patroni postgresql1: localhost:5432 (Leader)
- Patroni postgresql2: localhost:5433 (Replica, 0 lag)
- HAProxy: Write 5500, Read 5501, Stats 7500
- PostgreSQL 15.14: Managed by Patroni

## DEVELOPMENT ENVIRONMENT

- MacBook Pro M4 Max (ARM)
- Node.js + Next.js 14 + TypeScript
- PostgreSQL 15 + Redis + Prisma ORM
- Docker for production deployment

## LAUNCH TIMELINE

- Week 3-4 Target: Nov 1, 2025 (AI Integration complete)
- Week 5: Load Testing
- Week 6: Security Hardening
- Week 7-10: Beta Testing (4 weeks)
- Week 11-12: Final Testing + Launch Prep
- **LAUNCH**: January 1, 2026 00:00 KST 🚀

---

**Current Phase**: Ready to start Week 3-4 Day 15 (Anthropic SDK Setup)
**Next Action**: Guide me through obtaining Anthropic API key and creating AI client wrapper
**Overall Progress**: 40% complete, 6 days ahead of schedule
**Days Remaining**: 83 days until launch

I'm ready to execute Week 3-4 AI Integration with Claude Sonnet 4.5! Let's begin with Day 15. 🚀
