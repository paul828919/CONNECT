# CONNECT – Product Requirements Document (PRD) v10.0

**Version:** 10.0
**Date:** 2025-12-09
**Status:** Production Ready
**Scope:** All research projects under national R&D initiatives

---

## Document Purpose

This PRD defines **what to build** for Connect. For implementation details on **how to build**, refer to:
- `CLAUDE.md` - Code style, commands, workflow rules
- `prisma/schema.prisma` - Database schema (SOURCE OF TRUTH)

---

## 1. Overview

### 1.1 Service Country

Republic of Korea only

### 1.2 Key Services

1. **User-Customized Real-Time Research Project Announcement Matching Service**
   - Automatic matching of relevant government R&D funding opportunities based on user organization profile
   - Real-time monitoring of NTIS (National Science and Technology Information Service) announcements
   - AI-powered match explanations (Claude Sonnet 4.5)

2. **Consortium Building Service Centered on Research Projects**
   - Partner discovery and search functionality
   - Consortium project management (create, invite members, track budget)
   - Contact request system for partnership outreach

### 1.3 Target Users

| User Type | Description |
|-----------|-------------|
| **Corporations** | Legal entities (법인) and sole proprietors (개인사업자) seeking R&D funding |
| **University Professor Research Teams** | Academic researchers requiring consortium partners and funding |
| **National Research Institutions** | Government-funded research institutes (정부출연연구기관), research institutes under government ministries (부처직할연구기관), research institutes under local governments (지자체출연연구기관) |
| **Public Institutions** | Public entities that are not national research institutions (e.g., National Asian Culture Center, other public corporations) |

### 1.4 Business Model

#### Primary Revenue Streams

| Plan | Monthly | Annual | Features |
|------|---------|--------|----------|
| **Free** | ₩0 | ₩0 | 3 matches/month, view-only partner search, basic profile |
| **Pro** | ₩49,000 | ₩490,000 | Unlimited matches, 10 contact requests/month, AI explanations |
| **Team** | ₩99,000 | ₩990,000 | Up to 5 users, unlimited matches, unlimited contact requests, full AI features |

#### Regulatory Compliance

- **PIPA (개인정보보호법)** compliant data handling
- Explicit consent for data sharing
- Data deletion available on request
- AES-256-GCM encryption for all PII (business registration numbers, contact information)

---

## 2. User Personas

### 2.1 Corporate Users (기업) - PRIMARY CUSTOMERS

**Profile:**
- Seeking R&D funding for technology development
- Business structure: 90% 법인 (Corporate), 10% 개인사업자 (Sole Proprietor)
- Decision makers: R&D Directors, CEOs, Business Development Managers
- Budget authority: ₩49-99K/month software subscription

**Pain Points:**
1. **Discovery Problem**: Scattered across multiple agency websites, difficult to track
2. **Deadline Anxiety**: Miss opportunities due to poor tracking
3. **Eligibility Confusion**: Complex TRL, certification requirements unclear
4. **Low Win Rates**: 15-20% success rate without proper guidance
5. **Consortium Formation**: Difficulty finding suitable partners

**Jobs to Be Done:**
- **Discover**: Find relevant grants automatically matched to profile
- **Qualify**: Understand eligibility before investing time in applications
- **Connect**: Find and contact potential consortium partners
- **Track**: Monitor deadlines and application status

### 2.2 National Research Institution Users (국가연구기관)

**Profile:**
- Government-funded research institutes (정부출연연구기관)
- Research institutes under government ministries (부처직할연구기관)
- Research institutes under local governments (지자체출연연구기관)
- Multi-year R&D budgets aligned to national priorities

**Key Requirements:**
- Consortium research project applications **require participation from companies and universities**
- Currently relies on **individual networks** for consortium formation (significant limitations exist)
- Need efficient partner discovery across industries and academia

**Pain Points:**
1. Limited visibility into potential corporate partners
2. Manual process for consortium member recruitment
3. Budget allocation and role distribution complexity
4. Difficulty finding companies with complementary TRL levels

**Subscription:** Same pricing as corporate users (Pro/Team plans)

### 2.3 University Research Teams (대학 연구팀)

