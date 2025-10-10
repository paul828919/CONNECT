# Session 5 Handoff Prompt - Beta Week 1 Day 2 (October 11, 2025)

**Copy this entire block to your new Claude Code session after running `/compact`**

---

I'm Paul Kim, founder of Connect - Korea's R&D Commercialization Operating System. Continuing Beta Week 1 Day 2 execution after /compact command.

## What Was Completed in Session 4 (October 11, 2025)

### ✅ Beta Week 1 Day 2 Priority 2 - HTTPS Setup COMPLETE (2 hours)

**Priority 2: HTTPS Setup** ✅

1. **Automated Setup Script Created**: `scripts/setup-https.sh` (5.8 KB, executable)
   - Checks prerequisites (Next.js running, port 3000)
   - Installs Nginx 1.18.0 + Certbot 1.21.0
   - Creates Nginx reverse proxy configuration
   - Obtains SSL certificate from Let's Encrypt
   - Configures HTTP → HTTPS redirect
   - Tests everything automatically

2. **Comprehensive Guide Created**: `docs/guides/HTTPS-SETUP-GUIDE.md` (13 KB)
   - Step-by-step manual instructions
   - Troubleshooting section
   - Architecture diagrams
   - Nginx and Certbot command reference

3. **HTTPS Setup Executed Successfully**:
   - ✅ Nginx installed and configured
   - ✅ SSL certificate obtained (valid until January 8, 2026)
   - ✅ HTTP → HTTPS redirect enabled
   - ✅ Auto-renewal configured (certbot.timer systemd service)
   - ✅ Security headers added (X-Frame-Options, X-XSS-Protection, etc.)
   - ✅ HTTPS tested: Status 200

4. **Certificate Details**:
   - Domain: connectplt.kr, www.connectplt.kr
   - Issuer: Let's Encrypt
   - Expiry: January 8, 2026 (90 days)
   - Location: /etc/letsencrypt/live/connectplt.kr/
   - Auto-renewal: Enabled (checks twice daily, renews if <30 days)

**Status**: Priority 2 COMPLETE (100%)

---

## ⚠️ Critical Discovery: Next.js Not Running on Server

**What We Found**:
- HTTPS setup completed successfully
- BUT: `lsof -i :3000` on Linux server returned nothing
- This means Next.js is not currently running

**Why This Matters**:
- HTTPS test passed during setup (Step 8 returned 200)
- But Next.js appears to have stopped afterward
- Need to restart Next.js to verify full HTTPS functionality

**The Solution** (5-10 minutes):
Need to restart Next.js on the Linux server using either:
- **Option A**: `npm run dev` (development, simpler)
- **Option B**: PM2 (production, keeps running after logout)

---

## What Needs to Be Done in Session 5 (Day 2: October 11, 2025)

### Immediate Tasks (5-15 minutes):

### **Task 1: Restart Next.js on Linux Server**

**User needs to choose method and execute on server**:

#### Option A: npm run dev (Development)
```bash
# On Linux server (SSH: paul@221.164.102.253)
cd /opt/connect  # or wherever Connect project is located
nohup npm run dev > /tmp/nextjs.log 2>&1 &

# Verify it's running
lsof -i :3000
# Should show: node listening on *:3000
```

#### Option B: PM2 (Production - Recommended)
```bash
# On Linux server
cd /opt/connect

# Install PM2 if not already installed
sudo npm install -g pm2

# Start Next.js with PM2
pm2 start npm --name "connect" -- start

# Save process list
pm2 save

# Enable PM2 on boot
pm2 startup
# Follow the command it outputs

# Verify status
pm2 status
# Should show: connect | online
```

**Success Criteria**:
- ✅ `lsof -i :3000` shows Node.js process
- ✅ `curl http://localhost:3000/api/health` returns {"status":"ok"}

---

### **Task 2: Verify HTTPS from Browser**

**After Next.js is running, test from MacBook browser**:

1. **Test 1: Green Padlock**
   - Open: https://connectplt.kr
   - Look for: 🔒 green padlock in address bar
   - Click padlock → Certificate → Should show "Let's Encrypt"

2. **Test 2: HTTP → HTTPS Redirect**
   - Open: http://connectplt.kr (notice: http, not https)
   - Should: Auto-redirect to https://connectplt.kr

3. **Test 3: WWW Subdomain**
   - Open: https://www.connectplt.kr
   - Should: Load successfully (may redirect to non-www)

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

**Success Criteria**:
- ✅ Green padlock appears in browser
- ✅ HTTP redirects to HTTPS
- ✅ API endpoints return 200
- ✅ No SSL/TLS errors

