# Session 6 Handoff Prompt - Beta Week 1 Day 2 (October 11, 2025)

**Copy this entire block to your new Claude Code session after running `/compact`**

---

I'm Paul Kim, founder of Connect - Korea's R&D Commercialization Operating System. Continuing Beta Week 1 Day 2 execution after /compact command.

## What Was Completed in Session 5 (October 11, 2025)

### ✅ SSH Server Management Scripts Suite - COMPLETE (45 minutes)

**Goal**: Create operational scripts for managing the production Linux server

**Accomplishments**:

1. **Created 8 Comprehensive Scripts** (Total: ~39 KB)
   ```
   scripts/server/
   ├── config.sh (2.7 KB)              ✅ Centralized configuration
   ├── setup-ssh.sh (7.6 KB)           ✅ SSH configuration wizard
   ├── restart-nextjs.sh (5.7 KB)     ✅ Restart Next.js with PM2
   ├── status.sh (6.5 KB)              ✅ Check all service statuses
   ├── connect.sh (727 B)              ✅ Open SSH session
   ├── exec.sh (1.1 KB)                ✅ Execute remote commands
   ├── logs.sh (3.4 KB)                ✅ View service logs
   └── README.md (11 KB)               ✅ Complete documentation
   ```

2. **All Scripts Made Executable**: `chmod +x scripts/server/*.sh`

3. **User Updated Configuration**: `config.sh` modified with credentials
   - SSH_HOST: `221.164.102.253`
   - SSH_USER: `user`
   - SSH_PW: `iw237877^^` (for reference, scripts use key auth)
   - REMOTE_PROJECT_PATH: `/opt/connect`

**Status**: Scripts created and ready to use! ✨

---

## 🔍 Current Situation

**HTTPS Setup Status** (from Session 4):
- ✅ Nginx installed and configured
- ✅ SSL certificate obtained (expires Jan 8, 2026)
- ✅ HTTP → HTTPS redirect configured
- ✅ Auto-renewal enabled (certbot.timer)
- ⚠️ **Next.js is not running on server** (needs restart)

**Scripts Status** (Session 5):
- ✅ All 8 server management scripts created
- ✅ Scripts are executable
- ✅ Configuration file updated with server credentials
- 🔲 **SSH connection not yet tested** (next step)

**Progress**: 62% → Will be 64% after HTTPS verification

---

## What Needs to Be Done in Session 6 (Day 2: October 11, 2025)

### Immediate Tasks (15-20 minutes):

### **Task 1: Test SSH Scripts** (5 minutes)

**Option A: Run Setup Wizard** (Interactive, guided):
```bash
./scripts/server/setup-ssh.sh
```

**What it does**:
1. Checks for SSH keys
2. Creates/updates ~/.ssh/config
3. Tests connection to user@221.164.102.253
4. Verifies sudo access
5. Checks server environment

**Option B: Quick Test** (Direct):
```bash
# Test SSH connection directly
ssh user@221.164.102.253

# Or test using the connect script
./scripts/server/connect.sh
```

**Success Criteria**:
- ✅ SSH connection establishes successfully
- ✅ Can access /opt/connect directory
- ✅ Scripts can execute commands remotely

---

### **Task 2: Restart Next.js on Server** (5 minutes)

**After SSH works, restart Next.js**:
```bash
./scripts/server/restart-nextjs.sh
```

**Choose PM2 (Option 1)** - Recommended for production

**What happens**:
1. Checks if PM2 is installed
2. Offers to install PM2 if needed (sudo npm install -g pm2)
3. Starts Next.js with PM2: `pm2 start npm --name "connect" -- start`
4. Saves PM2 process list: `pm2 save`
5. Configures PM2 startup: `pm2 startup`
6. Verifies service running: `lsof -i :3000`
7. Tests health: `curl http://localhost:3000/api/health`

**Success Criteria**:
- ✅ Next.js running on port 3000
- ✅ PM2 shows "connect | online"
- ✅ Health check returns {"status":"ok"}

**Alternative: If PM2 install fails**:
```bash
# On Linux server (SSH: user@221.164.102.253)
cd /opt/connect
nohup npm run dev > /tmp/nextjs.log 2>&1 &

# Verify
lsof -i :3000
```

---

### **Task 3: Verify HTTPS Working** (5 minutes)

**From MacBook browser**:
1. Open: https://connectplt.kr
   - Should show: 🔒 green padlock
   - Click padlock → Certificate → "Let's Encrypt"

2. Open: http://connectplt.kr (http, not https)
   - Should: Auto-redirect to https://connectplt.kr

3. Open: https://www.connectplt.kr
   - Should: Load successfully

