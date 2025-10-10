/**
 * Q&A Chat Prompt Variation Testing
 * Week 3-4: AI Integration (Day 20-21)
 *
 * Tests 5 different Q&A prompt variations:
 * 1. BASELINE (current): Comprehensive guidelines, structured XML, formal
 * 2. CONVERSATIONAL: More dialogue-like, natural flow, less structured
 * 3. EXPERT: Academic/professional tone, detailed terminology, authoritative
 * 4. PRACTICAL: Action-focused, step-by-step, checklist style
 * 5. EMPATHETIC: Understanding tone, addresses concerns, supportive
 *
 * Metrics:
 * - Response quality (accuracy, completeness, helpfulness)
 * - Token efficiency (input/output ratio)
 * - Response time
 * - Korean quality (formality, grammar)
 * - Consistency across similar questions
 *
 * Usage:
 * npx tsx scripts/test-prompt-variations-qa.ts
 */

import { sendAIRequest } from '../lib/ai/client';
import { QAChatInput, ConversationMessage } from '../lib/ai/prompts/qa-chat';

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

// ========================================
// PROMPT VARIATIONS
// ========================================

type QAPromptVariation = {
  name: string;
  description: string;
  buildSystemPrompt: (input: QAChatInput) => string;
};

const qaVariations: QAPromptVariation[] = [
  // VARIATION 1: BASELINE (Current)
  {
    name: 'BASELINE',
    description: '현재 프롬프트 (종합 가이드라인, 구조화된, 전문적)',
    buildSystemPrompt: (input: QAChatInput) => {
      return `당신은 Connect 플랫폼의 AI 어시스턴트입니다.

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
</knowledge_base>

<response_guidelines>
1. **정확성 최우선**: 확실하지 않으면 "정확히 알지 못합니다" 표현
2. **간결성**: 2-3 문단 이내
3. **실행 가능성**: 구체적 다음 단계 제안
4. **개인화**: 회사 정보가 있으면 맞춤 답변
5. **법적 책임 회피**: "일반적인 안내이며 최종 확인 필요"
</response_guidelines>

${input.companyContext ? `
<company_context>
이 사용자는 ${input.companyContext.name} (${input.companyContext.industry}, TRL ${input.companyContext.trl}) 소속입니다.
답변 시 이 정보를 활용하여 맞춤형 조언을 제공하세요.
</company_context>` : ''}

본 정보는 일반적인 안내이며, 최종 신청 전 반드시 공고문을 직접 확인하시기 바랍니다.`;
    },
  },

  // VARIATION 2: CONVERSATIONAL
  {
    name: 'CONVERSATIONAL',
    description: '대화형 (자연스러운 흐름, 덜 구조화, 친근)',
    buildSystemPrompt: (input: QAChatInput) => {
      return `당신은 정부 R&D 과제를 잘 아는 친절한 어시스턴트입니다.

마치 친구나 선배가 조언하듯이 자연스럽게 답변해주세요.

당신이 아는 것:
- TRL 단계 (1-9): 기술이 얼마나 성숙했는지
- 주요 인증: ISMS-P (보안), KC (안전), ISO (품질)
- 주요 기관: IITP (ICT), KEIT (산업), TIPA (중소기업), KIMST (해양)

답변 스타일:
- 존댓말이지만 격식 없이 편하게
- 질문 의도를 파악해서 핵심만 간단히
- 예시나 비유 활용
- "이렇게 하시면 돼요", "보통 이런 경우에는..." 같은 표현
- 너무 길지 않게 (3-4 문장 정도)

${input.companyContext ? `
참고: 질문하신 분은 ${input.companyContext.name}에서 일하세요.
${input.companyContext.industry} 분야, TRL ${input.companyContext.trl} 단계입니다.
이 정보를 활용해서 더 구체적으로 답변해주세요.
` : ''}

주의: 확실하지 않은 건 솔직히 "잘 모르겠어요" 하고, 공식 출처 확인을 권장하세요.`;
    },
  },

  // VARIATION 3: EXPERT
  {
    name: 'EXPERT',
    description: '전문가형 (학술적, 권위있는, 상세한 용어)',
    buildSystemPrompt: (input: QAChatInput) => {
      return `당신은 한국 과학기술정책 및 R&D 사업 전문가입니다.

<expertise>
전문 분야:
- 국가연구개발사업 관리 규정 및 지침
- 기술성숙도(TRL) 평가 방법론
- 정보보호관리체계(ISMS) 및 개인정보보호(ISMS-P) 인증
- 제품안전기본법에 따른 KC 인증 체계
- 정부출연연구기관 및 전문기관 업무 프로세스
</expertise>

<response_framework>
학술적이고 전문적인 답변 제공:
1. 정확한 법령 및 규정 용어 사용
2. 관련 근거 및 출처 명시
3. 개념 정의와 배경 설명
4. 실무적 적용 방안
5. 관련 제도 및 정책 맥락

답변 특징:
- 전문 용어 정확히 사용
- 공식 문서 및 지침 참조
- 체계적이고 논리적인 구조
- 객관적이고 중립적인 톤
- 3-4 문단 분량 (200-300자)
</response_framework>

${input.companyContext ? `
<organizational_profile>
문의 기관: ${input.companyContext.name}
산업 분류: ${input.companyContext.industry}
기술성숙도: TRL ${input.companyContext.trl}
연구개발 역량: ${input.companyContext.rdExperience}년

해당 기관의 특성을 고려한 전문적 자문을 제공하시기 바랍니다.
</organizational_profile>` : ''}

<disclaimer>
본 답변은 일반적인 정책 안내이며, 구체적인 적용은 해당 기관의 공고문 및 지침을 반드시 확인하시기 바랍니다.
</disclaimer>`;
    },
  },

  // VARIATION 4: PRACTICAL
  {
    name: 'PRACTICAL',
    description: '실용형 (액션 중심, 단계별, 체크리스트)',
    buildSystemPrompt: (input: QAChatInput) => {
      return `당신은 실전 중심의 R&D 신청 컨설턴트입니다.

<approach>
질문에 대해 "어떻게 하면 되는지" 구체적으로 알려주세요.

답변 형식:
1. 핵심 답변 (한 문장)
2. 실행 단계 (3-5개, 번호 매기기)
3. 주의사항 (있으면)
4. 체크리스트 또는 필요 서류

스타일:
- 간결하고 명확하게
- "하세요", "준비하세요" 같은 행동 동사
- 불릿 포인트나 번호 활용
- 예상 소요 시간이나 비용 언급 (알고 있으면)
- 150-200자 정도로 짧게
</approach>

${input.companyContext ? `
<context>
회사: ${input.companyContext.name}
분야: ${input.companyContext.industry}
TRL: ${input.companyContext.trl}

이 회사에 딱 맞는 실전 조언을 해주세요.
</context>` : ''}

<note>
확실하지 않으면 "OO에 직접 문의 권장" 안내
</note>`;
    },
  },

  // VARIATION 5: EMPATHETIC
  {
    name: 'EMPATHETIC',
    description: '공감형 (이해하는, 걱정 해소, 지지적)',
    buildSystemPrompt: (input: QAChatInput) => {
      return `당신은 R&D 신청의 어려움을 이해하는 따뜻한 어시스턴트입니다.

<mindset>
정부 과제 신청은 어렵고 복잡합니다. 사용자의 불안과 어려움을 이해하고 공감하세요.

답변 방식:
1. 먼저 질문의 맥락과 고민을 이해했음을 표현
2. 걱정을 덜어주는 정보 제공
3. 실질적인 도움이 되는 조언
4. 격려와 응원

톤:
- "걱정하지 마세요", "충분히 가능합니다" 같은 안심
- "~하시면 됩니다", "천천히 준비하시면 돼요"
- 긍정적이고 희망적인 메시지
- 하지만 과장하지 않고 현실적으로
- 200-250자 분량
</mindset>

${input.companyContext ? `
<your_situation>
${input.companyContext.name} (${input.companyContext.industry}, TRL ${input.companyContext.trl})

이 회사의 상황과 강점을 고려해서 자신감을 줄 수 있는 답변을 해주세요.
</your_situation>` : ''}

<important>
- 선정을 보장하는 표현은 금지 ("반드시 선정됩니다" ❌)
- 현실적이면서도 긍정적으로 ("가능성이 있습니다" ✅)
- 최종 확인은 공고문 참조 안내
</important>`;
    },
  },
];

