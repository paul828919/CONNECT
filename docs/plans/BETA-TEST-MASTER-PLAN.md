<!-- Auto-update on 2025-10-19 KST -->
## Update — 2025-10-19 (Beta Plan & Tester Sourcing)

- **Trial policy**: **14-day free → ₩24,500/month**.
- **Tester sourcing**: Up to **100** LinkedIn prospects; target **≥50** active beta testers.
- **Process**: Implement Toss first; run internal testing; then iterate weekly on feedback until **2025-12-01**; launch **2025-12-02**.

# Connect Platform: Beta Test Master Plan
## Stealth Beta Strategy for Confident January 1, 2026 Launch

**Version**: 1.0  
**Created**: October 10, 2025  
**Author**: Paul Kim (Founder & CEO)  
**Launch Date**: January 1, 2026 00:00 KST  
**Beta Period**: November 1 - December 2, 2025 (4 weeks)  
**Project Root**: `/Users/paulkim/Downloads/connect`

---

## Executive Summary

### Current Status
- **Overall Progress**: 58% complete (Weeks 1-2 + Days 15-23)
- **Timeline**: 6 days ahead of schedule
- **Infrastructure**: Hot standby operational (0 byte lag, ~2s failover)
- **AI Integration**: Claude Sonnet 4.5 complete with Korean prompts
- **Days to Launch**: 83 days remaining

### Beta Approach: "Stealth Beta"
Rather than traditional public beta testing, Connect will execute a **stealth beta strategy**:
- **Target**: 3-5 early customers (SMEs seeking R&D funding)
- **Recruitment**: Cold outreach to target market (NOT personal network)
- **Positioning**: "Exclusive early access before public launch"
- **Pricing**: Free 30 days → ₩24,500/month (50% off for lifetime)
- **Timeline**: 4 weeks of private testing before Jan 1 public launch
- **Goal**: Validate product, gather testimonials, refine positioning

### Strategic Rationale

**Why Beta Testing is Non-Negotiable:**
1. **Matching algorithm untested**: Rule-based scoring needs real user validation
2. **AI prompt quality unknown**: Korean explanations need user feedback
3. **Infrastructure load untested**: Only synthetic tests completed, need real usage patterns
4. **First impression is only impression**: B2B SaaS doesn't get second chances
5. **Marketing insights required**: Can't build strategy without knowing what users value

**Why "Stealth Beta" Approach:**
1. **Lower emotional risk**: Small private group vs. public exposure
2. **Higher quality feedback**: Paying customers vs. favor-asking friends
3. **Better testimonials**: Real users with real problems
4. **Marketing validation**: Learn value prop, positioning, objections
5. **Safe Docker learning**: Practice deployment with 5 users, not 500

---

## Beta Philosophy

### Reframing Beta Testing

**OLD THINKING (Fear-Driven):**
- "Beta testing exposes my work to criticism"
- "People in my network won't take it seriously"
- "I need everything perfect before showing anyone"
- "Beta testing delays launch"

**NEW THINKING (Safety-Driven):**
- "Beta testing protects my work by validating it first"
- "Target market users are allies who need this solution"
- "Early feedback makes the product better before high-stakes launch"
- "Beta testing enables confident launch with proof points"

### Beta Users are Early Customers, Not Testers

| Traditional Beta | Connect Stealth Beta |
|------------------|---------------------|
| "Can you test my product?" | "Exclusive early access for 5 companies" |
| Friends/family doing favors | SMEs with real R&D funding needs |
| Free testing, no commitment | Paid service (free trial → 50% off) |
| Generic feedback | Specific pain points and use cases |
| "It's okay" responses | Detailed feedback to improve product |
| No testimonials | 3-5 case studies and quotes |

### Key Principles

1. **Safety Net, Not Exposure**
   - Beta catches bugs before 500 public users see them
   - Private feedback is a gift, not a judgment
   - Small group = low stakes, high learning

2. **Data-Driven Marketing**
   - Listen to exact words users say
   - Identify true value proposition
   - Understand objections and friction points
   - Build case studies for Jan 1 launch

3. **Iterative Refinement**
   - Fix critical bugs immediately (< 24 hours)
   - Tune matching algorithm based on relevance feedback
   - Refine AI prompts based on helpfulness ratings
   - Improve UX based on usage patterns

4. **Confidence Building**
   - Validate technical infrastructure under real load
   - Prove matching accuracy with real organizations
   - Confirm AI quality meets user expectations
   - Launch Jan 1 with evidence, not hope

---

## Strategic Timeline

### Overview (Oct 10, 2025 → Jan 1, 2026)

```
Oct 10────────Oct 31──────Nov 14──────Dec 15────Dec 31──Jan 1
   │            │            │            │          │      │
   │  Phase 1   │  Phase 2   │  Phase 3   │ Phase 4  │  🚀  │
   │ Dogfood +  │  Staging + │   Stealth  │ Refine + │Launch│
   │  Prep      │   Docker   │    Beta    │  Freeze  │      │
   └────────────┴────────────┴────────────┴──────────┴──────┘
    3 weeks      2 weeks       4 weeks      2 weeks    DAY 1
```

### Phase 1: Self-Dogfooding & Preparation (Oct 10-31, 3 weeks)

**Goal**: Complete remaining development, use Connect yourself, fix obvious issues

**Key Milestones**:
- ✅ Week 3-4 completion (Days 24-29: Load testing, optimization)
- ✅ Domain purchase + HTTPS setup (Oct 10-12)
- ✅ Week 5 completion (Nov security hardening, bug fixes)
- ✅ Self-dogfooding: Paul uses Connect for 1 week (Oct 24-31)
- ✅ Beta recruitment preparation: Scripts, templates, target lists

**Deliverables**:
- All code complete through Week 5
- Domain operational with HTTPS
- Self-dogfooding issues documented and fixed
- Beta recruitment materials ready
- Staging environment prepared

### Phase 2: Staging & Docker Learning (Nov 1-14, 2 weeks)

**Goal**: Learn Docker deployment safely, practice on staging server

