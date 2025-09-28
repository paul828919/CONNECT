# CONNECT – Product Requirements Document (PRD) v5.0

**Version:** 5.0 Optimized
**Date:** 2024-09-27
**Status:** Draft for Review
**Scope:** Innovation Ecosystem Platform for Korea's R&D Lifecycle

---

## Executive Summary

CONNECT is an explainable matching platform that accelerates Korea's innovation ecosystem by connecting Companies, Research Institutes, Universities, and Investors through the complete R&D lifecycle: Funding → Collaboration → Tech Transfer → Investment. Unlike generic AI tools (ChatGPT/Claude) that cost ₩28,000/month, Connect provides verified, real-time Korean R&D opportunities with warm introductions and compliance automation for ₩9,900/month.

---

## 1. Product Vision & Strategy

### 1.1 Vision Statement
Enable every Korean organization to accelerate innovation through intelligent matching across the complete R&D lifecycle.

### 1.2 Strategic Positioning
- **Primary Competition**: ChatGPT/Claude/Gemini (₩28,000/month generic AI)
- **Secondary Competition**: Manual search on NTIS/SMTECH/K-Startup
- **Unique Value**: Pre-verified Korean data + warm introductions + compliance automation

### 1.3 Target Market
- **Primary**: 10,000+ SMEs seeking government R&D funding (Jan-March rush)
- **Secondary**: 200+ research institutes, 400+ university labs
- **Tertiary**: 500+ investors seeking validated technologies

---

## 2. User Personas (All 4 Types from Day 1)

### 2.1 Company Users (기업)
- **Primary Need**: Funding for technology development
- **Secondary Need**: University/Institute collaboration for innovation
- **Pain Points**: Missing opportunities, complex requirements, no warm intros
- **Business Structure Split**: 90% Corporate (법인), 10% Sole Proprietorship (개인사업자)

### 2.2 Research Institute Users (연구소)
- **Primary Need**: Multi-year R&D budgets aligned to national priorities
- **Secondary Need**: Industry partners for commercialization
- **Pain Points**: Tech transfer barriers, finding industry applications

### 2.3 University Users (대학)
- **Primary Need**: Research grants for labs and PIs
- **Secondary Need**: Industry collaboration for applied research
- **Pain Points**: Complex compliance (IRB/IACUC), TTO bottlenecks

### 2.4 Investor Users (투자자)
- **Primary Need**: Validated technologies with commercial potential
- **Secondary Need**: Government grant validation as risk mitigation
- **Pain Points**: Technical due diligence, finding grant-validated startups

---

## 3. Core Features by Phase

### Phase 1: Funding Foundation (Weeks 1-2) - December Launch
**Goal**: Capture January-March government announcement rush

#### Features:
1. **Multi-Organization Registration**
   - All 4 types supported (Company/Institute/University/Investor)
   - Business structure differentiation (법인/개인사업자)
   - 사업자등록번호 verification via Korean API

2. **Funding Match Engine**
   - 100+ pre-loaded government programs
   - Simple eligibility gates (organization type, TRL, budget)
   - Top 5 matches with basic explanations
   - Korean-first UI (English as secondary)

3. **Announcement Calendar**
   - Visual timeline of upcoming deadlines
   - Filtered by organization type
   - Email/Kakao notifications

4. **Basic Profile System**
   - 10-15 essential fields only
   - Progressive disclosure
   - Auto-save every change

### Phase 2: Collaboration Layer (Weeks 3-4)
**Goal**: Enable consortium formation for complex R&D projects

#### Features:
1. **Partner Discovery**
   - Complementary capability matching
   - Technology-based search
   - Verified organization profiles

2. **Consortium Builder**
   - Smart partner suggestions
   - Role assignment (주관/참여)
   - Budget allocation calculator

3. **Collaboration Workspace**
   - Shared document storage
   - Basic task management
   - MOU templates

### Phase 3: Execution Tools (Weeks 5-6)
**Goal**: Reduce application time from days to hours

#### Features:
1. **Smart Checklists**
   - Auto-generated from program requirements
   - Deadline back-planning
   - Document requirement mapping

2. **Proposal Workspace**
   - Section templates
   - Collaborative editing
   - Version control

3. **Warm Introduction System**
   - Request → Contact → Accept/Decline flow
   - 72-hour SLA tracking
   - Introduction success metrics

### Phase 4: Platform Polish (Weeks 7-8)
**Goal**: Revenue generation and retention

#### Features:
1. **Payment Integration**
   - Toss Payments (Korean-first)
   - Free/Pro/Team tiers
   - Usage-based metering

2. **Tech Transfer Marketplace** (Basic)
   - University/Institute IP listings
   - Technology search
   - Expression of interest system

