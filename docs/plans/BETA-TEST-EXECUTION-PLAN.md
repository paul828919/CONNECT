# Connect Platform: Beta Test Detailed Execution Plan
## Week-by-Week Implementation Guide (Oct 10 - Jan 1, 2026)

**Version**: 1.0  
**Created**: October 10, 2025  
**Companion Document**: BETA-TEST-MASTER-PLAN.md  
**Project Root**: `/Users/paulkim/Downloads/connect`

---

## How to Use This Document

This execution plan provides **detailed week-by-week tasks** for Connect's beta test preparation and execution. Each week includes:

- **Daily task breakdown** with time estimates
- **Technical implementation details** with code examples
- **Command-line instructions** for easy copy-paste
- **Success criteria** for each phase
- **Troubleshooting guides** for common issues

**Read in Order:**
1. BETA-TEST-MASTER-PLAN.md (strategy and philosophy) ← Read first
2. This document (tactical execution) ← You are here
3. Weekly updates in `docs/plans/progress/`

---

## Timeline Overview (11 Weeks)

```
┌─────────────┬────────────┬─────────────┬──────────────┬────────────┐
│  PHASE 1    │  PHASE 2   │  PHASE 3    │   PHASE 4    │  PHASE 5   │
│  Dogfood +  │  Staging + │   Stealth   │  Refine +    │   Launch   │
│  Prep       │   Docker   │    Beta     │   Freeze     │    Day     │
├─────────────┼────────────┼─────────────┼──────────────┼────────────┤
│ Oct 10-31   │ Nov 1-14   │ Nov 15-     │ Dec 16-31    │ Jan 1      │
│ 3 weeks     │ 2 weeks    │ Dec 15      │ 2 weeks      │ 1 day      │
│             │            │ 4 weeks     │              │            │
└─────────────┴────────────┴─────────────┴──────────────┴────────────┘
```

---

## PHASE 1: Self-Dogfooding & Preparation
### October 10-31, 2025 (3 weeks)

### Week 1: Oct 10-16 (Completion + Domain Setup)

#### Day 1: Thursday, October 10

**Morning (3 hours): Domain Purchase & DNS Setup**

1. **Purchase Domain** (1 hour)
   ```bash
   # Visit: https://hosting.kr or https://www.cafe24.com
   # Search for: connect.kr or connect-korea.kr
   # Register: 1 year minimum (₩15-30K)
   # DNS Settings: Point to your Linux PC IP
   ```
   
   **DNS Configuration:**
   ```
   A Record:
   Host: @ (root domain)
   Value: [Your Linux PC Public IP]
   TTL: 3600
   
   CNAME Record:
   Host: www
   Value: connect.kr
   TTL: 3600
   ```

2. **Update Environment Variables** (15 min)
   ```bash
   cd /Users/paulkim/Downloads/connect
   
   # Edit .env file
   echo "NEXT_PUBLIC_APP_URL=https://connect.kr" >> .env
   echo "DOMAIN=connect.kr" >> .env
   
   # Commit changes
   git add .env
   git commit -m "feat: Add production domain configuration"
   ```

3. **Test Domain Resolution** (15 min)
   ```bash
   # Wait 10-30 minutes for DNS propagation
   
   # Test DNS resolution
   nslookup connect.kr
   
   # Should return your Linux PC IP
   # If not, wait longer (can take up to 24 hours)
   ```

**Afternoon (3 hours): Complete Week 3-4 Days 24-25**

4. **Week 3-4 Day 24: Load Testing** (2 hours)
   
   Refer to: `docs/plans/IMPLEMENTATION-PLAN-12WEEKS.md` (Week 3-4, Days 24-25)
   
   Create load testing script:
   ```bash
   # Create test file
   touch scripts/load-test-ai-features.ts
   ```
   
   Implement load test scenarios:
   - 100 concurrent match explanation requests
   - 50 concurrent Q&A chat sessions
   - Measure P50/P95/P99 response times
   - Validate circuit breaker triggers correctly
   - Test fallback content quality

5. **Week 3-4 Day 25: Performance Optimization** (1 hour)
   
   Based on load test results:
   - Identify slow queries (use `EXPLAIN ANALYZE`)
   - Add missing indexes
   - Increase Redis cache TTL if needed
   - Tune AI client rate limits
   - Document optimizations

**Evening (1 hour): Documentation & Planning**

6. **Create Beta Preparation Checklist** (1 hour)
   ```bash
   touch docs/plans/beta-preparation-checklist.md
   ```
   
   Document:
   - All tasks from this execution plan
   - Add checkboxes for progress tracking
   - Set up weekly review schedule

**Day 1 Success Criteria:**
- ✅ Domain purchased and DNS configured
- ✅ Week 3-4 Days 24-25 complete
- ✅ Load testing reveals no critical issues
- ✅ Beta prep checklist created

---

#### Days 2-3: Friday-Saturday, October 11-12

**Focus: HTTPS Setup + Week 5 Beginning**