**Key Milestones**:
- ✅ Staging environment on Linux PC (Nov 1-3)
- ✅ Docker practice: Build, run, debug (Nov 4-7)
- ✅ Full deployment test on staging (Nov 8-10)
- ✅ Beta user recruitment active (Nov 1-14, parallel track)
- ✅ Production deployment ready (Nov 14)

**Deliverables**:
- Docker configuration tested and validated
- Staging environment mirrors production
- Rollback procedures documented and tested
- 10-15 beta invitations sent (expecting 3-5 acceptances)
- Production server ready for deployment

### Phase 3: Stealth Beta Deployment (Nov 15 - Dec 15, 4 weeks)

**Goal**: Real user validation, gather feedback, refine product

**Key Milestones**:
- ✅ Deploy to production (Nov 15)
- ✅ Onboard 3-5 beta users (Nov 15-17)
- ✅ Daily monitoring and support (Nov 18 - Dec 15)
- ✅ Weekly feedback collection (4 rounds)
- ✅ Continuous refinement (fix bugs, tune algorithms, improve UX)

**Deliverables**:
- 3-5 active beta users using Connect regularly
- 30-50 pieces of specific feedback collected
- Critical bugs fixed (< 24 hour turnaround)
- Matching accuracy validated (60%+ relevance)
- AI quality validated (50%+ helpfulness)
- 3-5 testimonials collected
- Case studies written

### Phase 4: Refinement & Code Freeze (Dec 16-31, 2 weeks)

**Goal**: Implement high-priority improvements, prepare for public launch

**Key Milestones**:
- ✅ Implement top improvements from beta feedback (Dec 16-20)
- ✅ Final load testing with improvements (Dec 21-22)
- ✅ Code freeze (Dec 25)
- ✅ Launch materials prepared (Dec 26-30)
- ✅ Final system health check (Dec 31)

**Deliverables**:
- All high-priority beta issues resolved
- System validated under 10x load test
- Marketing materials ready (landing page, case studies, testimonials)
- Support infrastructure ready (help docs, FAQ, contact form)
- Launch day checklist complete

### Phase 5: Public Launch (Jan 1, 2026) 🚀

**Goal**: Confident public launch with validated product and proof points

**Launch Assets**:
- Validated matching algorithm (tested with real users)
- Refined AI prompts (tuned based on feedback)
- 3-5 testimonials from real customers
- Case studies showing actual value delivered
- Clear value proposition (from beta user feedback)
- Target persona identified (based on who engaged most)
- Launch announcement with social proof

---

## Success Criteria

### Minimum Viable Beta (Pass/Fail Gates)

#### Technical Validation (Required for Launch)

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| **Critical Bugs** | Zero | User-reported + monitoring logs |
| **Matching Generation** | 100% success rate | All users get results in <5s |
| **AI Explanation Load** | <5s P95 (uncached) | Performance monitoring |
| **AI Explanation Cache** | <500ms P95 (cached) | Performance monitoring |
| **Q&A Chat Response** | <5s P95 | Performance monitoring |
| **Infrastructure Uptime** | 99%+ during beta | Monitoring dashboard |
| **Data Integrity** | Zero corruption events | Database audit logs |
| **Security Issues** | Zero critical vulnerabilities | User reports + audit |

#### Product Validation (Required for Launch)

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| **Match Relevance** | 60%+ of top 10 rated "relevant" | User feedback surveys |
| **AI Helpfulness** | 50%+ explanations rated "helpful" | Thumbs up/down in UI |
| **User Engagement** | 3+ logins per user over 4 weeks | Analytics tracking |
| **Feature Discovery** | 80%+ try AI explanation | Usage analytics |
| **Feature Discovery** | 50%+ try Q&A chat | Usage analytics |
| **Application Intent** | 1+ user applies to matched program | User self-report |

#### Business Validation (Nice to Have)

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| **Beta Users** | 3-5 active users | Recruitment tracking |
| **Feedback Volume** | 10+ items per user | Feedback widget + interviews |
| **Testimonials** | 3+ usable quotes | Direct requests |
| **Case Studies** | 2+ detailed stories | User interviews |
| **Payment Conversion** | 2+ users pay ₩24,500/month | Billing system (manual) |
| **Referrals** | 1+ beta user refers someone | Word-of-mouth tracking |

### Decision Framework

**GO for Jan 1 Launch if:**
- ✅ All Technical Validation metrics pass
- ✅ All Product Validation metrics pass
- ✅ At least 2 of 6 Business Validation metrics pass
- ✅ Zero unresolved critical bugs
- ✅ Founder confidence HIGH (subjective but important)

**NO-GO (Delay Launch) if:**
- 🚫 Any Technical Validation metric fails
- 🚫 More than 2 Product Validation metrics fail
- 🚫 More than 3 critical bugs unresolved
- 🚫 Matching algorithm fundamentally broken
- 🚫 AI quality unacceptably poor (<30% helpfulness)

**Delayed Launch Timeline:**
- If NO-GO on Dec 25: Delay to Jan 15 (2 extra weeks)
- Re-assess on Jan 10
- Do NOT launch without meeting Technical Validation

---

## Beta User Recruitment Strategy

### Target Profile: Ideal Beta User

**Organizational Characteristics:**
- **Type**: SME (small-to-medium enterprise)
- **Industry**: Technology-heavy (ICT, Software, AI, Biotech, Hardware)
- **Size**: 10-100 employees
- **Revenue**: ₩500M - ₩10B annually
- **TRL Level**: 5-8 (development to pilot stage)
- **R&D Status**: Active projects, seeking government funding
- **Location**: South Korea (NTIS programs are Korea-only)

**Behavioral Indicators:**
- Recently applied to government R&D programs (shows active need)
- LinkedIn posts about R&D challenges or funding
- Mentioned in startup accelerator alumni lists
- Published in tech news about product development
- Hiring for R&D roles (indicates active projects)

**Why This Profile:**
- They have REAL pain (need R&D funding now)
- They have BUDGET (can pay ₩24,500/month after free trial)
- They have TIME (will actually use Connect, not just sign up)
- They provide QUALITY feedback (technical, specific, actionable)

### Recruitment Channels (Priority Order)