**Profile:**
- Professor-led research teams seeking R&D funding
- Strong research capabilities but limited commercialization networks
- Need corporate partners for consortium applications

**Pain Points:**
1. Limited industry connections for consortium formation
2. Need partners with higher TRL levels for commercialization
3. Complex government application requirements

### 2.4 Public Institutions (공공기관)

**Profile:**
- Public entities that are not classified as national research institutions
- Examples: National Asian Culture Center (국립아시아문화전당), public corporations
- May participate in or lead specific types of R&D projects

**Pain Points:**
1. Finding appropriate research partners
2. Understanding eligibility for various programs

---

## 3. Functional Requirements

### 3.1 Authentication System

**Implementation:** NextAuth.js 4.0 with OAuth providers

| Feature | Description |
|---------|-------------|
| **OAuth Providers** | Kakao (primary), Naver (secondary) - Korean social login |
| **Session Management** | JWT tokens with 30-day expiration |
| **Session Storage** | HTTP-only cookies with Lax SameSite policy |
| **Role System** | USER, ADMIN, SUPER_ADMIN roles |

**API Endpoints:**
- `POST /api/auth/[...nextauth]` - OAuth authentication flows
- `GET /api/auth/[...nextauth]` - Session callbacks

**Session Token Contents:**
- userId
- role (USER/ADMIN/SUPER_ADMIN)
- organizationId

---

### 3.2 Organization Profile Management

**Supported Organization Types:**
- COMPANY (기업)
- RESEARCH_INSTITUTE (연구기관)
- PUBLIC_INSTITUTION (공공기관)

#### 3.2.1 Profile Fields

**Core Identity Fields:**

| Field | Korean | Type | Security |
|-------|--------|------|----------|
| name | 기관명 | Text | Plain |
| businessNumberEncrypted | 사업자등록번호 | Text | AES-256-GCM Encrypted |
| businessNumberHash | - | Text | SHA-256 Hash (uniqueness) |
| businessStructure | 법인/개인사업자 | Enum | Plain |
| industrySector | 산업 분야 | Text | Plain |

**Company Profile Fields:**

| Field | Korean | Type |
|-------|--------|------|
| revenueRange | 연매출 범위 | Enum (NONE, UNDER_1B, FROM_1B_TO_10B, etc.) |
| employeeCount | 직원 수 | Enum (UNDER_10, FROM_10_TO_50, etc.) |
| businessEstablishedDate | 설립일 | DateTime |

**R&D Capability Fields:**

| Field | Korean | Type |
|-------|--------|------|
| rdExperience | R&D 경험 | Boolean |
| technologyReadinessLevel | 기술준비수준 (TRL) | Int (1-9) |
| collaborationCount | 협력 실적 수 | Int |
| keyTechnologies | 핵심 기술 | String[] |
| certifications | 인증 현황 | String[] |
| hasResearchInstitute | 기업부설연구소 보유 | Boolean |

**Research Institute Fields:**

| Field | Korean | Type |
|-------|--------|------|
| instituteType | 기관 유형 | Enum (GOVERNMENT_FUNDED, PRIVATE_RESEARCH, UNIVERSITY_ATTACHED) |
| parentDepartment | 소속 부처/대학 | Text |
| researchFocusAreas | 연구 분야 | String[] |

**Consortium Preference Fields:**

| Field | Korean | Type |
|-------|--------|------|
| desiredConsortiumFields | 희망 컨소시엄 분야 | String[] |
| desiredTechnologies | 희망 기술 분야 | String[] |
| targetPartnerTRL | 희망 파트너 TRL | Int |
| commercializationCapabilities | 사업화 역량 | String[] |

**Contact Fields:**

| Field | Korean | Security |
|-------|--------|----------|
| primaryContactName | 담당자명 | Plain |
| primaryContactEmail | 이메일 | Encrypted |
| primaryContactPhone | 전화번호 | Encrypted |

#### 3.2.2 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/organizations` | POST | Create new organization |
| `/api/organizations/[id]` | GET | Retrieve organization profile |
| `/api/organizations/[id]` | PATCH | Update organization profile |
| `/api/organizations/profile-completion` | GET | Get profile completion score |

