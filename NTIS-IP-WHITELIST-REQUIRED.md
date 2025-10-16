# NTIS API - IP Whitelist Configuration Required

**Status:** ⏳ **Pending User Action** (October 16, 2025)
**Blocker:** Production NTIS scraping cannot proceed until IP whitelisting is complete

---

## Current Situation

✅ **Completed:**
- NTIS API key obtained: `6f5cioc70502fi63fdn5`
- API key configured in `.env.production`
- NTIS integration code deployed to production
- API endpoint verified: `https://www.ntis.go.kr/rndopen/openApi/public_project`

❌ **Blocking Issue:**
- Error: "접근 허용 IP가 아닙니다" (IP not authorized)
- Production server IP (221.164.102.253) not whitelisted in NTIS portal
- MacBook development IP (211.245.196.87) also not whitelisted

---

## Required IPs for Whitelisting

**Add these IPs to NTIS API key `6f5cioc70502fi63fdn5`:**

```
Production Server: 221.164.102.253
Development (MacBook): 211.245.196.87
```

---

## How to Whitelist IPs in NTIS Portal

### Method 1: Self-Service (Recommended)

1. **Log in to NTIS API Management Portal**
   - URL: https://www.ntis.go.kr/rndopen/api/mng/apiMain.do
   - Use your NTIS account (same account used for API key application)

2. **Navigate to API Key Management**
   - Menu: "API 키 관리" (API Key Management)
   - Find your key: `6f5cioc70502fi63fdn5`

3. **Add IPs**
   - Click: "IP 등록/수정" (IP Registration/Modification)
   - Add: `221.164.102.253` (production)
   - Add: `211.245.196.87` (development)
   - Format: Comma-separated or one per line (depending on portal UI)

4. **Save and Wait**
   - Save changes
   - Wait 5-10 minutes for IP whitelist propagation
   - Test with verification script

### Method 2: Contact NTIS Support

**If self-service portal doesn't provide IP management:**

- **Phone:** 042-869-1115 (NTIS API Support)
- **Email:** ntis@kisti.re.kr
- **Request Message (Korean):**

```
안녕하세요,

API 키 6f5cioc70502fi63fdn5에 대해
다음 IP 주소를 화이트리스트에 등록해 주시기 바랍니다:

1. 운영 서버: 221.164.102.253
2. 개발 환경: 211.245.196.87

목적: Connect 플랫폼 R&D 과제 정보 수집
플랫폼: https://connectplt.kr

감사합니다.
```

**Request Message (English):**

```
Hello,

Please whitelist the following IP addresses for API key 6f5cioc70502fi63fdn5:

1. Production Server: 221.164.102.253
2. Development Environment: 211.245.196.87

Purpose: R&D program data collection for Connect platform
Platform: https://connectplt.kr

Thank you.
```

---

## Verification After Whitelisting

### Test from Production Server:

```bash
ssh -i ~/.ssh/id_ed25519_connect user@221.164.102.253

# Test NTIS API connectivity
curl -s "https://www.ntis.go.kr/rndopen/openApi/public_project?apprvKey=6f5cioc70502fi63fdn5&collection=project&SRWR=&startPosition=1&displayCnt=2"

# Expected: XML response with program data (not error message)
```

### Test from Local MacBook:

```bash
curl -s "https://www.ntis.go.kr/rndopen/openApi/public_project?apprvKey=6f5cioc70502fi63fdn5&collection=project&SRWR=&startPosition=1&displayCnt=2"

# Expected: XML response with program data
```

### Run Comprehensive Validation:

```bash
# After IP whitelisting succeeds, run full validation
cd /Users/paulkim/Downloads/connect
npx tsx scripts/validate-ntis-integration.ts

# Expected: 7/7 checks passing
```

### Trigger Initial NTIS Scraping:

```bash
# After validation passes, populate database
npx tsx scripts/trigger-ntis-scraping.ts

# Expected: 800-1,200+ programs discovered and saved
```

---

## Timeline

- **October 16, 2025 (Today):** IP whitelist required identified
- **User Action Required:** Add IPs to NTIS portal (5-10 minutes)
- **After Whitelisting:** Run validation → trigger scraping → verify data (30 minutes)
- **Week 3-4 Target:** AI Integration (blocked until NTIS data available)

---

## Impact

**If IP Whitelisting Delayed:**
- ❌ Cannot scrape NTIS historical data (108K+ programs)
- ❌ Missing success pattern analysis (win rates, cycle times)
- ❌ AI match explanations lack historical context
- ✅ Playwright scraping still works (4 agencies, 200-500 active programs)
- ✅ Email system operational (independent of NTIS)

**When IP Whitelisting Complete:**
- ✅ Access to 108K+ historical R&D programs
- ✅ Rich success patterns for match quality scoring
- ✅ Historical win rate data for AI insights
- ✅ Complete hybrid scraping (NTIS API + Playwright)
- ✅ Ready for Week 3-4 AI Integration

---

## Technical Notes

### Why IP Whitelisting Exists

Korean government APIs (including NTIS) require IP whitelisting for security:
- Prevents unauthorized API abuse
- Tracks data usage by organization
- Complies with PIPA (Personal Information Protection Act)
- Standard practice for public sector APIs in Korea

### Dynamic IP Considerations

**MacBook Development IP (211.245.196.87):**
- May change if ISP assigns dynamic IPs
- Need to re-whitelist if IP changes
- Check current IP: `curl -s https://api.ipify.org`

**Production Server IP (221.164.102.253):**
- Static IP (dedicated server)
- Should remain stable
- One-time whitelisting sufficient

### Alternative: VPN Solution (Not Recommended)

If NTIS only allows 1 IP:
- Set up VPN between MacBook and production server
- Route all NTIS requests through production server
- **Downside:** Complex, adds latency, harder to debug

**Recommended:** Just whitelist both IPs (simpler, faster, more reliable)

---

## Related Files

- **NTIS Client:** `lib/ntis-api/client.ts`
- **Environment Config:** `.env.production`, `.env.local`
- **Validation Script:** `scripts/validate-ntis-integration.ts`
- **Scraping Script:** `scripts/trigger-ntis-scraping.ts`
- **Implementation Roadmap:** `NTIS-IMPLEMENTATION-ROADMAP.md`

---

## Summary

**What You Need to Do:**
1. Log into NTIS portal: https://www.ntis.go.kr/rndopen/api/mng/apiMain.do
2. Add IP `221.164.102.253` (production) to key `6f5cioc70502fi63fdn5`
3. Add IP `211.245.196.87` (MacBook) to key `6f5cioc70502fi63fdn5`
4. Wait 5-10 minutes for propagation
5. Run verification: `curl -s "https://www.ntis.go.kr/rndopen/openApi/public_project?apprvKey=6f5cioc70502fi63fdn5&collection=project&SRWR=&startPosition=1&displayCnt=2"`
6. If successful: Run `npx tsx scripts/trigger-ntis-scraping.ts`

**Questions?**
- NTIS Support: 042-869-1115, ntis@kisti.re.kr
- Check this doc for troubleshooting steps

---

**Last Updated:** October 16, 2025
**Next Action:** User whitelists IPs in NTIS portal → Verify → Trigger scraping → Complete!
