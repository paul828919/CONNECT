# Claude Code Quick Start Prompt - Beta Week 1 Day 1

**Copy-paste this into Claude Code for immediate execution:**

---

```
MISSION: Execute Beta Week 1 Day 1 tasks for Connect Platform (Korean R&D grant matching SaaS)

PROJECT: /Users/paulkim/Downloads/connect
STATUS: 58% complete, 83 days to Jan 1, 2026 launch
PHASE: Beta Test Phase 1 - Self-Dogfooding & Preparation

WHAT'S DONE:
✅ Hot standby infrastructure (PostgreSQL Patroni cluster, 0 byte lag)
✅ AI integration complete (match explanations, Q&A chat, fallback systems)

TODAY'S TASKS (Beta Week 1 Day 1):

1. CREATE DOMAIN/DNS GUIDES (30 min)
   - Read: docs/plans/BETA-TEST-EXECUTION-PLAN.md (Day 1 section)
   - Create: docs/guides/domain-purchase-guide.md
   - Create: docs/guides/dns-configuration-guide.md  
   - Create: docs/guides/environment-variables-update.md
   - Goal: Step-by-step guides for Paul to purchase connect.kr

2. EXECUTE LOAD TESTING (2-3 hours)
   - Read: docs/plans/IMPLEMENTATION-PLAN-12WEEKS.md (Week 3-4 Day 24-25)
   - Test: AI match explanations (100 concurrent, measure P50/P95/P99)
   - Test: Q&A chat (50 concurrent sessions)
   - Test: Circuit breaker + fallback content
   - Target: <5s P95 uncached, <500ms cached, >40% cache hit rate
   - Create: scripts/load-test-ai-explanations.ts
   - Create: scripts/load-test-qa-chat.ts
   - Optimize: Fix any bottlenecks found
   - Document: docs/plans/progress/load-test-results-day1.md

3. UPDATE DOCUMENTATION (30 min)
   - Update: IMPLEMENTATION-STATUS.md (58% → 60-62%)
   - Create: docs/plans/progress/beta-week1-day1-complete.md
   - Update: docs/plans/BETA-QUICK-REFERENCE.md (check off Day 1)

CONSTRAINTS:
❌ No production database changes
❌ No production deployments  
❌ No actual domain purchase (Paul does manually)
❌ Dev/staging testing only
❌ Monitor AI API costs during testing

SUCCESS CRITERIA:
✅ Domain guides created (ready for Paul)
✅ Load tests passing (meet performance targets)
✅ Documentation updated
✅ Ready for Day 2-3 (HTTPS + Security)

TECH STACK: Next.js 14, PostgreSQL 15, Redis, Claude Sonnet 4.5, Docker

READ FIRST:
- docs/plans/BETA-TEST-EXECUTION-PLAN.md (Day 1)
- docs/plans/IMPLEMENTATION-PLAN-12WEEKS.md (Day 24-25)
- IMPLEMENTATION-STATUS.md (current state)

EXECUTION ORDER:
1. Read key documents
2. Create domain/DNS guides
3. Execute load tests
4. Apply optimizations
5. Update documentation
6. Report completion

START NOW! Work through tasks systematically. Document everything. 🚀
```

---

**That's it!** This is the minimal version. For detailed specifications, use the comprehensive prompt in CLAUDE-CODE-PROMPT.md.
