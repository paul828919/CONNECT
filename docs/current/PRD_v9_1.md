# CONNECT – Product Requirements Document (PRD) v9.1

**Version:** 9.1 (Claude Code Optimized)
**Date:** 2025-12-09
**Status:** Production Ready - Launch Imminent (December 12, 2025)
**Scope:** MVP Platform for Korea's R&D Commercialization Ecosystem

---

## Document Purpose

This PRD defines **what to build** for Connect. For implementation details on **how to build**, refer to:
- `CLAUDE.md` - Code style, commands, workflow rules
- `prisma/schema.prisma` - Database schema (SOURCE OF TRUTH)
- `docs/implementation/` - Phase-specific technical documentation

---

## Executive Summary

CONNECT transforms from a "grant discovery platform" to **Korea's complete R&D commercialization operating system**. The MVP focuses on **4 critical funding agencies** covering ~55% of Korea's R&D budget, with a hybrid software + services business model targeting **companies first** (research institutes as secondary supply-side).

### Key Strategic Updates in v9.1

| Area | Status | Details |
|------|--------|---------|
| Launch Date | December 12, 2025 | Peak Season Aligned |
| Project Completion | 90% | Final testing in progress |
| CI/CD Infrastructure | 100% Complete | GitHub Actions, zero-downtime |
| Production Server | Live | connectplt.kr (blue-green deployment) |
| Security | Enterprise-grade | 19 GitHub Secrets, SSH key auth |
| AI Integration | Complete | Claude Sonnet 4.5 for match explanations |

### Business Model Summary

- **Primary Revenue**: Companies (90%) - ₩49,000-99,000/month subscriptions
- **Secondary Revenue**: Services (₩2-7M per engagement)
- **Data Moat**: Proprietary outcome tracking (win rates, cycle times)
- **Compliance**: Off-budget services invoicing (PIPA compliant)

---

## 1. User Personas

### 1.1 Company Users (기업) - PRIMARY PAYING CUSTOMERS

**Profile:**
- Seeking R&D funding for technology development
- Business structure: 90% 법인 (Corporate), 10% 개인사업자 (Sole Proprietorship)
- Decision makers: R&D Directors, CEOs, Business Development Managers
- Budget authority: ₩49-99K/month software + ₩2-7M services

**Pain Points:**
1. Discovery Problem: Scattered across 4+ agency websites
2. Deadline Anxiety: Miss opportunities due to poor tracking
3. Eligibility Confusion: Complex TRL, certification requirements
4. Low Win Rates: 15-20% success rate
5. Application Quality: Lack proposal writing experience
6. Consortium Formation: Can't find suitable partners

**Jobs to Be Done:**
- **Discover**: Find relevant grants automatically
- **Qualify**: Understand eligibility before applying
- **Apply**: Submit competitive applications
- **Win**: Maximize selection probability
- **Track**: Know application status and outcomes

### 1.2 Research Institute Users (연구소) - SUPPLY-SIDE (FREE TIER)

**Profile:**
- Multi-year R&D budgets aligned to national priorities
- Types: Government-funded (KIST, ETRI), private research centers
- Network advantage: 95% of founder's contacts

**Value Proposition (Free Access):**
- Discover companies seeking consortium partners
- Showcase research capabilities
- Connect for joint R&D projects

---

## 2. Feature Requirements

### 2.1 Feature: User Registration & Authentication

#### 2.1.1 User Stories

**US-REG-001: Social Login**
```
As a company R&D manager,
I want to sign up using my existing Kakao or Naver account,
So that I can access the platform quickly without creating new credentials.

Acceptance Criteria:
- [ ] Kakao OAuth login button visible on login page
- [ ] Naver OAuth login button visible on login page
- [ ] First-time login creates new user record
- [ ] Returning user logs in without re-registration
- [ ] Session persists for 30 days (remember me enabled)
- [ ] User sees "로그인 성공" toast notification
```

**US-REG-002: Company Profile Setup**
```
As a newly registered company user,
I want to complete my organization profile,
So that I can receive relevant grant matches.

Acceptance Criteria:
- [ ] Profile wizard appears after first login
- [ ] Progress indicator shows completion percentage
- [ ] All 10 required fields are clearly marked
- [ ] Form saves progress automatically (draft mode)
- [ ] Validation errors display in Korean
- [ ] "프로필 완료" success message on completion
```

#### 2.1.2 Functional Requirements

**Company Profile Fields (10 Required):**

