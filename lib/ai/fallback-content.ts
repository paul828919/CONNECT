/**
 * Fallback Content System
 * Connect Platform - Week 3-4 AI Integration
 *
 * Provides manual fallback responses when AI service is unavailable
 * Used when circuit breaker is OPEN or during service degradation
 */

import { AIServiceType } from '@prisma/client';

/**
 * Fallback response interface
 */
export interface FallbackResponse {
  content: string;
  korean: string;
  isGeneric: boolean; // True if not personalized
  source: 'fallback' | 'cache' | 'manual';
}

/**
 * Get fallback content for match explanation
 * Returns context-aware explanations when AI is unavailable
 */
export function getMatchExplanationFallback(
  programTitle: string,
  organizationName: string,
  matchScore: number,
  programStatus?: 'ACTIVE' | 'EXPIRED' | 'ARCHIVED'
): FallbackResponse {
  const status = programStatus || 'ACTIVE';

  let koreanExplanation: string;

  switch (status) {
    case 'EXPIRED':
      koreanExplanation = `
**매칭 결과**: ${programTitle}

**선정 이유**:
- 귀사(${organizationName})의 사업 분야와 본 과제의 목적이 ${matchScore}점으로 매칭되었습니다.
- 과제는 이미 마감되었으나, 2026년도 유사 과제 준비에 참고하세요.
- 귀사의 강점을 파악하는 학습 자료로 활용하실 수 있습니다.

**다음 단계** (2026년 준비):
1. NTIS에서 2026년 1-2월 유사 공고를 모니터링하세요
2. 과제 요구사항(TRL, 인증)을 기준으로 보완점을 준비하세요
3. 사업계획서 초안을 미리 작성하세요 (3-4주 소요)

**도움이 필요하시면**: 신청서 검토 서비스(₩2-3M) 또는 컨소시엄 구성 서비스(₩3-5M)를 이용하실 수 있습니다.

*참고: 상세 설명 생성이 지연되고 있어 기본 정보만 먼저 제공합니다. 잠시 후 다시 시도하시면 더 상세한 분석을 받아보실 수 있습니다.*
      `.trim();
      break;

    case 'ARCHIVED':
      koreanExplanation = `
**매칭 결과**: ${programTitle}

**선정 이유**:
- 귀사(${organizationName})와 ${matchScore}점으로 매칭되었던 이력을 통해 귀사의 강점을 파악할 수 있습니다.
- 이 과제는 영구 중단되었으나, 귀사 역량은 여전히 유효합니다.
- 유사한 현재 활성 과제를 탐색하는 데 활용하세요.

**다음 단계** (대체 과제 탐색):
1. 대시보드에서 현재 활성 과제를 확인하세요
2. 과제 카테고리 및 TRL 요구사항이 유사한 과제를 찾으세요
3. 귀사 프로필을 최적화하여 매칭 점수를 높이세요

**도움이 필요하시면**: 컨소시엄 구성 서비스(₩3-5M)를 통해 대체 과제를 찾으실 수 있습니다.

*참고: 상세 설명 생성이 지연되고 있어 기본 정보만 먼저 제공합니다. 잠시 후 다시 시도하시면 더 상세한 분석을 받아보실 수 있습니다.*
      `.trim();
      break;

    case 'ACTIVE':
    default:
      koreanExplanation = `
**매칭 결과**: ${programTitle}

**선정 이유**:
- 귀사(${organizationName})의 사업 분야와 본 과제의 지원 목적이 부합합니다.
- 매칭 점수: ${matchScore}점 / 100점
- 과제 요구사항과 귀사의 역량이 일치합니다.

**다음 단계**:
1. 과제 공고문을 상세히 검토하세요 (특히 지원 자격, TRL 요구사항)
2. 필요한 인증 및 서류를 준비하세요
3. 신청 마감일을 확인하고 충분한 시간을 두고 준비하세요

**도움이 필요하시면**: 신청서 검토 서비스(₩2-3M) 또는 컨소시엄 구성 서비스(₩3-5M)를 이용하실 수 있습니다.

*참고: 상세 설명 생성이 지연되고 있어 기본 정보만 먼저 제공합니다. 잠시 후 다시 시도하시면 더 상세한 분석을 받아보실 수 있습니다.*
      `.trim();
      break;
  }

  const englishExplanation = `
**Match Result**: ${programTitle}

**Selection Reasons**:
- Your organization (${organizationName}) aligns with the program's objectives
- Match score: ${matchScore} / 100
- Your capabilities match the program requirements

**Next Steps**:
1. Review the program announcement in detail (especially eligibility and TRL requirements)
2. Prepare necessary certifications and documents
3. Check application deadline and allow sufficient preparation time

**Need Help?**: Consider our Application Review Service (₩2-3M) or Consortium Formation Service (₩3-5M).

*Note: AI service is temporarily unavailable. This is a generic explanation. Please try again later for a detailed analysis.*
  `.trim();

  return {
    content: englishExplanation,
    korean: koreanExplanation,
    isGeneric: true,
    source: 'fallback',
  };
}

