/**
 * SME Tier 3 Document Extractor — LLM Extraction from Full Announcement Documents
 *
 * Extracts eligibility criteria from full document text (PDF/HWP/HWPX) using
 * Claude Haiku 4.5 (default) or Opus 4.5.
 *
 * Unlike Tier 2 which only has API description text (~4,000 chars), Tier 3 processes
 * the full announcement document (~50,000 chars) which contains detailed eligibility
 * tables, compound conditions, and certification requirements.
 *
 * Additional fields beyond Tier 2:
 * - requiredCerts: 필요 인증 (이노비즈, 벤처인증, ISO 등)
 * - targetIndustry: 대상 업종 (제조업, IT, 바이오 등)
 * - exclusionConditions: 배제 조건 (세금 체납, 휴·폐업 등)
 * - supportAmountMin/Max: 지원 금액 범위 (만원 단위)
 *
 * Cost per program:
 * - Haiku: ~$0.005 (50K chars input ≈ 12.5K tokens)
 * - Opus: ~$0.05 (15x more expensive)
 */

import Anthropic from '@anthropic-ai/sdk';
import { KoreanRegion } from '@prisma/client';

// ============================================================================
// Types
// ============================================================================

export interface Tier3ExtractionResult {
  // Same as Tier 2
  regions: KoreanRegion[];
  companyScale: string[];
  minEmployees: number | null;
  maxEmployees: number | null;
  minRevenue: number | null; // 억원
  maxRevenue: number | null; // 억원
  minBusinessAge: number | null;
  maxBusinessAge: number | null;
  // Tier 3 additions
  requiredCerts: string[];
  targetIndustry: string | null;
  exclusionConditions: string[];
  supportAmountMin: number | null; // 만원
  supportAmountMax: number | null; // 만원
  // Metadata
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  model: string;
  tokensUsed: {
    input: number;
    output: number;
  };
  cost: number; // in USD
}

interface DocumentExtractionResponse {
  regions: string[] | null;
  companyScale: string[] | null;
  minEmployees: number | null;
  maxEmployees: number | null;
  minRevenueOk: number | null; // 억원
  maxRevenueOk: number | null; // 억원
  minBusinessAge: number | null;
  maxBusinessAge: number | null;
  requiredCerts: string[] | null;
  targetIndustry: string | null;
  exclusionConditions: string[] | null;
  supportAmountMin: number | null; // 만원
  supportAmountMax: number | null; // 만원
}

// ============================================================================
// Configuration
// ============================================================================

const MODELS = {
  haiku: 'claude-haiku-4-5-20251001',
  opus: 'claude-opus-4-5-20251101',
} as const;

const MODEL_COST_PER_TOKEN = {
  haiku: {
    input: 1 / 1_000_000, // $1/MTok
    output: 5 / 1_000_000, // $5/MTok
  },
  opus: {
    input: 15 / 1_000_000, // $15/MTok
    output: 75 / 1_000_000, // $75/MTok
  },
} as const;

const MAX_INPUT_CHARS = 50_000;
const MAX_OUTPUT_TOKENS = 1024;

// Region name to enum mapping (same as Tier 2)
const REGION_NAME_TO_ENUM: Record<string, KoreanRegion> = {
  서울: 'SEOUL',
  경기: 'GYEONGGI',
  인천: 'INCHEON',
  부산: 'BUSAN',
  대구: 'DAEGU',
  광주: 'GWANGJU',
  대전: 'DAEJEON',
  울산: 'ULSAN',
  세종: 'SEJONG',
  강원: 'GANGWON',
  충북: 'CHUNGBUK',
  충남: 'CHUNGNAM',
  전북: 'JEONBUK',
  전남: 'JEONNAM',
  경북: 'GYEONGBUK',
  경남: 'GYEONGNAM',
  제주: 'JEJU',
};

// ============================================================================
// Prompt Template
// ============================================================================

const DOCUMENT_EXTRACTION_PROMPT = `당신은 한국 중소기업 지원사업 공고 문서에서 자격 요건을 추출하는 전문가입니다.

아래 공고 전문에서 다음 필드들을 정확하게 추출하세요.

추출 필드:
1. regions: 지역 제한 (예: ["대구"], ["서울", "경기"], 전국이면 [])
   - "소담스퀘어 in 대구" → ["대구"]
   - "서울특별시 소재 기업" → ["서울"]
   - 지역 제한 없으면 []

2. companyScale: 기업 규모 배열 (예: ["중소기업"], ["소상공인", "예비창업자"])
   - 가능한 값: 중소기업, 소상공인, 예비창업자, 1인기업, 스타트업, 벤처기업, 중견기업, 창업기업

3. minEmployees, maxEmployees: 직원 수 제한 (정수)
   - "상시근로자 5인 이상 300인 미만" → min: 5, max: 299
   - "종업원 50명 이하" → min: null, max: 50

4. minRevenueOk, maxRevenueOk: 매출액 제한 (억원 단위 숫자)
   - "매출액 100억 미만" → min: null, max: 99.9
   - "연매출 10억 이상 50억 이하" → min: 10, max: 50

5. minBusinessAge, maxBusinessAge: 업력 제한 (년 단위 정수)
   - "창업 후 7년 이내" → min: null, max: 7
   - "창업 3년 초과 7년 이내" → min: 4, max: 7

6. requiredCerts: 필요 인증/자격 배열
   - 예: ["이노비즈", "벤처인증", "ISO 9001", "메인비즈"]
   - 인증 요건 없으면 []

7. targetIndustry: 대상 업종 (주요 업종 하나만)
   - 예: "제조업", "IT/SW", "바이오", "환경/에너지"
   - 업종 제한 없으면 null

8. exclusionConditions: 배제/제한 조건 배열
   - 예: ["세금 체납 기업", "휴업 또는 폐업 기업", "금융기관 채무불이행"]
   - 배제 조건 없으면 []

9. supportAmountMin, supportAmountMax: 지원 금액 (만원 단위 정수)
   - "최대 3억원" → min: null, max: 30000
   - "1억~5억원" → min: 10000, max: 50000
   - 금액 정보 없으면 null

규칙:
- 값을 찾을 수 없으면 null
- 전국 대상이면 regions는 []
- 복합 조건 주의: "A이면서 B인 기업" → companyScale에 A, B 모두 포함
- 표(테이블) 형식 데이터도 정확히 파싱
- JSON만 응답 (설명 불필요)

응답 형식:
{
  "regions": [],
  "companyScale": [],
  "minEmployees": null,
  "maxEmployees": null,
  "minRevenueOk": null,
  "maxRevenueOk": null,
  "minBusinessAge": null,
  "maxBusinessAge": null,
  "requiredCerts": [],
  "targetIndustry": null,
  "exclusionConditions": [],
  "supportAmountMin": null,
  "supportAmountMax": null
}

---
공고 제목: {title}

공고 본문:
{documentText}
---`;