| Field | Korean Label | Type | Validation | Storage |
|-------|-------------|------|------------|---------|
| Company name | 법인명/상호명 | Text | Required, max 100 chars | Plain text |
| Business registration | 사업자등록번호 | Text | Required, 10 digits, XXX-XX-XXXXX format | **Encrypted AES-256-GCM** |
| Business structure | 법인/개인사업자 | Select | Required, enum: CORPORATE, SOLE_PROPRIETOR | Plain text |
| Industry sector | 산업 분야 | Select | Required, from predefined list | Plain text |
| Employee count | 직원 수 | Select | Required, ranges: 1-10, 11-50, 51-100, 100+ | Plain text |
| Annual revenue | 연매출 범위 | Select | Required, ranges in KRW | Plain text |
| R&D experience | R&D 경험 | Boolean | Required | Plain text |
| TRL level | 기술준비수준 | Select | Required, 1-9 | Plain text |
| Contact person | 담당자명 | Text | Required, max 50 chars | Plain text |
| Contact info | 이메일/전화 | Text | Required, valid email + phone | Plain text |

**Research Institute Profile Fields (10 Required):**

| Field | Korean Label | Type | Validation |
|-------|-------------|------|------------|
| Institute name | 기관명 | Text | Required, max 100 chars |
| Registration number | 기관번호 | Text | Required |
| Institute type | 기관 유형 | Select | GOVERNMENT, PRIVATE |
| Research focus | 연구 분야 | Multi-select | Max 3 selections |
| Annual R&D budget | 연간 R&D 예산 | Select | Range options |
| Researcher count | 연구원 수 | Number | Required, min 1 |
| Key technologies | 핵심 기술 | Multi-select | Max 5 selections |
| Collaboration history | 협력 실적 | Boolean | Required |
| Contact person | 담당자명 | Text | Required |
| Contact info | 이메일/전화 | Text | Required |

#### 2.1.3 Error Handling

| Error Scenario | User Message (Korean) | System Action |
|----------------|----------------------|---------------|
| OAuth provider unavailable | "로그인 서비스에 일시적인 문제가 있습니다. 잠시 후 다시 시도해주세요." | Log error, show retry button |
| Session expired | "세션이 만료되었습니다. 다시 로그인해주세요." | Redirect to login, preserve intended destination |
| Invalid business number format | "올바른 사업자등록번호 형식을 입력해주세요. (예: 123-45-67890)" | Highlight field, show format example |
| Duplicate business number | "이미 등록된 사업자등록번호입니다." | Show contact support link |
| Profile save failure | "저장 중 오류가 발생했습니다. 다시 시도해주세요." | Auto-retry 3x, then show manual retry |

#### 2.1.4 API Contracts

**POST /api/auth/callback/kakao**
```typescript
// Response (200 - Success)
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "홍길동",
    "provider": "kakao",
    "isNewUser": true,
    "profileComplete": false
  },
  "session": {
    "token": "jwt_token",
    "expiresAt": "2026-01-09T00:00:00Z"
  }
}

// Response (401 - OAuth Failed)
{
  "error": "OAUTH_FAILED",
  "message": "카카오 인증에 실패했습니다",
  "code": "AUTH_001"
}
```

**PUT /api/organizations/:id**
```typescript
// Request Body
{
  "companyName": "string",
  "businessRegistrationNumber": "string", // Will be encrypted
  "businessStructure": "CORPORATE" | "SOLE_PROPRIETOR",
  "industrySector": "string",
  "employeeCount": "1-10" | "11-50" | "51-100" | "100+",
  "revenueRange": "string",
  "hasRdExperience": boolean,
  "trlLevel": 1-9,
  "contactPerson": "string",
  "contactEmail": "string",
  "contactPhone": "string"
}

// Response (200 - Success)
{
  "organization": { /* updated organization object */ },
  "profileCompleteness": 100,
  "message": "프로필이 저장되었습니다"
}

// Response (400 - Validation Error)
{
  "error": "VALIDATION_ERROR",
  "message": "입력값을 확인해주세요",
  "fields": {
    "businessRegistrationNumber": "올바른 형식이 아닙니다"
  }
}
```

---

### 2.2 Feature: Funding Match Engine

#### 2.2.1 User Stories

**US-MATCH-001: View Personalized Matches**
```
As a company user with a complete profile,
I want to see funding opportunities matched to my organization,
So that I can discover relevant grants without manual searching.

Acceptance Criteria:
- [ ] Dashboard shows top 10 matches by default
- [ ] Each match displays: program name, agency, deadline, match score (0-100)
- [ ] Match score has visual indicator (progress bar or badge)
- [ ] Eligibility status shown: ✅ Eligible / ⚠️ Warning / 🚫 Blocked
- [ ] "왜 이 과제가 매칭되었나요?" link opens AI explanation
- [ ] Matches refresh daily at 06:00 KST
- [ ] "새로운 매칭 5건" badge shows new matches since last visit
```

