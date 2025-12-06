# Implementation Plan: Matching Algorithm & Profile Completion UX Improvements (Updated v2)

## Context
Based on the review of Kim Byeong-eon (국립아시아문화전당) match results, we identified two key issues:
1. **Low-relevance matches being shown**: CULTURAL sector organization matched with quantum physics/science programs (scores 52-55)
2. **Empty profile fields affecting match quality**: `researchFocusAreas` and `keyTechnologies` are empty, limiting algorithm accuracy

## Scope
1. ✅ Improve matching algorithm (industry sector weighting + minimum relevance thresholds)
2. ✅ Improve profile completion UX (encourage filling researchFocusAreas and keyTechnologies)
3. ❌ NOT expanding program sources (per user decision - NTIS is sufficient)

---

## Part 1: Matching Algorithm Improvements

### 1.1 Raise Industry Compatibility Threshold + Lower CULTURAL→ICT Relevance
**Files:**
- `lib/matching/algorithm.ts` (line 212)
- `lib/matching/taxonomy.ts` (CROSS_INDUSTRY_RELEVANCE matrix)

#### 1.1.1 Raise Base Threshold (algorithm.ts)
**Current:**
```typescript
if (relevanceScore < 0.3) {
  continue; // Industry mismatch - fundamentally incompatible
}
```

**Change to:**
```typescript
if (relevanceScore < 0.4) {
  continue; // Industry mismatch - fundamentally incompatible
}
```

#### 1.1.2 Lower CULTURAL→ICT Relevance (taxonomy.ts)
**User Question:** Why is ICT not blocked? Won't ICT programs (like quantum physics) still match cultural organizations?

**Analysis:**
The current CULTURAL→ICT relevance is **0.8**, which was set based on the assumption that ICT relates to digital content, OTT, gaming, and streaming. However, the ICT category in NTIS also includes:
- 양자정보과학 (Quantum Information Science)
- 기초연구사업 (Basic Research Programs)
- 과학기술정보통신부 general R&D

These science-focused ICT programs are NOT relevant to cultural organizations.

**Solution:** Lower CULTURAL→ICT from 0.8 to **0.5**

**Current (taxonomy.ts line ~430):**
```typescript
CULTURAL: {
  ICT: 0.8, // Digital content, OTT, gaming, streaming
  ...
}
```

**Change to:**
```typescript
CULTURAL: {
  ICT: 0.5, // Reduced: only partially relevant (digital content overlap)
  ...
}
```

**Impact:**
- With threshold at 0.4 and CULTURAL→ICT at 0.5, ICT programs will still pass BUT with lower scores
- Combined with the minimum score threshold (1.2), most generic science ICT programs will be filtered
- Culture-specific ICT programs (like CT기반조성사업) will still match due to keyword bonuses

**Rationale:**
| Sector Pair | Current | New | Effect |
|-------------|---------|-----|--------|
| CULTURAL → ICT | 0.8 | 0.5 | Quantum physics programs get lower base scores |
| CULTURAL → BIO_HEALTH | 0.2 | 0.2 | Blocked (< 0.4 threshold) |
| CULTURAL → ENERGY | 0.2 | 0.2 | Blocked (< 0.4 threshold) |
| CULTURAL → CONTENT | 1.0 | 1.0 | Full match (unchanged) |

### 1.2 Add Minimum Score Threshold
**File:** `lib/matching/algorithm.ts` (around line 267)

**Current:** No minimum threshold - all matches shown

**Add after sorting, before slicing:**
```typescript
// Filter out low-quality matches (minimum threshold: 45 points)
const MINIMUM_MATCH_SCORE = 45;

return matches
  .filter(m => m.score >= MINIMUM_MATCH_SCORE)
  .sort((a, b) => {
    // existing sort logic
  })
  .slice(0, limit);
```

**Rationale:**
- Scores below 45 indicate poor fit (maximum possible without industry relevance: ~50)
- Prevents showing matches that are "technically eligible but poorly matched"
- Better user trust than showing irrelevant programs

