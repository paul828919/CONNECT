/**
 * Funding Match Generation Algorithm (Enhanced v3.1)
 *
 * Rule-based matching system with advanced Korean language support
 * and semantic sub-domain matching for precise industry alignment.
 *
 * Scoring breakdown (0-100):
 * - Semantic sub-domain match: 25 points (NEW in v3.0 - industry-specific hard filters)
 * - Industry/keyword alignment: 20 points (reduced from 30)
 * - TRL compatibility: 15 points (reduced from 20)
 * - Organization type match: 15 points (reduced from 20)
 * - R&D experience match: 10 points (reduced from 15)
 * - Deadline proximity: 15 points
 * - Non-enriched penalty: -15 points (NEW in v3.1 - for programs lacking semantic data)
 *
 * Enhancements in v3.1:
 * - Non-enriched program penalty (-15 points when org has semantic data but program doesn't)
 * - Addresses gap where 52/85 programs bypass semantic filters due to enrichment failures
 *
 * Enhancements in v3.0:
 * - Semantic sub-domain matching (BIO_HEALTH: human vs animal, ICT: consumer vs enterprise, etc.)
 * - Industry-specific hard filters (ORGANISM_MISMATCH, MARKET_MISMATCH, etc.)
 * - Graceful fallback when semantic data unavailable (uses v2.0 scoring)
 *
 * Enhancements in v2.0:
 * - Korean keyword normalization and synonym matching
 * - Hierarchical industry taxonomy with cross-industry relevance
 * - Graduated TRL scoring instead of binary pass/fail
 * - Technology keyword matching for research institutes
 */

import { organizations, funding_programs, ProgramStatus, EmployeeCountRange } from '@prisma/client';
import { scoreIndustryKeywordsEnhanced } from './keywords';
import { scoreTRLEnhanced } from './trl';
import { checkEligibility, EligibilityLevel } from './eligibility';
import { findIndustrySector, INDUSTRY_RELEVANCE } from './taxonomy';
import {
  HARD_FILTER_FIELDS,
  type SemanticMatchResult,
  type SemanticMismatchReason,
} from './semantic-subdomain';

// Type aliases for cleaner code
type Organization = organizations;
type FundingProgram = funding_programs;

export interface MatchScore {
  programId: string;
  program: FundingProgram;
  score: number;
  breakdown: {
    semanticScore: number;    // NEW in v3.0: Semantic sub-domain alignment (0-25)
    industryScore: number;    // Industry/keyword alignment (0-20, reduced from 30)
    trlScore: number;         // TRL compatibility (0-15, reduced from 20)
    typeScore: number;        // Organization type match (0-15, reduced from 20)
    rdScore: number;          // R&D experience (0-10, reduced from 15)
    deadlineScore: number;    // Deadline proximity (0-15)
    nonEnrichedPenalty?: number; // v3.1: Penalty for programs lacking semantic data (0 or -15)
  };
  reasons: string[]; // Keys for explanation generator
  semanticMatchInfo?: {       // NEW in v3.0: Semantic matching details
    reason: SemanticMismatchReason;
    isHardFilter: boolean;
    explanation?: string;     // Korean explanation for user
    matchingFields: string[];
    mismatchedFields: string[];
  };
  eligibilityLevel?: EligibilityLevel; // Phase 2: Three-tier eligibility
  eligibilityDetails?: {
    hardRequirementsMet: boolean;
    softRequirementsMet: boolean;
    failedRequirements: string[];
    metRequirements: string[];
    needsManualReview: boolean;
    manualReviewReason?: string;
  };
}

export interface GenerateMatchesOptions {
  includeExpired?: boolean; // Allow matching against EXPIRED programs (for historical matches)
  minimumScore?: number; // Minimum match score threshold (default: 45, user setting: 60)
}

/**
 * Normalize title for deduplication key generation
 * Removes year prefixes, trailing parentheticals, and normalizes whitespace
 */
function normalizeForDedup(title: string): string {
  return title
    .replace(/^\d{4}년도?\s*/g, '')           // Remove year prefix: "2025년도 " → ""
    .replace(/\([^)]*\)\s*$/g, '')             // Remove trailing parenthetical
    .replace(/_?\(?20\d{2}\)?.*$/g, '')        // Remove year suffix patterns
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Generate deduplication key from program
 */
