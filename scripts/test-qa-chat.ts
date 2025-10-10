/**
 * Q&A Chat Test Script
 * Week 3-4: AI Integration (Day 18-19)
 *
 * Tests 15+ domain-specific Q&A scenarios:
 * - TRL questions (5 scenarios)
 * - Certification questions (4 scenarios)
 * - Agency questions (3 scenarios)
 * - Application process (3 scenarios)
 * - Multi-turn conversations (2 scenarios)
 *
 * Usage:
 * npx tsx scripts/test-qa-chat.ts
 */

import { sendQAChat, startNewConversation, CompanyContext } from '../lib/ai/services/qa-chat';
import { conversationManager } from '../lib/ai/conversation/context-manager';

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Test company contexts
const companyContexts: { [key: string]: CompanyContext } = {
  saas: {
    name: '(주)클라우드AI',
    industry: 'AI/ML SaaS',
    trl: 7,
    revenue: 1500000000, // 15억
    certifications: ['ISO 27001'],
    rdExperience: 3,
  },
  iot: {
    name: '(주)스마트센서',
    industry: 'IoT Hardware',
    trl: 6,
    revenue: 5000000000, // 50억
    certifications: ['ISO 9001'],
    rdExperience: 5,
  },
  biotech: {
    name: '(주)바이오메드',
    industry: 'Biotechnology',
    trl: 4,
    revenue: 800000000, // 8억
    certifications: [],
    rdExperience: 2,
  },
};

// Test scenarios
interface TestScenario {
  category: string;
  question: string;
  companyType?: keyof typeof companyContexts;
  expectedKeywords?: string[]; // Keywords to check in response
  followUp?: string; // Follow-up question for multi-turn test
}

const testScenarios: TestScenario[] = [
  // === TRL Questions (5 scenarios) ===
  {
    category: 'TRL',
    question: 'TRL 7이 무엇인가요? 어떤 단계인지 설명해주세요.',
    expectedKeywords: ['TRL 7', '시제품', '실제 환경', '실증'],
  },
  {
    category: 'TRL',
    question: 'TRL 6에서 TRL 7로 올리려면 무엇이 필요한가요?',
    companyType: 'iot',
    expectedKeywords: ['실제 환경', '테스트', '실증', '검증'],
  },
  {
    category: 'TRL',
    question: '우리 회사는 TRL 4 단계입니다. 어떤 과제에 지원할 수 있나요?',
    companyType: 'biotech',
    expectedKeywords: ['TRL', '기술개발', '연구개발'],
  },
  {
    category: 'TRL',
    question: 'TRL 9까지 도달하는 데 보통 얼마나 걸리나요?',
    expectedKeywords: ['TRL 9', '상용화', '기간', '시간'],
  },
  {
    category: 'TRL',
    question: 'TRL과 MRL의 차이점은 무엇인가요?',
    expectedKeywords: ['TRL', 'MRL', '기술', '제조'],
  },

  // === Certification Questions (4 scenarios) ===
  {
    category: 'Certification',
    question: 'ISMS-P 인증이 무엇이고 왜 필요한가요?',
    companyType: 'saas',
    expectedKeywords: ['ISMS-P', '정보보호', '개인정보', '인증'],
  },
  {
    category: 'Certification',
    question: 'KC 인증은 어떻게 받나요? 절차를 알려주세요.',
    companyType: 'iot',
    expectedKeywords: ['KC', '안전', '인증', '절차', '시험'],
  },
  {
    category: 'Certification',
    question: 'ISO 9001과 ISO 27001의 차이점은?',
    expectedKeywords: ['ISO 9001', 'ISO 27001', '품질', '정보보호'],
  },
  {
    category: 'Certification',
    question: 'GS 인증과 NEP 인증 중 어떤 것이 더 유리한가요?',
    expectedKeywords: ['GS', 'NEP', '조달', '우수제품'],
  },

  // === Agency Questions (3 scenarios) ===
  {
    category: 'Agency',
    question: 'IITP와 KEIT의 차이점은 무엇인가요?',
    expectedKeywords: ['IITP', 'KEIT', '정보통신', '산업기술'],
  },
  {
    category: 'Agency',
    question: 'TIPA 과제는 주로 어떤 기업을 대상으로 하나요?',
    expectedKeywords: ['TIPA', '중소기업', '소상공인'],
  },
  {
    category: 'Agency',
    question: 'KIMST는 어떤 기관이고 어떤 과제를 진행하나요?',
    expectedKeywords: ['KIMST', '해양', '수산'],
  },

  // === Application Process (3 scenarios) ===
  {
    category: 'Application',
    question: '정부 R&D 과제 신청 시 어떤 서류가 필요한가요?',
    expectedKeywords: ['서류', '신청서', '사업계획서', '제출'],
  },
  {
    category: 'Application',
    question: '과제 선정 평가는 어떤 기준으로 하나요?',
    expectedKeywords: ['평가', '기준', '기술성', '사업성'],
  },
  {
    category: 'Application',
    question: '신청부터 선정 발표까지 얼마나 걸리나요?',
    expectedKeywords: ['기간', '심사', '선정', '발표'],
  },

  // === Multi-turn Conversations (2 scenarios with follow-ups) ===
  {
    category: 'Multi-turn',
    question: 'AI 관련 정부 지원 사업을 찾고 있습니다.',
    companyType: 'saas',
    expectedKeywords: ['AI', '지원', '사업'],
    followUp: '그 중에서 매출 15억 정도 되는 회사에 적합한 것은?',
  },
  {
    category: 'Multi-turn',
    question: '컨소시엄으로 신청하려면 어떻게 해야 하나요?',
    expectedKeywords: ['컨소시엄', '공동', '협력'],
    followUp: '컨소시엄에서 우리 회사가 주관기관이 되려면?',
  },
];