**Validation Rules:**
- Business registration number: 10 digits, XXX-XX-XXXXX format
- Duplicate business number check via SHA-256 hash
- Profile score auto-calculated on field changes

---

### 3.3 Funding Match Engine

**Data Source:** NTIS (National Science and Technology Information Service) - Single Source

#### 3.3.1 Matching Algorithm

**Score Breakdown (0-100 points):**

| Component | Points | Description |
|-----------|--------|-------------|
| Industry/Keyword Alignment | 30 | Cross-industry relevance matrix with Korean keyword normalization |
| TRL Compatibility | 20 | Graduated scoring: exact=20, ±1=12-15, ±2=6-10, ±3=0-5 |
| Organization Type Match | 20 | Program targetType alignment |
| R&D Experience Match | 15 | R&D experience (10pts) + collaboration level (2-5pts) |
| Deadline Proximity | 15 | Days until deadline scoring |

**Minimum Match Threshold:** 45 points

#### 3.3.2 Eligibility Filtering

**Hard Filters (Applied Before Scoring):**
1. Organization type targeting (strict for ACTIVE programs)
2. TRL range matching (exact for ACTIVE, ±3 for EXPIRED/historical)
3. Business structure restrictions
4. Industry category compatibility (minimum 40% relevance)

**Eligibility Classification:**
- `FULLY_ELIGIBLE` - Meets all requirements
- `CONDITIONALLY_ELIGIBLE` - Meets most, with warnings
- `INELIGIBLE` - Hidden from results

#### 3.3.3 API Endpoints

| Endpoint | Method | Description | Rate Limit |
|----------|--------|-------------|------------|
| `/api/matches/generate` | POST | Generate matches for organization | FREE: 3/month, PRO/TEAM: unlimited |
| `/api/matches` | GET | List generated matches | - |
| `/api/matches/[id]` | GET | Get specific match details | - |
| `/api/matches/[id]/explanation` | GET | AI-powered Korean explanation | PRO/TEAM only |
| `/api/matches/historical` | GET | Historical matches (expired programs) | - |

**Caching:** 24-hour TTL, invalidated on profile update

---

### 3.4 NTIS Data Integration

**Single Data Source:** NTIS API (국가과학기술정보서비스)

#### 3.4.1 Supported Agencies

| Agency | Korean Name | Data via NTIS |
|--------|-------------|---------------|
| IITP | 정보통신기획평가원 | Yes |
| KEIT | 한국산업기술평가관리원 | Yes |
| TIPA | 중소기업기술정보진흥원 | Yes |
| KIMST | 해양수산과학기술진흥원 | Yes |

All agencies publish through NTIS - no direct agency scraping.

#### 3.4.2 Scraping Architecture

**Workflow:**
```
NTIS API Call → XML Response → Parser →
Content Hash Check (change detection) →
Save to scraping_jobs → Process Worker →
Extract fields (eligibility, budget, TRL, deadlines) →
Update funding_programs → Invalidate cache
```

**Schedule:**
- NTIS API sync: Every 6 hours (automatic via cron)
- Process worker: Continuous queue processing (BullMQ)
- Change detection: SHA-256 hash prevents duplicates

**Attachment Processing:**
- Supported formats: PDF, HWP (Hancom Word), DOCX, XLSX
- HWP conversion via polaris library or Tesseract OCR fallback

#### 3.4.3 Database Tables

| Table | Purpose |
|-------|---------|
| `funding_programs` | All NTIS announcements with extracted fields |
| `scraping_jobs` | Raw scraping data before processing |
| `scraping_logs` | Historical log of scraping runs |
| `extraction_logs` | Field extraction details per job |
| `eligibility_verification` | Extracted eligibility criteria |

#### 3.4.4 Admin API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/scrape-ntis` | POST | Manually trigger NTIS scraping |
| `/api/admin/scraping-logs` | GET | View scraping run history |
| `/api/admin/cache-warming` | POST | Pre-load data into Redis cache |

---

### 3.5 Partner Discovery & Consortium Building

#### 3.5.1 Partner Search

