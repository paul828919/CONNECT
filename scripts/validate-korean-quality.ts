/**
 * Korean Language Quality Validation
 * Week 3-4: AI Integration (Day 20-21)
 *
 * Validates Korean language quality across multiple dimensions:
 * 1. 존댓말 (Formal Speech): Proper use of 습니다/입니다 endings
 * 2. Grammar: Correct particles, verb conjugations, sentence structure
 * 3. Terminology: Accurate technical and domain-specific terms
 * 4. Naturalness: Reads like native Korean, not translation
 * 5. Professionalism: Appropriate tone for business context
 *
 * Process:
 * - Generate 20+ responses from both services
 * - Manual review with scoring rubric
 * - Identify patterns of errors
 * - Generate improvement recommendations
 *
 * Usage:
 * npx tsx scripts/validate-korean-quality.ts
 */

import { sendAIRequest } from '../lib/ai/client';
import { buildMatchExplanationPrompt, MatchExplanationInput } from '../lib/ai/prompts/match-explanation';
import { buildQAChatPrompt, QAChatInput } from '../lib/ai/prompts/qa-chat';
import * as readline from 'readline';

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
// VALIDATION FRAMEWORK
// ========================================

interface KoreanQualityScore {
  formality: number;      // 1-5: 존댓말 정확성
  grammar: number;        // 1-5: 문법 정확성
  terminology: number;    // 1-5: 전문 용어 정확성
  naturalness: number;    // 1-5: 자연스러움
  professionalism: number; // 1-5: 전문성/비즈니스 적합성
  overall: number;        // Average of above
  notes: string;          // 개선 사항 메모
}

interface ValidationResult {
  testType: 'match' | 'qa';
  testCase: string;
  response: string;
  score: KoreanQualityScore;
  issues: string[];
}

// ========================================
// TEST DATA
// ========================================

// Match explanation test cases (diverse scenarios)
const matchTestCases: MatchExplanationInput[] = [
  // High match - positive tone
  {
    programTitle: 'AI 기반 의료진단 소프트웨어 개발',
    programAgency: 'IITP',
    programBudget: '최대 3억원',
    programTRL: 'TRL 7-8',
    programIndustry: 'AI/ML, Healthcare',
    programDeadline: '2025-11-30',
    programRequirements: ['ISMS-P', 'TRL 7+'],
    companyName: '(주)메디테크',
    companyIndustry: 'AI Healthcare',
    companyTRL: 8,
    companyRevenue: 3000000000,
    companyEmployees: 40,
    certifications: ['ISMS-P', 'ISO 13485'],
    rdExperience: 5,
    matchScore: 92,
    scoreBreakdown: {
      industry: 30,
      trl: 20,
      certifications: 20,
      budget: 12,
      experience: 10,
    },
  },

  // Medium match - balanced tone
  {
    programTitle: 'IoT 기반 스마트 센서 기술개발',
    programAgency: 'KEIT',
    programBudget: '최대 5억원',
    programTRL: 'TRL 6-7',
    programIndustry: 'IoT, Hardware',
    programDeadline: '2025-12-15',
    programRequirements: ['KC 인증', 'TRL 6+'],
    companyName: '(주)스마트IoT',
    companyIndustry: 'IoT Hardware',
    companyTRL: 6,
    companyRevenue: 5000000000,
    companyEmployees: 50,
    certifications: ['KC'],
    rdExperience: 4,
    matchScore: 68,
    scoreBreakdown: {
      industry: 25,
      trl: 16,
      certifications: 15,
      budget: 10,
      experience: 2,
    },
    missingRequirements: ['TRL 7 권장'],
  },

  // Low match - cautious tone
  {
    programTitle: '블록체인 기반 금융 플랫폼 개발',
    programAgency: 'TIPA',
    programBudget: '최대 2억원',
    programTRL: 'TRL 8-9',
    programIndustry: 'Blockchain, FinTech',
    programDeadline: '2025-10-31',
    programRequirements: ['ISMS-P', 'TRL 8+', '금융보안'],
    companyName: '(주)스타트업테크',
    companyIndustry: 'IoT Sensors',
    companyTRL: 4,
    companyRevenue: 800000000,
    companyEmployees: 15,
    certifications: [],
    rdExperience: 1,
    matchScore: 35,
    scoreBreakdown: {
      industry: 5,
      trl: 2,
      certifications: 0,
      budget: 8,
      experience: 0,
    },
    missingRequirements: ['산업 불일치', 'TRL 부족', 'ISMS-P 없음'],
  },
];

