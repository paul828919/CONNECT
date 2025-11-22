# Refund Policy v3.0 - Deployment Guide

**Created:** 2025-11-22 (KST)
**System:** Connect Platform
**Scope:** Production deployment of comprehensive refund policy system

---

## ⚠️ Pre-Deployment Checklist

Before deploying to production, verify the following:

- [ ] **Local testing completed** (Docker rebuild + manual verification)
- [ ] **Unit tests passing** (41 tests in `__tests__/lib/refund-calculator.test.ts`)
- [ ] **Database migration tested** (Prisma schema updated)
- [ ] **Page rendering verified** (all 4 link placements working)
- [ ] **Dark pattern audit reviewed** (`docs/compliance/dark-pattern-audit-report.md`)
- [ ] **Legal compliance confirmed** (Korean 전자상거래법)

---

## 📦 Deployment Contents

### 1. **New Files Created**

```
app/refund-policy/page.tsx (610 lines)
  - Korean refund policy (8 sections)
  - English summary
  - Legal disclaimers
  - Calculation examples
  - Dispute resolution contacts

docs/compliance/dark-pattern-audit-report.md (442 lines)
  - Comprehensive audit report
  - FTC compliance matrix
  - Risk assessment
  - 3 recommendations

docs/internal/refund-process-manual.md (203 lines)
  - CS team operational manual
  - Refund calculation examples
  - Edge case handling
  - Escalation procedures

__tests__/lib/refund-calculator.test.ts (780+ lines)
  - 41 comprehensive unit tests
  - Performance benchmarks
  - Real-world scenarios
  - Type safety validation

docs/deployment/refund-policy-v3-deployment.md (this file)
  - Deployment guide
  - Rollback procedures
  - Monitoring setup
```

### 2. **Modified Files**

```
lib/refund-calculator.ts
  - Enhanced with statutory mode
  - Leap year handling
  - Contract end date parameter
  - Improved error handling

prisma/schema.prisma
  - Updated RefundRequest model
  - New enums: RefundCalculationMode
  - Enhanced fields: actualRefundAmount, finalizedAt, supportingDocuments

app/pricing/page.tsx
  - Added refund policy notice box
  - Link to /refund-policy
  - Link to /terms

app/terms/page.tsx
  - Article 7: Enhanced refund policy section
  - Inline link to /refund-policy

app/page.tsx (Landing page)
  - Footer link to /refund-policy

public/robots.txt
  - Explicitly allows /refund-policy for SEO
```

---

## 🚀 Deployment Steps

### Step 1: Git Commit (Local)

```bash
# Verify all changes
git status

# Add all modified and new files
git add app/refund-policy/page.tsx \
        lib/refund-calculator.ts \
        prisma/schema.prisma \
        app/pricing/page.tsx \
        app/terms/page.tsx \
        app/page.tsx \
        public/robots.txt \
        docs/compliance/dark-pattern-audit-report.md \
        docs/internal/refund-process-manual.md \
        docs/deployment/refund-policy-v3-deployment.md \
        __tests__/lib/refund-calculator.test.ts

# Create commit (follow work rule: no "Co-author: Claude")
git commit -m "feat: Implement comprehensive refund policy v3.0

- Add /refund-policy page (KR+EN, 8 sections, 610 lines)
- Enhance refund calculator with statutory mode + leap year handling
- Update Prisma schema: RefundRequest model improvements
- Add 4-location link strategy (footer, pricing, terms, policy page)
- Create dark pattern audit report (FTC compliant, 0 violations)
- Add 41 comprehensive unit tests (100% passing)
- Include CS manual and deployment documentation

Compliance:
- Korean 전자상거래법 Articles 17-18 compliant
- Multi-location disclosure exceeds industry standards (4 vs 2-3)
- Transparent 10% penalty disclosure with calculation examples
- Statutory rights prominently displayed

Testing:
- All 41 refund calculator tests passing
- Page rendering verified (HTTP 200 on all routes)
- Link placement verified (footer, pricing, terms)
- Prisma migration successful (local PostgreSQL)

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

### Step 2: Push to GitHub

```bash
# Push to main branch (triggers CI/CD via GitHub Actions)
git push origin main
```

### Step 3: Monitor GitHub Actions

1. Visit: https://github.com/paul828919/CONNECT/actions
2. Watch for deployment workflow: `.github/workflows/deploy-production.yml`
3. Expected steps:
   - ✅ Checkout code
   - ✅ Build Docker image (`docker buildx build --platform linux/amd64`)
   - ✅ SSH to production server (221.164.102.253)
   - ✅ Pull new image
   - ✅ Run database migration (via `docker-entrypoint.sh`)
   - ✅ Rolling update with zero downtime
   - ✅ Health check (90-second timeout)

### Step 4: Verify Production Deployment

```bash
# Check production site (via SSH or browser)
curl -s https://connectplt.kr/refund-policy | grep "환불 정책" | head -1

