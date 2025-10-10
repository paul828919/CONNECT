# Week 3-4 Preparation Plan (October 10-15, 2025)
## AI Integration Preparation: Claude Sonnet 4.5

**Purpose**: Prepare for successful AI integration by researching, prototyping, and optimizing Korean NLP prompts before full implementation.

**Timeline**: 6 days (Oct 10-15, 2025)
**Goal**: Maximize AI integration success by thorough preparation
**Success Criteria**: >70% user satisfaction with AI responses, <₩50,000/day cost

---

## 🎯 Preparation Objectives

### Primary Goals
1. **Understand Anthropic API deeply** - Rate limits, pricing, best practices
2. **Master Korean R&D terminology** - TRL, ISMS-P, KC, grant-specific vocabulary
3. **Prototype prompt templates** - Match explanations, Q&A chat, professional 존댓말
4. **Plan cost optimization** - Caching strategy, token management, daily budgets
5. **Design conversation architecture** - Memory management, context handling

### Why Preparation Matters
- **Cost Risk**: Poor prompts = wasted tokens = ₩50K/day budget exceeded
- **Quality Risk**: Bad Korean = user dissatisfaction = churn
- **Performance Risk**: Slow responses = poor UX = bounce rate increase
- **Legal Risk**: Incorrect grant advice = legal liability

---

## 📅 Day-by-Day Preparation Plan

### Day 1 (Oct 10): Anthropic API Research & Setup
**Duration**: 4 hours
**Focus**: API fundamentals, authentication, basic testing

#### Task 1.1: Create Anthropic Account & Get API Key (1 hour)
**Steps**:
```bash
# 1. Sign up at https://console.anthropic.com/
# 2. Navigate to API Keys section
# 3. Generate new API key (starts with sk-ant-...)
# 4. Note your tier (Tier 1: 50 RPM, Tier 2: 1,000 RPM)
# 5. Check pricing: https://www.anthropic.com/pricing
```

**Create credentials file**:
```bash
# DO NOT commit to git - add to .gitignore
echo "ANTHROPIC_API_KEY=sk-ant-your-key-here" > .env.anthropic.local
```

**Success Criteria**:
- [ ] API key obtained and tested
- [ ] Understand tier limits (RPM, TPM)
- [ ] Pricing structure documented

#### Task 1.2: Install SDK & Create Test Script (1 hour)
**Installation**:
```bash
npm install @anthropic-ai/sdk
npm install --save-dev @types/node
```

**Create test script** (`scripts/test-anthropic-basic.ts`):
```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function testBasicRequest() {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: "안녕하세요. 간단한 테스트입니다. TRL 7 수준의 기술을 한국어로 설명해주세요."
      }
    ]
  });

  console.log('Response:', message.content);
  console.log('Tokens:', message.usage);
}

testBasicRequest();
```

**Run test**:
```bash
export ANTHROPIC_API_KEY="your-key-here"
npx tsx scripts/test-anthropic-basic.ts
```

**Success Criteria**:
- [ ] SDK installed successfully
- [ ] Basic Korean request works
- [ ] Token usage tracked

#### Task 1.3: Study Anthropic Documentation (2 hours)
**Key Documentation to Read**:
1. **API Reference**: https://docs.anthropic.com/en/api/messages
   - Message API parameters
   - System prompts vs user messages
   - Temperature, top_p, top_k settings
   - Streaming responses

2. **Prompt Engineering Guide**: https://docs.anthropic.com/en/docs/prompt-engineering
   - Best practices for clear instructions
   - Few-shot examples
   - Chain of thought prompting
   - XML tags for structured output

3. **Safety & Content Policy**: https://www.anthropic.com/legal/aup
   - Prohibited use cases
   - Rate limiting policies
   - Content moderation

**Create research notes** (`docs/research/anthropic-api-notes.md`):
```markdown
# Anthropic API Research Notes

## Key Findings
- Temperature: 0.3 (factual), 0.7 (balanced), 0.9 (creative)
- System prompt: Set role, tone, expertise
- XML tags: Help structure complex outputs
- Streaming: Better UX for long responses

## Rate Limits (Tier 1)
- Requests: 50 per minute
- Tokens: 40,000 per minute (input + output)
- Daily budget: Track via usage API

## Cost Optimization
- Cache system prompts (coming feature)
- Shorter prompts = lower cost
- Stream responses for perceived speed
```

**Success Criteria**:
- [ ] Documentation read and notes taken
- [ ] Understand temperature settings
- [ ] Rate limit strategy planned

---

### Day 2 (Oct 11): Korean R&D Terminology Research
**Duration**: 4 hours
**Focus**: Master domain-specific vocabulary, grant terminology

