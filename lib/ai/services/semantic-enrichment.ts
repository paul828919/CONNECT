/**
 * Semantic Enrichment Service
 *
 * LLM-powered extraction of semantic sub-domain information from funding programs.
 * This enables precise matching by understanding the semantic intent of programs
 * beyond surface-level keywords and categories.
 *
 * Key Use Cases:
 * - BIO_HEALTH: Distinguish human vs animal vs plant programs
 * - ICT: Distinguish consumer vs enterprise vs government programs
 * - ENERGY: Distinguish solar vs battery vs nuclear programs
 *
 * Cost: ~₩27/program (2K input tokens × ₩3.9 + 0.5K output tokens × ₩19.5)
 * Integration: Called during scraping pipeline for new programs, batch for backfill
 *
 * @see /lib/matching/semantic-subdomain.ts for type definitions
 */

import { sendAIRequest } from '../client';
import { ProgramIntent } from '@prisma/client';
import type {
  SemanticSubDomain,
  BioHealthSubDomain,
  IctSubDomain,
  ManufacturingSubDomain,
  EnergySubDomain,
  AgricultureSubDomain,
  DefenseSubDomain,
  EnvironmentSubDomain,
  TargetOrganism,
  BioHealthApplicationArea,
  IctTargetMarket,
  IctApplicationArea,
  ManufacturingTargetIndustry,
  ManufacturingApplicationArea,
  EnergySource,
  EnergyApplicationArea,
  AgricultureTargetSector,
  AgricultureApplicationArea,
  DefenseTargetDomain,
  DefenseApplicationArea,
  EnvironmentTargetArea,
  EnvironmentApplicationArea,
} from '../../matching/semantic-subdomain';

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export interface ProgramInput {
  title: string;
  description: string | null;
  ministry: string | null;
  announcingAgency: string | null;
  category: string | null;
  keywords: string[];
  attachmentText?: string; // Extracted text from attachments (if available)
}

export interface SemanticEnrichmentResult {
  primaryTargetIndustry: string;           // e.g., "동물의약품", "B2B SaaS"
  secondaryTargetIndustries: string[];
  semanticSubDomain: SemanticSubDomain | null;
  technologyDomainsSpecific: string[];
  targetCompanyProfile: string;            // Korean description of ideal applicant
  programIntent: ProgramIntent;
  confidence: number;                      // 0-1 confidence score
  reasoning?: string;                      // Internal reasoning (for debugging)
}

// ═══════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════

const SEMANTIC_ENRICHMENT_MAX_TOKENS = 1024;
const SEMANTIC_ENRICHMENT_TEMPERATURE = 0.3; // Lower temperature for consistent extraction
const CONFIDENCE_THRESHOLD = 0.7;            // Minimum confidence to use semantic data

// ═══════════════════════════════════════════════════════════════
// Prompt Builder
// ═══════════════════════════════════════════════════════════════

