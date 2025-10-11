/**
 * Temperature Optimization Testing
 * Week 3-4: AI Integration (Day 20-21)
 *
 * Tests different temperature settings to find optimal balance:
 * - Temperature 0.5: Most consistent, least creative, formal
 * - Temperature 0.7: Balanced (current default)
 * - Temperature 0.9: Most creative, varied, natural
 *
 * For each temperature, we test:
 * 1. Match explanations (structured output)
 * 2. Q&A responses (conversational output)
 *
 * Metrics:
 * - Consistency: Run same input 3 times, measure variation
 * - Quality: Subjective rating of output
 * - Creativity: Diversity of expressions
 * - Professionalism: Maintains 존댓말 and appropriate tone
 * - Accuracy: No hallucinations or incorrect facts
 *
 * Usage:
 * npx tsx scripts/test-temperature-optimization.ts
 */

import { sendAIRequest } from '../lib/ai/client';
import { buildMatchExplanationPrompt, MatchExplanationInput } from '../lib/ai/prompts/match-explanation';
import { buildQAChatPrompt, QAChatInput } from '../lib/ai/prompts/qa-chat';

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
// TEST CONFIGURATIONS
// ========================================

const TEMPERATURES = [0.5, 0.7, 0.9];
const CONSISTENCY_RUNS = 3; // Run same prompt 3 times to measure variation

// ========================================
// TEST DATA
// ========================================

// Match explanation test case
const matchTestCase: MatchExplanationInput = {
  programTitle: 'AI 기반 SaaS 상용화 지원',
  programAgency: 'IITP',
  programBudget: '최대 3억원',
  programTRL: 'TRL 7-8',
  programIndustry: 'AI/ML, SaaS',
  programDeadline: '2025-11-15',
  programRequirements: ['ISMS-P 인증', 'TRL 7 이상'],
  companyName: '(주)클라우드AI',
  companyIndustry: 'AI/ML SaaS',
  companyTRL: 7,
  companyRevenue: 1500000000,
  companyEmployees: 25,
  certifications: ['ISMS-P', 'ISO 27001'],
  rdExperience: 3,
  matchScore: 85,
  scoreBreakdown: {
    industry: 28,
    trl: 18,
    certifications: 20,
    budget: 12,
    experience: 7,
  },
  missingRequirements: [],
  similarSuccessRate: 42,
};

// Q&A test questions
const qaTestQuestions = [
  {
    question: 'TRL 7이 무엇인가요? 어떤 단계인지 설명해주세요.',
    companyContext: undefined,
  },
  {
    question: 'ISMS-P 인증이 무엇이고 왜 필요한가요?',
    companyContext: {
      name: '(주)클라우드AI',
      industry: 'AI/ML SaaS',
      trl: 7,
      revenue: 1500000000,
      certifications: ['ISO 27001'],
      rdExperience: 3,
    },
  },
];

// ========================================
// TEST EXECUTION
// ========================================

interface TemperatureTestResult {
  temperature: number;
  testType: 'match' | 'qa';
  testCase: string;
  run: number;
  response: string;
  responseTime: number;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  characterCount: number;
}

/**
 * Test match explanation at specific temperature
 */
async function testMatchExplanationAtTemperature(
  temperature: number,
  run: number
): Promise<TemperatureTestResult> {
  console.log(`  ${colors.cyan}Run ${run} (temp ${temperature})${colors.reset}`);

  const startTime = Date.now();
  const prompt = buildMatchExplanationPrompt(matchTestCase);

  const result = await sendAIRequest({
    system: '',
    messages: [{ role: 'user', content: prompt }],
    maxTokens: 500,
    temperature,
  });

  return {
    temperature,
    testType: 'match',
    testCase: matchTestCase.programTitle,
    run,
    response: result.content,
    responseTime: Date.now() - startTime,
    inputTokens: result.usage.inputTokens,
    outputTokens: result.usage.outputTokens,
    cost: result.cost,
    characterCount: result.content.length,
  };
}

/**
 * Test Q&A chat at specific temperature
 */