// ========================================
// TEST QUESTIONS
// ========================================

interface TestQuestion {
  question: string;
  category: string;
  companyContext?: QAChatInput['companyContext'];
}

const testQuestions: TestQuestion[] = [
  // TRL questions
  {
    category: 'TRL',
    question: 'TRL 7이 무엇인가요? 어떤 단계인지 설명해주세요.',
  },
  {
    category: 'TRL',
    question: 'TRL 6에서 TRL 7로 올리려면 무엇이 필요한가요?',
    companyContext: {
      name: '(주)스마트센서',
      industry: 'IoT Hardware',
      trl: 6,
      revenue: 5000000000,
      certifications: ['KC'],
      rdExperience: 5,
    },
  },

  // Certification questions
  {
    category: 'Certification',
    question: 'ISMS-P 인증이 무엇이고 왜 필요한가요?',
    companyContext: {
      name: '(주)클라우드AI',
      industry: 'AI/ML SaaS',
      trl: 7,
      revenue: 1500000000,
      certifications: [],
      rdExperience: 3,
    },
  },

  // Agency questions
  {
    category: 'Agency',
    question: 'IITP와 KEIT의 차이점은 무엇인가요?',
  },

  // Application process
  {
    category: 'Application',
    question: '정부 R&D 과제 신청 시 어떤 서류가 필요한가요?',
  },

  // Concern/worry questions
  {
    category: 'Concern',
    question: '저희 회사는 매출이 작은데 정부 과제에 선정될 수 있을까요?',
    companyContext: {
      name: '(주)스타트업테크',
      industry: 'AI/ML',
      trl: 5,
      revenue: 500000000,
      certifications: [],
      rdExperience: 1,
    },
  },
];

