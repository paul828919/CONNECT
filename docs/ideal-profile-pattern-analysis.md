# Ideal Applicant Profile — Pattern Analysis

**Date**: 2026-01-31
**Source**: Empirical analysis of 51 R&D programs (20 ministries) + 50 SME programs (10 bizTypes)
**Scripts**: `scripts/analyze-rd-announcement-patterns.ts`, `scripts/analyze-sme-announcement-patterns.ts`

---

## Executive Summary

Current matching algorithms (R&D v4.4, SME v2.0) miss **7 major signal categories** that are present in 78-86% of R&D announcements and 42-74% of SME announcements. These signals describe the **ideal applicant profile** — the type of organization the government program is designed for — but are not captured by field-to-field comparison.

**Key finding**: 49 of 51 R&D programs and all 50 SME programs contain ideal applicant signals that current matching ignores entirely.

---

## Pattern Categories Discovered

### 1. Organizational Stage Expectations

**R&D Prevalence**: 86% of programs (44/51)
**SME Prevalence**: 32% of programs (16/50)

Programs signal what maturity level they expect from applicants:

| Signal | R&D Count | SME Count | Example |
|--------|-----------|-----------|---------|
| BASIC_RESEARCH | 31 (61%) | — | 기초연구, 원천기술 |
| APPLIED_RESEARCH | 26 (51%) | — | 응용연구, 시제품, 파일럿 |
| COMMERCIALIZATION | 81 (159%*) | — | 상용화, 사업화, 양산, 수출 |
| PRE_STARTUP | — | 4 (8%) | 예비창업, 창업 준비 |
| EARLY_STARTUP | — | 3 (6%) | 초기창업, 3년 미만 |
| GROWTH_STAGE | — | 9 (18%) | 성장기, 도약, 스케일업 |
| MATURE | — | 8 (16%) | 재도약, 안정, 경쟁력 강화 |

*\*Programs frequently mention multiple stages; count > 100% indicates high density.*

**Impact on Matching**: A basic research program (원천기술) should NOT score the same for a commercialization-ready company as it does for a research lab. Current algorithm has zero awareness of this.

### 2. Technology Maturity Signals (Beyond TRL Numbers)

**R&D Prevalence**: TRL fields exist but text adds context

While R&D programs have `minTrl`/`maxTrl` fields, the text reveals:
- **Stage-specific context**: TRL 4 for drug development (임상 1상) vs TRL 4 for manufacturing (시제품 제작) are fundamentally different requirements
- **Ideal center point**: Programs with TRL 1-9 range actually target TRL 4-6 based on description language
- **Technology readiness vs organizational readiness**: A program might accept TRL 3 technology but expect the organization to have commercialization capability

**SME Impact**: SME programs have no TRL field at all, but `기술` bizType programs specifically target technology-based companies with R&D capabilities.

### 3. Domain Specificity Within Industries

**R&D Prevalence**: 86% (44/51)
**SME Prevalence**: 74% (37/50)

This is the **highest-impact gap**. Current matching classifies programs into broad industries (BIO_HEALTH, ICT, etc.) but misses critical sub-domain differentiation:

**R&D Sub-domain Examples**:
| Broad Industry | Sub-domains Discovered | Current Algorithm |
|---------------|----------------------|-------------------|
| BIO_HEALTH | DRUG_DEVELOPMENT, MEDICAL_DEVICE, DIGITAL_HEALTH, VETERINARY, FOOD_SAFETY | All treated as same "BIO_HEALTH" |
| ICT | AI_ML, CYBERSECURITY, SEMICONDUCTOR, QUANTUM | All treated as same "ICT" |
| ENERGY | HYDROGEN, NUCLEAR, RENEWABLE, CARBON_NEUTRAL | All treated as same "ENERGY" |
| MANUFACTURING | ROBOTICS, MATERIALS, SPACE, DEFENSE | All treated as same "MANUFACTURING" |

**Concrete Example**: 보건복지부 programs show CLINICAL_TRIAL(134 mentions), DRUG_DEVELOPMENT(28), while 식품의약품안전처 shows FOOD_SAFETY(26), VETERINARY(13). An AI/데이터 company would incorrectly match both equally under current BIO_HEALTH classification.

**SME Sub-domain Examples**:
- `수출` bizType programs split into: manufacturing export, cultural content export, logistics/trade
- `기술` bizType programs split into: tech commercialization, certification support, R&D funding
- `창업` bizType programs split into: pre-startup (예비창업), early startup (초기), growth (도약)

### 4. Financial Profile Expectations

**R&D Prevalence**: 47% (24/51)
**SME Prevalence**: Minimal in text (captured by structured codes for 6% of programs)

