/**
 * SME24 Program Enrichment Prompt Templates
 *
 * Prompt templates for enriching SME24 (중소벤처24) programs using LLM.
 * SME24 programs arrive via API with semi-structured text fields
 * (description, supportTarget, supportContents) that need semantic
 * extraction for matching algorithm compatibility.
 *
 * Fields to extract:
 *   - targetType: Organization types eligible for the program
 *   - requiredCertifications: Certifications needed to apply
 *   - budgetAmount: Total or per-company support amount (from supportScale text)
 *   - keywords: Technology/business keywords for matching
 *   - primaryTargetIndustry: Main target industry
 *
 * Usage:
 *   const prompt = buildSMEEnrichmentPrompt(program);
 *   // Send to Tier 2 (Haiku) or Tier 3 (Opus) as needed
 */

// ============================================================================
// Types
// ============================================================================

export interface SMEProgramTextFields {
  /** 공고명 */
  title: string;
  /** 사업개요 (HTML stripped) */
  description?: string | null;
  /** 지원대상 */
  supportTarget?: string | null;
  /** 지원내용 */
  supportContents?: string | null;
  /** 지원규모 */
  supportScale?: string | null;
  /** 업종 */
  targetIndustry?: string | null;
  /** 필요인증 */
  requiredCerts?: string[];
  /** 사업유형 */
  bizType?: string | null;
  /** 지원유형 */
  sportType?: string | null;
}