**US-MATCH-002: Understand Match Reasoning**
```
As a company user viewing a match,
I want to understand why this grant was matched to me,
So that I can decide whether to apply.

Acceptance Criteria:
- [ ] Explanation modal opens on click
- [ ] Shows scoring breakdown: Industry (30pts), TRL (20pts), Certs (20pts), Budget (15pts), Experience (15pts)
- [ ] Each factor shows earned points vs. maximum
- [ ] Korean explanation text generated by Claude Sonnet 4.5
- [ ] Warning reasons highlighted in yellow
- [ ] Blocking reasons highlighted in red
- [ ] "Apply anyway" option available for warnings (not blocks)
```

**US-MATCH-003: Filter and Search Matches**
```
As a company user with many matches,
I want to filter and search through my matches,
So that I can find specific opportunities quickly.

Acceptance Criteria:
- [ ] Filter by agency (IITP, KEIT, TIPA, KIMST)
- [ ] Filter by deadline range (this week, this month, next 3 months)
- [ ] Filter by minimum match score (60, 70, 80, 90)
- [ ] Filter by eligibility status (eligible only, include warnings)
- [ ] Text search by program name (Korean)
- [ ] Filters persist in URL (shareable)
- [ ] "필터 초기화" button resets all filters
```

#### 2.2.2 Matching Algorithm

**Core Matching Logic (100 points total):**

```
ELIGIBILITY GATES (Pass/Fail - Must pass ALL to receive score)
├── Gate 1: Organization type matches target type
├── Gate 2: TRL within range (±2 levels tolerance)
├── Gate 3: Required certifications held (ISMS-P, KC if required)
└── Gate 4: No disqualifying factors

SCORING (If passes all gates)
├── Industry Match:      30 points (exact: 30, similar: 15)
├── TRL Match:           20 points (exact range: 20, ±1 level: 10)
├── Certifications:      20 points (required certs + bonus certs)
├── Budget Fit:          15 points (revenue range alignment)
└── R&D Experience:      15 points (has experience: 15, first-time: 7)

OUTPUT
├── score: 0-100
├── passesEligibility: boolean
├── explanation: string[] (Korean reasons)
├── blockedReasons: string[] (if blocked)
└── warningReasons: string[] (cautions)
```

**Match Display Requirements:**
- Show top 10 matches per user (sorted by score descending)
- Minimum score threshold: 50 (below not shown unless requested)
- Urgency indicator: 🔴 <3 days, 🟡 <7 days, 🟢 >7 days
- "Save for later" adds to saved list
- "Dismiss" hides match (can undo within 24 hours)

#### 2.2.3 Error Handling

| Error Scenario | User Message | System Action |
|----------------|--------------|---------------|
| Match calculation timeout | "매칭 계산 중입니다. 잠시만 기다려주세요..." | Show spinner, retry up to 3x |
| No matches found | "현재 프로필에 맞는 공고가 없습니다. 프로필을 업데이트하거나 필터를 조정해보세요." | Show profile edit link, show all filters button |
| AI explanation unavailable | "설명을 불러올 수 없습니다." | Show cached/fallback explanation, retry button |
| Stale data (>24h old) | "마지막 업데이트: [timestamp] - 새로고침 중..." | Show badge, auto-refresh in background |

#### 2.2.4 API Contracts

**GET /api/matches**
```typescript
// Request
GET /api/matches?page=1&limit=10&minScore=60&agency=IITP&status=eligible

// Response (200)
{
  "matches": [
    {
      "id": "uuid",
      "programId": "uuid",
      "programName": "2025년 AI 혁신 기술개발 사업",
      "agency": "IITP",
      "matchScore": 85,
      "eligibilityStatus": "ELIGIBLE", // ELIGIBLE | WARNING | BLOCKED
      "deadline": "2025-01-15T23:59:59Z",
      "daysUntilDeadline": 37,
      "urgency": "GREEN", // RED | YELLOW | GREEN
      "explanation": {
        "summary": "귀사의 ICT 산업 분야와 TRL 7 수준이 본 과제 요구사항과 잘 일치합니다.",
        "factors": [
          { "name": "산업 분야", "score": 30, "maxScore": 30, "reason": "ICT 분야 정확히 일치" },
          { "name": "TRL 수준", "score": 20, "maxScore": 20, "reason": "TRL 7이 요구 범위(6-8) 내" }
        ],
        "warnings": [],
        "blocks": []
      },
      "announcementUrl": "https://iitp.kr/...",
      "savedAt": null, // null if not saved
      "dismissedAt": null
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalItems": 45,
    "totalPages": 5
  },
  "meta": {
    "lastUpdated": "2025-12-09T06:00:00Z",
    "newSinceLastVisit": 5
  }
}

// Response (401)
{
  "error": "UNAUTHORIZED",
  "message": "로그인이 필요합니다",
  "code": "AUTH_REQUIRED"
}
```

