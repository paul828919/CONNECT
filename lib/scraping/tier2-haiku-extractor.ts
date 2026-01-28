/**
 * Tier 2 Haiku Extractor — Claude Haiku 4.5 Field Extraction
 *
 * Uses Anthropic Claude Haiku 4.5 to extract fields that Tier 1 regex missed.
 * Batches related fields into groups (A-D) to minimize API calls.
 *
 * Cost: ~$0.003 per announcement (average 1-2 group calls)
 * Model: claude-haiku-4-5-20251101
 * Pricing: $1/MTok input, $5/MTok output
 *
 * Field Groups:
 *   A (Dates + Ops): applicationStart, deadline, deadlineTimeRule, submissionSystem, contactInfo
 *   B (Budget): budgetAmount, budgetPerProject, fundingRate, fundingPeriod, numAwards
 *   C (Eligibility): targetType, leadRoleAllowed, coRoleAllowed, requiresResearchInstitute,
 *                     requiredCertifications, exclusionRules
 *   D (Domain): keywords, primaryTargetIndustry, semanticSubDomain
 */

import Anthropic from '@anthropic-ai/sdk';
import { db } from '@/lib/db';
import type { Tier1Field, FieldGroup } from './tier1-patterns';

// ============================================================================
// Types
// ============================================================================

export interface Tier2Result {
  field: Tier1Field;
  group: FieldGroup;
  value: any;
  confidence: string;
  tokensUsed: number;
}

// ============================================================================
// Configuration
// ============================================================================

const HAIKU_MODEL = 'claude-haiku-4-5-20251101';
const MAX_INPUT_CHARS = 4000; // ~1000 tokens for Korean text
const MAX_OUTPUT_TOKENS = 1024;

// KRW cost per token (1 USD = 1,350 KRW approx)
const HAIKU_INPUT_COST_PER_TOKEN = (1 / 1_000_000) * 1350;  // $1/MTok * KRW
const HAIKU_OUTPUT_COST_PER_TOKEN = (5 / 1_000_000) * 1350; // $5/MTok * KRW

// ============================================================================
// Prompt Templates (by field group)
// ============================================================================

function buildGroupAPrompt(missingFields: Tier1Field[]): string {
  const fieldDescriptions = missingFields.map(f => {
    switch (f) {
      case 'applicationStart': return '- application_open_at: 접수시작일 (format: YYYY-MM-DD)';
      case 'deadline': return '- application_close_at: 접수마감일 (format: YYYY-MM-DD)';
      case 'deadlineTimeRule': return '- deadline_time_rule: 마감시간 규칙 (예: "18:00까지 시스템 제출 완료")';
      case 'publishedAt': return '- published_at: 공고일 (format: YYYY-MM-DD)';
      case 'submissionSystem': return '- submission_system: 접수시스템명 (예: "IRIS", "범부처통합혁신사업관리시스템")';
      case 'contactInfo': return '- contact: 문의처 (기관명 | 전화번호 | 이메일)';
      default: return '';
    }
  }).filter(Boolean).join('\n');

  return `다음 한국 정부 R&D 공고문에서 아래 필드를 추출하세요.

추출할 필드:
${fieldDescriptions}

규칙:
- 값을 찾을 수 없으면 null로 표시
- 날짜는 YYYY-MM-DD 형식으로
- JSON 형식으로만 응답 (설명 불필요)

응답 형식 (JSON):
{
${missingFields.map(f => `  "${f}": <값 또는 null>`).join(',\n')}
}`;
}

function buildGroupBPrompt(missingFields: Tier1Field[]): string {
  const fieldDescriptions = missingFields.map(f => {
    switch (f) {
      case 'budgetAmount': return '- budget_total: 총 사업비/지원규모 (숫자, 원 단위). 예: "52억원" → 5200000000';
      case 'budgetPerProject': return '- budget_per_project: 과제당 지원금 (숫자, 원 단위). 예: "300백만원" → 300000000';
      case 'fundingRate': return '- funding_rate: 정부/민간 분담비율 (예: "정부 75%, 민간 25%")';
      case 'fundingPeriod': return '- funding_period: 연구/사업 기간 (예: "2년", "36개월")';
      case 'numAwards': return '- num_awards: 선정 과제/기업 수 (숫자)';
      default: return '';
    }
  }).filter(Boolean).join('\n');

  return `다음 한국 정부 R&D 공고문에서 예산 및 기간 관련 필드를 추출하세요.

추출할 필드:
${fieldDescriptions}

규칙:
- 금액은 원(KRW) 단위 숫자로 변환 (억원 = ×100,000,000, 백만원 = ×1,000,000)
- R&D 지원금 우선 (투자 요건 금액과 구별)
- 과제당 금액과 총 사업비 구별
- 값을 찾을 수 없으면 null
- JSON 형식으로만 응답

응답 형식 (JSON):
{
${missingFields.map(f => `  "${f}": <값 또는 null>`).join(',\n')}
}`;
}