### 1.3 Add Low-Relevance Warning in Explanations
**File:** `lib/matching/explainer.ts`

**Add new warning type for cross-industry matches with low relevance (0.3-0.5):**
```typescript
// Add to warning generation logic
if (industryRelevanceScore >= 0.4 && industryRelevanceScore < 0.6) {
  warnings.push('⚠️ 산업 분야 간접 연관 - 프로그램 세부 내용을 확인하세요.');
}
```

**Rationale:** Transparent communication when matches are cross-industry

### 1.4 Update CULTURAL Sector Keywords
**File:** `lib/matching/taxonomy.ts` (lines 221-242)

**Evidence Sources:**

1. **NTIS Search Results (2024-2025, 211 programs with "문화" keyword):**
   - Row 210: **[정책지정] 2025년 CT기반조성사업 신규과제** - Confirms "CT" is official terminology
   - Row 206: 글로벌 K-Culture 스타트업 혁신성장 기술개발 - "K-Culture" keyword
   - Rows 202-209: 문화체육관광 연구개발사업 programs

2. **Local Database funding_programs (culture-related, categories CONTENT/CULTURAL_HERITAGE):**
   - Keywords found: `문화`, `콘텐츠`, `미디어`, `엔터테인먼트`, `영상`, `문화콘텐츠`, `게임`, `K-콘텐츠`, `관광`, `체육`, `문화산업`, `Culture`
   - CULTURAL_HERITAGE: `문화재`, `유산`, `보존`, `문화유산`, `전통`, `고고학`, `문화재보존`, `유산관리`, `복원`, `전통문화`

**Current CULTURAL sector keywords (to verify in taxonomy.ts):**
```typescript
CULTURAL: {
  name: '문화/콘텐츠',
  keywords: ['문화', '콘텐츠', '문화산업', '문화예술', 'CULTURAL', 'CONTENT'],
  // ...
}
```

**Proposed update based on evidence:**
```typescript
CULTURAL: {
  name: '문화/콘텐츠',
  keywords: [
    // Existing
    '문화', '콘텐츠', '문화산업', '문화예술', 'CULTURAL', 'CONTENT',
    // Added based on NTIS CT기반조성사업
    'CT', '문화기술',
    // Added based on K-Culture programs
    'K-Culture', 'K-콘텐츠',
    // Added based on local DB keywords
    '문화체육관광', '미디어', '엔터테인먼트', '영상', '문화콘텐츠', '게임',
    // Cultural heritage
    '문화유산', '문화재', '전통문화'
  ],
  // ... existing subSectors
}
```

**Evidence for "CT" (Cultural Technology):**
- NTIS program title: "[정책지정] 2025년 **CT기반조성사업** 신규과제"
- Ministry: 문화체육관광부
- "CT" = Cultural Technology, official government R&D program category
- Source: https://www.ntis.go.kr/rndgate/eg/un/ra/mng.do (screenshot provided by user)

---

## Part 2: Profile Completion UX Improvements

### 2.1 Add researchFocusAreas to Profile Completion Calculator
**File:** `lib/profile/completion.ts`

**Current:** `researchFocusAreas` is NOT in the PROFILE_FIELDS array (only `keyTechnologies`)

**Add new field entry (after line 81):**
```typescript
{
  field: 'researchFocusAreas',
  label: '연구 분야',
  weight: 10,
  checkEmpty: (v) => !v || (Array.isArray(v) && v.length === 0),
},
```

**Note:** This will adjust total weights. May need to rebalance (reduce other weights slightly to keep 100% total)

### 2.2 Create Match Readiness Alert Component
**File:** `components/dashboard/MatchReadinessAlert.tsx` (NEW FILE)

**Purpose:** Show prominent alert when critical matching fields are empty

**Component Logic:**
```typescript
interface MatchReadinessAlertProps {
  organization: {
    keyTechnologies: string[];
    researchFocusAreas: string[];
    industrySector: string;
  };
}

// Show alert if:
// - keyTechnologies is empty OR
// - researchFocusAreas is empty
//
// CTA: "프로필 완성하기" → /dashboard/profile/edit
```

