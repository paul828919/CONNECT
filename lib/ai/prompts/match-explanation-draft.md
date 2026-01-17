# Match Explanation Prompt Engineering - Draft Solution
## Problem Analysis

### Current Prompt (Active Context Assumed)
```
역할:
- 한국 정부 R&D 과제와 기업의 매칭 결과를 설명
- 왜 적합한지 구체적인 근거 제시
- 신청 시 주의사항 안내  ← Assumes ACTIVE application
```

**Result for Historical Match**: AI generates apologetic content like "죄송하지만 이미 마감되어 지원이 불가능합니다"

---

## Solution: Conditional System Prompts

### Prompt A: For ACTIVE Programs (Deadline NOT Passed)
```typescript
const systemPromptActive = `당신은 Connect 플랫폼의 AI 매칭 전문가입니다.

역할:
- 현재 신청 가능한 R&D 과제에 대한 지원 가능성 평가
- 매칭 점수의 구체적 근거 제시
- 신청 전 필수 확인사항 안내 (TRL, 예산, 자격요건)
- 마감일 기준 준비 일정 제안

응답 목표:
- "지금 신청해야 할까?" → 명확한 판단 근거 제공
- 긍정적이되 과장 금지
- 실행 가능한 다음 단계 제시`;
```

### Prompt B: For EXPIRED Programs (Historical Matches)
```typescript
const systemPromptExpired = `당신은 Connect 플랫폼의 AI 매칭 전문가입니다.

역할:
- 2026년도 유사 과제 대비를 위한 학습 자료 제공
- 이 매칭이 왜 적합했는지 분석 (회사 강점 파악)
- 내년 공고 대비 전략적 준비사항 제안
- 현재 보완 가능한 요건 식별

응답 목표:
- "내년 신청을 위해 무엇을 준비할까?" → 구체적 액션 플랜
- 학습 관점의 긍정적 프레이밍
- 시간 여유를 활용한 전략적 준비 강조
- "마감되었습니다"와 같은 부정적 표현 금지`;
```

---

## Example Output Comparison

### Current Output (EXPIRED program, using ACTIVE prompt)
```
❌ Summary: "이노웨이브님, 죄송하지만 해당 과제는 이미 마감되어 지원이 불가능합니다."

✅ Reason 1: "마감일: 2025년 9월 23일을 이미 신청 기간이 종료되었습니다."
→ Redundant, user already sees 🔴 마감됨 badge

✅ Reason 2: "매칭도: 79점으로 양호한 수준이나, 현재는 지원이 불가능한 상태입니다."
→ Negative framing, emphasizes "BUT you can't apply"

⚠️ Cautions: "점수 상세가 모두 0점으로 표시된 것은 시스템 오류로 보입니다."
→ CATASTROPHIC - Destroys user trust
```

### Target Output (EXPIRED program, using EXPIRED prompt)
```
✅ Summary: "귀사는 이 과제와 79점으로 매칭되었으며, 내년 유사 과제 신청 시 경쟁력이 높습니다."

✅ Reason 1: "산업 분야 적합도: 귀사의 ICT 경험이 과제 목표(AI 공동연구)와 정확히 일치합니다."
→ Focus on WHY it matched (company strengths)

✅ Reason 2: "기술 수준: TRL 5는 과제 요구사항(TRL 4-6) 중간값으로 이상적입니다."
→ Educational insight about company's competitive positioning

✅ Reason 3: "매칭 점수 79점은 2026년 유사 과제 신청 시 선정 가능성이 높음을 의미합니다."
→ Forward-looking, positive framing

⚠️ Cautions: "2026년 공고 시 예산 규모와 세부 자격요건이 변경될 수 있으니 재확인이 필요합니다."
→ Constructive caution about year-over-year changes

ℹ️ Next Steps: "지금부터 준비할 사항: ① NTIS 2026년 1-2월 공고 모니터링 ② 사업계획서 초안 작성(3-4주 소요) ③ TRL 인증자료 최신화 ④ Connect 알림 설정으로 공고 즉시 수신"
→ Specific, actionable, timeline-based
```

---

## Implementation Requirements

### 1. Add New Input Field
```typescript
export interface MatchExplanationInput {
  // ... existing fields
  programStatus: 'ACTIVE' | 'EXPIRED' | 'ARCHIVED'; // ← NEW
  programDeadline: Date | null; // ← Change from string to Date for calculations
}
```