// Q&A test questions (diverse domains)
const qaTestCases: Array<{
  question: string;
  category: string;
  companyContext?: QAChatInput['companyContext'];
}> = [
  {
    category: 'TRL',
    question: 'TRL 7 단계에서 TRL 8 단계로 올라가려면 구체적으로 무엇을 해야 하나요?',
  },
  {
    category: 'Certification',
    question: 'ISMS-P 인증 취득에 보통 얼마나 걸리고, 비용은 어느 정도인가요?',
    companyContext: {
      name: '(주)클라우드AI',
      industry: 'AI/ML SaaS',
      trl: 7,
      revenue: 1500000000,
      certifications: [],
      rdExperience: 3,
    },
  },
  {
    category: 'Agency',
    question: 'IITP 과제와 KEIT 과제의 가장 큰 차이점은 무엇인가요?',
  },
  {
    category: 'Application',
    question: '과제 신청서 작성 시 가장 중요하게 봐야 할 부분은 무엇인가요?',
  },
  {
    category: 'Budget',
    question: 'R&D 과제 예산 중 인건비는 어떻게 계산하나요?',
  },
  {
    category: 'Eligibility',
    question: '우리 회사는 중소기업인데 중견기업 과제에도 신청할 수 있나요?',
    companyContext: {
      name: '(주)성장기업',
      industry: 'Manufacturing',
      trl: 6,
      revenue: 8000000000,
      certifications: ['ISO 9001'],
      rdExperience: 8,
    },
  },
];

// ========================================
// KOREAN QUALITY CHECKS
// ========================================

/**
 * Automated checks for common issues
 */
function performAutomatedChecks(response: string): string[] {
  const issues: string[] = [];

  // Check 1: 존댓말 endings
  const formalEndings = ['습니다', '입니다', '있습니다', '습니까', '입니까'];
  const informalEndings = ['이야', '야', '네', '어', '해', '지'];

  const hasFormalEndings = formalEndings.some(ending => response.includes(ending));
  const hasInformalEndings = informalEndings.some(ending => {
    // Check if informal ending is at sentence end
    const regex = new RegExp(`${ending}[.!?]`, 'g');
    return regex.test(response);
  });

  if (!hasFormalEndings) {
    issues.push('⚠️  존댓말 어미 없음 (습니다/입니다 사용 권장)');
  }

  if (hasInformalEndings) {
    issues.push('❌ 반말 어미 발견 (이야/야/네/어/해 등)');
  }

  // Check 2: Prohibited phrases (selection guarantee)
  const prohibitedPhrases = [
    '반드시 선정',
    '확실히 선정',
    '100% 선정',
    '틀림없이',
    '보장합니다',
    '확실합니다',
  ];

  for (const phrase of prohibitedPhrases) {
    if (response.includes(phrase)) {
      issues.push(`❌ 금지 표현 발견: "${phrase}" (선정 보장 표현 금지)`);
    }
  }

  // Check 3: Disclaimer check
  const hasDisclaimer = response.includes('공고문') ||
                        response.includes('확인') ||
                        response.includes('참조') ||
                        response.includes('일반적인 안내');

  if (!hasDisclaimer && response.length > 200) {
    issues.push('⚠️  면책 조항 없음 ("공고문 확인" 등 안내 권장)');
  }

  // Check 4: Technical term consistency
  const technicalTerms = {
    'TRL': /TRL\s*\d/g,
    '기술성숙도': /기술.*성숙도/g,
    '기술준비수준': /기술.*준비.*수준/g,
  };

  const trlMentions = (response.match(technicalTerms.TRL) || []).length;
  const trlKorean1 = (response.match(technicalTerms['기술성숙도']) || []).length;
  const trlKorean2 = (response.match(technicalTerms['기술준비수준']) || []).length;

  if (trlMentions > 0 && trlKorean1 > 0 && trlKorean2 > 0) {
    issues.push('⚠️  용어 불일치: TRL을 여러 용어로 표현 (일관성 권장)');
  }

  // Check 5: Sentence length (readability)
  const sentences = response.split(/[.!?]/).filter(s => s.trim().length > 0);
  const longSentences = sentences.filter(s => s.length > 150);

  if (longSentences.length > 0) {
    issues.push(`⚠️  긴 문장 ${longSentences.length}개 발견 (150자 이상, 가독성 저하)`);
  }

  return issues;
}

