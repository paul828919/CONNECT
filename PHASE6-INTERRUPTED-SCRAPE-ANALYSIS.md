# Phase 6 Interrupted Scrape Analysis
**Date:** October 29, 2025
**Scraping Session:** NTIS Historical Data (October 1-21, 2025)
**Status:** ❌ **CRITICAL FAILURE - Enhancement Fields Not Populated**

---

## Executive Summary

The Phase 6 scraping test was interrupted after ~1.5 pages (16 programs saved). Analysis reveals **CRITICAL FAILURE** of enhancement field population:

- ❌ **Budget NULL rate: 93.8%** (Target: <20%) - **FAIL by 73.8 percentage points**
- ❌ **TRL coverage: 0.0%** (Target: ≥70%) - **FAIL by 70 percentage points**
- ❌ **Business structures: 0/16 programs** - **Complete absence**
- ✅ **Attachment capture: 87.5%** - **SUCCESS** (14/16 programs)

**Root Cause:** Enhancement fields (budget, TRL, business structures) are NOT being extracted from attachment text despite successful HWPX/PDF text extraction.

---

## 1. Scraping Volume & Quality

### Programs Saved
- **Total**: 16 R&D programs
- **Active (未过期)**: ~9 programs (56%)
- **Expired**: ~7 programs (44%)
- **Skipped**: 3 SURVEY/NOTICE announcements (correctly filtered)

### Attachment Processing
| Format | Success Rate | Sample Extraction |
|--------|--------------|-------------------|
| **HWPX** | ✅ 100% | 921-4,604 characters |
| **PDF** | ✅ 100% | 1,439-5,000 characters |
| **HWP** | ❌ 0% | ALL failed (Hancom Docs login timeout) |
| **ZIP** | ⊘ Skipped | Not supported |

**Key Finding:** HWPX and PDF extraction is working perfectly. HWP conversion is completely broken (100% failure rate).

---

## 2. Enhancement Field Population

### Database Analysis Results

```
Field Population Summary:
────────────────────────────────────────────────────────────
Budget amount: 1/16 (6.25%)
TRL (min/max): 0/16 (0%)
TRL inferred flag: 0/16 (0%)
Business structures: 0/16 (0%)
Attachments: 14/16 (87.5%)
```

### Sample Program (With Attachments But NO Enhancement Data)
```
Title: 2025년도 자율형소프트로봇핵심기술국제공동연구(2차)...
Attachments (9 files):
  1. 붙임 01. 연구개발계획서 등 관련양_*.zip
  2. 붙임 02. 평가결과 이의 신청_*.zip
  3. 붙임 03. 관련 법령 및 규_*.zip
  4. 붙임 04. 온라인 과제접수 매뉴얼(IRIS)_*.pdf ✓ Extracted 1,033 characters
  5. 붙임 05. R&D 자율성트랙 제도안내_*.hwp ✗ FAILED
  6. 붙임 06. 사전지원제외 기관 변경 요청_*.hwp ✗ FAILED
  7. 붙임 07. 2025년 국제공동 R&D 신규 접수 유의사_*.hwp ✗ FAILED
  8. 붙임08. 품목개요_*.zip
  9. 자율형소프트로봇핵심기술국제공동연구(2차)_*.hwp ✗ FAILED

Budget: NULL
TRL: NULL-NULL
Business structures: []
```

**Critical Observation:** Attachment text WAS extracted (1,033 characters from PDF), but enhancement fields remain NULL.

### The ONE Program With Budget
```
Title: 2026년 농업연구개발사업 1차공모_(2026)국가생명연구자원선진화사업(자유공모)
Budget: ₩40,000,000,000
Attachments:
  - IRIS 연구자매뉴얼_*.pdf ✓ Extracted 1,439 characters
  - 농촌진흥청 2026년도 연구개발사업 신규과제 1차공모 공고_*.pdf ✓ Extracted 5,000 characters
URL: https://www.ntis.go.kr/rndgate/eg/un/ra/view.do?roRndUid=1249556
```

**Key Insight:** This program successfully extracted ₩40B budget from PDF attachments, proving the extraction logic CAN work when the right data is present.

---

## 3. Root Cause Analysis

### Problem 1: HWP Conversion Complete Failure (100% Failure Rate)

**Error Pattern (repeated for ALL HWP files):**
```
[HANCOM-DOCS] Conversion failed for [filename].hwp: locator.fill: Timeout 30000ms exceeded.
Call log:
  - waiting for getByRole('textbox', { name: '이메일' })
```

**Analysis:**
- Playwright cannot find the email textbox within 30 seconds
- Possible causes:
  1. Hancom Docs login page structure changed
  2. Rate limiting/bot detection after multiple login attempts
  3. Session/cookie issues
  4. Network connectivity problems

**Impact:** Missing budget/TRL data that may be HWP-only files (e.g., "R&D 자율성트랙 제도안내", "사전지원제외 기관 변경 요청")

---

### Problem 2: Enhancement Field Extraction Logic Missing/Broken

**Evidence:**
1. Attachment text IS being extracted successfully (HWPX/PDF: 921-5,000 characters)
2. Logs show: `[NTIS-KEYWORDS] Added 1 keywords from attachments`
3. BUT: Budget, TRL, business structures are NOT being populated

