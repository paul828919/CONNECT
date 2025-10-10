# Claude Code Prompt - Beta Week 1 Day 1 Execution
**Date**: October 10, 2025  
**Purpose**: Execute Beta Week 1 Day 1 tasks for Connect Platform  
**Estimated Time**: 3-4 hours total

---

## 📋 COPY THIS INTO CLAUDE CODE:

```
You are Claude Code, an autonomous development assistant helping Paul Kim (solo founder) execute Beta Week 1 Day 1 of the Connect Platform beta test preparation.

## PROJECT CONTEXT

**Project**: Connect - Korean R&D grant matching platform (B2B SaaS)
**Current Status**: 58% complete (83 days until Jan 1, 2026 launch)
**Project Root**: /Users/paulkim/Downloads/connect
**Current Phase**: Beta Test Phase 1 - Self-Dogfooding & Preparation

**Tech Stack**:
- Next.js 14 (App Router)
- PostgreSQL 15 (Hot standby: 2-node Patroni cluster, 0 byte lag)
- Redis (caching)
- Claude Sonnet 4.5 (AI features)
- Docker (production deployment)

**What's Complete** (58%):
✅ Week 1-2: Hot standby infrastructure (PostgreSQL replication, Patroni, HAProxy)
✅ Week 3 Days 15-23: AI integration (match explanations, Q&A chat, cost monitoring, fallback systems)

**Today's Mission**: Beta Week 1 Day 1
- Task 1: Domain purchase guidance (PREPARE, Paul will execute manually)
- Task 2: DNS configuration guidance (PREPARE, Paul will execute manually)
- Task 3: Week 3-4 Day 24-25 load testing (EXECUTE - this is the main automation task)

## KEY DOCUMENTS TO READ FIRST

**CRITICAL**: Read these files before proceeding:

1. `docs/plans/BETA-TEST-EXECUTION-PLAN.md`
   - Find section: "Day 1: Thursday, October 10"
   - Read tasks: Domain purchase, DNS setup, Week 3-4 Day 24-25

2. `docs/plans/IMPLEMENTATION-PLAN-12WEEKS.md`
   - Find section: "Week 3-4 Day 24-25: Load Testing & Optimization"
   - Read technical specifications for load testing

3. `IMPLEMENTATION-STATUS.md`
   - Read current progress
   - Understand what's been completed

4. `docs/plans/PLAN-RELATIONSHIP-EXPLAINED.md`
   - Understand why we're following beta plan, not original plan

## EXECUTION PLAN

### PHASE 1: DOMAIN & DNS PREPARATION (Manual - Paul will execute)
**Time**: 30 minutes | **Automation Level**: GUIDANCE ONLY

**Your Task**: Create comprehensive step-by-step guides for Paul

**Deliverables**:
1. `docs/guides/domain-purchase-guide.md`
   - Recommended Korean domain registrars (hosting.kr, cafe24.com, gabia.com)
   - Step-by-step domain purchase process
   - Pricing comparison (₩15-30K/year)
   - What to purchase: connect.kr (preferred) or alternatives

2. `docs/guides/dns-configuration-guide.md`
   - DNS record templates (A records, CNAME)
   - Configuration for connect.kr AND staging.connect.kr
   - nslookup/dig verification commands
   - Expected propagation time (10-30 minutes)

3. `docs/guides/environment-variables-update.md`
   - What to add to .env
   - What to add to .env.production
   - Example values with placeholders

**Format**: Each guide should have:
- Clear step-by-step instructions
- Copy-paste commands where applicable
- Screenshots/diagrams where helpful (describe in text)
- Verification checkpoints
- Troubleshooting section

### PHASE 2: LOAD TESTING & OPTIMIZATION (Automated - You execute)
**Time**: 2-3 hours | **Automation Level**: FULL EXECUTION

**Your Task**: Execute comprehensive load testing for AI features

**Context**: We completed AI integration (Days 15-23) and now need to validate performance under load.

**Load Testing Scenarios** (from original plan):

1. **Match Explanation Load Test**
   - 100 concurrent requests for AI explanations
   - Mix of cached (40%) and uncached (60%) requests
   - Measure P50/P95/P99 response times
   - Target: <5s P95 (uncached), <500ms P95 (cached)
   - Validate circuit breaker triggers at high error rate

2. **Q&A Chat Load Test**
   - 50 concurrent chat sessions
   - Multi-turn conversations (3-5 messages per session)
   - Measure response times, context memory accuracy
   - Target: <5s P95
   - Test rate limiting (10 messages/minute per user)

3. **Combined Stress Test**
   - Simultaneous match explanations + Q&A chat
   - Validate system stability under dual load
   - Monitor: CPU, memory, database connections, Redis cache
   - Check fallback content serves correctly when AI fails

**Implementation Steps**:

1. **Create Load Testing Scripts** (if not already exist)
   - `scripts/load-test-ai-explanations.ts` (or .js)
   - `scripts/load-test-qa-chat.ts`
   - `scripts/load-test-combined.ts`
   - Use k6, artillery, or custom Node.js scripts

2. **Set Up Test Environment**
   - Verify development database is being used
   - Verify Redis cache is separate from production
   - Set AI client to development mode (budget monitoring)
   - Create test organization profiles (if needed)

3. **Execute Tests**
   - Run each test scenario
   - Capture metrics (response times, error rates, resource usage)
   - Monitor logs for errors or warnings
   - Document any failures or bottlenecks

4. **Analyze Results**
   - Calculate P50/P95/P99 percentiles
   - Identify slow queries (if any)
   - Check cache hit rates (target: >40%)
   - Identify any performance bottlenecks

5. **Apply Optimizations**
   - Add missing database indexes (if needed)
   - Tune Redis cache TTL (if needed)
   - Adjust AI client rate limits (if needed)
   - Update any slow database queries

6. **Re-test to Verify**
   - Run tests again after optimizations
   - Compare before/after metrics
   - Document improvements

**Technical Details to Reference**:
- Match explanation service: `lib/ai/services/match-explanation.ts`
- Q&A chat service: `lib/ai/services/qa-chat.ts`
- AI client: `lib/ai/client.ts`
- Circuit breaker config: Check thresholds in ai/client.ts
- Performance monitoring: `lib/ai/monitoring/performance.ts`

**Deliverables**:
1. Load testing scripts (3 files in `scripts/`)
2. Test execution logs
3. Performance analysis report: `docs/plans/progress/load-test-results-day1.md`
4. Any optimization commits (with clear messages)

### PHASE 3: VALIDATION & OPTIMIZATION
**Time**: 30 minutes | **Automation Level**: FULL EXECUTION

**Your Task**: Validate results meet success criteria and apply fixes

**Success Criteria** (from Beta Test Master Plan):
- Match explanation P95: <5s uncached, <500ms cached
- Q&A chat P95: <5s
- Cache hit rate: >40%
- Error rate: <0.1%
- Circuit breaker: Triggers correctly at high error rate
- Fallback content: Serves correctly when AI unavailable

**If Criteria Not Met**:
1. Identify root cause (slow queries, cache misses, etc.)
2. Apply targeted optimizations
3. Re-test
4. Document what was fixed and impact

### PHASE 4: DOCUMENTATION & STATUS UPDATE
**Time**: 30 minutes | **Automation Level**: FULL EXECUTION

**Your Task**: Update all tracking documents

**Deliverables**:

1. **Update IMPLEMENTATION-STATUS.md**
   - Mark Day 24-25 as complete ✅
   - Update overall progress (58% → 60-62%)
   - Update "Completed This Week" section
   - Update "Next Actions" (show Day 2-3 tasks)

2. **Create Progress Report**
   - File: `docs/plans/progress/beta-week1-day1-complete.md`
   - Include:
     * Tasks completed (domain guides, load testing)
     * Load testing results summary
     * Performance metrics (before/after)
     * Issues found and fixed
     * Time spent on each phase
     * Next steps (Day 2-3)

3. **Update BETA-QUICK-REFERENCE.md**
   - Check off "Day 1" tasks
   - Update progress tracker

## SUCCESS CRITERIA

**Day 1 Complete When**:
✅ Domain purchase guide created (ready for Paul)
✅ DNS configuration guide created (ready for Paul)
✅ Load testing scripts created and executed
✅ All load tests passing (meet performance targets)
✅ Any P0 performance issues fixed
✅ Documentation updated (status, progress, checklist)
✅ Ready for Day 2-3 (HTTPS + Security)

## CONSTRAINTS & WARNINGS

**DO NOT**:
❌ Modify production database directly
❌ Deploy to production (today is dev/staging only)
❌ Purchase domain automatically (requires Paul's payment)
❌ Modify actual DNS settings (requires registrar access)
❌ Skip reading the beta test execution plan first
❌ Use production AI API keys for load testing
❌ Exceed AI budget (monitor costs during testing)

**DO**:
✅ Test against development database only
✅ Use separate Redis cache for testing
✅ Monitor AI API usage during tests
✅ Create backups before optimizations
✅ Document everything thoroughly
✅ Stop if you encounter critical errors (report to Paul)

## TIME ESTIMATES

- Phase 1 (Domain/DNS guides): 30 minutes
- Phase 2 (Load testing): 2-3 hours
- Phase 3 (Validation): 30 minutes
- Phase 4 (Documentation): 30 minutes
- **Total**: 3.5-4.5 hours

## IF YOU GET STUCK

1. **Missing dependencies?**
   - Check package.json
   - Install: npm install [package]
   - Document what you installed

2. **Tests failing?**
   - Check environment variables (.env)
   - Check services running (PostgreSQL, Redis)
   - Check AI client configuration
   - Document error messages

3. **Performance targets not met?**
   - Document baseline performance
   - Identify bottleneck (database, AI API, Redis)
   - Apply targeted optimization
   - Re-test

4. **Unclear technical details?**
   - Reference IMPLEMENTATION-PLAN-12WEEKS.md
   - Check existing code in lib/ai/
   - Review test scripts from Day 22-23

## OUTPUT FORMAT

When you complete each phase, provide:
1. Summary of what was done
2. Files created/modified
3. Commands executed
4. Results achieved
5. Any issues encountered
6. Next steps

**Example**:
```
PHASE 1 COMPLETE ✅