// ========================================
// INTERACTIVE MANUAL REVIEW
// ========================================

async function manualReview(response: string, testCase: string): Promise<KoreanQualityScore> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const ask = (question: string): Promise<string> => {
    return new Promise(resolve => {
      rl.question(question, answer => {
        resolve(answer);
      });
    });
  };

  console.log(`\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.yellow}테스트 케이스:${colors.reset} ${testCase}`);
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`\n${response}\n`);
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);

  console.log(`\n${colors.yellow}다음 항목을 1-5점으로 평가해주세요:${colors.reset}`);
  console.log('  1 = 매우 나쁨, 2 = 나쁨, 3 = 보통, 4 = 좋음, 5 = 매우 좋음\n');

  const formalityStr = await ask('  1️⃣  존댓말 정확성 (1-5): ');
  const grammarStr = await ask('  2️⃣  문법 정확성 (1-5): ');
  const terminologyStr = await ask('  3️⃣  전문 용어 정확성 (1-5): ');
  const naturalnessStr = await ask('  4️⃣  자연스러움 (1-5): ');
  const professionalismStr = await ask('  5️⃣  전문성/비즈니스 적합성 (1-5): ');
  const notes = await ask('  📝 개선 사항 메모 (선택): ');

  rl.close();

  const formality = parseInt(formalityStr) || 3;
  const grammar = parseInt(grammarStr) || 3;
  const terminology = parseInt(terminologyStr) || 3;
  const naturalness = parseInt(naturalnessStr) || 3;
  const professionalism = parseInt(professionalismStr) || 3;

  const overall = (formality + grammar + terminology + naturalness + professionalism) / 5;

  return {
    formality,
    grammar,
    terminology,
    naturalness,
    professionalism,
    overall,
    notes,
  };
}

// ========================================
// TEST EXECUTION
// ========================================