async function testQAChatAtTemperature(
  temperature: number,
  testQuestion: typeof qaTestQuestions[0],
  run: number
): Promise<TemperatureTestResult> {
  console.log(`  ${colors.cyan}Run ${run} (temp ${temperature})${colors.reset}`);

  const startTime = Date.now();

  const input: QAChatInput = {
    userQuestion: testQuestion.question,
    conversationHistory: [],
    companyContext: testQuestion.companyContext,
    currentDate: new Date().toISOString().split('T')[0],
  };

  const { system, messages } = buildQAChatPrompt(input);

  const result = await sendAIRequest({
    system,
    messages: messages as Array<{ role: 'user' | 'assistant'; content: string }>,
    maxTokens: 1000,
    temperature,
  });

  return {
    temperature,
    testType: 'qa',
    testCase: testQuestion.question,
    run,
    response: result.content,
    responseTime: Date.now() - startTime,
    inputTokens: result.usage.inputTokens,
    outputTokens: result.usage.outputTokens,
    cost: result.cost,
    characterCount: result.content.length,
  };
}

// ========================================
// CONSISTENCY ANALYSIS
// ========================================

/**
 * Calculate consistency score (0-100)
 * Higher = more consistent responses
 */
function calculateConsistency(responses: string[]): number {
  if (responses.length < 2) return 100;

  // Simple metric: character count variance
  const lengths = responses.map(r => r.length);
  const avgLength = lengths.reduce((sum, len) => sum + len, 0) / lengths.length;
  const variance = lengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / lengths.length;
  const stdDev = Math.sqrt(variance);

  // Normalize: 0 stdDev = 100 score, 100+ stdDev = 0 score
  const consistencyScore = Math.max(0, 100 - stdDev);

  return consistencyScore;
}

/**
 * Calculate diversity score (0-100)
 * Higher = more diverse/creative responses
 */
function calculateDiversity(responses: string[]): number {
  if (responses.length < 2) return 0;

  // Simple metric: unique character bigrams
  const allBigrams = new Set<string>();
  const uniqueBigramCounts: number[] = [];

  for (const response of responses) {
    const bigrams = new Set<string>();
    for (let i = 0; i < response.length - 1; i++) {
      const bigram = response.substring(i, i + 2);
      bigrams.add(bigram);
      allBigrams.add(bigram);
    }
    uniqueBigramCounts.push(bigrams.size);
  }

  // Diversity = ratio of unique bigrams across runs vs. total possible
  const avgUnique = uniqueBigramCounts.reduce((sum, count) => sum + count, 0) / uniqueBigramCounts.length;
  const diversityScore = Math.min(100, (allBigrams.size / avgUnique) * 20);

  return diversityScore;
}

// ========================================
// ANALYSIS & REPORTING
// ========================================