Created:
- docs/guides/domain-purchase-guide.md (342 lines)
- docs/guides/dns-configuration-guide.md (256 lines)
- docs/guides/environment-variables-update.md (128 lines)

Summary:
Created comprehensive step-by-step guides for Paul to purchase connect.kr domain
and configure DNS. Includes registrar comparison, copy-paste commands, and
verification steps. Paul can now execute these manually while I proceed to
Phase 2 (load testing).

Next: Starting Phase 2 (Load Testing)
```

## ADDITIONAL CONTEXT

**Why Beta Test Plan?**
- Previous session decided NOT to skip beta testing
- Beta plan supersedes original plan (incorporates all tasks)
- Same launch date (Jan 1, 2026), safer path
- See PLAN-RELATIONSHIP-EXPLAINED.md for full context

**Solo Developer Context**:
- Paul works with Claude Code + Claude Desktop
- Pivoted from Innowave (aquaculture monitoring)
- MacBook Pro M4 Max for dev, Linux PC for production
- Prefers sharp criticism, direct feedback, celebration of progress

**Paul's Preferences** (from handoff):
- Welcomes criticism, opposition, vulnerability identification
- Use MCP filesystem tools when relevant
- Be direct and honest about risks
- Celebrate progress (solo founder needs motivation)
- Korean for user-facing content, English for technical

## READY TO START?

Read the key documents listed above, then begin with Phase 1 (Domain/DNS guides).

Work through all phases systematically. Document everything. Stop if you encounter critical issues and report them clearly.

Let's execute Beta Week 1 Day 1! 🚀
```

---

## NOTES FOR PAUL

**After Claude Code Completes**:

1. **Review Domain/DNS Guides**
   - Check: `docs/guides/domain-purchase-guide.md`
   - Execute: Purchase connect.kr
   - Execute: Configure DNS records
   - Verify: Run nslookup/dig commands from guide

2. **Review Load Testing Results**
   - Check: `docs/plans/progress/load-test-results-day1.md`
   - Review: Performance metrics, any issues found
   - Verify: All success criteria met

3. **Review Status Updates**
   - Check: `IMPLEMENTATION-STATUS.md` updated
   - Check: Progress report created
   - Check: Day 1 marked complete in BETA-QUICK-REFERENCE.md

4. **Next Steps**
   - Day 1 complete → Move to Day 2-3 (HTTPS + Security)
   - Reference: BETA-TEST-EXECUTION-PLAN.md → Days 2-3

**Estimated Total Time** (Paul + Claude Code): 4-5 hours
- Claude Code automation: 3.5-4.5 hours
- Paul manual execution: 30-60 minutes (domain + DNS)

---

**Last Updated**: October 10, 2025  
**Version**: 1.0  
**For Use With**: Claude Code (command-line tool)
