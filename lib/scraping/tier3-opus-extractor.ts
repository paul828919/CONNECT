/**
 * Tier 3 Opus Extractor — Claude Opus 4.5 Full-Document Analysis
 *
 * Selective, high-cost extraction for announcements where Tier 1+2 failed.
 * Provides comprehensive analysis with reasoning, plus generates pattern
 * suggestions for improving Tier 1/2 extraction.
 *
 * Cost: ~$0.20 per announcement (selective, <5% of announcements)
 * Model: claude-opus-4-5-20251101
 * Pricing: $5/MTok input, $25/MTok output
 *
 * Trigger conditions:
 *   1. >50% of fields still missing after Tier 1+2
 *   2. New format detected (Tier 1 extracted <3 fields AND Tier 2 also failed)
 *   3. Admin flag: processing status NEEDS_OPUS
 *   4. Format anomaly: very little text extracted (scanned document)
 *
 * Feedback loop:
 *   Tier 3 results are stored in tier3_feedback table with:
 *   - The value Opus extracted
 *   - The original context snippet
 *   - A pattern suggestion for Tier 1 improvement
 *   - Whether the suggestion has been incorporated
 */

import Anthropic from '@anthropic-ai/sdk';
import type { Tier1Result, Tier1Field, FieldGroup } from './tier1-patterns';
import type { Tier2Result } from './tier2-haiku-extractor';

// ============================================================================
// Types
// ============================================================================

export interface Tier3Result {
  /** All extracted fields (full document analysis) */
  fields: Record<string, any>;
  /** Total tokens used */
  tokensUsed: number;
  /** Estimated cost in KRW */
  costKRW: number;
  /** Opus reasoning about the document structure */
  reasoning: string;
  /** Pattern suggestions for Tier 1 improvement */
  patternSuggestions: PatternSuggestion[];
}

export interface PatternSuggestion {
  field: string;
  /** The value Opus extracted */
  extractedValue: any;
  /** The surrounding text context where the value was found */
  contextSnippet: string;
  /** Suggested regex pattern or keyword */
  suggestedPattern: string;
  /** Why existing patterns failed */
  failureReason: string;
}

// ============================================================================
// Configuration
// ============================================================================

const OPUS_MODEL = 'claude-opus-4-5-20251101';
const MAX_INPUT_CHARS = 15000; // ~3500 tokens for Korean text
const MAX_OUTPUT_TOKENS = 4096;

// KRW cost per token (1 USD = 1,350 KRW approx)
const OPUS_INPUT_COST_PER_TOKEN = (5 / 1_000_000) * 1350;  // $5/MTok * KRW
const OPUS_OUTPUT_COST_PER_TOKEN = (25 / 1_000_000) * 1350; // $25/MTok * KRW

// ============================================================================
// Full Extraction Prompt (Sections A-D)
// ============================================================================

