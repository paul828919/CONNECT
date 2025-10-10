# Week 3-4 Execution Checklist
## AI Integration: Claude Sonnet 4.5

**Preparation Complete**: October 9, 2025 ✅
**Execution Start**: October 16, 2025 (recommended)
**Target Completion**: November 1, 2025

---

## ✅ Pre-Execution Checklist (COMPLETED)

### Day 1-2: Research & Domain Knowledge ✅
- [x] Anthropic API documentation reviewed
- [x] SDK installed (@anthropic-ai/sdk)
- [x] Korean R&D glossary created (100+ terms)
- [x] Grant examples collected (5 programs)
- [x] Cost projections calculated (₩36,600/month)

### Day 3-4: Prompt Engineering ✅
- [x] Match explanation prompt template
- [x] Q&A chat prompt template
- [x] Token counter utility
- [x] Response caching architecture

### Day 5-6: Architecture & Planning ✅
- [x] Conversation schema designed
- [x] Context manager implemented
- [x] Budget tracker created
- [x] Risk assessment complete

---

## 📋 Week 3-4 Execution Tasks

### Day 15 (Oct 23): Anthropic SDK Setup
**Duration**: 4 hours
**Status**: Ready to execute

#### Task 15.1: Production API Key Setup
- [ ] Obtain Anthropic API key from console.anthropic.com
- [ ] Add to .env: `ANTHROPIC_API_KEY="sk-ant-..."`
- [ ] Test basic connectivity with test script
- [ ] Verify rate limits (Tier 1: 50 RPM)

#### Task 15.2: Create AI Client Wrapper
**File**: `lib/ai/client.ts`
- [ ] Initialize Anthropic client
- [ ] Add rate limiting (50 RPM)
- [ ] Add error handling (429, 401, 400)
- [ ] Add retry logic (exponential backoff)
- [ ] Add request logging

**Success Criteria**:
- [ ] Client successfully connects to API
- [ ] Rate limiting prevents 429 errors
- [ ] All errors handled gracefully

---

### Day 16-17 (Oct 24-25): Match Explanations
**Duration**: 8 hours
**Status**: Prompt templates ready

#### Task 16.1: Implement Match Explanation Generator
**File**: `lib/ai/services/match-explanation.ts`
- [ ] Import prompt template
- [ ] Create `generateMatchExplanation()` function
- [ ] Parse XML response
- [ ] Add error handling

#### Task 16.2: Integrate with Match API
**File**: `app/api/matches/[id]/explanation/route.ts`
- [ ] Create API endpoint
- [ ] Fetch match data
- [ ] Call AI service
- [ ] Return parsed explanation

#### Task 16.3: Add Response Caching
- [ ] Implement Redis caching (24-hour TTL)
- [ ] Cache key: hash(companyId + programId + score)
- [ ] Measure cache hit rate

#### Task 16.4: Create UI Component
**File**: `components/match-explanation.tsx`
- [ ] Display summary
- [ ] List reasons (bullet points)
- [ ] Show cautions (if any)
- [ ] Display recommendation

#### Task 16.5: Testing & Optimization
- [ ] Test with 10+ real programs
- [ ] Measure response time (<2s target)
- [ ] A/B test prompt variations
- [ ] Collect user feedback

**Success Criteria**:
- [ ] Response time <2 seconds (with caching)
- [ ] Korean quality: natural 존댓말
- [ ] Cache hit rate >40%
- [ ] Cost per request <₩5

---

### Day 18-19 (Oct 26-27): Q&A Chat System
**Duration**: 8 hours
**Status**: Prompt templates ready

#### Task 18.1: Create Conversation API
**Files**:
- `app/api/chat/route.ts` (POST new message)
- `app/api/chat/[id]/route.ts` (GET conversation)
- `app/api/chat/[id]/messages/route.ts` (GET messages)

- [ ] Implement message creation
- [ ] Fetch conversation history
- [ ] Integrate context manager
- [ ] Call AI service with context

#### Task 18.2: Implement Conversation Manager
**File**: `lib/ai/services/conversation.ts`
- [ ] Load last 10 messages
- [ ] Summarize old messages (if >20 total)
- [ ] Build prompt with context
- [ ] Parse response

#### Task 18.3: Add Streaming Responses
- [ ] Enable streaming in API
- [ ] Server-Sent Events (SSE) implementation
- [ ] Client-side streaming handler

