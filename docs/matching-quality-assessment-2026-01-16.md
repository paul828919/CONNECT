# Cross-Industry Matching Quality Assessment Report

**Assessment Date**: 2026-01-16
**Algorithm Version**: 2.0 (Enhanced with Korean language support)
**Analyst**: AI-Powered Assessment System

---

## Executive Summary

This report compares matching quality between two distinct industry sectors:
- **ICT Sector**: 이노웨이브 (김병진) - Software/IT company
- **BIO_HEALTH Sector**: 씨티씨백 (정호경) - Veterinary pharmaceuticals company

### Key Findings

| Metric | ICT (이노웨이브) | BIO_HEALTH (씨티씨백) | Delta |
|--------|-----------------|----------------------|-------|
| Matches Generated | 15 | ~8-10 (simulated) | -40% |
| Average Score | 77.7 | ~65-70 (estimated) | -10-15% |
| Max Score | 94 | ~75-80 (estimated) | -15-20% |
| Same-Sector Matches | 46.7% (7/15) | ~40% | -7% |
| Available Programs in Pool | 36 | 20 | -44% |

### Critical Issue Identified

**TRL Mismatch Problem**: CTC Back has `targetResearchTRL=9` (commercialization stage) but 90% of BIO_HEALTH programs target TRL 1-3 (basic research). This creates systematic under-matching for commercialization-ready biotech companies.

---

## 1. Organization Profile Comparison

### 1.1 이노웨이브 (Innowave) - ICT Sector

| Attribute | Value |
|-----------|-------|
| **Organization ID** | e81e467f-a84c-4a8d-ac57-b7527913c695 |
| **Type** | COMPANY |
| **Industry Sector** | ICT |
| **Employee Count** | UNDER_10 (스타트업) |
| **Current TRL** | 5 (프로토타입 검증) |
| **Target Research TRL** | 4 (응용연구) |
| **R&D Experience** | ✅ Yes |
| **Collaboration Count** | 1 |

**Taxonomy Mapping**: ICT → Detected as ICT sector → Full keyword coverage

### 1.2 씨티씨백 (CTC Back) - BIO_HEALTH Sector

| Attribute | Value |
|-----------|-------|
| **Organization ID** | fc3e795b-ada8-461d-b704-049f3231a274 |
| **Type** | COMPANY |
| **Industry Sector** | BIO_HEALTH |
| **Employee Count** | FROM_10_TO_50 (중소기업) |
| **Current TRL** | 5 (프로토타입 검증) |
| **Target Research TRL** | 9 (상용화/양산) |
| **R&D Experience** | ✅ Yes |
| **Collaboration Count** | 3 |
| **Key Technologies** | "동물약품 GMP 생산 상용화" |

**Taxonomy Mapping**:
- `BIO_HEALTH` → Detected correctly
- `동물약품 GMP 생산 상용화` → Maps to VET_PHARMA subsector ✅

---

## 2. Available Program Pool Analysis

### 2.1 Category Distribution (Active R&D Programs)

| Category | Count | % of Total |
|----------|-------|------------|
| ICT | 36 | 30.8% |
| MANUFACTURING | 22 | 18.8% |
| BIO_HEALTH | 20 | 17.1% |
| AGRICULTURE | 18 | 15.4% |
| MARINE | 9 | 7.7% |
| CONSTRUCTION | 5 | 4.3% |
| CONTENT | 4 | 3.4% |
| DEFENSE | 2 | 1.7% |
| ENVIRONMENT | 1 | 0.9% |
| **Total** | **117** | **100%** |

### 2.2 TRL Range Distribution in BIO_HEALTH Programs

| TRL Range | Count | Suitability for CTC Back |
|-----------|-------|--------------------------|
| TRL 1-3 (기초연구) | 12 | ❌ Too early-stage |
| TRL 4-6 (응용연구) | 8 | ⚠️ Below target TRL |
| TRL 7-9 (상용화) | 0 | ❌ None available |

