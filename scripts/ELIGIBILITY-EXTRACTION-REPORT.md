# Eligibility Extraction Analysis Report
## Date: 2025-11-08
## Analyzed Dataset: 56 programs from 2025-04-28

---

## 📊 EXECUTIVE SUMMARY

**Overall Status:** ✅ Partially Successful

The Process Worker completed successfully, processing all 56 programs with:
- **56/56 completed** (100% success rate)
- **0 failed** jobs
- **0 skipped** jobs

However, analysis reveals **significant quality gaps** in eligibility extraction for non-DCP programs.

---

## ✅ WHAT'S WORKING WELL

### 1. DCP Program Extraction (34 programs)
**Extraction Quality: EXCELLENT**

All DCP (딥테크 챌린지 프로젝트) programs show complete and accurate extraction:

| Field | Extraction Rate | Sample Data |
|-------|----------------|-------------|
| Investment Requirement | ✅ 100% | ₩2,000,000,000 (20억원) |
| Required Certifications | ✅ 100% | ["벤처기업"] |
| Organization Types | ✅ 100% | ["sme", "venture"] |
| TRL Range | ✅ 100% | 1-3 (inferred) |
| Budget | ✅ 100% | ₩2,000,000,000 |
| Consortium Requirements | ✅ 100% | Required, with composition |
| Industry Sectors | ✅ 100% | Varied by program theme |

**Key Validation:**
- ✅ All 34 programs with ₩2B investment are legitimate DCP programs
- ✅ NO fabricated investment amounts found
- ✅ Extraction patterns match program themes (반도체, 이차전지, 우주항공, etc.)

---

## ⚠️ CRITICAL ISSUES FOUND

### 2. Non-DCP Program Extraction (21 programs)
**Extraction Quality: POOR**

Non-DCP programs show severely limited extraction:

| Field | Extraction Rate | Comparison to DCP |
|-------|----------------|-------------------|
| Required Certifications | ❌ 0% (0/21) | DCP: 100% |
| Employee Requirements | ❌ 0% (0/21) | DCP: N/A |
| Operating Years | ⚠️ 33.3% (7/21) | DCP: N/A |
| Investment Amount | ❌ 0% (0/21) | DCP: 100% |

### 3. Suspicious Pattern: Default Industry Sectors

**CRITICAL BUG IDENTIFIED:**

All non-DCP programs analyzed show identical or near-identical industry sector tagging:

```json
{
  "industryRequirements": {
    "sectors": ["it"]
  }
}
```

**Examples of Incorrectly Tagged Programs:**
1. **학술연구지원사업** (Academic Research) → Tagged as "IT" ❌
2. **감염병 임상연구** (Infectious Disease Research) → Tagged as "IT" ❌
3. **방송통신정책연구** (Broadcasting Policy) → Tagged as "IT" ✓ (Correct)
4. **바이오의료기술개발** → Tagged as "bio, it" ⚠️ (Partially correct)

**Root Cause:**
- Over-matching IT keywords (likely matching common terms like "정보" or "기술")
- OR applying default values when no specific industry is detected
- Extraction logic appears heavily optimized for DCP programs

---

## 🔍 TECHNICAL ROOT CAUSE ANALYSIS

### Issue #1: Extracted Text Not Saved

**Discovery:** The `detail PageData` JSON structure does NOT contain the extracted text after processing.

```json
// Current detailPageData structure:
{
  "title": "...",
  "rawHtml": "...",  // Raw HTML (not parsed text)
  "deadline": "...",
  "ministry": "...",
  "attachments": [...],
  "description": "",  // EMPTY
  "publishedAt": "...",
  "announcingAgency": "..."
}

// Missing fields:
// - extractedText
// - announcementFilesText
// - otherFilesText
```

**Impact:**
1. Cannot re-analyze text after initial processing
2. Difficult to debug extraction issues
3. No audit trail for extraction quality

**Evidence from Process Worker logs:**
```
📝 Extracted text: 9291 chars from announcement files, 0 chars from other files
💾 Saved extracted text to database (2/11 attachments)
```

But the text is NOT in the final `detailPageData` structure!

### Issue #2: Non-DCP Extraction Logic Incomplete

**Symptoms:**
- 0% certification extraction for non-DCP programs
- 0% employee requirement extraction
- Only 33% operating years extraction
- 100% have suspicious `sectors: ["it"]` pattern