function generateDedupKey(program: FundingProgram): string {
  const normalized = normalizeForDedup(program.title);
  return `${program.agencyId}|${normalized}`;
}

/**
 * Deduplicate programs by normalized title
 *
 * This is a safety net that prevents duplicate matches from appearing
 * even if duplicates exist in the database. It groups programs by
 * (agencyId, normalizedTitle) and returns the best program from each group.
 *
 * Selection criteria (in order):
 * 1. Programs with deadlines preferred over those without
 * 2. Programs with budgets preferred over those without
 * 3. Earlier scraped programs preferred (original source)
 */
function deduplicateProgramsByTitle(programs: FundingProgram[]): FundingProgram[] {
  const groups = new Map<string, FundingProgram[]>();

  for (const program of programs) {
    const key = generateDedupKey(program);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(program);
  }

  // Return best program from each group
  return Array.from(groups.values()).map(group => {
    return group.sort((a, b) => {
      // Prefer programs with deadlines
      if (a.deadline && !b.deadline) return -1;
      if (!a.deadline && b.deadline) return 1;
      // Prefer programs with budgets
      if (a.budgetAmount && !b.budgetAmount) return -1;
      if (!a.budgetAmount && b.budgetAmount) return 1;
      // Prefer earlier scraped (original source)
      return new Date(a.scrapedAt).getTime() - new Date(b.scrapedAt).getTime();
    })[0];
  });
}

/**
 * Generate match scores for an organization against funding programs
 */
