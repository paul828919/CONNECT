# Pricing Page UX Enhancement Work Request

## Connect Platform - UI/UX Chief Manager Work Request

**Document Version:** 1.0
**Date:** 2025-12-05
**Requested by:** CMO (Chief Marketing Officer)
**Assignee:** UI/UX Chief Manager
**Status:** Approved for Implementation

---

## Executive Summary

This work request outlines approved UI/UX enhancements for the Connect pricing page (`/pricing`). The recommendations stem from a comprehensive CMO review analyzing conversion optimization, value communication, and Korean market-specific user journey considerations.

**Scope:** Priority 1 (Critical) + Priority 2 (Important) items only
**Deferred:** Priority 3 items pending post-launch user analytics review

---

## 1. Background & Context

### 1.1 Current State Assessment

The pricing page currently displays three subscription tiers:

| Plan | Price (Monthly) | Price (Annual) | Target Segment |
|------|-----------------|----------------|----------------|
| **Free** | ₩0 | - | 개인 연구자를 위한 기본 플랜 |
| **Pro** | ₩49,000 | ₩490,000 | 기관 연구자 및 중소기업을 위한 플랜 |
| **Team** | ₩99,000 | ₩990,000 | 팀 및 연구기관을 위한 플랜 |

### 1.2 Korean Institutional Payment Decision Flow

Understanding the B2B/B2G payment decision process is critical for pricing page optimization:

```
┌─────────────────────────────────────────────────────────────────────┐
│  KOREAN INSTITUTIONAL PAYMENT DECISION FLOW                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Stage 1: DISCOVERY (Free Plan)                                    │
│  └─ Individual researcher discovers Connect                        │
│  └─ Tests matching quality with organization profile               │
│  └─ Validates: "Are these projects I can actually apply for?"      │
│                                                                     │
│  Stage 2: INTERNAL ADVOCACY                                        │
│  └─ Satisfied researcher reports value to team leader              │
│  └─ Explains benefits and requests budget approval                 │
│                                                                     │
│  Stage 3: TEAM ADOPTION (Pro Plan)                                 │
│  └─ Team leader approves monthly subscription                      │
│  └─ Team uses for actual project applications                      │
│                                                                     │
│  Stage 4: ORGANIZATIONAL EXPANSION (Team Plan)                     │
│  └─ Triggered by: Successful project awards using Connect          │
│  └─ Multiple departments/teams request access                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.3 Korean R&D Funding Seasonality

- **Peak Season:** January-April (90% of annual R&D announcements)
- **Planning Season:** July-November (technology demand surveys)
- **Implication:** Free plan provides natural evaluation period aligned with funding cycles

---

## 2. Approved Enhancement Tasks

### Priority 1: Critical (Must Complete)

#### Task 1.1: Add "Most Popular" Badge to Pro Plan

**Rationale:** Industry best practice (Stripe, Slack, HubSpot) to guide user decision-making

**Current State:**
- Pro plan only shows "현재 구독 중" badge (user-state indicator)
- No recommendation indicator for non-subscribed users

**Required Change:**
```
┌─────────────────────────────────────────────────────────────────────┐
│                              Pro                                    │
│                         [가장 인기] ← NEW BADGE                     │
│              기관 연구자 및 중소기업을 위한 플랜                      │
│                                                                     │
│                        ₩49,000 / 월                                 │
└─────────────────────────────────────────────────────────────────────┘
```

**Specifications:**
- Badge text: "가장 인기" or "추천"
- Badge color: Consistent with Pro plan accent (teal/cyan)
- Position: Above plan title, centered
- Visibility: Always shown (independent of user's current subscription)
- Note: If user is subscribed to Pro, show both "현재 구독 중" AND "가장 인기" badges

---

#### Task 1.2: Add Annual/Monthly Billing Toggle

**Rationale:** Annual billing improves LTV by 20-30% and reduces churn

**Current State:**
- No billing period selection available
- Monthly pricing shown only

**Required Change:**
```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│              ┌─────────────┬─────────────┐                         │
│              │   월간 결제  │   연간 결제  │ ← NEW TOGGLE            │
│              │             │  17% 할인   │                         │
│              └─────────────┴─────────────┘                         │
│                                                                     │
│     Free              Pro                  Team                     │
│      ₩0           ₩49,000/월            ₩99,000/월                  │
│                   ₩490,000/년           ₩990,000/년                 │
│                   (월 ₩40,833)          (월 ₩82,500)                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Specifications:**
- Toggle position: Centered above pricing cards
- Default selection: Monthly (월간 결제)
- Annual discount display: "17% 할인" badge on annual option
- Price display when annual selected:
  - Show annual total: ₩490,000/년, ₩990,000/년
  - Show monthly equivalent: (월 ₩40,833), (월 ₩82,500)