#### Task 2.1: Create Korean R&D Glossary (2 hours)
**Create glossary file** (`docs/research/korean-rd-glossary.md`):

```markdown
# Korean R&D Terminology Glossary

## TRL (Technology Readiness Level) - 기술성숙도
| Level | Korean | English | Description |
|-------|--------|---------|-------------|
| TRL 1 | 기초 연구 | Basic Research | 기술 개념 및 특성 정의 |
| TRL 2 | 응용 연구 | Applied Research | 기술 개념 및 응용 방법 정립 |
| TRL 3 | 개념 검증 | Proof of Concept | 핵심 기능 및 특성 검증 |
| TRL 4 | 연구실 시제품 제작 | Lab Prototype | 연구실 환경 기술 검증 |
| TRL 5 | 시험 환경 시제품 제작 | Alpha Prototype | 유사 환경 기술 검증 |
| TRL 6 | 시제품 성능 평가 | Beta Prototype | 실제 환경 기술 검증 |
| TRL 7 | 사업화 시제품 제작 | Pre-commercial | 사업화 초기 단계 |
| TRL 8 | 시험 인증 및 표준화 | Commercial Ready | 시험 인증 및 표준화 완료 |
| TRL 9 | 사업화 | Commercialization | 본격적 사업화 단계 |

## Certifications - 인증
- **ISMS-P** (정보보호 및 개인정보보호 관리체계): Information Security Management System
- **KC** (한국 안전 인증): Korea Certification for product safety
- **ISO 9001** (품질경영시스템): Quality Management System
- **GS** (굿소프트웨어): Good Software certification
- **NEP** (신제품): New Excellent Product certification

## Grant Types - 과제 유형
- **R&D 과제**: Research & Development project
- **사업화 지원**: Commercialization support
- **기술 개발**: Technology development
- **인력 양성**: Human resource development
- **국제 협력**: International collaboration
- **혁신 제품**: Innovative product
- **우수 제품**: Excellent product

## Organization Types - 기관 유형
- **중소기업**: SME (Small/Medium Enterprise)
- **중견기업**: Mid-sized company
- **대기업**: Large corporation
- **연구소**: Research institute
- **대학**: University
- **공공기관**: Public institution

## Common Phrases - 자주 사용하는 표현
- "귀사": Your company (formal)
- "선정률": Selection rate
- "평균 심사 기간": Average review period
- "연구개발비**: R&D budget
- "사업자등록번호**: Business registration number
- "컨소시엄**: Consortium
- "주관기관**: Lead organization
- "참여기관**: Participating organization
```