**Complementary Matching Algorithm (0-100 points):**

| Component | Points | Description |
|-----------|--------|-------------|
| Complementary TRL Fit | 40 | Low-TRL institutes ↔ high-TRL companies |
| Industry/Tech Alignment | 30 | Shared domain expertise |
| Organization Scale Match | 15 | Compatible size and resources |
| R&D Experience | 15 | Proven collaboration capability |

**Key Concept:** Partner matching seeks **complementary** organizations, not identical profiles.

#### 3.5.2 API Endpoints - Partner Search

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/partners/search` | GET | Search partners with filters (type, industry, TRL) |
| `/api/partners/recommendations` | GET | Top 10 recommended partners |
| `/api/partners/[id]` | GET | Get partner organization profile |

#### 3.5.3 Consortium Management

**Consortium Workflow:**
1. Lead organization creates consortium project with target program
2. Lead invites partner organizations via contact requests
3. Partners accept/decline invitations
4. Budget and role distribution managed
5. Export consortium details for government application

**Consortium Member Roles:**
- `LEAD` - 주관기관
- `PARTICIPANT` - 참여기관
- `SUBCONTRACTOR` - 위탁연구기관

**Member Status:**
- `INVITED` - Invitation sent
- `ACCEPTED` - Member joined
- `DECLINED` - Invitation rejected
- `REMOVED` - Removed from consortium

#### 3.5.4 API Endpoints - Consortium

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/consortiums` | GET | List user's consortiums |
| `/api/consortiums` | POST | Create new consortium |
| `/api/consortiums/[id]` | GET | Get consortium details |
| `/api/consortiums/[id]` | PATCH | Update consortium |
| `/api/consortiums/[id]/members` | POST | Invite new member |
| `/api/consortiums/[id]/members/[memberId]/respond` | POST | Accept/decline invitation |
| `/api/consortiums/[id]/export` | POST | Export as PDF/Excel |

#### 3.5.5 Contact Requests

**Contact Types:**
- `COLLABORATION` - General partnership inquiry
- `CONSORTIUM_INVITE` - Consortium invitation
- `RESEARCH_PARTNER` - Academic collaboration
- `TECHNOLOGY_TRANSFER` - Licensing inquiry
- `OTHER` - Custom message

**Rate Limits:**
- FREE: View only (no sending)
- PRO: 10 contact requests/month
- TEAM: Unlimited

**API Endpoints:**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/contact-requests` | GET | List sent/received requests |
| `/api/contact-requests` | POST | Send new contact request |
| `/api/contact-requests/[id]/respond` | POST | Respond to request |

---

### 3.6 Email Notification System

#### 3.6.1 Notification Types

| Type | Trigger | Default |
|------|---------|---------|
| New Match Notification | High-score match generated (>70) | ON |
| Deadline Reminder (7 days) | 7 days before deadline | ON |
| Deadline Reminder (3 days) | 3 days before deadline | ON |
| Deadline Reminder (1 day) | 1 day before deadline | ON |
| Weekly Digest | Every Monday 9 AM KST | OFF |
| Beta Welcome | First signup | One-time |
| Payment Confirmation | Successful payment | Automatic |

#### 3.6.2 User Preferences

Stored in `User.notificationSettings` JSON:
- `emailEnabled` - Master on/off
- `newMatchNotifications` - New match emails
- `deadlineReminders` - Deadline reminder emails
- `weeklyDigest` - Weekly digest emails
- `minimumMatchScore` - Score threshold (default: 60)

#### 3.6.3 Email Infrastructure

- **Provider:** Nodemailer (SMTP)
- **Templates:** Custom HTML templates with Korean content
- **Tracking:** emailSent flag, emailSentAt timestamp

**API Endpoint:**
- `POST /api/settings/notifications` - Update notification preferences

---

### 3.7 Payment & Subscription System

#### 3.7.1 Payment Gateway

**Toss Payments Integration:**
- Korean PG (결제대행사)
- Billing key system for recurring payments
- Supports: Card, bank transfer, virtual account

#### 3.7.2 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/payments/checkout` | POST | Initiate checkout session |
| `/api/payments/checkout/success` | POST | Webhook after successful payment |
| `/api/subscriptions/me` | GET | Get current subscription |
| `/api/subscriptions/[id]/cancel` | POST | Cancel subscription |