/**
 * Run a single test scenario
 */
async function runTestScenario(scenario: TestScenario, testNumber: number): Promise<boolean> {
  console.log(`\n${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.cyan}Test ${testNumber}: ${scenario.category}${colors.reset}`);
  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`\n${colors.yellow}질문:${colors.reset} ${scenario.question}`);

  // Get company context if specified
  const companyContext = scenario.companyType ? companyContexts[scenario.companyType] : undefined;

  if (companyContext) {
    console.log(`\n${colors.yellow}회사 정보:${colors.reset} ${companyContext.name} (${companyContext.industry}, TRL ${companyContext.trl})`);
  }

  try {
    // Create new conversation
    const userId = `test_user_${Date.now()}`;
    const result = await startNewConversation(userId, scenario.question, companyContext);

    if (!result.response) {
      throw new Error('No response received');
    }

    const { response } = result;

    console.log(`\n${colors.yellow}답변:${colors.reset}`);
    console.log(response.answer);

    console.log(`\n${colors.yellow}메타데이터:${colors.reset}`);
    console.log(`  - 응답 시간: ${response.responseTime}ms`);
    console.log(`  - 입력 토큰: ${response.usage.inputTokens}`);
    console.log(`  - 출력 토큰: ${response.usage.outputTokens}`);
    console.log(`  - 비용: ₩${response.cost.toFixed(2)}`);
    console.log(`  - 컨텍스트: ${response.contextUsed.messageCount}개 메시지`);

    // Check for expected keywords
    if (scenario.expectedKeywords) {
      const foundKeywords = scenario.expectedKeywords.filter((keyword) =>
        response.answer.toLowerCase().includes(keyword.toLowerCase())
      );
      const keywordScore = (foundKeywords.length / scenario.expectedKeywords.length) * 100;

      console.log(`\n${colors.yellow}키워드 매칭:${colors.reset} ${foundKeywords.length}/${scenario.expectedKeywords.length} (${keywordScore.toFixed(0)}%)`);

      if (keywordScore < 50) {
        console.log(`${colors.red}⚠️  경고: 예상 키워드 매칭률이 낮습니다.${colors.reset}`);
      }
    }

    // Test follow-up question if provided (multi-turn)
    if (scenario.followUp) {
      console.log(`\n${colors.yellow}후속 질문:${colors.reset} ${scenario.followUp}`);

      const followUpResponse = await sendQAChat({
        conversationId: result.conversationId,
        userId,
        userQuestion: scenario.followUp,
        companyContext,
      });

      console.log(`\n${colors.yellow}후속 답변:${colors.reset}`);
      console.log(followUpResponse.answer);

      console.log(`\n${colors.yellow}후속 메타데이터:${colors.reset}`);
      console.log(`  - 응답 시간: ${followUpResponse.responseTime}ms`);
      console.log(`  - 컨텍스트: ${followUpResponse.contextUsed.messageCount}개 메시지`);
      console.log(`  - 요약 사용: ${followUpResponse.contextUsed.hadSummary ? '예' : '아니오'}`);
    }

    console.log(`\n${colors.green}✅ Test ${testNumber} 성공${colors.reset}`);
    return true;
  } catch (error: any) {
    console.log(`\n${colors.red}❌ Test ${testNumber} 실패${colors.reset}`);
    console.log(`${colors.red}에러: ${error.message}${colors.reset}`);
    return false;
  }
}