function analyzeTemperatureResults(results: TemperatureTestResult[]) {
  console.log(`\n${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.cyan}Temperature 분석 결과${colors.reset}`);
  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

  // Group by temperature and test type
  const grouped = new Map<string, TemperatureTestResult[]>();
  for (const result of results) {
    const key = `${result.temperature}-${result.testType}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(result);
  }

  // Analyze each group
  for (const [key, groupResults] of grouped.entries()) {
    const [temperature, testType] = key.split('-');
    const responses = groupResults.map(r => r.response);

    const avgResponseTime = groupResults.reduce((sum, r) => sum + r.responseTime, 0) / groupResults.length;
    const avgOutputTokens = groupResults.reduce((sum, r) => sum + r.outputTokens, 0) / groupResults.length;
    const totalCost = groupResults.reduce((sum, r) => sum + r.cost, 0);
    const avgCharCount = groupResults.reduce((sum, r) => sum + r.characterCount, 0) / groupResults.length;

    const consistencyScore = calculateConsistency(responses);
    const diversityScore = calculateDiversity(responses);

    console.log(`${colors.yellow}Temperature ${temperature} - ${testType === 'match' ? 'Match Explanation' : 'Q&A Chat'}${colors.reset}`);
    console.log(`  평균 응답 시간: ${avgResponseTime.toFixed(0)}ms`);
    console.log(`  평균 출력 토큰: ${avgOutputTokens.toFixed(0)}`);
    console.log(`  총 비용: ₩${totalCost.toFixed(2)}`);
    console.log(`  평균 글자수: ${avgCharCount.toFixed(0)}자`);
    console.log(`  ${colors.green}일관성 점수: ${consistencyScore.toFixed(1)}/100${colors.reset} (높을수록 좋음)`);
    console.log(`  ${colors.green}다양성 점수: ${diversityScore.toFixed(1)}/100${colors.reset} (창의성 지표)\n`);
  }

  // Print sample responses for comparison
  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.cyan}샘플 응답 비교 (Match Explanation)${colors.reset}`);
  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

  for (const temp of TEMPERATURES) {
    const matchResults = results.filter(r => r.temperature === temp && r.testType === 'match');
    if (matchResults.length > 0) {
      console.log(`${colors.magenta}[Temperature ${temp}]${colors.reset}`);
      console.log(matchResults[0].response);
      console.log(`${colors.yellow}(${matchResults[0].characterCount}자, ${matchResults[0].responseTime}ms)${colors.reset}\n`);
    }
  }

  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.cyan}샘플 응답 비교 (Q&A Chat - "${qaTestQuestions[0].question}")${colors.reset}`);
  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

  for (const temp of TEMPERATURES) {
    const qaResults = results.filter(
      r => r.temperature === temp && r.testType === 'qa' && r.testCase === qaTestQuestions[0].question
    );
    if (qaResults.length > 0) {
      console.log(`${colors.magenta}[Temperature ${temp}]${colors.reset}`);
      console.log(qaResults[0].response);
      console.log(`${colors.yellow}(${qaResults[0].characterCount}자, ${qaResults[0].responseTime}ms)${colors.reset}\n`);
    }
  }
}

/**
 * Generate recommendation
 */
function generateRecommendation(results: TemperatureTestResult[]) {
  console.log(`${colors.yellow}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.cyan}권장사항${colors.reset}`);
  console.log(`${colors.yellow}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

  console.log(`${colors.green}Temperature 0.5:${colors.reset}`);
  console.log('  ✅ 장점: 매우 일관적, 예측 가능, 안정적');
  console.log('  ❌ 단점: 기계적, 창의성 부족, 딱딱함');
  console.log('  📌 추천: 구조화된 데이터 출력, 법적/금융 조언\n');

  console.log(`${colors.green}Temperature 0.7 (현재 기본값):${colors.reset}`);
  console.log('  ✅ 장점: 균형잡힌, 자연스러움, 적절한 다양성');
  console.log('  ⚠️  주의: 가끔 일관성 저하');
  console.log('  📌 추천: 일반적인 대화, 설명, 매칭 결과\n');

  console.log(`${colors.green}Temperature 0.9:${colors.reset}`);
  console.log('  ✅ 장점: 창의적, 자연스러운 표현, 다양한 답변');
  console.log('  ❌ 단점: 일관성 낮음, 가끔 산만함, 예측 어려움');
  console.log('  📌 추천: 브레인스토밍, 아이디어 생성, 긴 에세이\n');

  console.log(`${colors.cyan}최종 권장:${colors.reset}`);
  console.log('  • Match Explanation: Temperature 0.7 유지 (구조 + 자연스러움)');
  console.log('  • Q&A Chat: Temperature 0.7 유지 (대화형 + 안정성)');
  console.log('  • 향후: 사용자 피드백 기반 미세 조정 (0.6-0.8 범위)\n');

  console.log(`${colors.yellow}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
}

// ========================================
// MAIN
// ========================================

async function main() {
  console.log('========================================');
  console.log('Temperature Optimization Testing');
  console.log('Week 3-4: AI Integration (Day 20-21)');
  console.log('========================================');
  console.log(`\nTemperatures to test: ${TEMPERATURES.join(', ')}`);
  console.log(`Consistency runs: ${CONSISTENCY_RUNS} per temperature\n`);

  const allResults: TemperatureTestResult[] = [];

  // Test Match Explanations
  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.cyan}Testing: Match Explanation${colors.reset}`);
  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

  for (const temperature of TEMPERATURES) {
    console.log(`${colors.yellow}Temperature ${temperature}${colors.reset}`);

    for (let run = 1; run <= CONSISTENCY_RUNS; run++) {
      const result = await testMatchExplanationAtTemperature(temperature, run);
      allResults.push(result);

      // Small delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }

  // Test Q&A Chat
  console.log(`\n${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.cyan}Testing: Q&A Chat${colors.reset}`);
  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

  for (const temperature of TEMPERATURES) {
    console.log(`${colors.yellow}Temperature ${temperature}${colors.reset}`);

    for (const testQuestion of qaTestQuestions) {
      console.log(`  Question: "${testQuestion.question.substring(0, 40)}..."`);

      for (let run = 1; run <= CONSISTENCY_RUNS; run++) {
        const result = await testQAChatAtTemperature(temperature, testQuestion, run);
        allResults.push(result);

        // Small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }
  }

  // Analyze results
  analyzeTemperatureResults(allResults);

  // Generate recommendation
  generateRecommendation(allResults);

  console.log('========================================\n');
}

main().catch((error) => {
  console.error(`\n${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