function buildGroupCPrompt(missingFields: Tier1Field[]): string {
  const fieldDescriptions = missingFields.map(f => {
    switch (f) {
      case 'targetType': return '- target_type: 지원대상 조직유형 배열 ["COMPANY", "RESEARCH_INSTITUTE", "UNIVERSITY", "PUBLIC_INSTITUTION"]';
      case 'leadRoleAllowed': return '- lead_role_allowed: 주관기관 자격 (배열, 예: ["중소기업", "중견기업"])';
      case 'coRoleAllowed': return '- co_role_allowed: 참여/공동연구기관 자격 (배열, 예: ["대학", "연구기관"])';
      case 'requiresResearchInstitute': return '- requires_research_institute: 컨소시엄/산학연 필수 여부 (true/false)';
      case 'requiredCertifications': return '- required_certifications: 필요 인증/자격 (배열, 예: ["벤처기업", "INNO-BIZ"])';
      case 'exclusionRules': return '- exclusion_rules: 신청제외/참여제한 사유 (배열)';
      default: return '';
    }
  }).filter(Boolean).join('\n');

  return `다음 한국 정부 R&D 공고문에서 지원자격 및 요건 필드를 추출하세요.

추출할 필드:
${fieldDescriptions}

규칙:
- 조직유형은 정해진 enum 값만 사용: COMPANY, RESEARCH_INSTITUTE, UNIVERSITY, PUBLIC_INSTITUTION
- 배열 필드는 관련 항목을 쉼표로 구분
- 명시되지 않은 정보는 null
- JSON 형식으로만 응답

응답 형식 (JSON):
{
${missingFields.map(f => `  "${f}": <값 또는 null>`).join(',\n')}
}`;
}

function buildGroupDPrompt(missingFields: Tier1Field[]): string {
  const fieldDescriptions = missingFields.map(f => {
    switch (f) {
      case 'keywords': return '- keywords: 기술 키워드 (배열, 최대 10개, 예: ["인공지능", "양자컴퓨팅", "바이오"])';
      case 'primaryTargetIndustry': return '- primary_target_industry: 주요 대상 산업 (1개, 예: "바이오의약품", "반도체", "자율주행")';
      case 'semanticSubDomain': return '- semantic_sub_domain: 세부 기술분류 (JSON, 예: {"targetOrganism": "HUMAN", "applicationArea": "DIAGNOSTICS"})';
      default: return '';
    }
  }).filter(Boolean).join('\n');

  return `다음 한국 정부 R&D 공고문에서 기술 도메인 및 키워드를 추출하세요.

추출할 필드:
${fieldDescriptions}

규칙:
- 키워드는 구체적인 기술 용어 (일반적인 "연구", "개발" 제외)
- 대상 산업은 가능한 구체적으로 (예: "바이오" 대신 "바이오의약품")
- JSON 형식으로만 응답

응답 형식 (JSON):
{
${missingFields.map(f => `  "${f}": <값 또는 null>`).join(',\n')}
}`;
}

const GROUP_PROMPT_BUILDERS: Record<FieldGroup, (fields: Tier1Field[]) => string> = {
  A: buildGroupAPrompt,
  B: buildGroupBPrompt,
  C: buildGroupCPrompt,
  D: buildGroupDPrompt,
};

// ============================================================================
// Tier 2 Haiku Extractor Class
// ============================================================================

export class Tier2HaikuExtractor {
  private jobId: string;
  private maxCostKRW: number;
  private totalCostKRW: number = 0;
  private client: Anthropic | null = null;

