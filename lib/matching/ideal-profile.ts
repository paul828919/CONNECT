/**
 * Ideal Applicant Profile Types
 * Phase 2: Ideal Profile Construction & Proximity Matching
 *
 * Defines the shape of an "ideal applicant" for any government funding program.
 * Used by:
 * - ideal-profile-generator.ts (produces profiles from announcement data)
 * - proximity-scorer.ts (compares org profiles against ideal profiles)
 * - proximity-explainer.ts (generates Korean explanations)
 *
 * Design decisions:
 * - Single unified interface for both R&D and SME programs
 * - All fields nullable (generator fills what it can extract)
 * - Per-dimension confidence enables graceful degradation
 * - JSON-serializable (stored as Prisma Json column)
 *
 * @see docs/ideal-profile-pattern-analysis.md for empirical basis
 */

// ═══════════════════════════════════════════════════════════════
// Enums & Constants
// ═══════════════════════════════════════════════════════════════

/** Organizational development stage — from basic research to commercialization */
export type ProgramStage =
  | 'BASIC_RESEARCH'       // 기초연구, 원천기술
  | 'APPLIED_RESEARCH'     // 응용연구, 핵심기술, 시제품
  | 'COMMERCIALIZATION'    // 상용화, 사업화, 양산
  | 'STARTUP_FOCUSED'      // 창업, 벤처, 스타트업
  | 'GROWTH'               // 성장기, 도약, 스케일업
  | 'MATURE';              // 안정기, 재도약

/** Collaboration expectations */
export type CollaborationExpectation =
  | 'SOLO'                 // 단독 수행 가능
  | 'CONSORTIUM_REQUIRED'  // 컨소시엄 필수 (주관+참여)
  | 'CONSORTIUM_PREFERRED' // 컨소시엄 우대
  | 'INDUSTRY_ACADEMIA'    // 산학연 협력 필수
  | 'ANY';                 // 제한 없음

/** Region requirement granularity */
export type RegionRequirement =
  | 'NATIONWIDE'           // 전국 제한 없음
  | 'NON_METROPOLITAN'     // 비수도권 (지역혁신)
  | 'METROPOLITAN'         // 수도권 한정
  | 'SPECIFIC_REGIONS';    // 특정 지역 지정

/** Confidence level for individual dimensions */
export type DimensionConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'INFERRED';

/** How this profile was generated */
export type GenerationMethod = 'RULE' | 'LLM' | 'HYBRID';

/** Company scale preference */
export type CompanyScalePreference =
  | 'STARTUP'              // 스타트업, 창업기업
  | 'SMALL'                // 소기업
  | 'SMALL_MEDIUM'         // 중소기업
  | 'MEDIUM'               // 중견기업
  | 'LARGE'                // 대기업
  | 'MICRO';               // 소상공인

// ═══════════════════════════════════════════════════════════════
// Core Ideal Applicant Profile Interface
// ═══════════════════════════════════════════════════════════════

/**
 * Ideal Applicant Profile for a government funding program.
 *
 * This is the "model answer" — the type of organization the program
 * is designed for. The proximity scorer measures how close a real
 * organization is to this ideal.
 *
 * Stored as JSON in `funding_programs.idealApplicantProfile` and
 * `sme_programs.idealApplicantProfile`.
 */
export interface IdealApplicantProfile {
  /** Schema version for forward compatibility */
  version: '1.0';

  // ─── Structured Dimensions (deterministic comparison) ──────

  /** Preferred organization types (COMPANY, RESEARCH_INSTITUTE, etc.) */
  organizationTypes?: string[];

  /** Preferred company scale (ordered by preference) */
  preferredScales?: CompanyScalePreference[];

  /** Acceptable but not ideal scales */
  acceptableScales?: CompanyScalePreference[];

  /** Business age expectations */
  businessAge?: {
    minYears?: number;
    maxYears?: number;
    preferredStage?: ProgramStage;
  };

  /** TRL expectations (R&D programs) */
  trlRange?: {
    min?: number;
    max?: number;
    /** The sweet spot — what the program really targets */
    idealCenter?: number;
  };

  /** Overall program stage / maturity expectation */
  programStage?: ProgramStage;

  /** Revenue/financial expectations */
  financialProfile?: {
    /** Minimum revenue expected (KRW) */
    minRevenue?: number;
    /** Whether matching funds (대응자금) are required */
    requiresMatchingFund?: boolean;
    /** Whether prior investment is expected */
    expectsPriorInvestment?: boolean;
  };

  /** Hard certification requirements (must have) */
  requiredCertifications?: string[];

  /** Soft certification preferences (nice to have) */
  preferredCertifications?: string[];

  /** Region requirement */
  regionRequirement?: RegionRequirement;

  /** Specific region codes if SPECIFIC_REGIONS */
  specificRegions?: string[];

  /** Collaboration/consortium expectations */
  collaborationExpectation?: CollaborationExpectation;

  /** Whether a research institute partner is required */
  requiresResearchInstitute?: boolean;