---

### **Task 3: Update Environment Variables (Optional - for OAuth)**

**If OAuth is configured**, update redirect URIs:

**On Linux server**:
```bash
# Update .env (or .env.production)
nano /opt/connect/.env

# Update these variables:
NEXTAUTH_URL=https://connectplt.kr
# (was: http://221.164.102.253:3000 or http://connectplt.kr)
```

**On OAuth provider dashboards**:
- **Kakao**: Update redirect URI to https://connectplt.kr/api/auth/callback/kakao
- **Naver**: Update redirect URI to https://connectplt.kr/api/auth/callback/naver

**Restart Next.js after .env changes**:
```bash
# If using npm
pkill node
npm run dev

# If using PM2
pm2 restart connect
```

---

### **Task 4: Create Completion Report**

**Once HTTPS is verified working**, create:
- `docs/plans/progress/beta-week1-day2-https-completion.md`
- Update Master Progress Tracker: 62% → 64%
- Update Beta Week 1 Day 2 checklist

**Report should include**:
- HTTPS setup steps executed
- Certificate details (domains, expiry, issuer)
- Nginx configuration summary
- Verification results (browser tests, curl tests)
- Next.js restart method used
- Any issues encountered and resolutions

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
   npm audit fix --force  # If needed
   ```

3. Test security headers:
   ```bash
   curl -I https://connectplt.kr
   # Should see: X-Frame-Options, X-Content-Type-Options, CSP, HSTS
   ```

**Success Criteria**:
- ✅ Security middleware implemented
- ✅ Zero critical npm vulnerabilities
- ✅ All security headers present

---

### **Option 2: Add Load Test Mode** (30 minutes - Quick Win)
**Goal**: Unblock Week 3-4 Day 25 performance optimization

**Context**:
- Priority 1 created JWT token generator (✅ complete)
- Load tests send Bearer tokens, but APIs expect NextAuth session cookies
- Need to add `LOAD_TEST_MODE=true` to bypass NextAuth for testing

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

### **Option 3: Continue Beta Week 1 Day 3**
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
- ✅ JWT token generator created (`lib/auth/test-token-generator.ts`, 94 lines)
- ✅ Load test script updated with auth headers (750 lines, 385 requests)
- ✅ Framework validated (concurrency, metrics, error tracking)
- ⚠️ Discovery: NextAuth session cookies vs Bearer tokens mismatch

### Session 4 Accomplishments (Priority 2 - HTTPS)
- ✅ Automated setup script created and executed
- ✅ SSL certificate obtained (expires Jan 8, 2026)
- ✅ HTTP → HTTPS redirect configured
- ✅ Auto-renewal configured
- ⚠️ Next.js not running on server (needs restart)

### Technical Architecture (HTTPS Layer)

```
Internet (Browser)
    ↓
Cloudflare DNS (connectplt.kr → 221.164.102.253)
    ↓
Linux Server (221.164.102.253)
    ├─ Nginx (ports 80/443)
    │   ├─ SSL/TLS Termination
    │   ├─ HTTP → HTTPS Redirect
    │   ├─ Security Headers
    │   └─ Reverse Proxy → localhost:3000
    │
    └─ Next.js (port 3000)
        ├─ API Routes
        ├─ SSR Pages
        └─ Static Assets

SSL Certificate:
- Location: /etc/letsencrypt/live/connectplt.kr/
- Files: fullchain.pem, privkey.pem, cert.pem
- Auto-renewal: systemd timer (certbot.timer)
```

### Service Status (Verify Before Starting)

**On MacBook** (Development):
```bash
# Check local dev server
lsof -i :3000  # Next.js dev server (should be running)
lsof -i :5432  # PostgreSQL
lsof -i :6379  # Redis cache
lsof -i :6380  # Redis queue
```

**On Linux Server** (Production):
```bash
# Check production services
lsof -i :3000           # Next.js (NEEDS RESTART)
sudo systemctl status nginx      # Nginx (should be running)
sudo systemctl status certbot.timer  # Auto-renewal (should be active)
```

---

## Critical Files Reference

**Session 4 Created**:
- `scripts/setup-https.sh` (5.8 KB) - Automated HTTPS setup
- `docs/guides/HTTPS-SETUP-GUIDE.md` (13 KB) - Comprehensive guide

**Session 3 Created** (still relevant):
- `lib/auth/test-token-generator.ts` (94 lines) - JWT token generation
- `docs/plans/progress/beta-week1-day2-completion.md` - Priority 1 report

**Session 5 Will Create**:
- `docs/plans/progress/beta-week1-day2-https-completion.md` - Priority 2 report
- (Optional) `middleware.ts` - Security headers (if doing Priority 3)
- (Optional) `lib/auth/load-test-middleware.ts` - Load test auth (if doing Option 2)

**Planning Docs**:
- Master Tracker: `docs/plans/progress/MASTER-PROGRESS-TRACKER.md` (62% → 64%)
- Beta Execution Plan: `docs/plans/BETA-TEST-EXECUTION-PLAN.md`
- Session 4 Handoff: `HANDOFF-SESSION-4.md`

---

## Current Progress

**Overall**: 62% → 64% (after HTTPS verification)
**Beta Week 1**: 43% → 57% (Day 1 done, Day 2 Priorities 1-2 done)
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

**Current Phase**:
- 🟡 Beta Week 1 Day 2: Verification + Next Priority (0% → starting now)

**Next Options**:
1. Security Hardening (Priority 3)
2. Load Test Mode (Quick Win)
3. Beta Week 1 Day 3 (Email + Onboarding)

---

## Quick Commands for Session 5

**On Linux Server (SSH: paul@221.164.102.253)**:

```bash
# Check if Next.js is running
lsof -i :3000