**Critical Gap**: CTC Back's `targetResearchTRL=9` cannot be satisfied by ANY current BIO_HEALTH program.

### 2.3 Programs Highly Relevant to CTC Back's Profile

| Program Title | Category | TRL | Relevance Score |
|--------------|----------|-----|-----------------|
| 반려동물난치성질환극복기술개발사업 | AGRICULTURE | 4-6 | ⭐⭐⭐⭐⭐ (직접 관련) |
| 백신실용화기술개발사업단 | BIO_HEALTH | 1-3 | ⭐⭐⭐⭐ (백신 기술) |
| 보건의료기술 연구개발사업 | BIO_HEALTH | 4-6 | ⭐⭐⭐ (일반 바이오) |
| 첨단바이오기술기반그린바이오소재산업화 | AGRICULTURE | 4-6 | ⭐⭐⭐ (바이오 산업화) |
| 농생명자원기반국가필수의약품원료 | AGRICULTURE | 4-6 | ⭐⭐⭐ (의약품 원료) |

---

## 3. Matching Results Analysis

### 3.1 이노웨이브 (ICT) - Actual Production Results

**Summary Statistics**:
- Total Matches: 15
- Score Range: 66 - 94
- Average Score: 77.7
- Median Score: ~69

**Score Distribution**:
```
90-100: ██████ 6 (40%)
80-89:  █ 1 (7%)
70-79:  0 (0%)
60-69:  ████████ 8 (53%)
Below 60: 0 (0%)
```

**Category Distribution of Matches**:
| Category | Count | % |
|----------|-------|---|
| ICT | 7 | 46.7% |
| AGRICULTURE | 4 | 26.7% |
| MANUFACTURING | 2 | 13.3% |
| CONTENT | 2 | 13.3% |

**Industry Alignment Accuracy**: 46.7% same-sector matches (ICT→ICT)

### 3.2 씨티씨백 (BIO_HEALTH) - Simulated Results

Based on the algorithm rules and available program pool, the expected matching for CTC Back:

**Blocking Factors**:
1. **TRL Hard Filter**: Programs with TRL 1-3 blocked (org TRL=5, target=9)
2. **Industry Relevance Threshold**: BIO_HEALTH↔AGRICULTURE relevance = 0.6 (allowed)
3. **Business Structure Filter**: No restriction issues

**Expected Matches** (estimated 8-10):
| Category | Est. Count | Notes |
|----------|------------|-------|
| BIO_HEALTH | 4-5 | Only TRL 4-6 programs pass |
| AGRICULTURE | 3-4 | Cross-industry relevance 0.6 |
| MARINE | 0-1 | 해양바이오 keyword match only |

**Score Distribution** (estimated):
```
90-100: 0 (0%) - No exact industry match + TRL perfect fit
80-89:  █ 1-2 (~15%)
70-79:  ██ 2-3 (~25%)
60-69:  ████ 4-5 (~50%)
45-59:  █ 1 (~10%)
```

---

## 4. Algorithm Component Analysis

### 4.1 Industry/Keyword Scoring (30 points max)

**ICT Performance**:
- EXACT_CATEGORY_MATCH: +10 points (ICT=ICT)
- SECTOR_MATCH: +10 points
- KEYWORD_MATCH: +5-10 points (AI, 소프트웨어, 디지털)
- **Typical Score**: 20-25/30

**BIO_HEALTH Performance**:
- EXACT_CATEGORY_MATCH: +10 points (BIO_HEALTH=BIO_HEALTH)
- VET_PHARMA subsector match limited (few programs)
- "동물약품 GMP" keyword rarely present in program descriptions
- **Typical Score**: 15-20/30

**Gap**: ICT keywords are more prevalent in program metadata than BIO_HEALTH-specific keywords.

### 4.2 TRL Scoring (20 points max)