**POST /api/matches/:id/explain**
```typescript
// Request
POST /api/matches/:id/explain

// Response (200) - Claude Sonnet 4.5 generated
{
  "explanation": {
    "summary": "이 과제는 귀사에 적합합니다. 상세 분석 결과를 확인하세요.",
    "detailed": "귀사는 ICT 산업의 TRL 7 수준 기업으로, 본 '2025년 AI 혁신 기술개발 사업'의 핵심 요구사항을 충족합니다...",
    "recommendation": "신청을 권장합니다. 다만, ISO 9001 인증 취득 시 가점을 받을 수 있습니다.",
    "generatedAt": "2025-12-09T10:30:00Z",
    "model": "claude-sonnet-4.5"
  }
}

// Response (503) - AI unavailable
{
  "error": "AI_UNAVAILABLE",
  "message": "AI 설명 서비스를 일시적으로 사용할 수 없습니다",
  "fallback": {
    "summary": "기본 매칭 정보를 확인하세요.",
    "factors": [ /* rule-based explanation */ ]
  }
}
```

---

### 2.3 Feature: Agency Monitoring (4 Agencies)

#### 2.3.1 User Stories

**US-MON-001: Real-time Grant Monitoring**
```
As a platform administrator,
I want the system to automatically monitor 4 funding agencies,
So that users always see the latest grant opportunities.

Acceptance Criteria:
- [ ] NTIS API synced daily at 08:00 KST
- [ ] Playwright scraping runs 2x daily (09:00, 15:00 KST)
- [ ] Peak season (Jan-Mar): 4x daily (09:00, 12:00, 15:00, 18:00)
- [ ] New programs trigger notification within 1 hour
- [ ] Rate limiting: 10 requests/minute per agency
- [ ] Content change detection identifies updates to existing programs
- [ ] Sync status visible in admin dashboard
```

#### 2.3.2 Data Sources

**Covered Agencies:**
| Agency | Korean Name | Coverage | Budget Share |
|--------|-------------|----------|--------------|
| IITP | 정보통신기획평가원 | ICT sector | ~15% |
| KEIT | 한국산업기술평가관리원 | Industrial tech | ~12% |
| TIPA | 중소기업기술정보진흥원 | SME support | ~8% |
| KIMST | 해양수산과학기술진흥원 | Maritime tech | ~5% |

**Data Collection Strategy:**
- **Primary**: NTIS API (108,798+ programs, historical + current)
- **Secondary**: Playwright web scraping (200-500 active calls)

#### 2.3.3 Error Handling

| Error Scenario | System Action | Admin Alert |
|----------------|---------------|-------------|
| NTIS API timeout | Retry 3x with exponential backoff, use cached data | Slack notification if 3x fail |
| Scraping blocked | Switch to backup IP, notify admin | PagerDuty alert |
| Data format changed | Log parsing error, continue with partial data | Email to dev team |
| Rate limit exceeded | Queue remaining requests, resume after cooldown | Log warning |

---

### 2.4 Feature: Email Notifications

#### 2.4.1 User Stories

**US-NOTIF-001: Deadline Reminders**
```
As a company user tracking grants,
I want to receive deadline reminders,
So that I never miss an application deadline.

Acceptance Criteria:
- [ ] Reminder sent 7 days before deadline
- [ ] Reminder sent 3 days before deadline
- [ ] Reminder sent 1 day before deadline
- [ ] Email shows: program name, deadline, match score, apply link
- [ ] "신청하기" button links directly to agency page
- [ ] User can disable specific reminder types in settings
- [ ] Unsubscribe link in every email
```

**US-NOTIF-002: New Match Alerts**
```
As a company user,
I want to be notified when new matching grants appear,
So that I can act on opportunities quickly.

Acceptance Criteria:
- [ ] Alert sent within 1 hour of new high-score match (score >70)
- [ ] Daily digest option for all new matches
- [ ] Weekly digest option (Mondays 9am KST)
- [ ] Minimum score threshold configurable (default: 60)
- [ ] Email shows top 5 new matches with scores
- [ ] "대시보드에서 전체 보기" link to dashboard
```

#### 2.4.2 Notification Types

| Type | Trigger | Default | Configurable |
|------|---------|---------|--------------|
| New high-score match | Score >70, within 1 hour | ON | Threshold, timing |
| Deadline reminder (7d) | 7 days before | ON | ON/OFF |
| Deadline reminder (3d) | 3 days before | ON | ON/OFF |
| Deadline reminder (1d) | 1 day before | ON | ON/OFF |
| Weekly digest | Monday 9am KST | OFF | Day, time |
| Outcome tracking request | 7 days after deadline | ON | ON/OFF |

#### 2.4.3 Error Handling

| Error Scenario | User Message | System Action |
|----------------|--------------|---------------|
| Email delivery failed | (no user message) | Retry 3x over 24h, log failure |
| Invalid email address | "이메일 주소를 확인해주세요" | Prompt to update in settings |
| User unsubscribed | (no emails sent) | Respect preference, log |