export interface SMEEnrichmentResult {
  /** Organization types eligible */
  targetType: string[];
  /** Required certifications */
  requiredCertifications: string[];
  /** Budget amount in KRW (parsed from text) */
  budgetAmount: number | null;
  /** Technology/business keywords */
  keywords: string[];
  /** Primary target industry */
  primaryTargetIndustry: string | null;
  /** Confidence level */
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

// ============================================================================
// Prompt Builders
// ============================================================================

/**
 * Build the main SME enrichment prompt for Haiku/Opus extraction
 */
export function buildSMEEnrichmentPrompt(program: SMEProgramTextFields): string {
  const sections: string[] = [];

  sections.push(`## 공고명\n${program.title}`);

  if (program.description) {
    sections.push(`## 사업개요\n${program.description.substring(0, 2000)}`);
  }

  if (program.supportTarget) {
    sections.push(`## 지원대상\n${program.supportTarget.substring(0, 1000)}`);
  }

  if (program.supportContents) {
    sections.push(`## 지원내용\n${program.supportContents.substring(0, 1500)}`);
  }

  if (program.supportScale) {
    sections.push(`## 지원규모\n${program.supportScale.substring(0, 500)}`);
  }

  if (program.targetIndustry) {
    sections.push(`## 업종\n${program.targetIndustry}`);
  }

  if (program.bizType) {
    sections.push(`## 사업유형\n${program.bizType}`);
  }

  if (program.sportType) {
    sections.push(`## 지원유형\n${program.sportType}`);
  }

  if (program.requiredCerts && program.requiredCerts.length > 0) {
    sections.push(`## 필요인증 (API 제공)\n${program.requiredCerts.join(', ')}`);
  }

  const programText = sections.join('\n\n');

  return `다음 중소벤처24 지원사업 공고에서 구조화된 데이터를 추출하세요.

${programText}

---

## 추출 요청 필드

1. **target_type**: 지원대상 조직유형 (배열)
   - 가능한 값: "COMPANY", "RESEARCH_INSTITUTE", "UNIVERSITY", "PUBLIC_INSTITUTION"
   - 중소기업/중견기업/소상공인/스타트업 → "COMPANY"
   - 대학교/대학 → "UNIVERSITY"
   - 연구기관/연구소 → "RESEARCH_INSTITUTE"

2. **required_certifications**: 필요 인증/자격 (배열)
   - 예: ["벤처기업", "이노비즈", "메인비즈"]
   - API에서 제공된 인증 외에 본문에서 추가로 발견된 것도 포함

3. **budget_amount**: 지원금액 (숫자, 원 단위)
   - 지원규모에서 총 사업비 또는 기업당 최대 지원금 추출
   - 예: "최대 3억원" → 300000000
   - 범위일 경우 최대값 사용

4. **keywords**: 기술/사업 키워드 (배열, 최대 10개)
   - 구체적인 기술 용어 (일반적인 "중소기업", "지원" 등 제외)
   - 사업 내용과 관련된 핵심 키워드

5. **primary_target_industry**: 주요 대상 산업 (1개)
   - 가능한 구체적으로 (예: "바이오" 대신 "바이오의약품")
   - 범용 사업(전 산업)인 경우 null

## 응답 형식 (JSON만)
\`\`\`json
{
  "targetType": ["COMPANY"],
  "requiredCertifications": [],
  "budgetAmount": null,
  "keywords": [],
  "primaryTargetIndustry": null
}
\`\`\``;
}

/**
 * Build a lightweight SME enrichment prompt for Tier 1 regex extraction
 * (pre-LLM, zero-cost extraction from structured API fields)
 */
export function extractSMEFieldsRegex(program: SMEProgramTextFields): Partial<SMEEnrichmentResult> {
  const result: Partial<SMEEnrichmentResult> = {
    targetType: [],
    requiredCertifications: [],
    budgetAmount: null,
    keywords: [],
    primaryTargetIndustry: null,
  };

  // Extract target type from supportTarget text
  const targetText = program.supportTarget || '';
  if (/중소기업|기업|벤처|스타트업|창업|소상공인/.test(targetText)) {
    result.targetType!.push('COMPANY');
  }
  if (/대학교|대학/.test(targetText)) {
    result.targetType!.push('UNIVERSITY');
  }
  if (/연구기관|연구소|출연연/.test(targetText)) {
    result.targetType!.push('RESEARCH_INSTITUTE');
  }
  if (/공공기관|지자체/.test(targetText)) {
    result.targetType!.push('PUBLIC_INSTITUTION');
  }
  // Default to COMPANY if no match (most SME24 programs target companies)
  if (result.targetType!.length === 0) {
    result.targetType!.push('COMPANY');
  }

  // Extract certifications from requiredCerts + text
  if (program.requiredCerts && program.requiredCerts.length > 0) {
    result.requiredCertifications = [...program.requiredCerts];
  }
  // Also scan text for certifications not in API field
  const allText = `${program.description || ''} ${program.supportTarget || ''}`;
  const certPatterns = [
    /이노비즈/g, /INNO-BIZ/gi, /벤처기업/g, /메인비즈/g, /Main-Biz/gi,
    /ISO\s?\d{4,5}/gi, /GMP/g, /HACCP/g,
  ];
  for (const pattern of certPatterns) {
    const matches = allText.match(pattern);
    if (matches) {
      for (const match of matches) {
        const normalized = match.trim();
        if (!result.requiredCertifications!.includes(normalized)) {
          result.requiredCertifications!.push(normalized);
        }
      }
    }
  }

  // Extract budget from supportScale text
  const scaleText = program.supportScale || '';
  const budgetPatterns = [
    // "최대 3억원" or "3억원 이내"
    /([\d,\.]+)\s*(억|백만|천만|만)\s*원/,
    // Direct won: "300,000,000원"
    /([\d,]+)\s*원/,
  ];
  for (const pattern of budgetPatterns) {
    const match = scaleText.match(pattern);
    if (match) {
      if (match[2]) {
        // Korean unit
        const num = parseFloat(match[1].replace(/,/g, ''));
        switch (match[2]) {
          case '억': result.budgetAmount = Math.round(num * 100_000_000); break;
          case '백만': result.budgetAmount = Math.round(num * 1_000_000); break;
          case '천만': result.budgetAmount = Math.round(num * 10_000_000); break;
          case '만': result.budgetAmount = Math.round(num * 10_000); break;
        }
      } else {
        // Direct won
        result.budgetAmount = parseInt(match[1].replace(/,/g, ''), 10) || null;
      }
      if (result.budgetAmount) break;
    }
  }

  // Extract primary industry from targetIndustry or bizType
  if (program.targetIndustry) {
    result.primaryTargetIndustry = program.targetIndustry;
  }

  return result;
}

/**
 * Map SME enrichment results to Prisma update data
 * for the sme_programs table
 */
export function buildSMEUpdatePayload(
  enrichment: Partial<SMEEnrichmentResult>
): Record<string, any> {
  const payload: Record<string, any> = {};

  if (enrichment.requiredCertifications && enrichment.requiredCertifications.length > 0) {
    // Note: sme_programs already has requiredCerts field from API
    // Only update if we found additional certifications
    payload.requiredCerts = enrichment.requiredCertifications;
  }

  if (enrichment.budgetAmount) {
    payload.maxSupportAmount = BigInt(enrichment.budgetAmount);
  }

  // Confidence based on extraction quality
  if (enrichment.confidence === 'HIGH' || enrichment.confidence === 'MEDIUM') {
    payload.eligibilityConfidence = enrichment.confidence;
  }

  payload.eligibilityLastUpdated = new Date();

  return payload;
}