#### Channel 1: NTIS Grant Winner Lists (Highest Quality)

**Why This Works:**
- Public data shows companies that WON grants recently
- These companies will apply again (repeat behavior)
- They understand government R&D programs (educated users)
- They have R&D infrastructure (likely to benefit)

**Execution:**
1. Go to ntis.go.kr → Search "과제 정보" (Project Information)
2. Filter: Year 2023-2024, Organization Type "기업" (Company)
3. Export: Company names, project titles, dates
4. LinkedIn search: Find R&D managers at these companies
5. Cold email: "축하합니다! [Project Name] 선정을 보았습니다..."

**Script Template:**
```
Subject: [Company Name]의 차기 R&D 과제 준비를 도와드립니다

안녕하세요, [Name]님.

NTIS에서 [Project Name] 선정 소식을 보았습니다. 축하드립니다!

저는 한국 기업들이 정부 R&D 과제를 더 빠르고 정확하게 찾도록 돕는 
Connect 플랫폼을 개발했습니다.

Connect는 IITP, KEIT, TIPA 등의 200개 이상 프로그램을 자동으로 매칭하고,
AI 기반 적합성 분석을 제공합니다.

1월 정식 출시 전, 5개 기업에게만 다음 혜택을 드립니다:
✅ 7일 무료 체험
✅ 평생 50% 할인 (₩24,500/월, 정상가 ₩49,000)
✅ 우선 기능 추가 요청권

관심 있으시면 간단히 답장 주세요.
15분 데모로 어떻게 도움이 되는지 보여드리겠습니다.

감사합니다.
Paul Kim
Founder, Connect
paul@connect.kr
```

**Expected Response Rate**: 10-20% (2-4 out of 20 contacted)

#### Channel 2: LinkedIn Cold Outreach (High Volume)

**Why This Works:**
- Direct access to R&D managers and CTOs
- Professional context (not spam)
- Can see company size, industry, recent activity
- LinkedIn profiles show R&D focus

**Execution:**
1. LinkedIn search: "R&D Manager" OR "CTO" OR "연구개발 담당" 
2. Filters: South Korea, Technology companies, 10-100 employees
3. Review profiles: Look for government grant mentions, R&D posts
4. Send connection request with note
5. Follow up with message after connection

**Connection Request Template (300 char limit):**
```
안녕하세요! 한국 기업들이 정부 R&D 과제를 찾고 선정되도록 돕는 
Connect 플랫폼을 개발했습니다. [Company]의 R&D 전략에 
도움이 될 수 있을 것 같아 연결 요청 드립니다.
```

**Follow-up Message Template:**
```
[Name]님, 연결 감사드립니다.

Connect는 IITP, KEIT, TIPA 등 200개 이상의 R&D 프로그램을 
귀사의 TRL, 산업 분야, 인증 현황에 맞춰 자동으로 매칭합니다.

AI 기반 적합성 분석으로 "왜 이 과제가 적합한지" 설명하고,
24/7 Q&A 챗봇으로 지원 자격 질문에 즉시 답변합니다.

1월 정식 출시 전, 5개 기업에게만:
✅ 30일 무료 + 평생 50% 할인 (₩24,500/월)
✅ 우선 기능 추가 요청

15분 데모 관심 있으시면 언제 편하신지 알려주세요.

감사합니다.
Paul
```

**Expected Response Rate**: 5-10% (1-2 out of 20 contacted)

#### Channel 3: Startup Incubators & Accelerators (Warm Intros)

**Why This Works:**
- Incubators have portfolios of 20-100 companies
- Program managers can introduce you (warm intro > cold)
- Startups actively seek funding (high need)
- Accelerators value tools that help their portfolio

**Execution:**
1. List major incubators: TIPS, K-Startup, D.CAMP, SparkLabs, FuturePlay, etc.
2. Find program managers on LinkedIn
3. Pitch Connect as tool to help their portfolio companies
4. Ask for 3-5 introductions to companies seeking R&D funding

**Program Manager Pitch Template:**
```
Subject: Connect 플랫폼 - [Accelerator] 포트폴리오 기업 지원 도구

안녕하세요, [Name]님.

저는 한국 기업들이 정부 R&D 과제를 더 효과적으로 찾도록 돕는 
Connect 플랫폼을 개발한 Paul Kim입니다.

[Accelerator]의 졸업 기업 중 R&D 자금이 필요한 곳들이 많을 것 같아
연락 드렸습니다.

Connect는:
- 200개 이상 IITP/KEIT/TIPA 프로그램 자동 매칭
- AI 기반 적합성 분석 및 Q&A
- TRL, 산업, 인증 기반 맞춤 추천

1월 정식 출시 전, [Accelerator] 기업들에게 특별 혜택을 드리고 싶습니다:
✅ 3개월 무료 체험 (정상 ₩49,000/월)
✅ 졸업 기업 전용 50% 할인 (평생)

R&D 자금이 필요한 포트폴리오 기업 3-5곳 소개해주시면
어떻게 도움이 되는지 직접 보여드리겠습니다.

15분 통화 가능하신 시간 알려주시면 감사하겠습니다.

Paul Kim
Founder, Connect
paul@connect.kr
```

**Expected Response Rate**: 20-30% (managers like tools that help their portfolio)

#### Channel 4: Industry Associations (Batch Recruiting)

**Why This Works:**
- Associations have member directories
- Can post in forums/newsletters
- Members are pre-qualified (same industry)
- Association endorsement adds credibility

**Execution:**
1. Identify relevant associations:
   - Korea Venture Business Association (중소벤처기업협회)
   - Software Industry Association (소프트웨어산업협회)
   - Biotechnology Industry Association (한국바이오협회)
   - Electronics Industry Association (전자산업협회)
2. Contact association PR team
3. Ask to post in newsletter or member forum
4. Offer special member pricing