| Signal | Count | Description |
|--------|-------|-------------|
| MATCHING_FUND | R&D: present | 대응자금, 자부담 required |
| REVENUE_REQUIREMENT | R&D: present | Revenue threshold for eligibility |
| INVESTMENT_RECEIVED | R&D: present | Prior investment expected |
| LARGE_SCALE | R&D: present | 억-level project budgets |
| POLICY_FUND | SME: 4 (8%) | 정책자금, 융자, 저리 |
| SURVIVAL | SME: 10 (20%) | 경영 안정, 운영자금 |

**Impact**: Programs requiring 대응자금 (matching funds) implicitly require companies with revenue capacity. A pre-revenue startup cannot provide matching funds, but current algorithm treats all organizations equally.

### 5. Collaboration/Consortium Expectations

**R&D Prevalence**: 76% (39/51)
**SME Prevalence**: Low (SME programs are typically solo applicant)

| Signal | Count | Description |
|--------|-------|-------------|
| CONSORTIUM_REQUIRED | 32 (63%) | 컨소시엄, 공동연구, 산학연 |
| INDUSTRY_ACADEMIA | 19 (37%) | 산학협력, 대학-기업 연계 |
| SOLO_ELIGIBLE | 31 (61%) | 단독 수행/신청 가능 |

**Key Insight**: 63% of R&D programs require consortium formation. This is a major organizational capability signal — companies that can lead consortiums are fundamentally different applicants than those who can only participate. Current algorithm ignores this completely.

### 6. Regional Requirements Beyond Geography

**R&D Prevalence**: 69% (35/51)
**SME Prevalence**: 38% have region codes; 18% mention LOCAL_ROOTS in text

| Signal | R&D Count | SME Count |
|--------|-----------|-----------|
| NON_METROPOLITAN | 31 (61%) | — |
| SPECIFIC_REGION | 19 (37%) | 19 (38%) coded |
| TECHNOPARK | Present | — |
| LOCAL_ROOTS | — | 9 (18%) |

**Impact**: Current algorithm handles basic region matching (수도권 vs 비수도권), but misses:
- **Research cluster proximity** (대전 연구단지, 판교 ICT 클러스터)
- **Local government co-funding** (지방 programs often require local 소재지)
- **Regional innovation hubs** (테크노파크 연계)

### 7. Implicit Competency Requirements

**R&D Prevalence**: 78% (40/51)
**SME Prevalence**: 54% (27/50)

These are the **most commonly missed signals** — requirements embedded in text but not captured in structured fields:

**R&D Competency Signals**:
| Competency | Prevalence | Example Programs |
|-----------|-----------|-----------------|
| TRACK_RECORD | 38 (75%) | 수행실적, 수행 경험 |
| RESEARCH_INFRA | 32 (63%) | 연구시설, 연구장비, 실험실 |
| CLINICAL_TRIAL | 질병관리청 134 mentions | 임상시험, IND, IRB |
| PATENT | 28+ programs | 특허, 지식재산, IP |
| ISO_CERT | 15+ programs | ISO, 국제인증 |
| EXPORT_CAPABILITY | 21+ programs | 수출, 해외 진출, 글로벌 |
| SECURITY_CLEARANCE | 7+ programs | 보안 과제, 비밀 취급 |

**SME Competency Signals**:
| Competency | Prevalence | Example Programs |
|-----------|-----------|-----------------|
| TECHNOLOGY_BASED | 7 (14%) | 기술 기반, 기술형 기업 |
| INNOVATION_CERT | 6 (12%) | 이노비즈, 벤처기업 인증 |
| LOCAL_ROOTS | 9 (18%) | 지역 소재 기업 |
| YOUTH | 4 (8%) | 청년 창업, 39세 이하 |
| IP_REQUIRED | 2 (4%) | 특허, 지재권 보유 |
| SOCIAL_ENTERPRISE | 3 (6%) | 사회적 기업, 소셜벤처 |
| EXPORT_EXPERIENCE | 1 (2%) | 수출 실적 보유 |

### 8. Program Intent / Desired Outcomes

**R&D Prevalence**: 86% (44/51)
**SME Prevalence**: 42% (21/50)

**R&D Outcome Signals**:
| Outcome | Prevalence | Description |
|---------|-----------|-------------|
| SOCIAL_IMPACT | 37 (73%) | 사회적 가치, 공공, 국민 안전 |
| TECHNOLOGY_TRANSFER | 33 (65%) | 기술이전, 기술실시, 라이선스 |
| PAPERS | 41 (80%) | 논문, SCI, 학술 |
| COMMERCIALIZATION | 81 (159%) | 상용화, 사업화, 매출 |
| STANDARD_SETTING | 30 (59%) | 표준, 표준화, 국제표준 |
| JOB_CREATION | 28 (55%) | 일자리, 고용, 인력양성 |
| EXPORT | 15 (29%) | 수출, 해외시장 진출 |

**SME Outcome Signals**:
| Outcome | Prevalence | Description |
|---------|-----------|-------------|
| TECH_COMMERCIALIZATION | 8 (16%) | 사업화, 제품화, 시제품 |
| JOB_CREATION | 5 (10%) | 일자리, 고용, 채용 |
| SURVIVAL | 10 (20%) | 경영 안정, 운영자금 |
| EXPORT_GROWTH | 2 (4%) | 수출 증가, 해외 진출 |