- Animation: Smooth transition when toggling between views

---

#### Task 1.3: Revise Value Proposition Headlines

**Rationale:** Current headlines describe WHO (segment), not WHY (value proposition)

**Current State:**
| Plan | Current Subtitle |
|------|------------------|
| Free | 개인 연구자를 위한 기본 플랜 |
| Pro | 기관 연구자 및 중소기업을 위한 플랜 |
| Team | 팀 및 연구기관을 위한 플랜 |

**Required Change:**
| Plan | New Subtitle | Rationale |
|------|--------------|-----------|
| Free | **Connect를 처음 경험하는 연구자** | Emphasizes trial/exploration value |
| Pro | **과제 수주를 본격 추진하는 연구팀** | Emphasizes production/action value |
| Team | **조직 전체의 R&D 경쟁력을 관리하는 기관** | Emphasizes organizational/strategic value |

**Alternative Option (Outcome-focused):**
| Plan | Alternative Subtitle |
|------|---------------------|
| Free | R&D 매칭의 첫 경험 |
| Pro | 성공적인 과제 수주를 위한 필수 도구 |
| Team | 조직 전체의 R&D 경쟁력 강화 |

**Implementation Note:** UI/UX Chief may select either option based on design fit and A/B testing considerations.

---

#### Task 1.4: Localize "Warm Intro" Terminology

**Rationale:** Mixed Korean/English creates cognitive friction for Korean users

**Current State:**
- Feature listed as "Warm Intro 5회 / 월" (Pro plan)
- Feature listed as "무제한 Warm Intro" (Team plan)
- Comparison table shows "Warm Intro" column header

**Required Change:**
| Location | Current | New |
|----------|---------|-----|
| Pro plan feature list | Warm Intro 5회 / 월 | **연구기관 직접 연결 5회 / 월** |
| Team plan feature list | 무제한 Warm Intro | **무제한 연구기관 직접 연결** |
| Comparison table header | Warm Intro | **연구기관 연결** |
| Comparison table - Free | - | - |
| Comparison table - Pro | 5회 / 월 | 5회 / 월 |
| Comparison table - Team | 무제한 | 무제한 |

**Alternative Option:**
If "연구기관 직접 연결" is too long, consider:
- "기관 연결" (short form)
- "파트너 연결" (partner-focused)

---

### Priority 2: Important (Should Complete)

#### Task 2.1: Improve Comparison Table UX

**Rationale:** Current "X" marks feel punitive rather than educational

**Current State:**
```
| 기능           | Free | Pro | Team |
|----------------|------|-----|------|
| 상세 매칭 설명  |  ✗   |  ✓  |  ✓   |
| 실시간 업데이트 |  ✗   |  ✓  |  ✓   |
| 전담 매니저     |  ✗   |  ✗  |  ✓   |
```

**Required Change:**
```
| 기능           | Free    | Pro     | Team    |
|----------------|---------|---------|---------|
| 상세 매칭 설명  |    —    |    ✓    |    ✓    |
| 실시간 업데이트 |    —    |    ✓    |    ✓    |
| 전담 매니저     |    —    |    —    |    ✓    |
```

