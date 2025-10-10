# Anthropic Claude API Research Notes
**Date**: October 9, 2025
**Purpose**: Comprehensive API understanding for Week 3-4 AI Integration

---

## 📚 API Overview

### Model: Claude Sonnet 4.5
- **Model ID**: `claude-sonnet-4-5-20250929`
- **Context Window**: 200K tokens input, 8K tokens output
- **Strengths**: Balanced speed + quality, excellent for production
- **Korean Support**: Native multilingual support, strong Korean capabilities

### API Endpoint
- **Base URL**: `https://api.anthropic.com/v1/messages`
- **Authentication**: `x-api-key` header with API key
- **Content-Type**: `application/json`

---

## 🔑 Authentication & Setup

### API Key Format
```
sk-ant-api03-[base64_characters]
```

### Environment Variable
```bash
export ANTHROPIC_API_KEY="sk-ant-api03-..."
```

### SDK Initialization
```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});
```

---

## 📊 Rate Limits & Pricing

### Tier 1 (Default)
- **Requests**: 50 per minute
- **Tokens**: 40,000 per minute (input + output combined)
- **Daily**: No hard daily limit, but billed monthly

### Tier 2 (After $40 deposit)
- **Requests**: 1,000 per minute
- **Tokens**: 80,000 per minute
- **Recommended for**: Production with >100 daily active users

### Pricing (Claude Sonnet 4.5)
- **Input**: $3.00 per 1M tokens
- **Output**: $15.00 per 1M tokens
- **Cache Writes**: $3.75 per 1M tokens (prompt caching)
- **Cache Reads**: $0.30 per 1M tokens (90% savings)

### Cost Calculator (KRW, 1 USD = ₩1,300)
| Usage Type | Per 1K Tokens (KRW) | Per Request (Estimate) |
|------------|---------------------|------------------------|
| Input (500 tokens) | ₩1.95 | ₩0.98 |
| Output (200 tokens) | ₩19.50 | ₩3.90 |
| **Total per request** | - | **₩4.88** |

**Daily Budget Projection** (500 requests/day):
- Without cache: ₩2,440 (~₩73,200/month)
- With 50% cache hit: ₩1,220 (~₩36,600/month)
- Target: <₩50,000/day → ~10,246 requests/day capacity

---

## 🛠️ API Parameters

### Essential Parameters

#### `model` (required)
```typescript
model: "claude-sonnet-4-5-20250929"
```

#### `messages` (required)
```typescript
messages: [
  {
    role: "user",
    content: "Your question here"
  }
]
```

#### `max_tokens` (required)
```typescript
max_tokens: 1024  // Output limit, adjust per use case
```

### Optional Parameters

#### `system` (highly recommended)
```typescript
system: "You are an expert in Korean R&D grants..."
```
- Sets AI's role, expertise, and tone
- Separate from `messages` array
- Korean works perfectly here

#### `temperature` (default: 1.0)
```typescript
temperature: 0.7
```
- **0.0-0.3**: Deterministic, factual (match explanations)
- **0.5-0.7**: Balanced, conversational (Q&A chat) ✅ Recommended
- **0.8-1.0**: Creative, varied (not recommended for grants)

#### `top_p` (default: 1.0)
```typescript
top_p: 0.9
```
- Alternative to temperature
- Use either temperature OR top_p, not both
- 0.9 = slightly more focused than temperature 0.7

#### `top_k` (default: null)
```typescript
top_k: 40
```
- Limits vocab sampling
- Useful for preventing hallucinations
- Not typically needed with good prompts

#### `stop_sequences` (optional)
```typescript
stop_sequences: ["</response>", "\n\nHuman:"]
```
- Stops generation at specific strings
- Useful for structured outputs

#### `stream` (default: false)
```typescript
stream: true
```
- Enables streaming responses
- Better UX for long responses
- Requires different handling (SSE)

---

## 📝 Message API Structure

### Basic Request
```typescript
const message = await anthropic.messages.create({
  model: "claude-sonnet-4-5-20250929",
  max_tokens: 1024,
  system: "당신은 한국 정부 R&D 과제 전문가입니다.",
  messages: [
    {
      role: "user",
      content: "TRL 7 수준의 기술이란 무엇인가요?"
    }
  ]
});
```

### Response Structure
```typescript
{
  id: "msg_01XYZ...",
  type: "message",
  role: "assistant",
  content: [
    {
      type: "text",
      text: "TRL 7은 사업화 시제품 제작 단계로..."
    }
  ],
  model: "claude-sonnet-4-5-20250929",
  stop_reason: "end_turn",  // or "max_tokens", "stop_sequence"
  stop_sequence: null,
  usage: {
    input_tokens: 45,
    output_tokens: 128
  }
}
```

### Error Handling
```typescript
try {
  const message = await anthropic.messages.create({ ... });
} catch (error) {
  if (error.status === 429) {
    // Rate limit exceeded
  } else if (error.status === 401) {
    // Invalid API key
  } else if (error.status === 400) {
    // Bad request (check parameters)
  }
}
```

---

## 🎯 Best Practices for Korean R&D Use Case

### 1. System Prompt Design
```typescript
system: `당신은 Connect 플랫폼의 AI 어시스턴트입니다.

역할:
- 한국 정부 R&D 과제 전문 상담
- 기업의 과제 매칭 결과 설명
- 기술성숙도(TRL), 인증 요건, 예산 등에 대한 질문 답변