**Display Location:** Dashboard page (`app/dashboard/page.tsx`) - above the matches section

### 2.3 Improve Profile Creation Form Field Guidance
**File:** `app/dashboard/profile/create/page.tsx`

**Changes:**
1. Add helper text explaining importance for matching:
   ```
   "💡 연구 분야와 핵심 기술을 입력하면 더 정확한 연구 과제 매칭을 받을 수 있습니다."
   ```

2. Add example placeholders:
   - researchFocusAreas: "예: 문화유산 디지털화, 전시기술, K-Culture AI"
   - keyTechnologies: "예: AR/VR, 디지털 아카이빙, 콘텐츠 관리 시스템"

**Note:** Changed "펀딩 매칭" → "연구 과제 매칭" per user review

### 2.4 Add Inline Prompt in Profile Edit Page
**File:** `app/dashboard/profile/edit/page.tsx`

**Add conditional info box when fields are empty:**
```tsx
{(!organization.keyTechnologies?.length || !organization.researchFocusAreas?.length) && (
  <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 mb-6">
    <div className="flex items-start gap-3">
      <LightBulbIcon className="h-5 w-5 text-amber-600 mt-0.5" />
      <div>
        <h4 className="font-medium text-amber-800">매칭 품질을 높이세요</h4>
        <p className="text-sm text-amber-700 mt-1">
          연구 분야와 핵심 기술을 입력하면 귀사에 더 적합한 연구 과제를 추천받을 수 있습니다.
        </p>
      </div>
    </div>
  </div>
)}
```

**Note:** Changed "펀딩 프로그램" → "연구 과제" per user review

---

## Files to Modify

| # | File Path | Changes |
|---|-----------|---------|
| 1 | `lib/matching/algorithm.ts` | Raise threshold 0.3→0.4, add minimum score 45 |
| 2 | `lib/matching/explainer.ts` | Add cross-industry warning |
| 3 | `lib/matching/taxonomy.ts` | (1) Lower CULTURAL→ICT from 0.8→0.5, (2) Add evidence-based keywords: CT, 문화기술, K-Culture, 문화유산, etc. |
| 4 | `lib/profile/completion.ts` | Add researchFocusAreas to calculation |
| 5 | `components/dashboard/MatchReadinessAlert.tsx` | NEW: Alert component |
| 6 | `app/dashboard/page.tsx` | Import and render MatchReadinessAlert |
| 7 | `app/dashboard/profile/create/page.tsx` | Add helper text and examples |
| 8 | `app/dashboard/profile/edit/page.tsx` | Add inline prompt with "연구 과제" wording |

---

## Testing Plan

### Local Verification
1. **Algorithm Changes:**
   - Create test organization with CULTURAL sector
   - Run match generation and verify:
     - Quantum physics programs are filtered (relevance < 0.4)
     - Low score matches (< 45) are excluded
     - Cross-industry warnings appear in explanations

2. **Profile UX Changes:**
   - Verify MatchReadinessAlert appears when fields empty
   - Verify alert disappears when fields populated
   - Verify profile completion percentage increases with new fields

### Production Deployment
- After local verification, commit and push
- Monitor 국립아시아문화전당 matches after deployment
- Expected result: Fewer but more relevant matches

---

## Estimated Impact

**Before (Current State):**
- 국립아시아문화전당 sees 3 science/tech programs (52-55 scores)
- User confusion about match relevance

**After (Proposed):**
- Either no matches (if no cultural programs in NTIS) OR
- Higher relevance matches with CULTURAL-compatible programs
- Clear prompt to complete profile for better matching
- Transparent warning when cross-industry matches shown

---

## Rollback Plan

If match volume drops too significantly:
1. Reduce minimum score threshold from 45 to 40
2. Reduce industry compatibility threshold from 0.4 to 0.35
3. Keep profile UX changes (these are only beneficial)