---

### 2.5 Feature: Outcome Tracking System

#### 2.5.1 User Stories

**US-OUT-001: Log Application Outcome**
```
As a company user who applied for a grant,
I want to log my application outcome,
So that Connect can improve matching for me and others.

Acceptance Criteria:
- [ ] Prompt appears 7 days after grant deadline
- [ ] Status options: 신청함, 미신청, 선정, 탈락, 심사중, 포기
- [ ] Optional: requested amount, award amount
- [ ] Optional: difficulty rating (1-5 stars)
- [ ] Optional: match quality rating (1-5 stars)
- [ ] PIPA consent checkbox required for data sharing
- [ ] "결과 저장" confirms submission
- [ ] User can update outcome anytime
```

**US-OUT-002: View Aggregate Statistics**
```
As a Pro/Team user,
I want to see success statistics for similar organizations,
So that I can make informed application decisions.

Acceptance Criteria:
- [ ] Show "귀사와 유사한 조직의 선정률: XX%" 
- [ ] Filter by: agency, industry, TRL level
- [ ] Minimum 5 data points required for display
- [ ] Show "평균 심사 기간: XX일"
- [ ] Individual outcomes never disclosed
- [ ] "데이터 부족" message if <5 data points
```

#### 2.5.2 PIPA Compliance Requirements

- [ ] Explicit consent checkbox with Korean text
- [ ] Consent text: "Connect의 매칭 정확도 향상을 위해 과제 신청 결과 데이터를 공유합니다"
- [ ] Clear explanation: "귀사의 구체적인 데이터는 공개되지 않으며, 최소 5건 이상 집계된 통계로만 활용됩니다"
- [ ] Opt-out available anytime in settings
- [ ] Consent timestamp recorded
- [ ] Data deletion available on request

#### 2.5.3 API Contracts

**POST /api/outcomes**
```typescript
// Request
{
  "fundingMatchId": "uuid",
  "status": "WON" | "LOST" | "PENDING" | "WITHDRAWN" | "NOT_APPLIED",
  "appliedDate": "2025-01-15",
  "requestedAmountKrw": 500000000, // optional
  "awardAmountKrw": 450000000, // optional
  "difficultyRating": 4, // 1-5, optional
  "matchQualityRating": 5, // 1-5, optional
  "feedbackText": "string", // optional
  "consentToShare": true // required if sharing financial data
}

// Response (201)
{
  "outcome": {
    "id": "uuid",
    "status": "WON",
    "createdAt": "2025-12-09T10:00:00Z"
  },
  "message": "결과가 저장되었습니다. 소중한 정보 감사합니다."
}
```

**GET /api/statistics/success-rate**
```typescript
// Request
GET /api/statistics/success-rate?agency=IITP&industry=ICT&trlMin=6&trlMax=8

// Response (200)
{
  "statistics": {
    "winRate": 0.38,
    "winRateFormatted": "38%",
    "avgCycleDays": 87,
    "totalDataPoints": 124,
    "breakdown": {
      "won": 47,
      "lost": 77
    }
  },
  "disclaimer": "최근 12개월 데이터 기준, 최소 5건 이상 집계"
}

// Response (200) - Insufficient data
{
  "statistics": null,
  "message": "데이터가 부족합니다. 5건 이상 수집 시 통계가 표시됩니다."
}
```

---

### 2.6 Feature: Sector Gate Checklists

#### 2.6.1 User Stories

**US-GATE-001: ISMS-P Readiness Check**
```
As a SaaS/AI company user,
I want to assess my ISMS-P certification readiness,
So that I know if I'm eligible for programs requiring it.

Acceptance Criteria:
- [ ] 16-item checklist displayed (mapped to KISA requirements)
- [ ] Each item has checkbox + description in Korean
- [ ] Progress bar shows completion percentage
- [ ] Score calculated: 6.25 points per item (16 × 6.25 = 100)
- [ ] Readiness level displayed: 준비 안됨 (0-40), 부분 준비 (40-70), 준비됨 (70-85), 완전 준비 (85-100)
- [ ] Estimated prep time shown based on score
- [ ] CTA for Certification Planning service if score <70
```

**US-GATE-002: KC Certification Readiness Check**
```
As a hardware/IoT company user,
I want to assess my KC certification readiness,
So that I can plan for certification requirements.

Acceptance Criteria:
- [ ] 8-item document checklist displayed
- [ ] Testing body recommendations shown (KTL, KCL, KTC)
- [ ] Estimated cost range based on readiness score
- [ ] Estimated timeline based on readiness score
- [ ] CTA for Certification Planning service
```

#### 2.6.2 Readiness Score Interpretation