/**
 * Get fallback content for Q&A chat
 * Returns helpful generic responses when AI is unavailable
 */
export function getQAChatFallback(question: string): FallbackResponse {
  // Detect question type and provide appropriate fallback
  const lowerQuestion = question.toLowerCase();

  let koreanResponse = '';
  let englishResponse = '';

  // Eligibility questions
  if (
    lowerQuestion.includes('자격') ||
    lowerQuestion.includes('eligible') ||
    lowerQuestion.includes('qualify') ||
    lowerQuestion.includes('지원 가능')
  ) {
    koreanResponse = `
**지원 자격 관련 안내**

죄송합니다. AI 서비스가 일시적으로 사용 불가합니다. 일반적인 지원 자격 요건은 다음과 같습니다:

**기업 자격**:
- 사업자등록증 보유 (개인사업자 또는 법인)
- 제조업, 서비스업, 기술 기반 창업 등 해당 산업 분야 영위
- 과제별 매출액 또는 종업원 수 요건 (과제마다 다름)

**기술준비도(TRL) 요건**:
- 과제마다 요구 TRL 수준이 다릅니다
- 일반적으로 TRL 3-6 (기초 연구) 또는 TRL 7-9 (상용화) 구간

**필수 서류**:
- 사업자등록증
- 재무제표 (최근 2-3년)
- 기술 개발 계획서
- 연구 인력 현황

**추천 사항**: 관심 있는 과제의 공고문을 직접 확인하시거나, 신청 준비 서비스(₩2-3M)를 이용하시면 정확한 자격 검토를 받으실 수 있습니다.

잠시 후 다시 시도하시면 AI가 더 구체적인 답변을 제공해 드립니다.
    `.trim();

    englishResponse = `
**Eligibility Requirements Guide**

Sorry, AI service is temporarily unavailable. General eligibility requirements include:

**Company Eligibility**:
- Valid business registration (individual or corporate)
- Operating in manufacturing, services, or tech-based industries
- Revenue or employee count requirements (varies by program)

**Technology Readiness Level (TRL)**:
- Requirements vary by program
- Typically TRL 3-6 (basic research) or TRL 7-9 (commercialization)

**Required Documents**:
- Business registration certificate
- Financial statements (2-3 years)
- Technology development plan
- Research personnel status

**Recommendation**: Review the program announcement directly or use our Application Preparation Service (₩2-3M) for accurate eligibility review.

Please try again later for a more specific AI-powered answer.
    `.trim();
  }
  // TRL questions
  else if (lowerQuestion.includes('trl') || lowerQuestion.includes('기술준비도')) {
    koreanResponse = `
**기술준비도(TRL) 안내**

죄송합니다. AI 서비스가 일시적으로 사용 불가합니다. TRL 기본 정보는 다음과 같습니다:

**TRL 단계**:
- TRL 1-3: 기초 연구 (아이디어, 개념 검증)
- TRL 4-6: 실험실/시제품 개발 (프로토타입)
- TRL 7-9: 상용화 단계 (양산, 시장 출시)

**과제별 요구사항**:
- 기초·원천 연구: TRL 1-4
- 응용 연구: TRL 4-6
- 개발·사업화: TRL 6-9
- 조달 연계: TRL 9 (완제품)

**TRL 상향 방법**:
- TRL 상향 컨설팅 서비스(₩5-7M) 이용
- 정부 지원 과제를 통한 단계적 개발
- 기술 실증·검증 프로그램 참여

잠시 후 다시 시도하시면 귀사에 맞춤화된 TRL 전략을 제안해 드립니다.
    `.trim();

    englishResponse = `
**Technology Readiness Level (TRL) Guide**

Sorry, AI service is temporarily unavailable. Basic TRL information:

**TRL Stages**:
- TRL 1-3: Basic research (idea, concept validation)
- TRL 4-6: Lab/prototype development
- TRL 7-9: Commercialization (production, market launch)

**Program Requirements**:
- Basic/fundamental research: TRL 1-4
- Applied research: TRL 4-6
- Development/commercialization: TRL 6-9
- Procurement-linked: TRL 9 (finished product)

**TRL Advancement Methods**:
- TRL Advancement Consulting (₩5-7M)
- Step-by-step development through government programs
- Technology demonstration/verification programs

Please try again later for a customized TRL strategy for your organization.
    `.trim();
  }
  // Certification questions
  else if (
    lowerQuestion.includes('인증') ||
    lowerQuestion.includes('certification') ||
    lowerQuestion.includes('isms') ||
    lowerQuestion.includes('kc')
  ) {
    koreanResponse = `
**인증 관련 안내**

죄송합니다. AI 서비스가 일시적으로 사용 불가합니다. 주요 인증 정보는 다음과 같습니다:

**SaaS/AI 기업 (ISMS-P 필요)**:
- 개인정보보호 관리체계 인증
- 소요 기간: 3-6개월
- 비용: ₩3,000만 ~ ₩8,000만
- 인증 계획 서비스(₩3-5M)로 준비 지원

**하드웨어/IoT 기업 (KC 인증 필요)**:
- 전자파 적합성 인증
- 소요 기간: 1-3개월
- 비용: ₩500만 ~ ₩2,000만
- 시험 기관: KTC, KTL, TTA 등

**ISO 인증 (선택)**:
- ISO 9001 (품질경영): 대부분 과제에 유리
- 소요 기간: 3-6개월
- 비용: ₩500만 ~ ₩1,500만

잠시 후 다시 시도하시면 귀사에 필요한 인증을 구체적으로 분석해 드립니다.
    `.trim();

    englishResponse = `
**Certification Guide**

Sorry, AI service is temporarily unavailable. Key certification information:

**SaaS/AI Companies (ISMS-P Required)**:
- Personal information protection management system
- Duration: 3-6 months
- Cost: ₩30M - ₩80M
- Certification Planning Service (₩3-5M) available

**Hardware/IoT Companies (KC Certification Required)**:
- Electromagnetic compatibility certification
- Duration: 1-3 months
- Cost: ₩5M - ₩20M
- Testing bodies: KTC, KTL, TTA, etc.

**ISO Certification (Optional)**:
- ISO 9001 (quality management): Beneficial for most programs
- Duration: 3-6 months
- Cost: ₩5M - ₩15M

Please try again later for a specific analysis of certifications needed for your organization.
    `.trim();
  }
  // Generic fallback for other questions
  else {
    koreanResponse = `
**일시적 서비스 제한 안내**

죄송합니다. AI 서비스가 일시적으로 사용 불가합니다.

**대안**:
1. 잠시 후 다시 질문해 주세요 (보통 30초 ~ 1분 이내 복구)
2. 대시보드에서 매칭된 과제를 확인하세요
3. 과제 공고문을 직접 검토하세요
4. 긴급한 경우: 신청 준비 서비스(₩2-3M) 또는 컨설팅 서비스를 이용하세요

**자주 묻는 질문**:
- 지원 자격 요건
- TRL(기술준비도) 평가
- 필수 인증 (ISMS-P, KC)
- 신청 서류 준비
- 예산 계획 수립

**고객 지원**: support@connect-platform.kr

서비스가 곧 복구될 예정입니다. 잠시만 기다려 주세요.
    `.trim();

    englishResponse = `
**Temporary Service Limitation Notice**

Sorry, AI service is temporarily unavailable.

**Alternatives**:
1. Try again shortly (usually recovers within 30 seconds - 1 minute)
2. Check matched programs on your dashboard
3. Review program announcements directly
4. For urgent needs: Use our Application Preparation Service (₩2-3M) or Consulting Service

**Frequently Asked Questions**:
- Eligibility requirements
- TRL (Technology Readiness Level) assessment
- Required certifications (ISMS-P, KC)
- Application document preparation
- Budget planning

**Customer Support**: support@connect-platform.kr

Service will be restored shortly. Thank you for your patience.
    `.trim();
  }

  return {
    content: englishResponse,
    korean: koreanResponse,
    isGeneric: true,
    source: 'fallback',
  };
}