  // ─── Semantic Dimensions (proximity/distance comparison) ────

  /** Primary domain — more specific than broad industry category */
  primaryDomain?: string;

  /** Related sub-domains */
  subDomains?: string[];

  /** Technology keywords specific to this program */
  technologyKeywords?: string[];

  /** Expected organizational capabilities */
  expectedCapabilities?: string[];

  /** What the government wants from this program */
  desiredOutcomes?: string[];

  /** SME-specific: what kind of support this program provides */
  supportPurpose?: string[];

  // ─── Metadata ──────────────────────────────────────────────

  /** Overall profile confidence (0.0 - 1.0) */
  confidence: number;

  /** How this profile was generated */
  generatedBy: GenerationMethod;

  /** Per-dimension confidence levels */
  dimensionConfidence?: Partial<Record<IdealProfileDimension, DimensionConfidence>>;

  /** Total source text length used for generation */
  sourceTextLength?: number;
}

/** All dimension names for confidence tracking */
export type IdealProfileDimension =
  | 'organizationTypes'
  | 'preferredScales'
  | 'businessAge'
  | 'trlRange'
  | 'programStage'
  | 'financialProfile'
  | 'requiredCertifications'
  | 'regionRequirement'
  | 'collaborationExpectation'
  | 'primaryDomain'
  | 'subDomains'
  | 'technologyKeywords'
  | 'expectedCapabilities'
  | 'desiredOutcomes'
  | 'supportPurpose';

// ═══════════════════════════════════════════════════════════════
// Proximity Score Interface
// ═══════════════════════════════════════════════════════════════

/**
 * Result of comparing an organization against an ideal applicant profile.
 * Total: 100 points across 7 dimensions.
 */
export interface ProximityScore {
  /** Total score (0-100) */
  totalScore: number;

  /** Per-dimension scores */
  dimensions: {
    /** How well org's domain matches ideal sub-domains (0-30) */
    domainFit: number;
    /** TRL distance + technology keyword overlap (0-20) */
    technologyFit: number;
    /** Scale match (preferred vs acceptable) + business age (0-15) */
    organizationFit: number;
    /** Expected capabilities matched by org's certs/tech/experience (0-15) */
    capabilityFit: number;
    /** Hard requirement compliance: certs, research institute, structure (0-10) */
    complianceFit: number;
    /** Revenue range and financial profile alignment (0-5) */
    financialFit: number;
    /** Deadline proximity (0-5) */
    deadlineUrgency: number;
  };

  /** Korean explanation per dimension */
  explanations: {
    domainFit: string;
    technologyFit: string;
    organizationFit: string;
    capabilityFit: string;
    complianceFit: string;
    financialFit: string;
    deadlineUrgency: string;
  };

  /** Summary explanation in Korean */
  summary: string;

  /** What the organization is missing vs the ideal profile */
  gaps: ProximityGap[];

  /** Confidence of this score (based on profile confidence) */
  confidence: number;

  /** Algorithm version */
  algorithmVersion: string;
}

/**
 * A gap between the organization and the ideal applicant profile.
 */
export interface ProximityGap {
  /** Which dimension has the gap */
  dimension: keyof ProximityScore['dimensions'];

  /** Korean description of the gap */
  description: string;

  /** Severity: how much this gap matters */
  severity: 'HIGH' | 'MEDIUM' | 'LOW';

  /** Whether this gap is a hard blocker (compliance) or soft (preference) */
  isBlocker: boolean;
}

// ═══════════════════════════════════════════════════════════════
// Utility Types
// ═══════════════════════════════════════════════════════════════

/**
 * Algorithm comparison result for shadow mode (Phase 5).
 */
export interface AlgorithmComparison {
  organizationId: string;
  programId: string;
  programType: 'RD' | 'SME';

  /** Score from current algorithm (v4.4 / SME v2.0) */
  currentScore: number;
  /** Score from new proximity algorithm (v5.0) */
  proximityScore: number;
  /** Delta (positive = new algorithm scores higher) */
  scoreDelta: number;

  /** Rank in current algorithm's result set */
  currentRank: number;
  /** Rank in new algorithm's result set */
  proximityRank: number;

  /** Proximity score breakdown */
  proximityBreakdown: ProximityScore;

  /** Timestamp */
  comparedAt: Date;
}

/**
 * Feature flag for algorithm selection.
 */
export type MatchingAlgorithmVersion = 'v4.4' | 'v5.0-ideal-profile';

/**
 * Get the active matching algorithm from environment.
 */
export function getActiveAlgorithm(): MatchingAlgorithmVersion {
  const env = process.env.MATCHING_ALGORITHM;
  if (env === 'v5.0-ideal-profile') return 'v5.0-ideal-profile';
  return 'v4.4'; // default: current production
}

/**
 * Check if shadow mode is enabled (run both algorithms, log comparison).
 */
export function isShadowModeEnabled(): boolean {
  return process.env.MATCHING_SHADOW_MODE === 'true';
}