export function generateMatches(
  organization: Organization,
  programs: FundingProgram[],
  limit: number = 3,
  options?: GenerateMatchesOptions
): MatchScore[] {
  if (!organization || !programs || programs.length === 0) {
    return [];
  }

  // ============================================================================
  // Phase 3: Deduplicate programs before matching (safety net)
  // ============================================================================
  // Even after database cleanup and hash algorithm fix, this ensures
  // users never see duplicate matches if duplicates somehow exist
  const deduplicatedPrograms = deduplicateProgramsByTitle(programs);

  const matches: MatchScore[] = [];

  for (const program of deduplicatedPrograms) {
    // Skip inactive or expired programs (unless explicitly including expired for historical matches)
    if (!options?.includeExpired && program.status !== ProgramStatus.ACTIVE) {
      continue;
    }

    // Skip programs with past deadlines (unless explicitly including expired for historical matches)
    if (!options?.includeExpired && program.deadline && new Date(program.deadline) < new Date()) {
      continue;
    }

    // ============================================================================
    // Filter Consolidated Announcements (통합 공고)
    // ============================================================================
    // Consolidated announcements lack critical application details and reference
    // external websites for individual project details. These detailed projects
    // are re-announced separately with complete information.
    // Skip if ALL three critical fields are missing: deadline, applicationStart, AND budgetAmount
    if (!program.deadline && !program.applicationStart && !program.budgetAmount) {
      continue; // Consolidated announcement - lacks actionable application details
    }

    // Skip if program doesn't target this organization type
    // EXCEPTION: For historical matches (EXPIRED programs), allow all types for reference learning
    if (program.targetType && !program.targetType.includes(organization.type)) {
      if (!options?.includeExpired) {
        continue; // Strict filter for ACTIVE programs (application eligibility)
      }
      // Allow mismatch for EXPIRED programs (users want to learn from all types)
    }

    // ============================================================================
    // Eligibility-First Matching: Filter before scoring to maintain user trust
    // ============================================================================

    // Business structure requirement check (CRITICAL - prevents fatal mismatches)
    // If program specifies allowed business structures, organization must match
    if (program.allowedBusinessStructures && program.allowedBusinessStructures.length > 0) {
      const orgBusinessStructure = organization.businessStructure;

      // Skip if organization's business structure is not in allowed list
      if (orgBusinessStructure && !program.allowedBusinessStructures.includes(orgBusinessStructure)) {
        continue;
      }

      // Skip if organization has no business structure specified (NULL)
      // Conservative approach: Require explicit match when program has restrictions
      if (!orgBusinessStructure) {
        continue;
      }
    }

    // ============================================================================
    // TRL Hard Requirement Filter (기술성숙도 필수 조건)
    // ============================================================================
    // TRL (Technology Readiness Level) represents development stage maturity (1-9 scale)
    // Programs target specific TRL ranges based on research stage (basic research, applied, commercialization)
    // Organizations outside the TRL range are fundamentally incompatible - not just a scoring penalty
    // Example: Early-stage research program (TRL 1-3) cannot accept commercialization-ready company (TRL 7-9)
    //
    // DUAL-TRL SYSTEM (v2.1):
    // - Use targetResearchTRL (연구개발 희망 기술 수준) for matching if available
    // - Fall back to technologyReadinessLevel (기존 보유 기술 수준) if targetResearchTRL not set
    // - This allows companies with TRL 9 products to match TRL 3 programs if they want new R&D
    //
    // RELAXATION FOR HISTORICAL MATCHES:
    // For EXPIRED programs (historical reference), expand TRL range by ±3
    // Rationale: Users want to learn from adjacent TRL programs to understand funding landscape
    const matchingTRL = organization.targetResearchTRL || organization.technologyReadinessLevel;
    if (program.minTrl !== null && program.maxTrl !== null && matchingTRL) {
      const orgTRL = matchingTRL;

      if (options?.includeExpired) {
        // RELAXED TRL for historical reference: ±3 range
        // Example: Program TRL 4-6 → Accept org TRL 1-9 (relaxedMin=1, relaxedMax=9)
        const relaxedMin = Math.max(1, program.minTrl - 3);
        const relaxedMax = Math.min(9, program.maxTrl + 3);

        if (orgTRL < relaxedMin || orgTRL > relaxedMax) {
          continue; // Still outside extended range
        }
      } else {
        // STRICT TRL for active applications: exact range
        if (orgTRL < program.minTrl || orgTRL > program.maxTrl) {
          continue; // TRL incompatible - organization's development stage doesn't fit this program
        }
      }
    }

    // ============================================================================
    // Hospital/Medical Institution Filter (병원/의료기관 전용 프로그램 필터)
    // ============================================================================
    // Physician-scientist programs require 상급종합병원 (tertiary hospitals - only 47 in Korea)
    // and M.D.-Ph.D. researchers per 의료법 (Medical Service Act)
    // Despite having COMPANY in targetType due to extraction limitations,
    // these programs are exclusively for medical research institutions
    // Data shows: researchInstituteFocus=true is too broad (98.4% of programs)
    // Solution: Filter by hospital/medical-specific keywords in title
    const hospitalOnlyKeywords = [
      '의사과학자',      // Physician-scientist
      '상급종합병원',     // Tertiary general hospital
      'M.D.-Ph.D.',     // Medical doctor with PhD
      '의료법',         // Medical Service Act
    ];

    // Check if program title contains hospital/medical-specific keywords
    const isHospitalOnlyProgram = hospitalOnlyKeywords.some((keyword) =>
      program.title.includes(keyword)
    );

    if (isHospitalOnlyProgram) {
      // Only allow RESEARCH_INSTITUTE organizations for hospital-specific programs
      if (organization.type !== 'RESEARCH_INSTITUTE') {
        continue; // Hospital/medical-only program - companies not eligible
      }
    }

    // ============================================================================
    // Industry Category Compatibility Filter (HARD REQUIREMENT)
    // ============================================================================
    // Organizations should only match programs in compatible industry categories
    // Uses taxonomy cross-industry relevance matrix (minimum threshold: 0.3)
    //
    // RATIONALE:
    // - Prevents fundamentally incompatible matches (e.g., ICT company → DEFENSE program)
    // - Scoring-based approach alone is insufficient (weak keyword matches can accumulate points)
    // - Hard filter ensures semantic industry compatibility before any scoring occurs
    //
    // THRESHOLD: 0.3 (30% relevance) for ACTIVE programs
    // - Below 0.3: Industries are fundamentally incompatible (blocked)
    // - Above 0.3: Industries have meaningful overlap (allowed, then scored)
    //
    // RELAXATION FOR HISTORICAL MATCHES:
    // For EXPIRED programs (historical reference), BYPASS industry filter entirely
    // Rationale: Users want to learn from cross-industry examples regardless of relevance
    if (organization.industrySector && program.category) {
      const orgSector = findIndustrySector(organization.industrySector);
      const programSector = findIndustrySector(program.category);

      // Both sectors must exist in taxonomy for compatibility check
      if (orgSector && programSector) {
        // Look up cross-industry relevance score
        const relevanceScore = INDUSTRY_RELEVANCE[orgSector]?.[programSector] ?? 0;

        if (!options?.includeExpired) {
          // STRICT industry filter for ACTIVE programs (application eligibility)
          // Threshold raised from 0.3 to 0.4 to improve match quality
          if (relevanceScore < 0.4) {
            continue; // Industry mismatch - fundamentally incompatible
          }
        }
        // For EXPIRED programs: Allow all cross-industry matches for learning purposes
        // Users benefit from seeing historical programs across diverse sectors
      } else {
        // CRITICAL FIX: If either sector cannot be identified, BLOCK the match
        // This prevents bypassing industry compatibility checks with unknown categories
        // Previously this was allowing matches to proceed, causing irrelevant matches
        if (!options?.includeExpired) {
          continue; // Cannot verify industry compatibility - block for safety
        }
      }
    }

    // ============================================================================
    // Semantic Sub-Domain Hard Filter (NEW in v3.0)
    // ============================================================================
    // This filter checks for semantic sub-domain mismatches that make matching
    // fundamentally incompatible, regardless of other factors.
    //
    // Examples of hard-filtered mismatches:
    // - BIO_HEALTH: Animal medicine company → Human medicine program (ORGANISM_MISMATCH)
    // - ICT: Enterprise B2B company → Consumer app program (MARKET_MISMATCH)
    // - ENERGY: Battery company → Nuclear program (ENERGY_SOURCE_MISMATCH)
    //
    // NOTE: Only applies when BOTH org and program have semantic data.
    // Programs without semantic data fallback to v2.0 industry matching.
    const semanticResult = scoreSemanticSubDomainMatch(organization, program);
    if (semanticResult.isHardFilter) {
      // Skip this program - semantic sub-domain fundamentally incompatible
      continue;
    }

    // ============================================================================
    // Enhanced Eligibility Checking (Phase 2)
    // ============================================================================
    // Check comprehensive eligibility (certifications, investment, revenue, employees, operating years)
    // Uses three-tier classification: FULLY_ELIGIBLE, CONDITIONALLY_ELIGIBLE, INELIGIBLE
    const eligibilityResult = checkEligibility(program, organization);

    // CRITICAL: Skip INELIGIBLE programs entirely (hidden from results)
    if (eligibilityResult.level === EligibilityLevel.INELIGIBLE) {
      continue;
    }

    // NOTE: FULLY_ELIGIBLE and CONDITIONALLY_ELIGIBLE programs proceed to scoring
    // They can be distinguished later in the UI with badges/indicators

    const matchScore = calculateMatchScore(organization, program, semanticResult);

    // Attach eligibility information to match result (Phase 2)
    matchScore.eligibilityLevel = eligibilityResult.level;
    matchScore.eligibilityDetails = {
      hardRequirementsMet: eligibilityResult.hardRequirementsMet,
      softRequirementsMet: eligibilityResult.softRequirementsMet,
      failedRequirements: eligibilityResult.failedRequirements,
      metRequirements: eligibilityResult.metRequirements,
      needsManualReview: eligibilityResult.needsManualReview,
      manualReviewReason: eligibilityResult.manualReviewReason,
    };

    // Attach semantic matching details (NEW in v3.0)
    if (semanticResult.reason !== 'NO_SEMANTIC_DATA') {
      matchScore.semanticMatchInfo = {
        reason: semanticResult.reason,
        isHardFilter: semanticResult.isHardFilter,
        explanation: semanticResult.explanation,
        matchingFields: semanticResult.matchingFields,
        mismatchedFields: semanticResult.mismatchedFields,
      };
    }

    matches.push(matchScore);
  }

  // Filter out low-quality matches based on minimum score threshold
  // Default: 45 points (absolute minimum for match quality)
  // User setting: Typically 60 points (from notification settings)
  const minimumScore = options?.minimumScore ?? 45;

  // Sort by eligibility level first (FULLY_ELIGIBLE > CONDITIONALLY_ELIGIBLE), then by score
  return matches
    .filter((m) => m.score >= minimumScore)
    .sort((a, b) => {
      // Primary sort: Eligibility level
      if (a.eligibilityLevel !== b.eligibilityLevel) {
        // FULLY_ELIGIBLE ranks higher than CONDITIONALLY_ELIGIBLE
        if (a.eligibilityLevel === EligibilityLevel.FULLY_ELIGIBLE) return -1;
        if (b.eligibilityLevel === EligibilityLevel.FULLY_ELIGIBLE) return 1;
      }

      // Secondary sort: Match score (highest first)
      return b.score - a.score;
    })
    .slice(0, limit);
}