3. **Investor Alerts** (Basic)
   - Milestone achievement notifications
   - Grant validation badges
   - Portfolio tracking

---

## 4. Pricing Strategy

### 4.1 Tier Structure

| Plan | Monthly Price | Annual Price | Target User |
|------|--------------|--------------|-------------|
| **Free** | ₩0 | ₩0 | Individual researchers exploring |
| **Pro** | ₩9,900 | ₩8,900/mo | Active grant seekers (1 seat) |
| **Team** | ₩29,900 | ₩24,900/mo | Organizations (3 seats) |
| **Enterprise** | Custom | Custom | Large organizations (10+ seats) |

### 4.2 Feature Matrix

| Feature | Free | Pro | Team | Enterprise |
|---------|------|-----|------|------------|
| Funding Matches | 3/month | Unlimited | Unlimited | Unlimited |
| Match Details | Summary only | Full explanation | Full explanation | Full explanation |
| Partner Search | 5/month | 50/month | Unlimited | Unlimited |
| Warm Intros | 0 | 5/month | 15/month | Custom |
| Workspaces | 1 | 3 | 10 | Unlimited |
| API Access | No | Read-only | Full | Full |
| Support | Community | Email <24h | Priority | Dedicated |

### 4.3 Value Proposition vs Competition
"Why pay ₩28,000 for ChatGPT when Connect gives you verified Korean R&D data, warm introductions, and compliance automation for just ₩9,900?"

---

## 5. Technical Architecture (Optimized)

### 5.1 Technology Stack
- **Frontend**: Next.js 14 App Router, TypeScript, Tailwind CSS
- **Backend**: Node.js, Prisma ORM
- **Database**: PostgreSQL 15
- **Cache**: Redis
- **Search**: PostgreSQL Full-text (not OpenSearch initially)
- **Payments**: Toss Payments only
- **Infrastructure**: Single server deployment initially

### 5.2 Performance Requirements
- Page load: < 2 seconds
- Match generation: < 1 second
- API response: < 500ms
- Uptime: 99.9%

### 5.3 Security & Compliance
- 사업자등록번호 encrypted at rest
- PIPA compliance
- JWT-based authentication
- Kakao/Naver OAuth

---

## 6. Matching Logic (Simplified for MVP)

### 6.1 Funding Matches
**Gates (Binary Pass/fail):**
- Organization type eligibility
- Business structure eligibility
- Budget range match
- TRL range (if applicable)

**Simple Scoring (0-100):**
- Organization type fit: 40%
- Budget match: 30%
- Timeline alignment: 20%
- Regional bonus: 10%

### 6.2 Collaboration Matches
**Gates:**
- Complementary capabilities
- Timeline overlap
- Budget compatibility

**Simple Scoring:**
- Technology complementarity: 50%
- Past collaboration success: 25%
- Geographic proximity: 25%

---

## 7. Data Strategy

### 7.1 Initial Data Loading (December)
- 100+ government funding programs (manual entry)
- 50+ active research institutes
- 100+ university labs
- 20+ investment firms

### 7.2 Data Sources
- **Primary**: Manual curation from ministry websites
- **Secondary**: NTIS API (when available)
- **Tertiary**: User-submitted programs

### 7.3 Data Freshness
- **Free users**: Weekly updates
- **Pro users**: Daily updates
- **Peak season (Jan-Mar)**: Real-time updates

---

## 8. Launch Strategy

### 8.1 Timeline
- **Dec 1-7**: Closed beta with 10 organizations
- **Dec 8-14**: Open beta with 50 organizations
- **Dec 15**: Public launch (capture January rush)
- **Jan-Mar**: Peak season operations
- **April**: Add collaboration features
- **June**: Tech transfer marketplace
- **September**: Investor platform

### 8.2 Success Metrics

#### Week 1 Post-Launch
- 100 registered organizations
- 20 completed profiles
- 10 funding matches created

#### Month 1
- 500 registered organizations
- 100 paying customers
- 50 warm introductions sent
- 10% intro → meeting conversion

#### Month 3 (End of Peak Season)
- 2,000 registered organizations
- 500 paying customers
- 100 successful applications reported
- 20% free → paid conversion

---

## 9. Risk Mitigation

### 9.1 Technical Risks
- **Server overload in January**: Use CDN, implement caching
- **Data accuracy**: Manual verification process, user reporting
- **Payment failures**: Multiple payment methods, retry logic

### 9.2 Business Risks
- **Low conversion**: Extended trial period during peak season
- **Competition from AI tools**: Emphasize verified data + warm intros
- **Slow adoption**: Partner with accelerators/associations

### 9.3 Regulatory Risks
- **PIPA compliance**: Encryption, consent management
- **Business verification**: Fallback to manual verification
- **Payment regulations**: Use established providers (Toss)

