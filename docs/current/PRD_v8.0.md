# CONNECT – Product Requirements Document (PRD) v8.0

**Version:** 8.0 (Final Strategic Revision)
**Date:** 2025-10-08
**Status:** Production Ready - Strategic Pivot Complete
**Scope:** MVP Platform for Korea's R&D Commercialization Ecosystem

---

## Executive Summary

CONNECT transforms from a "grant discovery platform" to **Korea's complete R&D commercialization operating system**. The MVP focuses on **4 critical funding agencies** covering ~55% of Korea's R&D budget, with a hybrid software + services business model targeting **companies first** (research institutes as secondary supply-side).

**Key Strategic Changes in v8.0 (Final Revision):**
- **GTM Pivot**: Companies (primary paying customers) → Research institutes (supply-side for consortium matching)
- **Business Model**: Software + services hybrid (services provide immediate cash flow + defensible moat)
- **Pricing Update**: ₩49,000-69,000/month (sustainable) + services revenue (₩2-7M per engagement)
- **Data Moat**: Proprietary outcome tracking (win rates, cycle times) creates defensible competitive advantage
- **Compliance**: Off-budget services invoicing (legal compliance with R&D cost regulations)
- **Claims Discipline**: Honest expectations (200-500 active programs + 108K historical for patterns)

---

## 1. Product Vision & Strategy

### 1.1 Vision Statement
Enable Korean companies to efficiently discover, apply for, and win government R&D funding through intelligent matching, automated monitoring, and execution support services.

### 1.2 Strategic Positioning

**Primary Value Proposition:**
- **For Companies**: Complete R&D commercialization support (discovery → application → winning)
- **Vs. Manual Search**: Automated 4-agency monitoring + explainable matching
- **Vs. Generic AI** (ChatGPT ₩25,000/month): Verified Korean R&D data + outcome intelligence
- **Vs. Consultants**: Software enables scale + services provide expertise (hybrid advantage)

**Unique Moats:**
1. **Proprietary Outcome Data**: Win rates, cycle times, success patterns (competitors lack this)
2. **Services Layer**: Consultants can't scale software, SaaS can't deliver expertise (we do both)
3. **Network Effects**: More users → more outcome data → better matching
4. **Compliance**: Off-budget invoicing structure prevents customer audit risk

### 1.3 Target Market (Revised GTM)

**Primary Target: Companies (90% of revenue)**
- **Size**: 10,000+ SMEs seeking government R&D funding
- **Pain Point**: Don't know which grants exist, miss deadlines, low win rates (15-20%)
- **Budget Authority**: Can pay for software (₩49K-99K/month) + services (₩2-7M per project)
- **Peak Season**: January-March (80% of corporate funding announcements)
- **Initial Launch**: 50 beta users → 500 users → 1,000 users (if 70%+ retention)

**Secondary Target: Research Institutes (10% of revenue)**
- **Size**: 200+ institutes (95% founder network coverage)
- **Role**: Supply-side for consortium matching (not primary paying customers)
- **Value**: Free platform access in exchange for consortium partnership opportunities
- **Why Secondary**: Institutes don't need grant "discovery" (they have multi-year budgets)

**GTM Lesson Learned:**
Original PRD assumed research institutes would be primary customers (95% network = advantage). 
Reality: Research institutes don't pay for discovery (they already know their grants).
**Pivot**: Companies are primary paying customers. Use professor network for **company introductions**, not institute signups.

### 1.4 Revenue Model (Hybrid: Software + Services)

**Software Revenue (Subscription SaaS):**
- Pro: ₩49,000/month (companies, individual users)
- Team: ₩99,000/month (5 seats, for larger teams)
- Target: 140 paying users by Month 6 → ₩6.86M/month recurring

**Services Revenue (High-margin consulting):**
- Application review: ₩2-3M per project
- Certification planning: ₩3-5M per project
- Consortium formation: ₩3-5M per project
- TRL advancement consulting: ₩5-7M per project
- Target: 10 services engagements by Month 6 → ₩30-50M one-time

**Why Hybrid Model:**
1. **Immediate Cash Flow**: Services provide ₩25M+ revenue from Month 1 (vs. waiting for MRR buildup)
2. **Sustainable Pricing**: ₩49K-99K software pricing covers infrastructure costs
3. **Defensible Moat**: Competitors can't easily replicate services expertise
4. **Customer Success**: Services help customers win grants → positive outcome data → better matching
5. **Profitability**: Breaks even Month 1 (vs. Month 8+ with software-only model)

**Total Revenue Projection (Month 6):**
- Software: ₩6.86M/month (140 Pro/Team users)
- Services: ₩30-50M (10 engagements)
- **Total: ₩200M cumulative by Month 6**

---

## 2. User Personas (2 Core Types)

### 2.1 Company Users (기업) - PRIMARY PAYING CUSTOMERS

**Profile:**
- Seeking R&D funding for technology development and commercialization
- Business structure: 90% 법인 (Corporate), 10% 개인사업자 (Sole Proprietorship)
- Decision makers: R&D Directors, CEOs (small companies), Business Development Managers
- Budget authority: Can approve ₩49-99K/month software + ₩2-7M services

**Pain Points (Critical):**
1. **Discovery Problem**: Don't know which grants exist, scattered across 4+ agency websites
2. **Deadline Anxiety**: Miss opportunities due to poor tracking (50% of missed grants)
3. **Eligibility Confusion**: Complex requirements (TRL, certifications, revenue caps) hard to understand
4. **Low Win Rates**: 15-20% success rate (vs. 25-35% with proper support)
5. **Application Quality**: First-time applicants lack experience writing winning proposals
6. **Consortium Formation**: Can't find partners, or find wrong partners (mismatch)

**Primary Needs:**
1. Automated monitoring of 4 major agencies (save 10+ hours/month)
2. Simple eligibility matching (avoid wasting time on ineligible grants)
3. Deadline reminders (7-day, 3-day, 1-day alerts)
4. Application review services (increase win rate by 10-15 percentage points)
5. Partner introductions for consortium requirements

**Jobs to Be Done:**
- **Discover**: Find relevant grants without manual website checking
- **Qualify**: Understand if my company is eligible before applying
- **Apply**: Submit high-quality application with competitive advantage
- **Win**: Maximize selection probability through professional support
- **Track**: Know application status and outcomes

### 2.2 Research Institute Users (연구소) - SUPPLY-SIDE (FREE TIER)

**Profile:**
- Multi-year R&D budgets aligned to national priorities
- Types: Government-funded institutes (KIST, ETRI, etc.), private research centers
- Strong network advantage: 95% of founder's contacts