/**
 * Get fallback content by service type
 * Unified interface for all fallback content
 */
export function getFallbackContent(
  serviceType: AIServiceType,
  context: {
    programTitle?: string;
    organizationName?: string;
    matchScore?: number;
    programStatus?: 'ACTIVE' | 'EXPIRED' | 'ARCHIVED';
    question?: string;
  }
): FallbackResponse {
  switch (serviceType) {
    case 'MATCH_EXPLANATION':
      return getMatchExplanationFallback(
        context.programTitle || 'R&D Program',
        context.organizationName || 'Your Organization',
        context.matchScore || 75,
        context.programStatus
      );

    case 'QA_CHAT':
      return getQAChatFallback(context.question || 'General inquiry');

    default:
      // Generic fallback
      return {
        content: 'AI service is temporarily unavailable. Please try again later.',
        korean: 'AI 서비스가 일시적으로 사용 불가합니다. 잠시 후 다시 시도해 주세요.',
        isGeneric: true,
        source: 'fallback',
      };
  }
}

/**
 * Get error message with Korean translation
 * Used for user-friendly error display
 */
export function getErrorMessage(error: {
  code?: string;
  message?: string;
  status?: number;
}): { english: string; korean: string } {
  // Circuit breaker errors
  if (error.message?.includes('Circuit breaker')) {
    return {
      english: 'AI service is temporarily unavailable due to high failure rate. Please try again in a moment.',
      korean: 'AI 서비스가 일시적으로 중단되었습니다 (높은 오류율). 잠시 후 다시 시도해 주세요.',
    };
  }

  // Rate limit errors
  if (error.status === 429 || error.message?.includes('Rate limit')) {
    return {
      english: 'Too many requests. Please wait a moment and try again.',
      korean: '요청이 너무 많습니다. 잠시 기다린 후 다시 시도해 주세요.',
    };
  }

  // Budget errors
  if (error.message?.includes('budget') || error.message?.includes('Budget')) {
    return {
      english: 'Daily AI budget has been exceeded. Service will resume tomorrow at midnight KST.',
      korean: '일일 AI 예산이 초과되었습니다. 자정(KST)에 서비스가 재개됩니다.',
    };
  }

  // API key errors
  if (error.status === 401 || error.message?.includes('API key')) {
    return {
      english: 'Authentication failed. Please contact support.',
      korean: '인증 실패. 고객 지원팀에 문의해 주세요.',
    };
  }

  // Network errors
  if (
    error.code === 'ECONNRESET' ||
    error.code === 'ETIMEDOUT' ||
    error.message?.includes('network') ||
    error.message?.includes('timeout')
  ) {
    return {
      english: 'Network error. Please check your connection and try again.',
      korean: '네트워크 오류. 연결 상태를 확인하고 다시 시도해 주세요.',
    };
  }

  // Server errors
  if (error.status && error.status >= 500) {
    return {
      english: 'AI service is experiencing issues. Please try again later.',
      korean: 'AI 서비스에 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.',
    };
  }

  // Generic error
  return {
    english: error.message || 'An unexpected error occurred. Please try again.',
    korean: '예상치 못한 오류가 발생했습니다. 다시 시도해 주세요.',
  };
}