function buildFullExtractionPrompt(
  tier1Results: Tier1Result[],
  tier2Results: Tier2Result[]
): string {
  // Summarize what was already extracted by Tier 1/2
  const alreadyExtracted = [
    ...tier1Results.map(r => `${r.field}: ${JSON.stringify(r.value)} (Tier1, ${r.confidence})`),
    ...tier2Results
      .filter(r => r.value !== null)
      .map(r => `${r.field}: ${JSON.stringify(r.value)} (Tier2, ${r.confidence})`),
  ].join('\n');

  const failedFields = [
    ...tier2Results.filter(r => r.value === null).map(r => r.field),
  ];

  return `당신은 한국 정부 R&D 공고문 분석 전문가입니다.

## 배경
이 공고문에서 자동 추출 시스템(Tier 1: 정규식, Tier 2: Haiku)이 일부 필드 추출에 실패했습니다.
당신의 역할은:
1. 모든 필드를 정확하게 추출
2. 기존 시스템이 실패한 이유를 분석
3. 향후 자동 추출을 개선할 패턴을 제안

## 이미 추출된 필드 (참고용)
${alreadyExtracted || '(없음 — 모든 필드 추출 실패)'}

## 추출 실패 필드 (중점 분석)
${failedFields.join(', ') || '(모든 필드 재검증 필요)'}

## 추출 요청 필드 (Section A ~ D)

### Section A: 일정 및 운영 정보
- applicationStart: 접수시작일 (YYYY-MM-DD)
- deadline: 접수마감일 (YYYY-MM-DD)
- deadlineTimeRule: 마감시간 규칙 (예: "18:00까지 시스템 제출 완료")
- publishedAt: 공고일 (YYYY-MM-DD)
- submissionSystem: 접수시스템 (예: "IRIS", "범부처통합혁신사업관리시스템")
- contactInfo: 문의처 (기관명, 전화번호, 이메일)

### Section B: 예산 및 기간
- budgetAmount: 총 사업비 (숫자, 원 단위)
- budgetPerProject: 과제당 지원금 (숫자, 원 단위)
- fundingRate: 정부/민간 분담비율 (예: "정부 75%, 민간 25%")
- fundingPeriod: 연구/사업 기간 (예: "2년", "36개월")
- numAwards: 선정 과제 수 (숫자)

### Section C: 지원 자격
- targetType: 대상 조직유형 (배열: "COMPANY", "RESEARCH_INSTITUTE", "UNIVERSITY", "PUBLIC_INSTITUTION")
- leadRoleAllowed: 주관기관 자격 (배열)
- coRoleAllowed: 참여/공동연구기관 자격 (배열)
- requiresResearchInstitute: 컨소시엄 필수 여부 (boolean)
- requiredCertifications: 필요 인증 (배열)
- exclusionRules: 참여제한 사유 (배열)

### Section D: 기술 도메인
- keywords: 기술 키워드 (배열, 최대 10개)
- primaryTargetIndustry: 주요 대상 산업 (1개)
- semanticSubDomain: 세부 기술분류 (JSON)

## 응답 형식 (반드시 이 JSON 구조로 응답)
\`\`\`json
{
  "fields": {
    "applicationStart": "<YYYY-MM-DD 또는 null>",
    "deadline": "<YYYY-MM-DD 또는 null>",
    "deadlineTimeRule": "<규칙 또는 null>",
    "publishedAt": "<YYYY-MM-DD 또는 null>",
    "submissionSystem": "<시스템명 또는 null>",
    "contactInfo": "<문의처 또는 null>",
    "budgetAmount": <숫자 또는 null>,
    "budgetPerProject": <숫자 또는 null>,
    "fundingRate": "<비율 또는 null>",
    "fundingPeriod": "<기간 또는 null>",
    "numAwards": <숫자 또는 null>,
    "targetType": ["<조직유형>"],
    "leadRoleAllowed": ["<기관유형>"],
    "coRoleAllowed": ["<기관유형>"],
    "requiresResearchInstitute": <boolean>,
    "requiredCertifications": ["<인증명>"],
    "exclusionRules": ["<제한사유>"],
    "keywords": ["<키워드>"],
    "primaryTargetIndustry": "<산업명>",
    "semanticSubDomain": {}
  },
  "reasoning": "<문서 구조 및 추출 과정 설명 (한국어, 2-3문장)>",
  "patternSuggestions": [
    {
      "field": "<필드명>",
      "extractedValue": "<추출한 값>",
      "contextSnippet": "<값이 나타난 원문 주변 텍스트 50자>",
      "suggestedPattern": "<제안 정규식 패턴>",
      "failureReason": "<기존 패턴이 실패한 이유>"
    }
  ]
}
\`\`\``;
}

// ============================================================================
// Tier 3 Opus Extractor Class
// ============================================================================

export class Tier3OpusExtractor {
  private jobId: string;
  private maxCostKRW: number;
  private client: Anthropic | null = null;

  constructor(jobId: string, maxCostKRW: number = 300) {
    this.jobId = jobId;
    this.maxCostKRW = maxCostKRW;
  }

