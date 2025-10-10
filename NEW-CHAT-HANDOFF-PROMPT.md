# Handoff Prompt for New Chat Session

**Purpose**: This prompt provides all necessary context to continue Connect development after running `/compact` command.

---

## 📋 Copy This Entire Section to New Chat

```
I'm Paul Kim, founder of Connect - Korea's R&D Commercialization Operating System. I'm continuing development from a previous Claude Code session and need you to pick up where we left off.

## Current Project Status (October 10, 2025)

**Overall Progress**: 58% complete (Days 15-23 complete out of 83-day plan)
**Current Position**: Beta Week 1 Day 1 (TODAY - October 10, 2025)
**Days to Launch**: 83 days (January 1, 2026 00:00 KST)

## What Was Just Completed in Previous Session

1. ✅ **Master Progress Tracker Created**
   - Location: `docs/plans/progress/MASTER-PROGRESS-TRACKER.md`
   - ~1,000 lines consolidating all progress from Oct 9 → Jan 1, 2026
   - 7 comprehensive sections: Dashboard, Completed Work, Current Focus, Upcoming, Roadmap, Navigation, Metrics

2. ✅ **Documentation Updates**
   - Updated `IMPLEMENTATION-STATUS.md` with Master Tracker reference
   - Updated `CLAUDE.md` with Master Tracker reference
   - Updated `PRD_v8.0.md` with Master Tracker reference

3. ✅ **Historical Progress Documented**
   - Week 1: Hot Standby Infrastructure (PostgreSQL replication, Patroni, HAProxy)
   - Week 2: Patroni cluster + HAProxy load balancing
   - Week 3-4 Days 15-23: AI Integration (Claude Sonnet 4.5, Korean match explanations, Q&A chat)

## Today's Tasks (Beta Week 1 Day 1 - October 10, 2025)

### Morning (9:00 AM - 10:15 AM) - 1.25 hours
**Domain Purchase + DNS Configuration**

1. **Purchase Domain** (45 min)
   - Register `connect.kr` or `connectrd.kr` at Whois.co.kr
   - Budget: ₩15,000/year
   - Note: Domain verification may take 1-2 hours

2. **Configure DNS** (30 min)
   - Point A record to production server IP
   - Add CNAME for `www` subdomain
   - Verify propagation with `dig connect.kr`

### Afternoon (2:00 PM - 5:00 PM) - 3 hours
**Load Testing with k6**

1. **Setup k6** (30 min)
   ```bash
   brew install k6  # macOS
   # or: sudo apt-get install k6  # Linux
   ```

2. **Run Load Tests** (2 hours)
   - Match Generation Test: 50 VUs, 5 min duration
   - Dashboard Test: 30 VUs, 3 min duration
   - Login Flow Test: 20 VUs, 2 min duration

3. **Analyze Results** (30 min)
   - Target: <500ms P95 response time
   - Document bottlenecks in `docs/plans/progress/beta-week1-day1-completion.md`

### Evening (7:00 PM - 8:00 PM) - 1 hour
**Documentation + Planning**

1. Create completion report: `docs/plans/progress/beta-week1-day1-completion.md`
2. Update Master Progress Tracker with today's results
3. Review tomorrow's tasks (HTTPS setup)

## Critical Files to Reference

**Primary Navigation**:
- **Master Progress Tracker**: `docs/plans/progress/MASTER-PROGRESS-TRACKER.md` (START HERE!)
- **Beta Test Execution Plan**: `docs/plans/BETA-TEST-EXECUTION-PLAN.md` (Day-by-day tasks)
- **Quick Reference Checklist**: `docs/plans/BETA-QUICK-REFERENCE.md` (1-page overview)

**Supporting Documents**:
- **Current Status**: `IMPLEMENTATION-STATUS.md` (58% complete)
- **Project Overview**: `CLAUDE.md` (for you to understand the project)
- **Product Requirements**: `docs/current/PRD_v8.0.md` (complete product vision)

## Key Context You Need to Know

**Project**: Connect is Korea's R&D commercialization operating system, helping companies discover and win government funding.

**Architecture**:
- Stack: Next.js 14 + TypeScript + PostgreSQL 15 + Redis + Docker
- Deployment: Single server (i9-12900K, 128GB RAM) with Docker Compose
- Development: MacBook M4 Max (ARM) → Linux server (x86)

**Current Infrastructure**:
- ✅ Hot Standby working (~2s failover)
- ✅ PostgreSQL replication operational
- ✅ Patroni + HAProxy configured
- ✅ AI integration complete (Claude Sonnet 4.5)
- ⏸️ Domain + HTTPS pending (TODAY)

**Business Model**:
- Hybrid: Software (₩49-99K/month) + Services (₩2-7M per engagement)
- Target: Profitable Month 1 via services revenue
- Launch: January 1, 2026 (Peak R&D funding season)

## What I Need You to Do

1. **Read the Master Progress Tracker first** - This gives you complete context
   ```bash
   # Open this file and understand where we are:
   open docs/plans/progress/MASTER-PROGRESS-TRACKER.md
   ```

2. **Review Beta Week 1 Day 1 tasks** - Understand today's specific goals
   ```bash
   # Then read today's detailed tasks:
   open docs/plans/BETA-TEST-EXECUTION-PLAN.md
   # Scroll to: Beta Week 1 → Day 1 (Oct 10)
   ```

3. **Help me execute today's tasks** - Domain, load testing, documentation
   - Guide me through domain purchase/DNS setup
   - Help me run k6 load tests and analyze results
   - Create today's completion report

4. **Use the todo list proactively** - Track all tasks
   - Break down complex tasks into steps
   - Mark completed immediately (don't batch)
   - Keep exactly ONE task as in_progress

## Commands I'll Use Today

```bash
# Domain verification
dig connect.kr

