/**
 * Hybrid Ideal Applicant Profile Generator
 * Phase 3: Ideal Profile Construction & Proximity Matching
 *
 * Takes announcement data → produces IdealApplicantProfile.
 *
 * Two-tier approach:
 * - Tier 1 (Rules): Deterministic extraction from structured fields (~60-70% of dimensions)
 * - Tier 2 (LLM/Haiku): Semantic extraction from free text for remaining dimensions
 *
 * Cost: ~2.2 KRW per program with Haiku (vs ~27 KRW with Sonnet)
 *
 * @see lib/matching/ideal-profile.ts for type definitions
 */

import Anthropic from '@anthropic-ai/sdk';
import { funding_programs, sme_programs } from '@prisma/client';
import {
  IdealApplicantProfile,
  ProgramStage,
  CollaborationExpectation,
  RegionRequirement,
  CompanyScalePreference,
  DimensionConfidence,
  GenerationMethod,
} from './ideal-profile';
import {
  classifyProgram,
  type ClassificationResult,
} from './keyword-classifier';

// ═══════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════

const HAIKU_MODEL = 'claude-haiku-4-5-20251001';
const MAX_TEXT_FOR_LLM = 3000; // chars, to keep cost low

// Lazy Anthropic client for LLM tier
let anthropicClient: Anthropic | null = null;