**ISMS-P:**
| Score Range | Status (Korean) | Prep Time | Action |
|-------------|-----------------|-----------|--------|
| 0-40 | 준비 안됨 | 6-12 months | Show service CTA |
| 40-70 | 부분 준비됨 | 3-6 months | Show service CTA |
| 70-85 | 준비됨 | 1-3 months | Show apply suggestion |
| 85-100 | 완전 준비됨 | Ready | Show matching programs |

**KC:**
| Score Range | Estimated Cost | Prep Time |
|-------------|---------------|-----------|
| 0-40 | ₩5-10M | 3-6 months |
| 40-70 | ₩3-7M | 2-4 months |
| 70-100 | ₩2-5M | 1-2 months |

---

### 2.7 Feature: Procurement Readiness Calculator

#### 2.7.1 User Stories

**US-PROC-001: Assess Procurement Readiness**
```
As a company user targeting government procurement,
I want to assess my procurement track readiness,
So that I can plan for 혁신제품 or 우수제품 designation.

Acceptance Criteria:
- [ ] Total score displayed (0-100)
- [ ] Score breakdown by category visible
- [ ] Gap analysis shows specific missing requirements
- [ ] Each gap shows: item, time to resolve, cost to resolve
- [ ] Recommended action sequence displayed
- [ ] CTA for TRL Advancement Consulting if gaps identified
```

#### 2.7.2 Scoring Model

| Category | Max Points | Criteria |
|----------|------------|----------|
| Product Maturity | 30 | TRL 9: 30, TRL 8: 20, TRL 7: 10, <7: 0 |
| Certifications | 30 | KC: 15, ISO 9001: 10, ISMS-P: 5 |
| Track Record | 20 | 3+ projects: 20, 1-2: 10, 0: 0 |
| Quality System | 20 | Warranty: 7, A/S: 7, Support team: 6 |

---

### 2.8 Feature: Partner Discovery & Consortium Builder

#### 2.8.1 User Stories

**US-PART-001: Search for Partners**
```
As a company user needing consortium partners,
I want to search for research institutes,
So that I can find appropriate partners for joint R&D.

Acceptance Criteria:
- [ ] Filter by organization type (company/institute)
- [ ] Filter by technology/industry sector
- [ ] Filter by TRL level (find complementary TRL)
- [ ] Text search in Korean
- [ ] Results show: name, type, focus areas, TRL range
- [ ] "프로필 보기" opens public profile
- [ ] Search results paginated (20 per page)
```

**US-PART-002: Send Partner Request**
```
As a company user,
I want to send a partnership request to an institute,
So that I can initiate consortium discussions.

Acceptance Criteria:
- [ ] "컨소시엄 제안" button on partner profile
- [ ] Pre-filled message template available
- [ ] Custom message field (max 500 chars)
- [ ] Specify target program (optional)
- [ ] Request status tracked: 발송됨, 확인됨, 수락, 거절
- [ ] Notification sent to recipient
- [ ] Response rate tracked for analytics
```

#### 2.8.2 Consortium Builder

**Basic Features:**
- [ ] Create consortium project (name, target program)
- [ ] Add members: 주관기관 (Lead) / 참여기관 (Partner)
- [ ] Simple budget split calculator (percentage-based)
- [ ] Role assignment for each member
- [ ] Export member list (CSV format for applications)
- [ ] Track consortium formation success

---

### 2.9 Feature: Payment Integration (Toss Payments)

#### 2.9.1 User Stories

**US-PAY-001: Subscribe to Pro Plan**
```
As a Free user,
I want to upgrade to Pro plan,
So that I can access unlimited matches and full features.

Acceptance Criteria:
- [ ] Pricing page shows all plans with feature comparison
- [ ] "Pro 구독하기" button initiates payment flow
- [ ] Toss Payments checkout opens
- [ ] Support: card, bank transfer, virtual account
- [ ] Subscription starts immediately on success
- [ ] Receipt/tax invoice (세금계산서) generated for corporate
- [ ] Confirmation email sent
- [ ] Dashboard shows subscription status
```

**US-PAY-002: Manage Subscription**
```
As a paying subscriber,
I want to manage my subscription,
So that I can upgrade, downgrade, or cancel.

Acceptance Criteria:
- [ ] Settings page shows current plan and billing date
- [ ] "플랜 변경" allows upgrade/downgrade
- [ ] "구독 취소" initiates cancellation flow
- [ ] Cancellation effective at end of current period
- [ ] Confirmation email on any change
- [ ] Payment history viewable
- [ ] Download invoices (PDF)
```

#### 2.9.2 Subscription Plans

| Plan | Monthly | Annual | Seats | Key Features |
|------|---------|--------|-------|--------------|
| Free | ₩0 | ₩0 | 1 | 10 matches/month, basic alerts |
| Pro | ₩49,000 | ₩49,000/mo | 1 | Unlimited matches, outcome data |
| Team | ₩99,000 | ₩99,000/mo | 5 | Pro + team features, priority support |

