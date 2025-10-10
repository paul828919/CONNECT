# Claude Code Prompt Guide - Which Version to Use?

**Created**: October 10, 2025  
**Purpose**: Help you choose the right prompt for Claude Code

---

## 📋 Two Versions Available

### Version 1: COMPREHENSIVE (Recommended)
**File**: `docs/guides/CLAUDE-CODE-PROMPT.md`
**Length**: ~500 lines
**Detail Level**: ⭐⭐⭐⭐⭐ (Maximum)

### Version 2: QUICK START
**File**: `docs/guides/CLAUDE-CODE-PROMPT-QUICK.md`
**Length**: ~60 lines
**Detail Level**: ⭐⭐⭐ (Essential only)

---

## 🤔 Which Should You Use?

### Use COMPREHENSIVE Prompt When:

✅ **First time using Claude Code for this project**
   - Provides full context about Connect Platform
   - Explains the beta test strategy
   - Details all constraints and warnings

✅ **Complex tasks** (like today - load testing)
   - Detailed technical specifications
   - Step-by-step execution plan
   - Success criteria clearly defined

✅ **Want maximum safety**
   - Explicit DO/DON'T lists
   - All constraints documented
   - Fallback strategies included

✅ **Need detailed documentation**
   - Examples of expected outputs
   - Format specifications
   - Troubleshooting guidance

✅ **Want to review before execution**
   - Can read the full plan
   - Understand what Claude Code will do
   - Verify approach before starting

### Use QUICK START Prompt When:

✅ **Already familiar with the project**
   - Claude Code has context from previous sessions
   - You understand the beta test plan
   - Just need task reminders

✅ **Simple, repetitive tasks**
   - Similar to tasks already completed
   - Well-understood procedures
   - Low risk of errors

✅ **Time-sensitive execution**
   - Need to start immediately
   - Don't need comprehensive explanation
   - Trust the process

✅ **Iterating on previous work**
   - Building on completed tasks
   - Refining existing code
   - Minor updates or fixes

---

## 📊 Comparison Table

| Feature | Comprehensive | Quick Start |
|---------|--------------|-------------|
| **Context Provided** | Full project history | Essential only |
| **Task Detail** | Step-by-step breakdown | Task list |
| **Success Criteria** | Detailed metrics | High-level goals |
| **Safety Checks** | Explicit constraints | Brief warnings |
| **Documentation Examples** | Yes, with formats | No |
| **Troubleshooting** | Extensive | Minimal |
| **Estimated Read Time** | 10-15 minutes | 2-3 minutes |
| **Best For** | First use, complex tasks | Repeat use, simple tasks |
| **Risk Level** | Lower (more guidance) | Higher (assumes knowledge) |

---

## 🎯 Recommendation for TODAY (Oct 10, 2025)

### Use: **COMPREHENSIVE PROMPT** ✅

**Why?**

1. **First Day of Beta Test Plan**
   - New timeline starting today
   - Important to set the right foundation
   - Claude Code needs full context

2. **Complex Load Testing Task**
   - Day 24-25 involves performance testing
   - Multiple scenarios to execute
   - Optimization may be needed
   - Requires detailed specifications

3. **Documentation Critical**
   - Starting new tracking system
   - Need consistent format
   - Examples help ensure quality

4. **Safety First**
   - Load testing involves AI API costs
   - Performance changes affect production readiness
   - Better to be explicit about constraints

---

## 📝 How to Use the Prompts

### Option 1: Copy from File (Recommended)

```bash
# Open the comprehensive prompt
cat docs/guides/CLAUDE-CODE-PROMPT.md

# Copy the text between the ``` marks
# (Everything after "COPY THIS INTO CLAUDE CODE:")
# Paste into Claude Code chat window
```

### Option 2: Direct File Reference

```bash
# If Claude Code supports file reading
# (Check Claude Code documentation)

claude code "Execute tasks from: docs/guides/CLAUDE-CODE-PROMPT.md"
```

### Option 3: Command Line Execution

```bash
# Start Claude Code in your project
cd /Users/paulkim/Downloads/connect
claude code