// ============================================================================
// Main Extraction Function
// ============================================================================

/**
 * Extract eligibility criteria from full document text using Claude LLM
 *
 * @param documentText Full document text (up to 50,000 chars)
 * @param title Program title for context
 * @param model LLM model to use (default: haiku)
 * @returns Extracted eligibility with all fields, token usage, and cost
 */
export async function extractEligibilityFromDocument(
  documentText: string,
  title: string,
  model: 'haiku' | 'opus' = 'haiku'
): Promise<Tier3ExtractionResult> {
  const client = new Anthropic();
  const modelId = MODELS[model];
  const costConfig = MODEL_COST_PER_TOKEN[model];

  // Truncate document to limit
  const truncatedText = documentText.substring(0, MAX_INPUT_CHARS);

  const prompt = DOCUMENT_EXTRACTION_PROMPT
    .replace('{title}', title)
    .replace('{documentText}', truncatedText);

  try {
    const response = await client.messages.create({
      model: modelId,
      max_tokens: MAX_OUTPUT_TOKENS,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Parse response
    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    // Extract JSON from response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed: DocumentExtractionResponse = JSON.parse(jsonMatch[0]);

    // Calculate costs
    const inputTokens = response.usage.input_tokens;
    const outputTokens = response.usage.output_tokens;
    const cost = inputTokens * costConfig.input + outputTokens * costConfig.output;

    // Map regions to enums
    const regions: KoreanRegion[] = [];
    if (parsed.regions && Array.isArray(parsed.regions)) {
      for (const r of parsed.regions) {
        const normalized = r.replace(/특별시|광역시|도|특별자치시|특별자치도/g, '').trim();
        if (REGION_NAME_TO_ENUM[normalized]) {
          regions.push(REGION_NAME_TO_ENUM[normalized]);
        }
      }
    }

    // Determine confidence based on response richness
    const fieldCount = [
      regions.length > 0,
      parsed.companyScale && parsed.companyScale.length > 0,
      parsed.minEmployees !== null || parsed.maxEmployees !== null,
      parsed.minRevenueOk !== null || parsed.maxRevenueOk !== null,
      parsed.minBusinessAge !== null || parsed.maxBusinessAge !== null,
      parsed.requiredCerts && parsed.requiredCerts.length > 0,
      parsed.targetIndustry !== null,
      parsed.exclusionConditions && parsed.exclusionConditions.length > 0,
      parsed.supportAmountMin !== null || parsed.supportAmountMax !== null,
    ].filter(Boolean).length;

    // HIGH if 4+ fields, MEDIUM if 1-3, LOW if 0
    const confidence = fieldCount >= 4 ? 'HIGH' : fieldCount > 0 ? 'MEDIUM' : 'LOW';

    return {
      regions,
      companyScale: parsed.companyScale || [],
      minEmployees: parsed.minEmployees,
      maxEmployees: parsed.maxEmployees,
      minRevenue: parsed.minRevenueOk,
      maxRevenue: parsed.maxRevenueOk,
      minBusinessAge: parsed.minBusinessAge,
      maxBusinessAge: parsed.maxBusinessAge,
      requiredCerts: parsed.requiredCerts || [],
      targetIndustry: parsed.targetIndustry,
      exclusionConditions: parsed.exclusionConditions || [],
      supportAmountMin: parsed.supportAmountMin,
      supportAmountMax: parsed.supportAmountMax,
      confidence,
      model: modelId,
      tokensUsed: {
        input: inputTokens,
        output: outputTokens,
      },
      cost,
    };
  } catch (error) {
    console.error(`[Tier3] ${model} extraction error:`, error);

    return {
      regions: [],
      companyScale: [],
      minEmployees: null,
      maxEmployees: null,
      minRevenue: null,
      maxRevenue: null,
      minBusinessAge: null,
      maxBusinessAge: null,
      requiredCerts: [],
      targetIndustry: null,
      exclusionConditions: [],
      supportAmountMin: null,
      supportAmountMax: null,
      confidence: 'LOW',
      model: modelId,
      tokensUsed: { input: 0, output: 0 },
      cost: 0,
    };
  }
}