/**
 * Calculate match score between organization and program
 * Updated in v3.0 to include semantic sub-domain scoring
 */
export function calculateMatchScore(
  organization: Organization,
  program: FundingProgram,
  precomputedSemanticResult?: SemanticMatchResult
): MatchScore {
  if (!organization || !program) {
    return {
      programId: program?.id || '',
      program: program,
      score: 0,
      breakdown: {
        semanticScore: 0,
        industryScore: 0,
        trlScore: 0,
        typeScore: 0,
        rdScore: 0,
        deadlineScore: 0,
      },
      reasons: [],
    };
  }

  const reasons: string[] = [];

  // 1. Semantic Sub-Domain Match (25 points) - NEW in v3.0
  // Uses precomputed result from hard filter check, or computes fresh if not provided
  const semanticResult = precomputedSemanticResult || scoreSemanticSubDomainMatch(organization, program);
  const semanticScore = semanticResult.score;
  if (semanticResult.reason !== 'NO_SEMANTIC_DATA') {
    reasons.push(semanticResult.reason);
  }

  // 2. Industry/Keyword alignment (20 points, reduced from 30) - ENHANCED
  // When semantic matching is active, industry scoring provides supplementary context
  const industryResult = scoreIndustryKeywordsEnhanced(organization, program);
  // Scale industry score: if semantic data exists, cap at 20; otherwise allow full 30 for backward compat
  const hasSemanticData = semanticResult.reason !== 'NO_SEMANTIC_DATA';
  const industryScore = hasSemanticData
    ? Math.min(20, Math.round(industryResult.score * (20 / 30)))
    : industryResult.score;
  reasons.push(...industryResult.reasons);

  // 3. TRL compatibility (15 points, reduced from 20) - ENHANCED
  const trlResult = scoreTRLEnhanced(organization, program);
  const trlScore = hasSemanticData
    ? Math.min(15, Math.round(trlResult.score * (15 / 20)))
    : trlResult.score;
  reasons.push(trlResult.reason);

  // 4. Organization type match (15 points, reduced from 20)
  const rawTypeScore = scoreOrganizationType(organization, program, reasons);
  const typeScore = hasSemanticData
    ? Math.min(15, Math.round(rawTypeScore * (15 / 20)))
    : rawTypeScore;

  // 5. R&D experience (10 points, reduced from 15)
  const rawRdScore = scoreRDExperience(organization, program, reasons);
  const rdScore = hasSemanticData
    ? Math.min(10, Math.round(rawRdScore * (10 / 15)))
    : rawRdScore;

  // 6. Deadline proximity (15 points, unchanged)
  const deadlineScore = scoreDeadline(program, reasons);

  // ============================================================================
  // v3.1: Non-Enriched Program Penalty
  // ============================================================================
  // When organization HAS semantic data but program LACKS it, apply a penalty.
  // This ensures programs that couldn't be semantically validated rank lower
  // than those that have been validated as compatible.
  //
  // Rationale:
  // - 52 of 85 active programs lack semantic enrichment (validation failures)
  // - These programs bypass the semantic hard filter (targetMarket compatibility)
  // - Without penalty, they can outscore validated matches via keyword matches
  // - 15-point penalty drops them from ~70 → ~55 (below typical minimumScore=60)
  const orgSemanticData = organization.semanticSubDomain as Record<string, string> | null;
  const programSemanticData = program.semanticSubDomain as Record<string, string> | null;
  const nonEnrichedPenalty = (orgSemanticData && !programSemanticData) ? 15 : 0;

  if (nonEnrichedPenalty > 0) {
    reasons.push('NON_ENRICHED_PENALTY');
  }

  const totalScore = semanticScore + industryScore + trlScore + typeScore + rdScore + deadlineScore - nonEnrichedPenalty;

  return {
    programId: program.id,
    program,
    score: Math.round(Math.max(0, totalScore)), // Ensure non-negative
    breakdown: {
      semanticScore,
      industryScore,
      trlScore,
      typeScore,
      rdScore,
      deadlineScore,
      nonEnrichedPenalty: nonEnrichedPenalty > 0 ? -nonEnrichedPenalty : undefined,
    },
    reasons,
  };
}