**Beta Pricing (First 50 users):**
- ₩24,500/month for first 30 days
- Auto-upgrade to Pro with 7-day advance notice

#### 2.9.3 Error Handling

| Error Scenario | User Message | System Action |
|----------------|--------------|---------------|
| Payment declined | "결제가 거절되었습니다. 다른 결제 수단을 시도해주세요." | Log reason, show retry |
| Payment timeout | "결제 처리 중 시간이 초과되었습니다." | Cancel transaction, retry option |
| Subscription renewal failed | "자동 결제에 실패했습니다. 7일 내 결제 수단을 업데이트해주세요." | Retry 3x over 7 days, then downgrade |
| Refund requested | "환불 요청이 접수되었습니다. 3-5 영업일 내 처리됩니다." | Process via Toss API |

---

### 2.10 Feature: Services Catalog

#### 2.10.1 Service Types

| Service | Price Range | Duration | Target |
|---------|-------------|----------|--------|
| Application Review | ₩2-3M | 7-10 days | Companies applying for grants |
| Certification Planning | ₩3-5M | 2-3 weeks | Companies needing ISMS-P/KC |
| Consortium Formation | ₩3-5M | 3-4 weeks | Companies needing partners |
| TRL Advancement | ₩5-7M | 4-6 weeks | Companies at low TRL |

#### 2.10.2 User Stories

**US-SVC-001: Request Service**
```
As a company user,
I want to request a consulting service,
So that I can get expert help with my R&D funding journey.

Acceptance Criteria:
- [ ] Service catalog page shows all services
- [ ] Each service shows: description, price range, duration, deliverables
- [ ] "상담 신청" button opens request form
- [ ] Form collects: company info, service type, project description, timeline
- [ ] Confirmation email sent with next steps
- [ ] Request tracked in user dashboard
- [ ] Admin notified of new request
```

#### 2.10.3 Off-Budget Invoicing (Critical Compliance)

**Legal Requirement:**
- Services are 사업개발비 (business development costs)
- CANNOT be included in 연구개발비 (R&D project budgets)
- Must be invoiced to company's 운영비 (operating budget)

**MSA Clause (Required):**
```
제4조 (서비스 비용 청구)
본 약관에 명시된 부가 서비스는 기업의 사업개발 비용으로 청구되며,
정부 R&D 과제 연구개발비 예산에 포함되지 않습니다.
```

**Customer Communication:**
- [ ] Sales process explains: "이 서비스는 귀사의 운영 예산으로 결제됩니다"
- [ ] Invoice clearly separated from any R&D projects
- [ ] FAQ includes: "부가 서비스 비용은 R&D 예산에 넣을 수 있나요? → 아니요"

---

## 3. Non-Functional Requirements

### 3.1 Performance Requirements

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| API Response Time (P95) | <500ms | >1s |
| Match Generation Time | <3 seconds | >5 seconds |
| Page Load Time | <2 seconds | >3 seconds |
| Concurrent Users | 500-1,500 | >1,200 |
| Database Connections | <150 | >180 |

### 3.2 Availability Requirements

| Period | Uptime Target | Justification |
|--------|---------------|---------------|
| Peak Season (Jan-Mar) | 99.9% | 80% of funding announcements |
| Off-Peak | 99.5% | Lower impact |
| Planned Maintenance | 4 hours/month | Scheduled weekends |

**Hot Standby Requirements (Peak Season):**
- [ ] Second server operational by Dec 31
- [ ] PostgreSQL streaming replication (<5 min RPO)
- [ ] Automated failover (<15 min RTO)
- [ ] PagerDuty 24/7 monitoring
- [ ] Weekly health checks during Jan-Mar

### 3.3 Security Requirements

| Requirement | Implementation | Compliance |
|-------------|----------------|------------|
| PII Encryption | AES-256-GCM | PIPA |
| Password Hashing | N/A (OAuth only) | - |
| Session Management | JWT, 30-day expiry | - |
| API Authentication | Bearer token | - |
| Rate Limiting | Redis, 100 req/min | DDoS protection |
| Secrets Management | GitHub Secrets (19) | Enterprise |

### 3.4 Compliance Requirements

- [ ] PIPA (개인정보보호법) compliant data handling
- [ ] Explicit consent for data sharing
- [ ] Data deletion on request
- [ ] Annual security audit
- [ ] Off-budget invoicing for services

---

## 4. Technical Constraints

### 4.1 Technology Stack (Reference Only)

> **Note:** For implementation details, see `CLAUDE.md`