**Hypothesis:**
The eligibility extraction logic in `ntis-announcement-parser.ts` is:
1. Optimized for DCP program patterns
2. Missing patterns for non-DCP program types
3. Applying default/fallback values when no match is found

---

## 📈 STATISTICS SUMMARY

### Overall Dataset (56 programs)

| Category | Count | Percentage |
|----------|-------|------------|
| **Total Programs** | 56 | 100% |
| DCP Programs | 34 | 60.7% |
| Non-DCP Programs | 21 | 37.5% |
| Processing Success | 56 | 100% |

### Investment Requirements

| Amount | Count | Program Type |
|--------|-------|--------------|
| ₩2,000,000,000 | 34 | All DCP programs ✅ |
| null | 21 | All non-DCP programs |
| **FABRICATED** | **0** | **✅ NO BUGS** |

### Eligibility Fields (Non-DCP Only)

| Field | Populated | Empty | Rate |
|-------|-----------|-------|------|
| Operating Years | 7 | 14 | 33.3% |
| Certifications | 0 | 21 | 0% ❌ |
| Employees | 0 | 21 | 0% ❌ |
| Revenue | 0 | 21 | 0% ❌ |

---

## 🎯 RECOMMENDED ACTIONS

### Priority 1: Fix Industry Sector Over-Matching
1. Review `extractIndustrySectors()` function in `ntis-announcement-parser.ts`
2. Add section-aware filtering (don't match sectors outside eligibility sections)
3. Remove default "IT" fallback for programs without clear industry indicators

### Priority 2: Improve Non-DCP Extraction Patterns
1. Add extraction patterns for academic research programs
2. Add patterns for biomedical/healthcare programs
3. Add patterns for policy/regulation research programs
4. Test against sample announcements from each category

### Priority 3: Save Extracted Text to Database
1. Modify Process Worker to save `extractedText` to `detailPageData`
2. Add separate fields for:
   - `announcementFilesText` (from HWP/PDF files)
   - `rawHtmlText` (from detail page HTML)
   - `otherFilesText` (from additional attachments)
3. Enable post-processing debugging and quality audits

### Priority 4: Add Extraction Quality Metrics
1. Create confidence scores for each extracted field
2. Flag programs for manual review when confidence is low
3. Track extraction success rates by program type

---

## 📝 SAMPLE NON-DCP PROGRAM ANALYSIS

### Program: 2025년도 바이오·의료기술개발 사업 제1차 신규과제 3차 재공모

**Extracted Criteria:**
```json
{
  "smeEligible": true,
  "consortiumRequired": true,
  "industryRequirements": {
    "sectors": ["bio", "it"]
  },
  "commercializationFocus": true,
  "consortiumRequirements": {
    "required": true,
    "composition": {
      "leadOrganization": ["중소기업"]
    }
  },
  "organizationRequirements": {
    "operatingYears": {
      "minimum": 3,
      "maximum": 10
    },
    "organizationType": ["sme", "corporation", "soleProprietor"]
  },
  "certificationRequirements": {
    "documents": ["재무제표"]
  }
}
```

**Structured Fields:**
- requiredCertifications: [] (EMPTY despite JSON showing documents)
- requiredOperatingYears: 3
- maxOperatingYears: 10

**Issue:**
The JSON criteria shows sophisticated extraction, BUT:
1. `certificationRequirements.documents: ["재무제표"]` was NOT copied to `requiredCertifications` array
2. No SME/venture certifications were extracted despite clear SME focus

---

## 🔧 NEXT STEPS

1. **Investigate extraction logic** in `lib/scraping/parsers/ntis-announcement-parser.ts`
2. **Fix industry sector over-matching**
3. **Improve non-DCP extraction patterns**
4. **Save extracted text to database**
5. **Re-process 56 programs** with fixed logic
6. **Verify improvements** with test scripts
7. **Commit and deploy** to production

---

## 📊 CONCLUSION

The Process Worker is **functionally working** but has **significant quality gaps**:

✅ **Strengths:**
- 100% job completion rate
- Excellent DCP program extraction
- No fabricated data bugs
- Stable processing pipeline

❌ **Weaknesses:**
- Poor non-DCP extraction (0-33% field coverage)
- Industry sector over-matching
- Extracted text not saved for debugging
- No confidence scores or quality metrics

**Overall Grade:** B- (Good for DCP, Poor for non-DCP)
