# Claude Code Prompts - Complete Package

**Created**: October 10, 2025  
**For**: Paul Kim, Connect Platform  
**Purpose**: Execute Beta Week 1 Day 1 with Claude Code

---

## 📦 What's in This Package

I've created **3 documents** to help you use Claude Code effectively:

### 1. ⭐ COMPREHENSIVE PROMPT (Recommended for Today)
**File**: `docs/guides/CLAUDE-CODE-PROMPT.md`

**What it does**: 
- Provides full context about Connect Platform and beta test plan
- Detailed step-by-step execution plan for today's tasks
- Comprehensive safety checks and constraints
- Examples of expected outputs
- Troubleshooting guidance

**When to use**: 
- ✅ First time using Claude Code for this project (TODAY!)
- ✅ Complex tasks like load testing
- ✅ When you want maximum safety and clarity

**Length**: ~500 lines (10-15 min read)

---

### 2. ⚡ QUICK START PROMPT
**File**: `docs/guides/CLAUDE-CODE-PROMPT-QUICK.md`

**What it does**: 
- Essential tasks only
- Minimal context
- Fast execution

**When to use**: 
- ✅ Days 2-7 (after you understand the pattern)
- ✅ Simple, repetitive tasks
- ✅ When time-constrained

**Length**: ~60 lines (2-3 min read)

---

### 3. 📖 USAGE GUIDE
**File**: `docs/guides/CLAUDE-CODE-PROMPT-GUIDE.md`

**What it does**: 
- Explains when to use each prompt
- Comparison table
- Tips for effective usage
- Troubleshooting advice

**When to use**: 
- Read this first to understand which prompt to use
- Reference when switching between prompts

---

## 🚀 Quick Start for TODAY (Oct 10, 2025)

### Step 1: Read the Usage Guide (2 minutes)

```bash
cat docs/guides/CLAUDE-CODE-PROMPT-GUIDE.md
```

Or just read the recommendation below 👇

---

### Step 2: Use the COMPREHENSIVE Prompt

**Why?** 
- First day of beta test plan
- Complex load testing task
- Need full context for safety
- Setting the foundation for next 11 weeks

**How to execute**:

```bash
# 1. Open the comprehensive prompt
cat docs/guides/CLAUDE-CODE-PROMPT.md

# 2. Find this section:
#    "## 📋 COPY THIS INTO CLAUDE CODE:"

# 3. Copy everything between the triple backticks (```)
#    Starting from "You are Claude Code..."
#    Ending at "Let's execute Beta Week 1 Day 1! 🚀"

# 4. Start Claude Code
cd /Users/paulkim/Downloads/connect
claude code

# 5. Paste the prompt into Claude Code chat window

# 6. Press Enter and let Claude Code work!
```

---

### Step 3: While Claude Code Works

**What Claude Code is doing** (3-4 hours total):

1. **Phase 1 (30 min)**: Creating domain/DNS guides for you
2. **Phase 2 (2-3 hrs)**: Executing load tests, optimizing performance
3. **Phase 3 (30 min)**: Validating results, fixing issues
4. **Phase 4 (30 min)**: Updating documentation

**What you should do**:

1. ☕ Take a break (first 30 min while guides are being created)
2. 👀 Monitor Claude Code's progress occasionally
3. 📝 Prepare to execute manual steps (domain/DNS purchase)
4. 🎉 Celebrate when each phase completes!

---

### Step 4: Execute Manual Steps (You do this)

**After Claude Code creates the guides**:

1. **Purchase Domain** (15 min)
   ```bash
   # Follow this guide:
   cat docs/guides/domain-purchase-guide.md
   
   # Purchase connect.kr from recommended registrar
   # Expected cost: ₩15-30K/year
   ```

2. **Configure DNS** (15 min)
   ```bash
   # Follow this guide:
   cat docs/guides/dns-configuration-guide.md
   
   # Add A records and CNAME
   # Wait 10-30 min for DNS propagation
   # Verify with nslookup
   ```

3. **Update Environment Variables** (5 min)
   ```bash
   # Follow this guide:
   cat docs/guides/environment-variables-update.md
   
   # Add NEXT_PUBLIC_APP_URL and DOMAIN to .env
   # Commit changes to git
   ```

---

### Step 5: Review Claude Code's Work

**Check what was completed**:

```bash
# 1. View load test results
cat docs/plans/progress/load-test-results-day1.md

# 2. Check updated status
git diff IMPLEMENTATION-STATUS.md

# 3. View progress report
cat docs/plans/progress/beta-week1-day1-complete.md

# 4. Verify Day 1 checked off
cat docs/plans/BETA-QUICK-REFERENCE.md | grep "Day 1"
```

**What to look for**:
- ✅ All load tests passed (P95 <5s uncached, <500ms cached)
- ✅ Cache hit rate >40%
- ✅ Circuit breaker working
- ✅ No P0 performance issues
- ✅ Documentation updated

---

## 📊 Today's Complete Workflow

```
┌─────────────────────────────────────────────────────────────┐
│  BETA WEEK 1 DAY 1 - October 10, 2025                      │
└─────────────────────────────────────────────────────────────┘

1. READ THIS FILE (5 min)
   ↓
2. COPY COMPREHENSIVE PROMPT (2 min)
   ↓
3. PASTE INTO CLAUDE CODE (1 min)
   ↓
4. CLAUDE CODE EXECUTES (3-4 hours) ─────┐
   • Creates domain/DNS guides            │
   • Executes load testing                │  You can work on
   • Optimizes performance                │  other things or
   • Updates documentation                │  monitor progress
   ↓                                       │