**Impact**: A company focused on 논문 (papers) is a fundamentally different ideal applicant than one focused on 수출 (exports), even within the same industry. Current algorithm treats them identically.

---

## Data Availability Summary

### R&D Programs
| Source | Fill Rate | Signal Value |
|--------|-----------|-------------|
| title | 100% | Medium (keywords, ministry inference) |
| description | ~95% | **High** (most signals come from here) |
| eligibilityCriteria (JSON) | ~80% | Medium (structured but sparse) |
| keywords | ~90% | Medium (pre-classified) |
| attachments | ~60% | **Very High** (full announcement text) |
| Structured fields (TRL, certifications, etc.) | 40-80% | Medium |

### SME Programs
| Source | Fill Rate | Signal Value |
|--------|-----------|-------------|
| bizType/bizTypeCd | 100% | High (primary differentiator) |
| description | 100% | **Highest** (92% of text signals come from here) |
| supportTarget | 100% | Low (very short, avg 4 chars) |
| supportContents | 10% | Medium (when available) |
| detailPageText | 6% | Medium (when available) |
| Structured eligibility codes | **6%** | High (when available, but rarely available) |
| targetRegions | 38% | Medium |

**Critical Finding**: 94% of SME programs have NO structured eligibility codes. The ideal applicant profile must be derived almost entirely from text analysis (description, supportTarget, detailPageText).

---

## Ideal Profile Dimensions (Draft)

Based on the patterns discovered, the IdealApplicantProfile should capture:

### Structured Dimensions (Deterministic Comparison)
1. **organizationType**: COMPANY, RESEARCH_INSTITUTE, STARTUP, etc.
2. **companyScaleRange**: preferred and acceptable scale ranges
3. **businessAgeRange**: min/max years, preferred stage
4. **trlRange**: min/max/idealCenter
5. **programStage**: BASIC_RESEARCH → APPLIED → COMMERCIALIZATION
6. **revenueExpectation**: minimum revenue or "no requirement"
7. **requiredCertifications**: hard requirements (GMP, ISO, 벤처인증)
8. **preferredCertifications**: soft preferences (이노비즈, 특허)
9. **regionRequirement**: NATIONWIDE / NON_METROPOLITAN / SPECIFIC
10. **collaborationExpectation**: SOLO / CONSORTIUM_LEAD / MEMBER / ANY

### Semantic Dimensions (Proximity/Distance Comparison)
11. **primaryDomain**: specific sub-field (e.g., DRUG_DEVELOPMENT not just BIO_HEALTH)
12. **subDomains[]**: related sub-fields
13. **technologyKeywords[]**: specific technology terms
14. **expectedCapabilities[]**: what org should be able to do (임상시험, 양산, 수출)
15. **desiredOutcomes[]**: what government wants (논문, 상용화, 일자리)
16. **supportPurpose[]**: SME-specific: what kind of support (정책자금, 수출지원, 기술개발)

### Metadata
17. **confidence**: 0.0-1.0 overall profile confidence
18. **generatedBy**: RULE / LLM / HYBRID
19. **sourceTextLength**: how much text was available for analysis
20. **dimensionConfidence**: per-dimension confidence levels

---

## Ministry-Level Patterns

Each ministry has distinct ideal applicant archetypes:

| Ministry | Programs | Key Signals | Ideal Applicant Archetype |
|----------|----------|-------------|--------------------------|
| 보건복지부 | 3 | CLINICAL_TRIAL(134), CONSORTIUM | Bio/pharma companies with clinical trial capability |
| 식품의약품안전처 | 3 | FOOD_SAFETY(26), DRUG_DEV(27) | Drug/food safety companies, regulatory expertise |
| 질병관리청 | 3 | CLINICAL_TRIAL(45), PAPERS(24) | Infectious disease researchers with clinical access |
| 국토교통부 | 3 | HYDROGEN(10), CARBON_NEUTRAL | Construction/transport with green tech capability |
| 산림청 | 3 | CONSORTIUM(3/3), SOLO(3/3) | Forestry research with both solo and consortium capability |
| 중소벤처기업부 | 3 | STARTUP_FOCUSED(3/3), TRACK_RECORD | Tech startups with commercialization track record |
| 방위사업청 | 2 | SECURITY_CLEARANCE, TRACK_RECORD | Defense contractors with security clearance |

---

## Next Steps

1. **Phase 2**: Define `IdealApplicantProfile` TypeScript interface based on these 20 dimensions
2. **Phase 3**: Build hybrid rule+LLM generator that extracts these profiles from program data
3. **Phase 4**: Implement proximity scoring that compares org profiles against ideal profiles
4. **Phase 5**: A/B test against current algorithm to measure quality improvement