**Pain Points:**
- Finding industry partners for applied research and commercialization
- Tech transfer barriers (companies don't know institute capabilities)
- Matching with companies at appropriate TRL levels

**Value Proposition (Free Platform Access):**
- Discover companies seeking consortium partners
- Showcase research capabilities and technologies
- Connect with companies for joint R&D projects
- Access to applied research funding opportunities

**Why Free?**
Research institutes don't need grant "discovery" (they have multi-year government budgets).
Their value to Connect: Supply-side for consortium matching (companies need institutes as partners).
Platform facilitates both sides: Companies find grants → Companies find institute partners → Institutes get commercialization opportunities.

---

## 3. MVP Features (8-Week Launch Plan)

### Phase 1: Foundation (Weeks 1-2)

#### 3.1 User Registration & Profiles

**Company Profile Fields (10 Required):**
1. Company name (법인명/상호명)
2. Business registration number (사업자등록번호) - Encrypted AES-256-GCM
3. Business structure (법인/개인사업자)
4. Industry sector (산업 분야)
5. Employee count (직원 수)
6. Annual revenue range (연매출 범위)
7. R&D experience (Yes/No)
8. Technology readiness level (TRL 1-9)
9. Primary contact person
10. Email + phone

**Research Institute Profile Fields (10 Required):**
1. Institute name (기관명)
2. Registration number
3. Institute type (government/private)
4. Research focus areas (최대 3개)
5. Annual R&D budget range
6. Number of researchers
7. Key technologies (최대 5개)
8. Collaboration history (Yes/No)
9. Primary contact person
10. Email + phone

#### 3.2 Funding Match Engine (Enhanced with Sector Gates)

**Core Matching Logic (Rule-Based with Eligibility Gates):**

```javascript
function calculateMatch(organization, fundingProgram) {
  let score = 0;
  let explanation = [];
  let blockedReasons = [];
  let warningReasons = [];
  
  // === ELIGIBILITY GATES (PASS/FAIL) ===
  
  // Gate 1: Organization type
  if (organization.type !== fundingProgram.targetType && fundingProgram.targetType !== 'both') {
    return { 
      score: 0, 
      passesEligibility: false,
      blockedReasons: ["지원 대상이 아닙니다"] 
    };
  }
  
  // Gate 2: TRL range (strict)
  if (organization.trl < fundingProgram.minTRL - 2 || organization.trl > fundingProgram.maxTRL + 2) {
    blockedReasons.push(`TRL 범위 불일치: 귀사 TRL ${organization.trl}, 요구 TRL ${fundingProgram.minTRL}-${fundingProgram.maxTRL}`);
    return { score: 0, passesEligibility: false, blockedReasons };
  }
  
  // Gate 3: Sector-specific requirements
  if (fundingProgram.requiresISMS && !organization.hasISMSCert) {
    blockedReasons.push("ISMS-P 인증 필수 (미보유)");
    return { score: 0, passesEligibility: false, blockedReasons };
  }
  
  if (fundingProgram.requiresKC && !organization.hasKCCert) {
    blockedReasons.push("KC 인증 필수 (미보유)");
    return { score: 0, passesEligibility: false, blockedReasons };
  }
  
  // === SCORING (IF PASSES GATES) ===
  
  // Industry match (30 points)
  if (organization.industrySector === fundingProgram.targetIndustry) {
    score += 30;
    explanation.push("산업 분야가 과제 요구사항과 일치합니다");
  } else if (isSimilarIndustry(organization.industrySector, fundingProgram.targetIndustry)) {
    score += 15;
    explanation.push("유사 산업 분야입니다");
    warningReasons.push("산업 분야가 정확히 일치하지는 않습니다");
  }
  
  // TRL matching (20 points)
  if (organization.trl >= fundingProgram.minTRL && organization.trl <= fundingProgram.maxTRL) {
    score += 20;
    explanation.push(`기술 준비 수준(TRL ${organization.trl})이 과제 요구사항(TRL ${fundingProgram.minTRL}-${fundingProgram.maxTRL})과 완벽히 일치합니다`);
  } else if (Math.abs(organization.trl - fundingProgram.minTRL) <= 1) {
    score += 10;
    explanation.push(`TRL ${organization.trl}이 요구 범위에 근접합니다`);
    warningReasons.push("TRL 상향 필요 여부 검토 필요");
  }
  
  // Certifications (20 points)
  let certScore = 0;
  if (fundingProgram.requiresISMS && organization.hasISMSCert) {
    certScore += 10;
    explanation.push("ISMS-P 인증 보유 (필수 요건 충족)");
  }
  if (fundingProgram.requiresKC && organization.hasKCCert) {
    certScore += 10;
    explanation.push("KC 인증 보유 (필수 요건 충족)");
  }
  if (organization.hasISO9001) {
    certScore += 5;
    explanation.push("ISO 9001 인증 보유 (추가 가점)");
  }
  score += Math.min(20, certScore);
  
  // Budget fit (15 points)
  if (organization.revenueRange === fundingProgram.targetRevenueRange) {
    score += 15;
    explanation.push("예산 규모가 귀사에 적합합니다");
  }
  
  // R&D Experience (15 points)
  if (organization.hasRdExperience) {
    score += 15;
    explanation.push("R&D 경험 보유 (선정 가능성 향상)");
  } else {
    score += 7;
    explanation.push("R&D 경험 미보유 (첫 과제 신청 가능)");
  }
  
  return { 
    score, 
    explanation, 
    passesEligibility: true,
    blockedReasons,
    warningReasons
  };
}
```

**Match Display (Enhanced):**
- Show top 10 matches per user (increased from 3)
- Match score (0-100) with visual indicator
- Estimated win probability (future ML model)
- Korean explanation of why matched
- Eligibility status: ✅ Eligible / ⚠️ Warning / 🚫 Blocked
- Link to agency announcement page
- Deadline countdown with urgency indicator
- "Save for later" + "Dismiss" buttons
- CTA: "신청 준비하기" (Request application review service)

#### 3.3 Agency Monitoring (4 Agencies - Hybrid Approach)

**Covered Agencies:**
1. **IITP** (정보통신기획평가원) - ICT sector, ~15% of budget
2. **KEIT** (한국산업기술평가관리원) - Industrial tech, ~12% of budget
3. **TIPA** (중소기업기술정보진흥원) - SME support, ~8% of budget
4. **KIMST** (해양수산과학기술진흥원) - Maritime tech

**Hybrid Data Collection Strategy:**

**Primary Source: NTIS API**
- **Coverage**: 108,798+ R&D programs (historical + current)
- **Purpose**: Pattern analysis, success rate benchmarking, historical trends
- **Schedule**: Daily at 8:00 AM KST
- **Status**: Phase 1 complete, production key arriving Oct 14, 2025
- **Value**: "귀사와 유사한 조직의 평균 선정률: 38%" (powered by 108K historical programs)

**Secondary Source: Playwright Web Scraping**
- **Coverage**: 200-500 active calls from 4 agencies (realistic current opportunities)
- **Purpose**: Real-time announcement monitoring
- **Schedule**: 
  - Normal: 2x daily (9:00 AM, 3:00 PM KST)
  - Peak (Jan-Mar): 4x daily (9:00 AM, 12:00 PM, 3:00 PM, 6:00 PM KST)
- **Rate Limiting**: 10 requests/minute per agency

**CRITICAL: Honest Claims (No "100K+ programs" marketing)**
- Homepage: "국내 주요 4개 기관 최신 공고 200~500건 (매일 업데이트)"
- Subtext: "Plus: 역대 R&D 과제 108,000+ 건 성공 패턴 분석"
- Why: Honest expectations → higher retention (vs. overpromising → disappointment → churn)

#### 3.4 Email Notifications

**Notification Types:**
- New matching opportunity (within 1 hour of scraping, if score >60)
- Deadline reminder (7 days, 3 days, 1 day before)
- Weekly digest (Mondays 9am, summary of new opportunities)
- Outcome tracking reminder (after application deadline, request result update)

**User Controls:**
- Enable/disable notification types
- Set preferred notification time
- Minimum match score threshold (default: 60/100)
- Notification frequency (real-time, daily, weekly)

#### 3.5 Outcome Tracking System (Proprietary Data Moat)

**Purpose**: Create defensible competitive advantage through win rate intelligence

**Data Collection (Opt-in with PIPA Consent):**

Users voluntarily share:
1. **Application Status**: Applied (Yes/No), Application date
2. **Selection Result**: Won / Lost / Pending / Withdrawn
3. **Financial Data** (optional): Requested amount, Award amount
4. **Feedback**: Application difficulty (1-5), Match quality (1-5)

**Consent Requirements (PIPA Compliance):**
- ✅ Explicit checkbox: "Connect의 매칭 정확도 향상을 위해 과제 신청 결과 데이터를 공유합니다"
- ✅ Clear explanation: "귀사의 구체적인 데이터는 공개되지 않으며, 최소 5건 이상 집계된 통계로만 활용됩니다"
- ✅ Opt-out anytime: Users can revoke consent in settings

**Data Usage (Privacy-Preserving):**
- Aggregate statistics only (minimum 5 data points required)
- Example: "귀사와 유사한 산업(ICT) × TRL(7-8) 조직의 IITP 선정률: 38%"
- Example: "평균 심사 기간: 87일"
- Individual results NEVER disclosed

**Competitive Moat:**
- Competitors lack outcome data (only public announcement data)
- Connect's advantage compounds: More users → More outcome data → Better predictions
- Year 1: Basic win rate stats
- Year 2: ML models for win probability prediction
- Year 3: Recommend specific improvements to increase selection probability

### Phase 2: Execution Support (Weeks 3-4)

#### 3.6 Sector Gate Checklists (ISMS-P + KC)

**Purpose**: Prevent ineligible applications (save user time + increase platform credibility)

**ISMS-P Checklist (for SaaS/AI companies):**

16-item checklist mapped to KISA requirements:
```
정보보호 관리체계 (4 items):
☐ 정보보호 정책 수립
☐ 위험 관리 프로세스
☐ 내부 감사 체계
☐ 정보보호 책임자 지정

정보보호 대책 (12 items):
☐ 접근 통제
☐ 암호화
☐ 로그 관리
... (12 items total)
```

**Readiness Score Calculation:**
- Each item: 6.25 points (16 items × 6.25 = 100)
- Score 0-40: Not ready (6-12 months prep time)
- Score 40-70: Partially ready (3-6 months prep time)
- Score 70-85: Ready (minor gaps, 1-3 months)
- Score 85-100: Highly ready (apply immediately)

**CTA when score < 70:**
"ISMS-P 인증 계획 수립 서비스 (₩3-5M) - 3-6개월 내 인증 취득 지원"

**KC Checklist (for Hardware/IoT companies):**

Document preparation checklist:
```
필수 서류 (8 items):
☐ 제품 설명서
☐ 회로도 (PCB layout)
☐ 부품 리스트 (BOM)
☐ 사용자 매뉴얼
☐ 시험 성적서 (Test report)
☐ 공장 심사 준비 (Factory inspection readiness)
☐ KC 마크 적용 계획
☐ 적합성 선언서
```

**Testing Body Selection:**
- KTL (한국산업기술시험원) - Most common
- KCL (한국건설생활환경시험연구원) - Construction/building products
- KTC (한국기계전기전자시험연구원) - Mechanical/electrical products

**Readiness Score + Estimated Cost:**
- Score 0-40: Not ready, ₩5-10M + 3-6 months
- Score 40-70: Partially ready, ₩3-7M + 2-4 months
- Score 70-100: Ready, ₩2-5M + 1-2 months

#### 3.7 Procurement Readiness Calculator (공공조달 준비도)

**Purpose**: Help companies qualify for procurement-track funding (혁신제품 지정, 우수제품 선정)

**Scoring Model (0-100 points):**

1. **Product Maturity (30 points)**
   - TRL 9: 30 points (fully commercialized)
   - TRL 8: 20 points (system complete, tested)
   - TRL 7: 10 points (prototype demonstrated)
   - TRL <7: 0 points (not ready for procurement)

2. **Certifications (30 points)**
   - KC certification: 15 points
   - ISO 9001: 10 points
   - ISMS-P: 5 points (bonus for SaaS)

3. **Track Record (20 points)**
   - 3+ government R&D projects: 20 points
   - 1-2 projects: 10 points
   - 0 projects: 0 points

4. **Quality System (20 points)**
   - Product warranty (1+ years): 7 points
   - A/S infrastructure: 7 points
   - Technical support team: 6 points

**Gap Analysis Output:**

Example for company with 58/100 score:
```
총점: 58/100 - 부분적으로 준비됨

주요 갭:
1. TRL 상향 필요 (현재 TRL 7 → TRL 8+ 필요)
   - 해결 기간: 6-12개월
   - 예상 비용: ₩50-100M

2. KC 인증 미보유
   - 해결 기간: 3-6개월
   - 예상 비용: ₩5-10M

3. 정부 R&D 실적 부족 (0건 → 1건+ 필요)
   - 해결 기간: 1년
   - 비용: 과제 수행 비용

권장 조치:
1. 먼저 기술 개발 R&D 과제 신청 (TRL 상향)
2. KC 인증 취득 병행
3. 1-2년 후 공공조달 사업 신청
```

**CTA for Services:**
- "TRL 상향 컨설팅 서비스 (₩5-7M)"
- "인증 계획 수립 서비스 (₩3-5M)"

#### 3.8 Partner Discovery & Consortium Builder

**Search Capabilities:**
- Filter by organization type (company/institute)
- Filter by technology/industry
- Filter by TRL level (find partners at complementary TRL)
- Text search (Korean)
- View public profiles

**Contact Request:**
- Send introduction request with pre-filled templates
- Message: "안녕하세요, [과제명] 컨소시엄 구성을 위해 연락드립니다..."
- Response tracking dashboard
- Success rate: Track accepted vs. declined requests

**Basic Consortium Builder:**
- Create consortium project
- Assign roles: 주관기관 (Lead) / 참여기관 (Partner)
- Simple budget split calculator
- Export member list for application
- Track consortium formation success (outcome data)

### Phase 3: Subscription & Services (Weeks 5-6)

#### 3.9 Payment Integration (Toss Payments)

**Subscription Plans:**

| Plan | Monthly | Annual | Features |
|------|---------|--------|----------|
| **Free** | ₩0 | ₩0 | 10 matches/month, 4 agencies, basic alerts |
| **Pro** | ₩49,000 | ₩49,000/mo (₩588,000/year) | Unlimited matches, real-time alerts, sector gates, outcome data |
| **Team** | ₩99,000 | ₩99,000/mo (₩1,188,000/year) | Pro + 5 seats, consortium tools, priority support |

**Beta Pricing (First 50 users):**
- ₩4,900/month for first 30 days (promotional rate)
- After 30 days: Auto-upgrade to Pro (₩49,000/month) with 7-day advance notification
- Generates testimonials + early revenue

**Pricing Rationale:**
- ₩49,000/month = Sustainable (covers infrastructure + support)
- vs. ₩12,900 original: Too low, would require external funding
- vs. ₩25,000 (ChatGPT): Competitive for specialized Korean R&D data
- Break-even: ~50 Pro users (₩2.45M/month covers server + 1 developer)

**Toss Payments Implementation:**
- Billing key method for recurring subscriptions
- Auto-charge monthly on `subscriptions.nextBillingDate`
- Failed payment handling: 3 retries over 7 days → Downgrade to Free
- Tax invoice generation for corporate users (세금계산서)
- Webhook integration for real-time payment status updates

#### 3.10 Services Catalog & Engagement Management

**Service Types:**

1. **Application Review Service (₩2-3M)**
   - **Target**: Companies preparing to apply for grants
   - **Deliverables**:
     - Detailed review of 연구계획서 (research plan)
     - Scoring: Technology (40pts), Commercialization (30pts), Team (30pts)
     - 3-5 specific improvement recommendations
     - Re-review after revision (1 round included)
   - **Timeline**: 7-10 business days
   - **Success metric**: 10-15% win rate improvement

2. **Certification Planning (₩3-5M)**
   - **Target**: Companies needing ISMS-P or KC certification
   - **Deliverables**:
     - Gap analysis report
     - Implementation roadmap (Gantt chart)
     - Checklist of required documents
     - Vendor recommendations (testing bodies, consultants)
     - Budget estimate
   - **Timeline**: 2-3 weeks
   - **Success metric**: Client gets certified within 6 months

3. **Consortium Formation (₩3-5M)**
   - **Target**: Companies needing partners for joint R&D
   - **Deliverables**:
     - Partner search (5 qualified candidates)
     - Introduction facilitation (warm intros via network)
     - Consortium agreement template
     - Budget split recommendations
   - **Timeline**: 3-4 weeks
   - **Success metric**: Successful consortium formed

4. **TRL Advancement Consulting (₩5-7M)**
   - **Target**: Companies needing to progress from prototype to commercialization
   - **Deliverables**:
     - TRL assessment report
     - Technology development roadmap
     - Required validation tests
     - Commercialization strategy
   - **Timeline**: 4-6 weeks
   - **Success metric**: TRL increased by 1-2 levels within 12 months

**CRITICAL: Off-Budget Services Invoicing**

**Legal Requirement (국가연구개발사업 연구개발비 사용 기준):**
- Connect services are **business development costs** (사업개발비)
- **CANNOT** be included in government R&D project budgets (연구개발비)
- Must be invoiced separately from R&D project costs
- Must be paid from company's operating budget (운영비)

**MSA Terms (Service Agreement Clause):**
```
제4조 (서비스 비용 청구)
본 약관 제4조 제2항에 명시된 부가 서비스는 기업의 사업개발 비용으로 청구되며,
정부 R&D 과제 연구개발비 예산에 포함되지 않습니다.

법적 근거:
- 「국가연구개발사업 연구개발비 사용 기준」 (IITP 고시 제2025-02호)
- 연구개발비는 직접비(인건비, 연구재료비, 연구활동비 등)와 간접비로만 구성
- 일반 컨설팅 비용은 연구개발비 사용 기준에 포함되지 않음
```

**Why This Matters:**
- Protects customers from audit risk (과제비 부적정 집행)
- Prevents Connect legal liability (불법 용역 제공)
- Ensures sustainable business model (customers use company budget, not grant budget)

**Customer Communication:**
- Clearly explain during sales: "이 서비스는 귀사의 운영 예산으로 결제됩니다"
- Invoice separately from any R&D projects
- FAQ: "부가 서비스 비용은 R&D 예산에 넣을 수 있나요? → 아니요"

#### 3.11 Usage Analytics Dashboard

**User Metrics:**
- Matches viewed this month (vs. last month trend)
- Applications started (outcome tracking)
- Partner connections made
- Profile completeness score (0-100)
- Estimated win probability (based on similar organizations)

**Outcome Insights:**
- "귀사와 유사한 조직의 평균 선정률: 38%"
- "평균 심사 기간: 87일"
- "Most successful sectors: ICT (45%), Industrial tech (32%)"

---

## 4. Technical Architecture (Docker-Native)

### 4.1 Production Server Specifications

**Target Hardware:**
- CPU: Intel i9-12900K (16 cores / 24 threads)
- RAM: 128GB DDR4
- Storage: 1TB NVMe SSD
- Network: KT Broadband (164 Mbps up / 325 Mbps down)
- OS: Ubuntu 22.04 LTS

**Performance Targets:**
- Support 500-1,500 concurrent users
- API response time: < 500ms (P95)
- Match generation: < 3 seconds for top 10 results
- System uptime: > 99.9% during peak season (Jan-March) - **HOT STANDBY REQUIRED**

**Hot Standby (Peak Season Insurance):**
- **Why**: January-March = 80% of annual funding announcements, 27 hours downtime = 50+ users miss deadlines = brand destroyed
- **Setup**: Second i9-12900K server, PostgreSQL streaming replication (<5 min RPO), automated failover (<15 min RTO)
- **Cost**: ₩600K/month × 3 months = ₩1.8M (vs. ₩10-50M potential revenue loss)
- **ROI**: Prevents catastrophic failure during peak season

### 4.2 Database Schema (Enhanced)

**New Tables for Services & Outcomes:**

```sql
-- Grant Outcomes (Proprietary Data Moat)
CREATE TABLE grant_outcomes (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  funding_program_id UUID REFERENCES funding_programs(id),
  funding_match_id UUID REFERENCES funding_matches(id),
  
  -- Application tracking
  applied BOOLEAN DEFAULT FALSE,
  applied_date DATE,
  application_method VARCHAR(50),
  
  -- Result tracking
  result VARCHAR(20), -- 'won', 'lost', 'pending', 'withdrawn'
  decision_date DATE,
  
  -- Financial data (opt-in)
  requested_amount_krw BIGINT,
  award_amount_krw BIGINT,
  award_amount_shared BOOLEAN DEFAULT FALSE, -- User consent
  
  -- Calculated metrics
  cycle_days INTEGER, -- decision_date - applied_date
  
  -- User feedback
  difficulty_rating INTEGER CHECK (difficulty_rating BETWEEN 1 AND 5),
  match_quality_rating INTEGER CHECK (match_quality_rating BETWEEN 1 AND 5),
  feedback_text TEXT,
  
  -- Privacy consent (PIPA)
  allow_aggregate_analytics BOOLEAN DEFAULT FALSE,
  consent_given_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Privacy-preserving aggregate view
CREATE VIEW aggregate_success_patterns AS
SELECT 
  fp.agency_id,
  o.industry_sector,
  o.trl_level,
  COUNT(*) as total_applications,
  SUM(CASE WHEN go.result = 'won' THEN 1 ELSE 0 END) as wins,
  ROUND(AVG(go.cycle_days), 0) as avg_cycle_days
FROM grant_outcomes go
JOIN organizations o ON go.organization_id = o.id
JOIN funding_programs fp ON go.funding_program_id = fp.id
WHERE go.allow_aggregate_analytics = TRUE
GROUP BY fp.agency_id, o.industry_sector, o.trl_level
HAVING COUNT(*) >= 5; -- Minimum 5 data points

-- Services
CREATE TABLE services (
  id UUID PRIMARY KEY,
  service_type VARCHAR(50), -- 'application_review', 'certification', 'consortium', 'trl'
  name_korean VARCHAR(255),
  description TEXT,
  base_price_krw INTEGER,
  typical_duration_days INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Service Engagements
CREATE TABLE service_engagements (
  id UUID PRIMARY KEY,
  service_id UUID REFERENCES services(id),
  organization_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES users(id),
  
  status VARCHAR(20), -- 'requested', 'in_progress', 'delivered', 'completed', 'cancelled'
  agreed_price_krw INTEGER,
  
  project_description TEXT,
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  
  -- Payment
  invoice_number VARCHAR(50),
  payment_received_at TIMESTAMP,
  
  -- Feedback
  satisfaction_rating INTEGER CHECK (satisfaction_rating BETWEEN 1 AND 5),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sector Gate Checklists
CREATE TABLE sector_gate_checklists (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  
  -- ISMS-P checklist
  isms_checklist JSONB, -- Array of {id, item, completed}
  isms_readiness_score INTEGER DEFAULT 0,
  
  -- KC checklist
  kc_checklist JSONB,
  kc_readiness_score INTEGER DEFAULT 0,
  
  last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Procurement Readiness
CREATE TABLE procurement_readiness (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  
  total_score INTEGER DEFAULT 0 CHECK (total_score BETWEEN 0 AND 100),
  
  -- Score breakdown
  product_maturity_score INTEGER,
  certification_score INTEGER,
  track_record_score INTEGER,
  quality_system_score INTEGER,
  
  -- Gaps
  gaps JSONB, -- Array of {item, timeToResolve, costToResolve}
  
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4.3 CI/CD Infrastructure (Production Ready)

**Status:** ✅ **Complete** (October 15, 2025)  
**Architecture:** Industry-Standard Entrypoint Pattern (v4.0)  
**Achievement:** 87% faster deployments (35 min → 4 min), 75% code reduction  
**Security:** SSH key authentication (enterprise-grade)

**📚 Complete Documentation:**
- [START-HERE-DEPLOYMENT-DOCS.md](../../START-HERE-DEPLOYMENT-DOCS.md) - Deployment guide entry point
- [DEPLOYMENT-ARCHITECTURE-INDEX.md](../../DEPLOYMENT-ARCHITECTURE-INDEX.md) - Complete index
- [DEPLOYMENT-ARCHITECTURE-LESSONS.md](../../DEPLOYMENT-ARCHITECTURE-LESSONS.md) - Transformation story (788 lines)
- [DEPLOYMENT-DOCS-STATUS.md](../../DEPLOYMENT-DOCS-STATUS.md) - Documentation status

#### Automated Deployment Pipeline

**GitHub Actions Workflows (3):**

1. **CI Testing** (`.github/workflows/ci.yml`)
   - **Trigger:** Every pull request
   - **Duration:** 5-8 minutes
   - **Steps:**
     - TypeScript type checking
     - ESLint + Prettier code quality checks
     - Unit tests (Jest with coverage)
     - Security scanning (Trivy vulnerability scanner, npm audit)
     - Docker build verification
   - **Purpose:** Ensure code quality before merge

2. **Production Deployment** (`.github/workflows/deploy-production.yml`)
   - **Trigger:** Push to main branch
   - **Duration:** 3-4 minutes
   - **Architecture:** Entrypoint pattern (migrations inside containers)
   - **Steps:**
     - Build optimized Docker image with multi-stage caching
     - SSH to production server (key-based authentication)
     - Zero-downtime rolling update (app2 → app1)
     - Containers run migrations via entrypoint script on startup
     - Health checks on `/api/health` endpoint (validates migrations + app)
     - Automatic rollback on failure (30 seconds)
     - Cleanup old images
   - **Purpose:** Automated production deployment with self-contained containers

3. **PR Preview** (`.github/workflows/preview-deploy.yml`)
   - **Trigger:** Pull request creation/update
   - **Duration:** 2-3 minutes
   - **Steps:**
     - Build preview environment configuration
     - Run basic smoke tests
     - Comment deployment status on PR
   - **Purpose:** Preview changes before production

#### Deployment Flow

```
Developer Push → GitHub Actions → Automated Deployment → Production
     ↓                ↓                    ↓                  ↓
git push      CI Testing          Zero-downtime       Health Checks
              Security Scan       Rolling Update      Auto Rollback
              Build Images        SSH Deploy          Notifications
```

#### Required GitHub Secrets (7)

All secrets documented in `docs/guides/GITHUB-SECRETS-COMPLETE-SETUP.md`:

**Server Access:**
- `PRODUCTION_SERVER_IP` - Production server IP address
- `PRODUCTION_SERVER_USER` - SSH user account
- `PRODUCTION_SERVER_SSH_KEY` - SSH private key for authentication

**Application:**
- `JWT_SECRET` - JWT signing secret for authentication
- `NEXTAUTH_SECRET` - NextAuth.js session encryption

**Infrastructure:**
- `DB_PASSWORD` - PostgreSQL database password
- `GRAFANA_PASSWORD` - Grafana admin dashboard password

#### Performance Improvements

| Metric | Before (Manual) | After (Automated) | Improvement |
|--------|-----------------|-------------------|-------------|
| **Deployment Time** | 35 minutes | 4 minutes | **87% faster** |
| **Build Time** | 10 minutes | 3-4 minutes | **60% faster** |
| **Docker Image Size** | 1.2 GB | 850 MB | **29% smaller** |
| **Transfer Size** | 1.2 GB | 280 MB | **77% smaller** |
| **Authentication** | Password | SSH Key | **Enterprise security** |
| **Testing** | Manual | Automated | **100% coverage** |
| **Rollback Time** | 10 minutes | 30 seconds | **95% faster** |

**Monthly Time Saved:** ~10 hours
**Annual Value:** $6,000+ in developer productivity

#### Verification & Monitoring

**Pre-Deployment Scripts:**
```bash
./scripts/verify-github-actions.sh    # Complete system check
./scripts/test-ssh-connection.sh      # SSH connectivity test
./scripts/setup-github-secrets.sh     # Secrets configuration helper
```

**Post-Deployment Scripts:**
```bash
./scripts/verify-deployment.sh        # Health checks + endpoint testing
```

**Monitoring Endpoints:**
- `/api/health` - Application health status
- `/api/health/db` - Database connectivity
- `/api/health/redis` - Redis cache status
- GitHub Actions dashboard - Build/deploy status

#### Documentation (Complete)

**Setup Guides:**
- `GITHUB-ACTIONS-READY.md` - Quick start guide
- `docs/guides/GITHUB-SECRETS-COMPLETE-SETUP.md` - Secrets setup (5 min)
- `docs/guides/GITHUB-ACTIONS-TESTING.md` - Testing & verification
- `docs/guides/GITHUB-ACTIONS-GUIDE.md` - Comprehensive guide
- `QUICK-START-GITHUB-ACTIONS.md` - One-page reference

**Session Documentation:**
- `SESSION-53-AUTOMATION-COMPLETE.md` - Initial CI/CD setup
- `SESSION-53-CONTINUATION-COMPLETE.md` - Secrets & testing completion

#### Key Benefits

1. **Speed:** 87% faster deployments enable rapid iteration
2. **Reliability:** Automated testing catches issues before production
3. **Security:** SSH key authentication + automated security scans
4. **Consistency:** Same process every time, no human error
5. **Rollback:** 30-second automatic rollback on failure
6. **Visibility:** GitHub Actions dashboard shows all deployments
7. **Cost:** Zero infrastructure cost (GitHub Actions free tier sufficient)

#### Development Workflow

**Before CI/CD:**
1. Manual build (10 min)
2. Manual testing (10 min)
3. Manual deployment (10 min)
4. Manual verification (5 min)
**Total: 35 minutes**

**After CI/CD:**
1. `git push origin main` (10 seconds)
2. Watch GitHub Actions dashboard (4 min automated)
3. Verify with script (30 seconds)
**Total: 5 minutes** (user time: 1 minute)

---

## 5. Pricing Strategy (Revised)

### 5.1 Tier Structure

| Plan | Monthly | Annual | Target User |
|------|---------|--------|-------------|
| **Beta** | ₩24,500 | - | First 50 users (30-day promotional) |
| **Free** | ₩0 | ₩0 | Trial users (10 matches/month) |
| **Pro** | ₩49,000 | ₩49,000/mo | Active grant seekers (companies) |
| **Team** | ₩99,000 | ₩99,000/mo | Larger teams (5 seats) |

### 5.2 Feature Matrix

| Feature | Free | Pro | Team |
|---------|------|-----|------|
| **Matches/month** | 10 | Unlimited | Unlimited |
| **Agencies** | 4 | 4 | 4 |
| **Match explanations** | Basic | Detailed | Detailed + scoring |
| **Sector gates** | View only | Interactive | Interactive + consulting CTA |
| **Outcome data** | Limited | Full access | Full access + insights |
| **Procurement calculator** | No | Yes | Yes |
| **Partner search** | 5/month | 50/month | Unlimited |
| **Email notifications** | Weekly | Real-time | Real-time |
| **Support** | Community | Email <24h | Priority + phone |
| **Services discount** | 0% | 10% | 20% |

### 5.3 Revenue Projections (Revised)

**Month 3 Scenario:**
```
Software:
- Free tier:   50 users × ₩0      = ₩0
- Pro tier:    50 users × ₩49,000 = ₩2.45M
- Team tier:   10 users × ₩99,000 = ₩990K
- Total MRR: ₩3.44M

Services:
- 5 engagements × ₩3M avg = ₩15M (one-time)

Total Month 3: ₩3.44M (recurring) + ₩15M (services) = ₩18.44M
```

**Month 6 Scenario:**
```
Software:
- Free tier:  100 users × ₩0      = ₩0
- Pro tier:   120 users × ₩49,000 = ₩5.88M
- Team tier:   20 users × ₩99,000 = ₩1.98M
- Total MRR: ₩7.86M

Services:
- 10 engagements × ₩4M avg = ₩40M (one-time)

Total Month 6: ₩7.86M (recurring) + ₩40M (services) = ₩47.86M
Cumulative (Month 1-6): ~₩200M
```

**Year 1 Target:**
- Software MRR: ₩15-20M/month
- Services: ₩100-150M/year
- **Total ARR: ₩280-390M**

### 5.4 Break-Even Analysis

**Monthly Costs:**
- Infrastructure: ₩600K (server + backups)
- Founder salary: ₩0 (reinvest)
- Services COGS: 30% of services revenue (₩900K-1.5M)
- **Total: ₩1.5-2.1M/month**

**Break-Even:**
- Software only: 31 Pro users (₩1.52M) OR 16 Team users (₩1.58M)
- With services: Achieved Month 1 (₩25M services revenue far exceeds costs)

**Why Hybrid Model Works:**
- Services provide immediate cash flow (no waiting for MRR buildup)
- Software scales with low marginal cost
- Combined model is profitable from Day 1

---

## 6. Success Metrics & KPIs (Revised)

### 6.1 Acquisition Metrics

| Metric | Month 1 | Month 3 | Month 6 | Measurement |
|--------|---------|---------|---------|-------------|
| **Registered Users** | 50 | 110 | 240 | Cumulative signups |
| **Companies** | 45 | 100 | 220 | Company signups (90% target) |
| **Research Institutes** | 5 | 10 | 20 | Institute signups (10% target) |
| **Beta Conversion** | 80% | - | - | Beta → Paying |

### 6.2 Engagement Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Profile Completion** | >90% | Completed all 10 fields |
| **Weekly Active Users** | >70% | Logged in last 7 days |
| **Matches Viewed** | 5+ per user/week | Average views |
| **Match Quality Rating** | >4.0/5.0 | User rating |
| **Outcome Tracking Opt-in** | >60% | Users who share results |

### 6.3 Revenue Metrics

| Metric | Target (Month 3) | Target (Month 6) | Measurement |
|--------|------------------|------------------|-------------|
| **MRR (software)** | ₩3.4M | ₩6.9M | Monthly recurring revenue |
| **Services revenue** | ₩25M | ₩50M | One-time project fees |
| **ARPU (software)** | ₩49K | ₩49K | Avg revenue per user |
| **LTV** | ₩588K | ₩588K | Annual value per customer |
| **CAC** | ₩200K | ₩150K | Cost to acquire customer |
| **LTV/CAC ratio** | 2.9x | 3.9x | Must be >3x for sustainability |
| **Churn rate** | <8% | <5% | Monthly churn |

### 6.4 Outcome Metrics (Proprietary Data Moat)

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Outcome tracking rate** | >60% | Users who log application results |
| **Win rate (all users)** | 20-25% | % of applications that win |
| **Win rate (with services)** | 30-40% | Users who used application review |
| **Avg cycle time** | <90 days | Application → Decision |
| **Services satisfaction** | >4.5/5.0 | Post-engagement rating |

### 6.5 Operational Metrics

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| **API Response Time (P95)** | <500ms | >1s |
| **System Uptime** | 99.9% (Jan-Mar) | <99.5% |
| **NTIS API Success Rate** | >95% | <90% |
| **Match Generation Time** | <3 seconds | >5 seconds |
| **Database Connections** | <150 | >180 |
| **CPU Usage** | <70% | >85% |
| **Memory Usage** | <80% | >90% |

---

## 7. Go-to-Market Strategy (Revised)

### 7.1 Beta Launch (Week 8-9)

**Target:** 50 beta users (45 companies, 5 research institutes)

**Company Acquisition Strategy:**
1. **Professor Network (Primary)**
   - Email 50 research institute contacts
   - Request 2-3 **company introductions** per contact (not institute signups)
   - Target: 30-45 warm company leads
   - Two-step process: Build rapport → Request intro (not immediate ask)
   - Success rate: 50-60% (vs. 30% if asking immediately)

2. **Direct Outreach (Secondary)**
   - LinkedIn outreach to R&D directors at ICT companies
   - Webinar: "IITP R&D 지원사업 완전 정복" (30 attendees)
   - Beta user testimonials

**Beta Pricing:**
- ₩4,900/month for first 30 days (promotional)
- After 30 days: Auto-upgrade to Pro (₩49,000/month) with 7-day notice
- Generates early revenue + testimonials

**Success Criteria:**
- 70%+ weekly active usage
- 4.0+ average match quality rating
- 25%+ request services consultation
- <3 critical bugs reported

### 7.2 Public Launch (Week 10)

**Target:** 500 registered users by Month 4

**Marketing Channels:**

1. **Content Marketing (SEO)**
   - Blog: "2025 IITP 과제 신청 가이드"
   - Blog: "정부 R&D 과제 선정률을 높이는 5가지 방법"
   - Keywords: "정부 R&D 과제", "기업 연구개발 지원금", "IITP 공고"
   - Target: 100 users/month from organic search by Month 6

2. **Webinars (High-conversion)**
   - Monthly webinar: "정부 R&D 과제 완전 정복"
   - 30 attendees × 30% conversion = 9 users/webinar
   - Target: 2 webinars/month = 18 users/month

3. **Partnership (Startup Accelerators)**
   - SparkLabs, FuturePlay, Primer (3 partnerships)
   - Offer 50% discount for their portfolio companies
   - Target: 50 users from partnerships by Month 6

4. **Referral Program**
   - Give: ₩100,000 credit for successful referral
   - Get: Referred user gets Pro free for 1 month
   - Target: 20-30% of users refer at least 1 person

**Launch Pricing:**
- First 100 public users: ₩4,900/month for 30 days
- After 30 days: ₩49,000/month Pro pricing

### 7.3 Services GTM (Month 1+)

**Lead Generation:**
- In-app CTAs: "신청서 검토가 필요하신가요?"
- Email nurture: "귀사와 유사한 조직의 선정률: 38% → 검토 서비스로 50%+"
- Webinar upsell: Offer 20% discount to attendees

**Sales Process:**
1. **Discovery Call** (30 min): Understand customer need, grant timeline
2. **Proposal** (2 days): Custom quote (₩2-7M), deliverables, timeline
3. **Contract Signing** (1 week): MSA + off-budget invoicing explanation
4. **Kickoff** (1 week after payment): Project start
5. **Delivery** (1-4 weeks): Depends on service type
6. **Follow-up** (Post-delivery): Request outcome tracking, testimonial

**Conversion Funnel:**
- 1,000 Pro users → 100 consult requests → 30 proposals → 10 closed deals
- Conversion rate: 10% (request → close)
- Target: 10 services engagements by Month 6 = ₩30-50M

### 7.4 Expansion Gate (Month 4)

**Decision Point:** Expand to 1,000 users?

**Criteria:**
- ✅ 70%+ retention after 3 months
- ✅ NPS >50
- ✅ <5% monthly churn
- ✅ >₩10M/month revenue (software + services)
- ✅ <80% server resource utilization
- ✅ Positive unit economics (LTV/CAC >3x)

**If criteria met:**
- Increase marketing spend (₩5M/month)
- Hire: Full-stack developer (₩4-5M/month)
- Open public registration (no waitlist)
- Expand webinar frequency (2x/month → 4x/month)

**If criteria NOT met:**
- Focus on retention improvements
- Iterate on match quality
- Enhance services delivery quality
- Optimize pricing (A/B test ₩49K vs. ₩69K)

---

## 8. Risk Management & Mitigation

### 8.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Peak season infrastructure failure** | Medium (30%) | Critical | Hot standby server + 99.9% SLO + chaos day testing |
| **NTIS API changes/deprecation** | Low (10%) | High | Diversify with Playwright scraping + monitor API announcements |
| **Data breach (PIPA violation)** | Low (5%) | Critical | AES-256 encryption + explicit consent + annual security audit |
| **Payment processing failures** | Low (10%) | Medium | Toss Payments with retry logic + webhook monitoring |
| **Deployment errors / downtime** | ~~High~~ **Low (5%)** | Medium | **✅ MITIGATED:** GitHub Actions CI/CD with automated testing, rollback, health checks |

**Recent Risk Mitigation (October 14, 2025):**

**Deployment Risk - SIGNIFICANTLY REDUCED** through GitHub Actions CI/CD:
- **Before:** Manual deployments prone to human error (High probability, 40%)
- **After:** Automated CI/CD with safety checks (Low probability, 5%)
- **Mitigation Mechanisms:**
  - Automated testing before deployment (TypeScript, ESLint, Jest, security scans)
  - Zero-downtime rolling updates (app2 → app1)
  - Automatic health checks + 30-second rollback on failure
  - Consistent deployment process (no human error)
  - 87% faster deployments (35 min → 4 min) enable rapid bug fixes
- **Impact:** Reduces deployment-related downtime from ~10% to <1% of deployments

**Detailed Mitigation: Hot Standby**
- **Trigger**: Primary server hardware failure during Jan-March
- **Impact**: 27 hours downtime = 50+ users miss deadlines = brand destroyed
- **Mitigation**:
  - Hot standby server operational by Dec 31
  - Automated failover script (<15min RTO)
  - PostgreSQL streaming replication (<5min RPO)
  - PagerDuty 24/7 monitoring + SMS alerts
  - Weekly health checks during Jan-Mar
- **Cost**: ₩600K/month × 3 months = ₩1.8M
- **ROI**: Prevents ₩10-50M revenue loss from churn

### 8.2 Business Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Low conversion (Free→Pro)** | Medium (40%) | High | Free tier validation (10 matches/month) + outcome tracking + referral program |
| **High churn (poor match quality)** | Medium (30%) | High | Sector gates + TRL filtering + outcome feedback loop |
| **Pricing too low (unsustainable)** | Low (20%) | High | A/B test ₩49K vs ₩69K + services revenue supplements |
| **Research institute GTM failure** | High (60%) | Medium | Flip to companies-first GTM + professors for intros only |
| **Competitor with VC funding** | Medium (40%) | Medium | Services moat + outcome data moat + network effects |

**Detailed Mitigation: Low Free→Pro Conversion**
- **Trigger**: <20% conversion rate after 60 days
- **Impact**: Revenue projections miss by 30-40%
- **Mitigation**:
  - Increase free tier to 10 matches/month (was 3)
  - Show outcome data: "Users like you have 38% win rate"
  - Email nurture: Days 7, 14, 30 with success stories
  - Referral incentive: Get Pro free for 1 month per referral
- **Early warning**: Track conversion funnel weekly
- **Decision point**: If <25% by Week 8 → Increase free tier to 15 matches

**Detailed Mitigation: High Churn**
- **Trigger**: >10% monthly churn in first 3 months
- **Impact**: Negative word-of-mouth kills growth
- **Root cause**: Users apply to mismatched grants → rejected → blame Connect
- **Mitigation**:
  - Sector gates (ISMS-P, KC/EMC) prevent ineligible applications
  - TRL gates block applications >2 levels away
  - Show "Estimated win probability: 35%" (manage expectations)
  - Outcome tracking creates feedback loop
  - Offer application review service (₩2-3M) before they apply
- **Early warning**: NPS survey at 30 days
- **Decision point**: If NPS <30 → Pause growth, fix match quality

### 8.3 Competitive Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **VC-funded competitor launches** | Medium (40%) | High | Speed to market + proprietary outcome data |
| **NTIS builds their own matching** | Low (10%) | Critical | Services layer + user relationships |
| **Existing consultant pivots to platform** | Medium (30%) | Medium | Software + services hybrid (consultants can't scale software) |

**Detailed Mitigation: VC-Funded Competitor**
- **Scenario**: Competitor raises ₩500M-1B, launches at ₩29K/month (loss leader)
- **Their advantages**: More capital, larger team, aggressive marketing
- **Our advantages**:
  - 6-12 month head start (they need time to build)
  - Proprietary outcome data (win rates, cycle times) = moat
  - Services revenue funds operations (don't need VC)
  - Direct relationships with 50-100 beta customers
  - Network effects: More users → more outcome data → better matching
- **Counter-strategy**:
  - Build outcome data moat FAST (Month 1-6)
  - Focus on retention over acquisition (happy users don't switch)
  - Expand to services (competitors can't easily replicate)
  - Corporate partnerships create enterprise moat
- **When to worry**: If competitor announced funding >₩1B → Accelerate services expansion

---

## 9. Development Timeline

### Pre-MVP: NTIS API Integration

**Phase 1: Complete** (October 6, 2025)
- ✅ All implementation complete and production-ready
- ✅ Comprehensive testing and validation
- ✅ Documentation (1,100+ line roadmap)

**Phases 2-5: Scheduled** (October 14, 2025+ after production API key)
- Phase 2: Production key integration (15-20 min)
- Phase 3: Hybrid scheduler (2-3 hours)
- Phase 4: Monitoring (1.5-2 hours)
- Phase 5: Deployment (1-2 hours)

### GitHub Actions CI/CD: Complete (October 14, 2025)

**Achievement:** ✅ **Production-Ready Automated Deployment**

**Completed Infrastructure:**
- ✅ 3 GitHub Actions workflows (CI, Deploy, Preview)
- ✅ SSH key authentication (enterprise security)
- ✅ Zero-downtime rolling deployment
- ✅ Automatic health checks + rollback
- ✅ Security scanning (Trivy, npm audit)
- ✅ Complete documentation (11 files, 4 verification scripts)

**Performance Improvements:**
- Deployment time: 35 min → 4 min (**87% faster**)
- Build time: 10 min → 3-4 min (**60% faster**)
- Docker image: 1.2 GB → 850 MB (**29% smaller**)
- Transfer size: 1.2 GB → 280 MB (**77% smaller**)

**Documentation Created:**
- 6 setup & testing guides
- 4 verification scripts (`verify-github-actions.sh`, `test-ssh-connection.sh`, `setup-github-secrets.sh`, `verify-deployment.sh`)
- 2 session summaries (Session 53 Parts 1 & 2)
- Complete secrets configuration guide (all 7 secrets documented)

**Business Impact:**
- **Monthly time saved:** ~10 hours in developer productivity
- **Annual value:** $6,000+ (freed developer time)
- **Risk reduction:** Automated testing catches bugs before production
- **Deployment reliability:** 30-second automatic rollback on failure

**Strategic Value:**
- Enables rapid iteration during beta testing
- Reduces human error in deployment process
- Professional DevOps infrastructure from Day 1
- Zero additional infrastructure cost (GitHub Actions free tier)

This infrastructure achievement positions Connect for:
1. **Rapid beta iteration** (deploy fixes in 4 minutes vs. 35 minutes)
2. **Professional operations** (enterprise-grade CI/CD from launch)
3. **Scalable development** (team can deploy confidently)
4. **Competitive advantage** (faster feature velocity vs. competitors)

### 8-Week MVP Timeline (Revised)

**Weeks 1-2: Foundation + Sector Gates**
- User authentication & profiles
- Enhanced matching engine with eligibility gates
- Sector gate checklists (ISMS-P, KC)
- Procurement readiness calculator

**Weeks 3-4: Data Pipeline + Outcome Tracking**
- 4-agency scraping (NTIS API + Playwright)
- Content change detection
- Outcome tracking system (PIPA-compliant)
- Email notifications

**Weeks 5-6: Services + Monetization**
- Services catalog & engagement management
- Toss Payments integration
- MSA with off-budget invoicing clause
- Usage analytics dashboard
- Partner search & consortium tools

**Weeks 7-8: Polish + Launch**
- Bug fixes & optimization
- Hot standby setup
- Beta user onboarding (50 users)
- Production deployment
- First services engagement

---

## 10. Competitive Advantages (Updated)

### 10.1 Why Users Choose Connect

1. **Automated Monitoring** - vs. manual checking of 4 agency websites (saves 10+ hours/month)
2. **Explainable Matching** - vs. generic AI recommendations (users understand why matched)
3. **Outcome Intelligence** - "38% win rate for similar companies" (proprietary data)
4. **Execution Support** - Application review services increase win rate by 10-15%
5. **Sector Gates** - Prevent ineligible applications (save time + improve credibility)
6. **Korean-Optimized** - 사업자등록번호 verification, Korean UI/UX, local payment methods
7. **Cost Efficiency** - ₩49K vs. ₩25K (ChatGPT) for specialized Korean R&D data

### 10.2 Moats (Defensible Competitive Advantages)

**1. Proprietary Outcome Data Moat**
- Competitors only have public announcement data
- Connect tracks win rates, cycle times, success patterns (opt-in user data)
- Advantage compounds: More users → More outcome data → Better predictions
- Timeline: Basic stats (Year 1) → ML models (Year 2) → Prescriptive recommendations (Year 3)

**2. Services Moat**
- Pure SaaS competitors can't deliver consulting expertise
- Pure consultants can't scale software
- Connect does both: Software enables reach, services provide depth
- Services create customer success → Positive outcomes → Better data → Better matching

**3. Network Effects Moat**
- Companies need research institute partners (consortium requirements)
- Research institutes need industry partners (commercialization)
- Connect facilitates both sides (two-sided marketplace)
- More users → More partnership opportunities → Higher platform value

**4. Compliance Moat**
- Off-budget services invoicing (legal compliance)
- PIPA-compliant data collection (encrypted 사업자등록번호)
- Competitors who violate regulations face shutdown risk

**5. Execution Moat**
- 95% research institute network (founder relationships)
- 6-12 month head start vs. competitors
- Peak season infrastructure (hot standby) ensures reliability
- Docker-native deployment (rapid iteration)

---

## Conclusion

Connect v8.0 represents a **complete strategic revision** from "grant discovery platform" to **Korea's R&D commercialization operating system**. 

**Key Success Factors:**
1. **Companies-first GTM** (primary paying customers, not research institutes)
2. **Hybrid business model** (software + services = profitable Month 1)
3. **Proprietary outcome data** (defensible moat vs. competitors)
4. **Sector gates + procurement calculator** (execution support, not just discovery)
5. **Honest claims** (200-500 active programs + 108K historical patterns)
6. **Off-budget services invoicing** (legal compliance + customer protection)
7. **Hot standby infrastructure** (99.9% SLA during peak season Jan-March)

**Financial Trajectory:**
- **Month 1**: ₩28M (profitable immediately via services)
- **Month 3**: ₩18M/month (₩3.4M MRR + ₩15M services)
- **Month 6**: ₩48M/month (₩7.9M MRR + ₩40M services)
- **Cumulative Month 6**: ₩200M+ revenue
- **Break-even**: Month 1 (vs. Month 8+ with software-only)

**Next Steps:**
1. Complete 12-week accelerated implementation (Oct 9, 2025 → Jan 1, 2026)
2. Beta launch Week 8: 5-10 companies, expand to 20-30 by Week 9
3. First services engagement (₩2-5M) during beta period
4. Public launch: January 1, 2026 (Peak season timing)
5. Expansion gate: 1,000 users if 70%+ retention after 3 months

**Implementation Plan:**
- **Master Progress Tracker**: See `docs/plans/progress/MASTER-PROGRESS-TRACKER.md` (Complete status Oct 9 → Jan 1, 2026)
- **Detailed Execution Plan**: See `docs/plans/EXECUTION-PLAN-MASTER.md` for day-by-day tasks
- **Progress Tracking**: See `docs/plans/progress/` for daily completion logs
- **Current Status**: See `IMPLEMENTATION-STATUS.md` at project root
- **Timeline**: 12 weeks from Oct 9, 2025 → Jan 1, 2026 launch

**Critical Milestones:**
- Week 1-2 (Oct 9-22): Hot Standby Infrastructure (99.9% SLO capability)
- Week 3-4 (Oct 23-Nov 5): AI Integration (Claude Sonnet 4.5)
- Week 5-6 (Nov 6-19): Load Testing + Security Hardening
- Week 7-10 (Nov 20-Dec 17): 4-Week Beta Testing + Code Freeze
- Week 11-12 (Dec 18-31): Final Testing + Launch Preparation
- **Jan 1, 2026 00:00 KST**: Public Launch 🚀

**This is not a grant discovery tool. This is Korea's R&D commercialization operating system.**

---

**Document Status:** Final Strategic Revision - Implementation in Progress
**Next Review:** Week 10 Code Freeze (Dec 11, 2025) for GO/NO-GO decision
**Target Launch:** January 1, 2026 00:00 KST (Peak Season Aligned)

*End of PRD v8.0 - Final Strategic Revision*
/