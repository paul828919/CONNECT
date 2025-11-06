# NTIS Classification Analysis Report
**Date**: 2025-10-23
**Database**: connect (PostgreSQL)
**Total Programs**: 10

## Executive Summary
**Current State**: ALL 10 programs marked as `R_D_PROJECT`
**Correct Classification**: Only 4 should be `R_D_PROJECT`
**Misclassifications**: 5 out of 10 programs (50% error rate)

**Impact**: Users are seeing technology demand surveys and recruitment notices as "funding opportunities" in their matches.

---

## Detailed Program Analysis

### ✅ Program 1 - CORRECTLY CLASSIFIED
**Title**: 2025년도 제3차 과학기술분야 연구기획과제 재공모
**Current Type**: R_D_PROJECT
**Should Be**: R_D_PROJECT ✅
**Reason**: Contains "연구기획과제" (research planning project) - matches R&D pattern

---

### ✅ Program 2 - CORRECTLY CLASSIFIED
**Title**: 2025년도 과학기술혁신정책지원사업 연구과제 재공모
**Current Type**: R_D_PROJECT
**Should Be**: R_D_PROJECT ✅
**Reason**: Contains "연구과제" (research project) - matches R&D pattern

---

### ❌ Program 3 - MISCLASSIFIED
**Title**: 2026년도 뿌리산업 혁신공정장비 개발(RD) 사업 신규과제 상세 기획을 위한 **기술수요조사** 공고
**Current Type**: R_D_PROJECT ❌
**Should Be**: SURVEY
**Reason**: Contains "기술수요조사" (technology demand survey) - this is NOT a funding opportunity, it's a survey to identify future R&D needs
**User Impact**: Users waste time applying to a survey instead of actual funding

---

### ❌ Program 4 - MISCLASSIFIED
**Title**: 2026년 미래자동차(SDV) 패러다임 대응 지원 **기술수요조사**
**Current Type**: R_D_PROJECT ❌
**Should Be**: SURVEY
**Reason**: Contains "기술수요조사" (technology demand survey)
**User Impact**: Same as Program 3 - not actual funding

---

### ❌ Program 5 - MISCLASSIFIED
**Title**: K-휴머노이드 **연합 신규 구성원 추가 모집**을 위한 공고(3차)
**Current Type**: R_D_PROJECT ❌
**Should Be**: NOTICE
**Reason**: Contains "연합" (alliance) + "구성원" (member) + "모집" (recruitment) - matches exclusion pattern for consortium member recruitment
**User Impact**: This recruits consortium members, NOT funding applicants. Users cannot apply for funding here.

---

### ❌ Program 6 - MISCLASSIFIED
**Title**: 첨단디스플레이국가연구플랫폼구축(가칭) **기술 수요조사**(연장)
**Current Type**: R_D_PROJECT ❌
**Should Be**: SURVEY
**Reason**: Contains "기술 수요조사" (technology demand survey)
**User Impact**: Survey extension, not funding opportunity

---

### ✅ Program 7 - CORRECTLY CLASSIFIED
**Title**: 2025년 KISTEP 수탁사업 위탁연구과제 재공모(과학기술정보통신부 직할 출연(연) 및 국가과학기술연구회 기관평가)
**Current Type**: R_D_PROJECT
**Should Be**: R_D_PROJECT ✅
**Reason**: Contains "연구과제" (research project) - matches R&D pattern

---

### ❌ Program 8 - MISCLASSIFIED
**Title**: 2026년도 글로벌우수기업연구소육성사업(GATC) 신규과제 발굴을 위한 **기술수요조사**
**Current Type**: R_D_PROJECT ❌
**Should Be**: SURVEY
**Reason**: Contains "기술수요조사" (technology demand survey)
**User Impact**: Survey to discover new projects, not actual funding

---