**Sources to research**:
- NTIS website (https://www.ntis.go.kr)
- IITP, KEIT, TIPA agency websites
- Korean R&D terminology dictionaries
- PRD_v8.0.md sector gates section

**Success Criteria**:
- [ ] Glossary with 50+ terms created
- [ ] TRL levels fully understood
- [ ] Certification acronyms documented

#### Task 2.2: Analyze Existing Match Explanations (1 hour)
**Review current implementation**:
```bash
# Search for Korean explanation generation in codebase
grep -r "explanation" lib/matching/
grep -r "설명" lib/matching/
```

**Document current patterns**:
```markdown
# Current Explanation Patterns

## Match Score Components
1. Industry match (30pts): "귀사의 산업 분야({industry})와 일치합니다"
2. TRL compatibility (20pts): "TRL {trl} 수준의 기술에 적합합니다"
3. Organization type (20pts): "중소기업이 신청 가능한 과제입니다"
4. Budget fit (15pts): "귀사의 매출 규모에 적합한 예산입니다"
5. R&D experience (15pts): "유사한 R&D 경험이 있어 선정 가능성이 높습니다"

## Improvement Opportunities
- More specific industry matching explanations
- TRL transition guidance (e.g., "TRL 6 → 7 전환 전략")
- Certification requirement clarity
- Win rate statistics integration
```

**Success Criteria**:
- [ ] Current explanation logic understood
- [ ] Improvement opportunities identified
- [ ] AI enhancement areas defined

#### Task 2.3: Collect Real Grant Examples (1 hour)
**Scrape 5-10 recent grant announcements**:
```bash
# Use existing scraper to get recent programs
npx tsx scripts/trigger-ntis-scraping.ts

# Or manually collect from:
# - IITP: https://www.iitp.kr/kr/1/business/사업공고/page.it
# - KEIT: https://www.keit.re.kr/
```

**Create example file** (`docs/research/grant-examples.md`):
```markdown
# Real Grant Examples for AI Training

## Example 1: IITP AI 기반 스마트팩토리 구축 지원사업
**Title**: AI 기반 스마트팩토리 구축 지원사업
**Agency**: IITP
**Budget**: 2-3억원
**TRL**: 7-9
**Industry**: 제조, ICT
**Requirements**:
- ISMS-P 인증 (필수)
- 3년 이상 사업 운영
- 중소기업 또는 중견기업

**Why this matters**: Shows exact Korean terminology used in announcements

## Example 2: KEIT 산업기술 R&D 과제
...
```

**Success Criteria**:
- [ ] 5-10 real grant examples collected
- [ ] Terminology patterns identified
- [ ] Common requirements documented

---

### Day 3 (Oct 12): Prompt Template Prototyping
**Duration**: 5 hours
**Focus**: Create and test Korean prompt templates

#### Task 3.1: Match Explanation Prompt Template (2 hours)
**Create prompt file** (`lib/ai/prompts/match-explanation.ts`):

```typescript
export interface MatchExplanationInput {
  programTitle: string;
  programAgency: string;
  programBudget: string;
  programTRL: string;
  programIndustry: string;
  companyName: string;
  companyIndustry: string;
  companyTRL: number;
  companyRevenue: number;
  certifications: string[];
  matchScore: number;
  scoreBreakdown: {
    industry: number;
    trl: number;
    certifications: number;
    budget: number;
    experience: number;
  };
}

export function buildMatchExplanationPrompt(input: MatchExplanationInput): string {
  return `당신은 한국 정부 R&D 과제 매칭 전문가입니다. 기업에게 과제 매칭 결과를 전문적이고 친절하게 설명해주는 역할입니다.

<context>
기업 정보:
- 회사명: ${input.companyName}
- 산업 분야: ${input.companyIndustry}
- 기술 수준: TRL ${input.companyTRL}
- 매출 규모: ${input.companyRevenue.toLocaleString('ko-KR')}원
- 보유 인증: ${input.certifications.join(', ') || '없음'}

과제 정보:
- 과제명: ${input.programTitle}
- 주관 기관: ${input.programAgency}
- 지원 예산: ${input.programBudget}
- 요구 TRL: ${input.programTRL}
- 대상 산업: ${input.programIndustry}

매칭 점수: ${input.matchScore}/100
- 산업 매칭: ${input.scoreBreakdown.industry}/30점
- TRL 적합성: ${input.scoreBreakdown.trl}/20점
- 인증 요건: ${input.scoreBreakdown.certifications}/20점
- 예산 적합성: ${input.scoreBreakdown.budget}/15점
- 경험 적합성: ${input.scoreBreakdown.experience}/15점
</context>

<instructions>
1. 왜 이 과제가 귀사에게 적합한지 3-4가지 핵심 이유를 설명하세요.
2. 각 이유는 구체적인 근거를 포함해야 합니다 (점수, 인증, TRL 등).
3. 존댓말을 사용하되 전문적이고 간결한 톤을 유지하세요.
4. 신청 시 주의할 점이 있다면 언급하세요.
5. 200자 이내로 작성하세요.

응답 형식:
<reasons>
<reason>첫 번째 이유</reason>
<reason>두 번째 이유</reason>
<reason>세 번째 이유</reason>
</reasons>
<caution>주의사항 (선택사항)</caution>
</instructions>

위 지침에 따라 매칭 설명을 작성해주세요.`;
}
```

**Test prompt locally**:
```bash
npx tsx scripts/test-match-explanation-prompt.ts
```

**Success Criteria**:
- [ ] Prompt template created
- [ ] XML structure for parsing
- [ ] Test with 3-5 scenarios
- [ ] Output quality validated

#### Task 3.2: Q&A Chat Prompt Template (2 hours)
**Create Q&A prompt** (`lib/ai/prompts/qa-chat.ts`):

```typescript
export interface QAChatInput {
  userQuestion: string;
  conversationHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  companyContext?: {
    industry: string;
    trl: number;
    certifications: string[];
  };
  relevantPrograms?: Array<{
    title: string;
    agency: string;
    deadline: string;
  }>;
}

export function buildQAChatPrompt(input: QAChatInput): {
  system: string;
  messages: Array<{ role: string; content: string }>;
} {
  const systemPrompt = `당신은 Connect 플랫폼의 AI 어시스턴트로, 한국 정부 R&D 과제에 대한 질문에 답변하는 전문가입니다.

<role>
- 기업의 R&D 과제 관련 질문에 정확하고 유용한 답변 제공
- 전문적이면서도 친근한 존댓말 사용
- 불확실한 정보는 명확히 밝히고 공식 출처 안내
</role>

<guidelines>
1. **정확성 우선**: 틀린 정보보다는 "확실하지 않습니다" 표현
2. **간결성**: 2-3 문단 이내로 답변 (긴 내용은 요약 → 상세 순서)
3. **실행 가능**: 가능하면 다음 단계 제안 (예: "IITP 웹사이트에서 확인")
4. **개인화**: 회사 정보가 있으면 맞춤 답변 제공
5. **법적 책임 회피**: "일반적인 안내이며 최종 확인은 공고 확인 필요"
</guidelines>

${input.companyContext ? `
<company_context>
- 산업: ${input.companyContext.industry}
- TRL: ${input.companyContext.trl}
- 인증: ${input.companyContext.certifications.join(', ')}
</company_context>
` : ''}

${input.relevantPrograms && input.relevantPrograms.length > 0 ? `
<relevant_programs>
${input.relevantPrograms.map(p => `- ${p.title} (${p.agency}, 마감: ${p.deadline})`).join('\n')}
</relevant_programs>
` : ''}

질문에 답변해주세요.`;

  const messages = [
    ...input.conversationHistory.map(msg => ({
      role: msg.role,
      content: msg.content
    })),
    {
      role: 'user',
      content: input.userQuestion
    }
  ];

  return { system: systemPrompt, messages };
}
```

**Success Criteria**:
- [ ] Q&A prompt with context
- [ ] Conversation history handling
- [ ] Company personalization
- [ ] Test with common questions

#### Task 3.3: Prompt Temperature Testing (1 hour)
**Create temperature test script** (`scripts/test-temperature-variations.ts`):

```typescript
// Test same prompt with different temperatures
const temperatures = [0.3, 0.5, 0.7, 0.9];

for (const temp of temperatures) {
  console.log(`\n=== Temperature: ${temp} ===`);
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 500,
    temperature: temp,
    messages: [{ role: "user", content: koreanPrompt }]
  });
  console.log(response.content[0].text);
}
```

**Document findings**:
```markdown
# Temperature Test Results

## Temperature 0.3 (Factual)
- Most consistent responses
- Shorter, more direct
- Best for match explanations

## Temperature 0.7 (Balanced)
- Good mix of accuracy and variety
- Best for Q&A chat
- Natural conversational tone

## Temperature 0.9 (Creative)
- Too much variation
- Sometimes off-topic
- NOT recommended for grants
```

**Success Criteria**:
- [ ] Temperature settings tested
- [ ] Optimal values identified
- [ ] Documentation created

---

### Day 4 (Oct 13): Cost Optimization Planning
**Duration**: 4 hours
**Focus**: Token management, caching, budget tracking

#### Task 4.1: Token Usage Analysis (1.5 hours)
**Create token counter utility** (`lib/ai/utils/token-counter.ts`):

```typescript
import Anthropic from '@anthropic-ai/sdk';

export class TokenCounter {
  private anthropic: Anthropic;

  constructor(apiKey: string) {
    this.anthropic = new Anthropic({ apiKey });
  }

  /**
   * Estimate tokens for text (rough estimate)
   * Claude uses ~4 characters per token for English
   * Korean is typically ~2-3 characters per token
   */
  estimateTokens(text: string): number {
    const isKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(text);
    const charPerToken = isKorean ? 2.5 : 4;
    return Math.ceil(text.length / charPerToken);
  }

  /**
   * Calculate cost in KRW
   * Sonnet 4.5: $3 per 1M input tokens, $15 per 1M output tokens
   * Exchange rate: ~1,300 KRW per USD
   */
  calculateCost(inputTokens: number, outputTokens: number): number {
    const inputCostUSD = (inputTokens / 1_000_000) * 3;
    const outputCostUSD = (outputTokens / 1_000_000) * 15;
    const totalUSD = inputCostUSD + outputCostUSD;
    return totalUSD * 1300; // KRW
  }
}
```

**Analyze typical requests**:
```typescript
// Test token usage for different scenarios
const scenarios = [
  { name: 'Match Explanation', inputLength: 500, expectedOutput: 200 },
  { name: 'Q&A Short', inputLength: 200, expectedOutput: 300 },
  { name: 'Q&A Long', inputLength: 800, expectedOutput: 500 },
];

for (const scenario of scenarios) {
  const inputTokens = counter.estimateTokens(scenario.inputLength);
  const outputTokens = counter.estimateTokens(scenario.expectedOutput);
  const cost = counter.calculateCost(inputTokens, outputTokens);
  console.log(`${scenario.name}: ₩${cost.toFixed(2)}`);
}
```

**Success Criteria**:
- [ ] Token estimation utility created
- [ ] Cost per request calculated
- [ ] Daily budget projection made

#### Task 4.2: Response Caching Strategy (1.5 hours)
**Design caching architecture**:

```typescript
// lib/ai/cache/response-cache.ts
import { createClient } from 'redis';

export interface CacheConfig {
  ttl: number; // Time to live in seconds
  keyPrefix: string;
}

export class AIResponseCache {
  private redis: ReturnType<typeof createClient>;
  private config: CacheConfig;

  async cacheResponse(
    promptHash: string,
    response: string,
    tokenUsage: { input: number; output: number }
  ): Promise<void> {
    const cacheKey = `${this.config.keyPrefix}:${promptHash}`;
    const cacheData = {
      response,
      tokenUsage,
      timestamp: Date.now()
    };

    await this.redis.set(
      cacheKey,
      JSON.stringify(cacheData),
      { EX: this.config.ttl }
    );
  }

  async getCachedResponse(promptHash: string): Promise<{
    response: string;
    tokenUsage: { input: number; output: number };
  } | null> {
    const cacheKey = `${this.config.keyPrefix}:${promptHash}`;
    const cached = await this.redis.get(cacheKey);

    if (!cached) return null;

    return JSON.parse(cached);
  }
}

// Cache strategy by feature:
// - Match explanations: 24 hours (programs don't change daily)
// - Q&A generic: 7 days (general info stable)
// - Q&A personalized: No cache (user-specific)
```

**Create cache configuration**:
```markdown
# AI Response Caching Strategy

## Cache Rules
1. **Match Explanations**: 24 hours
   - Key: hash(companyId + programId + matchScore)
   - Invalidate: When program updated or company profile changed
   - Estimated savings: 60-70% of match requests

2. **Q&A Generic Questions**: 7 days
   - Key: hash(question text, ignore company context)
   - Examples: "TRL이란?", "ISMS-P 인증 비용은?"
   - Estimated savings: 40-50% of Q&A requests

3. **Q&A Personalized**: No cache
   - Company-specific advice changes
   - Conversation history unique

## Expected Cost Reduction
- Without cache: ₩50,000/day for 500 users
- With cache: ₩25,000/day (50% reduction)
- ROI: ₩750,000/month savings
```

**Success Criteria**:
- [ ] Caching architecture designed
- [ ] Redis integration planned
- [ ] Cost savings estimated

#### Task 4.3: Budget Tracking System (1 hour)
**Create budget tracker** (`lib/ai/tracking/budget-tracker.ts`):

```typescript
export interface DailyUsage {
  date: string;
  requestCount: number;
  inputTokens: number;
  outputTokens: number;
  costKRW: number;
}

export class BudgetTracker {
  private redis: ReturnType<typeof createClient>;

  async logRequest(usage: {
    inputTokens: number;
    outputTokens: number;
    costKRW: number;
  }): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const key = `ai:budget:${today}`;

    // Increment counters
    await this.redis.hIncrBy(key, 'requestCount', 1);
    await this.redis.hIncrBy(key, 'inputTokens', usage.inputTokens);
    await this.redis.hIncrBy(key, 'outputTokens', usage.outputTokens);
    await this.redis.hIncrBy(key, 'costKRW', Math.round(usage.costKRW));

    // Set expiry: 90 days
    await this.redis.expire(key, 90 * 24 * 60 * 60);
  }

  async getTodayUsage(): Promise<DailyUsage> {
    const today = new Date().toISOString().split('T')[0];
    const key = `ai:budget:${today}`;
    const data = await this.redis.hGetAll(key);

    return {
      date: today,
      requestCount: parseInt(data.requestCount || '0'),
      inputTokens: parseInt(data.inputTokens || '0'),
      outputTokens: parseInt(data.outputTokens || '0'),
      costKRW: parseInt(data.costKRW || '0')
    };
  }

  async checkBudgetAlert(dailyBudgetKRW: number = 50000): Promise<{
    withinBudget: boolean;
    usagePercent: number;
    remainingKRW: number;
  }> {
    const usage = await this.getTodayUsage();
    const usagePercent = (usage.costKRW / dailyBudgetKRW) * 100;

    return {
      withinBudget: usage.costKRW < dailyBudgetKRW,
      usagePercent,
      remainingKRW: dailyBudgetKRW - usage.costKRW
    };
  }
}
```

**Success Criteria**:
- [ ] Budget tracker implemented
- [ ] Daily alerts configured
- [ ] Cost reporting dashboard planned

---

### Day 5 (Oct 14): Conversation Memory Architecture
**Duration**: 4 hours
**Focus**: Design chat context management

#### Task 5.1: Conversation History Storage (2 hours)
**Design conversation schema**:

```typescript
// lib/ai/conversation/types.ts
export interface ConversationMessage {
  id: string;
  conversationId: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  tokenCount: number;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string; // Auto-generated from first message
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  totalTokens: number;
}
```

**Create Prisma schema addition**:
```prisma
// Add to prisma/schema.prisma

model Conversation {
  id           String   @id @default(cuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  title        String   // Auto-generated: first 50 chars of first message
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  messageCount Int      @default(0)
  totalTokens  Int      @default(0)

  messages     ConversationMessage[]

  @@index([userId, createdAt(sort: Desc)])
  @@index([updatedAt])
}

model ConversationMessage {
  id             String       @id @default(cuid())
  conversationId String
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  userId         String
  role           String       // 'user' | 'assistant'
  content        String       @db.Text
  timestamp      DateTime     @default(now())
  tokenCount     Int          @default(0)

  @@index([conversationId, timestamp])
  @@index([userId, timestamp(sort: Desc)])
}
```

**Success Criteria**:
- [ ] Conversation schema designed
- [ ] Prisma models added
- [ ] Migration ready

#### Task 5.2: Context Window Management (1.5 hours)
**Create context manager** (`lib/ai/conversation/context-manager.ts`):

```typescript
export interface ContextManagerConfig {
  maxMessages: number; // Default: 10 (last 5 exchanges)
  maxTokens: number;   // Default: 8000 (leave room for response)
  summarizationThreshold: number; // When to summarize old messages
}

export class ConversationContextManager {
  private config: ContextManagerConfig;

  constructor(config: Partial<ContextManagerConfig> = {}) {
    this.config = {
      maxMessages: config.maxMessages || 10,
      maxTokens: config.maxTokens || 8000,
      summarizationThreshold: config.summarizationThreshold || 20
    };
  }

  /**
   * Get conversation context for AI request
   * Returns recent messages + optional summary of older messages
   */
  async getContext(conversationId: string): Promise<{
    messages: ConversationMessage[];
    summary?: string;
    totalTokens: number;
  }> {
    // Get all messages
    const allMessages = await prisma.conversationMessage.findMany({
      where: { conversationId },
      orderBy: { timestamp: 'asc' }
    });

    // If under threshold, return all
    if (allMessages.length <= this.config.maxMessages) {
      return {
        messages: allMessages,
        totalTokens: allMessages.reduce((sum, m) => sum + m.tokenCount, 0)
      };
    }

    // Otherwise: summarize old + recent full
    const cutoff = allMessages.length - this.config.maxMessages;
    const oldMessages = allMessages.slice(0, cutoff);
    const recentMessages = allMessages.slice(cutoff);

    const summary = await this.summarizeMessages(oldMessages);

    return {
      messages: recentMessages,
      summary,
      totalTokens: recentMessages.reduce((sum, m) => sum + m.tokenCount, 0)
    };
  }

  /**
   * Summarize old messages to save context window
   */
  private async summarizeMessages(messages: ConversationMessage[]): Promise<string> {
    // Generate summary of old conversation
    // "이전 대화 요약: 사용자는 TRL 7 수준의 AI 기술 개발 과제에 대해 질문..."

    const userQuestions = messages
      .filter(m => m.role === 'user')
      .map(m => m.content)
      .join(' ');

    return `이전 대화 요약: ${userQuestions.substring(0, 200)}...`;
  }
}
```

**Success Criteria**:
- [ ] Context manager implemented
- [ ] Token limit respected
- [ ] Old message summarization

#### Task 5.3: Conversation Features Planning (0.5 hours)
**Document conversation features**:

```markdown
# Q&A Chat Features

## Core Features (Week 3-4)
1. **Multi-turn conversations**: Track 5-10 recent exchanges
2. **Context awareness**: Remember company profile, previous questions
3. **Token management**: Stay within 8K context window
4. **Conversation history**: Store in database for user review

## Future Enhancements (Post-launch)
1. **Conversation titles**: Auto-generate from first message
2. **Conversation search**: Full-text search across history
3. **Export conversation**: Download as PDF/TXT
4. **Suggested questions**: Recommend follow-up questions
5. **Conversation branching**: Fork conversation at any point

## User Flow
1. User clicks "AI 상담" button
2. Start new conversation or continue existing
3. Type question → AI responds with context
4. Continue asking → AI remembers previous context
5. View conversation history in sidebar
6. Delete/rename conversations
```

**Success Criteria**:
- [ ] Feature requirements documented
- [ ] User flow defined
- [ ] Future enhancements planned

---

### Day 6 (Oct 15): Integration Planning & Final Review
**Duration**: 4 hours
**Focus**: Week 3-4 execution plan, final preparations

#### Task 6.1: Create Week 3-4 Execution Checklist (1.5 hours)
**Create detailed checklist** (`docs/plans/week3-4-execution-checklist.md`):

```markdown
# Week 3-4 Execution Checklist
## AI Integration: Claude Sonnet 4.5

### Day 15 (Oct 23): Anthropic SDK Setup ✅ (Prep Complete)
- [x] Create Anthropic account
- [x] Get API key
- [x] Install SDK
- [x] Test basic requests
- [x] Read documentation
- [ ] Update .env with production key
- [ ] Create AI client wrapper (`lib/ai/client.ts`)
- [ ] Implement rate limiting
- [ ] Add error handling

### Day 16-17 (Oct 24-25): Match Explanations
- [ ] Implement match explanation generator
- [ ] Integrate with existing match API
- [ ] Add response caching (Redis)
- [ ] Create UI component for explanations
- [ ] Test with 10+ real programs
- [ ] Measure response time (<2s target)
- [ ] A/B test prompt variations

### Day 18-19 (Oct 26-27): Q&A Chat System
- [ ] Create conversation API endpoints
- [ ] Implement conversation context manager
- [ ] Build chat UI component
- [ ] Add streaming responses
- [ ] Integrate company profile context
- [ ] Test multi-turn conversations
- [ ] Add conversation history sidebar

### Day 20-21 (Oct 28-29): Korean Prompt Optimization
- [ ] Test 5+ prompt variations
- [ ] Collect user feedback (10+ beta users)
- [ ] Optimize temperature settings
- [ ] Refine 존댓말 tone
- [ ] Add domain-specific examples
- [ ] Measure helpfulness (>70% target)

### Day 22 (Oct 30): Cost Tracking & Monitoring
- [ ] Deploy budget tracker
- [ ] Set up daily alerts
- [ ] Create cost dashboard
- [ ] Implement usage analytics
- [ ] Document cost optimization wins
- [ ] Week 3-4 completion report
```

**Success Criteria**:
- [ ] Execution checklist created
- [ ] All tasks have clear deliverables
- [ ] Dependencies identified

#### Task 6.2: Risk Assessment & Mitigation (1 hour)
**Create risk matrix**:

```markdown
# Week 3-4 Risk Assessment

## High-Risk Items
1. **API Rate Limits** (Tier 1: 50 RPM)
   - Risk: User surge exceeds rate limit → errors
   - Mitigation: Implement request queue, upgrade to Tier 2 if needed
   - Fallback: Show cached responses, graceful degradation

2. **Cost Overruns** (₩50K/day budget)
   - Risk: Inefficient prompts = high token usage
   - Mitigation: Response caching (50% reduction), prompt optimization
   - Fallback: Temporary feature disable if budget 90% spent

3. **Korean Quality** (<70% satisfaction)
   - Risk: Unnatural Korean = user dissatisfaction
   - Mitigation: Extensive prompt testing, native speaker review
   - Fallback: Provide feedback form, iterate prompts

4. **Response Latency** (>2s target)
   - Risk: Slow AI responses = poor UX
   - Mitigation: Streaming responses, response caching
   - Fallback: Loading states, progress indicators

## Medium-Risk Items
1. **Conversation Context Bugs**: Thorough testing needed
2. **Prompt Injection**: Input sanitization required
3. **Database Schema Changes**: Careful migration planning

## Contingency Plan
- If Week 3-4 takes >2 weeks: Use buffer from Week 1-2 (6 days)
- If quality below target: Extend testing by 2-3 days
- If costs too high: Reduce feature scope temporarily
```

**Success Criteria**:
- [ ] Risk assessment complete
- [ ] Mitigation strategies planned
- [ ] Contingency plan documented

#### Task 6.3: Preparation Review & Summary (1.5 hours)
**Create preparation summary** (`docs/plans/week3-4-preparation-summary.md`):

```markdown
# Week 3-4 Preparation Summary
## October 10-15, 2025

### Preparation Objectives: ALL ACHIEVED ✅

#### Day 1: Anthropic API Research ✅
- [x] API key obtained
- [x] SDK installed and tested
- [x] Documentation reviewed (50+ pages)
- [x] Rate limits understood (Tier 1: 50 RPM)

#### Day 2: Korean R&D Terminology ✅
- [x] Glossary created (50+ terms)
- [x] TRL levels documented
- [x] Grant examples collected (10 programs)
- [x] Current explanation patterns analyzed

#### Day 3: Prompt Templates ✅
- [x] Match explanation prompt created
- [x] Q&A chat prompt created
- [x] Temperature testing completed (0.7 optimal)
- [x] XML output structure defined

#### Day 4: Cost Optimization ✅
- [x] Token counter utility created
- [x] Caching strategy designed (50% cost reduction)
- [x] Budget tracker implemented
- [x] Daily alerts configured

#### Day 5: Conversation Architecture ✅
- [x] Conversation schema designed
- [x] Context manager implemented
- [x] Token limit management (8K context window)
- [x] Message summarization planned

#### Day 6: Integration Planning ✅
- [x] Execution checklist created
- [x] Risk assessment complete
- [x] Mitigation strategies documented
- [x] Ready to start Week 3-4!

### Key Deliverables
1. **10 TypeScript files ready**: Prompts, utilities, managers
2. **5 documentation files**: Glossary, examples, strategies
3. **3 test scripts**: Basic API, temperature, token counting
4. **1 Prisma schema addition**: Conversation models

### Cost Projections
- **Without optimization**: ₩50,000/day for 500 users
- **With caching (50%)**: ₩25,000/day
- **Monthly savings**: ₩750,000

### Quality Targets
- **Response time**: <2 seconds (with caching)
- **User satisfaction**: >70% helpful responses
- **Korean quality**: Professional 존댓말, natural tone
- **Accuracy**: Clear disclaimers, no false information

### Ready to Execute
- ✅ All preparation tasks complete
- ✅ Week 3-4 execution plan ready
- ✅ Risk mitigation strategies in place
- ✅ Cost optimization achieved before launch

**Status**: READY TO START WEEK 3-4 (Oct 16-17, 2025)
**Next Task**: Day 15 - Anthropic SDK Setup & AI Client Wrapper
```

**Success Criteria**:
- [ ] Preparation summary complete
- [ ] All deliverables listed
- [ ] Ready state confirmed

---

## 📊 Preparation Success Criteria

### Must-Have Before Week 3-4 Start
- [x] Anthropic API key obtained and tested
- [x] Korean R&D glossary (50+ terms)
- [x] Match explanation prompt template
- [x] Q&A chat prompt template
- [x] Cost optimization strategy (caching)
- [x] Conversation architecture designed
- [x] Risk assessment complete

### Nice-to-Have (Optional)
- [ ] Native Korean speaker prompt review
- [ ] Competitor AI analysis (Naver, Kakao)
- [ ] Advanced prompt engineering techniques
- [ ] Multi-language support planning (English)

---

## 📁 Files to Create During Preparation

### Documentation (7 files)
1. `docs/research/anthropic-api-notes.md` - API research notes
2. `docs/research/korean-rd-glossary.md` - Terminology glossary
3. `docs/research/grant-examples.md` - Real grant examples
4. `docs/research/temperature-test-results.md` - Temperature findings
5. `docs/plans/week3-4-execution-checklist.md` - Execution plan
6. `docs/plans/week3-4-risk-assessment.md` - Risk matrix
7. `docs/plans/week3-4-preparation-summary.md` - Summary report

### Code Files (10+ files)
1. `lib/ai/client.ts` - Main AI client wrapper
2. `lib/ai/prompts/match-explanation.ts` - Match prompt template
3. `lib/ai/prompts/qa-chat.ts` - Q&A prompt template
4. `lib/ai/utils/token-counter.ts` - Token estimation
5. `lib/ai/cache/response-cache.ts` - Redis caching
6. `lib/ai/tracking/budget-tracker.ts` - Cost tracking
7. `lib/ai/conversation/types.ts` - Conversation types
8. `lib/ai/conversation/context-manager.ts` - Context handling
9. `scripts/test-anthropic-basic.ts` - Basic API test
10. `scripts/test-match-explanation-prompt.ts` - Prompt test
11. `scripts/test-temperature-variations.ts` - Temperature test

### Database Changes (1 file)
1. `prisma/schema.prisma` - Add Conversation and ConversationMessage models

---

## 🎯 Next Steps After Preparation

**October 16-17, 2025**: Start Week 3-4 Day 15
1. Update `.env` with production Anthropic API key
2. Create `lib/ai/client.ts` with rate limiting and error handling
3. Implement match explanation integration
4. Begin Q&A chat system development

**Success Metric**: Week 3-4 complete by November 1, 2025 (5 days ahead of schedule)

---

**Preparation Plan Created**: October 9, 2025
**Execution Start**: October 16, 2025
**Estimated Completion**: November 1, 2025
**Buffer Used**: 6 days from Week 1-2 acceleration

This preparation ensures high-quality AI integration with optimized costs and excellent Korean language quality! 🚀