**Hypothesis:**
The detail parser (`lib/scraping/ntis-detail-parser.ts`) is NOT parsing extracted attachment text to populate enhancement fields. Possible issues:
- Missing regex patterns for budget extraction from attachment text
- Missing TRL inference logic from attachment text
- Missing business structure parsing from attachment text
- Attachment text NOT being passed to enhancement field extractors

**Next Steps Required:**
1. Examine `lib/scraping/ntis-detail-parser.ts` to verify enhancement field extraction logic
2. Check if `extractTextFromAttachment()` results are being used by detail parser
3. Add/fix regex patterns for budget, TRL, business structure extraction
4. Test extraction logic against known good attachment text

---

## 4. Attachment Text Extraction Success Examples

### Example 1: HWPX Extraction (✅ Working)
```
File: [붙임2] 2025년 국토교통연구기획 사업 제2차 시행 재공고 안내.hwpx (17.9MB)
Extracted: 3,609 characters
Format: ZIP-based XML (similar to DOCX)
Status: ✅ Successfully parsed with AdmZip + fast-xml-parser
```

### Example 2: PDF Extraction (✅ Working)
```
File: 농촌진흥청 2026년도 연구개발사업 신규과제 1차공모 공고.pdf (1.2MB)
Extracted: 5,000 characters (capped for performance)
Full text: 16,567 characters available
Status: ✅ Successfully parsed with pdf-parse
```

### Example 3: HWP Conversion (❌ Failed)
```
File: 붙임 05. R&D 자율성트랙 제도안내_SROM.hwp (2.1MB)
Status: ❌ Hancom Docs login timeout
Expected content: R&D autonomy track guidelines (likely contains TRL/budget info)
```

---

## 5. Success Criteria Evaluation

| Criterion | Target | Actual | Status | Gap |
|-----------|--------|--------|--------|-----|
| Budget NULL rate | < 20% | 93.8% | ❌ FAIL | -73.8 pp |
| TRL coverage | ≥ 70% | 0.0% | ❌ FAIL | -70.0 pp |
| Attachment capture | N/A | 87.5% | ✅ PASS | N/A |

**Overall Phase 6 Status:** ❌ **CRITICAL FAILURE**

---

## 6. Recommendations

### Immediate Actions (Priority 1 - Blocking)

1. **Fix Enhancement Field Extraction Logic** (Most Critical)
   - **Task**: Examine `lib/scraping/ntis-detail-parser.ts`
   - **Goal**: Verify attachment text is being used to populate budget/TRL/business structures
   - **Expected fix**: Add/repair regex patterns for field extraction from attachment text
   - **Timeline**: 1-2 hours

2. **Debug Hancom Docs HWP Conversion** (High Priority)
   - **Option A**: Investigate Playwright login issue (page structure change?)
   - **Option B**: Switch to local LibreOffice with HWP import filters
   - **Option C**: Accept HWPX/PDF-only extraction temporarily (60-70% coverage)
   - **Timeline**: 2-4 hours

### Follow-up Actions (Priority 2)

3. **Rerun Full Scraping Test**
   - After fixing enhancement field extraction logic
   - Complete all 3 pages (16/~24 announcements = 67% complete)
   - Verify budget NULL < 20% and TRL coverage ≥ 70%

4. **Add Fallback Budget/TRL Patterns**
   - Some programs show "Budget: TBD" (placeholder text)
   - Add pattern matching for:
     - "○억원" (hundred million won)
     - "○천만원" (ten million won)
     - "TRL X~Y", "기술성숙도 X단계"
   - Test against known good programs

---

## 7. Technical Details

### Database State After Interruption
- **NTIS programs**: 16
- **Funding matches**: 0
- **Organizations**: 56 (preserved)
- **Backup status**: ✅ Verified (pre-matching-quality-fix-20251029.sql, 4.9 MB)

### Scraper Performance
- **Page 1**: 562.8 seconds (~9.4 minutes)
- **Page 2**: Interrupted mid-processing
- **Attachment processing**: ~30-60 seconds per program (due to HWP failures)
- **Estimated full runtime**: ~30 minutes for 3 pages (if HWP conversion is fixed)

### Environment
- **Database**: PostgreSQL 15 (Docker container `connect_dev_postgres`)
- **Connection**: `postgresql://connect:connect_dev_password@localhost:5432/connect`
- **Node version**: v24.6.0
- **Playwright**: Installed and functional (except Hancom Docs login)

---

## 8. Conclusion

Phase 6 enhancement field population is **CRITICALLY BROKEN**. While attachment text extraction is working well for HWPX (100%) and PDF (100%) formats, the extracted text is NOT being used to populate budget, TRL, and business structure fields.

**The ONE program with budget data (₩40B)** proves the extraction logic CAN work, but it's either:
1. Only working for specific text patterns (narrow regex)
2. Not being called for most programs
3. Failing silently for non-matching patterns

**Next Step:** Examine detail parser code to fix enhancement field extraction logic BEFORE attempting HWP conversion fixes.