// ═══════════════════════════════════════════════════════════════
// Semantic Sub-Domain Matching (NEW in v3.0)
// ═══════════════════════════════════════════════════════════════

/**
 * Score semantic sub-domain alignment between organization and program
 *
 * This function implements industry-specific matching logic:
 * - BIO_HEALTH: Checks targetOrganism (HUMAN vs ANIMAL vs PLANT)
 * - ICT: Checks targetMarket (CONSUMER vs ENTERPRISE vs GOVERNMENT)
 * - ENERGY: Checks energySource (SOLAR vs BATTERY vs NUCLEAR)
 * - AGRICULTURE: Checks targetSector (CROPS vs LIVESTOCK)
 * - DEFENSE: Checks targetDomain (LAND vs NAVAL vs AEROSPACE)
 *
 * Returns hard filter = true if fundamentally incompatible (should block match)
 *
 * @param org Organization with optional semanticSubDomain
 * @param program FundingProgram with optional semanticSubDomain
 * @returns SemanticMatchResult with score, reason, and hard filter flag
 */
export function scoreSemanticSubDomainMatch(
  org: Organization,
  program: FundingProgram
): SemanticMatchResult {
  // Check if semantic data exists for both
  const programSubDomain = program.semanticSubDomain as Record<string, string> | null;
  const orgSubDomain = org.semanticSubDomain as Record<string, string> | null;

  if (!programSubDomain || !orgSubDomain) {
    // No semantic data available - fallback to v2.0 scoring
    return {
      score: 0,
      reason: 'NO_SEMANTIC_DATA',
      isHardFilter: false,
      explanation: undefined,
      matchingFields: [],
      mismatchedFields: [],
    };
  }

  const category = program.category?.toUpperCase() || '';
  const hardFilterFields = HARD_FILTER_FIELDS[category] || [];

  // Check for hard filter violations
  for (const field of hardFilterFields) {
    const programValue = programSubDomain[field];
    const orgValue = orgSubDomain[field];

    // Only apply hard filter if BOTH have the field defined
    if (programValue && orgValue && programValue !== orgValue) {
      // Determine mismatch reason based on field
      let reason: SemanticMismatchReason = 'PARTIAL_MATCH';
      let explanation: string | undefined;

      if (field === 'targetOrganism') {
        reason = 'ORGANISM_MISMATCH';
        explanation = `이 과제는 ${getOrganismLabel(programValue)} 분야 프로그램이며, 귀사는 ${getOrganismLabel(orgValue)} 분야 기업입니다.`;
      } else if (field === 'targetMarket') {
        reason = 'MARKET_MISMATCH';
        explanation = `이 과제는 ${getMarketLabel(programValue)} 시장 대상이며, 귀사는 ${getMarketLabel(orgValue)} 시장 기업입니다.`;
      } else if (field === 'energySource') {
        reason = 'ENERGY_SOURCE_MISMATCH';
        explanation = `이 과제는 ${getEnergyLabel(programValue)} 분야이며, 귀사는 ${getEnergyLabel(orgValue)} 분야 기업입니다.`;
      } else if (field === 'targetSector') {
        reason = 'SECTOR_MISMATCH';
        explanation = `이 과제는 ${getSectorLabel(programValue)} 분야이며, 귀사는 ${getSectorLabel(orgValue)} 분야 기업입니다.`;
      } else if (field === 'targetDomain') {
        reason = 'DOMAIN_MISMATCH';
        explanation = `이 과제는 ${getDomainLabel(programValue)} 분야이며, 귀사는 ${getDomainLabel(orgValue)} 분야 기업입니다.`;
      }

      return {
        score: 0,
        reason,
        isHardFilter: true,
        explanation,
        matchingFields: [],
        mismatchedFields: [field],
      };
    }
  }

  // No hard filter triggered - calculate match score
  const allFieldsSet = new Set([...Object.keys(programSubDomain), ...Object.keys(orgSubDomain)]);
  const allFields = Array.from(allFieldsSet);
  const matchingFields: string[] = [];
  const mismatchedFields: string[] = [];

  for (const field of allFields) {
    const programValue = programSubDomain[field];
    const orgValue = orgSubDomain[field];

    if (programValue && orgValue) {
      if (programValue === orgValue) {
        matchingFields.push(field);
      } else {
        mismatchedFields.push(field);
      }
    }
  }

  // Calculate score based on matching fields (max 25 points)
  // Each matching field: 12 points (up to 2 fields typically)
  // Partial match bonus: +1 point per matching field
  const baseScore = Math.min(25, matchingFields.length * 12 + matchingFields.length);

  // Penalty for mismatched non-hard-filter fields (soft mismatch)
  const softPenalty = mismatchedFields.filter(f => !hardFilterFields.includes(f)).length * 3;
  const finalScore = Math.max(0, baseScore - softPenalty);

  const reason: SemanticMismatchReason = matchingFields.length > 0 ? 'SEMANTIC_MATCH' : 'PARTIAL_MATCH';

  // Generate explanation for matching
  let explanation: string | undefined;
  if (matchingFields.length > 0) {
    explanation = `귀사의 사업 분야와 과제의 대상 분야가 일치합니다.`;
  }

  return {
    score: finalScore,
    reason,
    isHardFilter: false,
    explanation,
    matchingFields,
    mismatchedFields,
  };
}