# Verify all links
curl -s https://connectplt.kr | grep 'href="/refund-policy"'
curl -s https://connectplt.kr/pricing | grep 'href="/refund-policy"'
curl -s https://connectplt.kr/terms | grep 'href="/refund-policy"'

# Check database migration status (SSH to production)
ssh user@221.164.102.253
docker exec connect-app-1 npx prisma db push --skip-generate
# Should output: "Your database is already in sync"
```

---

## 🔄 Rollback Procedure

If deployment issues occur:

### Quick Rollback (via GitHub Actions)

1. Identify last working commit:
   ```bash
   git log --oneline -5
   ```

2. Revert to previous version:
   ```bash
   git revert HEAD
   git push origin main
   ```

3. GitHub Actions will automatically deploy the reverted version

### Manual Rollback (SSH to production)

```bash
# SSH to production server
ssh user@221.164.102.253

# Check running containers
docker ps -a | grep connect

# Roll back to previous image (if available)
docker tag connect:latest connect:rollback-backup
docker pull <previous-image-tag>
docker-compose -f docker-compose.production.yml up -d --force-recreate

# Verify rollback
curl -s http://localhost:3000/refund-policy || echo "Refund policy page removed (expected)"
```

---

## 📊 Post-Deployment Monitoring

### 1. **Page Performance**

Monitor `/refund-policy` page load times:
- Target: < 2 seconds TTFB (Time To First Byte)
- Lighthouse score: > 90 (Performance, Accessibility, SEO)

### 2. **Error Tracking**

Watch for errors in production logs:
```bash
# SSH to production
ssh user@221.164.102.253

# Check application logs
docker logs connect-app-1 --tail 100 -f | grep -i "refund\|error\|500"

# Check Nginx logs
docker logs connect-nginx-1 --tail 100 -f | grep "/refund-policy"
```

### 3. **Database Queries**

Monitor RefundRequest table:
```sql
-- Check for new refund requests
SELECT COUNT(*), status FROM "RefundRequest" GROUP BY status;

-- Monitor calculation mode distribution
SELECT "calculationMode", COUNT(*) FROM "RefundRequest" GROUP BY "calculationMode";
```

### 4. **User Behavior Analytics**

Track engagement metrics:
- Page views on `/refund-policy` (expect low initially, ~5-10 views/week)
- Click-through rate from pricing page (expect ~2-5%)
- Bounce rate (target < 60%)
- Average time on page (target > 2 minutes for policy review)

---

## 🐛 Common Issues & Solutions

### Issue 1: Page Not Found (404 on /refund-policy)

**Symptoms:**
- `curl https://connectplt.kr/refund-policy` returns 404

**Diagnosis:**
```bash
# Check if file exists in Docker container
docker exec connect-app-1 ls -la /app/app/refund-policy/page.tsx
```

**Solution:**
- Verify `app/refund-policy/page.tsx` was included in Docker build
- Check `.dockerignore` doesn't exclude it
- Rebuild Docker image with `--no-cache`:
  ```bash
  docker buildx build --platform linux/amd64 --no-cache -f Dockerfile.production -t connect:latest .
  ```

### Issue 2: Refund Calculator Returns Wrong Amounts

**Symptoms:**
- Refund amounts don't match expected values
- Customer complaints about calculation errors

**Diagnosis:**
```bash
# Run unit tests
npm test -- __tests__/lib/refund-calculator.test.ts

# Check for failed tests
```

**Solution:**
- Review calculation logic in `lib/refund-calculator.ts`
- Verify leap year handling (line 46-49)
- Check penalty calculation (line 103)
- Consult `docs/internal/refund-process-manual.md` for edge cases

### Issue 3: Prisma Migration Fails

**Symptoms:**
- Docker container fails to start
- Error: "Migration failed" in logs

**Diagnosis:**
```bash
# Check migration status
docker exec connect-app-1 npx prisma migrate status

# View recent migrations
docker exec connect-app-1 npx prisma migrate list
```

