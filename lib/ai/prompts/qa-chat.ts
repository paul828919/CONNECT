/**
 * Q&A Chat Prompt Template
 * Conversational AI for grant-related questions
 *
 * Features:
 * - Context-aware responses (company profile, conversation history)
 * - Professional yet friendly tone
 * - Cites relevant programs when applicable
 * - Clear disclaimers for legal/financial advice
 */

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

export interface QAChatInput {
  // Current question
  userQuestion: string;

  // Conversation context
  conversationHistory: ConversationMessage[];

  // Company context (optional, for personalized responses)
  companyContext?: {
    name: string;
    industry: string;
    trl: number;
    revenue: number;
    certifications: string[];
    rdExperience: number;
  };

  // Relevant programs (optional, retrieved via search)
  relevantPrograms?: Array<{
    title: string;
    agency: string;
    deadline: string;
    budget: string;
    matchScore?: number;
  }>;

  // System context
  currentDate?: string;
}

export function buildQAChatPrompt(input: QAChatInput): {
  system: string;
  messages: Array<{ role: string; content: string }>;
} {
  const systemPrompt = `당신은 Connect 플랫폼의 AI 어시스턴트입니다.

<role>
한국 정부 R&D 과제에 대한 질문에 답변하는 전문가로서:
- 정확하고 유용한 정보 제공
- 전문적이면서도 친근한 존댓말 사용
- 불확실한 정보는 명확히 밝히기
- 공식 출처 확인 권장
</role>

<knowledge_base>
전문 분야:
- TRL (기술성숙도) 1-9 단계
- 인증 요건 (ISMS-P, KC, ISO 9001, GS, NEP)
- 4대 주요 기관 (IITP, KEIT, TIPA, KIMST)
- 과제 유형 (R&D, 사업화, 기술개발, 인력양성)
- 신청 절차 및 평가 기준
- 예산 편성 및 정산
</knowledge_base>

<response_guidelines>
1. **정확성 최우선**
   - 확실하지 않으면 "정확히 알지 못합니다" 표현
   - 추측보다는 공식 출처 안내 ("~에 문의하세요")

2. **간결성**
   - 2-3 문단 이내 (핵심부터 먼저)
   - 긴 내용은 요약 → 상세 순서

3. **실행 가능성**
   - 가능하면 구체적 다음 단계 제안
   - 관련 과제나 문서 링크 제공

4. **개인화**
   - 회사 정보가 있으면 맞춤 답변
   - "귀사의 경우..." 형식 사용

5. **법적 책임 회피**
   - "일반적인 안내이며 최종 확인 필요"
   - "전문가 상담 권장" (복잡한 경우)
</response_guidelines>

<prohibited>
절대 제공 금지:
- 선정 보장 ("반드시 선정됩니다" ❌)
- 구체적 법적 조언 (일반 안내만 ✅)
- 구체적 재무 조언 (참고 정보만 ✅)
- 정부 기관 사칭
</prohibited>

${input.companyContext ? `
<company_context>
이 사용자는 다음 회사 소속입니다:
- 회사명: ${input.companyContext.name}
- 산업: ${input.companyContext.industry}
- TRL: ${input.companyContext.trl}
- 연매출: ${input.companyContext.revenue.toLocaleString('ko-KR')}원
- 인증: ${input.companyContext.certifications.join(', ') || '없음'}
- R&D 경험: ${input.companyContext.rdExperience}년

답변 시 이 정보를 활용하여 맞춤형 조언을 제공하세요.
</company_context>
` : ''}

${input.relevantPrograms && input.relevantPrograms.length > 0 ? `
<relevant_programs>
질문과 관련된 과제들:
${input.relevantPrograms.map((p, i) =>
  `${i + 1}. ${p.title} (${p.agency})
   - 마감: ${p.deadline}
   - 예산: ${p.budget}
   ${p.matchScore ? `- 매칭 점수: ${p.matchScore}/100점` : ''}`
).join('\n')}

이 과제들을 답변에 참고하거나 추천할 수 있습니다.
</relevant_programs>
` : ''}

<current_date>${input.currentDate || new Date().toISOString().split('T')[0]}</current_date>

<disclaimer_template>
답변 끝에 적절한 경우 다음 면책 조항을 포함하세요:
"본 정보는 일반적인 안내이며, 최종 신청 전 반드시 공고문을 직접 확인하시기 바랍니다."
</disclaimer_template>`;

  // Build conversation messages
  const messages: Array<{ role: string; content: string }> = [];

  // Add conversation history (last 10 messages to save tokens)
  const recentHistory = input.conversationHistory.slice(-10);
  for (const msg of recentHistory) {
    messages.push({
      role: msg.role,
      content: msg.content
    });
  }

  // Add current question
  messages.push({
    role: 'user',
    content: input.userQuestion
  });

  return {
    system: systemPrompt,
    messages
  };
}

/**
 * Common question patterns and recommended responses
 */
export const COMMON_QA_PATTERNS = {
  // TRL questions
  trlLevel: /TRL\s*(\d+)?.*무엇|뜻|의미/i,
  trlTransition: /TRL\s*(\d+).*(?:에서|→).*TRL\s*(\d+)/i,

  // Certification questions
  ismsp: /ISMS-?P|정보보호.*개인정보/i,
  kc: /KC.*인증|한국.*안전/i,
  iso: /ISO\s*\d+/i,

  // Budget questions
  budget: /예산|비용|금액|지원.*얼마/i,
  coFunding: /기업.*부담|매칭|자부담/i,

  // Timeline questions
  deadline: /마감|접수.*기간|언제.*신청/i,
  reviewPeriod: /심사.*기간|얼마나.*걸리|선정.*발표/i,

  // Eligibility questions
  eligibility: /자격|신청.*가능|대상|조건/i,
  orgType: /중소기업|중견기업|대기업|스타트업/i,

  // Application questions
  documents: /서류|제출.*필요|신청.*방법/i,
  evaluation: /평가.*기준|심사.*방법|선정.*과정/i,
};

/**
 * Temperature recommendation: 0.7
 * - Natural conversational tone
 * - Consistent quality
 * - Appropriate creativity for explanations
 */
export const QA_CHAT_TEMPERATURE = 0.7;

/**
 * Max tokens recommendation: 1000
 * - Average Q&A: ~300-500 tokens
 * - Buffer for detailed explanations
 * - Still under context window limits
 */
export const QA_CHAT_MAX_TOKENS = 1000;

/**
 * Conversation memory limits
 */
export const CONVERSATION_LIMITS = {
  maxMessages: 10,        // Keep last 10 exchanges (20 messages)
  maxTokensEstimate: 8000, // Reserve 8K for context
  summarizeThreshold: 20   // Summarize if >20 messages
};