- **Frontend:** Next.js 14, React 18, TypeScript 5, Tailwind CSS
- **Backend:** Next.js API Routes, NextAuth.js 4 (Kakao, Naver)
- **Database:** PostgreSQL 15, Prisma ORM 6.19, Redis
- **AI:** Anthropic Claude Sonnet 4.5
- **Payments:** Toss Payments
- **Infrastructure:** Docker, GitHub Actions CI/CD

### 4.2 Hard Constraints

- Authentication: Kakao + Naver OAuth only (no email/password)
- Database: PostgreSQL 15 (no MySQL, no MongoDB)
- Encryption: AES-256-GCM for all PII
- Payments: Toss Payments only (Korean market)
- AI: Claude Sonnet 4.5 for explanations (no OpenAI)
- Language: Korean UI primary, English not required for MVP

---

## 5. Success Metrics & KPIs

### 5.1 Acquisition Metrics

| Metric | Month 1 | Month 3 | Month 6 |
|--------|---------|---------|---------|
| Registered Users | 50 | 110 | 240 |
| Companies (90%) | 45 | 100 | 220 |
| Research Institutes (10%) | 5 | 10 | 20 |
| Beta Conversion | 80% | - | - |

### 5.2 Engagement Metrics

| Metric | Target |
|--------|--------|
| Profile Completion | >90% |
| Weekly Active Users | >70% |
| Matches Viewed/Week | 5+ per user |
| Match Quality Rating | >4.0/5.0 |
| Outcome Tracking Opt-in | >60% |

### 5.3 Revenue Metrics

| Metric | Month 3 | Month 6 |
|--------|---------|---------|
| MRR (software) | ₩3.4M | ₩6.9M |
| Services revenue | ₩25M | ₩50M |
| Churn rate | <8% | <5% |
| LTV/CAC ratio | 2.9x | 3.9x |

### 5.4 Outcome Metrics (Data Moat)

| Metric | Target |
|--------|--------|
| Outcome tracking rate | >60% |
| Win rate (all users) | 20-25% |
| Win rate (with services) | 30-40% |
| Avg cycle time | <90 days |

---

## 6. Risk Management

### 6.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Peak season failure | Medium | Critical | Hot standby, 99.9% SLO |
| NTIS API changes | Low | High | Playwright backup, API monitoring |
| Data breach | Low | Critical | AES-256, PIPA compliance, audit |
| Deployment errors | Low | Medium | GitHub Actions CI/CD, auto-rollback |

### 6.2 Business Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Low conversion | Medium | High | Free tier value, outcome data |
| High churn | Medium | High | Sector gates, quality matching |
| Competitor with VC | Medium | Medium | Services moat, outcome data moat |

---

## 7. Timeline

### Launch Timeline

| Phase | Dates | Status |
|-------|-------|--------|
| Foundation | Oct 9-22 | ✅ Complete |
| AI Integration | Oct 23-Nov 5 | ✅ Complete |
| Load Testing | Nov 6-19 | ✅ Complete |
| Beta Testing | Nov 20-Dec 17 | ✅ Complete |
| Final Testing | Dec 18-31 | 🔄 In Progress |
| **Public Launch** | **Dec 12, 2025** | 🎯 Target |

### Post-Launch Milestones

| Milestone | Date | Criteria |
|-----------|------|----------|
| 50 beta users | Dec 12 | Launch day |
| First services engagement | Dec 31 | ₩2-5M revenue |
| 500 users | Month 4 | Expansion gate |
| 1,000 users | Month 6 | If 70%+ retention |

---

## 8. Appendix

### A. Glossary

| Term | Korean | Definition |
|------|--------|------------|
| TRL | 기술준비수준 | Technology Readiness Level (1-9) |
| ISMS-P | 정보보호관리체계 | Information Security Management System |
| KC | KC 인증 | Korea Certification (product safety) |
| PIPA | 개인정보보호법 | Personal Information Protection Act |
| MRR | 월간반복매출 | Monthly Recurring Revenue |
| LTV | 고객생애가치 | Lifetime Value |
| CAC | 고객획득비용 | Customer Acquisition Cost |

### B. Referenced Documents

- `CLAUDE.md` - Implementation guidelines (how to build)
- `prisma/schema.prisma` - Database schema (source of truth)
- `docs/implementation/phase1a-infrastructure.md` - Tech stack details
- `docs/implementation/phase2a-match-generation.md` - Matching algorithm
- `START-HERE-DEPLOYMENT-DOCS.md` - Deployment guide

### C. Change Log

| Version | Date | Changes |
|---------|------|---------|
| v9.0 | 2025-12-09 | Launch readiness update |
| v9.1 | 2025-12-09 | Claude Code optimization: acceptance criteria, user stories, API contracts, error handling |

---

**Document Status:** Claude Code Optimized
**Last Updated:** December 9, 2025
**Launch Date:** December 12, 2025
**Production URL:** https://connectplt.kr

*End of PRD v9.1 - Claude Code Optimized*