5. YOU EXECUTE MANUAL STEPS (30-60 min) ←┘
   • Purchase domain (connect.kr)
   • Configure DNS records
   • Update .env files
   ↓
6. REVIEW & VERIFY (15 min)
   • Check load test results
   • Verify all success criteria met
   • Review documentation updates
   ↓
7. ✅ DAY 1 COMPLETE!
   ↓
8. MOVE TO DAY 2-3 (Tomorrow: HTTPS + Security)
```

---

## 🎯 Success Criteria for Today

**Day 1 is complete when**:

✅ **Domain & DNS Guides Created**
   - [ ] domain-purchase-guide.md exists
   - [ ] dns-configuration-guide.md exists
   - [ ] environment-variables-update.md exists

✅ **Domain & DNS Configured** (You execute manually)
   - [ ] connect.kr domain purchased
   - [ ] DNS A records configured
   - [ ] DNS CNAME configured
   - [ ] Environment variables updated
   - [ ] DNS verified with nslookup

✅ **Load Testing Complete**
   - [ ] Match explanation tests passed
   - [ ] Q&A chat tests passed
   - [ ] Combined stress test passed
   - [ ] Performance targets met (<5s P95)
   - [ ] Cache hit rate >40%
   - [ ] Circuit breaker working
   - [ ] Fallback content working

✅ **Documentation Updated**
   - [ ] IMPLEMENTATION-STATUS.md updated (60-62%)
   - [ ] beta-week1-day1-complete.md created
   - [ ] BETA-QUICK-REFERENCE.md Day 1 checked
   - [ ] load-test-results-day1.md created

✅ **Ready for Day 2-3**
   - [ ] No P0 bugs remaining
   - [ ] All scripts committed to git
   - [ ] Understand what's next (HTTPS + Security)

---

## 📁 File Locations

**Prompts**:
- `docs/guides/CLAUDE-CODE-PROMPT.md` ← Use this today!
- `docs/guides/CLAUDE-CODE-PROMPT-QUICK.md` ← Use Days 2-7
- `docs/guides/CLAUDE-CODE-PROMPT-GUIDE.md` ← Usage instructions

**Reference Documents** (Claude Code will read these):
- `docs/plans/BETA-TEST-EXECUTION-PLAN.md` ← Daily task details
- `docs/plans/IMPLEMENTATION-PLAN-12WEEKS.md` ← Technical specs
- `docs/plans/BETA-QUICK-REFERENCE.md` ← Progress checklist
- `IMPLEMENTATION-STATUS.md` ← Current status

**Outputs** (Claude Code will create these):
- `docs/guides/domain-purchase-guide.md` ← For you to follow
- `docs/guides/dns-configuration-guide.md` ← For you to follow
- `docs/guides/environment-variables-update.md` ← For you to follow
- `docs/plans/progress/load-test-results-day1.md` ← Review results
- `docs/plans/progress/beta-week1-day1-complete.md` ← Progress report
- `scripts/load-test-*.ts` ← Load testing scripts

---

## 💡 Tips for Success

1. **Trust Claude Code**: The comprehensive prompt provides full context. Let it work autonomously.

2. **Monitor Progress**: Check in occasionally, but don't interrupt. Claude Code will report when each phase completes.

3. **Execute Manual Steps Promptly**: When Claude Code creates the domain/DNS guides, execute them while testing runs in parallel.

4. **Review Results Carefully**: After completion, review the load test results to understand your system's performance baseline.

5. **Ask Questions**: If anything is unclear, ask Claude Code for clarification in follow-up messages.

6. **Celebrate Progress**: This is Day 1 of an 11-week journey. Completing today is a meaningful milestone! 🎉

---

## 🆘 If Something Goes Wrong

**Claude Code seems stuck**:
- Check if it's waiting for confirmation
- Review the logs for error messages
- Try rephrasing or clarifying the task

**Tests are failing**:
- Check if PostgreSQL is running
- Check if Redis is running
- Verify .env file has correct values
- Review error logs in load test results

**Performance targets not met**:
- This is okay! Claude Code will document the baseline
- Optimization is iterative
- Focus on fixing P0 issues only today

**Can't purchase domain**:
- Try alternative registrars (cafe24, gabia)
- Consider .com or .co.kr alternatives
- Can proceed with load testing while resolving

---

## 📈 What Happens Next

**After Day 1 Complete**:

**Tomorrow (Day 2-3: Oct 11-12)**:
- HTTPS setup with Let's Encrypt
- Security hardening (Part 1)
- Use QUICK START prompt (you'll understand the pattern)

**Rest of Week 1 (Day 4-7: Oct 13-16)**:
- Complete Week 5 (security, bug fixes)
- Week 1 completion report
- Prepare for Week 2 (self-dogfooding)

**Week 2 (Oct 17-23)**:
- Use Connect yourself for 7 days
- Document all issues
- Fix critical bugs
- This is where you really validate the product!

---

## 🎯 Bottom Line

**For TODAY**:
1. Use the **COMPREHENSIVE PROMPT** (`CLAUDE-CODE-PROMPT.md`)
2. Let Claude Code work autonomously (3-4 hours)
3. Execute manual steps (domain/DNS) while tests run
4. Review results and verify success criteria
5. Celebrate Day 1 completion! 🎉

**Ready?** Copy the comprehensive prompt and paste into Claude Code!

---

**Questions?** Review the prompt guide or ask Claude Code for clarification!

**Let's execute Beta Week 1 Day 1!** 🚀

---

*Created: October 10, 2025*  
*Author: Claude (Strategic Advisor)*  
*For: Paul Kim, Connect Platform Founder*