# If not running, start with npm
cd /opt/connect
nohup npm run dev > /tmp/nextjs.log 2>&1 &

# OR start with PM2 (production)
cd /opt/connect
pm2 start npm --name "connect" -- start
pm2 save

# Verify Nginx status
sudo systemctl status nginx

# View Nginx logs (if issues)
sudo tail -f /var/log/nginx/error.log

# Check SSL certificate
sudo certbot certificates
```

**On MacBook (Local)**:

```bash
# Test HTTPS
curl -I https://connectplt.kr

# Test redirect
curl -I http://connectplt.kr

# Test API
curl https://connectplt.kr/api/health

# Check local dev server
lsof -i :3000

# View Master Progress
head -50 docs/plans/progress/MASTER-PROGRESS-TRACKER.md
```

---

## What to Tell Me

When you start Session 5, tell me:

**"HTTPS setup is complete. Next.js status on server: [RUNNING/NOT RUNNING]"**

**If Next.js is NOT running**, tell me:
- **Which restart method do you prefer?**
  - Option A: `npm run dev` (simpler)
  - Option B: PM2 (production-ready)

**After restarting Next.js**, tell me:
- **HTTPS verification results** (green padlock? redirect working?)

**Then choose next priority**:
1. Security Hardening (1 hour)
2. Load Test Mode (30 min, quick win)
3. Beta Week 1 Day 3 (Email + Onboarding)

---

## Recommended Next Steps

**My recommendation**:

1. **First**: Restart Next.js on server (5 min)
   - Use PM2 for production reliability
   - Verify with `lsof -i :3000`

2. **Second**: Verify HTTPS in browser (5 min)
   - Test green padlock
   - Test HTTP redirect
   - Test API endpoints

3. **Third**: Create completion report (10 min)
   - Document HTTPS setup success
   - Update Master Progress Tracker

4. **Fourth**: Choose next priority
   - If want quick win: Load Test Mode (30 min)
   - If want complete Day 2: Security Hardening (1 hour)
   - If ready for Day 3: Email + Onboarding (3-4 hours)

**Total time remaining for Day 2**: ~1-2 hours (depending on priority chosen)

---

## Nginx Configuration Summary (FYI)

**Location**: `/etc/nginx/sites-available/connectplt.kr`

**Key features**:
- Listens on ports 80 and 443
- Reverse proxy to localhost:3000
- Security headers (X-Frame-Options, X-XSS-Protection, etc.)
- Static file caching (/_next/static)
- Health check endpoint (access_log off)
- 10MB client body size (file uploads)
- HTTP → HTTPS redirect (configured by Certbot)

**Modified by Certbot**:
- SSL certificate paths added
- HTTPS server block created
- HTTP → HTTPS redirect configured

---

## SSL Certificate Auto-Renewal (FYI)

**How it works**:
- systemd timer: `certbot.timer`
- Checks twice daily (random time)
- Renews if <30 days to expiry
- Reloads Nginx automatically

**Verify auto-renewal**:
```bash
# Check timer status
sudo systemctl status certbot.timer

# Test renewal (dry run)
sudo certbot renew --dry-run

# View renewal logs
sudo journalctl -u certbot.service
```

---

**Session Context**:
- Date: October 11, 2025
- Phase: Beta Week 1 Day 2 (verification)
- Overall Progress: 62% → 64% (after verification)
- Days to Launch: 82 days
- Status: HTTPS setup complete! Verify and choose next priority. 🚀

**Let's continue building Connect!** 💪