// Helper functions for Korean labels
function getOrganismLabel(value: string): string {
  const labels: Record<string, string> = {
    HUMAN: '인체',
    ANIMAL: '동물',
    PLANT: '식물',
    MICROBIAL: '미생물',
    MARINE: '해양생물',
  };
  return labels[value] || value;
}

function getMarketLabel(value: string): string {
  const labels: Record<string, string> = {
    CONSUMER: '일반 소비자',
    ENTERPRISE: '기업(B2B)',
    GOVERNMENT: '공공기관',
    INDUSTRIAL: '산업용',
  };
  return labels[value] || value;
}

function getEnergyLabel(value: string): string {
  const labels: Record<string, string> = {
    SOLAR: '태양광',
    WIND: '풍력',
    NUCLEAR: '원자력',
    HYDROGEN: '수소',
    BATTERY: '배터리/이차전지',
    GRID: '전력망',
  };
  return labels[value] || value;
}

function getSectorLabel(value: string): string {
  const labels: Record<string, string> = {
    CROPS: '작물',
    LIVESTOCK: '축산',
    AQUACULTURE: '양식/수산',
    FORESTRY: '임업',
    FOOD_PROCESSING: '식품가공',
  };
  return labels[value] || value;
}

function getDomainLabel(value: string): string {
  const labels: Record<string, string> = {
    LAND: '지상',
    NAVAL: '해상',
    AEROSPACE: '항공우주',
    CYBER: '사이버',
    SPACE: '우주',
  };
  return labels[value] || value;
}