  constructor(jobId: string, maxCostKRW: number = 50) {
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
        throw new Error('ANTHROPIC_API_KEY not configured for Tier 2 extraction');
      }
      this.client = new Anthropic({ apiKey });
    }
    return this.client;
  }

  /**
   * Extract fields for specified groups
   */
  async extractFields(
    announcementText: string,
    missingByGroup: Record<FieldGroup, Tier1Field[]>,
    groupsToProcess: FieldGroup[]
  ): Promise<Tier2Result[]> {
    const results: Tier2Result[] = [];

    // Truncate text to fit context window
    const truncatedText = announcementText.substring(0, MAX_INPUT_CHARS);

    for (const group of groupsToProcess) {
      const missingFields = missingByGroup[group];
      if (missingFields.length === 0) continue;

      // Check cost budget
      if (this.totalCostKRW >= this.maxCostKRW) {
        console.log(`[TIER2] Job ${this.jobId}: Cost limit reached (${this.totalCostKRW.toFixed(1)} / ${this.maxCostKRW} KRW), skipping group ${group}`);
        break;
      }

      try {
        const groupResults = await this.extractGroup(group, missingFields, truncatedText);
        results.push(...groupResults);
      } catch (error: any) {
        console.error(`[TIER2] Job ${this.jobId}: Group ${group} extraction failed:`, error.message);
        // Continue with next group on failure
      }
    }

    // Log total cost
    await this.logCost(results);

    return results;
  }

  /**
   * Extract fields for a single group via Haiku API call
   */
  private async extractGroup(
    group: FieldGroup,
    missingFields: Tier1Field[],
    text: string
  ): Promise<Tier2Result[]> {
    const promptBuilder = GROUP_PROMPT_BUILDERS[group];
    const systemPrompt = promptBuilder(missingFields);

    console.log(`[TIER2] Job ${this.jobId}: Calling Haiku for group ${group} (${missingFields.length} fields)`);

    const client = this.getClient();
    const startTime = Date.now();

    const response = await client.messages.create({
      model: HAIKU_MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      temperature: 0, // Deterministic for extraction
      system: 'You are a Korean R&D government announcement data extraction specialist. Extract ONLY the requested fields from the provided text. Respond with valid JSON only.',
      messages: [
        {
          role: 'user',
          content: `${systemPrompt}\n\n---\n공고문 텍스트:\n${text}`,
        },
      ],
    });

    const duration = Date.now() - startTime;
    const inputTokens = response.usage.input_tokens;
    const outputTokens = response.usage.output_tokens;
    const totalTokens = inputTokens + outputTokens;
    const costKRW = (inputTokens * HAIKU_INPUT_COST_PER_TOKEN) + (outputTokens * HAIKU_OUTPUT_COST_PER_TOKEN);
    this.totalCostKRW += costKRW;

    console.log(`[TIER2] Job ${this.jobId}: Group ${group} — ${totalTokens} tokens, ${costKRW.toFixed(2)} KRW, ${duration}ms`);

    // Parse response
    const content = response.content
      .filter((block: any) => block.type === 'text')
      .map((block: any) => ('text' in block ? block.text : ''))
      .join('');

    let parsed: Record<string, any>;
    try {
      // Try to extract JSON from response (handle markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn(`[TIER2] Job ${this.jobId}: No JSON found in response for group ${group}`);
        return [];
      }
      parsed = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.warn(`[TIER2] Job ${this.jobId}: Failed to parse Haiku response for group ${group}:`, content.substring(0, 200));
      return [];
    }

    // Map parsed results to Tier2Result[]
    const results: Tier2Result[] = [];
    for (const field of missingFields) {
      const value = parsed[field] ?? null;
      results.push({
        field,
        group,
        value: value === null || value === 'null' ? null : value,
        confidence: value !== null && value !== 'null' ? 'MEDIUM' : 'LOW',
        tokensUsed: Math.round(totalTokens / missingFields.length), // Approximate per-field
      });
    }

    return results;
  }

  /**
   * Log extraction cost to ai_cost_logs table
   */
  private async logCost(results: Tier2Result[]): Promise<void> {
    if (this.totalCostKRW <= 0) return;

    const totalTokens = results.reduce((sum, r) => sum + (r.tokensUsed || 0), 0);

    try {
      await db.ai_cost_logs.create({
        data: {
          serviceType: 'EXTRACTION',
          endpoint: 'tier2-haiku-extraction',
          model: HAIKU_MODEL,
          inputTokens: Math.round(totalTokens * 0.7), // Approximate split
          outputTokens: Math.round(totalTokens * 0.3),
          totalTokens,
          costKRW: this.totalCostKRW,
          duration: 0, // Not tracked per-group
          success: true,
        },
      });
    } catch (error: any) {
      console.warn(`[TIER2] Failed to log cost:`, error.message);
    }
  }
}