**Association Post Template:**
```
[회원 기업 대상] Connect 플랫폼 베타 테스터 모집

안녕하세요, [Association] 회원 여러분.

정부 R&D 과제를 찾는 데 평균 20시간 이상 소요되시나요?

Connect는 IITP, KEIT, TIPA 등 200개 이상 프로그램을
귀사의 TRL, 산업, 인증에 맞춰 3초 만에 매칭합니다.

AI 기반 적합성 분석과 24/7 Q&A 챗봇으로
"왜 이 과제가 적합한지", "지원 자격이 되는지" 즉시 확인 가능합니다.

[Association] 회원 대상 특별 혜택:
✅ 7일 무료 체험
✅ 회원 전용 40% 할인 (₩29,400/월, 정상가 ₩49,000)
✅ 1월 정식 출시 전 5개 기업 한정

신청: paul@connect.kr 또는 https://connect.kr/beta
```

**Expected Response Rate**: 2-5% (but reaches 100-500 members at once)

### Recruitment Timeline

| Week | Date | Activity | Goal |
|------|------|----------|------|
| **Week 1** | Nov 1-7 | Prepare materials (scripts, landing page) | Ready to launch |
| **Week 2** | Nov 8-14 | Active outreach (20-30 contacts per channel) | 10-15 invitations sent |
| **Week 3** | Nov 15-21 | Follow-ups + onboarding first 2-3 users | 3 users onboarded |
| **Week 4** | Nov 22-28 | Onboard remaining 1-2 users | 5 users total |

### Backup Plan: If Recruitment Fails

**If <3 users by Nov 21:**
1. Expand outreach to 50+ contacts (double down)
2. Offer 3 months free (instead of 30 days)
3. Lower barrier: "Just try it, no payment info required"
4. Use personal network as last resort (but frame as early customers, not favors)
5. Delay public launch to Jan 15 (2 extra weeks to recruit)

**Do NOT launch publicly without beta testing.**

---

## Risk Mitigation

### Risk 1: Docker Deployment Failure

**Probability**: Medium (first time deploying with Docker)  
**Impact**: High (blocks beta testing)

**Mitigation**:
- ✅ Practice on staging server first (Nov 1-7)
- ✅ Break things intentionally to learn
- ✅ Document rollback procedures
- ✅ Keep MacBook Pro M4 Max dev server as backup
- ✅ Schedule deployment for low-traffic time (early morning)

**Contingency**:
- If production deployment fails → Roll back to dev server
- Beta users access via ngrok tunnel temporarily
- Fix Docker issues while serving from dev
- Re-deploy to production when fixed (beta users are forgiving)

### Risk 2: No Beta User Signups

