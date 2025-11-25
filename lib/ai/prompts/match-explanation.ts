/**
 * Match Explanation Prompt Template
 * Generates Korean explanations for funding program matches
 *
 * Features:
 * - Professional 존댓말 (formal speech)
 * - Structured XML output for parsing
 * - Score breakdown explanation
 * - Actionable recommendations
 */

export interface MatchExplanationInput {
  // Program information
  programTitle: string;
  programAgency: string;
  programBudget: string;
  programTRL: string;
  programIndustry: string;
  programDeadline: Date | null;
  programStatus: 'ACTIVE' | 'EXPIRED' | 'ARCHIVED';
  programRequirements: string[];

  // Company information
  companyName: string;
  companyIndustry: string;
  companyTRL: number;
  companyRevenue: number;
  companyEmployees: number;
  certifications: string[];
  rdExperience: number; // years

  // Match score details
  matchScore: number; // 0-100
  scoreBreakdown: {
    industry: number;      // /30
    trl: number;           // /20
    certifications: number; // /20
    budget: number;        // /15
    experience: number;    // /15
  };

  // Additional context
  missingRequirements?: string[];
  similarSuccessRate?: number; // Optional: similar companies' success rate
}

/**
 * System prompt for ACTIVE programs
 * Focus: "Should I apply? What's urgent?"
 */
function getActiveSystemPrompt(): string {
  return `당신은 Connect 플랫폼의 AI 매칭 전문가입니다.

역할:
- 현재 신청 가능한 R&D 과제에 대한 지원 가능성 평가
- 매칭 점수의 구체적 근거 제시
- 신청 전 필수 확인사항 안내 (TRL, 예산, 자격요건)
- 마감일 기준 준비 일정 제안

제약사항:
- 선정을 보장하는 표현 금지 ("반드시 선정됩니다" ❌)
- 일반적인 안내만 제공 ("일반적으로 적합합니다" ✅)
- 최종 확인은 공고문 참조 안내 필수

응답 목표:
- "지금 신청해야 할까?" → 명확한 판단 근거 제공
- 마감일까지 남은 시간 고려한 실행 계획`;
}

/**
 * System prompt for EXPIRED programs
 * Focus: "How do I prepare for next year?"
 */
function getExpiredSystemPrompt(): string {
  return `당신은 Connect 플랫폼의 AI 매칭 전문가입니다.

역할:
- 2026년도 유사 과제 대비를 위한 학습 자료 제공
- 이 매칭이 왜 적합했는지 분석 (회사 강점 파악)
- 내년 공고 대비 전략적 준비사항 제안
- 현재 보완 가능한 요건 식별

표현 지침:
- "마감되었습니다"와 같은 부정적 표현 금지
- "시스템 오류"와 같은 불신 유발 표현 절대 금지
- 학습 관점의 긍정적 프레이밍 사용
- "2026년 준비" 중심의 미래 지향적 톤

응답 목표:
- "내년 신청을 위해 무엇을 준비할까?" → 구체적 액션 플랜
- 귀사의 강점 파악 및 보완점 개선 방향 제시`;
}

/**
 * System prompt for ARCHIVED programs
 * Focus: "Alternative exploration"
 */
function getArchivedSystemPrompt(): string {
  return `당신은 Connect 플랫폼의 AI 매칭 전문가입니다.

역할:
- 과거 매칭 이유 분석 (회사 강점 파악용)
- 유사한 현재 활성 과제 탐색 방향 제안
- 회사 프로필 최적화 조언

표현 지침:
- 영구 중단 사실을 명확히 전달
- "시스템 오류"와 같은 불신 유발 표현 절대 금지
- 대안 탐색에 집중하는 긍정적 톤

응답 목표:
- "이 과제는 영구 중단되었으나, 귀사 강점은 여전히 유효합니다"
- 유사한 활성 과제 탐색 가이드 제공`;
}

/**
 * Calculate deadline urgency for ACTIVE programs
 */
function calculateDeadlineUrgency(deadline: Date): string {
  const now = new Date();
  const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysRemaining <= 7) {
    return `\n⚠️ 긴급: 마감까지 ${daysRemaining}일 남음 - 즉시 검토 필요`;
  } else if (daysRemaining <= 14) {
    return `\n마감까지 ${daysRemaining}일 - 1주 내 착수 권장`;
  } else if (daysRemaining <= 30) {
    return `\n마감까지 ${daysRemaining}일 - 2-3주 준비 기간 확보`;
  }

  return '';
}

/**
 * Format deadline for display
 */
