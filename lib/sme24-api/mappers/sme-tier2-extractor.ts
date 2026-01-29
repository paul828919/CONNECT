/**
 * SME Tier 2 Extractor — Claude Haiku for SME Eligibility Extraction
 *
 * Uses Anthropic Claude Haiku to extract eligibility criteria that Tier 1 regex missed.
 * This is a cost-optimized fallback for edge cases in SME program matching.
 *
 * Cost: ~$0.002 per program (single API call)
 * Model: claude-haiku-4-5-20251001
 * Pricing: $1/MTok input, $5/MTok output
 *
 * Fields extracted:
 * - regions: 지역 제한 (대구, 서울, 부산 등)
 * - companyScale: 기업 규모 (중소기업, 소상공인, 스타트업 등)
 * - minEmployees/maxEmployees: 직원 수 제한
 * - minRevenue/maxRevenue: 매출액 제한 (억원 단위)
 * - minBusinessAge/maxBusinessAge: 업력 제한 (년 단위)
 */

import Anthropic from '@anthropic-ai/sdk';
import { KoreanRegion } from '@prisma/client';

// ============================================================================
// Types
// ============================================================================

export interface Tier2EligibilityResult {
  regions: KoreanRegion[];
  companyScale: string[];
  minEmployees: number | null;
  maxEmployees: number | null;
  minRevenue: number | null;
  maxRevenue: number | null;
  minBusinessAge: number | null;
  maxBusinessAge: number | null;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  tokensUsed: {
    input: number;
    output: number;
  };
  cost: number; // in USD
}

interface HaikuResponse {
  regions: string[] | null;
  companyScale: string[] | null;
  minEmployees: number | null;
  maxEmployees: number | null;
  minRevenueOk: number | null; // 억원
  maxRevenueOk: number | null; // 억원
  minBusinessAge: number | null;
  maxBusinessAge: number | null;
}

// ============================================================================
// Configuration
// ============================================================================

const HAIKU_MODEL = 'claude-haiku-4-5-20251001';
const MAX_INPUT_CHARS = 4000; // ~1000 tokens for Korean text
const MAX_OUTPUT_TOKENS = 512;

// USD cost per token
const HAIKU_INPUT_COST_PER_TOKEN = 1 / 1_000_000; // $1/MTok
const HAIKU_OUTPUT_COST_PER_TOKEN = 5 / 1_000_000; // $5/MTok

// Region name to enum mapping
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

const ELIGIBILITY_EXTRACTION_PROMPT = `당신은 한국 중소기업 지원사업 공고문에서 자격 요건을 추출하는 전문가입니다.

다음 공고 정보에서 아래 필드를 추출하세요:

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
   - "업력 5년 이상" → min: 5, max: null

규칙:
- 값을 찾을 수 없으면 null
- 전국 대상이면 regions는 []
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
  "maxBusinessAge": null
}

---
공고 정보:
제목: {title}
설명: {description}
지원대상: {supportTarget}
---`;

// ============================================================================
// Main Extraction Function
// ============================================================================

/**
 * Extract eligibility criteria using Claude Haiku
 *
 * @param title Program title
 * @param description Program description
 * @param supportTarget Support target text
 * @returns Extracted eligibility with token usage and cost
 */
export async function extractEligibilityWithHaiku(
  title: string,
  description: string | null | undefined,
  supportTarget: string | null | undefined
): Promise<Tier2EligibilityResult> {
  const client = new Anthropic();

  // Truncate inputs to fit within token limit
  const truncatedDescription = (description || '').substring(0, 2500);
  const truncatedSupportTarget = (supportTarget || '').substring(0, 500);

  const prompt = ELIGIBILITY_EXTRACTION_PROMPT.replace('{title}', title)
    .replace('{description}', truncatedDescription)
    .replace('{supportTarget}', truncatedSupportTarget);

  try {
    const response = await client.messages.create({
      model: HAIKU_MODEL,
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

    const parsed: HaikuResponse = JSON.parse(jsonMatch[0]);

    // Calculate costs
    const inputTokens = response.usage.input_tokens;
    const outputTokens = response.usage.output_tokens;
    const cost =
      inputTokens * HAIKU_INPUT_COST_PER_TOKEN + outputTokens * HAIKU_OUTPUT_COST_PER_TOKEN;

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

    // Determine confidence based on response quality
    const hasData =
      regions.length > 0 ||
      (parsed.companyScale && parsed.companyScale.length > 0) ||
      parsed.minEmployees !== null ||
      parsed.maxEmployees !== null ||
      parsed.minRevenueOk !== null ||
      parsed.maxRevenueOk !== null ||
      parsed.minBusinessAge !== null ||
      parsed.maxBusinessAge !== null;

    const confidence = hasData ? 'MEDIUM' : 'LOW';

    return {
      regions,
      companyScale: parsed.companyScale || [],
      minEmployees: parsed.minEmployees,
      maxEmployees: parsed.maxEmployees,
      minRevenue: parsed.minRevenueOk,
      maxRevenue: parsed.maxRevenueOk,
      minBusinessAge: parsed.minBusinessAge,
      maxBusinessAge: parsed.maxBusinessAge,
      confidence,
      tokensUsed: {
        input: inputTokens,
        output: outputTokens,
      },
      cost,
    };
  } catch (error) {
    console.error('Haiku extraction error:', error);

    // Return empty result on error
    return {
      regions: [],
      companyScale: [],
      minEmployees: null,
      maxEmployees: null,
      minRevenue: null,
      maxRevenue: null,
      minBusinessAge: null,
      maxBusinessAge: null,
      confidence: 'LOW',
      tokensUsed: { input: 0, output: 0 },
      cost: 0,
    };
  }
}

/**
 * Check if Tier 2 extraction is needed based on Tier 1 results
 *
 * @param tier1Result Result from Tier 1 extraction
 * @returns true if LLM extraction should be attempted
 */
export function shouldUseTier2(tier1Result: {
  regions: KoreanRegion[];
  companyScale: string[];
  minEmployees: number | null;
  maxEmployees: number | null;
  minRevenue: number | null;
  maxRevenue: number | null;
  minBusinessAge: number | null;
  maxBusinessAge: number | null;
}): boolean {
  // Use Tier 2 if Tier 1 found nothing
  const hasNoData =
    tier1Result.regions.length === 0 &&
    tier1Result.companyScale.length === 0 &&
    tier1Result.minEmployees === null &&
    tier1Result.maxEmployees === null &&
    tier1Result.minRevenue === null &&
    tier1Result.maxRevenue === null &&
    tier1Result.minBusinessAge === null &&
    tier1Result.maxBusinessAge === null;

  return hasNoData;
}