function buildSemanticEnrichmentPrompt(input: ProgramInput): string {
  const contextParts = [
    `제목: ${input.title}`,
    input.description ? `설명: ${input.description}` : '',
    input.ministry ? `주관부처: ${input.ministry}` : '',
    input.announcingAgency ? `공고기관: ${input.announcingAgency}` : '',
    input.category ? `카테고리: ${input.category}` : '',
    input.keywords.length > 0 ? `키워드: ${input.keywords.join(', ')}` : '',
    input.attachmentText ? `공고문 내용(발췌): ${input.attachmentText.substring(0, 2000)}` : '',
  ].filter(Boolean).join('\n');

  return `당신은 한국 정부 R&D 과제 분석 전문가입니다. 아래 과제 정보를 분석하여 의미론적 분류(semantic classification)를 추출하세요.

## 중요 원칙
1. 같은 부처/키워드라도 전혀 다른 대상 기업을 타겟팅할 수 있습니다:
   - 농림축산식품부 "백신" → 동물백신(수의약품) 또는 식물 바이오
   - 과기정통부 "AI" → 소비자용 앱 또는 기업용 B2B 솔루션
   - 산업부 "전지" → 전기차 배터리 또는 ESS(에너지저장장치)

2. 과제의 **실제 대상 기업**이 누구인지 파악하세요:
   - 인체의약품 기업? 동물의약품 기업? 식물바이오 기업?
   - 소비자 서비스 기업? 기업 솔루션(B2B) 기업? 공공 SI 기업?

## 과제 정보
${contextParts}

## 산업별 세부 분류 기준

### BIO_HEALTH (바이오/헬스케어)
- targetOrganism: HUMAN(인체) | ANIMAL(동물) | PLANT(식물) | MICROBIAL(미생물) | MARINE(해양생물)
- applicationArea: PHARMA(의약품) | MEDICAL_DEVICE(의료기기) | DIAGNOSTICS(진단) | DIGITAL_HEALTH(디지털헬스) | VETERINARY_PHARMA(동물의약품) | VETERINARY_DEVICE(동물의료기기) | BIO_MATERIAL(바이오소재) | COSMETICS(화장품) | FOOD_HEALTH(건강기능식품)

### ICT (정보통신)
- targetMarket: CONSUMER(일반소비자) | ENTERPRISE(기업B2B) | GOVERNMENT(공공기관) | INDUSTRIAL(산업용)
- applicationArea: SOFTWARE | HARDWARE | PLATFORM | INFRASTRUCTURE | SECURITY | AI_ML | DATA_ANALYTICS | CLOUD | IOT | NETWORK | GAMING | METAVERSE

### MANUFACTURING (제조업)
- targetIndustry: AUTOMOTIVE(자동차) | AEROSPACE(항공우주) | ELECTRONICS(전자) | MATERIALS(소재) | MACHINERY(기계) | SHIPBUILDING(조선) | SEMICONDUCTOR(반도체) | DISPLAY(디스플레이) | ROBOTICS(로봇)
- applicationArea: PARTS(부품) | SYSTEMS(시스템) | EQUIPMENT(장비) | MATERIALS(소재) | PROCESS(공정)

### ENERGY (에너지)
- energySource: SOLAR(태양광) | WIND(풍력) | NUCLEAR(원자력) | HYDROGEN(수소) | BATTERY(배터리) | GRID(전력망) | FOSSIL(화석) | GEOTHERMAL(지열) | HYDRO(수력)
- applicationArea: GENERATION(발전) | STORAGE(저장) | DISTRIBUTION(배전) | EFFICIENCY(효율) | ELECTRIC_VEHICLE(전기차)

### AGRICULTURE (농업)
- targetSector: CROPS(작물) | LIVESTOCK(축산) | AQUACULTURE(양식) | FORESTRY(임업) | FOOD_PROCESSING(식품가공)
- applicationArea: CULTIVATION(재배) | BREEDING(육종) | PROCESSING(가공) | DISTRIBUTION(유통) | SMART_FARM(스마트팜)

### DEFENSE (국방)
- targetDomain: LAND(지상) | NAVAL(해상) | AEROSPACE(항공우주) | CYBER(사이버) | SPACE(우주)
- applicationArea: WEAPONS(무기체계) | SYSTEMS(시스템) | LOGISTICS(군수) | C4ISR(지휘통제) | PROTECTION(방호)

### ENVIRONMENT (환경)
- targetArea: AIR(대기) | WATER(수질) | SOIL(토양) | WASTE(폐기물) | CARBON(탄소) | ECOSYSTEM(생태계)
- applicationArea: MONITORING(모니터링) | TREATMENT(처리) | PREVENTION(예방) | RESTORATION(복원) | RECYCLING(재활용)

## 응답 형식 (JSON)
\`\`\`json
{
  "primaryTargetIndustry": "구체적인 대상 산업 (예: 동물의약품, B2B SaaS, 전기차 배터리)",
  "secondaryTargetIndustries": ["관련 부가 산업들"],
  "semanticSubDomain": {
    // 산업 카테고리에 맞는 필드만 포함
    // BIO_HEALTH: { "targetOrganism": "ANIMAL", "applicationArea": "VETERINARY_PHARMA" }
    // ICT: { "targetMarket": "ENTERPRISE", "applicationArea": "AI_ML" }
    // 등등...
  },
  "technologyDomainsSpecific": ["구체적인 기술 키워드 (일반적인 '바이오' 대신 '동물백신', 'GMP제조' 등)"],
  "targetCompanyProfile": "이 과제에 적합한 기업 프로필 설명 (1-2문장, 한국어)",
  "programIntent": "BASIC_RESEARCH | APPLIED_RESEARCH | COMMERCIALIZATION | INFRASTRUCTURE | POLICY_SUPPORT",
  "confidence": 0.0~1.0,
  "reasoning": "분류 근거 설명 (1-2문장)"
}
\`\`\`

중요: semanticSubDomain에는 해당 산업 카테고리에 맞는 필드만 포함하세요. 예를 들어 BIO_HEALTH 과제라면 targetOrganism과 applicationArea만 포함합니다.`;
}