1. **HTTPS with Let's Encrypt** (2 hours)
   
   SSH into Linux PC:
   ```bash
   ssh paul@[Linux-PC-IP]
   
   # Install certbot
   sudo apt update
   sudo apt install certbot python3-certbot-nginx
   
   # Verify nginx installed
   nginx -v
   
   # If not installed:
   sudo apt install nginx
   ```
   
   Configure nginx:
   ```bash
   # Create nginx config
   sudo nano /etc/nginx/sites-available/connect
   ```
   
   Add configuration:
   ```nginx
   server {
       listen 80;
       server_name connect.kr www.connect.kr;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
   
   Enable site:
   ```bash
   sudo ln -s /etc/nginx/sites-available/connect /etc/nginx/sites-enabled/
   sudo nginx -t  # Test configuration
   sudo systemctl restart nginx
   ```
   
   Obtain SSL certificate:
   ```bash
   sudo certbot --nginx -d connect.kr -d www.connect.kr
   
   # Follow prompts:
   # 1. Enter email for renewal notices
   # 2. Agree to terms
   # 3. Choose to redirect HTTP to HTTPS (option 2)
   ```
   
   Verify HTTPS:
   ```bash
   # Visit: https://connect.kr
   # Should show green padlock (valid SSL)
   
   # Check renewal
   sudo certbot renew --dry-run
   ```

2. **Week 5: Security Hardening (Part 1)** (4 hours)
   
   Implement security headers:
   ```typescript
   // middleware.ts
   import { NextResponse } from 'next/server';
   import type { NextRequest } from 'next/server';
   
   export function middleware(request: NextRequest) {
     const response = NextResponse.next();
     
     // Security headers
     response.headers.set('X-Frame-Options', 'DENY');
     response.headers.set('X-Content-Type-Options', 'nosniff');
     response.headers.set('X-XSS-Protection', '1; mode=block');
     response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
     response.headers.set(
       'Content-Security-Policy',
       "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
     );
     
     return response;
   }
   ```
   
   Run security audit:
   ```bash
   # Check for dependency vulnerabilities
   npm audit
   
   # Fix automatically if possible
   npm audit fix
   
   # Manual review for high/critical issues
   npm audit --production
   ```

**Days 2-3 Success Criteria:**
- ✅ HTTPS working (green padlock on connect.kr)
- ✅ SSL auto-renewal configured
- ✅ Security headers implemented
- ✅ npm audit shows zero critical vulnerabilities

---

#### Days 4-7: Sunday-Wednesday, October 13-16

**Focus: Week 5 Completion (Security + Bug Fixes)**

1. **Rate Limiting Implementation** (Day 4, 2 hours)
   
   API-level rate limiting:
   ```typescript
   // lib/rate-limit.ts
   import { Redis } from '@upstash/redis';
   
   const redis = new Redis({
     url: process.env.REDIS_URL!,
     token: process.env.REDIS_TOKEN!,
   });
   
   export async function rateLimit(
     identifier: string,
     limit: number = 100,
     window: number = 60
   ): Promise<{ success: boolean; remaining: number }> {
     const key = `rate_limit:${identifier}`;
     const count = await redis.incr(key);
     
     if (count === 1) {
       await redis.expire(key, window);
     }
     
     const remaining = Math.max(0, limit - count);
     
     return {
       success: count <= limit,
       remaining,
     };
   }
   ```
   
   Apply to API routes:
   ```typescript
   // app/api/*/route.ts
   import { rateLimit } from '@/lib/rate-limit';
   
   export async function POST(request: Request) {
     const session = await getServerSession();
     if (!session) return new Response('Unauthorized', { status: 401 });
     
     // Rate limit: 100 requests per minute per user
     const { success, remaining } = await rateLimit(
       session.user.id,
       100,
       60
     );
     
     if (!success) {
       return new Response('Rate limit exceeded', {
         status: 429,
         headers: {
           'X-RateLimit-Remaining': remaining.toString(),
           'Retry-After': '60',
         },
       });
     }
     
     // ... rest of handler
   }
   ```

2. **Input Validation & Sanitization** (Day 5, 2 hours)
   
   Install Zod for validation:
   ```bash
   npm install zod
   ```
   
   Create validation schemas:
   ```typescript
   // lib/validations/organization.ts
   import { z } from 'zod';
   
   export const organizationSchema = z.object({
     name: z.string().min(1).max(100),
     type: z.enum(['COMPANY', 'RESEARCH_INSTITUTE']),
     industry: z.string().min(1),
     trl: z.number().int().min(1).max(9),
     revenue: z.number().nonnegative().optional(),
     rdExperience: z.enum(['NONE', 'LOW', 'MEDIUM', 'HIGH']).optional(),
     certifications: z.array(z.string()).optional(),
   });
   
   export type OrganizationInput = z.infer<typeof organizationSchema>;
   ```
   
   Apply validation:
   ```typescript
   // app/api/organization/route.ts
   import { organizationSchema } from '@/lib/validations/organization';
   
   export async function POST(request: Request) {
     const body = await request.json();
     
     // Validate input
     const result = organizationSchema.safeParse(body);
     
     if (!result.success) {
       return new Response(
         JSON.stringify({ error: result.error.flatten() }),
         { status: 400 }
       );
     }
     
     // ... proceed with validated data: result.data
   }
   ```

3. **Bug Fixing Sprint** (Days 6-7, 8 hours)
   
   Create bug tracking:
   ```bash
   mkdir -p docs/bugs
   touch docs/bugs/known-issues.md
   ```
   
   Bug triage process:
   ```markdown
   # Known Issues
   
   ## P0 (Critical - Blocks Usage)
   - [ ] Issue 1: Description, Steps to reproduce
   
   ## P1 (High - Degrades Experience)
   - [ ] Issue 2: Description, Steps to reproduce
   
   ## P2 (Medium - Minor Issues)
   - [ ] Issue 3: Description, Steps to reproduce
   
   ## P3 (Low - Cosmetic)
   - [ ] Issue 4: Description, Steps to reproduce
   ```
   
   Fix P0/P1 bugs:
   - Review IMPLEMENTATION-STATUS.md for known issues
   - Test all critical user flows
   - Fix blocking bugs immediately
   - Document fixes in git commits

4. **Week 1 Completion Report** (Day 7 evening, 1 hour)
   
   ```bash
   touch docs/plans/progress/beta-week1-complete.md
   ```
   
   Document:
   - Domain + HTTPS setup complete
   - Week 5 security hardening done
   - Bug count: P0/P1/P2/P3
   - Readiness for self-dogfooding

**Week 1 Success Criteria:**
- ✅ Domain operational with HTTPS
- ✅ Week 5 complete (security, bug fixes)
- ✅ Zero P0 bugs remaining
- ✅ <5 P1 bugs (documented and manageable)
- ✅ Rate limiting working on all API endpoints
- ✅ Input validation on all forms
- ✅ Ready for self-dogfooding next week

---

### Week 2: Oct 17-23 (Self-Dogfooding Preparation)

#### Days 8-9: Thursday-Friday, October 17-18

**Focus: Final Code Completion Before Dogfooding**

1. **Complete Any Remaining Week 5 Tasks** (Day 8, 4 hours)
   
   Review checklist:
   - [ ] All API endpoints have rate limiting
   - [ ] All forms have input validation
   - [ ] All database queries use parameterized queries (Prisma ✅)
   - [ ] All user uploads sanitized
   - [ ] CORS configured correctly
   - [ ] Environment variables secured

2. **Error Tracking Setup** (Day 8, 2 hours)
   
   Optional but recommended - Install Sentry:
   ```bash
   npm install @sentry/nextjs
   
   npx @sentry/wizard@latest -i nextjs
   ```
   
   Configure:
   ```typescript
   // sentry.client.config.ts
   import * as Sentry from "@sentry/nextjs";
   
   Sentry.init({
     dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
     tracesSampleRate: 0.1,
     environment: process.env.NODE_ENV,
   });
   ```
   
   Or use simpler logging:
   ```typescript
   // lib/logger.ts
   export function logError(error: Error, context?: any) {
     console.error('[ERROR]', {
       message: error.message,
       stack: error.stack,
       context,
       timestamp: new Date().toISOString(),
     });
     
     // TODO: Send to monitoring service
   }
   ```

3. **Create Test Organization Profiles** (Day 9, 2 hours)
   
   Set up diverse test cases:
   ```typescript
   // scripts/seed-test-orgs.ts
   import { PrismaClient } from '@prisma/client';
   
   const prisma = new PrismaClient();
   
   async function seedTestOrganizations() {
     const testOrgs = [
       {
         name: 'TestTech AI',
         type: 'COMPANY',
         industry: 'ICT',
         trl: 7,
         revenue: 500,
         rdExperience: 'MEDIUM',
         certifications: ['ISMS-P'],
       },
       {
         name: 'BioMed Startup',
         type: 'COMPANY',
         industry: 'BIOTECH',
         trl: 5,
         revenue: 100,
         rdExperience: 'LOW',
         certifications: [],
       },
       {
         name: 'Hardware Co',
         type: 'COMPANY',
         industry: 'MANUFACTURING',
         trl: 8,
         revenue: 1000,
         rdExperience: 'HIGH',
         certifications: ['KC', 'ISO_9001'],
       },
       // Add more test cases
     ];
     
     for (const org of testOrgs) {
       await prisma.organization.create({ data: org });
     }
   }
   
   seedTestOrganizations();
   ```
   
   Run seed:
   ```bash
   npx ts-node scripts/seed-test-orgs.ts
   ```

4. **Self-Dogfooding Checklist** (Day 9, 1 hour)
   
   ```bash
   touch docs/dogfooding/checklist.md
   ```
   
   Create structured testing plan (see Appendix A in Master Plan)

**Days 8-9 Success Criteria:**
- ✅ All Week 5 tasks 100% complete
- ✅ Error tracking configured (Sentry or logging)
- ✅ 3-5 test organization profiles created
- ✅ Self-dogfooding checklist ready
- ✅ Production environment stable

---

#### Days 10-16: Saturday-Friday, October 19-25 (EXTENDED WEEK)

**Focus: 7-Day Self-Dogfooding Period**

**This is the most important week.** Use Connect yourself as if you were a customer.

**Daily Routine (1-2 hours per day):**

**Day 1 (Oct 19): Setup & First Impressions**
```bash
# Morning
1. Create your own organization profile
   - Use real data (your company or realistic test)
   - Fill out all optional fields
   - Note: How long did setup take? Was anything confusing?

2. Generate first match
   - Click "매칭 시작"
   - Wait for results
   - Time it: How many seconds?
   - Note: Are top matches relevant?

# Afternoon
3. Review top 10 matches
   - Read each program title and agency
   - Note: How many seem relevant? (aim for 6-8 out of 10)
   - Document: Which matches are obviously wrong?

4. Document issues in docs/dogfooding/day1.md
   - Screenshots of any confusing UI
   - List of bugs found (P0/P1/P2/P3)
   - Note positive surprises too!
```

**Day 2 (Oct 20): AI Explanation Testing**
```bash
# Morning
1. Click "AI 설명 보기" on 5 different matches
   - Note: How long does each take? (target <5s first time)
   - Click again: Does cache work? (should be <500ms)
   
2. Read explanations carefully
   - Is Korean natural? (존댓말 quality)
   - Do explanations make sense?
   - Are they too short/long?
   - Do they explain WHY this program matches?

# Afternoon
3. Test explanations on different match types
   - High score match (85+ points)
   - Medium score match (60-75 points)
   - Low score match (40-55 points)
   - Are explanations appropriate for score level?