async function generateAndValidateResponses(enableManualReview: boolean = false) {
  const results: ValidationResult[] = [];

  console.log('========================================');
  console.log('Korean Quality Validation');
  console.log('Week 3-4: AI Integration (Day 20-21)');
  console.log('========================================\n');

  if (!enableManualReview) {
    console.log(`${colors.yellow}자동 검증 모드${colors.reset}: 자동화된 체크만 수행`);
    console.log(`수동 검토를 원하시면 스크립트에서 enableManualReview = true 설정\n`);
  }

  // Test Match Explanations
  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.cyan}Match Explanation 응답 생성 및 검증${colors.reset}`);
  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

  for (let i = 0; i < matchTestCases.length; i++) {
    const testCase = matchTestCases[i];
    console.log(`${colors.yellow}[${i + 1}/${matchTestCases.length}] ${testCase.programTitle}${colors.reset}`);

    const prompt = buildMatchExplanationPrompt(testCase);
    const result = await sendAIRequest({
      system: '',
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 500,
      temperature: 0.7,
    });

    const response = result.content;

    // Automated checks
    const issues = performAutomatedChecks(response);

    console.log(`  응답: ${response.substring(0, 80)}...`);
    console.log(`  자동 체크: ${issues.length === 0 ? colors.green + '✅ 통과' : colors.yellow + issues.length + '개 이슈'} ${colors.reset}`);

    if (issues.length > 0) {
      issues.forEach(issue => console.log(`    ${issue}`));
    }

    // Manual review (if enabled)
    let score: KoreanQualityScore;
    if (enableManualReview) {
      score = await manualReview(response, testCase.programTitle);
    } else {
      // Auto-score based on automated checks
      const baseScore = 4;
      const penaltyPerIssue = 0.5;
      const autoScore = Math.max(1, baseScore - (issues.length * penaltyPerIssue));

      score = {
        formality: autoScore,
        grammar: autoScore,
        terminology: autoScore,
        naturalness: autoScore,
        professionalism: autoScore,
        overall: autoScore,
        notes: issues.join('; '),
      };
    }

    results.push({
      testType: 'match',
      testCase: testCase.programTitle,
      response,
      score,
      issues,
    });

    // Rate limit delay
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  // Test Q&A Chat
  console.log(`\n${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.cyan}Q&A Chat 응답 생성 및 검증${colors.reset}`);
  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

  for (let i = 0; i < qaTestCases.length; i++) {
    const testCase = qaTestCases[i];
    console.log(`${colors.yellow}[${i + 1}/${qaTestCases.length}] ${testCase.question}${colors.reset}`);

    const input: QAChatInput = {
      userQuestion: testCase.question,
      conversationHistory: [],
      companyContext: testCase.companyContext,
      currentDate: new Date().toISOString().split('T')[0],
    };

    const { system, messages } = buildQAChatPrompt(input);

    const result = await sendAIRequest({
      system,
      messages: messages as Array<{ role: 'user' | 'assistant'; content: string }>,
      maxTokens: 1000,
      temperature: 0.7,
    });

    const response = result.content;

    // Automated checks
    const issues = performAutomatedChecks(response);

    console.log(`  응답: ${response.substring(0, 80)}...`);
    console.log(`  자동 체크: ${issues.length === 0 ? colors.green + '✅ 통과' : colors.yellow + issues.length + '개 이슈'}${colors.reset}`);

    if (issues.length > 0) {
      issues.forEach(issue => console.log(`    ${issue}`));
    }

    // Manual review (if enabled)
    let score: KoreanQualityScore;
    if (enableManualReview) {
      score = await manualReview(response, testCase.question);
    } else {
      // Auto-score
      const baseScore = 4;
      const penaltyPerIssue = 0.5;
      const autoScore = Math.max(1, baseScore - (issues.length * penaltyPerIssue));

      score = {
        formality: autoScore,
        grammar: autoScore,
        terminology: autoScore,
        naturalness: autoScore,
        professionalism: autoScore,
        overall: autoScore,
        notes: issues.join('; '),
      };
    }

    results.push({
      testType: 'qa',
      testCase: testCase.question,
      response,
      score,
      issues,
    });

    // Rate limit delay
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  return results;
}

// ========================================
// ANALYSIS & REPORTING
// ========================================

function analyzeKoreanQuality(results: ValidationResult[]) {
  console.log(`\n${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.cyan}한국어 품질 분석 결과${colors.reset}`);
  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

  // Overall averages
  const avgFormality = results.reduce((sum, r) => sum + r.score.formality, 0) / results.length;
  const avgGrammar = results.reduce((sum, r) => sum + r.score.grammar, 0) / results.length;
  const avgTerminology = results.reduce((sum, r) => sum + r.score.terminology, 0) / results.length;
  const avgNaturalness = results.reduce((sum, r) => sum + r.score.naturalness, 0) / results.length;
  const avgProfessionalism = results.reduce((sum, r) => sum + r.score.professionalism, 0) / results.length;
  const avgOverall = results.reduce((sum, r) => sum + r.score.overall, 0) / results.length;

  console.log(`${colors.yellow}전체 평균 점수 (${results.length}개 응답):${colors.reset}`);
  console.log(`  존댓말 정확성: ${avgFormality.toFixed(2)}/5.0 ${getScoreEmoji(avgFormality)}`);
  console.log(`  문법 정확성: ${avgGrammar.toFixed(2)}/5.0 ${getScoreEmoji(avgGrammar)}`);
  console.log(`  전문 용어 정확성: ${avgTerminology.toFixed(2)}/5.0 ${getScoreEmoji(avgTerminology)}`);
  console.log(`  자연스러움: ${avgNaturalness.toFixed(2)}/5.0 ${getScoreEmoji(avgNaturalness)}`);
  console.log(`  전문성: ${avgProfessionalism.toFixed(2)}/5.0 ${getScoreEmoji(avgProfessionalism)}`);
  console.log(`  ${colors.green}종합 점수: ${avgOverall.toFixed(2)}/5.0 ${getScoreEmoji(avgOverall)}${colors.reset}\n`);

  // By test type
  const matchResults = results.filter(r => r.testType === 'match');
  const qaResults = results.filter(r => r.testType === 'qa');

  console.log(`${colors.yellow}서비스별 평균:${colors.reset}`);
  console.log(`  Match Explanation: ${(matchResults.reduce((sum, r) => sum + r.score.overall, 0) / matchResults.length).toFixed(2)}/5.0`);
  console.log(`  Q&A Chat: ${(qaResults.reduce((sum, r) => sum + r.score.overall, 0) / qaResults.length).toFixed(2)}/5.0\n`);

  // Common issues
  const allIssues = results.flatMap(r => r.issues);
  const issueCount = new Map<string, number>();

  for (const issue of allIssues) {
    const key = issue.split(':')[0].trim();
    issueCount.set(key, (issueCount.get(key) || 0) + 1);
  }

  console.log(`${colors.yellow}공통 이슈 (빈도순):${colors.reset}`);
  const sortedIssues = Array.from(issueCount.entries()).sort((a, b) => b[1] - a[1]);
  sortedIssues.slice(0, 5).forEach(([issue, count]) => {
    console.log(`  ${issue}: ${count}회`);
  });

  // Recommendations
  console.log(`\n${colors.cyan}개선 권장사항:${colors.reset}`);

  if (avgFormality < 4.0) {
    console.log(`  ⚠️  존댓말 점수 낮음 (${avgFormality.toFixed(2)}/5.0)`);
    console.log('     → 프롬프트에 "습니다/입니다 사용 필수" 강조');
  }

  if (avgNaturalness < 4.0) {
    console.log(`  ⚠️  자연스러움 점수 낮음 (${avgNaturalness.toFixed(2)}/5.0)`);
    console.log('     → Few-shot 예시 추가, 번역체 표현 제거');
  }

  if (avgTerminology < 4.0) {
    console.log(`  ⚠️  용어 정확성 낮음 (${avgTerminology.toFixed(2)}/5.0)`);
    console.log('     → 용어 사전 제공, 일관성 가이드라인 추가');
  }

  if (avgOverall >= 4.0) {
    console.log(`  ${colors.green}✅ 전반적으로 우수한 한국어 품질!${colors.reset}`);
    console.log('     → 현재 프롬프트 유지, 미세 조정만 필요');
  }

  console.log(`\n${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
}

function getScoreEmoji(score: number): string {
  if (score >= 4.5) return '🟢 우수';
  if (score >= 4.0) return '🟡 양호';
  if (score >= 3.0) return '🟠 보통';
  return '🔴 개선 필요';
}

// ========================================
// MAIN
// ========================================

async function main() {
  // Set to true for interactive manual review
  const enableManualReview = false;

  const results = await generateAndValidateResponses(enableManualReview);
  analyzeKoreanQuality(results);

  console.log('========================================\n');
}

main().catch((error) => {
  console.error(`\n${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