#### 3.7.3 Database Tables

| Table | Purpose |
|-------|---------|
| `subscriptions` | User subscription records |
| `payments` | Payment transaction history |
| `refund_requests` | Refund request tracking |

#### 3.7.4 Refund Policy

**Statutory Refund (법정청약철회):**
- 7-day cooling off: 100% refund for consumers
- Billing error/duplicate payment: 100% refund

**Contractual Refund (임의반환):**
- Days-used calculation
- 10% penalty fee

---

### 3.8 AI Integration (Claude Sonnet 4.5)

#### 3.8.1 AI Services

**Match Explanation Service:**
- Model: Claude Sonnet 4.5
- Purpose: Generate Korean explanations for funding matches
- Gating: Pro/Team subscription only
- Caching: 6-hour Redis TTL

**Q&A Chat Service:**
- Model: Claude Sonnet 4.5
- Purpose: Answer questions about funding, consortiums, profiles
- Rate limiting: 10 messages/minute per user
- Context-aware with conversation history

#### 3.8.2 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/matches/[id]/explanation` | GET | AI match explanation |
| `/api/chat` | POST | Send chat message |
| `/api/chat` | GET | Get conversation history |
| `/api/ai-feedback` | POST | Submit feedback on AI responses |

#### 3.8.3 Cost Tracking

- Token usage logged per API call
- Monthly budget alerts (50%, 80%, 100% thresholds)
- Cost tracking in KRW

---

### 3.9 Team Management

**Team Tiers:**

| Plan | Max Members | Invite |
|------|-------------|--------|
| FREE | 1 | No |
| PRO | 1 | No |
| TEAM | 5 | Yes |

**API Endpoints:**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/team/members` | GET | List team members |
| `/api/team/members` | POST | Invite new member |
| `/api/team/members/[id]` | DELETE | Remove member |
| `/api/team/invite-link` | GET | Get shareable invite link |
| `/api/team/join` | POST | Join via invite link |

---

### 3.10 User Account Management

**API Endpoints:**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/users/export-data` | GET | GDPR-compliant data export |
| `/api/users/request-deletion-code` | POST | Request account deletion OTP |
| `/api/users/delete-account` | POST | Delete account with OTP |

---

## 4. Non-Functional Requirements

### 4.1 Performance Requirements

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| API Response Time (P95) | <500ms | >1s |
| Match Generation Time | <3 seconds | >5 seconds |
| Page Load Time | <2 seconds | >3 seconds |
| Concurrent Users | 500-1,500 | >1,200 |
| Database Connections | <150 | >180 |

### 4.2 Availability Requirements

| Period | Uptime Target | Justification |
|--------|---------------|---------------|
| Peak Season (Jan-Mar) | 99.9% | 80% of funding announcements |
| Off-Peak | 99.5% | Lower impact |
| Planned Maintenance | 4 hours/month | Scheduled weekends |

**Hot Standby Requirements (Peak Season):**
- Second server operational by Dec 31
- PostgreSQL streaming replication (<5 min RPO)
- Automated failover (<15 min RTO)
- PagerDuty 24/7 monitoring
- Weekly health checks during Jan-Mar

### 4.3 Security Requirements

| Requirement | Implementation | Compliance |
|-------------|----------------|------------|
| PII Encryption | AES-256-GCM | PIPA |
| Password Hashing | N/A (OAuth only) | - |
| Session Management | JWT, 30-day expiry | - |
| API Authentication | Bearer token | - |
| Rate Limiting | Redis, 100 req/min | DDoS protection |
| Secrets Management | GitHub Secrets (19) | Enterprise |

### 4.4 Compliance Requirements

- PIPA (개인정보보호법) compliant data handling
- Explicit consent for data sharing
- Data deletion on request
- Annual security audit

---

## 5. Technical Constraints

### 5.1 Technology Stack (Reference Only)

> **Note:** For implementation details, see `CLAUDE.md`