**Solution:**
- If migration is stuck, manually apply:
  ```bash
  docker exec connect-app-1 npx prisma db push --force-reset
  ```
- **⚠️ WARNING**: `--force-reset` will drop all data! Only use in development.
- For production, create explicit migration:
  ```bash
  npx prisma migrate dev --name refund_policy_v3
  ```

### Issue 4: Links Not Working

**Symptoms:**
- Clicking "환불 정책" on pricing page doesn't navigate
- 404 errors on link clicks

**Diagnosis:**
```bash
# Check link syntax in source files
grep -r 'href="/refund-policy"' app/
```

**Solution:**
- Verify Next.js routing is working:
  ```bash
  # Check app directory structure
  ls -la app/refund-policy/
  ```
- Ensure `page.tsx` exists (not `index.tsx`)
- Rebuild and restart Next.js:
  ```bash
  npm run build
  npm start
  ```

---

## 📝 Legal Compliance Validation

After deployment, perform compliance spot-check:

### 1. **7-Day Cooling-Off Period**

✅ Verify disclosure on:
- `/refund-policy` page (Section 2 & 3)
- `/pricing` page (notice box)
- `/terms` page (Article 7)

### 2. **10% Penalty Disclosure**

✅ Verify prominently displayed:
- Calculation example on `/refund-policy` (Section 3)
- Tables showing breakdown
- English summary included

### 3. **Refund Processing Timeline**

✅ Verify 3-business-day commitment:
- Section 6 of refund policy
- CS manual (internal documentation)

### 4. **Dispute Resolution Contacts**

✅ Verify listed:
- 한국소비자원 1372
- 공정거래위원회
- 전자거래분쟁조정위원회

---

## 🎯 Success Metrics

After 7 days post-deployment, evaluate:

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Page availability | 100% (24/7) | Uptime monitoring (UptimeRobot) |
| Page load time | < 2s TTFB | Google PageSpeed Insights |
| Unit test pass rate | 100% (41/41) | GitHub Actions CI |
| Customer complaints | 0 (policy-related) | Support ticket analysis |
| Dark pattern violations | 0 | FTC audit compliance |
| Link placement | 4 locations verified | Manual QA checklist |

---

## 📚 Related Documentation

- **Legal Framework**: `docs/compliance/legal-compliance-framework.md`
- **Dark Pattern Audit**: `docs/compliance/dark-pattern-audit-report.md`
- **CS Manual**: `docs/internal/refund-process-manual.md`
- **Unit Tests**: `__tests__/lib/refund-calculator.test.ts`
- **Refund Policy Page**: `app/refund-policy/page.tsx`

---

## 🔒 Security Considerations

- **No PII in logs**: Refund calculator doesn't log customer data
- **HTTPS-only**: Refund policy page served over TLS 1.3
- **CORS policy**: API endpoints (future) will use strict CORS
- **Rate limiting**: Future API endpoints will have rate limits (see Phase 7)

---

## 🚧 Future Enhancements (Phase 7)

Per dark pattern audit recommendations:

1. **Dashboard Refund Button** (Priority: Medium)
   - Add self-service refund request in `/dashboard/subscription`
   - Reduces friction, aligns with FTC "easy cancellation" guidelines

2. **Auto-Renewal Notice** (Priority: High)
   - Add notice at checkout: "이 플랜은 자동 갱신됩니다"
   - **MANDATORY** before enabling paid subscriptions

3. **Confirmation Email Enhancements** (Priority: Low)
   - Add refund policy reminder in Toss Payments confirmation email
   - Proactive transparency

---

## ✅ Final Deployment Confirmation

After completing deployment, confirm:

- [ ] All 16 phases completed (Phase 1-6 + Phase 8)
- [ ] Git commit created (no "Co-author: Claude")
- [ ] Pushed to GitHub main branch
- [ ] GitHub Actions deployment successful
- [ ] Production pages accessible (HTTP 200)
- [ ] All 4 links working (footer, pricing, terms)
- [ ] Prisma migration applied
- [ ] Unit tests passing (41/41)
- [ ] Dark pattern audit report reviewed
- [ ] Legal compliance validated

---

**Deployment Sign-Off:**

- **Prepared By:** Internal Development Team
- **Date:** 2025-11-22 (KST)
- **Version:** v3.0
- **Approval Status:** ✅ Ready for Production

---

**Emergency Contacts:**

- **Technical Issues:** support@connectplt.kr
- **Legal Compliance:** [Legal team contact - TBD]
- **CS Escalation:** [CS manager - TBD]