### ❌ Program 9 - MISCLASSIFIED (EDGE CASE)
**Title**: 2026년 국가기록관리활용기술(RD) **연구개발사업** 과제 **수요조사**
**Current Type**: R_D_PROJECT ❌
**Should Be**: SURVEY
**Reason**: Contains BOTH "연구개발사업" (R&D program) AND "수요조사" (demand survey). Classification priority order puts SURVEY patterns BEFORE R&D patterns, so this correctly classifies as SURVEY.
**User Impact**: This is a demand survey FOR a future R&D program, not the actual funding announcement

---

### ✅ Program 10 - CORRECTLY CLASSIFIED
**Title**: 25년 국방연구개발 전력지원체계연구개발사업 주관연구개발기관 선정을 위한 공고
**Current Type**: R_D_PROJECT
**Should Be**: R_D_PROJECT ✅
**Reason**: Contains "연구개발" (R&D) + "주관연구개발기관 선정" (lead R&D institution selection) - actual funding opportunity

---

## Classification Summary

| Classification | Current Count | Correct Count | Programs |
|---------------|---------------|---------------|----------|
| **R_D_PROJECT** | 10 | 4 | 1, 2, 7, 10 |
| **SURVEY** | 0 | 5 | 3, 4, 6, 8, 9 |
| **NOTICE** | 0 | 1 | 5 |
| **Total** | 10 | 10 | - |

**Accuracy**: 5 out of 10 correct (50% error rate)

---

## Business Impact

### Current User Experience (WITHOUT Fix)
1. User completes organization profile
2. Generates matches → Receives 10 "funding opportunities"
3. **5 out of 10 are NOT actual funding** (surveys + recruitment)
4. User wastes time reviewing irrelevant matches
5. User loses trust: *"Connect doesn't understand what funding is"*
6. User churns to competitor platforms

### Expected User Experience (WITH Fix)
1. User completes organization profile
2. Generates matches → Receives 4 genuine funding opportunities
3. **100% of matches are actual funding**
4. User saves time, only reviews relevant opportunities
5. User builds trust: *"Connect only shows REAL funding"*
6. User becomes paying subscriber

---

## Root Cause

**File**: `lib/scraping/worker.ts:186`
**Code**:
```typescript
announcementType: 'R_D_PROJECT',  // ❌ HARDCODED for ALL announcements
```

**Should be**:
```typescript
const announcementType = classifyAnnouncement({
  title: announcement.title,
  description: details.description || '',
  url: announcement.link,
  source: 'ntis',
});
```

---

## Evidence of Misclassification Impact

### Keywords Found in Misclassified Programs

| Program | Keyword | Pattern Match | Classification Logic |
|---------|---------|---------------|---------------------|
| 3, 4, 6, 8, 9 | "기술수요조사" / "수요조사" | `surveyPatterns` | Should be SURVEY |
| 5 | "연합 신규 구성원 추가 모집" | Exclusion pattern: `/(연합\|컨소시엄).*(구성원\|참여기업\|참여기관).*(모집\|선정)/` | Should be NOTICE |

### Match API Filtering (Currently Ineffective)

**File**: `app/api/matches/generate/route.ts:171`
**Filter**: `WHERE announcementType = 'R_D_PROJECT'`
**Current Result**: Shows all 10 programs (including 5 non-funding)
**Expected Result**: Should show only 4 programs (genuine funding)

**Why ineffective?** Because ALL programs have `announcementType = 'R_D_PROJECT'` due to hardcoding bug in worker.ts

---

## Recommended Action

1. ✅ **Phase 2**: Integrate `classifyAnnouncement()` into worker.ts (fixes future scraping)
2. ✅ **Phase 3**: Run `scripts/reclassify-all-programs.ts` (fixes existing 10 programs)
3. ✅ **Phase 4**: Create manual override script (handles user feedback)
4. ✅ **Verify**: Match API will automatically exclude non-R&D programs

**Expected Outcome**: 50% error rate → 0% error rate (based on classification.ts test coverage)