/**
 * Main test function
 */
async function main() {
  console.log('========================================');
  console.log('Q&A Chat Test Suite');
  console.log('Week 3-4: AI Integration (Day 18-19)');
  console.log('========================================');
  console.log(`\n총 ${testScenarios.length}개 테스트 시나리오 실행 중...\n`);

  const results: boolean[] = [];
  let totalCost = 0;
  let totalTime = 0;

  const startTime = Date.now();

  for (let i = 0; i < testScenarios.length; i++) {
    const scenario = testScenarios[i];
    const success = await runTestScenario(scenario, i + 1);
    results.push(success);

    // Small delay between tests to respect rate limits
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  const endTime = Date.now();
  totalTime = endTime - startTime;

  // Summary
  console.log(`\n${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.cyan}테스트 결과 요약${colors.reset}`);
  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

  const passed = results.filter((r) => r).length;
  const failed = results.filter((r) => !r).length;
  const passRate = (passed / results.length) * 100;

  console.log(`✅ 성공: ${passed}/${results.length}`);
  console.log(`❌ 실패: ${failed}/${results.length}`);
  console.log(`📊 성공률: ${passRate.toFixed(1)}%`);
  console.log(`⏱️  총 시간: ${(totalTime / 1000).toFixed(1)}초`);

  // Category breakdown
  console.log(`\n${colors.yellow}카테고리별 결과:${colors.reset}`);
  const categories = Array.from(new Set(testScenarios.map((s) => s.category)));
  categories.forEach((category) => {
    const categoryTests = testScenarios.filter((s) => s.category === category);
    const categoryResults = categoryTests.map((_, i) => results[testScenarios.indexOf(categoryTests[i])]);
    const categoryPassed = categoryResults.filter((r) => r).length;
    console.log(`  ${category}: ${categoryPassed}/${categoryTests.length}`);
  });

  // Recommendations
  console.log(`\n${colors.yellow}권장사항:${colors.reset}`);
  if (passRate === 100) {
    console.log(`${colors.green}  ✨ 모든 테스트 통과! Day 18-19 완료 가능합니다.${colors.reset}`);
  } else if (passRate >= 80) {
    console.log(`${colors.green}  ✅ 대부분의 테스트 통과! 실패한 시나리오를 검토하세요.${colors.reset}`);
  } else if (passRate >= 60) {
    console.log(`${colors.yellow}  ⚠️  일부 테스트 실패. 프롬프트와 로직을 점검하세요.${colors.reset}`);
  } else {
    console.log(`${colors.red}  ❌ 많은 테스트 실패. AI 클라이언트와 서비스 로직을 재검토하세요.${colors.reset}`);
  }

  console.log(`\n${colors.yellow}다음 단계:${colors.reset}`);
  console.log('  1. 실패한 테스트 로그를 분석하여 문제 파악');
  console.log('  2. 프롬프트 템플릿 개선 (lib/ai/prompts/qa-chat.ts)');
  console.log('  3. 답변 품질 평가 (자연스러운 한국어, 정확한 정보)');
  console.log('  4. Day 20-21: Korean Prompt Optimization 준비');

  console.log('\n========================================\n');

  // Exit with appropriate code
  process.exit(passed === results.length ? 0 : 1);
}

main().catch((error) => {
  console.error(`\n${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