---

## 10. Development Priorities (30-Day Sprint)

### Week 1-2: Foundation
- [ ] Authentication (Kakao/Naver OAuth)
- [ ] Organization profiles (all 4 types)
- [ ] Basic funding matcher
- [ ] 100 programs loaded

### Week 3-4: Collaboration
- [ ] Partner search
- [ ] Consortium builder
- [ ] Basic workspace

### Week 5-6: Execution
- [ ] Smart checklists
- [ ] Warm introductions
- [ ] Proposal templates

### Week 7-8: Launch Preparation
- [ ] Payment integration
- [ ] Usage metering
- [ ] Performance optimization
- [ ] Mobile responsiveness

---

## 11. Post-Launch Roadmap

### Q1 2025 (Jan-Mar): Peak Season
- Scale for high traffic
- Daily data updates
- Customer support scaling
- Feature refinement based on feedback

### Q2 2025 (Apr-Jun): Collaboration Focus
- Advanced consortium tools
- IP/MOU management
- Success story showcases
- University TTO integration

### Q3 2025 (Jul-Sep): Tech Transfer
- IP marketplace launch
- Licensing workflow
- Valuation tools
- Technology search

### Q4 2025 (Oct-Dec): Investment Platform
- Investor onboarding
- Deal flow management
- Due diligence tools
- Exit tracking

---

## 12. Key Differentiators

1. **Ecosystem Approach**: All 4 participant types, not just companies
2. **Lifecycle Coverage**: Funding → Collaboration → Tech Transfer → Investment
3. **Korean-First**: Built for Korean R&D ecosystem, not generic
4. **Verified Data**: Real programs, real organizations, no hallucinations
5. **Warm Introductions**: Active facilitation, not just information
6. **Explainable**: Clear scoring, transparent reasoning
7. **Timing**: Aligned with Korean R&D calendar
8. **Price**: ₩9,900 vs ₩28,000 for AI tools

---

## 13. Open Questions for Discussion

1. **Data Partnerships**: Can we get official API access from ministries?
2. **Legal Framework**: Should Connect provide legal templates (MOU/NDA)?
3. **Success Tracking**: How to verify successful applications?
4. **Mobile Strategy**: Progressive Web App or Native App priority?
5. **Geographic Expansion**: Focus on Seoul or nationwide from start?
6. **Language**: Korean-only initially or include English?
7. **Investor Timing**: Should we engage investors earlier?
8. **Certification**: Should we seek government endorsement?

---

## 14. Implementation Notes

### For Development Team
- Start with monolithic architecture, refactor later
- Use PostgreSQL full-text search, not OpenSearch
- Implement caching aggressively for January rush
- Mobile-first responsive design
- Korean language primary, English secondary

### For Design Team
- Korean UI/UX patterns (dense information)
- Mobile-first responsive
- Trust signals prominent (verified badges)
- Calendar/deadline visualization critical
- Progress indicators for long forms

### For Business Team
- Partner with 1-2 accelerators for initial users
- Focus PR on "AI alternative" angle
- Prepare for 10x traffic in January
- Success stories critical for growth
- Consider freemium during peak season

---

## Appendix A: Competition Analysis

| Competitor | Strength | Weakness | Connect Advantage |
|------------|----------|----------|------------------|
| ChatGPT/Claude | General purpose | No Korean R&D data | Verified, real-time data |
| NTIS | Official source | Poor UX, no matching | Smart matching, better UX |
| SMTECH | SME focused | Limited to SMEs | All organization types |
| K-Startup | Startup ecosystem | Only startups | Broader coverage |
| Manual Search | User control | Time-consuming | 90% time savings |

---

## Appendix B: Revenue Projections

### Conservative Scenario
- Month 1: 100 paid users × ₩9,900 = ₩990,000
- Month 3: 500 paid users × ₩9,900 = ₩4,950,000
- Month 6: 1,000 paid users × ₩9,900 = ₩9,900,000
- Year 1: ₩120,000,000

### Optimistic Scenario
- Month 1: 200 paid users = ₩1,980,000
- Month 3: 1,000 paid users = ₩9,900,000
- Month 6: 2,500 paid users = ₩24,750,000
- Year 1: ₩300,000,000

---

## Appendix C: Technical Debt Acceptance

### Acceptable for MVP
- Monolithic architecture
- Basic search (no ElasticSearch)
- Manual data entry
- Limited automation
- Korean language only

### Not Acceptable
- Security vulnerabilities
- Slow performance (>2s page load)
- Data loss risks
- Payment failures
- Mobile incompatibility

---

*End of PRD v5.0*

**Document Status**: Ready for review and discussion
**Next Steps**: Gather feedback, finalize priorities, begin development
**Target Launch**: December 15, 2024