4. Document in docs/dogfooding/day2.md
   - Korean quality rating (1-5)
   - Helpfulness rating (1-5)
   - Specific improvements needed
```

**Day 3 (Oct 21): Q&A Chat Testing**
```bash
# Morning
1. Open Q&A chatbot on a high-score match
   
2. Ask 5 eligibility questions:
   - "우리 회사가 이 과제에 지원할 수 있나요?"
   - "TRL [X]인데 이 과제 적합한가요?"
   - "ISMS-P 인증이 없는데 지원 가능한가요?"
   - "예산이 얼마나 필요한가요?"
   - "컨소시엄 구성이 필수인가요?"

# Afternoon
3. Test conversation memory
   - Ask follow-up questions without context
   - Example: "그럼 인증은 언제까지 받아야 하나요?"
   - Does AI remember previous context?

4. Test edge cases
   - Very long question (500+ characters)
   - Typos: "우리횔사가" instead of "우리회사가"
   - English question: "Can we apply to this program?"
   - Ambiguous question: "이거 괜찮아요?"

5. Document in docs/dogfooding/day3.md
   - Response accuracy (1-5)
   - Context memory working? (yes/no)
   - Edge cases handled well?
```

**Day 4 (Oct 22): Search & Filter Testing**
```bash
# Morning
1. Test search functionality
   - Search by keyword: "인공지능", "빅데이터", "바이오"
   - Search by program name: "AI 융합", "스타트업"
   - Search by agency: "IITP", "KEIT"
   - Note: Are results relevant? How fast?

# Afternoon
2. Test filters
   - Filter by agency (single, multiple)
   - Filter by TRL range
   - Filter by budget range
   - Filter by deadline proximity
   - Test combinations (agency + TRL + budget)

3. Test sorting
   - Sort by score (default)
   - Sort by deadline (urgent first)
   - Sort by budget (highest first)
   - Sort by agency

4. Document in docs/dogfooding/day4.md
   - Search speed (<1s?)
   - Filter logic correct?
   - Any filter combinations that break?
```

**Day 5 (Oct 23): Mobile Testing**
```bash
# Use iPhone/Android device