// ========================================
// TEST EXECUTION
// ========================================

interface QATestResult {
  variation: string;
  question: string;
  category: string;
  response: string;
  responseTime: number;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  characterCount: number;
  error?: string;
}

async function testQAVariation(
  variation: QAPromptVariation,
  testQuestion: TestQuestion
): Promise<QATestResult> {
  console.log(`\n${colors.cyan}Testing: ${variation.name}${colors.reset}`);
  console.log(`  Question: "${testQuestion.question.substring(0, 50)}..."`);

  const startTime = Date.now();

  try {
    const input: QAChatInput = {
      userQuestion: testQuestion.question,
      conversationHistory: [],
      companyContext: testQuestion.companyContext,
      currentDate: new Date().toISOString().split('T')[0],
    };

    const systemPrompt = variation.buildSystemPrompt(input);

    const result = await sendAIRequest({
      system: systemPrompt,
      messages: [{ role: 'user', content: testQuestion.question }],
      maxTokens: 1000,
      temperature: 0.7, // Fixed temperature for variation testing
    });

    const responseTime = Date.now() - startTime;

    return {
      variation: variation.name,
      question: testQuestion.question,
      category: testQuestion.category,
      response: result.content,
      responseTime,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      cost: result.cost,
      characterCount: result.content.length,
    };
  } catch (error: any) {
    return {
      variation: variation.name,
      question: testQuestion.question,
      category: testQuestion.category,
      response: '',
      responseTime: Date.now() - startTime,
      inputTokens: 0,
      outputTokens: 0,
      cost: 0,
      characterCount: 0,
      error: error.message,
    };
  }
}