# Then paste the prompt into the chat interface
```

---

## ✅ After Execution Checklist

**Review Claude Code's Output**:

1. **Check Files Created**:
   ```bash
   ls -la docs/guides/domain-*.md
   ls -la docs/guides/dns-*.md
   ls -la scripts/load-test-*.ts
   ```

2. **Review Load Test Results**:
   ```bash
   cat docs/plans/progress/load-test-results-day1.md
   ```

3. **Verify Status Updated**:
   ```bash
   git diff IMPLEMENTATION-STATUS.md
   git diff docs/plans/BETA-QUICK-REFERENCE.md
   ```

4. **Check for Errors**:
   - Review any error logs
   - Check if all tests passed
   - Verify success criteria met

**Execute Manual Steps** (Domain/DNS):
1. Follow: `docs/guides/domain-purchase-guide.md`
2. Purchase connect.kr domain
3. Follow: `docs/guides/dns-configuration-guide.md`
4. Configure DNS records
5. Follow: `docs/guides/environment-variables-update.md`
6. Update .env files

---

## 🔄 For Future Days

### Day 2-3 (Oct 11-12): HTTPS + Security
**Recommendation**: QUICK START
- Similar to Day 1 structure
- Less complex than load testing
- You'll understand the pattern by then

### Day 4-7 (Oct 13-16): Bug Fixes
**Recommendation**: QUICK START
- Straightforward debugging
- Can iterate quickly
- Minimal new context needed

### Week 2 Self-Dogfooding (Oct 17-23)
**Recommendation**: COMPREHENSIVE for Day 1, then QUICK START
- First day sets up the testing framework
- Subsequent days follow the pattern

---

## 💡 Pro Tips

1. **Keep Both Versions Handy**
   - Bookmark both files
   - Use comprehensive when uncertain
   - Use quick start for speed

2. **Customize for Your Needs**
   - Edit the prompts if needed
   - Add project-specific details
   - Remove sections not relevant

3. **Document What Works**
   - If a prompt works well, note it
   - If you modify it, save the modified version
   - Build a library of effective prompts

4. **Iterate and Improve**
   - After each Claude Code session, reflect
   - What could be clearer?
   - What was unnecessary?
   - Update prompts accordingly

---

## 🚨 Warning Signs to Switch Prompts

**Switch from Quick Start → Comprehensive if**:
- Claude Code seems confused about context
- Tasks are not executing as expected
- You're unsure if approach is correct
- Critical errors occurring

**Switch from Comprehensive → Quick Start if**:
- Claude Code already has full context
- Tasks are repetitive
- You're time-constrained
- Execution is straightforward

---

## 📞 Need Help?

**If Claude Code gets stuck**:
1. Check the comprehensive prompt's "IF YOU GET STUCK" section
2. Review the constraints - did something violate them?
3. Check logs for error messages
4. Try re-running with more specific instructions

**If prompt seems unclear**:
1. Edit the prompt to add clarity
2. Break tasks into smaller steps
3. Add more examples
4. Specify success criteria more explicitly

---

## 🎯 Today's Decision

**For Oct 10, 2025 (Beta Week 1 Day 1)**:

**USE: COMPREHENSIVE PROMPT** ✅

**Next Step**:
```bash
# 1. Open the comprehensive prompt
cat docs/guides/CLAUDE-CODE-PROMPT.md

# 2. Copy everything between the ``` marks
#    (Look for "COPY THIS INTO CLAUDE CODE:")

# 3. Open Claude Code in your terminal
cd /Users/paulkim/Downloads/connect
claude code

# 4. Paste the prompt into Claude Code chat

# 5. Let Claude Code work while you:
#    - Review the execution
#    - Prepare to execute domain/DNS steps manually
#    - Monitor progress
```

---

**Good luck with Beta Week 1 Day 1!** 🚀

---

*Last Updated: October 10, 2025*  
*Created by: Claude (Strategic Advisor)*