#### Task 18.4: Build Chat UI
**File**: `components/chat/chat-interface.tsx`
- [ ] Message list component
- [ ] Input component
- [ ] Streaming response display
- [ ] Conversation sidebar
- [ ] New conversation button

#### Task 18.5: Add Conversation Features
- [ ] Auto-generate conversation titles
- [ ] Delete conversations
- [ ] Search conversations
- [ ] Export conversation (future)

**Success Criteria**:
- [ ] Multi-turn conversations work
- [ ] Context maintained across messages
- [ ] Streaming starts <500ms
- [ ] Token limits respected

---

### Day 20-21 (Oct 28-29): Korean Prompt Optimization
**Duration**: 8 hours
**Status**: Ready for testing

#### Task 20.1: Prompt Variation Testing
- [ ] Test 5+ match explanation variations
- [ ] Test 5+ Q&A response variations
- [ ] Compare quality scores
- [ ] Select best performers

#### Task 20.2: Temperature Optimization
- [ ] Test 0.5, 0.7, 0.9 for match explanations
- [ ] Test 0.5, 0.7, 0.9 for Q&A
- [ ] Measure consistency vs. creativity
- [ ] Document optimal settings

#### Task 20.3: 존댓말 Quality Check
- [ ] Review 20+ AI responses
- [ ] Check formality level
- [ ] Check grammar correctness
- [ ] Check domain terminology accuracy

#### Task 20.4: User Feedback Collection
- [ ] Deploy to 10+ beta users
- [ ] Collect helpfulness ratings
- [ ] Collect feedback comments
- [ ] Identify improvement areas

#### Task 20.5: Prompt Refinement
- [ ] Update prompts based on feedback
- [ ] Add few-shot examples
- [ ] Refine XML structure
- [ ] Re-test with same questions

**Success Criteria**:
- [ ] >70% helpfulness rating
- [ ] Natural Korean quality
- [ ] No factual errors
- [ ] Clear disclaimers present

---

### Day 22 (Oct 30): Cost Tracking & Monitoring
**Duration**: 4 hours
**Status**: Budget tracker ready

#### Task 22.1: Deploy Budget Tracker
- [ ] Integrate with all AI requests
- [ ] Log to Redis daily usage
- [ ] Create cost dashboard API

#### Task 22.2: Set Up Alerts
- [ ] Email alert at 80% daily budget
- [ ] SMS alert at 95% daily budget
- [ ] Auto-disable at 100% (failsafe)

#### Task 22.3: Create Cost Dashboard
**File**: `app/dashboard/ai-usage/page.tsx`
- [ ] Display daily usage
- [ ] Display monthly projection
- [ ] Show cache hit rate
- [ ] Show cost per feature

#### Task 22.4: Implement Usage Analytics
- [ ] Track requests by feature
- [ ] Track requests by user
- [ ] Track average tokens
- [ ] Track cache effectiveness

#### Task 22.5: Document Cost Optimization
- [ ] Actual vs. projected costs
- [ ] Cache hit rate analysis
- [ ] Recommendations for improvement

**Success Criteria**:
- [ ] Daily budget <₩50,000
- [ ] Cache hit rate >50%
- [ ] Alerts working
- [ ] Dashboard accessible

---

## 📊 Final Validation Checklist

### Technical Quality
- [ ] Response time: Match <2s, Q&A <3s
- [ ] Error rate: <0.1%
- [ ] Cache hit rate: >50%
- [ ] Korean quality: >4.0/5.0 rating

### Business Quality
- [ ] User satisfaction: >70% helpful
- [ ] Daily cost: <₩50,000
- [ ] Feature adoption: >30% of active users
- [ ] Conversion impact: Measure Pro upgrades

### Production Readiness
- [ ] All error cases handled
- [ ] Rate limits respected
- [ ] Budget alerts configured
- [ ] Monitoring dashboard live
- [ ] Documentation complete

---

## 🚀 Post-Launch Tasks

### Week 1 After Launch
- [ ] Monitor error rates daily
- [ ] Collect user feedback
- [ ] Track cost vs. projections
- [ ] Iterate on prompts

### Week 2-4 After Launch
- [ ] A/B test prompt variations
- [ ] Optimize cache strategy
- [ ] Add new question patterns
- [ ] Measure business impact (Pro conversions)

---

**Ready to Execute**: October 16, 2025
**All preparation complete**: ✅ Day 1-6 finished
**Next Step**: Obtain Anthropic API key and begin Day 15