// ═══════════════════════════════════════════════════════════════
// Response Parser
// ═══════════════════════════════════════════════════════════════

function parseSemanticEnrichmentResponse(
  content: string,
  category: string | null
): SemanticEnrichmentResult {
  // Extract JSON from response (may be wrapped in markdown code blocks)
  let jsonStr = content;
  const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1];
  } else {
    // Try to find raw JSON object
    const rawJsonMatch = content.match(/\{[\s\S]*\}/);
    if (rawJsonMatch) {
      jsonStr = rawJsonMatch[0];
    }
  }

  try {
    const parsed = JSON.parse(jsonStr);

    // Validate and type-check semanticSubDomain based on category
    const semanticSubDomain = validateSemanticSubDomain(parsed.semanticSubDomain, category);

    // Validate programIntent
    const validIntents: ProgramIntent[] = [
      'BASIC_RESEARCH',
      'APPLIED_RESEARCH',
      'COMMERCIALIZATION',
      'INFRASTRUCTURE',
      'POLICY_SUPPORT',
    ];
    const programIntent = validIntents.includes(parsed.programIntent)
      ? parsed.programIntent
      : 'APPLIED_RESEARCH'; // Default

    return {
      primaryTargetIndustry: parsed.primaryTargetIndustry || '',
      secondaryTargetIndustries: Array.isArray(parsed.secondaryTargetIndustries)
        ? parsed.secondaryTargetIndustries
        : [],
      semanticSubDomain,
      technologyDomainsSpecific: Array.isArray(parsed.technologyDomainsSpecific)
        ? parsed.technologyDomainsSpecific
        : [],
      targetCompanyProfile: parsed.targetCompanyProfile || '',
      programIntent,
      confidence: typeof parsed.confidence === 'number'
        ? Math.max(0, Math.min(1, parsed.confidence))
        : 0.5,
      reasoning: parsed.reasoning,
    };
  } catch (error) {
    console.error('[SemanticEnrichment] Failed to parse response:', error);
    console.error('[SemanticEnrichment] Raw content:', content.substring(0, 500));

    // Return default/fallback result
    return {
      primaryTargetIndustry: '',
      secondaryTargetIndustries: [],
      semanticSubDomain: null,
      technologyDomainsSpecific: [],
      targetCompanyProfile: '',
      programIntent: 'APPLIED_RESEARCH',
      confidence: 0,
      reasoning: 'Parse error',
    };
  }
}

/**
 * Validate and type-check semantic sub-domain based on industry category
 */
