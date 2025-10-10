# Connect Beta User Onboarding Guide

**Version**: 1.0
**Last Updated**: October 10, 2025
**Target**: First 50 Beta Users (45 Companies + 5 Research Institutes)
**Beta Period**: Week 8-10 (November 27 - December 17, 2025)
**Launch Date**: January 1, 2026

---

## Table of Contents

1. [Beta Program Overview](#beta-program-overview)
2. [Beta Benefits](#beta-benefits)
3. [Getting Started (3-Minute Setup)](#getting-started-3-minute-setup)
4. [Platform Tour](#platform-tour)
5. [AI Features Guide](#ai-features-guide)
6. [Beta Test Scenarios](#beta-test-scenarios)
7. [Feedback Collection](#feedback-collection)
8. [Support & Contact](#support--contact)

---

## Beta Program Overview

### What is Connect?

**Connect** is Korea's R&D commercialization operating system that transforms companies' grant-seeking journey from discovery through winning. We combine automated matching with professional execution services, targeting companies as primary paying customers.

### Beta Goals

1. **Validate matching accuracy**: Test rule-based scoring (0-100 points) with 200-500 active funding programs
2. **Test AI features**: Claude Sonnet 4.5 for match explanations and Q&A chat
3. **Stress test infrastructure**: 50 concurrent users, <500ms P95 response time
4. **Gather feedback**: Identify bugs, UX issues, and feature requests before public launch
5. **Refine services GTM**: Test conversion funnel from software to consulting services

### Beta User Selection

- **45 Companies**: Primary paying customers (SMEs seeking R&D funding)
- **5 Research Institutes**: Supply-side for consortium matching (free accounts)
- **Selection criteria**: Industry diversity, TRL range 5-9, active R&D projects

### Beta Timeline

| Week | Dates | Focus | Target Users |
|------|-------|-------|--------------|
| Week 8 | Nov 27 - Dec 3 | Soft launch, core features | 5-10 companies |
| Week 9 | Dec 4 - Dec 10 | Scale testing, AI features | 20-30 companies |
| Week 10 | Dec 11 - Dec 17 | Final refinement, services | All 50 users |
| Week 11 | Dec 18 - Dec 24 | Code freeze, final testing | Internal QA only |
| Week 12 | Dec 25 - Dec 31 | Launch preparation | No new users |
| **Launch** | **Jan 1, 2026** | **Public launch** | **500 users by Month 4** |

---

## Beta Benefits

### 1. Exclusive Beta Pricing

- **₩4,900/month** for first 30 days (90% discount from ₩49,000)
- Auto-upgrade after 30 days with **50% off for 3 months** (₩24,500/month)
- **Total savings**: ₩118,700 over first 4 months

### 2. Full Pro Access

- **Unlimited matching**: Top 10 matches per user, updated 2x daily
- **AI explanations**: Claude Sonnet 4.5 for match reasoning
- **Q&A chatbot**: 24/7 instant answers to funding questions
- **Sector gates**: ISMS-P and KC certification readiness scores
- **Outcome tracking**: Win rate benchmarking (opt-in)

### 3. Priority Support

- **24-hour response guarantee** (vs. 48 hours for regular users)
- Direct email: support@connect.kr
- Beta Slack channel access (optional)
- Weekly office hours (30-minute Q&A sessions)

### 4. Early Adopter Recognition

- **Early Adopter Badge** on profile (displayed at launch)
- Featured in launch case studies (with permission)
- First access to new features (e.g., ML-based matching in Y2)
- Lifetime 20% discount on services (Application Review, Certification Planning, etc.)

---

## Getting Started (3-Minute Setup)

### Step 1: Create Account (30 seconds)

1. Visit: https://connect.kr
2. Click "베타 신청" (Beta Sign Up)
3. Choose login method:
   - **Kakao OAuth** (recommended for companies)
   - **Naver OAuth** (alternative)
   - Email + Password (for institutes)

4. Verify email (check spam folder if not received within 2 minutes)

### Step 2: Organization Profile Setup (1 minute)

Navigate to: **Dashboard → Settings → Organization Info**

**Required fields:**
- Organization name (조직명)
- Organization type (기업 / 연구소)
- Business registration number (사업자등록번호, companies only, AES-256-GCM encrypted)
- Industry sector (산업 분야)
  - Options: ICT, Industrial, Bio/Healthcare, Energy/Environment, Agriculture/Food, etc.
- TRL level (기술성숙도)
  - Scale: 1-9 (1 = Basic research, 9 = Commercial production)

**Optional fields (improves matching accuracy):**
- Annual revenue (연간 매출, ₩ millions)
- R&D experience (R&D 경험)
  - None / 1-2 projects / 3-5 projects / 6+ projects
- Certifications (보유 인증)
  - ISMS-P (정보보호 및 개인정보보호 관리체계)
  - KC (전기용품 및 생활용품 안전인증)
  - ISO 9001, ISO 14001, ISO 27001, etc.

### Step 3: First Match Generation (30 seconds)

1. Click "매칭 시작" (Start Matching) button on dashboard
2. Wait 2-3 seconds for algorithm to run
3. View top 10 matches sorted by score (0-100 points)

**What you'll see:**
- **Match cards** with funding program details
- **Match score** (0-100): Industry 30pts, TRL 20pts, Certifications 20pts, Budget 15pts, Experience 15pts
- **Eligibility status**: ✅ Eligible / ⚠️ Warning / 🚫 Blocked
- **Deadline countdown**: Days remaining until application deadline
- **CTAs**: "AI 설명 보기" (AI Explanation), "AI에게 질문하기" (Ask AI), "신청 준비하기" (Prepare Application)

### Step 4: Test AI Features (1 minute)

**Test 1: AI Match Explanation**
1. Click "AI 설명 보기" on any match card
2. Wait 2-3 seconds for Claude Sonnet 4.5 to generate explanation
3. Read Korean explanation (400-500 characters)

**Test 2: Q&A Chatbot**
1. Click "AI에게 질문하기" on any match card
2. Type question in Korean or English (e.g., "우리 회사가 이 과제에 지원할 수 있나요?")
3. Receive instant AI response with eligibility analysis, TRL compatibility, recommendations

---

## Platform Tour

### Dashboard Overview

**Widgets (left-to-right):**

1. **Active Matches** (10 cards)
   - Sorted by match score (highest first)
   - Color-coded: Green (✅ Eligible), Yellow (⚠️ Warning), Red (🚫 Blocked)
   - Quick actions: View details, AI explanation, Ask AI, Prepare application

2. **Upcoming Deadlines** (7 days)
   - Programs with deadlines in next 7 days
   - Email reminders: 7 days, 3 days, 1 day before deadline
   - Click to jump to match details

3. **Outcome Tracking** (optional)
   - Applications submitted (with status: Applied / Won / Lost / Pending)
   - Win rate comparison: "귀사와 유사한 조직의 평균 선정률: 38%"
   - Requires opt-in consent (PIPA-compliant)

4. **Services CTAs**
   - Application Review (₩2-3M, 7-10 days)
   - Certification Planning (₩3-5M, 2-3 weeks)
   - Consortium Formation (₩3-5M, 3-4 weeks)
   - TRL Advancement (₩5-7M, 4-6 weeks)

### Match Details Page

**Sections:**

1. **Program Information**
   - Title (Korean + English translation)
   - Agency (IITP, KEIT, TIPA, KIMST)
   - Budget range (₩ millions)
   - Application deadline
   - Announcement URL (link to original source)

2. **Match Score Breakdown**
   - Industry match: 0-30 points
   - TRL compatibility: 0-20 points
   - Certifications: 0-20 points
   - Budget fit: 0-15 points
   - R&D experience: 0-15 points
   - **Total: 0-100 points**

3. **Eligibility Gates**
   - Organization type: ✅ Pass / 🚫 Fail
   - TRL range: ✅ Within ±2 levels / 🚫 Outside range
   - Sector gates (if applicable):
     - **ISMS-P gate** (SaaS/AI companies): 16-item checklist, readiness score 0-100
     - **KC gate** (Hardware/IoT): 8-item document checklist, testing body selection
   - Budget constraints: ✅ Within min/max revenue / 🚫 Outside range

4. **AI Explanation** (click to load)
   - Korean language, 400-500 characters
   - Explains: Why this program matches, What you need to qualify, Recommended next steps
   - Cached after first load (instant subsequent views)

5. **Q&A Chatbot** (sidebar)
   - Context-aware: Pre-loaded with program details + organization profile
   - Example questions:
     - "우리 회사가 이 과제에 지원할 수 있나요?" (Can we apply?)
     - "TRL 7인데 TRL 8-9 요구사항을 충족할 수 있나요?" (TRL compatibility)
     - "ISMS-P 인증이 없으면 어떻게 하나요?" (Missing certifications)
     - "컨소시엄을 구성해야 하나요?" (Consortium requirements)

### Settings Page

**Tabs:**

1. **Organization Info**: Update profile, TRL, certifications
2. **Notification Preferences**: Email frequency (daily / weekly / none), deadline reminders
3. **Privacy**: Outcome tracking opt-in, data sharing preferences
4. **Billing**: Subscription plan, payment method (Toss Payments), tax invoices
5. **API Access**: API keys for programmatic matching (Team plan only)

---

## AI Features Guide

### Feature 1: AI Match Explanations (Claude Sonnet 4.5)

**Purpose**: Explain why a funding program matches your organization in plain Korean.

**How it works:**
1. User clicks "AI 설명 보기" on match card
2. Backend sends prompt to Claude Sonnet 4.5:
   - Match score breakdown (Industry, TRL, Certifications, etc.)
   - Organization profile (industry, TRL, certifications, revenue, experience)
   - Program requirements (eligibility, TRL range, budget, certifications)
3. AI generates 400-500 character Korean explanation
4. Response cached in Redis (24-hour TTL)
5. Cost logged to database (`ai_cost_logs` table)

**Example output:**
```
귀사(ABC테크놀로지, ICT, TRL 7-8)는 이 과제에 적합합니다(매칭 점수: 82점).

✅ 강점:
- 산업 분야 완벽 일치 (ICT, 30점)
- TRL 호환성 우수 (TRL 7-8 요구, 귀사 TRL 7, 20점)
- ISMS-P 인증 보유 (20점)

⚠️ 주의사항:
- 예산 범위 상한 근접 (연매출 ₩500M, 과제 최대 ₩600M 요구)
- R&D 경험 1-2건으로 평균보다 낮음 (가점 5점)

💡 추천 사항:
컨소시엄 구성을 고려하세요. 과거 수행 실적이 부족한 경우 연구기관 파트너십이 선정 확률을 높일 수 있습니다 (평균 +15% 선정률).
```

**Fallback strategy (AI unavailable):**
1. Check Redis cache first (instant response)
2. If cache miss + AI down → Generic Korean fallback content
3. Never show errors to users (seamless degradation)

**Performance targets:**
- P50: <2 seconds (cached: <200ms)
- P95: <5 seconds
- Cache hit rate: >60% after 7 days

### Feature 2: Q&A Chatbot (Context-Aware)

**Purpose**: Answer funding-related questions with program and organization context.

**How it works:**
1. User types question in chat input (Korean or English)
2. Backend constructs prompt with context:
   - **Program context**: Title, agency, budget, eligibility, TRL requirements
   - **Organization context**: Industry, TRL, certifications, revenue, experience
   - **Conversation history**: Previous 10 messages (sliding window)
3. AI generates context-aware response
4. Conversation saved to database (`ai_chat_sessions`, `ai_chat_messages` tables)
5. Cost tracked per message

**Example conversation:**
```
User: 우리 회사가 이 과제에 지원할 수 있나요?
AI: 네, 귀사(ABC테크놀로지)는 이 과제의 기본 자격 요건을 충족합니다:
✅ 조직 유형: 중소기업 (요구사항: 기업)
✅ TRL 수준: 7 (요구사항: TRL 7-9)
✅ 산업 분야: ICT (요구사항: ICT/소프트웨어)
✅ ISMS-P 인증 보유 (가점 요소)

다만, 과거 R&D 수행 실적이 1-2건으로 평균(3-5건)보다 낮습니다.
컨소시엄 구성을 통해 실적을 보완하는 것을 권장합니다.

User: 컨소시엄을 어떻게 구성하나요?
AI: Connect의 컨소시엄 매칭 서비스(₩3-5M, 3-4주)를 통해 다음을 지원합니다:
1. 기술 분야 적합 연구기관 매칭 (KIST, ETRI, 대학 연구소 등)
2. 파트너 역량 검증 및 warm intro
3. 역할 분담 설계 (기업: 상용화, 연구소: 기술개발)
4. 협약서 템플릿 제공

또는 무료로 Connect 플랫폼의 "파트너 찾기" 기능을 사용할 수도 있습니다
(연구소 5개 등록, 직접 연락 가능).
```

**Fallback strategy:**
1. Cache: Recent similar questions (fuzzy match on embeddings, future feature)
2. AI down → Context-aware template responses:
   - Eligibility questions → Check organization type + TRL + certifications
   - TRL questions → Compare user TRL vs. program TRL range
   - Certification questions → List missing certifications + estimated time/cost
3. Generic fallback: "현재 AI 서비스가 일시적으로 사용 불가능합니다. 이메일(support@connect.kr)로 문의하시면 24시간 이내 답변 드리겠습니다."

**Rate limiting:**
- Free plan: 10 messages/day
- Pro plan: 100 messages/day
- Team plan: Unlimited

### Feature 3: Circuit Breaker & Fallback System

**Purpose**: Ensure 99.9% service availability even when AI API is down.

**Circuit Breaker States:**

| State | Behavior | Trigger | Recovery |
|-------|----------|---------|----------|
| **CLOSED** | Normal operation, all requests to AI | Default | N/A |
| **OPEN** | AI unavailable, all requests fail fast (<100ms) | 5 failures in 60 seconds | After 30 seconds → HALF_OPEN |
| **HALF_OPEN** | Testing recovery, 1 test request allowed | After 30s in OPEN | Success → CLOSED, Failure → OPEN |

**Fallback Tiers:**

1. **Tier 1: Redis Cache** (fastest, <200ms)
   - Match explanations: 24-hour TTL
   - Q&A responses: Fuzzy match on question embeddings (future)

2. **Tier 2: AI API** (normal, 2-5 seconds)
   - Claude Sonnet 4.5 via Anthropic API
   - Retry logic: 3 attempts with exponential backoff

3. **Tier 3: Fallback Content** (degraded, <100ms)
   - Generic Korean explanations (still useful, not "error messages")
   - Context-aware templates for common questions
   - Professional tone: "AI 분석 결과를 불러올 수 없습니다. 다음 일반 안내를 참고하세요..."

**User experience:**
- **Circuit CLOSED** (normal): "AI 설명 생성 중..." → Full explanation
- **Circuit OPEN** (AI down): "AI 설명 불러오는 중..." → Fallback content (users don't know it's fallback)
- **No error messages shown** (seamless degradation)

**Monitoring:**
- Admin dashboard: Circuit breaker status (real-time)
- Email alerts: Circuit OPEN for >5 minutes
- Slack notifications: Circuit state changes (optional)

---

## Beta Test Scenarios

### Scenario 1: Match Generation & Scoring

**Goal**: Validate rule-based matching accuracy.

**Steps:**
1. Set up organization profile with known characteristics:
   - Industry: ICT
   - TRL: 7
   - Certifications: ISMS-P
   - Revenue: ₩500M
   - R&D experience: 3-5 projects

2. Generate matches (click "매칭 시작")

3. Verify top 3 matches:
   - Industry match: Should be ICT/software programs (30 points)
   - TRL compatibility: TRL 5-9 programs (20 points if ±2 levels)
   - Certifications: Programs requiring ISMS-P (20 points)
   - Budget fit: Programs with ₩300-700M revenue range (15 points)
   - Experience: Programs for 3-5 project companies (15 points)

4. **Expected total score**: 75-95 points for top matches

**Feedback to provide:**
- Are top matches relevant to your organization?
- Are any high-scoring matches obviously wrong?
- Are any low-scoring matches actually very relevant? (false negatives)
- Is the 0-100 scale intuitive?

### Scenario 2: AI Match Explanations

**Goal**: Test Claude Sonnet 4.5 explanation quality and caching.

**Steps:**
1. Click "AI 설명 보기" on top 3 matches
2. Read explanations (400-500 characters each)
3. Click "AI 설명 보기" again on same match (should load instantly from cache)
4. Compare explanations for different matches (should be unique, not generic)

**Feedback to provide:**
- Is the Korean natural and professional?
- Does the explanation help you understand WHY this program matches?
- Are the ✅ Strengths, ⚠️ Cautions, 💡 Recommendations sections useful?
- Is 400-500 characters the right length? (too short / too long / just right)
- Did cached responses load instantly (<200ms)?

### Scenario 3: Q&A Chatbot Conversation

**Goal**: Test context-aware chat responses and conversation memory.

**Steps:**
1. Open Q&A chatbot for a specific funding program
2. Ask 5+ questions in sequence:
   - Q1: "우리 회사가 이 과제에 지원할 수 있나요?" (Eligibility)
   - Q2: "TRL 7인데 TRL 8-9 요구사항을 충족할 수 있나요?" (TRL compatibility)
   - Q3: "ISMS-P 인증이 없으면 어떻게 하나요?" (Missing certifications)
   - Q4: "예산이 얼마나 필요한가요?" (Budget)
   - Q5: "컨소시엄을 구성해야 하나요?" (Consortium)

3. Verify AI remembers previous questions (conversation context)
4. Test edge cases:
   - Very long question (>500 characters)
   - Typos and informal Korean
   - English questions
   - Ambiguous questions

**Feedback to provide:**
- Did AI provide accurate, helpful answers?
- Did AI remember previous conversation context?
- Were responses too generic or too specific?
- Did any responses feel "robotic" or unnatural?
- Response time acceptable? (<5 seconds per message)

### Scenario 4: Fallback System (Circuit Breaker Testing)

**Goal**: Verify service remains available when AI API is down.

**Steps:**
1. Contact admin to manually trigger circuit breaker OPEN state
2. Try to generate AI explanation (should show fallback content within <1 second)
3. Try Q&A chatbot (should show fallback message)
4. Verify no error messages shown (graceful degradation)
5. Wait 30 seconds for circuit HALF_OPEN state
6. Try again (should test AI recovery)

**Feedback to provide:**
- Did you notice the circuit breaker was OPEN? (if no, that's good—seamless)
- Was fallback content still useful, or completely unhelpful?
- Did you feel frustrated by degraded service?
- How long would you tolerate fallback mode before contacting support? (5 min / 30 min / 24 hours)

### Scenario 5: Performance & Responsiveness

**Goal**: Measure user-perceived performance across all features.

**Steps:**
1. Navigate to dashboard (time to first paint)
2. Generate matches (click "매칭 시작", time to results)
3. Load AI explanation (first time: uncached, second time: cached)
4. Send 3 Q&A chat messages (measure per-message latency)
5. Test on different devices:
   - Desktop browser (Chrome, Safari, Edge)
   - Mobile browser (iOS Safari, Android Chrome)
   - Tablet (optional)

**Feedback to provide:**
- Overall responsiveness: Fast / Acceptable / Slow
- Slowest feature: Dashboard / Matching / AI Explanation / Q&A Chat
- Did any feature feel "stuck" or unresponsive?
- Mobile experience: Usable / Needs improvement / Unusable
- Network conditions: Fast WiFi / Slow WiFi / Mobile 4G/5G

---

## Feedback Collection

### How to Submit Feedback

**Method 1: In-App Feedback Widget** (recommended)
1. Click floating "💬 피드백" button (bottom-right corner, all pages)
2. Select category:
   - 🐛 Bug Report
   - 💡 Feature Request
   - 👍 Positive Feedback
   - 👎 Complaint
   - ❓ Question
3. Write feedback (Korean or English, 10-2000 characters)
4. Optional: Upload screenshot (max 5MB)
5. Submit → Admin notified via email within 5 minutes

**Method 2: Email**
- Send to: support@connect.kr
- Subject: [Beta Feedback] Your topic
- Include: Screenshots, error messages, steps to reproduce

**Method 3: Beta Slack Channel** (optional, invite-only)
- Real-time discussion with other beta users
- Weekly office hours with founding team
- Share tips and best practices

### What Feedback We Need

**High Priority:**
- 🐛 **Bugs**: Broken features, error messages, crashes
- ⚠️ **Incorrect matching**: High-scoring matches that are obviously wrong
- 🔒 **Security/Privacy concerns**: Data leaks, unauthorized access
- 🚫 **Blockers**: Features that completely prevent usage

**Medium Priority:**
- 💡 **Feature requests**: Missing functionality, workflow improvements
- 🎨 **UX issues**: Confusing UI, hard-to-find features
- 📱 **Mobile problems**: Layout issues, touch targets too small
- ⚡ **Performance**: Slow loading, timeouts, lag

**Low Priority:**
- 👍 **Positive feedback**: What you love (helps us prioritize)
- 📖 **Documentation**: Unclear instructions, missing guides
- 🎨 **Design tweaks**: Color schemes, font sizes, spacing

### Feedback Response SLA

| Priority | Response Time | Resolution Target |
|----------|---------------|-------------------|
| **Critical** (service down, data loss) | <2 hours | <24 hours |
| **High** (blockers, security) | <8 hours | <72 hours |
| **Medium** (bugs, UX issues) | <24 hours | 1-2 weeks |
| **Low** (enhancements, minor tweaks) | <48 hours | Post-launch backlog |

---

## Support & Contact

### Support Channels

**Email**: support@connect.kr
- Response time: <24 hours (beta users), <2 hours (critical issues)
- Include: Account email, organization name, detailed description, screenshots

**Dashboard**: https://connect.kr/dashboard/feedback
- In-app feedback widget (fastest for bug reports)
- Auto-includes: Browser info, page URL, user session ID

**Beta Slack** (invite-only): #connect-beta
- Real-time chat with founding team
- Weekly office hours: Every Wednesday 2-3 PM KST
- Share tips with other beta users

### Founding Team

**Paul Kim** (Founder & CEO)
- Email: paul@connect.kr
- Focus: Product strategy, customer success, services
- Availability: Mon-Fri 9 AM - 6 PM KST

**Technical Team**
- Email: tech@connect.kr
- Focus: Platform development, AI integration, infrastructure
- Availability: Mon-Sat 24/7 (on-call for critical issues)

### Useful Resources

**Documentation**:
- Platform Guide: https://connect.kr/docs
- API Documentation: https://connect.kr/docs/api (Team plan only)
- Video Tutorials: https://connect.kr/tutorials (coming soon)

**Legal**:
- Terms of Service: https://connect.kr/terms
- Privacy Policy: https://connect.kr/privacy
- MSA for Services: https://connect.kr/services/msa (off-budget clause)

**Blog**:
- Product Updates: https://connect.kr/blog
- Beta User Stories: https://connect.kr/blog/beta (with permission)
- Funding Tips: https://connect.kr/blog/insights

---

## Appendix: Technical Details for Power Users

### API Rate Limits (Beta)

| Feature | Free Plan | Pro Plan | Team Plan |
|---------|-----------|----------|-----------|
| Match generation | 10/day | Unlimited | Unlimited |
| AI explanations | 10/day | 100/day | Unlimited |
| Q&A chat messages | 10/day | 100/day | Unlimited |
| API requests | N/A | N/A | 1,000/hour |

### Data Privacy & Security

**Encryption:**
- Business registration numbers: AES-256-GCM (PIPA-compliant)
- Passwords: Argon2id hashing
- API keys: SHA-256 hashing
- TLS 1.3 for all connections

**Data retention:**
- Match history: 365 days
- AI chat logs: 90 days (admin review), 30 days (user-facing)
- Outcome data: Indefinite (opt-in, aggregated only)

**Data sharing:**
- Aggregate analytics: Opt-in required (e.g., win rates by industry)
- Individual results: Never disclosed
- Minimum 5 data points for any public stat

### Performance Targets

| Metric | Target (Beta) | Target (Launch) |
|--------|---------------|-----------------|
| API response (P95) | <1000ms | <500ms |
| Match generation | <5s | <3s |
| AI explanation (uncached) | <5s | <3s |
| AI explanation (cached) | <500ms | <200ms |
| Q&A chat message | <5s | <3s |
| Dashboard load (TTFP) | <2s | <1s |

### Browser Support

**Fully supported:**
- Chrome 100+ (desktop & mobile)
- Safari 15+ (macOS & iOS)
- Edge 100+
- Firefox 100+

**Partially supported:**
- Chrome 90-99 (degraded AI features)
- Safari 14 (no push notifications)

**Not supported:**
- Internet Explorer (end of life)
- Browsers with JavaScript disabled

---

**Welcome to Connect Beta! 🚀**

Thank you for being one of our first 50 users. Your feedback will shape the future of Korea's R&D commercialization ecosystem. Let's build something amazing together!

Questions? Email support@connect.kr or visit https://connect.kr/dashboard/feedback.