**From MacBook terminal**:
```bash
# Test HTTPS response
curl -I https://connectplt.kr
# Should return: HTTP/2 200

# Test HTTP redirect
curl -I http://connectplt.kr
# Should return: HTTP/1.1 301 Moved Permanently
# Location: https://connectplt.kr/

# Test API health
curl https://connectplt.kr/api/health
# Should return: {"status":"ok"}
```

**Or use the status script**:
```bash
./scripts/server/status.sh
```

**Success Criteria**:
- ✅ Green padlock in browser
- ✅ HTTP redirects to HTTPS
- ✅ API endpoints return 200
- ✅ No SSL/TLS errors

---

### **Task 4: Create HTTPS Completion Report** (10 minutes)

**Once HTTPS is verified, create**:
- `docs/plans/progress/beta-week1-day2-https-completion.md`
- Update Master Progress Tracker: 62% → 64%

**Report should include**:
1. **Session 4 Summary**: HTTPS setup executed
   - Nginx configuration
   - SSL certificate details (domains, expiry: Jan 8, 2026)
   - HTTP → HTTPS redirect
   - Auto-renewal configured

2. **Session 5 Summary**: SSH scripts created
   - 8 scripts created (39 KB)
   - Operational workflow enabled

3. **Verification Results**:
   - Next.js restart method used (PM2 or npm)
   - HTTPS tests (browser, curl)
   - Any issues encountered and resolutions

4. **Progress Update**:
   - Beta Week 1 Day 2 Priority 2 (HTTPS): COMPLETE
   - Overall: 62% → 64%

---

## Options for Next Priority (After HTTPS Verification)

### **Option 1: Security Hardening** (Priority 3 - 1 hour)
**Goal**: Production security best practices

**Steps**:
1. Create security middleware: `middleware.ts`
   - Content Security Policy (CSP)
   - HSTS (Strict-Transport-Security)
   - Additional security headers

2. Run npm security audit:
   ```bash
   npm audit
   npm audit fix
   npm audit fix --force  # If critical vulns
   ```

3. Test security headers:
   ```bash
   curl -I https://connectplt.kr
   # Should see: X-Frame-Options, CSP, HSTS
   ```

**Success Criteria**:
- ✅ Security middleware implemented
- ✅ Zero critical npm vulnerabilities
- ✅ All security headers present

---

### **Option 2: Add Load Test Mode** (30 minutes - Quick Win)
**Goal**: Unblock Week 3-4 Day 25 performance optimization

**Context**:
- Session 3 created JWT token generator (✅ complete)
- Load tests send Bearer tokens, but APIs expect NextAuth cookies
- Need `LOAD_TEST_MODE=true` to bypass NextAuth for testing

**Steps**:
1. Add environment variable:
   ```bash
   echo 'LOAD_TEST_MODE=true' >> .env
   ```

2. Create middleware: `lib/auth/load-test-middleware.ts`
   - Validates JWT Bearer tokens when LOAD_TEST_MODE=true
   - Returns userId if valid

3. Update 2 API routes:
   - `app/api/matches/[id]/explanation/route.ts`
   - `app/api/chat/route.ts`
   - Check load test mode first, then fall back to NextAuth

4. Re-run load tests:
   ```bash
   npx tsx scripts/load-test-ai-features.ts
   ```

5. Document P95 response times

**Success Criteria**:
- ✅ All 385 requests succeed with authentication
- ✅ P95 response times documented (<5s target)
- ✅ Week 3-4 Day 25 unblocked

---

### **Option 3: Continue Beta Week 1 Day 3** (3-4 hours)
**Goal**: Email notifications and user onboarding

**Tasks**:
- Set up email service (SendGrid or AWS SES)
- Create welcome email template
- Implement email verification flow
- Create onboarding checklist

**Duration**: 3-4 hours

---

## Key Context from Previous Sessions

### Session 3 Accomplishments (Priority 1 - Authentication)
- ✅ JWT token generator created (`lib/auth/test-token-generator.ts`)
- ✅ Load test script updated with auth headers (385 requests)
- ⚠️ Discovery: NextAuth cookies vs Bearer tokens mismatch

### Session 4 Accomplishments (Priority 2 - HTTPS)
- ✅ Automated setup script created and executed
- ✅ SSL certificate obtained (expires Jan 8, 2026)
- ✅ HTTP → HTTPS redirect configured
- ✅ Auto-renewal configured
- ⚠️ Next.js not running (needs restart)

### Session 5 Accomplishments (SSH Scripts)
- ✅ 8 server management scripts created
- ✅ Configuration updated with credentials
- ✅ Ready to test and use

### Technical Architecture (Complete Stack)