  /**
   * Get or create Anthropic client (lazy initialization)
   */
  private getClient(): Anthropic {
    if (!this.client) {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey || apiKey === 'your_api_key_here') {
        throw new Error('ANTHROPIC_API_KEY not configured for Tier 3 extraction');
      }
      this.client = new Anthropic({ apiKey });
    }
    return this.client;
  }

  /**
   * Full-document extraction with Opus
   */
  async extractAll(
    announcementText: string,
    tier1Results: Tier1Result[],
    tier2Results: Tier2Result[]
  ): Promise<Tier3Result> {
    console.log(`[TIER3] Job ${this.jobId}: Starting Opus full-document extraction...`);

    const truncatedText = announcementText.substring(0, MAX_INPUT_CHARS);
    const prompt = buildFullExtractionPrompt(tier1Results, tier2Results);

    const client = this.getClient();
    const startTime = Date.now();

    const response = await client.messages.create({
      model: OPUS_MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      temperature: 0,
      system: '당신은 한국 정부 R&D 공고문 분석 전문가입니다. 주어진 공고문에서 구조화된 데이터를 정확하게 추출하고, 자동 추출 시스템 개선을 위한 패턴을 제안합니다. 반드시 JSON 형식으로 응답하세요.',
      messages: [
        {
          role: 'user',
          content: `${prompt}\n\n---\n공고문 텍스트:\n${truncatedText}`,
        },
      ],
    });

    const duration = Date.now() - startTime;
    const inputTokens = response.usage.input_tokens;
    const outputTokens = response.usage.output_tokens;
    const totalTokens = inputTokens + outputTokens;
    const costKRW = (inputTokens * OPUS_INPUT_COST_PER_TOKEN) + (outputTokens * OPUS_OUTPUT_COST_PER_TOKEN);

    console.log(`[TIER3] Job ${this.jobId}: Opus completed — ${totalTokens} tokens, ${costKRW.toFixed(2)} KRW, ${duration}ms`);

    // Parse response
    const content = response.content
      .filter((block: any) => block.type === 'text')
      .map((block: any) => ('text' in block ? block.text : ''))
      .join('');

    let parsed: any;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn(`[TIER3] Job ${this.jobId}: No JSON found in Opus response`);
        return {
          fields: {},
          tokensUsed: totalTokens,
          costKRW,
          reasoning: 'Failed to parse Opus response',
          patternSuggestions: [],
        };
      }
      parsed = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.warn(`[TIER3] Job ${this.jobId}: Failed to parse Opus response:`, content.substring(0, 300));
      return {
        fields: {},
        tokensUsed: totalTokens,
        costKRW,
        reasoning: 'JSON parse error',
        patternSuggestions: [],
      };
    }

    const result: Tier3Result = {
      fields: parsed.fields || {},
      tokensUsed: totalTokens,
      costKRW,
      reasoning: parsed.reasoning || '',
      patternSuggestions: parsed.patternSuggestions || [],
    };

    // Store feedback for future Tier 1 pattern improvement
    await this.storeFeedback(result, tier1Results, tier2Results);

    return result;
  }

  /**
   * Store Tier 3 feedback for pattern improvement
   */
  private async storeFeedback(
    result: Tier3Result,
    tier1Results: Tier1Result[],
    tier2Results: Tier2Result[]
  ): Promise<void> {
    // tier3_feedback table will be created in Step 7 (schema changes)
    // For now, log to console for visibility
    if (result.patternSuggestions.length > 0) {
      console.log(`[TIER3] Job ${this.jobId}: ${result.patternSuggestions.length} pattern suggestions:`);
      for (const suggestion of result.patternSuggestions) {
        console.log(`  → ${suggestion.field}: "${suggestion.suggestedPattern}" (reason: ${suggestion.failureReason})`);
      }
    }

    // Future: Write to tier3_feedback table (after Step 7 schema migration)
    // This will be enabled once the table exists
    try {
      // Check if tier3_feedback model exists (won't exist until schema migration)
      const dbAny = (globalThis as any).__prismaClient || null;
      if (dbAny?.tier3_feedback) {
        for (const suggestion of result.patternSuggestions) {
          const tier1Value = tier1Results.find(r => r.field === suggestion.field)?.value ?? null;
          const tier2Value = tier2Results.find(r => r.field === suggestion.field)?.value ?? null;

          await dbAny.tier3_feedback.create({
            data: {
              scrapingJobId: this.jobId,
              field: suggestion.field,
              tier1Value: tier1Value ? JSON.stringify(tier1Value) : null,
              tier2Value: tier2Value ? JSON.stringify(tier2Value) : null,
              tier3Value: JSON.stringify(suggestion.extractedValue),
              originalContext: suggestion.contextSnippet,
              opusReasoning: suggestion.failureReason,
              patternSuggestion: suggestion.suggestedPattern,
              incorporated: false,
            },
          });
        }
        console.log(`[TIER3] Job ${this.jobId}: Stored ${result.patternSuggestions.length} feedback records`);
      }
    } catch (error: any) {
      // Expected to fail until schema migration in Step 7
      console.log(`[TIER3] Job ${this.jobId}: Feedback storage skipped (table not yet created)`);
    }
  }
}