# k6 installation (macOS)
brew install k6

# Run load tests
k6 run scripts/load-test-match-generation.js
k6 run scripts/load-test-dashboard.js
k6 run scripts/load-test-login.js

# Create completion report
touch docs/plans/progress/beta-week1-day1-completion.md
```

## Success Criteria for Today

- ✅ Domain purchased and verified
- ✅ DNS configured and propagated
- ✅ Load tests completed (3 scenarios)
- ✅ Performance analysis documented
- ✅ Completion report created
- ✅ Master Progress Tracker updated

## Important Reminders

- **Beta testing starts TODAY** (Oct 10, 2025)
- **We're 58% complete** with 83 days to launch
- **We're 6 days ahead of schedule** (buffer time)
- **Peak season is Jan-March** (99.9% uptime required)
- **Hot standby is working** (~2s failover)

## If You Get Stuck

1. Check the Master Progress Tracker (`docs/plans/progress/MASTER-PROGRESS-TRACKER.md`)
2. Refer to Beta Test Execution Plan (`docs/plans/BETA-TEST-EXECUTION-PLAN.md`)
3. Look at Quick Reference (`docs/plans/BETA-QUICK-REFERENCE.md`)
4. Review CLAUDE.md for technical context
5. Ask me to clarify if anything is unclear

---

**Ready to start?** Let's execute Beta Week 1 Day 1! 🚀
```

---

## 📝 Usage Instructions

1. **Before running `/compact`**:
   - Save this file as reference
   - Ensure all files mentioned above exist

2. **After running `/compact`**:
   - Copy the entire "Copy This Entire Section to New Chat" block above
   - Paste into the new Claude Code session
   - Claude will have complete context to continue

3. **First command in new session**:
   ```bash
   # Claude should start by opening the Master Progress Tracker
   open docs/plans/progress/MASTER-PROGRESS-TRACKER.md
   ```

---

**Generated**: October 10, 2025
**For**: Paul Kim (Founder & CEO)
**Next Session Start**: After `/compact` command
**Current Position**: Beta Week 1 Day 1 (Oct 10, 2025)