/**
 * Score industry/keyword alignment (0-30 points)
 * @deprecated Use scoreIndustryKeywordsEnhanced() from './keywords' instead
 *
 * This function is kept for reference but no longer used in v2.0.
 * The enhanced version provides:
 * - Korean keyword normalization
 * - Hierarchical industry taxonomy
 * - Cross-industry relevance scoring
 * - Technology keyword matching
 */
/*
function scoreIndustryKeywords(
  org: Organization,
  program: FundingProgram,
  reasons: string[]
): number {
  const orgSector = org.industrySector?.toUpperCase() || '';
  const programKeywords = program.keywords?.map(k => k.toUpperCase()) || [];
  const programCategory = program.category?.toUpperCase() || '';

  if (!orgSector) return 0;

  let score = 0;

  // Check if org sector matches program category
  if (programCategory && orgSector.includes(programCategory)) {
    score += 15;
    reasons.push('INDUSTRY_CATEGORY_MATCH');
  } else if (programCategory && programCategory.includes(orgSector)) {
    score += 15;
    reasons.push('INDUSTRY_CATEGORY_MATCH');
  }

  // Check keyword matches
  const keywordMatches = programKeywords.filter(keyword =>
    orgSector.includes(keyword) || keyword.includes(orgSector)
  );

  if (keywordMatches.length > 0) {
    score += Math.min(15, keywordMatches.length * 5);
    reasons.push('KEYWORD_MATCH');
  }

  // If research institute, check research focus areas
  if (org.researchFocusAreas && org.researchFocusAreas.length > 0) {
    const focusMatches = org.researchFocusAreas.filter(area =>
      programKeywords.some(keyword =>
        area.toUpperCase().includes(keyword) || keyword.includes(area.toUpperCase())
      )
    );
    if (focusMatches.length > 0) {
      score += 10;
      reasons.push('RESEARCH_FOCUS_MATCH');
    }
  }

  return Math.min(30, score);
}
*/