**Specifications:**
- Replace "✗" with "—" (em dash)
- Color: Gray (#9CA3AF) for unavailable features
- Rationale: Dash is neutral, X is negative/punitive

**Enhanced Option (Preferred):**
For features with limitations, show specific values instead of symbols:
```
| 기능           | Free     | Pro      | Team     |
|----------------|----------|----------|----------|
| 매칭 생성 횟수  | 3회/월   | 무제한   | 무제한   |
| 상세 매칭 설명  | —        | ✓        | ✓        |
| 연구기관 연결   | —        | 5회/월   | 무제한   |
| 팀 멤버 수     | 1명      | 1명      | 최대 5명 |
| 전담 매니저     | —        | —        | ✓        |
| 지원 응답 시간  | 48시간   | 24시간   | 우선 지원 |
```

---

#### Task 2.2: Refine Plan Targeting Descriptions

**Rationale:** Current targeting has overlap and ambiguity between Pro and Team

**Current State Analysis:**
| Plan | Current Target | Issue |
|------|----------------|-------|
| Free | 개인 연구자 | Too narrow - excludes exploring organizations |
| Pro | 기관 연구자 및 중소기업 | "기관 연구자" is vague |
| Team | 팀 및 연구기관 | Overlaps significantly with Pro |

**Required Change:**
Add a secondary targeting line below the main subtitle:

```
┌─────────────────────────────────────────────────────────────────────┐
│  Free                    Pro                     Team               │
│                                                                     │
│  Connect를 처음         과제 수주를 본격         조직 전체의        │
│  경험하는 연구자        추진하는 연구팀          R&D 경쟁력을       │
│                                                 관리하는 기관       │
│                                                                     │
│  플랫폼 탐색 및         단일 부서/연구실의       다수 부서의        │ ← Secondary line
│  매칭 품질 검증         실무 활용               통합 관리          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Specifications:**
- Secondary line: Smaller font size (text-sm), muted color
- Purpose: Clarifies use case without cluttering main value proposition

---

#### Task 2.3: Pre-Launch Social Proof Section (Customized)

**Rationale:** Social proof increases conversion 15-30%, but Connect is pre-launch

**Required Change:**
Add a subtle social proof indicator below pricing cards (before comparison table):

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│              ───────────────────────────────────────                │
│                                                                     │
│        📊 1,600+ 국가 R&D 사업 공고 실시간 모니터링 중               │
│                                                                     │
│              ───────────────────────────────────────                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Alternative Options (Choose One):**
| Option | Content | Pros | Cons |
|--------|---------|------|------|
| A | 1,600+ 국가 R&D 사업 공고 실시간 모니터링 중 | Data-driven, verifiable | Not user-focused |
| B | 30+ 부처, 80+ 전문기관 데이터 통합 분석 | Shows comprehensive coverage | Technical |
| C | NTIS 전체 국가 R&D 사업 분석 | Authoritative source | May need NTIS familiarity |

**Specifications:**
- Position: Between pricing cards and comparison table
- Style: Subtle, centered, with horizontal dividers
- Color: Muted text (gray-600)
- Icon: Optional chart/data icon

---

## 3. Files to Modify

| File Path | Change Type | Tasks Affected |
|-----------|-------------|----------------|
| `app/pricing/page.tsx` | Modify | All tasks |
| `components/pricing/PricingCard.tsx` | Modify (if exists) | 1.1, 1.3, 2.2 |
| `components/pricing/BillingToggle.tsx` | Create | 1.2 |
| `components/pricing/ComparisonTable.tsx` | Modify (if exists) | 1.4, 2.1 |

---

## 4. Visual Reference: Final State

### 4.1 Pricing Cards Section (After Implementation)

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│                    Connect 요금제                                   │
│                                                                     │
│              ┌─────────────┬─────────────┐                         │
│              │   월간 결제  │ 연간 결제   │                         │
│              │             │  17% 할인   │                         │
│              └─────────────┴─────────────┘                         │
│                                                                     │
│  ┌─────────────┐  ┌─────────────────┐  ┌─────────────┐            │
│  │    Free     │  │  [가장 인기]    │  │    Team     │            │
│  │             │  │      Pro        │  │             │            │
│  │  Connect를   │  │  과제 수주를    │  │ 조직 전체의  │            │
│  │  처음       │  │  본격 추진하는   │  │ R&D 경쟁력을 │            │
│  │  경험하는   │  │  연구팀         │  │ 관리하는 기관│            │
│  │  연구자     │  │                 │  │             │            │
│  │             │  │                 │  │             │            │
│  │    ₩0      │  │  ₩49,000/월    │  │ ₩99,000/월  │            │
│  │             │  │                 │  │             │            │
│  │ ✓ 3개 매칭  │  │ ✓ 무제한 매칭   │  │ ✓ Pro 기능  │            │
│  │ ✓ 기본     │  │ ✓ 상세 설명     │  │ ✓ 5명 팀    │            │
│  │   프로필   │  │ ✓ 연구기관      │  │ ✓ 무제한    │            │
│  │ ✓ 4개 기관 │  │   직접 연결     │  │   기관 연결  │            │
│  │   검색     │  │   5회/월        │  │ ✓ 전담     │            │
│  │             │  │ ✓ 24시간 지원   │  │   매니저    │            │
│  │             │  │                 │  │ ✓ SLA 보장  │            │
│  │             │  │                 │  │             │            │
│  │ [다운그레이드]│ │ [현재 플랜]     │  │[Team 시작하기]│           │
│  └─────────────┘  └─────────────────┘  └─────────────┘            │
│                                                                     │
│        ─────────────────────────────────────────────────           │
│         📊 1,600+ 국가 R&D 사업 공고 실시간 모니터링 중              │
│        ─────────────────────────────────────────────────           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 Comparison Table (After Implementation)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         플랜 비교                                   │
├─────────────────────────────────────────────────────────────────────┤
│  기능              │   Free    │    Pro    │    Team    │          │
├───────────────────┼───────────┼───────────┼────────────┤          │
│  매칭 생성 횟수    │   3/월    │   무제한   │   무제한   │          │
│  상세 매칭 설명    │     —     │     ✓     │     ✓     │          │
│  실시간 업데이트   │     —     │     ✓     │     ✓     │          │
│  연구기관 연결     │     —     │  5회/월   │   무제한   │          │
│  팀 멤버 수       │    1명    │    1명    │  최대 5명  │          │
│  전담 매니저      │     —     │     —     │     ✓     │          │
│  지원 응답 시간   │  48시간   │  24시간   │  우선 지원  │          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 5. Implementation Guidelines

### 5.1 Design Consistency Requirements

- Maintain existing color scheme (teal for Pro highlight, purple for Team CTA)
- Use consistent spacing with current pricing card layout
- Ensure mobile responsiveness for billing toggle and all new elements

### 5.2 Accessibility Requirements

- Billing toggle must be keyboard accessible
- Badge colors must meet WCAG 2.1 AA contrast requirements
- Screen reader support for toggle state changes

### 5.3 Testing Requirements

- [ ] Desktop view (1440px, 1920px)
- [ ] Tablet view (768px, 1024px)
- [ ] Mobile view (375px, 414px)
- [ ] Billing toggle state persistence
- [ ] Correct price display for each toggle state

---

## 6. Deferred Items (Post-Launch Review)

The following items are **NOT in scope** for this work request and will be evaluated after launch based on user analytics:

| Item | Reason for Deferral |
|------|---------------------|
| "Share with Team" feature | Requires user journey validation |
| First-month discount messaging | Requires conversion data analysis |
| Satisfaction guarantee messaging | Requires churn rate analysis |

---

## 7. Approval & Sign-off

| Role | Name | Status | Date |
|------|------|--------|------|
| CMO (Requester) | - | ✅ Approved | 2025-12-05 |
| CEO | - | Pending | - |
| UI/UX Chief (Assignee) | - | Pending | - |

---

## 8. Appendix: CMO Review Discussion Summary

### Key Insights from Analysis

1. **Pricing Structure Clarification:** PRD v8.0 will be updated to reflect ₩49,000/₩99,000 monthly pricing (not ₩490,000/₩990,000)

2. **Free Plan as Trial:** The Free plan with 3 matches/month, aligned with Korean R&D seasonality (Jan-Apr peak), effectively serves as the trial mechanism

3. **Bottom-Up Sales Motion:** Connect follows a Product-Led Growth model where researchers discover value → advocate internally → team leaders purchase

4. **Conversion Triggers:**
   - Free → Pro: Validated matching quality + need for unlimited access
   - Pro → Team: Successful project awards + multi-department demand

---

**Document End**

*This work request is ready for UI/UX Chief Manager review and implementation.*