function validateSemanticSubDomain(
  raw: unknown,
  category: string | null
): SemanticSubDomain | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const subDomain = raw as Record<string, unknown>;

  switch (category?.toUpperCase()) {
    case 'BIO_HEALTH':
    case 'BIOHEALTH':
    case 'HEALTH':
    case 'BIO': {
      const validOrganisms: TargetOrganism[] = ['HUMAN', 'ANIMAL', 'PLANT', 'MICROBIAL', 'MARINE'];
      const validAreas: BioHealthApplicationArea[] = [
        'PHARMA', 'MEDICAL_DEVICE', 'DIAGNOSTICS', 'DIGITAL_HEALTH',
        'VETERINARY_PHARMA', 'VETERINARY_DEVICE', 'BIO_MATERIAL', 'COSMETICS', 'FOOD_HEALTH',
      ];

      const targetOrganism = subDomain.targetOrganism as TargetOrganism;
      const applicationArea = subDomain.applicationArea as BioHealthApplicationArea;

      if (validOrganisms.includes(targetOrganism) && validAreas.includes(applicationArea)) {
        return { targetOrganism, applicationArea } as BioHealthSubDomain;
      }
      break;
    }

    case 'ICT':
    case 'IT':
    case 'SOFTWARE': {
      const validMarkets: IctTargetMarket[] = ['CONSUMER', 'ENTERPRISE', 'GOVERNMENT', 'INDUSTRIAL'];
      const validAreas: IctApplicationArea[] = [
        'SOFTWARE', 'HARDWARE', 'PLATFORM', 'INFRASTRUCTURE', 'SECURITY',
        'AI_ML', 'DATA_ANALYTICS', 'CLOUD', 'IOT', 'NETWORK', 'GAMING', 'METAVERSE',
      ];

      const targetMarket = subDomain.targetMarket as IctTargetMarket;
      const applicationArea = subDomain.applicationArea as IctApplicationArea;

      if (validMarkets.includes(targetMarket) && validAreas.includes(applicationArea)) {
        return { targetMarket, applicationArea } as IctSubDomain;
      }
      break;
    }

    case 'MANUFACTURING':
    case 'MANUFACTURE': {
      const validIndustries: ManufacturingTargetIndustry[] = [
        'AUTOMOTIVE', 'AEROSPACE', 'ELECTRONICS', 'MATERIALS', 'MACHINERY',
        'SHIPBUILDING', 'SEMICONDUCTOR', 'DISPLAY', 'ROBOTICS',
      ];
      const validAreas: ManufacturingApplicationArea[] = ['PARTS', 'SYSTEMS', 'EQUIPMENT', 'MATERIALS', 'PROCESS'];

      const targetIndustry = subDomain.targetIndustry as ManufacturingTargetIndustry;
      const applicationArea = subDomain.applicationArea as ManufacturingApplicationArea;

      if (validIndustries.includes(targetIndustry) && validAreas.includes(applicationArea)) {
        return { targetIndustry, applicationArea } as ManufacturingSubDomain;
      }
      break;
    }

    case 'ENERGY': {
      const validSources: EnergySource[] = [
        'SOLAR', 'WIND', 'NUCLEAR', 'HYDROGEN', 'BATTERY', 'GRID', 'FOSSIL', 'GEOTHERMAL', 'HYDRO',
      ];
      const validAreas: EnergyApplicationArea[] = [
        'GENERATION', 'STORAGE', 'DISTRIBUTION', 'EFFICIENCY', 'ELECTRIC_VEHICLE',
      ];

      const energySource = subDomain.energySource as EnergySource;
      const applicationArea = subDomain.applicationArea as EnergyApplicationArea;

      if (validSources.includes(energySource) && validAreas.includes(applicationArea)) {
        return { energySource, applicationArea } as EnergySubDomain;
      }
      break;
    }

    case 'AGRICULTURE':
    case 'AGRI': {
      const validSectors: AgricultureTargetSector[] = [
        'CROPS', 'LIVESTOCK', 'AQUACULTURE', 'FORESTRY', 'FOOD_PROCESSING',
      ];
      const validAreas: AgricultureApplicationArea[] = [
        'CULTIVATION', 'BREEDING', 'PROCESSING', 'DISTRIBUTION', 'SMART_FARM',
      ];

      const targetSector = subDomain.targetSector as AgricultureTargetSector;
      const applicationArea = subDomain.applicationArea as AgricultureApplicationArea;

      if (validSectors.includes(targetSector) && validAreas.includes(applicationArea)) {
        return { targetSector, applicationArea } as AgricultureSubDomain;
      }
      break;
    }

    case 'DEFENSE': {
      const validDomains: DefenseTargetDomain[] = ['LAND', 'NAVAL', 'AEROSPACE', 'CYBER', 'SPACE'];
      const validAreas: DefenseApplicationArea[] = ['WEAPONS', 'SYSTEMS', 'LOGISTICS', 'C4ISR', 'PROTECTION'];

      const targetDomain = subDomain.targetDomain as DefenseTargetDomain;
      const applicationArea = subDomain.applicationArea as DefenseApplicationArea;

      if (validDomains.includes(targetDomain) && validAreas.includes(applicationArea)) {
        return { targetDomain, applicationArea } as DefenseSubDomain;
      }
      break;
    }

    case 'ENVIRONMENT':
    case 'ENV': {
      const validTargets: EnvironmentTargetArea[] = ['AIR', 'WATER', 'SOIL', 'WASTE', 'CARBON', 'ECOSYSTEM'];
      const validAreas: EnvironmentApplicationArea[] = [
        'MONITORING', 'TREATMENT', 'PREVENTION', 'RESTORATION', 'RECYCLING',
      ];

      const targetArea = subDomain.targetArea as EnvironmentTargetArea;
      const applicationArea = subDomain.applicationArea as EnvironmentApplicationArea;

      if (validTargets.includes(targetArea) && validAreas.includes(applicationArea)) {
        return { targetArea, applicationArea } as EnvironmentSubDomain;
      }
      break;
    }
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════
// Main Service Functions
// ═══════════════════════════════════════════════════════════════

/**
 * Enrich a single program with semantic sub-domain information
 */
export async function enrichProgramSemantics(
  input: ProgramInput
): Promise<SemanticEnrichmentResult> {
  const startTime = Date.now();

  try {
    const prompt = buildSemanticEnrichmentPrompt(input);

    const response = await sendAIRequest({
      system: undefined,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      maxTokens: SEMANTIC_ENRICHMENT_MAX_TOKENS,
      temperature: SEMANTIC_ENRICHMENT_TEMPERATURE,
      retries: 2,
      serviceType: 'MATCH_EXPLANATION', // Reuse existing service type for cost tracking
      endpoint: '/internal/semantic-enrichment',
      cacheHit: false,
    });

    const result = parseSemanticEnrichmentResponse(response.content, input.category);

    const duration = Date.now() - startTime;
    console.log(`[SemanticEnrichment] Enriched "${input.title.substring(0, 50)}..." in ${duration}ms (confidence: ${result.confidence})`);

    return result;
  } catch (error) {
    console.error('[SemanticEnrichment] Error enriching program:', error);

    // Return low-confidence fallback
    return {
      primaryTargetIndustry: '',
      secondaryTargetIndustries: [],
      semanticSubDomain: null,
      technologyDomainsSpecific: [],
      targetCompanyProfile: '',
      programIntent: 'APPLIED_RESEARCH',
      confidence: 0,
      reasoning: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Batch enrich multiple programs
 * Processes sequentially to respect rate limits
 */
export async function batchEnrichPrograms(
  inputs: ProgramInput[],
  options?: {
    delayMs?: number;           // Delay between requests (default: 1200ms for 50 RPM)
    onProgress?: (current: number, total: number) => void;
  }
): Promise<SemanticEnrichmentResult[]> {
  const results: SemanticEnrichmentResult[] = [];
  const delayMs = options?.delayMs ?? 1200;

  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i];

    try {
      const result = await enrichProgramSemantics(input);
      results.push(result);

      if (options?.onProgress) {
        options.onProgress(i + 1, inputs.length);
      }

      // Rate limit delay (except for last item)
      if (i < inputs.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    } catch (error) {
      console.error(`[SemanticEnrichment] Batch error for "${input.title}":`, error);
      results.push({
        primaryTargetIndustry: '',
        secondaryTargetIndustries: [],
        semanticSubDomain: null,
        technologyDomainsSpecific: [],
        targetCompanyProfile: '',
        programIntent: 'APPLIED_RESEARCH',
        confidence: 0,
        reasoning: 'Batch processing error',
      });
    }
  }

  return results;
}

/**
 * Check if semantic data is usable (meets confidence threshold)
 */
export function isSemanticDataUsable(result: SemanticEnrichmentResult): boolean {
  return result.confidence >= CONFIDENCE_THRESHOLD && result.semanticSubDomain !== null;
}

/**
 * Get confidence threshold
 */
export function getConfidenceThreshold(): number {
  return CONFIDENCE_THRESHOLD;
}

const semanticEnrichmentService = {
  enrichProgramSemantics,
  batchEnrichPrograms,
  isSemanticDataUsable,
  getConfidenceThreshold,
};

export default semanticEnrichmentService;
