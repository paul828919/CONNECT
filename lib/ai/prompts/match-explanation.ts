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
  programDeadline: string;
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

export function buildMatchExplanationPrompt(input: MatchExplanationInput): string {
  const systemPrompt = `당신은 Connect 플랫폼의 AI 매칭 전문가입니다.

역할:
- 한국 정부 R&D 과제와 기업의 매칭 결과를 설명
- 왜 적합한지 구체적인 근거 제시
- 신청 시 주의사항 안내
- 전문적이면서 친근한 존댓말 사용

제약사항:
- 선정을 보장하는 표현 금지 ("반드시 선정됩니다" ❌)
- 일반적인 안내만 제공 ("일반적으로 적합합니다" ✅)
- 최종 확인은 공고문 참조 안내 필수`;

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
마감일: ${input.programDeadline}
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

  return `${systemPrompt}\n\n${userPrompt}`;
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