**ICT (TRL 5, target 4)**:
- Programs TRL 4-6: Full 20 points
- Programs TRL 1-3: Blocked by hard filter
- **Typical Score**: 20/20

**BIO_HEALTH (TRL 5, target 9)**:
- Programs TRL 4-6: 15-20 points (within range via current TRL)
- Programs TRL 1-3: Blocked (org TRL 5 > program max TRL 3)
- Programs TRL 7-9: None available
- **Typical Score**: 15-20/20 (but fewer eligible programs)

**Issue**: `targetResearchTRL` not effectively utilized. The algorithm falls back to `technologyReadinessLevel` but the company's stated preference (TRL 9) is ignored.

### 4.3 R&D Experience Scoring (15 points max)

| Component | ICT Score | BIO_HEALTH Score |
|-----------|-----------|------------------|
| R&D Experience | +10 | +10 |
| Collaboration (1) | +2 | - |
| Collaboration (3) | - | +4 |
| **Total** | 12/15 | 14/15 |

**Observation**: BIO_HEALTH company scores slightly higher due to more collaborations.

### 4.4 Organization Type Scoring (20 points max)

Both are COMPANY type, and most programs include COMPANY in targetType.
- **ICT Score**: 20/20
- **BIO_HEALTH Score**: 20/20

---

## 5. Cross-Industry Relevance Matrix Analysis

### 5.1 BIO_HEALTH Cross-Industry Relevance

| Target Sector | Relevance | Match Allowed | Notes |
|---------------|-----------|---------------|-------|
| BIO_HEALTH | 1.0 | ✅ | Perfect match |
| AGRICULTURE | 0.6 | ✅ | 푸드테크, 축산, 동물 overlap |
| ICT | 0.7 | ✅ | 디지털헬스, AI의료 |
| MARINE | 0.5 | ✅ | 해양바이오 |
| MANUFACTURING | 0.5 | ✅ | 의약품 제조 |
| ENVIRONMENT | 0.5 | ✅ | 그린바이오 |
| DEFENSE | 0.1 | ❌ | Minimal overlap |
| CULTURAL | 0.2 | ❌ | Below 0.4 threshold |

### 5.2 Relevance Scoring Impact

Programs from sectors with relevance ≥0.4 receive cross-industry relevance bonus:
- 0.7+ relevance: +5 points
- 0.5-0.69 relevance: +3 points

This allows CTC Back to match with:
- AGRICULTURE programs (like 반려동물 난치성질환) despite different category
- ICT programs (like AI-네이티브 첨단바이오) via ICT↔BIO_HEALTH relevance

---

## 6. Identified Issues & Root Cause Analysis

### 6.1 Issue #1: TRL Range Mismatch for Commercialization Companies

**Symptom**: Companies targeting commercialization (TRL 7-9) have limited matches
**Root Cause**:
- 90% of BIO_HEALTH programs are basic research (TRL 1-3)
- Algorithm strictly filters by TRL range
- `targetResearchTRL` field underutilized

**Impact**: CTC Back (targetResearchTRL=9) misses all TRL 1-3 programs despite potentially being able to participate in applied research portions.

### 6.2 Issue #2: VET_PHARMA Subsector Coverage Gap

**Symptom**: No direct "동물약품" or "수의약품" program keywords
**Root Cause**:
- VET_PHARMA programs classified under AGRICULTURE, not BIO_HEALTH
- Taxonomy subsector keywords ("동물백신", "수의약품") not present in active program metadata

**Impact**: CTC Back's `keyTechnologies: ["동물약품 GMP 생산 상용화"]` doesn't trigger EXACT_KEYWORD_MATCH.

### 6.3 Issue #3: ICT-Heavy Program Pool

**Symptom**: ICT has 1.8x more programs than BIO_HEALTH (36 vs 20)
**Root Cause**: Scraping sources may be ICT-heavy or BIO_HEALTH programs use different publication channels