1. Test responsive design
   - Dashboard layout (does it look good?)
   - Match cards (readable font size?)
   - Program details page (scroll smoothly?)
   - AI explanation (displays correctly?)
   - Q&A chat (keyboard doesn't block input?)

2. Test touch interactions
   - Buttons big enough to tap?
   - Scroll works smoothly?
   - No accidental clicks?

3. Test performance
   - Page load times (slower on mobile?)
   - AI features (timeout on slow connection?)
   - Image loading (optimized?)

4. Document in docs/dogfooding/day5.md
   - Mobile usability rating (1-5)
   - Critical issues blocking mobile use
   - Nice-to-have improvements
```

**Day 6 (Oct 24): Performance & Edge Cases**
```bash
# Stress test the system

1. Generate matches multiple times
   - Delete old matches
   - Generate again
   - Does performance degrade? (memory leaks?)

2. Test with modified profile
   - Change TRL: 5 → 8
   - Add certifications: ISMS-P
   - Change industry: ICT → Biotech
   - Do matches update appropriately?

3. Test edge cases
   - Organization with TRL 1 (very low)
   - Organization with TRL 9 (commercial)
   - Organization with no certifications
   - Organization with all certifications
   - Startup (low revenue, low R&D experience)
   - Large corp (high revenue, high R&D experience)

4. Test error scenarios
   - Disconnect WiFi mid-match-generation
   - Disconnect WiFi during AI explanation
   - Invalid inputs (empty fields, negative numbers)

5. Document in docs/dogfooding/day6.md
   - Any crashes or errors?
   - How does app handle offline?
   - Edge cases handled gracefully?
```

**Day 7 (Oct 25): Comprehensive Review & Prioritization**
```bash
# Consolidate all feedback

1. Review all daily notes (day1-6.md)
2. Categorize all issues found:
   - P0 (Critical - blocks usage): __
   - P1 (High - degrades experience): __
   - P2 (Medium - minor issues): __
   - P3 (Low - cosmetic): __

3. Create action plan
   # docs/dogfooding/action-plan.md
   
   ## Must Fix Before Beta (P0)
   - [ ] Issue 1 (estimated: 2 hours)
   - [ ] Issue 2 (estimated: 4 hours)
   
   ## Should Fix Before Beta (P1)
   - [ ] Issue 3 (estimated: 1 hour)
   - [ ] Issue 4 (estimated: 3 hours)
   
   ## Fix During Beta if Time (P2)
   - [ ] Issue 5 (estimated: 30 min)
   
   ## Defer to Post-Launch (P3)
   - [ ] Issue 6 (estimated: 1 hour)

4. Fix all P0 issues IMMEDIATELY (Days 11-12)
5. Fix P1 issues if time allows (Days 13-14)

6. Create final report
   # docs/dogfooding/self-test-report.md
   
   ## Summary
   - Total issues found: __
   - P0: __ (all fixed)
   - P1: __ (fixed: __, deferred: __)
   - P2: __ (deferred)
   - P3: __ (deferred)
   
   ## Readiness Assessment
   - Overall product quality: [1-10]
   - Confidence in beta launch: [1-10]
   - Biggest remaining concerns: __
   
   ## Decision: GO / NO-GO for Beta
   - [ ] GO - Ready for beta users
   - [ ] NO-GO - Need more time (estimated: __ days)
```

**Week 2 Success Criteria:**
- ✅ 7 full days of self-dogfooding completed
- ✅ All P0 issues fixed
- ✅ 80%+ of P1 issues fixed or documented
- ✅ Self-test report complete
- ✅ Confidence HIGH for beta testing
- ✅ GO decision for beta launch

---

### Week 3: Oct 26-31 (Beta Recruitment Preparation)

#### Days 15-16: Monday-Tuesday, October 28-29

**Focus: Beta Recruitment Materials**

1. **Beta Landing Page** (Day 15, 4 hours)
   
   Create dedicated beta signup page:
   ```bash
   # Create beta landing page
   mkdir -p app/beta
   touch app/beta/page.tsx
   ```
   
   Implement:
   ```tsx
   // app/beta/page.tsx
   export default function BetaLandingPage() {
     return (
       <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
         {/* Hero Section */}
         <section className="container mx-auto px-4 py-16">
           <h1 className="text-5xl font-bold text-center mb-6">
             Connect 베타 테스터 모집
           </h1>
           <p className="text-xl text-center text-gray-600 mb-8">
             한국 기업을 위한 R&D 과제 매칭 플랫폼의 첫 번째 사용자가 되어주세요
           </p>
           
           {/* Value Props */}
           <div className="grid md:grid-cols-3 gap-8 mb-12">
             <div className="text-center">
               <h3 className="text-2xl font-bold mb-2">200+ 프로그램</h3>
               <p>IITP, KEIT, TIPA 등 정부 R&D 과제 자동 매칭</p>
             </div>
             <div className="text-center">
               <h3 className="text-2xl font-bold mb-2">AI 분석</h3>
               <p>Claude Sonnet 4.5 기반 적합성 설명 및 Q&A</p>
             </div>
             <div className="text-center">
               <h3 className="text-2xl font-bold mb-2">3초 매칭</h3>
               <p>평균 20시간 소요되는 과제 검색을 3초로 단축</p>
             </div>
           </div>
           
           {/* Beta Benefits */}
           <div className="bg-white rounded-lg shadow-lg p-8 mb-12">
             <h2 className="text-3xl font-bold mb-6">베타 테스터 혜택</h2>
             <ul className="space-y-4">
               <li className="flex items-start">
                 <span className="text-green-500 mr-2">✓</span>
                 <span>30일 무료 체험 (정상가 ₩49,000/월)</span>
               </li>
               <li className="flex items-start">
                 <span className="text-green-500 mr-2">✓</span>
                 <span>평생 50% 할인 (₩24,500/월)</span>
               </li>
               <li className="flex items-start">
                 <span className="text-green-500 mr-2">✓</span>
                 <span>우선 기능 추가 요청권</span>
               </li>
               <li className="flex items-start">
                 <span className="text-green-500 mr-2">✓</span>
                 <span>Early Adopter 배지 (론칭 시 프로필 표시)</span>
               </li>
               <li className="flex items-start">
                 <span className="text-green-500 mr-2">✓</span>
                 <span>24시간 우선 지원</span>
               </li>
             </ul>
           </div>
           
           {/* CTA */}
           <div className="text-center">
             <a
               href="mailto:paul@connect.kr?subject=베타 테스터 신청"
               className="inline-block bg-blue-600 text-white px-8 py-4 rounded-lg text-xl font-bold hover:bg-blue-700"
             >
               베타 테스터 신청하기
             </a>
             <p className="mt-4 text-gray-600">
               선착순 5개 기업 한정 | 1월 정식 출시 예정
             </p>
           </div>
         </section>
       </div>
     );
   }
   ```

2. **Email Templates** (Day 15, 2 hours)
   
   Create cold outreach templates:
   ```markdown
   # docs/beta-recruitment/email-templates.md
   
   ## Template 1: NTIS Grant Winners
   
   Subject: [Company Name]의 차기 R&D 과제 준비를 도와드립니다
   
   안녕하세요, [Name]님.
   
   NTIS에서 [Project Name] 선정 소식을 보았습니다. 축하드립니다!
   
   저는 한국 기업들이 정부 R&D 과제를 더 빠르고 정확하게 찾도록 돕는 
   Connect 플랫폼을 개발한 Paul Kim입니다.
   
   Connect는:
   - IITP, KEIT, TIPA 등 200개 이상 프로그램 자동 매칭
   - AI 기반 적합성 분석 (Claude Sonnet 4.5)
   - TRL, 산업, 인증 기반 맞춤 추천
   
   1월 정식 출시 전, 5개 기업에게만 특별 혜택을 드립니다:
   ✅ 30일 무료 체험
   ✅ 평생 50% 할인 (₩24,500/월)
   ✅ 우선 기능 추가 요청권
   
   15분 데모로 어떻게 도움이 되는지 보여드리겠습니다.
   언제 통화 가능하신지 알려주시면 감사하겠습니다.
   
   Best regards,
   Paul Kim
   Founder, Connect
   paul@connect.kr
   https://connect.kr/beta
   
   ---
   
   ## Template 2: LinkedIn Connection Request
   
   (300자 제한)
   
   안녕하세요! 한국 기업들이 정부 R&D 과제를 찾고 선정되도록 돕는 
   Connect 플랫폼을 개발했습니다. [Company]의 R&D 전략에 
   도움이 될 수 있을 것 같아 연결 요청 드립니다.
   
   ---
   
   ## Template 3: LinkedIn Follow-up Message
   
   [Name]님, 연결 감사드립니다.
   
   Connect는 IITP, KEIT, TIPA 등 200개 이상의 R&D 프로그램을 
   귀사의 TRL, 산업 분야, 인증 현황에 맞춰 자동으로 매칭합니다.
   
   AI 기반 적합성 분석으로 "왜 이 과제가 적합한지" 설명하고,
   24/7 Q&A 챗봇으로 지원 자격 질문에 즉시 답변합니다.
   
   1월 정식 출시 전, 5개 기업에게만:
   ✅ 30일 무료 + 평생 50% 할인
   ✅ 우선 기능 추가 요청
   
   15분 데모 관심 있으시면 언제 편하신지 알려주세요.
   
   Paul
   paul@connect.kr
   ```

3. **Recruitment Tracker** (Day 16, 2 hours)
   
   Create spreadsheet or Notion board:
   ```markdown
   # Beta Recruitment Tracker
   
   ## Status Legend
   - 🔵 Not Contacted
   - 🟡 Contacted, Awaiting Response
   - 🟢 Interested, Scheduling Demo
   - ✅ Confirmed Beta User
   - ❌ Declined or No Response
   
   ## LinkedIn Prospects
   
   | Name | Company | Title | Industry | TRL | Status | Next Action | Date |
   |------|---------|-------|----------|-----|--------|-------------|------|
   | John Kim | TechCo | CTO | ICT | 7 | 🔵 | Send connection request | Oct 28 |
   | ... | ... | ... | ... | ... | ... | ... | ... |
   
   ## NTIS Grant Winners
   
   | Company | Project Name | Year | Contact | Status | Next Action | Date |
   |---------|--------------|------|---------|--------|-------------|------|
   | BioMed Inc | AI Drug Discovery | 2024 | jane@biomed.kr | 🔵 | Send email | Oct 28 |
   | ... | ... | ... | ... | ... | ... | ... |
   
   ## Incubator Intros
   
   | Incubator | Contact | Status | Companies Introduced | Date |
   |-----------|---------|--------|---------------------|------|
   | TIPS | program.manager@tips.or.kr | 🔵 | Awaiting intro | Oct 29 |
   | ... | ... | ... | ... | ... |
   
   ## Goal: 10-15 invitations sent by Nov 14
   ## Target: 3-5 confirmed users by Nov 21
   ```

**Days 15-16 Success Criteria:**
- ✅ Beta landing page live at connect.kr/beta
- ✅ 3 email templates ready (NTIS, LinkedIn, Incubators)
- ✅ Recruitment tracker set up (spreadsheet/Notion)
- ✅ Target list: 20-30 prospects identified

---

#### Days 17-19: Wednesday-Friday, October 30-31 + Nov 1

**Focus: Final Preparations + Begin Recruitment**

1. **Beta Onboarding Materials** (Day 17, 3 hours)
   
   Create comprehensive guide:
   ```bash
   # Already exists from Master Plan Appendix B
   # Review and customize:
   cat docs/guides/BETA-ONBOARDING-GUIDE.md
   
   # Create onboarding checklist
   touch docs/beta-recruitment/onboarding-checklist.md
   ```
   
   Checklist items:
   - [ ] Welcome email sent
   - [ ] 30-min onboarding call scheduled
   - [ ] Account created and profile set up
   - [ ] First match generated
   - [ ] AI features demonstrated
   - [ ] Feedback widget shown
   - [ ] Support channels explained
   - [ ] Week 1 check-in scheduled

2. **Monitoring & Alerting** (Day 18, 3 hours)
   
   Set up beta-specific monitoring:
   ```typescript
   // lib/monitoring/beta-alerts.ts
   import { sendEmail } from '@/lib/email';
   
   export async function sendBetaAlert(
     type: 'signup' | 'error' | 'feedback' | 'churn',
     data: any
   ) {
     const subject = {
       signup: '🎉 New Beta User Signed Up!',
       error: '🚨 Beta User Encountered Error',
       feedback: '💬 New Beta Feedback Received',
       churn: '😢 Beta User Churned',
     }[type];
     
     await sendEmail({
       to: 'paul@connect.kr',
       subject,
       body: JSON.stringify(data, null, 2),
     });
   }
   ```
   
   Integrate into key events:
   - User registration (celebrate!)
   - Critical errors (fix ASAP)
   - Feedback submission (respond quickly)
   - User hasn't logged in for 3 days (check-in)

3. **Week 3 Completion Report** (Day 19, 1 hour)
   
   ```bash
   touch docs/plans/progress/beta-week3-complete.md
   ```
   
   Document:
   - Self-dogfooding results (issues found, fixed, deferred)
   - Beta recruitment materials ready
   - Readiness for Phase 2 (staging + Docker)

**Week 3 Success Criteria:**
- ✅ Beta landing page live
- ✅ Email templates ready
- ✅ Recruitment tracker set up
- ✅ 20-30 prospects identified
- ✅ Onboarding materials complete
- ✅ Monitoring & alerting configured
- ✅ Ready for Phase 2 (staging environment)

---

## PHASE 2: Staging & Docker Learning
### November 1-14, 2025 (2 weeks)

### Week 4: Nov 1-7 (Staging Environment)

#### Days 20-21: Saturday-Sunday, November 1-2

**Focus: Staging Server Setup**

1. **Staging Environment on Linux PC** (6 hours)
   
   SSH into Linux PC:
   ```bash
   ssh paul@[Linux-PC-IP]
   
   # Create staging directory
   mkdir -p /home/paul/connect-staging
   cd /home/paul/connect-staging
   ```
   
   Clone repository:
   ```bash
   git clone https://github.com/paulkim/connect.git .
   git checkout main
   
   # Create staging branch
   git checkout -b staging
   ```
   
   Set up environment:
   ```bash
   cp .env.example .env.staging
   nano .env.staging
   ```
   
   Configure staging environment:
   ```bash
   NODE_ENV=staging
   NEXT_PUBLIC_APP_URL=https://staging.connect.kr
   DATABASE_URL="postgresql://user:pass@localhost:5434/connect_staging"
   REDIS_URL="redis://localhost:6380"
   # ... other variables
   ```
   
   Create staging subdomain:
   ```bash
   # Add to nginx config
   sudo nano /etc/nginx/sites-available/connect-staging
   ```
   
   Nginx config:
   ```nginx
   server {
       listen 80;
       server_name staging.connect.kr;
       
       location / {
           proxy_pass http://localhost:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
   
   Enable and get SSL:
   ```bash
   sudo ln -s /etc/nginx/sites-available/connect-staging /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   
   sudo certbot --nginx -d staging.connect.kr
   ```
   
   Install dependencies:
   ```bash
   npm install
   ```
   
   Set up staging database:
   ```bash
   # Create staging database
   createdb connect_staging
   
   # Run migrations
   npx prisma migrate deploy
   
   # Seed with test data
   npx prisma db seed
   ```

2. **Test Staging Deployment** (2 hours)
   
   Start staging server:
   ```bash
   npm run build
   npm run start -- -p 3001
   ```
   
   Verify:
   ```bash
   # Visit: https://staging.connect.kr
   # Should show Connect platform
   
   # Test all features:
   # - User registration
   # - Match generation
   # - AI explanations
   # - Q&A chat
   # - Search & filters
   ```

**Days 20-21 Success Criteria:**
- ✅ Staging environment operational at staging.connect.kr
- ✅ HTTPS working with SSL certificate
- ✅ Staging database seeded with test data
- ✅ All features working in staging
- ✅ Staging is identical to production setup

---

#### Days 22-24: Monday-Wednesday, November 3-5

**Focus: Docker Learning & Practice**

1. **Docker Fundamentals** (Day 22, 4 hours)
   
   Install Docker Desktop (if not already):
   ```bash
   # macOS
   # Download from https://www.docker.com/products/docker-desktop
   
   # Verify installation
   docker --version
   docker-compose --version
   ```
   
   Learn Docker basics:
   ```bash
   # Pull sample image
   docker pull hello-world
   docker run hello-world
   
   # View running containers
   docker ps
   
   # View all containers
   docker ps -a
   
   # Remove container
   docker rm [container-id]
   ```

2. **Create Dockerfile for Next.js** (Day 22, 2 hours)
   
   ```dockerfile
   # Dockerfile
   FROM node:18-alpine AS base
   
   # Install dependencies only when needed
   FROM base AS deps
   RUN apk add --no-cache libc6-compat
   WORKDIR /app
   
   COPY package.json package-lock.json ./
   RUN npm ci
   
   # Rebuild the source code only when needed
   FROM base AS builder
   WORKDIR /app
   COPY --from=deps /app/node_modules ./node_modules
   COPY . .
   
   # Build Next.js app
   ENV NEXT_TELEMETRY_DISABLED 1
   RUN npm run build
   
   # Production image, copy all the files and run next
   FROM base AS runner
   WORKDIR /app
   
   ENV NODE_ENV production
   ENV NEXT_TELEMETRY_DISABLED 1
   
   RUN addgroup --system --gid 1001 nodejs
   RUN adduser --system --uid 1001 nextjs
   
   COPY --from=builder /app/public ./public
   COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
   COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
   
   USER nextjs
   
   EXPOSE 3000
   
   ENV PORT 3000
   ENV HOSTNAME "0.0.0.0"
   
   CMD ["node", "server.js"]
   ```
   
   Enable standalone output:
   ```javascript
   // next.config.js
   module.exports = {
     output: 'standalone',
     // ... other config
   };
   ```

3. **Create docker-compose.yml** (Day 23, 3 hours)
   
   ```yaml
   # docker-compose.yml
   version: '3.8'
   
   services:
     # Next.js App
     app:
       build:
         context: .
         dockerfile: Dockerfile
       ports:
         - "3000:3000"
       environment:
         - NODE_ENV=production
         - DATABASE_URL=postgresql://connect:password@postgres:5432/connect
         - REDIS_URL=redis://redis:6379
       depends_on:
         - postgres
         - redis
       restart: unless-stopped
     
     # PostgreSQL Database
     postgres:
       image: postgres:15-alpine
       ports:
         - "5432:5432"
       environment:
         - POSTGRES_USER=connect
         - POSTGRES_PASSWORD=password
         - POSTGRES_DB=connect
       volumes:
         - postgres_data:/var/lib/postgresql/data
       restart: unless-stopped
     
     # Redis Cache
     redis:
       image: redis:7-alpine
       ports:
         - "6379:6379"
       volumes:
         - redis_data:/data
       restart: unless-stopped
     
     # Nginx Reverse Proxy
     nginx:
       image: nginx:alpine
       ports:
         - "80:80"
         - "443:443"
       volumes:
         - ./nginx.conf:/etc/nginx/nginx.conf:ro
         - ./ssl:/etc/nginx/ssl:ro
       depends_on:
         - app
       restart: unless-stopped
   
   volumes:
     postgres_data:
     redis_data:
   ```

4. **Test Docker Build Locally** (Day 23, 2 hours)
   
   Build and run:
   ```bash
   # Build image
   docker build -t connect-app .
   
   # Run locally
   docker run -p 3000:3000 connect-app
   
   # Test: http://localhost:3000
   ```
   
   Test with docker-compose:
   ```bash
   # Build all services
   docker-compose build
   
   # Start all services
   docker-compose up
   
   # Test: http://localhost:80
   
   # View logs
   docker-compose logs -f
   
   # Stop all services
   docker-compose down
   ```

5. **Break Things Intentionally** (Day 24, 3 hours)
   
   Learn by breaking:
   ```bash
   # Scenario 1: Database connection failure
   # - Stop postgres container
   docker-compose stop postgres
   # - What happens to app? How does it handle?
   # - Restart postgres
   docker-compose start postgres
   
   # Scenario 2: Out of memory
   # - Set memory limit
   docker run -m 512m connect-app
   # - Does it crash? How gracefully?
   
   # Scenario 3: Volume data loss
   # - Delete volume
   docker volume rm connect_postgres_data
   # - Rebuild: Do migrations run automatically?
   
   # Scenario 4: Network issues
   # - Disconnect network
   docker network disconnect bridge [container-id]
   # - Reconnect
   docker network connect bridge [container-id]
   ```
   
   Document learnings:
   ```bash
   touch docs/docker/lessons-learned.md
   ```

**Days 22-24 Success Criteria:**
- ✅ Docker Desktop installed and working
- ✅ Dockerfile creates working Next.js image
- ✅ docker-compose.yml orchestrates all services
- ✅ Local Docker test successful
- ✅ Practiced disaster recovery scenarios
- ✅ Confident in Docker basics

---

#### Days 25-26: Thursday-Friday, November 6-7

**Focus: Deploy to Staging with Docker**

1. **Deploy Docker to Staging** (Day 25, 4 hours)
   
   Transfer files to Linux PC:
   ```bash
   # From MacBook
   cd /Users/paulkim/Downloads/connect
   
   # Copy Docker files to staging
   scp Dockerfile docker-compose.yml paul@[Linux-PC-IP]:/home/paul/connect-staging/
   scp -r .env.staging paul@[Linux-PC-IP]:/home/paul/connect-staging/.env
   ```
   
   SSH into Linux PC and deploy:
   ```bash
   ssh paul@[Linux-PC-IP]
   cd /home/paul/connect-staging
   
   # Build images
   docker-compose build
   
   # Start services
   docker-compose up -d
   
   # View logs
   docker-compose logs -f
   ```
   
   Configure nginx to proxy to Docker:
   ```bash
   sudo nano /etc/nginx/sites-available/connect-staging
   ```
   
   Update proxy:
   ```nginx
   location / {
       proxy_pass http://localhost:80;  # Docker nginx container
       # ... rest of config
   }
   ```
   
   Reload nginx:
   ```bash
   sudo systemctl reload nginx
   ```

2. **Test Staging Docker Deployment** (Day 25, 2 hours)
   
   Comprehensive testing:
   ```bash
   # 1. Visit staging.connect.kr
   # 2. Test all features
   # 3. Generate matches (does DB work?)
   # 4. Use AI features (does Redis cache work?)
   # 5. Upload file (do volumes persist?)
   
   # Monitor performance
   docker stats
   
   # Check logs for errors
   docker-compose logs app | grep ERROR
   ```

3. **Practice Rollback** (Day 26, 2 hours)
   
   Simulate deployment failure:
   ```bash
   # 1. Deploy "broken" version
   # Edit docker-compose.yml to use wrong image
   docker-compose up -d
   
   # 2. Verify it's broken (test staging.connect.kr)
   
   # 3. Rollback to previous version
   docker-compose down
   git checkout [previous-commit]
   docker-compose up -d
   
   # 4. Verify working again
   
   # 5. Document rollback procedure
   touch docs/docker/rollback-procedure.md
   ```

4. **Week 4 Completion Report** (Day 26, 1 hour)
   
   ```bash
   touch docs/plans/progress/beta-week4-complete.md
   ```
   
   Document:
   - Staging environment operational
   - Docker deployment successful
   - Rollback procedure tested
   - Ready for beta user recruitment finalization

**Week 4 Success Criteria:**
- ✅ Staging environment with Docker working
- ✅ All services running in containers
- ✅ Rollback procedure documented and tested
- ✅ Performance acceptable (similar to non-Docker)
- ✅ Confident in Docker deployment
- ✅ Ready for production Docker deployment

---

### Week 5: Nov 8-14 (Beta Recruitment Active)

#### Days 27-29: Saturday-Monday, November 8-10

**Focus: Active Beta User Recruitment**

**This week is all about outreach. Goal: Send 20-30 invitations.**

**Day 27 (Nov 8): LinkedIn Outreach (10 invitations)**

Morning (3 hours):
```bash
1. Open LinkedIn
2. Search: "R&D Manager" + "South Korea" + "Technology"
3. Filter: 10-100 employees, Tech companies
4. Review profiles: Look for R&D focus, grant mentions
5. Send 10 connection requests with notes
   - Use Template 2 from docs/beta-recruitment/email-templates.md
   - Personalize each: Mention their company or recent post
6. Log in recruitment tracker
```

Afternoon (2 hours):
```bash
1. Follow up with existing connections (if any)
   - Use Template 3
   - Send 5 follow-up messages
2. Update recruitment tracker
3. Set reminders to follow up in 3 days
```

**Day 28 (Nov 9): NTIS Grant Winner Outreach (10 invitations)**

Morning (3 hours):
```bash
1. Go to ntis.go.kr
2. Search recent grant winners (2023-2024)
3. Filter: Companies (not universities), Tech sectors
4. Export: Company names, project titles
5. Find contact emails:
   - Company website contact forms
   - LinkedIn search for R&D managers
   - Naver search: "[Company Name] 연구개발 담당"
6. Send 10 cold emails
   - Use Template 1
   - Personalize: Congratulate on specific project
7. Log in recruitment tracker
```

**Day 29 (Nov 10): Incubator Outreach (5-10 potential intros)**

Morning (2 hours):
```bash
1. List target incubators:
   - TIPS (tips.or.kr)
   - K-Startup (k-startup.go.kr)
   - D.CAMP (dcamp.kr)
   - SparkLabs, FuturePlay, etc.
2. Find program managers on LinkedIn
3. Send personalized messages:
   - Explain Connect briefly
   - Offer value to their portfolio companies
   - Ask for 3-5 warm intros
4. Log in recruitment tracker
```

Afternoon (2 hours):
```bash
1. Follow up on LinkedIn connections from Day 1
   - Check who accepted
   - Send follow-up messages (Template 3)
2. Update recruitment tracker
3. Review response rate: Any adjustments needed to messaging?
```

**Days 27-29 Success Criteria:**
- ✅ 20-30 total invitations sent
- ✅ LinkedIn: 10 connection requests
- ✅ NTIS: 10 cold emails
- ✅ Incubators: 5 program manager requests
- ✅ All logged in recruitment tracker
- ✅ Expect 2-5 positive responses by end of week

---

#### Days 30-33: Tuesday-Friday, November 11-14

**Focus: Follow-ups + Production Deployment Prep**

**Day 30-31 (Nov 11-12): Follow-ups & Demo Calls (4 hours per day)**

Daily routine:
```bash
Morning: Check responses
1. Check email and LinkedIn for replies
2. For each positive response:
   - Reply within 1 hour
   - Propose 3 time slots for 15-min demo call
   - Send calendar invite with Zoom/Google Meet link
3. Update recruitment tracker: Status → "🟢 Interested"

Afternoon: Demo calls
1. Conduct 15-min demo calls with interested prospects
   - Follow Appendix B script from Master Plan
   - Show matching, AI features, value props
   - Answer questions honestly
   - Ask: "Would you like to join our beta?"
2. For YES:
   - Send welcome email immediately
   - Schedule 30-min onboarding call (week of Nov 15)
   - Update tracker: Status → "✅ Confirmed"
3. For MAYBE:
   - Send follow-up: "Take your time, offer valid until Nov 20"
   - Set reminder to follow up Nov 18
4. For NO:
   - Thank them for their time
   - Ask: "What would make this more valuable for you?"
   - Update tracker: Status → "❌ Declined" + reason
```

**Goal by Nov 14:**
- 3-5 confirmed beta users
- 2-3 more in "maybe" stage
- If <3 confirmed: Send 10 more invitations (backup plan)

**Day 32-33 (Nov 13-14): Production Deployment Preparation (6 hours)**

While waiting for demo responses:

1. **Production Docker Configuration** (3 hours)
   ```bash
   cd /Users/paulkim/Downloads/connect
   
   # Create production docker-compose
   cp docker-compose.yml docker-compose.prod.yml
   
   # Edit for production
   nano docker-compose.prod.yml
   ```
   
   Production optimizations:
   ```yaml
   # docker-compose.prod.yml
   services:
     app:
       build:
         context: .
         dockerfile: Dockerfile
       ports:
         - "3000:3000"
       environment:
         - NODE_ENV=production
       deploy:
         replicas: 2  # Run 2 instances for load balancing
         resources:
           limits:
             cpus: '2.0'
             memory: 4G
       restart: always
       healthcheck:
         test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
         interval: 30s
         timeout: 10s
         retries: 3
     
     # ... rest similar to staging
   ```

2. **Production Deployment Checklist** (2 hours)
   ```bash
   touch docs/deployment/production-checklist.md
   ```
   
   Create comprehensive checklist:
   ```markdown
   # Production Deployment Checklist
   
   ## Pre-Deployment (Day before: Nov 14)
   - [ ] All code merged to main branch
   - [ ] All tests passing (npm run test)
   - [ ] Build successful (npm run build)
   - [ ] Environment variables configured (.env.production)
   - [ ] SSL certificate valid (check expiry)
   - [ ] Database backup taken
   - [ ] Monitoring dashboards ready
   
   ## Deployment Day (Nov 15)
   - [ ] SSH into Linux PC
   - [ ] Pull latest code (git pull origin main)
   - [ ] Stop old services (systemctl stop ...)
   - [ ] Build Docker images (docker-compose build)
   - [ ] Run database migrations (npx prisma migrate deploy)
   - [ ] Start Docker services (docker-compose up -d)
   - [ ] Verify all containers running (docker ps)
   - [ ] Test production URL (https://connect.kr)
   - [ ] Monitor logs for 1 hour (docker-compose logs -f)
   
   ## Post-Deployment
   - [ ] Update IMPLEMENTATION-STATUS.md (production live!)
   - [ ] Notify beta users (deployment complete email)
   - [ ] Monitor for 24 hours actively
   - [ ] Set up daily health check routine
   ```

3. **Final Staging Test** (1 hour)
   ```bash
   # One last comprehensive test on staging
   # Test everything as if it were production
   
   1. User registration → Profile setup → Matching
   2. AI explanations (5+ programs)
   3. Q&A chat (10+ questions)
   4. Search & filters
   5. Mobile test (iOS/Android)
   6. Performance (all under targets?)
   7. No errors in logs?
   
   # If ANY issues found: FIX before deploying to production
   ```

**Week 5 Success Criteria:**
- ✅ 3-5 confirmed beta users (scheduled for onboarding week of Nov 15)
- ✅ Production deployment plan complete
- ✅ Production docker-compose.prod.yml ready
- ✅ Deployment checklist finalized
- ✅ Final staging test passed
- ✅ Ready to deploy to production Nov 15

---

## PHASE 3: Stealth Beta Deployment
### November 15 - December 15, 2025 (4 weeks)

### Week 6: Nov 15-21 (Soft Launch + First Users)

#### Day 34: Friday, November 15 (DEPLOYMENT DAY)

**THIS IS THE BIG DAY. Production deployment with Docker.**

**Morning (4 hours): Production Deployment**

```bash
# 6:00 AM KST - Start deployment (low traffic time)

1. SSH into Linux PC
   ssh paul@[Linux-PC-IP]

2. Navigate to production directory
   cd /home/paul/connect-production
   
3. Pull latest code
   git pull origin main
   git log -1  # Verify correct commit

4. Backup database
   pg_dump connect > backup-$(date +%Y%m%d-%H%M%S).sql
   
5. Build Docker images
   docker-compose -f docker-compose.prod.yml build
   
6. Stop old services (if any)
   # If running non-Docker
   sudo systemctl stop connect
   
   # Or if running old Docker
   docker-compose down
   
7. Run database migrations
   npx prisma migrate deploy
   npx prisma db seed  # Optional: Re-seed if needed
   
8. Start production services
   docker-compose -f docker-compose.prod.yml up -d
   
9. Verify all containers running
   docker ps
   # Should show: app, postgres, redis, nginx
   
10. Check logs for errors
    docker-compose -f docker-compose.prod.yml logs -f
    # Watch for 10 minutes, no errors = good

11. Test production URL
    curl https://connect.kr
    # Should return 200 OK
    
12. Test key features manually
    - Visit https://connect.kr
    - Register new account
    - Set up organization profile
    - Generate matches
    - Click AI explanation (does it load?)
    - Send Q&A chat message
    
13. Monitor for 1 hour
    - Check CPU/RAM: docker stats
    - Check logs: docker-compose logs -f
    - Check monitoring dashboard (Prometheus/Grafana)
    
# 10:00 AM - Deployment complete! ✅
```

**Afternoon (3 hours): Beta User Onboarding**

```bash
1. Send "Welcome to Connect Beta" email to confirmed users (3-5 people)
   - Subject: 🎉 Connect Beta가 시작되었습니다!
   - Body: Credentials, login link, onboarding call schedule
   - Include: Quick start guide (3 minutes)

2. Conduct first onboarding call (30 min each)
   - Follow Appendix B script from Master Plan
   - Guide through: Registration → Profile → Matching → AI features
   - Answer questions, note feedback
   
3. Set up monitoring for beta users specifically
   - Tag their accounts: beta_user = true
   - Enhanced logging for their sessions
   - Email alerts if they encounter errors
```

**Evening (2 hours): Day 1 Review**

```bash
1. Review deployment success
   - Any downtime? (target: 0 minutes)
   - Any errors? (review logs)
   - Performance? (response times within targets?)

2. Review beta user onboarding
   - How many completed profile setup?
   - How many generated matches?
   - Any confusion or friction points?

3. Document Day 1
   touch docs/beta/day1-launch-report.md
   
   Include:
   - Deployment time: __ hours
   - Downtime: __ minutes
   - Beta users onboarded: __/5
   - Issues encountered: __
   - Fixes deployed: __

4. Celebrate! 🎉
   - You just deployed to production with Docker
   - You have real users testing Connect
   - This is a HUGE milestone
```

**Day 34 Success Criteria:**
- ✅ Production deployment successful
- ✅ Zero critical errors in first 4 hours
- ✅ 3-5 beta users onboarded
- ✅ All beta users completed profile setup
- ✅ At least 1 beta user generated matches
- ✅ System stable under initial load

---

#### Days 35-40: Saturday-Thursday, November 16-21

**Focus: Active Beta Support & Monitoring**

**Daily Routine for Beta Week 1 (Repeat Days 35-40):**

**Morning (1-2 hours): Monitoring & Support**
```bash
1. Check monitoring dashboards (9:00 AM)
   - Review overnight logs
   - Any errors? (investigate immediately)
   - Response times? (should be <500ms P95)
   - AI API usage? (within budget?)

2. Check beta user activity
   - Who logged in yesterday?
   - Who generated matches?
   - Who used AI features?
   - Who hasn't logged in? (send check-in email)

3. Respond to feedback & support requests
   - Check email: support@connect.kr
   - Check feedback widget
   - Target: Respond within 4 hours

4. Morning standup (with yourself)
   - What went well yesterday?
   - What issues need fixing today?
   - What's the priority for today?
```

**Afternoon (1-2 hours): Proactive Outreach**
```bash
1. Send daily check-in email to beta users (alternating days)
   Day 1 (Nov 16): "어제 첫 매칭 결과는 어땠나요?"
   Day 3 (Nov 18): "AI 설명 기능을 사용해보셨나요?"
   Day 5 (Nov 20): "혹시 불편한 점이나 개선 아이디어가 있으신가요?"

2. Quick bug fixes (if any reported)
   - P0: Fix immediately, deploy within 4 hours
   - P1: Fix today, deploy tomorrow morning
   - P2: Document, fix during weekend

3. Monitor matching quality
   - Review which matches users saved
   - Review which matches users ignored
   - Are high-scoring matches being saved? (good signal)
   - Are low-scoring matches being saved? (scoring issue?)
```

**Evening (30 min): Daily Summary**
```bash
1. Update daily log
   touch docs/beta/day[XX]-summary.md
   
   Template:
   # Day [XX] Summary - Nov [date], 2025
   
   ## Metrics
   - Active users today: __/5
   - Matches generated: __
   - AI explanations loaded: __
   - Q&A messages sent: __
   - Feedback items: __
   
   ## Issues
   - P0: __ (fixed: __)
   - P1: __ (fixing tomorrow)
   - P2: __ (backlog)
   
   ## Highlights
   - [User A] said: "..."
   - [User B] requested: "..."
   
   ## Tomorrow's Focus
   - [ ] Fix P1 issue #1
   - [ ] Follow up with User C (hasn't logged in for 2 days)
   - [ ] ...
```

**Weekly Beta Check-in Call (Nov 21, Week 1 End)**
```bash
1. Schedule 30-min call with each beta user
2. Ask structured questions:
   - Overall experience (1-10 scale)
   - Match relevance (what % were useful?)
   - AI helpfulness (thumbs up/down stats?)
   - Feature requests (what's missing?)
   - Pain points (what's confusing?)
3. Take detailed notes
4. Thank them for feedback
5. Share: "We're fixing X and Y based on your feedback"
```

**Days 35-40 Success Criteria:**
- ✅ All beta users logged in at least 3 times
- ✅ All beta users generated matches
- ✅ 80%+ of beta users tried AI explanations
- ✅ 50%+ of beta users tried Q&A chat
- ✅ Zero P0 bugs unresolved
- ✅ <3 P1 bugs open
- ✅ 10+ feedback items collected per user
- ✅ System stable (99%+ uptime)

---

### Weeks 7-9: Nov 22 - Dec 15 (Full Beta Period)

**I'll provide a condensed version since the pattern repeats:**

#### Week 7 (Nov 22-28): Beta Refinement

**Goals:**
- Fix all P1 bugs from Week 6
- Implement quick wins from feedback
- Onboard 1-2 more users (if needed to reach 5 total)

**Daily Tasks:**
- Continue monitoring & support routine
- Implement top 3 feedback items
- Weekly survey: Send Week 2 feedback survey (see Master Plan Appendix C)
- Analyze: Match relevance improving? AI helpfulness improving?

**Success Criteria:**
- All P1 bugs from Week 6 fixed
- Top 3 feedback items implemented
- Match relevance >60%
- AI helpfulness >50%

---

#### Week 8 (Nov 29 - Dec 5): Deep Feedback Collection

**Goals:**
- Conduct in-depth interviews with all beta users
- Validate success metrics
- Identify must-fix issues before launch

**Tasks:**
- Schedule 45-min interview with each user
- Questions:
  - "Walk me through how you use Connect"
  - "What's the #1 value you get?"
  - "What's the #1 frustration?"
  - "Would you pay ₩24,500/month after free trial?"
  - "Would you recommend Connect to a colleague?"
- Analyze responses for patterns
- Create priority list for Week 9-10

**Success Criteria:**
- 5/5 users completed interview
- Value proposition validated ("time savings" most mentioned?)
- Pricing validated (3+/5 would pay)
- 3+ users would recommend

---

#### Week 9 (Dec 6-12): Final Beta Improvements

**Goals:**
- Implement final improvements before code freeze
- Request testimonials
- Prepare for launch

**Tasks:**
- Fix top 5 issues from interviews
- Optimize: Improve cache hit rates, reduce AI costs
- Request testimonials: "Can we feature your quote at launch?"
- Write case studies: 2-3 detailed stories
- Final survey: Week 4 wrap-up (see Master Plan Appendix C)

**Success Criteria:**
- Top 5 issues fixed
- 3+ testimonials collected
- 2+ case studies written
- All success metrics passed (see Master Plan)

---

## PHASE 4: Refinement & Code Freeze
### December 16-31, 2025 (2 weeks)

### Week 10 (Dec 16-22): Final Improvements

**Monday-Wednesday (Dec 16-18): Implementation Sprint**
- Implement remaining P1 issues from beta
- No new features, only refinements
- Test all changes thoroughly

**Thursday-Saturday (Dec 19-21): Load Testing Round 2**
- Run full load test: 500 concurrent users, 10x beta traffic
- Validate all performance targets
- Test failover one final time

**Sunday (Dec 22): Week 10 Review**
- Are all success metrics met?
- Decision: GO/NO-GO for Jan 1 launch?
- If NO-GO: Delay to Jan 15, fix blockers

---

### Week 11 (Dec 23-31): Code Freeze & Launch Prep

**Wednesday (Dec 25): CODE FREEZE**
```bash
# No more changes after this point except critical bugs

git tag v1.0.0-launch-ready
git push origin v1.0.0-launch-ready

# Backup everything
pg_dump connect > backup-launch-$(date +%Y%m%d).sql
tar -czf connect-launch-backup.tar.gz /home/paul/connect-production
```

**Thursday-Saturday (Dec 26-28): Launch Materials**
- Finalize landing page with testimonials
- Publish case studies
- Write launch blog post
- Schedule social media posts
- Prepare email to beta users

**Sunday (Dec 29): Final System Check**
- All services GREEN
- All monitors GREEN
- Database backup fresh
- SSL certificates valid (>90 days)
- Rollback plan ready

**Monday (Dec 30): Launch Rehearsal**
- Simulate launch day steps
- Test: Remove beta whitelist (in staging)
- Test: Send announcement email (to test account)
- Test: Process first payment (test mode)
- Practice monitoring routine

**Tuesday (Dec 31): Launch Eve**
```bash
# Final checks at 23:00 KST

1. All systems healthy
2. Team ready (just you, but mentally prepared!)
3. Monitoring dashboards bookmarked
4. Launch announcement ready to deploy
5. Get good sleep before launch! 💤
```

---

## PHASE 5: LAUNCH DAY 🚀
### January 1, 2026

**00:00 KST - LAUNCH**

```bash
1. Remove beta whitelist (public access)
   # In database
   UPDATE settings SET beta_mode = false;

2. Deploy launch announcement
   # Publish blog post
   # Post to LinkedIn, Twitter, Facebook
   # Email beta users: "Connect is now public!"

3. Begin monitoring (every 30 min for 6 hours)
   - User registrations
   - Error rates
   - Response times
   - AI API usage
   - Payment processing

4. Celebrate first registration! 🎉
5. Celebrate first paying customer! 💰
6. Celebrate first 100 users! 🚀

# Then keep building, keep improving, keep helping users

# You did it, Paul. You launched Connect. 🎉
```

---

## Troubleshooting Guide

### Issue: Docker Build Fails

**Symptoms**: `docker build` command fails with errors

**Solutions**:
```bash
# 1. Check Dockerfile syntax
cat Dockerfile

# 2. Clear Docker cache
docker builder prune -a

# 3. Build with no cache
docker build --no-cache -t connect-app .

# 4. Check disk space
df -h

# 5. Check Docker memory
docker system df

# 6. Increase Docker resources (Docker Desktop settings)
# Settings → Resources → Memory: 4GB+
```

### Issue: Database Migration Fails

**Symptoms**: `npx prisma migrate deploy` fails

**Solutions**:
```bash
# 1. Check database connection
psql -h localhost -U connect -d connect

# 2. Check migration status
npx prisma migrate status

# 3. Reset database (CAUTION: Deletes all data)
npx prisma migrate reset

# 4. Apply migrations manually
npx prisma migrate deploy --schema=./prisma/schema.prisma

# 5. Check Prisma logs
npx prisma migrate deploy --help
```

### Issue: No Beta User Signups

**Symptoms**: Sent 20+ invitations, <2 positive responses

**Solutions**:
```bash
# 1. Review messaging: Is value prop clear?
# 2. Expand outreach: Send to 50+ prospects
# 3. Lower barrier: Offer 3 months free (instead of 30 days)
# 4. Warm intros: Ask incubators harder
# 5. Personal network: Use as last resort
# 6. Delay launch: Give more time to recruit
```

### Issue: Critical Bug in Production

**Symptoms**: Users report blocking issue

**Solutions**:
```bash
# 1. Assess severity (P0: fix immediately)

# 2. Roll back to previous version
cd /home/paul/connect-production
git log  # Find last good commit
git checkout [previous-commit]
docker-compose down
docker-compose up -d

# 3. Notify users: "We found an issue, rolled back, fixing now"

# 4. Fix in dev, test thoroughly

# 5. Deploy fix
git checkout main
git pull origin main
docker-compose down
docker-compose up -d

# 6. Monitor for 1 hour

# 7. Apologize to users, explain what happened
```

---

## Quick Reference Commands

**Essential Docker Commands:**
```bash
# Build image
docker build -t connect-app .

# Run container
docker run -p 3000:3000 connect-app

# View running containers
docker ps

# View logs
docker logs [container-id]

# Stop container
docker stop [container-id]

# Remove container
docker rm [container-id]

# Build with docker-compose
docker-compose build

# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Check status
docker-compose ps
```

**Essential Git Commands:**
```bash
# Check status
git status

# Pull latest
git pull origin main

# Create branch
git checkout -b feature-name

# Commit changes
git add .
git commit -m "feat: Description"

# Push to remote
git push origin feature-name

# Tag release
git tag v1.0.0
git push origin v1.0.0
```

**Essential PostgreSQL Commands:**
```bash
# Connect to database
psql -U connect -d connect

# List databases
\l

# Connect to database
\c connect

# List tables
\dt

# Describe table
\d organizations

# Exit
\q

# Backup
pg_dump connect > backup.sql

# Restore
psql connect < backup.sql
```

---

## Conclusion

Paul, you now have a complete, detailed, week-by-week execution plan for Connect's beta testing.

**Key Reminders:**

1. **Self-dogfood first** (Oct 24-31): Catch obvious issues before real users see them
2. **Learn Docker safely** (Nov 1-14): Practice in staging before production
3. **Recruit outside your network** (Nov 1-14): Target market, not personal contacts
4. **Support beta users actively** (Nov 15 - Dec 15): Fast responses, proactive outreach
5. **Gather feedback religiously**: Every interaction is a learning opportunity
6. **Code freeze is sacred** (Dec 25): No changes except critical bugs
7. **Launch with confidence** (Jan 1): You'll have validated everything

**This plan gives you:**
- ✅ Safety net of beta testing (not scary, PROTECTIVE)
- ✅ Real user validation (not guesses)
- ✅ Testimonials and case studies (launch with proof)
- ✅ Docker deployment experience (low stakes practice)
- ✅ Marketing insights (data-driven positioning)

**You're not skipping beta testing. You're doing it RIGHT.**

Questions? Stuck? Refer to:
- BETA-TEST-MASTER-PLAN.md (strategy)
- This document (tactics)
- Master Plan Appendices (detailed guides)

**Let's make Connect a success. I'm with you every step of the way.** 🚀

---

*Last updated: October 10, 2025*
*Author: Paul Kim (Founder & CEO)*
*Tactical Advisor: Claude*