### 2. Modify Prompt Builder
```typescript
export function buildMatchExplanationPrompt(input: MatchExplanationInput): string {
  // Select system prompt based on status
  const systemPrompt = input.programStatus === 'EXPIRED'
    ? systemPromptExpired
    : systemPromptActive;

  // Add status context to user prompt
  const statusContext = input.programStatus === 'EXPIRED'
    ? `\n<context>이 과제는 이미 마감되었습니다. 2026년도 유사 과제 준비를 위한 학습 자료로 활용하세요.</context>\n`
    : `\n<context>이 과제는 현재 신청 가능합니다. 지원 가능성을 평가하고 실행 계획을 제시하세요.</context>\n`;

  // Calculate deadline urgency for ACTIVE programs
  const deadlineInfo = input.programStatus === 'ACTIVE' && input.programDeadline
    ? calculateDeadlineUrgency(input.programDeadline)
    : null;

  return `${systemPrompt}\n\n${statusContext}\n\n${userPrompt}`;
}
```

### 3. Modify Cache Key to Include Status
```typescript
function getCacheKey(organizationId: string, programId: string, status: string): string {
  return `${CACHE_KEY_PREFIX}${organizationId}:${programId}:${status}`;
}
```

**Why**: If a program transitions from ACTIVE → EXPIRED, the cached ACTIVE explanation should not be reused.

---

## Data Availability Analysis

### ✅ Currently Available in API
- `program.status` (ACTIVE | EXPIRED | ARCHIVED)
- `program.deadline` (Date object)
- `program.title`, `program.agencyId`, `program.category`
- `match.score`, `match.scoreBreakdown`
- `organization.technologyReadinessLevel`, `organization.industrySector`

### ❌ Currently Missing (But Needed for Historical Context)
1. **Recurrence data**: Does this program repeat annually?
2. **Historical selection rate**: How competitive was last year?
3. **Typical application prep time**: "Start preparing 3 months in advance"
4. **Next announcement prediction**: "Expected January-February 2026"

### 🔄 Can Be Inferred (Without DB Changes)
1. **Recurrence**: Check if `program.title` matches patterns like "2025년 AI 일반형 공동연구" → likely annual
2. **Prep time**: Generic advice "Start 1-2 months before deadline"
3. **Next announcement**: Calculate from `program.deadline` → "Typically announced in Q1"

---

## Recommendation: 3-Phase Approach

### Phase 1: IMMEDIATE FIX (This Task - 2-3 hours)
**Scope**: Fix the screenshot content issues without DB schema changes

**Changes**:
1. Add `programStatus` field to `MatchExplanationInput` interface
2. Modify API route to pass `program.status` to prompt builder
3. Create conditional system prompts (Active vs. Expired)
4. Update cache key to include status
5. Test locally with expired program from screenshot

**Output**: Historical match explanations will no longer say "sorry, it's closed" and will provide forward-looking preparation guidance.

### Phase 2: ENHANCED CONTEXT (Future - 1-2 weeks)
**Scope**: Add historical data for better recommendations

**Changes**:
1. Add `isAnnualRecurring` boolean to `funding_programs` table
2. Add `typicalPrepTimeWeeks` to program metadata
3. Track program recurrence patterns via scraper

**Output**: Can provide specific advice like "This program has been announced annually for 5 years. Start preparing in November for January 2026 announcement."

### Phase 3: PREDICTIVE INTELLIGENCE (Future - 1+ month)
**Scope**: Machine learning on historical outcomes

**Changes**:
1. Track application outcomes (which companies applied? who won?)
2. Calculate category-specific selection rates
3. Provide benchmark data: "Companies with similar TRL had 35% selection rate last year"

**Output**: Evidence-based competitive assessment for preparation strategy.

---

## For User Review

**Questions**:
1. Should I proceed with Phase 1 (immediate fix with conditional prompts)?
2. For Phase 1, should I handle ARCHIVED status separately from EXPIRED? (Or treat both as historical?)
3. For the "Next Steps" section in historical matches, what level of specificity is acceptable without historical data? Generic ("Monitor NTIS in Q1 2026") vs. Specific ("Set reminder for January 15, typical announcement date")?
4. Should I add `daysUntilDeadline` calculation for ACTIVE programs to generate urgency-aware advice?

**Cache Invalidation Decision**:
- **Option A**: Invalidate cache when program status changes ACTIVE → EXPIRED (proactive, requires cron job)
- **Option B**: Include status in cache key (reactive, old ACTIVE cache expires naturally after 24h)
- **Recommendation**: Option B (simpler, avoids infrastructure changes)

---

## User Feedback Requested

Please review this prompt engineering solution and confirm:
1. Is this the level of "deep insight into production product—specifically, how to provide input values to achieve satisfactory output results" you expected?
2. Does Phase 1 scope address the screenshot content issues completely?
3. Should I proceed with creating the detailed work plan for Phase 1 implementation?