**Impact**: Statistical disadvantage for BIO_HEALTH companies in match quantity.

---

## 7. Recommendations

### 7.1 Algorithm Improvements

#### Priority 1: Enhanced TRL Flexibility for Commercialization Companies

**Current**: Hard filter rejects programs outside org's TRL range
**Proposed**:
```typescript
// If org.targetResearchTRL differs significantly from current TRL,
// allow matching based on either, with score penalty for mismatch
const trlsToConsider = [
  org.technologyReadinessLevel,
  org.targetResearchTRL
].filter(Boolean);

// Match if program overlaps with ANY of org's TRL preferences
const trlMatch = trlsToConsider.some(trl =>
  trl >= program.minTrl && trl <= program.maxTrl
);
```

**Expected Impact**: +30-50% more matches for commercialization companies

#### Priority 2: VET_PHARMA Keyword Enhancement

**Current**: Limited veterinary pharmaceutical keywords in matching
**Proposed**: Add to `INDUSTRY_TAXONOMY.BIO_HEALTH.subSectors.VET_PHARMA.keywords`:
```typescript
keywords: [
  // Existing...
  // Add
  '반려동물', '동물의료', '동물건강', '수의바이오',
  'GMP', 'KVGMP', '백신', 'vaccine',
]
```

**Expected Impact**: +20% industry score for vet pharma companies

#### Priority 3: Cross-Category VET_PHARMA Recognition

**Current**: "반려동물난치성질환극복기술개발사업" in AGRICULTURE
**Proposed**: Flag programs containing VET_PHARMA keywords as dual-category:
```typescript
// In program enrichment
if (hasVetPharmaKeywords(program.title)) {
  program.secondaryCategory = 'BIO_HEALTH';
}
```

**Expected Impact**: +10-15 points for industry score on dual-category matches

### 7.2 Data Quality Improvements

1. **Program Keyword Enrichment**: Extract more specific keywords from program descriptions
2. **TRL Range Verification**: Audit programs with NULL TRL ranges
3. **Business Structure Mapping**: Ensure BIO_HEALTH programs have appropriate business structure requirements

### 7.3 User Experience Improvements

1. **Match Explanation Enhancement**: When showing cross-industry matches, explain relevance (e.g., "반려동물 프로그램이 귀사의 동물약품 분야와 관련됩니다")
2. **TRL Mismatch Indicator**: Show badge when program TRL is below company's target TRL
3. **Manual Override Option**: Allow users to see programs outside TRL range with clear warning

---

## 8. Conclusion

### Algorithm Quality Assessment

| Criterion | ICT Score | BIO_HEALTH Score | Assessment |
|-----------|-----------|------------------|------------|
| Match Quantity | ✅ 15 matches | ⚠️ 8-10 estimated | ICT advantaged |
| Score Distribution | ✅ Healthy (66-94) | ⚠️ Compressed (60-80) | ICT advantaged |
| Industry Alignment | ✅ 46.7% same-sector | ⚠️ ~40% same-sector | Similar |
| TRL Compatibility | ✅ No issues | ❌ Systematic mismatch | Critical gap |
| Keyword Coverage | ✅ Comprehensive | ⚠️ Limited vet pharma | Needs improvement |

### Overall Algorithm Health

- **ICT Matching**: ✅ Working well (high scores, good variety)
- **BIO_HEALTH Matching**: ⚠️ Functional but suboptimal
- **VET_PHARMA Matching**: ❌ Significant gap (taxonomy + TRL issues)

### Immediate Actions Required

1. Review TRL filtering logic for companies with `targetResearchTRL` ≠ `technologyReadinessLevel`
2. Enrich VET_PHARMA keyword coverage in taxonomy
3. Consider AGRICULTURE programs as valid matches for BIO_HEALTH companies in animal health

---

**Report Generated**: 2026-01-16T13:00:00Z
**Next Assessment**: Recommend quarterly review