- **Frontend:** Next.js 14, React 18, TypeScript 5, Tailwind CSS
- **Backend:** Next.js API Routes, NextAuth.js 4 (Kakao, Naver)
- **Database:** PostgreSQL 15, Prisma ORM 6.19, Redis
- **AI:** Anthropic Claude Sonnet 4.5
- **Payments:** Toss Payments
- **Infrastructure:** Docker, GitHub Actions CI/CD

### 5.2 Hard Constraints

- Authentication: Kakao + Naver OAuth only (no email/password)
- Database: PostgreSQL 15 (no MySQL, no MongoDB)
- Encryption: AES-256-GCM for all PII
- Payments: Toss Payments only (Korean market)
- AI: Claude Sonnet 4.5 for explanations (no OpenAI)
- Language: Korean UI primary, English not required for MVP
- Data Source: NTIS only (single source)

---

## 6. Success Metrics & KPIs

### 6.1 Acquisition Metrics

| Metric | Month 1 | Month 3 | Month 6 |
|--------|---------|---------|---------|
| Registered Users | 50 | 110 | 240 |
| Companies (90%) | 45 | 100 | 220 |
| Research Institutes (10%) | 5 | 10 | 20 |
| Beta Conversion | 80% | - | - |

### 6.2 Engagement Metrics

| Metric | Target |
|--------|--------|
| Profile Completion | >90% |
| Weekly Active Users | >70% |
| Matches Viewed/Week | 5+ per user |
| Match Quality Rating | >4.0/5.0 |

### 6.3 Revenue Metrics

| Metric | Month 3 | Month 6 |
|--------|---------|---------|
| MRR (software) | ₩3.4M | ₩6.9M |
| Churn rate | <8% | <5% |
| LTV/CAC ratio | 2.9x | 3.9x |

---

## 7. Risk Management

### 7.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Peak season failure | Medium | Critical | Hot standby, 99.9% SLO |
| NTIS API changes | Low | High | Playwright backup, API monitoring |
| Data breach | Low | Critical | AES-256, PIPA compliance, audit |
| Deployment errors | Low | Medium | GitHub Actions CI/CD, auto-rollback |

### 7.2 Business Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Low conversion | Medium | High | Free tier value, quality matching |
| High churn | Medium | High | Quality matching, user engagement |
| Competitor with VC | Medium | Medium | Focus on user experience |

---

## 8. Schedule

**Public Launch Date:** December 12, 2025

**Production URL:** https://connectplt.kr

---

## 9. Appendix

### A. Glossary

| Term | Korean | Definition |
|------|--------|------------|
| TRL | 기술준비수준 | Technology Readiness Level (1-9) |
| NTIS | 국가과학기술정보서비스 | National Science and Technology Information Service |
| PIPA | 개인정보보호법 | Personal Information Protection Act |
| MRR | 월간반복매출 | Monthly Recurring Revenue |
| LTV | 고객생애가치 | Lifetime Value |
| CAC | 고객획득비용 | Customer Acquisition Cost |

### B. Organization Types

| Type | Korean | Description |
|------|--------|-------------|
| COMPANY | 기업 | Corporations and sole proprietors |
| RESEARCH_INSTITUTE | 연구기관 | Government-funded, ministry-affiliated, local government research institutes |
| PUBLIC_INSTITUTION | 공공기관 | Public entities (not research institutions) |

### C. Referenced Documents

- `CLAUDE.md` - Implementation guidelines (how to build)
- `prisma/schema.prisma` - Database schema (source of truth)
- `START-HERE-DEPLOYMENT-DOCS.md` - Deployment guide

### D. Change Log

| Version | Date | Changes |
|---------|------|---------|
| v9.0 | 2025-12-09 | Launch readiness update |
| v9.1 | 2025-12-09 | Claude Code optimization |
| v10.0 | 2025-12-09 | Scope update, functional requirements rewritten from codebase, user persona updates, removed secondary revenue streams |

---

**Document Status:** Production Ready
**Last Updated:** December 9, 2025
**Launch Date:** December 12, 2025
**Production URL:** https://connectplt.kr

*End of PRD v10.0*