function getClient(): Anthropic {
  if (!anthropicClient) {
    if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your_api_key_here') {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }
    anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return anthropicClient;
}

// ═══════════════════════════════════════════════════════════════
// Type Aliases
// ═══════════════════════════════════════════════════════════════

type FundingProgram = funding_programs;
type SMEProgram = sme_programs;

// ═══════════════════════════════════════════════════════════════
// Tier 1: Rule-Based Generator (R&D Programs)
// ═══════════════════════════════════════════════════════════════

/**
 * Extract structured dimensions from R&D program fields.
 * These are deterministic and cost ₩0.
 */
function generateRulesForRD(program: FundingProgram): Partial<IdealApplicantProfile> {
  const profile: Partial<IdealApplicantProfile> = {};
  const confidence: IdealApplicantProfile['dimensionConfidence'] = {};

  // Organization types (from targetType enum array)
  if (program.targetType && program.targetType.length > 0) {
    profile.organizationTypes = program.targetType.map(t => String(t));
    confidence.organizationTypes = 'HIGH';
  }

  // TRL range
  if (program.minTrl !== null || program.maxTrl !== null) {
    const min = program.minTrl ?? 1;
    const max = program.maxTrl ?? 9;
    profile.trlRange = {
      min,
      max,
      idealCenter: Math.round((min + max) / 2),
    };
    confidence.trlRange = 'HIGH';
  }

  // Program stage inference from TRL
  if (profile.trlRange) {
    const center = profile.trlRange.idealCenter!;
    if (center <= 3) {
      profile.programStage = 'BASIC_RESEARCH';
    } else if (center <= 6) {
      profile.programStage = 'APPLIED_RESEARCH';
    } else {
      profile.programStage = 'COMMERCIALIZATION';
    }
    confidence.programStage = 'INFERRED';
  }

  // Required/preferred certifications
  if (program.requiredCertifications.length > 0) {
    profile.requiredCertifications = [...program.requiredCertifications];
    confidence.requiredCertifications = 'HIGH';
  }
  if (program.preferredCertifications.length > 0) {
    profile.preferredCertifications = [...program.preferredCertifications];
  }

  // Research institute requirement
  if (program.requiresResearchInstitute) {
    profile.requiresResearchInstitute = true;
  }

  // Financial profile
  if (program.requiredMinRevenue !== null || program.requiredMaxRevenue !== null) {
    profile.financialProfile = {
      minRevenue: program.requiredMinRevenue ? Number(program.requiredMinRevenue) : undefined,
    };
    confidence.financialProfile = 'HIGH';
  }

  // Business age
  if (program.requiredOperatingYears !== null || program.maxOperatingYears !== null) {
    profile.businessAge = {
      minYears: program.requiredOperatingYears ?? undefined,
      maxYears: program.maxOperatingYears ?? undefined,
    };
    confidence.businessAge = 'HIGH';
  }

  // Primary domain from keyword classification
  const classification = classifyRDProgram(program);
  if (classification) {
    profile.primaryDomain = classification.industry;
    confidence.primaryDomain = classification.confidence > 20 ? 'HIGH' : 'MEDIUM';
  }

  // Technology keywords from program keywords
  if (program.keywords.length > 0) {
    profile.technologyKeywords = [...program.keywords];
    confidence.technologyKeywords = 'MEDIUM';
  }

  // Region inference from title patterns
  const regionInfo = inferRegionFromRD(program);
  if (regionInfo) {
    profile.regionRequirement = regionInfo.requirement;
    if (regionInfo.regions) {
      profile.specificRegions = regionInfo.regions;
    }
    confidence.regionRequirement = regionInfo.confidence;
  }

  return { ...profile, dimensionConfidence: confidence };
}

function classifyRDProgram(program: FundingProgram): ClassificationResult | null {
  try {
    return classifyProgram(
      program.title,
      program.description || null,
      program.ministry || null
    );
  } catch {
    return null;
  }
}

function inferRegionFromRD(program: FundingProgram): {
  requirement: RegionRequirement;
  regions?: string[];
  confidence: DimensionConfidence;
} | null {
  const text = `${program.title} ${program.description || ''}`;

  if (/비수도권|지방|지역.*혁신/.test(text)) {
    return { requirement: 'NON_METROPOLITAN', confidence: 'MEDIUM' };
  }

  const regionPatterns: Record<string, string> = {
    '대전': '대전', '세종': '세종', '광주': '광주', '대구': '대구',
    '부산': '부산', '제주': '제주', '강원': '강원', '충북': '충북',
    '충남': '충남', '전북': '전북', '전남': '전남', '경북': '경북',
    '경남': '경남', '인천': '인천', '울산': '울산',
  };

  const matched: string[] = [];
  for (const [pattern, region] of Object.entries(regionPatterns)) {
    // Only match in title prefix (regional programs typically start with [region])
    if (program.title.startsWith(`[${pattern}]`) || program.title.startsWith(`(${pattern})`)) {
      matched.push(region);
    }
  }

  if (matched.length > 0) {
    return { requirement: 'SPECIFIC_REGIONS', regions: matched, confidence: 'HIGH' };
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════
// Tier 1: Rule-Based Generator (SME Programs)
// ═══════════════════════════════════════════════════════════════

/**
 * Extract structured dimensions from SME program fields.
 */
function generateRulesForSME(program: SMEProgram): Partial<IdealApplicantProfile> {
  const profile: Partial<IdealApplicantProfile> = {};
  const confidence: IdealApplicantProfile['dimensionConfidence'] = {};

  // Company scale from targetCompanyScaleCd
  if (program.targetCompanyScaleCd.length > 0) {
    const scaleMap: Record<string, CompanyScalePreference> = {
      'CC10': 'SMALL_MEDIUM',   // 중소기업
      'CC20': 'SMALL',          // 소기업
      'CC30': 'MICRO',          // 소상공인
      'CC40': 'MEDIUM',         // 중견기업
      'CC50': 'LARGE',          // 대기업
      'CC60': 'STARTUP',        // 창업기업
    };
    profile.preferredScales = program.targetCompanyScaleCd
      .map(cd => scaleMap[cd])
      .filter((s): s is CompanyScalePreference => s !== undefined);
    if (profile.preferredScales.length > 0) {
      confidence.preferredScales = 'HIGH';
    }
  }

  // Revenue range from targetSalesRangeCd
  if (program.minSalesAmount !== null || program.maxSalesAmount !== null) {
    profile.financialProfile = {
      minRevenue: program.minSalesAmount ? Number(program.minSalesAmount) : undefined,
    };
    confidence.financialProfile = 'HIGH';
  }

  // Business age
  if (program.minBusinessAge !== null || program.maxBusinessAge !== null) {
    profile.businessAge = {
      minYears: program.minBusinessAge ?? undefined,
      maxYears: program.maxBusinessAge ?? undefined,
    };
    confidence.businessAge = 'HIGH';
  }

  // Region
  if (program.targetRegionCodes.length > 0) {
    profile.regionRequirement = 'SPECIFIC_REGIONS';
    profile.specificRegions = [...program.targetRegionCodes];
    confidence.regionRequirement = 'HIGH';
  }

  // Required certifications from requiredCertsCd
  if (program.requiredCertsCd.length > 0) {
    const certMap: Record<string, string> = {
      'EC06': '이노비즈',
      'EC07': '벤처기업',
      'EC08': '메인비즈',
    };
    profile.requiredCertifications = program.requiredCertsCd
      .map(cd => certMap[cd] || cd)
      .filter(Boolean);
    if (profile.requiredCertifications.length > 0) {
      confidence.requiredCertifications = 'HIGH';
    }
  }

  // Program stage from lifecycle codes
  if (program.lifeCycleCd.length > 0) {
    const stageMap: Record<string, ProgramStage> = {
      'LC01': 'STARTUP_FOCUSED',  // 창업
      'LC02': 'GROWTH',           // 성장
      'LC03': 'MATURE',           // 폐업·재기
    };
    // Use the first lifecycle stage as primary
    const mapped = program.lifeCycleCd
      .map(cd => stageMap[cd])
      .filter((s): s is ProgramStage => s !== undefined);
    if (mapped.length > 0) {
      profile.programStage = mapped[0];
      confidence.programStage = 'MEDIUM'; // lifeCycleCd has 0% fill in production
    }
  }

  // BizType → supportPurpose mapping
  if (program.bizTypeCd) {
    const bizTypeMap: Record<string, string[]> = {
      'PC10': ['정책자금', '융자'],
      'PC12': ['정책자금', '보증'],
      'PC20': ['기술개발', 'R&D'],
      'PC30': ['인력지원', '채용', '교육'],
      'PC40': ['수출지원', '해외진출'],
      'PC50': ['내수판로', '마케팅'],
      'PC60': ['창업지원'],
      'PC70': ['경영지원', '컨설팅'],
      'PC80': ['중견기업'],
      'PC99': ['기타'],
    };
    const purpose = bizTypeMap[program.bizTypeCd];
    if (purpose) {
      profile.supportPurpose = purpose;
    }
  }

  // Special flags → organizational requirements
  if (program.isPreStartup) {
    profile.programStage = 'STARTUP_FOCUSED';
    profile.businessAge = { maxYears: 0 };
    confidence.programStage = 'HIGH';
    confidence.businessAge = 'HIGH';
  }

  // Primary domain from keyword classification
  const classification = classifySMEProgram(program);
  if (classification) {
    profile.primaryDomain = classification.industry;
    confidence.primaryDomain = classification.confidence > 20 ? 'HIGH' : 'MEDIUM';
  }

  // Region inference from title
  const titleRegion = inferRegionFromTitle(program.title);
  if (titleRegion && !profile.regionRequirement) {
    profile.regionRequirement = 'SPECIFIC_REGIONS';
    profile.specificRegions = [titleRegion];
    confidence.regionRequirement = 'MEDIUM';
  }

  return { ...profile, dimensionConfidence: confidence };
}

function classifySMEProgram(program: SMEProgram): ClassificationResult | null {
  try {
    return classifyProgram(
      program.title,
      program.description || null,
      null // SME programs don't have ministry
    );
  } catch {
    return null;
  }
}

function inferRegionFromTitle(title: string): string | null {
  const match = title.match(/^\[([가-힣]+)\]/);
  if (match) return match[1];
  const match2 = title.match(/^\(([가-힣]+)\)/);
  if (match2) return match2[1];
  return null;
}

// ═══════════════════════════════════════════════════════════════
// Tier 2: LLM-Based Generator (Haiku)
// ═══════════════════════════════════════════════════════════════

/**
 * LLM prompt for extracting semantic dimensions from announcement text.
 */
const LLM_SYSTEM_PROMPT = `당신은 한국 정부 R&D/중소기업 지원사업 공고문을 분석하는 전문가입니다.

주어진 공고 텍스트를 읽고, 이 사업이 어떤 유형의 지원자를 이상적으로 기대하는지 분석하세요.

다음 JSON 형식으로만 응답하세요 (설명 없이 JSON만):

{
  "programStage": "BASIC_RESEARCH|APPLIED_RESEARCH|COMMERCIALIZATION|STARTUP_FOCUSED|GROWTH|MATURE|null",
  "subDomains": ["세부 기술/산업 분야 (최대 5개)"],
  "expectedCapabilities": ["이 사업이 기대하는 조직 역량 (최대 5개, 한국어)"],
  "desiredOutcomes": ["정부가 이 사업에서 기대하는 결과 (최대 5개, 한국어)"],
  "collaborationExpectation": "SOLO|CONSORTIUM_REQUIRED|CONSORTIUM_PREFERRED|INDUSTRY_ACADEMIA|ANY|null",
  "idealTrlCenter": null or number (1-9),
  "financialRequiresMatchingFund": true|false|null
}

규칙:
- 텍스트에서 명확한 근거가 없으면 null로 설정
- subDomains는 구체적 세부분야 (예: "동물의약품", "수소연료전지", "사이버보안")
- expectedCapabilities는 조직이 갖춰야 할 능력 (예: "임상시험 수행 경험", "GMP 제조시설", "수출 실적")
- desiredOutcomes는 정부가 기대하는 성과 (예: "SCI 논문", "상용화 매출", "일자리 창출")`;

interface LLMSemanticResult {
  programStage: ProgramStage | null;
  subDomains: string[];
  expectedCapabilities: string[];
  desiredOutcomes: string[];
  collaborationExpectation: CollaborationExpectation | null;
  idealTrlCenter: number | null;
  financialRequiresMatchingFund: boolean | null;
}

/**
 * Call Haiku LLM to extract semantic dimensions from announcement text.
 */
async function extractSemanticDimensions(
  title: string,
  description: string,
  keywords: string[],
  eligibilityCriteria?: string
): Promise<{ result: LLMSemanticResult | null; cost: number }> {
  try {
    const client = getClient();

    // Build concise input text
    const parts: string[] = [`제목: ${title}`];
    if (description) {
      parts.push(`설명: ${description.slice(0, MAX_TEXT_FOR_LLM)}`);
    }
    if (keywords.length > 0) {
      parts.push(`키워드: ${keywords.join(', ')}`);
    }
    if (eligibilityCriteria) {
      parts.push(`자격요건: ${eligibilityCriteria.slice(0, 500)}`);
    }

    const userMessage = parts.join('\n\n');

    const response = await client.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 512,
      temperature: 0.1, // Low temperature for structured extraction
      system: LLM_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    // Calculate cost
    const inputTokens = response.usage?.input_tokens || 0;
    const outputTokens = response.usage?.output_tokens || 0;
    const cost = (inputTokens / 1000) * 1.30 + (outputTokens / 1000) * 6.50; // KRW

    // Parse response
    const text = response.content[0]?.type === 'text' ? response.content[0].text : '';

    // Extract JSON from response (may have markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { result: null, cost };
    }

    const parsed = JSON.parse(jsonMatch[0]) as LLMSemanticResult;

    // Validate
    const validStages: ProgramStage[] = ['BASIC_RESEARCH', 'APPLIED_RESEARCH', 'COMMERCIALIZATION', 'STARTUP_FOCUSED', 'GROWTH', 'MATURE'];
    if (parsed.programStage && !validStages.includes(parsed.programStage)) {
      parsed.programStage = null;
    }

    const validCollabs: CollaborationExpectation[] = ['SOLO', 'CONSORTIUM_REQUIRED', 'CONSORTIUM_PREFERRED', 'INDUSTRY_ACADEMIA', 'ANY'];
    if (parsed.collaborationExpectation && !validCollabs.includes(parsed.collaborationExpectation)) {
      parsed.collaborationExpectation = null;
    }

    return { result: parsed, cost };
  } catch (error) {
    console.warn(`LLM extraction failed: ${error instanceof Error ? error.message : String(error)}`);
    return { result: null, cost: 0 };
  }
}

// ═══════════════════════════════════════════════════════════════
// Profile Merger (Tier 1 + Tier 2)
// ═══════════════════════════════════════════════════════════════

function mergeProfiles(
  ruleProfile: Partial<IdealApplicantProfile>,
  llmResult: LLMSemanticResult | null,
  sourceTextLength: number,
  usedLLM: boolean
): IdealApplicantProfile {
  const confidence = ruleProfile.dimensionConfidence || {};

  // Start with rule-based profile
  const profile: IdealApplicantProfile = {
    version: '1.0',
    confidence: 0,
    generatedBy: usedLLM ? 'HYBRID' : 'RULE',
    sourceTextLength,
    dimensionConfidence: confidence,
    ...ruleProfile,
  };

  // Merge LLM results (only fill gaps, don't override rules)
  if (llmResult) {
    // Program stage: LLM overrides if rule only inferred
    if (llmResult.programStage && (!profile.programStage || confidence.programStage === 'INFERRED')) {
      profile.programStage = llmResult.programStage;
      confidence.programStage = 'MEDIUM';
    }

    // Sub-domains: always from LLM (rules can't extract these)
    if (llmResult.subDomains && llmResult.subDomains.length > 0) {
      profile.subDomains = llmResult.subDomains;
      confidence.subDomains = 'MEDIUM';
    }

    // Expected capabilities: always from LLM
    if (llmResult.expectedCapabilities && llmResult.expectedCapabilities.length > 0) {
      profile.expectedCapabilities = llmResult.expectedCapabilities;
      confidence.expectedCapabilities = 'MEDIUM';
    }

    // Desired outcomes: always from LLM
    if (llmResult.desiredOutcomes && llmResult.desiredOutcomes.length > 0) {
      profile.desiredOutcomes = llmResult.desiredOutcomes;
      confidence.desiredOutcomes = 'MEDIUM';
    }

    // Collaboration: LLM fills if rule didn't
    if (llmResult.collaborationExpectation && !profile.collaborationExpectation) {
      profile.collaborationExpectation = llmResult.collaborationExpectation;
      confidence.collaborationExpectation = 'MEDIUM';
    }

    // Ideal TRL center: LLM refines if rule only averaged
    if (llmResult.idealTrlCenter !== null && profile.trlRange) {
      profile.trlRange.idealCenter = llmResult.idealTrlCenter;
    }

    // Financial matching fund
    if (llmResult.financialRequiresMatchingFund !== null) {
      if (!profile.financialProfile) {
        profile.financialProfile = {};
      }
      profile.financialProfile.requiresMatchingFund = llmResult.financialRequiresMatchingFund;
    }
  }

  // Calculate overall confidence
  const dimensionCount = Object.keys(confidence).length;
  const highCount = Object.values(confidence).filter(c => c === 'HIGH').length;
  const mediumCount = Object.values(confidence).filter(c => c === 'MEDIUM').length;
  const totalDimensions = 15; // max possible dimensions

  profile.confidence = dimensionCount > 0
    ? Math.min(1.0, (highCount * 1.0 + mediumCount * 0.6) / totalDimensions)
    : 0.1;

  profile.dimensionConfidence = confidence;

  return profile;
}

// ═══════════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════════

export interface GenerationResult {
  profile: IdealApplicantProfile;
  llmCostKRW: number;
  usedLLM: boolean;
}

/**
 * Generate an ideal applicant profile for an R&D funding program.
 *
 * @param program - The funding program to analyze
 * @param useLLM - Whether to use Haiku LLM for semantic dimensions (default: true)
 * @returns Generated profile and metadata
 */
export async function generateIdealProfileForRD(
  program: FundingProgram,
  useLLM: boolean = true
): Promise<GenerationResult> {
  // Tier 1: Rule-based extraction
  const ruleProfile = generateRulesForRD(program);

  // Calculate source text length
  const textParts = [program.title, program.description || ''].filter(Boolean);
  const sourceTextLength = textParts.join('').length;

  // Tier 2: LLM semantic extraction (if enabled and text available)
  let llmResult: LLMSemanticResult | null = null;
  let llmCost = 0;

  if (useLLM && sourceTextLength > 50) {
    const ecText = program.eligibilityCriteria
      ? JSON.stringify(program.eligibilityCriteria).slice(0, 500)
      : undefined;

    const { result, cost } = await extractSemanticDimensions(
      program.title,
      program.description || '',
      program.keywords,
      ecText
    );
    llmResult = result;
    llmCost = cost;
  }

  const profile = mergeProfiles(ruleProfile, llmResult, sourceTextLength, useLLM && llmResult !== null);

  return {
    profile,
    llmCostKRW: llmCost,
    usedLLM: llmResult !== null,
  };
}

/**
 * Generate an ideal applicant profile for an SME support program.
 *
 * @param program - The SME program to analyze
 * @param useLLM - Whether to use Haiku LLM for semantic dimensions (default: true)
 * @returns Generated profile and metadata
 */
export async function generateIdealProfileForSME(
  program: SMEProgram,
  useLLM: boolean = true
): Promise<GenerationResult> {
  // Tier 1: Rule-based extraction
  const ruleProfile = generateRulesForSME(program);

  // Build text for LLM
  const textParts = [
    program.title,
    program.description || '',
    program.supportTarget || '',
    program.supportContents || '',
  ].filter(Boolean);
  const sourceTextLength = textParts.join('').length;

  // Tier 2: LLM semantic extraction
  let llmResult: LLMSemanticResult | null = null;
  let llmCost = 0;

  if (useLLM && sourceTextLength > 50) {
    const fullText = textParts.join('\n').slice(0, MAX_TEXT_FOR_LLM);

    const { result, cost } = await extractSemanticDimensions(
      program.title,
      fullText,
      [], // SME programs don't have keyword arrays
      program.supportTarget || undefined
    );
    llmResult = result;
    llmCost = cost;
  }

  const profile = mergeProfiles(ruleProfile, llmResult, sourceTextLength, useLLM && llmResult !== null);

  return {
    profile,
    llmCostKRW: llmCost,
    usedLLM: llmResult !== null,
  };
}

/**
 * Generate rule-only profile (no LLM call, ₩0 cost).
 * Useful for quick batch processing or when LLM budget is exhausted.
 */
export async function generateRuleOnlyProfile(
  program: FundingProgram | SMEProgram,
  type: 'RD' | 'SME'
): Promise<GenerationResult> {
  if (type === 'RD') {
    return generateIdealProfileForRD(program as FundingProgram, false);
  }
  return generateIdealProfileForSME(program as SMEProgram, false);
}