function formatDeadlineDisplay(deadline: Date | null): string {
  if (!deadline) return '미정';

  return deadline.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export function buildMatchExplanationPrompt(input: MatchExplanationInput): string {
  // Select appropriate system prompt based on program status
  let systemPrompt: string;
  let statusContext: string;

  switch (input.programStatus) {
    case 'EXPIRED':
      systemPrompt = getExpiredSystemPrompt();
      statusContext = `\n<context>이 과제는 이미 마감되었습니다. 2026년도 유사 과제 준비를 위한 학습 자료로 활용하세요.</context>\n`;
      break;

    case 'ARCHIVED':
      systemPrompt = getArchivedSystemPrompt();
      statusContext = `\n<context>이 과제는 영구 중단되었습니다. 귀사 강점 파악 및 대체 과제 탐색에 활용하세요.</context>\n`;
      break;

    case 'ACTIVE':
    default:
      systemPrompt = getActiveSystemPrompt();
      const urgencyInfo = input.programDeadline
        ? calculateDeadlineUrgency(input.programDeadline)
        : '';
      statusContext = `\n<context>이 과제는 현재 신청 가능합니다. 지원 가능성을 평가하고 실행 계획을 제시하세요.${urgencyInfo}</context>\n`;
      break;
  }

  const userPrompt = `<company_info>
회사명: ${input.companyName}
산업 분야: ${input.companyIndustry}
기술 수준: TRL ${input.companyTRL}
연매출: ${input.companyRevenue.toLocaleString('ko-KR')}원
직원 수: ${input.companyEmployees}명
R&D 경험: ${input.rdExperience}년
보유 인증: ${input.certifications.length > 0 ? input.certifications.join(', ') : '없음'}
</company_info>

<program_info>
과제명: ${input.programTitle}
주관 기관: ${input.programAgency}
지원 예산: ${input.programBudget}
요구 TRL: ${input.programTRL}
대상 산업: ${input.programIndustry}
마감일: ${formatDeadlineDisplay(input.programDeadline)}
필수 요건: ${input.programRequirements.join(', ')}
</program_info>

<match_score>
총점: ${input.matchScore}/100점

점수 상세:
- 산업 분야 매칭: ${input.scoreBreakdown.industry}/30점
- TRL 적합성: ${input.scoreBreakdown.trl}/20점
- 인증 요건: ${input.scoreBreakdown.certifications}/20점
- 예산 적합성: ${input.scoreBreakdown.budget}/15점
- R&D 경험: ${input.scoreBreakdown.experience}/15점
</match_score>

${input.missingRequirements && input.missingRequirements.length > 0 ? `
<missing_requirements>
미충족 요건: ${input.missingRequirements.join(', ')}
</missing_requirements>
` : ''}

${input.similarSuccessRate ? `
<benchmark_data>
유사 기업 평균 선정률: ${input.similarSuccessRate}%
</benchmark_data>
` : ''}

<instructions>
위 정보를 바탕으로 매칭 결과를 설명해주세요.

응답 구조:
1. <summary>한 문장 요약 (적합/부적합)</summary>
2. <reasons>
   <reason>이유 1: 구체적 근거 포함</reason>
   <reason>이유 2: 점수 또는 수치 언급</reason>
   <reason>이유 3: 비교 데이터 활용</reason>
   </reasons>
3. <cautions>주의사항 (선택사항, 있을 경우만)</cautions>
4. <recommendation>다음 단계 제안 또는 대체 과제 추천</recommendation>

응답 가이드라인:
- 각 이유는 30-50자 내외
- 존댓말 필수 (습니다, 입니다)
- 구체적 숫자와 근거 포함
- 긍정적이되 과장 금지
- 총 200자 이내로 간결하게
</instructions>

매칭 설명을 작성해주세요.`;

  return `${systemPrompt}\n${statusContext}\n${userPrompt}`;
}

/**
 * Parse XML response from Claude
 */
export interface ParsedMatchExplanation {
  summary: string;
  reasons: string[];
  cautions?: string;
  recommendation: string;
}

export function parseMatchExplanation(response: string): ParsedMatchExplanation {
  // Extract summary
  const summaryMatch = response.match(/<summary>(.*?)<\/summary>/s);
  const summary = summaryMatch ? summaryMatch[1].trim() : '';

  // Extract reasons
  const reasonMatches = response.matchAll(/<reason>(.*?)<\/reason>/gs);
  const reasons = Array.from(reasonMatches).map(match => match[1].trim());

  // Extract cautions (optional)
  const cautionMatch = response.match(/<cautions>(.*?)<\/cautions>/s);
  const cautions = cautionMatch ? cautionMatch[1].trim() : undefined;

  // Extract recommendation
  const recommendationMatch = response.match(/<recommendation>(.*?)<\/recommendation>/s);
  const recommendation = recommendationMatch ? recommendationMatch[1].trim() : '';

  return {
    summary,
    reasons,
    cautions,
    recommendation
  };
}

/**
 * Temperature recommendation: 0.7
 * - Balanced between consistency and natural variation
 * - Professional tone maintained
 * - Enough creativity for engaging explanations
 */
export const MATCH_EXPLANATION_TEMPERATURE = 0.7;

/**
 * Max tokens recommendation: 500
 * - Average response: ~200 tokens (Korean)
 * - Buffer for longer explanations
 */
export const MATCH_EXPLANATION_MAX_TOKENS = 500;