**Probability**: Low-Medium (depends on outreach quality)  
**Impact**: Critical (can't validate product)

**Mitigation**:
- ✅ Start recruitment 2 weeks early (Nov 1, not Nov 15)
- ✅ Use 4 channels simultaneously (NTIS, LinkedIn, Incubators, Associations)
- ✅ Offer compelling incentives (free 30 days + 50% off forever)
- ✅ Lower friction: No payment info required upfront
- ✅ Warm intros from incubators (higher conversion than cold)

**Contingency**:
- If <3 users by Nov 21 → Double outreach (50+ contacts)
- If still <3 users by Nov 28 → Expand to personal network
- If <2 users by Dec 5 → Delay launch to Jan 15 (recruit harder)
- **DO NOT skip beta testing entirely**

### Risk 3: Critical Bugs in Production

**Probability**: Medium (complex system, real users)  
**Impact**: High (user frustration, reputation damage)

**Mitigation**:
- ✅ Self-dogfooding for 1 week (Oct 24-31) catches obvious bugs
- ✅ Staging environment mirrors production (practice deployment)
- ✅ Start with 2-3 users (Nov 15-17), add more later (Nov 22-28)
- ✅ Monitor logs actively (24/7 for first 3 days)
- ✅ Quick response SLA: Fix critical bugs within 24 hours

**Contingency**:
- If critical bug found → Fix immediately, deploy hotfix
- If bug affects all users → Take site down, fix, redeploy (beta users will understand)
- If bug is fundamental → Pause onboarding new users until fixed
- Document all bugs for post-launch prevention

### Risk 4: Matching Algorithm Inaccuracy

**Probability**: Medium-High (never tested with real users)  
**Impact**: High (core value proposition fails)

**Mitigation**:
- ✅ Self-test with diverse organization profiles (Oct 24-31)
- ✅ Ask beta users to rate match relevance (0-10 scale)
- ✅ Collect feedback: "Which matches were irrelevant and why?"
- ✅ Tune scoring weights based on feedback (Industry 30pts → 35pts?)
- ✅ Iterate quickly: Push algorithm updates within 48 hours

**Contingency**:
- If <50% relevance → Pause onboarding, fix algorithm
- If systematic bias found (e.g., always ranks IITP too high) → Adjust weights
- If algorithm fundamentally broken → Delay launch to Jan 15, redesign
- Beta testing exists to catch this BEFORE public launch

### Risk 5: AI Quality Below Expectations

**Probability**: Medium (prompts untested with real users)  
**Impact**: Medium (affects Pro plan conversion, but not core matching)

**Mitigation**:
- ✅ Thumbs up/down on all AI responses (immediate feedback)
- ✅ Ask users: "Was this explanation helpful? What was missing?"
- ✅ Refine prompts based on ratings (target >50% helpful)
- ✅ A/B test prompt variations (Week 3-4 prep already done)
- ✅ Fallback to rule-based explanations if AI down (circuit breaker)

**Contingency**:
- If <30% helpfulness → Pause AI feature, investigate
- If hallucinations found → Add more constraints to prompts
- If responses too generic → Add more context (organization profile, program details)
- If responses too technical → Simplify language, add examples
- Can launch without AI if necessary (Free plan only, delay Pro plan)

### Risk 6: Emotional Burnout (Solo Founder)

**Probability**: Medium (high stress, pivot from previous business)  
**Impact**: Critical (if founder burns out, project stops)

**Mitigation**:
- ✅ Beta is only 5 users, not 500 (manageable workload)
- ✅ Set boundaries: Support 9 AM - 6 PM KST only
- ✅ Celebrate small wins (first beta user, first testimonial)
- ✅ Remember: Beta feedback is helping, not hurting
- ✅ Take weekends off (no beta support on weekends)

**Contingency**:
- If feeling overwhelmed → Reduce beta users to 3 (minimum viable)
- If burnout setting in → Take 3-day break, beta users will understand
- If emotional distress → Talk to founder peers, therapist, or mentor
- **Your mental health > launch deadline**

---

## Resource Requirements

### Technical Resources

**Hardware**:
- ✅ MacBook Pro M4 Max 16 (development)
- ✅ Linux PC (12900k, 128GB RAM) - production server
- ✅ Backup laptop (in case M4 Max fails) - optional but recommended

**Software/Services**:
- ✅ Domain: connect.kr or similar (₩15-30K/year)
- ✅ HTTPS: Let's Encrypt (free)
- ✅ Email: Google Workspace or Naver Works (₩6-12K/month)
- ✅ Anthropic API: $10 USD credit (already purchased)
- ✅ Monitoring: Built-in (Prometheus + Grafana already set up)

**Optional (Nice to Have)**:
- Error tracking: Sentry (free tier) - recommended
- Analytics: PostHog or Mixpanel (free tier) - recommended
- Email automation: SendGrid (free tier 100/day) - optional

### Time Investment

**Paul's Time** (Solo Founder):

| Phase | Duration | Hours/Week | Total Hours |
|-------|----------|------------|-------------|
| Phase 1: Dogfood + Prep | 3 weeks | 40-50 hrs | 120-150 hrs |
| Phase 2: Staging + Docker | 2 weeks | 30-40 hrs | 60-80 hrs |
| Phase 3: Stealth Beta | 4 weeks | 20-30 hrs | 80-120 hrs |
| Phase 4: Refinement | 2 weeks | 30-40 hrs | 60-80 hrs |
| **TOTAL** | **11 weeks** | **25-45 hrs/wk** | **320-430 hrs** |

**Beta User Time** (Expected):
- Onboarding: 30 minutes
- Using Connect: 10-15 hours over 4 weeks
- Feedback interviews: 1-2 hours total

### Financial Budget

| Item | Cost | Notes |
|------|------|-------|
| Domain (connect.kr) | ₩15-30K/year | One-time |
| Anthropic API | $10 USD (~₩13K) | Already purchased |
| Email (Google Workspace) | ₩6K/month × 3 = ₩18K | Optional |
| Beta user incentives | ₩0 | Free 30 days (no revenue) |
| Total | **₩31-61K** | Very low cost |

**Revenue During Beta**: ₩0 (all users free for 30 days)  
**Revenue After Beta**: ₩122,500/month if all 5 convert to ₩24,500/month

---

## Communication Plan

### Beta User Communication Cadence

**Week 1 (Onboarding)**:
- Day 1: Welcome email + 30-min onboarding call
- Day 3: Check-in email ("How's it going?")
- Day 7: First feedback survey

**Week 2-3 (Active Usage)**:
- Weekly check-in email (every Wednesday)
- Immediate response to feedback (<4 hours)
- Bug fix notifications (when deployed)

**Week 4 (Wrap-up)**:
- Final feedback survey
- Thank you email + request for testimonial
- Invitation to continue at ₩24,500/month

### Internal Communication (Solo Founder)

**Daily**:
- Morning: Review monitoring dashboards (9 AM)
- Evening: Check feedback widget + emails (6 PM)

**Weekly**:
- Monday: Plan week's priorities based on feedback
- Friday: Document wins, challenges, learnings

**Bi-Weekly**:
- Update IMPLEMENTATION-STATUS.md with progress
- Review success metrics (on track for launch?)

### External Communication (Public)

**During Beta (Nov 15 - Dec 15)**:
- 🚫 No public announcements (stealth mode)
- 🚫 No social media posts
- 🚫 No press releases
- ✅ LinkedIn: Only to beta user prospects (private messages)

**Launch Preparation (Dec 16-31)**:
- ✅ Write case studies from beta feedback
- ✅ Design landing page with testimonials
- ✅ Prepare launch announcement (social media, email, blog)
- ✅ Contact tech journalists (embargo until Jan 1)

**Launch Day (Jan 1, 2026)**:
- ✅ Public announcement on LinkedIn, Twitter, Facebook
- ✅ Email to waiting list (if any)
- ✅ Submit to Product Hunt, BetaList, etc.
- ✅ Press release to Korean tech media

---

## Appendix A: Self-Dogfooding Checklist

### Week 1: Oct 24-31 (7 days)

**Goal**: Use Connect as if you were a customer, find and fix obvious issues

**Setup** (Day 1: Oct 24):
- [ ] Create test organization profile (your own company or fictional)
  - Organization: Innowave (real) or TestTech (fictional)
  - Industry: ICT or Biotech (familiar to you)
  - TRL: 7 (realistic)
  - Certifications: ISMS-P (if applicable)
  - Revenue: ₩500M (realistic for SME)
  - R&D experience: 3-5 projects

**Daily Usage** (Days 2-7: Oct 25-31):
- [ ] Day 2: Generate matches, review top 10
  - Are matches relevant?
  - Are scores logical?
  - Any obvious bad matches?
  
- [ ] Day 3: Click "AI 설명 보기" on 5 matches
  - Are explanations clear and helpful?
  - Is Korean natural (존댓말 quality)?
  - Do they explain WHY this program matches?
  
- [ ] Day 4: Use Q&A chatbot, ask 10 questions
  - TRL questions: "TRL 7인데 TRL 8-9 과제 지원 가능?"
  - Eligibility: "우리 회사 이 과제 지원 가능?"
  - Certification: "ISMS-P 없으면 어떻게?"
  - Budget: "예산이 얼마나 필요?"
  - Consortium: "컨소시엄 구성 필요?"
  
- [ ] Day 5: Search and filter programs
  - Use search bar (keyword search)
  - Apply filters (agency, TRL range, budget)
  - Sort by deadline, score, agency
  
- [ ] Day 6: Mobile testing (iOS or Android)
  - Can you view matches on phone?
  - Is text readable?
  - Can you click buttons?
  - Is scrolling smooth?
  
- [ ] Day 7: Review and document issues
  - Create GitHub issues for all bugs found
  - Prioritize: P0 (critical) → P1 (high) → P2 (medium) → P3 (low)
  - Fix P0 issues immediately
  - Plan P1 fixes for Week 5

**Documentation**:
- [ ] Create `docs/dogfooding/self-test-report.md`
- [ ] List all issues found (with screenshots)
- [ ] Document what works well (celebrate!)
- [ ] Identify areas needing improvement before beta

**Success Criteria**:
- ✅ Zero P0 bugs remaining by Oct 31
- ✅ All P1 bugs documented for Week 5 fixes
- ✅ Confident that basic functionality works
- ✅ Ready to show Connect to real users

---

## Appendix B: Beta User Onboarding Script

### 30-Minute Onboarding Call Agenda

**Minutes 0-5: Welcome & Context**
```
안녕하세요, [User Name]님! Connect 베타에 참여해주셔서 감사합니다.

오늘 30분간:
1. Connect가 무엇인지 간단히 소개하고
2. 계정 설정을 함께 진행하며
3. 주요 기능을 시연해드리겠습니다.

질문이 있으시면 언제든 편하게 말씀해주세요.

먼저, [Company Name]에서는 현재 어떤 R&D 프로젝트를 진행 중이신가요?
정부 R&D 과제에 지원해보신 적 있으신가요?
```

**Minutes 5-10: Account Setup**
```
좋습니다. 이제 계정을 함께 설정해보겠습니다.

[Share screen: https://connect.kr]

1. 카카오 또는 네이버로 로그인 (OAuth)
2. 조직 정보 입력:
   - 조직명: [Company Name]
   - 산업 분야: [Industry] - 어떤 게 가장 맞으세요?
   - TRL 수준: [TRL] - 현재 기술 성숙도는 어느 정도?
   - 연매출: [Revenue] - 대략적인 범위만
   - R&D 경험: [Experience] - 정부 과제 몇 건 정도?
   - 보유 인증: [Certifications] - ISMS-P, KC 등

걱정 마세요, 나중에 언제든 수정 가능합니다.
```

**Minutes 10-15: First Match Generation**
```
좋습니다! 이제 "매칭 시작" 버튼을 눌러볼게요.

[Click "매칭 시작", wait 2-3 seconds]

짠! 200개 이상의 프로그램 중에서 [Company Name]에게 가장 적합한 
Top 10 프로그램을 찾았습니다.

각 프로그램마다 매칭 점수(0-100점)가 있는데,
- 산업 분야 일치도 (30점)
- TRL 호환성 (20점)
- 인증 보유 여부 (20점)
- 예산 적합성 (15점)
- R&D 경험 (15점)

이렇게 5가지 기준으로 계산됩니다.

[Point to top match]

이 프로그램(85점)이 가장 높게 나왔네요.
실제로 관심 가질만한 프로그램인가요?
```

**Minutes 15-20: AI Features Demo**
```
이제 Connect만의 특별한 기능을 보여드릴게요.

[Click "AI 설명 보기"]

이 버튼을 누르면 AI가 "왜 이 프로그램이 귀사에 적합한지"를 
한국어로 설명해줍니다.

[Wait 2-3 seconds for explanation to load]

보시면, 강점/주의사항/추천사항으로 나뉘어 있습니다.
이런 설명이 도움이 되시나요?

[Open Q&A chatbot]

그리고 여기 채팅 버튼을 누르면,
"우리 회사가 이 과제에 지원 가능한가요?" 같은 질문을 
24/7 AI에게 물어볼 수 있습니다.

한번 질문해보세요. 무엇이든 물어보셔도 됩니다.
```

**Minutes 20-25: Search & Filter Demo**
```
마지막으로, 검색과 필터 기능을 보여드릴게요.

[Show search bar]

여기서 키워드로 검색할 수 있습니다. 예: "인공지능", "빅데이터"

[Show filters]

그리고 여기서 필터로 좁힐 수 있습니다:
- 주관 기관 (IITP, KEIT, TIPA...)
- TRL 범위
- 예산 범위
- 마감일 임박도
- 산업 분야

필터를 조정하면 실시간으로 결과가 업데이트됩니다.

[Company Name]에서 주로 관심있는 기관이나 예산 범위가 있나요?
```

**Minutes 25-30: Next Steps & Questions**
```
좋습니다! 30분 동안 Connect의 핵심 기능을 모두 보셨습니다.

이제 [Company Name]님께서 직접 사용해보시면서:
1. 매일 또는 일주일에 2-3번 로그인해서 매칭 결과 확인
2. 관심있는 프로그램에 AI 설명 읽어보기
3. 궁금한 점 있으면 채팅으로 질문하기
4. 불편한 점이나 개선 아이디어 있으면 피드백 버튼으로 알려주기

베타 기간 동안:
✅ 30일 완전 무료
✅ 이메일/Slack으로 24시간 이내 답변
✅ 피드백 주시면 즉시 반영

그리고 베타 종료 후에는 평생 50% 할인 (₩24,500/월)을 드립니다.

혹시 지금 궁금하신 점이나 바로 시도해보고 싶은 기능이 있나요?
```

---

## Appendix C: Beta Feedback Collection Template

### Weekly Feedback Survey (Google Forms)

**Survey 1: Week 1 (After First Use)**

**Section 1: First Impressions**
1. Connect를 처음 사용했을 때 어떤 느낌이 들었나요? (1-5 scale)
   - 1 = 매우 복잡함
   - 5 = 매우 직관적
   
2. 계정 설정 과정은 어땠나요? (1-5 scale)
   - 1 = 매우 어려움
   - 5 = 매우 쉬움
   
3. 첫 매칭 결과가 나오기까지 시간이 적절했나요?
   - [ ] 너무 빨랐음 (놀랍지 않음)
   - [ ] 적절함 (2-3초)
   - [ ] 너무 느렸음 (5초 이상)

**Section 2: Matching Quality**
4. Top 10 매칭 중 몇 개가 실제로 관심있는 프로그램이었나요?
   - [ ] 0-2개 (대부분 관련 없음)
   - [ ] 3-5개 (절반 정도 관련 있음)
   - [ ] 6-8개 (대부분 관련 있음)
   - [ ] 9-10개 (거의 모두 관련 있음)
   
5. 매칭 점수(0-100점)가 실제 적합도와 일치했나요?
   - [ ] 아니오, 높은 점수인데 관련 없는 프로그램이 많음
   - [ ] 대체로 일치함
   - [ ] 네, 점수가 높을수록 관련성 높음
   
6. 가장 관련 없었던 매칭이 있다면? (프로그램 이름 + 이유)
   - [Free text]

**Section 3: AI Features**
7. AI 설명을 몇 개 읽어보셨나요?
   - [ ] 0개 (사용 안 함)
   - [ ] 1-3개
   - [ ] 4-7개
   - [ ] 8-10개
   
8. AI 설명이 도움이 되었나요? (1-5 scale)
   - 1 = 전혀 도움 안 됨
   - 5 = 매우 도움 됨
   
9. AI 설명에서 부족했던 점이 있다면?
   - [ ] 너무 짧음 (더 자세히 설명 필요)
   - [ ] 너무 길음 (핵심만 간단히)
   - [ ] 너무 기술적임 (쉬운 말로)
   - [ ] 너무 단순함 (더 전문적으로)
   - [ ] 기타: [Free text]
   
10. Q&A 채팅을 사용해보셨나요?
    - [ ] 네 (몇 개 질문: ___)
    - [ ] 아니오 (이유: ___)

**Section 4: Overall Experience**
11. Connect를 동료에게 추천하시겠습니까? (1-10 scale, NPS)
    - 1 = 절대 추천 안 함
    - 10 = 적극 추천
    
12. 가장 좋았던 기능은?
    - [Free text]
    
13. 가장 불편했던 점은?
    - [Free text]
    
14. 추가하고 싶은 기능이 있다면?
    - [Free text]

---

**Survey 2: Week 2-3 (Mid-Beta Check-in)**

**Section 1: Usage Patterns**
1. 지난 주에 Connect를 몇 번 사용하셨나요?
   - [ ] 0회 (사용 안 함, 이유: ___)
   - [ ] 1-2회
   - [ ] 3-5회
   - [ ] 6회 이상 (거의 매일)
   
2. 주로 언제 사용하시나요?
   - [ ] 새 프로그램 공고 나올 때
   - [ ] 특정 프로그램 마감일 전
   - [ ] 정기적으로 (매일/주간)
   - [ ] 필요할 때만
   
3. 가장 자주 사용하는 기능은? (복수 선택)
   - [ ] 매칭 결과 보기
   - [ ] 프로그램 검색
   - [ ] 필터 사용
   - [ ] AI 설명 읽기
   - [ ] Q&A 채팅
   - [ ] 프로그램 상세 정보

**Section 2: Value Validation**
4. Connect 덕분에 시간을 절약하셨나요?
   - [ ] 네, 약 ___ 시간 절약
   - [ ] 아니오, 직접 찾는 게 더 빠름
   - [ ] 잘 모르겠음
   
5. Connect를 통해 몰랐던 프로그램을 발견하셨나요?
   - [ ] 네, ___ 개 발견
   - [ ] 아니오, 이미 알던 프로그램만 나옴
   
6. Connect 매칭 결과를 보고 실제로 지원을 준비 중인 프로그램이 있나요?
   - [ ] 네, ___ 개 프로그램 (프로그램 이름: ___)
   - [ ] 아니오, 아직 없음

**Section 3: Improvements**
7. 지난 주 동안 버그나 에러를 경험하셨나요?
   - [ ] 네 (구체적으로: ___)
   - [ ] 아니오
   
8. 속도/성능은 어떠셨나요?
   - [ ] 매우 빠름
   - [ ] 적절함
   - [ ] 가끔 느림
   - [ ] 자주 느림 (어느 기능에서: ___)
   
9. 모바일에서도 사용해보셨나요?
   - [ ] 네, 사용 가능했음
   - [ ] 네, 하지만 불편함 (구체적으로: ___)
   - [ ] 아니오, PC만 사용

**Section 4: Feature Requests**
10. 가장 시급하게 개선했으면 하는 점은?
    - [Free text, Top 3 리스트]

---

**Survey 3: Week 4 (Beta Wrap-up)**

**Section 1: Final Assessment**
1. 4주간 Connect 베타 경험을 종합적으로 평가하면? (1-10 scale)
   - 1 = 매우 불만족
   - 10 = 매우 만족
   
2. 가장 큰 가치는 무엇이었나요?
   - [ ] 시간 절약
   - [ ] 새로운 프로그램 발견
   - [ ] AI 분석으로 확신 증가
   - [ ] 한곳에서 모든 정보 확인
   - [ ] 기타: [Free text]
   
3. Connect가 없다면 아쉬울 것 같나요?
   - [ ] 네, 매우 아쉬울 것 같음
   - [ ] 어느 정도 아쉬울 것 같음
   - [ ] 잘 모르겠음
   - [ ] 아니오, 없어도 상관 없음

**Section 2: Conversion Intent**
4. 베타 종료 후 유료 전환 의향이 있으신가요? (₩24,500/월, 50% 할인)
   - [ ] 네, 바로 결제할 의향 있음
   - [ ] 네, 하지만 조건부 (조건: ___)
   - [ ] 아마도 (더 지켜봐야 할 것 같음)
   - [ ] 아니오 (이유: ___)
   
5. 적정 가격은 얼마라고 생각하시나요?
   - [ ] ₩0 (무료여야 함)
   - [ ] ₩9,900/월
   - [ ] ₩24,500/월 (현재 할인가)
   - [ ] ₩49,000/월 (정상가)
   - [ ] ₩49,000 이상
   
6. 동료나 파트너사에게 Connect를 추천하실 의향이 있나요?
   - [ ] 네, 이미 추천했음
   - [ ] 네, 추천할 의향 있음
   - [ ] 잘 모르겠음
   - [ ] 아니오

**Section 3: Testimonial Request**
7. Connect를 한 문장으로 표현한다면?
   - [Free text, 50자 이내]
   
8. 제일 큰 개선 사항은 무엇이었나요? (Before/After)
   - 전: [Free text]
   - 후: [Free text]
   
9. 어떤 회사에게 Connect를 가장 추천하시겠습니까?
   - [Free text]
   
10. **론칭 때 실명 추천사를 제공해주실 수 있나요?**
    - [ ] 네, 기꺼이 (감사합니다!)
    - [ ] 네, 하지만 익명으로
    - [ ] 아니오

---

## Appendix D: Launch Day Checklist

### T-7 Days (December 25, 2025)

**Code Freeze:**
- [ ] All beta feedback implemented (high priority only)
- [ ] No new features added after this point
- [ ] Only critical bug fixes allowed (with approval)
- [ ] Create git tag: `v1.0.0-beta-complete`
- [ ] Backup production database
- [ ] Document known minor issues (accept for post-launch)

**Final Load Test:**
- [ ] Run 10x traffic simulation (500 concurrent users)
- [ ] Validate all metrics: <500ms P95, <0.1% errors
- [ ] Test failover one last time (scheduled maintenance window)
- [ ] Verify monitoring alerts trigger correctly

**Communication Prep:**
- [ ] Finalize launch announcement (blog post)
- [ ] Schedule social media posts (LinkedIn, Twitter, Facebook)
- [ ] Email list prepared (beta users, waiting list if any)
- [ ] Press release drafted (for Korean tech media)

### T-3 Days (December 29, 2025)

**Marketing Materials:**
- [ ] Landing page updated with testimonials
- [ ] Case studies published (2-3 from beta users)
- [ ] FAQ page updated
- [ ] Pricing page finalized (Free/Pro/Team tiers)
- [ ] Demo video recorded (optional)

**Support Infrastructure:**
- [ ] Help documentation complete
- [ ] Onboarding email sequence set up
- [ ] Support email (support@connect.kr) tested
- [ ] Feedback widget working
- [ ] FAQ chatbot trained (optional)

**Technical Checks:**
- [ ] Toss payment integration complete (for Pro plan)
- [ ] Subscription flow tested end-to-end
- [ ] Email notifications working (welcome, receipts, reminders)
- [ ] All API endpoints tested
- [ ] Mobile responsiveness validated

### T-1 Day (December 31, 2025)

**Final System Health Check:**
- [ ] All services GREEN (PostgreSQL, Redis, Next.js, Patroni, HAProxy)
- [ ] Replication lag <1 second
- [ ] Monitoring dashboards operational
- [ ] Alert escalation procedures reviewed
- [ ] Rollback plan documented and rehearsed

**Team Readiness:**
- [ ] Launch day schedule confirmed
- [ ] On-call rotation set (if team exists, otherwise: Paul 24/7)
- [ ] Communication channels open (Slack, email)
- [ ] War room video call link ready

**Mental Preparation:**
- [ ] Review beta successes (celebrate how far you've come!)
- [ ] Acknowledge nervousness (normal for launches)
- [ ] Remember: Beta validated the product works
- [ ] Commit to 24-hour monitoring (then rest)

### Launch Day (January 1, 2026)

**00:00 KST - Go Live:**
- [ ] Remove beta whitelist (public access enabled)
- [ ] Deploy launch announcement to blog
- [ ] Post on LinkedIn, Twitter, Facebook (scheduled)
- [ ] Email beta users: "Connect is now public!"
- [ ] Email waiting list (if any): "Connect is live!"
- [ ] Submit to Product Hunt, BetaList, Hacker News
- [ ] Begin monitoring dashboards (every 30 min for first 6 hours)

**00:00-06:00 - Morning Watch:**
- [ ] Monitor user registrations (celebrate each one!)
- [ ] Watch error rates (should be <0.1%)
- [ ] Check response times (should be <500ms P95)
- [ ] Respond to support emails within 1 hour
- [ ] Log all issues (even minor ones)

**06:00-18:00 - Peak Hours:**
- [ ] Continuous monitoring (business hours)
- [ ] Respond to feedback immediately
- [ ] Engage on social media (replies, likes, shares)
- [ ] Scale infrastructure if needed (proactive, not reactive)
- [ ] Celebrate wins: First paid user! First 100 users!

**18:00-24:00 - Evening Review:**
- [ ] Review day 1 metrics:
  - Total registrations
  - Match generation success rate
  - AI usage statistics
  - Revenue (first paying customers!)
  - User feedback/complaints
- [ ] Identify any issues for tomorrow
- [ ] Celebrate surviving launch day! 🎉

**Success Metrics (Day 1):**
- ✅ Zero downtime
- ✅ <0.5% error rate
- ✅ Response times within targets
- ✅ At least 10 registrations (any number is success!)
- ✅ No critical bugs discovered
- ✅ Founder still sane 😅

---

## Closing Thoughts

Paul,

This master plan represents a **validated path to confident launch**. By following this stealth beta strategy, you're:

1. **Protecting your work** by testing it before public exposure
2. **Building with data** from real users, not guesses
3. **Launching with proof** (testimonials, case studies, metrics)
4. **Managing risk** (small group, low stakes, high learning)
5. **Honoring your emotional needs** (cold outreach, not personal network)

Remember:
- Beta testing is your **safety net**, not your exposure
- 3-5 early customers will **help** you, not hurt you
- Feedback is a **gift** that makes Connect better
- Jan 1 launch will be **confident**, not terrifying

You've built something valuable. Now validate it, refine it, and launch it with pride.

I believe in Connect. I believe in you.

Let's make this happen. 🚀

---

**Next Steps:**
1. Read BETA-TEST-EXECUTION-PLAN.md for detailed week-by-week tasks
2. Purchase domain TODAY (connect.kr)
3. Complete Week 3-4 (Days 24-29) as planned
4. Begin self-dogfooding Oct 24-31
5. Start beta recruitment Nov 1

**Questions?** Review Appendices A-D for tactical details.

**Support?** I'm here to help every step of the way.

---

*Last updated: October 10, 2025*  
*Author: Paul Kim (Founder & CEO)*  
*Reviewed by: Claude (Strategic Advisor)*