```
Internet (Browser)
    ↓
Cloudflare DNS (connectplt.kr → 221.164.102.253)
    ↓
Linux Server (221.164.102.253)
    ├─ Nginx (ports 80/443) ✅
    │   ├─ SSL/TLS Termination ✅
    │   ├─ HTTP → HTTPS Redirect ✅
    │   ├─ Security Headers ✅
    │   └─ Reverse Proxy → localhost:3000
    │
    └─ Next.js (port 3000) ⚠️ NEEDS RESTART
        ├─ API Routes
        ├─ SSR Pages
        └─ Static Assets

SSL Certificate:
- Location: /etc/letsencrypt/live/connectplt.kr/
- Files: fullchain.pem, privkey.pem, cert.pem
- Expiry: January 8, 2026 (90 days)
- Auto-renewal: systemd timer (certbot.timer)

SSH Scripts:
- Location: scripts/server/
- 8 scripts: setup, restart, status, connect, exec, logs + config + README
```

---

## Critical Files Reference

**Session 5 Created**:
- `scripts/server/config.sh` (2.7 KB) - Centralized config
- `scripts/server/setup-ssh.sh` (7.6 KB) - SSH setup wizard
- `scripts/server/restart-nextjs.sh` (5.7 KB) - Restart Next.js with PM2
- `scripts/server/status.sh` (6.5 KB) - Service status checker
- `scripts/server/connect.sh` (727 B) - SSH connection
- `scripts/server/exec.sh` (1.1 KB) - Remote command execution
- `scripts/server/logs.sh` (3.4 KB) - Log viewer
- `scripts/server/README.md` (11 KB) - Complete documentation

**Session 4 Created**:
- `scripts/setup-https.sh` (5.8 KB) - Automated HTTPS setup
- `docs/guides/HTTPS-SETUP-GUIDE.md` (13 KB) - HTTPS guide

**Session 3 Created**:
- `lib/auth/test-token-generator.ts` (94 lines) - JWT generator
- `docs/plans/progress/beta-week1-day2-completion.md` - Priority 1 report

**Session 6 Will Create**:
- `docs/plans/progress/beta-week1-day2-https-completion.md` - Priority 2 report
- (Optional) `middleware.ts` - Security headers (if doing Priority 3)
- (Optional) `lib/auth/load-test-middleware.ts` - Load test auth (if doing Option 2)

**Planning Docs**:
- Master Tracker: `docs/plans/progress/MASTER-PROGRESS-TRACKER.md` (62% → 64%)
- Beta Execution Plan: `docs/plans/BETA-TEST-EXECUTION-PLAN.md`
- Session 5 Handoff: `HANDOFF-SESSION-5.md`

---

## Current Progress

**Overall**: 62% → 64% (after HTTPS verification)
**Beta Week 1**: 43% → 57% (Day 1 done, Day 2 Priorities 1-2 done, verification pending)
**Days to Launch**: 82 days (January 1, 2026)
**Buffer**: 6 days ahead of schedule ✅

**Completed Phases**:
- ✅ Week 1: Hot Standby Infrastructure (100%)
- ✅ Week 2: Patroni + HAProxy Failover (100%)
- ✅ Week 3-4 Days 15-23: AI Integration (100%)
- ✅ Week 3-4 Day 24: Load Testing Framework (100%)
- ✅ Beta Week 1 Day 1: Domain + DNS (100%)
- ✅ Beta Week 1 Day 2 Priority 1: Authentication (85%)
- ✅ Beta Week 1 Day 2 Priority 2: HTTPS Setup (100%)
- ✅ Beta Week 1 Day 2: SSH Scripts (100%)

**Current Phase**:
- 🟡 Beta Week 1 Day 2: Verification + Completion (0% → starting now)

**Next Options**:
1. Security Hardening (Priority 3, 1 hour)
2. Load Test Mode (Quick Win, 30 min)
3. Beta Week 1 Day 3 (Email + Onboarding, 3-4 hours)

---

## Quick Commands for Session 6

**Test SSH Connection**:
```bash
# Option A: Run setup wizard
./scripts/server/setup-ssh.sh

# Option B: Direct connection test
./scripts/server/connect.sh

# Option C: Test remote command
./scripts/server/exec.sh "echo 'SSH works!'"
```

**Restart Next.js**:
```bash
# Interactive (recommended)
./scripts/server/restart-nextjs.sh

# Or directly on server (SSH: user@221.164.102.253)
cd /opt/connect
sudo npm install -g pm2
pm2 start npm --name "connect" -- start
pm2 save
pm2 startup
```

**Check Status**:
```bash
# All services
./scripts/server/status.sh

# Specific checks
./scripts/server/exec.sh "lsof -i :3000"
./scripts/server/exec.sh "pm2 status"
./scripts/server/logs.sh nextjs 50
```

**Verify HTTPS**:
```bash
# From MacBook
curl -I https://connectplt.kr
curl -I http://connectplt.kr  # Should redirect
curl https://connectplt.kr/api/health

# From server
./scripts/server/exec.sh "curl -I https://connectplt.kr"
```