톤:
- 전문적이면서 친근한 존댓말 사용
- 불확실한 정보는 명확히 밝힘
- 법적 조언 회피 (일반 안내만 제공)

응답 길이:
- 간결하게 2-3 문단 이내
- 핵심부터 먼저, 상세 내용은 필요시
`
```

### 2. User Message Formatting
```typescript
// ✅ Good: Provide context in XML tags
messages: [
  {
    role: "user",
    content: `<company_context>
- 산업: ICT
- TRL: 7
- 인증: ISMS-P 보유
</company_context>

<question>
IITP AI 융합 과제에 적합한가요?
</question>`
  }
]

// ❌ Bad: No structure
messages: [
  { role: "user", content: "IITP AI 융합 과제에 적합한가요?" }
]
```

### 3. Output Parsing with XML
```typescript
// Prompt: "응답을 XML 형식으로 작성하세요: <answer>내용</answer>"

const response = message.content[0].text;
const match = response.match(/<answer>(.*?)<\/answer>/s);
if (match) {
  const answer = match[1].trim();
  // Use parsed answer
}
```

### 4. Token Optimization
```typescript
// Korean characters: ~2.5 characters per token
function estimateKoreanTokens(text: string): number {
  return Math.ceil(text.length / 2.5);
}

// Before sending request
const estimatedTokens = estimateKoreanTokens(systemPrompt + userMessage);
if (estimatedTokens > 8000) {
  // Truncate or summarize
}
```

---

## 🔄 Streaming Responses

### Enable Streaming
```typescript
const stream = await anthropic.messages.create({
  model: "claude-sonnet-4-5-20250929",
  max_tokens: 1024,
  stream: true,
  messages: [{ role: "user", content: "..." }]
});

for await (const event of stream) {
  if (event.type === 'content_block_delta') {
    process.stdout.write(event.delta.text);
  }
}
```

### Benefits
- **UX**: User sees response immediately (perceived <500ms)
- **Engagement**: Feels more conversational
- **Cancellation**: Can stop expensive requests early

### When to Use
- ✅ Q&A chat (long responses)
- ❌ Match explanations (short, cacheable)

---

## 📦 Prompt Caching (Coming Soon)

### How It Works
```typescript
system: [
  {
    type: "text",
    text: "당신은 Connect AI 어시스턴트입니다...",
    cache_control: { type: "ephemeral" }  // Cache this
  }
]
```

### Cost Savings
- **First request**: $3.75/1M tokens (cache write)
- **Subsequent requests**: $0.30/1M tokens (cache read)
- **Savings**: 90% on repeated system prompts

### Use Cases
- System prompt (same for all requests)
- Company profile context (same within session)
- Few-shot examples (static)

---

## 🚨 Safety & Content Policy

### Prohibited Uses
- Legal advice (only general guidance)
- Medical diagnoses
- Financial investment advice
- Impersonation of government officials

### Our Compliance
✅ **Allowed**: "일반적으로 TRL 7 이상은 IITP 과제에 적합합니다" (general info)
❌ **Not allowed**: "귀사는 반드시 이 과제에 선정될 것입니다" (guarantee)

### Disclaimers to Include
```markdown
**안내**: 본 정보는 일반적인 안내이며,
최종 신청 전 반드시 공고문을 직접 확인하시기 바랍니다.
```

---

## 🧪 Testing Checklist

### Basic Functionality
- [ ] API key authentication works
- [ ] Korean text request/response successful
- [ ] Token usage tracked correctly
- [ ] Error handling (429, 401, 400)

### Korean Quality
- [ ] 존댓말 (formal speech) natural
- [ ] Domain terminology accurate (TRL, ISMS-P, etc.)
- [ ] No English fallback in Korean responses
- [ ] Punctuation correct (마침표, 쉼표)

### Performance
- [ ] Response time <2 seconds (non-streaming)
- [ ] Streaming starts <500ms
- [ ] Rate limits respected (50 RPM)
- [ ] Token estimates accurate (±10%)

---

## 📚 Key Documentation Links

1. **API Reference**: https://docs.anthropic.com/en/api/messages
2. **Prompt Engineering**: https://docs.anthropic.com/en/docs/prompt-engineering
3. **Rate Limits**: https://docs.anthropic.com/en/api/rate-limits
4. **Pricing**: https://www.anthropic.com/pricing
5. **Content Policy**: https://www.anthropic.com/legal/aup
6. **SDK (TypeScript)**: https://github.com/anthropics/anthropic-sdk-typescript

---

## 🎯 Next Steps (Day 2-6)

### Day 2: Korean Terminology
- Create comprehensive glossary (TRL, certifications, grant types)
- Collect real grant examples for training data

### Day 3: Prompt Templates
- Match explanation prompt with XML structure
- Q&A chat prompt with conversation context

### Day 4: Cost Optimization
- Implement response caching (Redis)
- Token usage tracking and budget alerts

### Day 5: Conversation Memory
- Design conversation history storage
- Context window management (last 10 messages)

### Day 6: Final Review
- Integration checklist
- Risk assessment
- Ready to start Week 3-4 execution

---

**Research Completed**: October 9, 2025
**Key Findings**:
- Claude Sonnet 4.5 excellent for Korean R&D domain
- Temperature 0.7 optimal for conversational quality
- Prompt caching can reduce costs by 90%
- Streaming improves UX for Q&A chat
- Budget: ₩36,600/month achievable with caching

**Status**: ✅ Day 1 API Research Complete
**Next**: Day 2 - Korean R&D Terminology Glossary
