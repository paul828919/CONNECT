# Connect Beta Test Scenarios

**Version**: 1.0
**Last Updated**: October 10, 2025
**Target Audience**: Beta testers, QA team, internal testing
**Test Period**: Week 8-10 (November 27 - December 17, 2025)

---

## Overview

This document provides detailed test scenarios for Connect's beta testing phase. Each scenario includes step-by-step instructions, expected results, and feedback points to capture.

**Testing Goals:**
1. Validate rule-based matching accuracy (0-100 scoring)
2. Test AI features (Claude Sonnet 4.5 explanations and Q&A chat)
3. Verify circuit breaker and fallback system (99.9% availability)
4. Stress test performance (<500ms P95 response time)
5. Identify UX issues, bugs, and improvement opportunities

**Testing Methodology:**
- **Exploratory testing**: Free-form usage to discover edge cases
- **Structured scenarios**: Step-by-step test cases (documented below)
- **Performance testing**: Measure response times, cache hit rates
- **Accessibility testing**: Keyboard navigation, screen readers
- **Cross-device testing**: Desktop, mobile, tablet

---

## Table of Contents

1. [Scenario 1: Account Creation & Organization Setup](#scenario-1-account-creation--organization-setup)
2. [Scenario 2: Match Generation & Scoring Validation](#scenario-2-match-generation--scoring-validation)
3. [Scenario 3: AI Match Explanation Quality](#scenario-3-ai-match-explanation-quality)
4. [Scenario 4: Q&A Chatbot Conversation Flow](#scenario-4-qa-chatbot-conversation-flow)
5. [Scenario 5: Fallback System & Circuit Breaker](#scenario-5-fallback-system--circuit-breaker)
6. [Scenario 6: Sector Gates (ISMS-P, KC)](#scenario-6-sector-gates-isms-p-kc)
7. [Scenario 7: Feedback Widget Submission](#scenario-7-feedback-widget-submission)
8. [Scenario 8: Performance & Responsiveness](#scenario-8-performance--responsiveness)
9. [Scenario 9: Mobile Experience](#scenario-9-mobile-experience)
10. [Scenario 10: Edge Cases & Error Handling](#scenario-10-edge-cases--error-handling)

---

## Scenario 1: Account Creation & Organization Setup

### Objective
Test user onboarding flow from account creation to first match generation.

### Prerequisites
- None (fresh start)

### Steps

**1.1 Create Account via Kakao OAuth**
1. Navigate to: https://connect.kr
2. Click "시작하기" (Get Started) button
3. Click "카카오로 시작하기" (Continue with Kakao)
4. Authorize Kakao OAuth (use real or test account)
5. Verify redirect to dashboard

**Expected Results:**
- OAuth authorization screen loads within 2 seconds
- Redirect to dashboard after authorization
- Welcome message displayed: "환영합니다, {name}님!"

**Feedback to Capture:**
- Was OAuth process smooth?
- Any confusing steps?
- Response time acceptable?

---

**1.2 Complete Organization Profile (Company)**
1. Navigate to: Dashboard → Settings → Organization Info
2. Fill required fields:
   - Organization name: "ABC테크놀로지"
   - Organization type: "기업" (Company)
   - Business number: 123-45-67890
   - Industry: "ICT"
   - TRL level: 7
3. Fill optional fields:
   - Annual revenue: "₩1B - ₩10B" (₩1억~10억)
   - R&D experience: "3-5 projects"
   - Certifications: Check "ISMS-P"
4. Click "저장" (Save)

**Expected Results:**
- All fields save successfully
- Business number encrypted (display as ***-**-***90)
- Success message: "조직 정보가 저장되었습니다"
- Profile completeness: 100%

**Feedback to Capture:**
- Are field labels clear?
- Is business number encryption visible?
- Any missing fields?

---

**1.3 Alternative: Research Institute Profile**
1. Organization type: "연구소" (Research Institute)
2. Fill required fields:
   - Institute type: "Government-funded"
   - Research focus areas: ["인공지능", "빅데이터"]
   - Researcher count: 50
3. Optional: Annual R&D budget, key technologies

**Expected Results:**
- Different field set displayed for institutes vs. companies
- Validation errors if required fields missing

---

## Scenario 2: Match Generation & Scoring Validation

### Objective
Validate rule-based matching algorithm accuracy and scoring.

### Prerequisites
- Completed organization profile setup (Scenario 1)

### Steps

**2.1 Generate First Matches**
1. Navigate to: Dashboard
2. Click "매칭 시작" (Start Matching) button
3. Wait for algorithm to run (2-3 seconds)
4. View top 10 matches

**Expected Results:**
- Matches generated within 3 seconds
- Top 10 matches displayed, sorted by score (highest first)
- Each match shows:
  - Match score (0-100)
  - Program title (Korean)
  - Agency badge (IITP, KEIT, TIPA, KIMST)
  - Deadline countdown
  - Eligibility status (✅ Eligible / ⚠️ Warning / 🚫 Blocked)

**Feedback to Capture:**
- Are top matches relevant to your organization?
- Is the 0-100 score intuitive?
- Any obviously wrong matches in top 10?

---

**2.2 Validate Score Breakdown**
1. Click on top match to view details
2. Navigate to "Match Score Breakdown" section
3. Verify score components:
   - Industry match: 0-30 points
   - TRL compatibility: 0-20 points
   - Certifications: 0-20 points
   - Budget fit: 0-15 points
   - R&D experience: 0-15 points

**Expected Results:**
- Score breakdown sums to total match score
- Components explained in Korean
- Visual indicator (progress bars or color-coded)

**Test Cases:**

| Organization Profile | Expected Top Match Characteristics |
|----------------------|-----------------------------------|
| ICT, TRL 7, ISMS-P | ICT/software programs, TRL 5-9, ISMS-P required |
| Industrial, TRL 9, ISO 9001 | Industrial programs, TRL 7-9, manufacturing focus |
| Bio/Healthcare, TRL 5, no certs | Bio programs, TRL 3-7, entry-level requirements |

**Feedback to Capture:**
- Do score components make sense?
- Are weightings appropriate? (e.g., Industry 30pts feels right?)
- Any missing factors?

---

**2.3 Test Eligibility Gates**
1. View match details for programs with eligibility gates
2. Check "Eligibility Gates" section
3. Verify pass/fail status:
   - Organization type: ✅ Pass / 🚫 Fail
   - TRL range: ✅ Within ±2 levels / 🚫 Outside range
   - Sector gates: ISMS-P, KC (if applicable)
   - Budget constraints: ✅ Within min/max / 🚫 Outside

**Expected Results:**
- Clear pass/fail indicators
- Explanation of why blocked (if blocked)
- CTA: "자격 요건 충족하기" (Meet Requirements) → Links to services

**Feedback to Capture:**
- Are eligibility gates clear?
- Do you understand why blocked?
- Are recommendations helpful?

---

## Scenario 3: AI Match Explanation Quality

### Objective
Test Claude Sonnet 4.5 match explanation generation and caching.

### Prerequisites
- Generated matches (Scenario 2)

### Steps

**3.1 Generate First AI Explanation (Uncached)**
1. Click "AI 설명 보기" (View AI Explanation) on top match
2. Measure response time (should be 2-5 seconds)
3. Read explanation (400-500 characters)
4. Verify content:
   - ✅ Strengths section (why match is good)
   - ⚠️ Cautions section (potential issues)
   - 💡 Recommendations section (next steps)

**Expected Results:**
- Response time: 2-5 seconds (P95 <5s)
- Natural Korean language
- Personalized to your organization
- Actionable recommendations

**Example Expected Output:**
```
귀사(ABC테크놀로지, ICT, TRL 7)는 이 과제에 적합합니다(매칭 점수: 82점).

✅ 강점:
- 산업 분야 완벽 일치 (ICT, 30점)
- TRL 호환성 우수 (TRL 7-8 요구, 귀사 TRL 7, 20점)
- ISMS-P 인증 보유 (20점)

⚠️ 주의사항:
- 예산 범위 상한 근접 (연매출 ₩500M, 과제 최대 ₩600M 요구)

💡 추천 사항:
컨소시엄 구성을 고려하세요. 평균 +15% 선정률 향상.
```

**Feedback to Capture:**
- Is the Korean natural and professional?
- Does the explanation help you understand WHY this program matches?
- Are recommendations actionable?
- Is 400-500 characters the right length? (too short / too long / just right)

---

**3.2 Test Caching (Second Request)**
1. Click "AI 설명 보기" again on SAME match
2. Measure response time (should be <200ms)
3. Verify explanation is identical to first request

**Expected Results:**
- Response time: <200ms (instant, from Redis cache)
- Identical content to first request
- No visible "loading" state

**Feedback to Capture:**
- Did you notice the speed difference?
- Is caching transparent (you don't notice it)?

---

**3.3 Test Multiple Explanations (Uniqueness)**
1. Generate explanations for top 3 matches
2. Compare explanations side-by-side
3. Verify each explanation is unique and relevant

**Expected Results:**
- Each explanation addresses different match characteristics
- No generic/templated responses
- Personalized to each program

**Feedback to Capture:**
- Are explanations unique or feel copy-pasted?
- Do explanations address different programs' unique requirements?

---

## Scenario 4: Q&A Chatbot Conversation Flow

### Objective
Test Claude Sonnet 4.5 Q&A chatbot with context-aware responses.

### Prerequisites
- Generated matches (Scenario 2)

### Steps

**4.1 Start Conversation (Eligibility Question)**
1. Click "AI에게 질문하기" (Ask AI) on a match card
2. Chatbot opens in sidebar with program context pre-loaded
3. Type question: "우리 회사가 이 과제에 지원할 수 있나요?"
4. Wait for AI response (2-5 seconds)

**Expected Results:**
- Response time: 2-5 seconds
- AI checks:
  - Organization type match (company vs. institute)
  - TRL compatibility
  - Industry sector match
  - Certification requirements
- Response format:
  - ✅ Eligible / ⚠️ Warning / 🚫 Ineligible
  - Explanation of each requirement
  - Recommendations if not fully eligible

**Example Expected Response:**
```
네, 귀사(ABC테크놀로지)는 이 과제의 기본 자격 요건을 충족합니다:

✅ 조직 유형: 중소기업 (요구사항: 기업)
✅ TRL 수준: 7 (요구사항: TRL 7-9)
✅ 산업 분야: ICT (요구사항: ICT/소프트웨어)
✅ ISMS-P 인증 보유 (가점 요소)

다만, 과거 R&D 수행 실적이 1-2건으로 평균(3-5건)보다 낮습니다.
컨소시엄 구성을 통해 실적을 보완하는 것을 권장합니다.
```

**Feedback to Capture:**
- Is the answer accurate based on your profile?
- Is the format clear (✅/⚠️/🚫)?
- Are recommendations helpful?

---

**4.2 Follow-up Question (TRL Compatibility)**
1. Type: "TRL 7인데 TRL 8-9 요구사항을 충족할 수 있나요?"
2. Verify AI remembers previous conversation context

**Expected Results:**
- AI acknowledges your organization's TRL 7 (from previous message)
- Explains TRL advancement strategies:
  - Pilot testing (TRL 7 → TRL 8)
  - Commercial production planning (TRL 8 → TRL 9)
  - Timeline estimates (6-12 months)
  - Cost estimates (₩50-200M)
- CTA: "TRL 상향 컨설팅 (₩5-7M)"

**Feedback to Capture:**
- Did AI remember context from previous message?
- Is TRL advancement advice practical?

---

**4.3 Consortium Question**
1. Type: "컨소시엄을 어떻게 구성하나요?"
2. Verify AI provides actionable steps

**Expected Results:**
- AI explains consortium formation process
- Recommends:
  - Partner types (research institutes, universities)
  - Role division (company: commercialization, institute: R&D)
  - Budget allocation (typical 60/40 split)
- CTAs:
  - "컨소시엄 매칭 서비스 (₩3-5M)"
  - Free "파트너 찾기" feature

**Feedback to Capture:**
- Is consortium advice clear?
- Are CTAs non-intrusive?

---

**4.4 Test Conversation Memory (5+ messages)**
1. Continue conversation for 5+ message exchanges
2. Ask question referencing earlier messages
3. Example: "앞서 말씀하신 컨소시엄 비용이 얼마였나요?"

**Expected Results:**
- AI remembers last 10 messages (sliding window)
- Can reference previous topics
- Conversation feels coherent

**Feedback to Capture:**
- Does conversation feel natural?
- Does AI "forget" important context?
- Is 10-message memory sufficient?

---

**4.5 Test Edge Cases**

| Test Case | Input | Expected Behavior |
|-----------|-------|-------------------|
| Very long question (>500 chars) | Paste 3 paragraphs | AI summarizes and answers concisely |
| Typos and informal Korean | "이 과제 지원할수잇나여?" | AI understands and responds professionally |
| English question | "Can we apply for this?" | AI responds in English |
| Ambiguous question | "이거 좋나요?" | AI asks for clarification |
| Off-topic question | "오늘 날씨 어때요?" | AI redirects to funding topics |

**Feedback to Capture:**
- How does AI handle errors gracefully?
- Are ambiguous responses frustrating?

---

## Scenario 5: Fallback System & Circuit Breaker

### Objective
Verify service availability when AI API is down (99.9% SLO).

### Prerequisites
- Contact admin to manually trigger circuit breaker

### Steps

**5.1 Circuit Breaker CLOSED (Normal Operation)**
1. Verify current circuit state in Redis:
   ```bash
   redis-cli GET ai:circuit-breaker:status
   # Expected: "CLOSED" or null (default CLOSED)
   ```
2. Generate AI explanation (should work normally)
3. Chat with AI (should work normally)

**Expected Results:**
- AI features work as expected
- Response times: 2-5 seconds

---

**5.2 Admin Triggers Circuit OPEN**
1. Admin runs:
   ```bash
   redis-cli SET ai:circuit-breaker:status "OPEN"
   redis-cli EXPIRE ai:circuit-breaker:status 300
   ```
2. Try to generate AI explanation
3. Try Q&A chat

**Expected Results:**
- Circuit breaker detects OPEN state
- Requests fail fast (<100ms, no waiting)
- Fallback content displayed:
  - **Match explanation**: Generic Korean explanation with CTAs
  - **Q&A chat**: Context-aware template response

**Example Fallback (Match Explanation):**
```
이 과제는 귀사의 프로필과 일치하는 점이 많습니다.

✅ 산업 분야: ICT (귀사와 일치)
✅ TRL 수준: 7-9 (귀사 TRL 7 포함)
✅ 조직 유형: 기업 (귀사와 일치)

AI 분석 결과를 불러올 수 없습니다. 다음 일반 안내를 참고하세요.

💡 지원 전 확인 사항:
1. 자격 요건 (조직 유형, TRL, 인증)
2. 예산 범위 (최소/최대 매출 요구사항)
3. 신청 마감일 (충분한 준비 시간 확보)

📞 자세한 상담: support@connect.kr
```

**Feedback to Capture:**
- Did you notice the circuit breaker was OPEN?
- Was fallback content still useful? (1-5 scale)
- How long would you tolerate fallback mode before contacting support? (5 min / 30 min / 24 hours)
- Were you frustrated by degraded service?

---

**5.3 Circuit HALF_OPEN (Testing Recovery)**
1. Wait 30 seconds (circuit auto-transitions to HALF_OPEN)
2. Try to generate AI explanation (1 request allowed)
3. Verify:
   - If AI succeeds → Circuit goes CLOSED
   - If AI fails → Circuit stays OPEN for another 30s

**Expected Results:**
- Automatic recovery testing
- User not aware of HALF_OPEN state (seamless)

---

**5.4 Circuit CLOSED (Recovery Complete)**
1. Admin clears circuit state:
   ```bash
   redis-cli DEL ai:circuit-breaker:status
   ```
2. Generate AI explanation
3. Verify normal operation resumed

**Expected Results:**
- AI features work normally again
- Response times back to 2-5 seconds

**Feedback to Capture:**
- Was recovery seamless?
- Did you notice when service returned to normal?

---

## Scenario 6: Sector Gates (ISMS-P, KC)

### Objective
Test sector-specific eligibility gates for SaaS/AI companies (ISMS-P) and hardware/IoT (KC).

### Prerequisites
- Organization profile with ISMS-P or KC certification requirement

### Steps

**6.1 ISMS-P Gate (SaaS/AI Companies)**
1. Navigate to match details for program requiring ISMS-P
2. View "Sector Gates" section
3. If ISMS-P not held:
   - See readiness score: 0-100
   - See 16-item checklist:
     - Risk assessment
     - Security policy
     - Access control
     - Encryption
     - Incident response
     - PIPA compliance
     - ...
   - Estimate time to obtain: 6-12 months
   - Estimate cost: ₩20-50M
4. CTA: "ISMS-P 인증 계획 (₩3-5M)"

**Expected Results:**
- Clear blocked status (🚫)
- Actionable checklist (not just "you need ISMS-P")
- Realistic timeline and cost estimates
- Non-intrusive CTA

**Feedback to Capture:**
- Is the checklist helpful?
- Are estimates realistic?
- Does this help you decide whether to pursue?

---

**6.2 KC Gate (Hardware/IoT Companies)**
1. Navigate to match for program requiring KC certification
2. View "Sector Gates" section
3. If KC not held:
   - See 8-item document checklist:
     - Product spec sheet
     - Test report (safety, EMC)
     - Manufacturing process
     - Quality management system
     - User manual
     - ...
   - Testing body selection (KTC, KTL, KTR)
   - Estimate time: 3-6 months
   - Estimate cost: ₩5-30M (varies by product)
4. CTA: "KC 인증 계획 (₩3-5M)"

**Expected Results:**
- Document checklist practical
- Testing body recommendations based on product type
- Realistic timeline/cost

**Feedback to Capture:**
- Is KC gate information accurate?
- Would this help you prepare?

---

## Scenario 7: Feedback Widget Submission

### Objective
Test in-app feedback collection system.

### Prerequisites
- None

### Steps

**7.1 Submit Bug Report**
1. Click floating "💬 피드백" button (bottom-right)
2. Select category: "🐛 버그 리포트"
3. Title: "매칭 점수 계산 오류"
4. Description:
   ```
   매칭 점수가 음수(-5점)로 표시됩니다.

   발생 상황:
   - 조직 프로필: ICT, TRL 5
   - 과제: IITP 2025-001
   - 예상 점수: 60-70점
   - 실제 점수: -5점

   재현 방법:
   1. 대시보드 → 매칭 시작
   2. IITP 2025-001 과제 확인
   ```
5. Click "피드백 보내기"

**Expected Results:**
- Submission succeeds within 2 seconds
- Success message: "✅ 피드백이 성공적으로 제출되었습니다!"
- Modal auto-closes after 2 seconds
- Admin receives email notification within 5 minutes
  - Priority: HIGH (bug report)
  - Subject: "⚠️ HIGH PRIORITY New Feedback: BUG - 매칭 점수 계산 오류"

**Feedback to Capture:**
- Was submission process smooth?
- Are categories clear?

---

**7.2 Submit Feature Request**
1. Open feedback widget
2. Category: "💡 기능 제안"
3. Title: "CSV 내보내기 기능"
4. Description: "매칭 결과를 CSV로 내보낼 수 있으면 좋겠습니다. Excel에서 분석하고 싶습니다."
5. Submit

**Expected Results:**
- Priority: MEDIUM (feature request)
- Admin email subject: "📝 New Feedback: FEATURE_REQUEST - CSV 내보내기 기능"

---

**7.3 Test Anonymous Feedback (Not Logged In)**
1. Log out
2. Open feedback widget
3. Submit feedback
4. Verify:
   - Submission still works
   - Notice: "💡 피드백은 익명으로도 제출 가능합니다. 답변을 원하시면 로그인 후 제출해 주세요."

**Expected Results:**
- Anonymous feedback accepted
- userId = null in database
- Admin email shows "User: Anonymous"

---

## Scenario 8: Performance & Responsiveness

### Objective
Measure user-perceived performance across all features.

### Prerequisites
- Completed organization profile

### Steps

**8.1 Dashboard Load Time**
1. Clear browser cache
2. Navigate to: https://connect.kr/dashboard
3. Measure "Time to First Paint" (TTFP)
4. Measure "Time to Interactive" (TTI)

**Expected Results:**
- TTFP: <1 second (target), <2 seconds (acceptable)
- TTI: <2 seconds (target), <3 seconds (acceptable)

**Tools:**
- Chrome DevTools → Lighthouse
- Network tab → Disable cache, throttle to "Fast 3G"

---

**8.2 Match Generation Speed**
1. Click "매칭 시작"
2. Measure time from click to results displayed

**Expected Results:**
- P50: <2 seconds
- P95: <3 seconds

**Test Cases:**
- With cache: <1 second
- Without cache: <3 seconds

---

**8.3 AI Explanation (Uncached)**
1. Clear Redis cache
2. Generate AI explanation
3. Measure response time

**Expected Results:**
- P50: <3 seconds
- P95: <5 seconds

---

**8.4 AI Explanation (Cached)**
1. Generate explanation second time (same match)
2. Measure response time

**Expected Results:**
- P50: <100ms
- P95: <200ms

---

**8.5 Q&A Chat Message**
1. Send Q&A chat message
2. Measure time from send to AI response

**Expected Results:**
- P50: <3 seconds
- P95: <5 seconds

---

**8.6 Overall Responsiveness Assessment**
Rate overall platform responsiveness:
- [ ] Fast (everything feels instant)
- [ ] Acceptable (some delays but not frustrating)
- [ ] Slow (frequent waiting, frustrating)

**Feedback to Capture:**
- Slowest feature?
- Most responsive feature?
- Any features feel "stuck" or unresponsive?

---

## Scenario 9: Mobile Experience

### Objective
Test usability on mobile devices.

### Prerequisites
- iOS Safari or Android Chrome

### Steps

**9.1 Mobile Dashboard**
1. Access dashboard on mobile (iPhone/Android)
2. Verify:
   - Layout responsive (no horizontal scroll)
   - Match cards readable
   - Touch targets ≥44px (easy to tap)
   - No overlapping elements

**Expected Results:**
- Mobile-optimized layout
- Readable text (font size ≥14px)
- Easy navigation

---

**9.2 Mobile AI Chat**
1. Open Q&A chatbot on mobile
2. Type question using mobile keyboard
3. Verify:
   - Chat input not covered by keyboard
   - Scroll works smoothly
   - Copy/paste functional

**Expected Results:**
- Keyboard doesn't obscure input
- Smooth scrolling
- No layout breaks

---

**9.3 Mobile Feedback Widget**
1. Open feedback widget on mobile
2. Verify:
   - Modal fits screen
   - Textarea resizable
   - Submit button accessible

**Expected Results:**
- Full modal visible (no cutoff)
- Form usable

---

## Scenario 10: Edge Cases & Error Handling

### Objective
Test platform behavior under error conditions.

### Steps

**10.1 Slow Network (Throttle to "Slow 3G")**
1. Chrome DevTools → Network → Throttle: Slow 3G
2. Generate matches
3. Verify:
   - Loading indicators shown
   - Timeout handling (max 30 seconds)
   - Error message if timeout

**Expected Results:**
- Clear loading state
- Graceful timeout handling
- Retry option

---

**10.2 API Error (500 Response)**
Contact admin to trigger test error.

**Expected Results:**
- Error message: "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."
- Retry button
- Error logged to monitoring

---

**10.3 Invalid Input (Injection Attack)**
1. Try SQL injection in search:
   ```
   '; DROP TABLE users; --
   ```
2. Try XSS in feedback:
   ```html
   <script>alert('XSS')</script>
   ```

**Expected Results:**
- Input sanitized (no code execution)
- Safe error message

---

## Summary & Reporting

After completing scenarios, submit feedback via:
1. **In-app feedback widget** (preferred)
2. **Email**: support@connect.kr
3. **Beta Slack channel** (if invited)

**Feedback Format:**
- Scenario number
- Pass/Fail
- Issues found
- Severity (Critical / High / Medium / Low)
- Screenshots (if applicable)

**Thank you for beta testing Connect! 🚀**

Your feedback is invaluable for our January 1, 2026 launch.