---

## SSH Script Quick Reference

### Common Operations

**Connect to server**:
```bash
./scripts/server/connect.sh
```

**Restart Next.js**:
```bash
./scripts/server/restart-nextjs.sh
```

**Check all services**:
```bash
./scripts/server/status.sh
```

**View logs**:
```bash
./scripts/server/logs.sh nextjs        # Next.js logs
./scripts/server/logs.sh nginx         # Nginx errors
./scripts/server/logs.sh nginx-access  # Nginx access logs
```

**Execute remote command**:
```bash
./scripts/server/exec.sh "<command>"

# Examples:
./scripts/server/exec.sh "lsof -i :3000"
./scripts/server/exec.sh "pm2 status"
./scripts/server/exec.sh "systemctl status nginx"
./scripts/server/exec.sh "df -h"
```

---

## What to Tell Me

When you start Session 6, tell me:

**"SSH scripts created. Testing connection now."**

**After SSH test**:
- **Did SSH connection work?** (YES/NO)
- **If NO**: What error did you see?
- **If YES**: Proceed to restart Next.js

**After Next.js restart**:
- **Did Next.js start successfully?** (YES/NO)
- **Which method used?** (PM2 or npm)
- **Any errors?**

**After HTTPS verification**:
- **Green padlock visible?** (YES/NO)
- **HTTP redirect working?** (YES/NO)
- **API health check passed?** (YES/NO)

**Then choose next priority**:
1. Security Hardening (1 hour, complete Day 2)
2. Load Test Mode (30 min, quick win, unblock Day 25)
3. Beta Week 1 Day 3 (Email + Onboarding, 3-4 hours)

---

## Recommended Workflow for Session 6

**My recommendation**:

1. **First**: Test SSH scripts (5 min)
   ```bash
   ./scripts/server/setup-ssh.sh
   # Or: ./scripts/server/connect.sh
   ```

2. **Second**: Restart Next.js with PM2 (5 min)
   ```bash
   ./scripts/server/restart-nextjs.sh
   # Choose option 1 (PM2)
   ```

3. **Third**: Verify HTTPS in browser (5 min)
   - https://connectplt.kr (green padlock?)
   - http://connectplt.kr (redirects?)
   - curl tests

4. **Fourth**: Check status (2 min)
   ```bash
   ./scripts/server/status.sh
   ```

5. **Fifth**: Create completion report (10 min)
   - Document HTTPS + SSH scripts completion
   - Update Master Progress Tracker

6. **Sixth**: Choose next priority
   - Quick win: Load Test Mode (30 min)
   - Complete Day 2: Security Hardening (1 hour)
   - Move to Day 3: Email + Onboarding (3-4 hours)

**Total time remaining for Day 2**: ~30-90 minutes (depending on priority chosen)

---

## Server Credentials Reference

**Server Connection**:
- Host: `221.164.102.253`
- User: `user`
- Password: `iw237877^^` (stored in config.sh)
- Project Path: `/opt/connect`

**SSH Methods**:
1. **Direct**: `ssh user@221.164.102.253`
2. **Script**: `./scripts/server/connect.sh`
3. **With password**: `sshpass -p 'iw237877^^' ssh user@221.164.102.253`

**Note**: Scripts prefer SSH key authentication for security, but password is available in config.sh if needed.

---

## Troubleshooting Quick Reference

**If SSH fails**:
```bash
# Test direct connection
ssh user@221.164.102.253

# Check if server is reachable
ping 221.164.102.253

# Use password if needed
sshpass -p 'iw237877^^' ssh user@221.164.102.253
```

**If Next.js won't start**:
```bash
# Check if port is already in use
./scripts/server/exec.sh "lsof -i :3000"

# Check if project exists
./scripts/server/exec.sh "ls -la /opt/connect"

# Check Node.js version
./scripts/server/exec.sh "node --version"

# View recent logs
./scripts/server/logs.sh nextjs 100
```

**If HTTPS fails**:
```bash
# Check Nginx status
./scripts/server/exec.sh "sudo systemctl status nginx"

# Check Nginx config
./scripts/server/exec.sh "sudo nginx -t"

# Check SSL certificate
./scripts/server/exec.sh "sudo certbot certificates"

# View Nginx errors
./scripts/server/logs.sh nginx 50
```

---

**Session Context**:
- Date: October 11, 2025
- Phase: Beta Week 1 Day 2 (verification + completion)
- Overall Progress: 62% → 64% (after verification)
- Days to Launch: 82 days
- Status: SSH scripts ready! Test connection, restart Next.js, verify HTTPS, document completion. 🚀

**Let's finish Day 2 strong!** 💪