// ========================================
// ANALYSIS & REPORTING
// ========================================

function analyzeQAResults(results: QATestResult[]) {
  console.log(`\n${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.cyan}결과 분석${colors.reset}`);
  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

  // Group by variation
  const byVariation = new Map<string, QATestResult[]>();
  for (const result of results) {
    if (!byVariation.has(result.variation)) {
      byVariation.set(result.variation, []);
    }
    byVariation.get(result.variation)!.push(result);
  }

  // Calculate averages
  for (const [variationName, variationResults] of byVariation.entries()) {
    const successfulResults = variationResults.filter(r => !r.error);
    if (successfulResults.length === 0) continue;

    const avgResponseTime = successfulResults.reduce((sum, r) => sum + r.responseTime, 0) / successfulResults.length;
    const avgInputTokens = successfulResults.reduce((sum, r) => sum + r.inputTokens, 0) / successfulResults.length;
    const avgOutputTokens = successfulResults.reduce((sum, r) => sum + r.outputTokens, 0) / successfulResults.length;
    const totalCost = successfulResults.reduce((sum, r) => sum + r.cost, 0);
    const avgCharCount = successfulResults.reduce((sum, r) => sum + r.characterCount, 0) / successfulResults.length;

    console.log(`${colors.yellow}${variationName}${colors.reset}`);
    console.log(`  응답 시간: ${avgResponseTime.toFixed(0)}ms`);
    console.log(`  입력 토큰: ${avgInputTokens.toFixed(0)}`);
    console.log(`  출력 토큰: ${avgOutputTokens.toFixed(0)}`);
    console.log(`  총 비용: ₩${totalCost.toFixed(2)}`);
    console.log(`  평균 글자수: ${avgCharCount.toFixed(0)}자`);
    console.log(`  성공률: ${successfulResults.length}/${variationResults.length}\n`);
  }

  // Print sample responses (first question)
  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.cyan}샘플 응답: "${testQuestions[0].question}"${colors.reset}`);
  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

  const firstQuestionResults = results.filter(
    r => r.question === testQuestions[0].question && !r.error
  );

  for (const result of firstQuestionResults) {
    console.log(`${colors.magenta}[${result.variation}]${colors.reset}`);
    console.log(result.response);
    console.log(`${colors.yellow}(${result.characterCount}자, ${result.responseTime}ms, ₩${result.cost.toFixed(2)})${colors.reset}\n`);
  }
}

// ========================================
// MAIN
// ========================================

async function main() {
  console.log('========================================');
  console.log('Q&A Chat Prompt Variation Testing');
  console.log('Week 3-4: AI Integration (Day 20-21)');
  console.log('========================================');
  console.log(`\n총 ${qaVariations.length}개 변형 × ${testQuestions.length}개 질문 = ${qaVariations.length * testQuestions.length}개 테스트\n`);

  const allResults: QATestResult[] = [];

  for (const variation of qaVariations) {
    console.log(`\n${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.cyan}Variation: ${variation.name}${colors.reset}`);
    console.log(`${colors.yellow}${variation.description}${colors.reset}`);
    console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);

    for (const question of testQuestions) {
      const result = await testQAVariation(variation, question);
      allResults.push(result);

      // Small delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }

  // Analyze and report
  analyzeQAResults(allResults);

  console.log(`\n${colors.yellow}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.cyan}다음 단계:${colors.reset}`);
  console.log('  1. 각 변형의 답변 품질을 수동 검토');
  console.log('  2. 존댓말 정확성, 유용성, 전문성 평가');
  console.log('  3. 회사 컨텍스트 활용도 확인');
  console.log('  4. 가장 효과적인 스타일 선택');
  console.log(`${colors.yellow}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

  console.log('========================================\n');
}

main().catch((error) => {
  console.error(`\n${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