/**
 * Score TRL compatibility (0-20 points)
 * @deprecated Use scoreTRLEnhanced() from './trl' instead
 *
 * This function is kept for reference but no longer used in v2.0.
 * The enhanced version provides:
 * - Graduated scoring (not just binary 0 or 20)
 * - Distance-based weighting (±1: 12-15 pts, ±2: 6-10 pts, ±3: 0-5 pts)
 * - TRL stage recommendations
 * - Korean descriptions and explanations
 */
/*
function scoreTRL(
  org: Organization,
  program: FundingProgram,
  reasons: string[]
): number {
  const orgTRL = org.technologyReadinessLevel;
  const minTRL = program.minTrl;
  const maxTRL = program.maxTrl;

  if (!orgTRL) return 0;
  if (!minTRL && !maxTRL) return 10; // No TRL requirement

  // Check if org TRL is within program range
  const withinMin = !minTRL || orgTRL >= minTRL;
  const withinMax = !maxTRL || orgTRL <= maxTRL;

  if (withinMin && withinMax) {
    reasons.push('TRL_COMPATIBLE');
    return 20;
  }

  if (orgTRL < minTRL!) {
    reasons.push('TRL_TOO_LOW');
    // Partial credit if close
    const diff = minTRL! - orgTRL;
    return diff === 1 ? 10 : 0;
  }

  if (orgTRL > maxTRL!) {
    reasons.push('TRL_TOO_HIGH');
    // Partial credit if close
    const diff = orgTRL - maxTRL!;
    return diff === 1 ? 10 : 0;
  }

  return 0;
}
*/

/**
 * Score organization type match (0-20 points)
 */
function scoreOrganizationType(
  org: Organization,
  program: FundingProgram,
  reasons: string[]
): number {
  if (!program.targetType || program.targetType.length === 0) {
    return 10; // No restriction
  }

  if (program.targetType.includes(org.type)) {
    reasons.push('TYPE_MATCH');
    return 20;
  }

  return 0;
}

/**
 * Score R&D experience (0-15 points)
 * Enhanced with Tier 1B: Graduated collaboration scoring
 */
function scoreRDExperience(
  org: Organization,
  program: FundingProgram,
  reasons: string[]
): number {
  let score = 0;

  if (org.rdExperience) {
    score += 10;
    reasons.push('RD_EXPERIENCE');
  }

  // Tier 1B: Graduated collaboration scoring (1=+2pts, 2-3=+4pts, 4+=+5pts)
  if (org.collaborationCount) {
    if (org.collaborationCount === 1) {
      score += 2;
      reasons.push('COLLABORATION_LIMITED');
    } else if (org.collaborationCount >= 2 && org.collaborationCount <= 3) {
      score += 4;
      reasons.push('COLLABORATION_MODERATE');
    } else if (org.collaborationCount >= 4) {
      score += 5;
      reasons.push('COLLABORATION_EXTENSIVE');
    }
  }

  return Math.min(15, score);
}

/**
 * Score deadline proximity (0-15 points)
 */
function scoreDeadline(program: FundingProgram, reasons: string[]): number {
  if (!program.deadline) {
    return 5; // Default score if no deadline
  }

  const now = new Date();
  const deadline = new Date(program.deadline);
  const daysUntil = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntil < 0) {
    return 0; // Expired
  }

  if (daysUntil <= 7) {
    reasons.push('DEADLINE_URGENT');
    return 15;
  }

  if (daysUntil <= 30) {
    reasons.push('DEADLINE_SOON');
    return 12;
  }

  if (daysUntil <= 60) {
    reasons.push('DEADLINE_MODERATE');
    return 8;
  }

  reasons.push('DEADLINE_FAR');
  return 5;
}

/**
 * Get employee count numeric value from enum for reference
 */
export function getEmployeeCountValue(range: EmployeeCountRange | null): number | null {
  if (!range) return null;

  const ranges: Record<EmployeeCountRange, number> = {
    [EmployeeCountRange.UNDER_10]: 5,
    [EmployeeCountRange.FROM_10_TO_50]: 30,
    [EmployeeCountRange.FROM_50_TO_100]: 75,
    [EmployeeCountRange.FROM_100_TO_300]: 200,
    [EmployeeCountRange.OVER_300]: 500,
  };

  return ranges[range] || null;
}
