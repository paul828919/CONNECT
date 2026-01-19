/**
 * Funding Match Generation Algorithm (v4.0 - Keyword-Rule Based)
 *
 * Rule-based matching system with deterministic keyword classification.
 * Replaces LLM-based semantic enrichment with keyword rules derived from
 * 450+ actual NTIS program titles (2025-2026 data analysis).
 *
 * Scoring breakdown (0-100):
 * - Keyword industry match: 25 points (NEW in v4.0 - deterministic classification)
 * - Industry/keyword alignment: 20 points
 * - TRL compatibility: 15 points
 * - Organization type match: 15 points
 * - R&D experience match: 10 points
 * - Deadline proximity: 15 points
 *
 * Breaking changes in v4.0:
 * - REMOVED: LLM semantic sub-domain matching (61% failure rate, ~₩27/program)
 * - REMOVED: Non-enriched penalty (-15 points no longer needed)
 * - ADDED: Keyword-based industry classification (100% coverage, ₩0 cost)
 *
 * Key benefits of v4.0:
 * - 100% classification coverage (vs 39% with LLM)
 * - Zero LLM cost per program
 * - <10ms processing (vs 2-3 sec/program)
 * - Predictable & debuggable matching
 *
 * Previous enhancements retained:
 * - Korean keyword normalization and synonym matching
 * - Hierarchical industry taxonomy with cross-industry relevance
 * - Graduated TRL scoring instead of binary pass/fail
 * - Technology keyword matching for research institutes
 */

import { organizations, funding_programs, ProgramStatus, EmployeeCountRange, CompanyLocation, CompanyScaleType, KoreanRegion } from '@prisma/client';
import { scoreIndustryKeywordsEnhanced } from './keywords';
import { scoreTRLEnhanced } from './trl';
import { checkEligibility, EligibilityLevel } from './eligibility';
import { findIndustrySector, INDUSTRY_RELEVANCE } from './taxonomy';
import {
  classifyProgram,
  getIndustryRelevance,
  getIndustryKoreanLabel,
  type ClassificationResult,
} from './keyword-classifier';

// Type aliases for cleaner code
type Organization = organizations;
type FundingProgram = funding_programs;

// Extended organization type with locations for regional matching
export type OrganizationWithLocations = Organization & {
  locations?: CompanyLocation[];
};

// ============================================================================
// 중소벤처기업부 Regional Matching Helpers
// ============================================================================
// 수도권 (Metropolitan Area): Seoul, Gyeonggi, Incheon
// 비수도권 (Non-Metropolitan): 14 other regions
const METROPOLITAN_REGIONS: KoreanRegion[] = ['SEOUL', 'GYEONGGI', 'INCHEON'];

/**
 * Check if organization has at least one location in non-metropolitan area
 * Used for 지역혁신선도기업육성(R&D) and similar regional programs
 */
function hasNonMetropolitanLocation(organization: OrganizationWithLocations): boolean {
  if (!organization.locations || organization.locations.length === 0) {
    return false; // No location data - cannot verify eligibility
  }
  return organization.locations.some(
    loc => !METROPOLITAN_REGIONS.includes(loc.region)
  );
}

/**
 * Get all regions where organization has locations
 */
function getOrganizationRegions(organization: OrganizationWithLocations): KoreanRegion[] {
  if (!organization.locations) return [];
  return organization.locations.map(loc => loc.region);
}

/**
 * Regional keyword mapping for 중소벤처기업부 regional programs
 * Programs with these keywords in title require company presence in specific regions
 */
const SME_REGIONAL_KEYWORD_MAP: Record<string, KoreanRegion[]> = {
  // Metropolitan (수도권)
  '서울': ['SEOUL'],
  '인천': ['INCHEON'],
  '경기': ['GYEONGGI'],
  // Non-metropolitan (비수도권)
  '부산': ['BUSAN'],
  '울산': ['ULSAN'],
  '경남': ['GYEONGNAM'],
  '대구': ['DAEGU'],
  '경북': ['GYEONGBUK'],
  '광주': ['GWANGJU'],
  '전남': ['JEONNAM'],
  '전북': ['JEONBUK'],
  '대전': ['DAEJEON'],
  '충남': ['CHUNGNAM'],
  '충북': ['CHUNGBUK'],
  '세종': ['SEJONG'],
  '강원': ['GANGWON'],
  '제주': ['JEJU'],
};

export interface MatchScore {
  programId: string;
  program: FundingProgram;
  score: number;
  breakdown: {
    keywordScore: number;     // v4.0: Keyword-based industry alignment (0-25)
    industryScore: number;    // Industry/keyword alignment (0-20)
    trlScore: number;         // TRL compatibility (0-15)
    typeScore: number;        // Organization type match (0-15)
    rdScore: number;          // R&D experience (0-10)
    deadlineScore: number;    // Deadline proximity (0-15)
  };
  reasons: string[]; // Keys for explanation generator
  keywordMatchInfo?: {        // v4.0: Keyword classification details
    classifiedIndustry: string;
    confidence: number;
    matchedKeywords: string[];
    explanation?: string;     // Korean explanation for user
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
 *
 * @param organization - Organization with optional locations for regional matching
 * @param programs - Active funding programs to match against
 * @param limit - Maximum number of matches to return (default: 3)
 * @param options - Additional options (includeExpired, minimumScore)
 */
export function generateMatches(
  organization: OrganizationWithLocations,
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
    // 중소벤처기업부 Scale + Region Filter (v4.1 - Size & Location-Based Matching)
    // ============================================================================
    // ~80% of SME programs are cross-industry (창업성장기술개발, TIPS, 중소기업기술혁신개발)
    // ~15-20% are industry-specific (중소제조 산재예방, K-뷰티, 소부장)
    // Primary eligibility filter is company SIZE/AGE, not industry
    //
    // Strategy:
    // 1. Run keyword classification early to detect industry-specific programs
    // 2. Industry-specific programs → use normal industry filter
    // 3. Cross-industry programs → bypass industry filter, check scale + region
    //
    // @see: 25-26년도_공고목록_중소기업벤처부.csv (182+ programs analyzed)
    let bypassIndustryFilterForSME = false;

    if (program.ministry === '중소벤처기업부') {
      // Run keyword classification early for SME ministry programs
      const smeClassification = classifyProgram(
        program.title,
        null,
        program.ministry
      );

      // Check if industry-specific program (classifier detected non-GENERAL via keywords)
      // Industry-specific examples: 중소제조, K-뷰티, 소부장, 탄소감축
      if (smeClassification.industry !== 'GENERAL' && smeClassification.matchedKeywords.length > 0) {
        // Industry-specific SME program - let normal industry filter handle it
        // These programs have specific industry requirements
      } else {
        // Cross-industry SME program (창업성장기술개발, TIPS, 디딤돌, etc.)
        // Bypass industry filter but apply scale + region checks

        const orgScale = organization.companyScaleType;
        const orgRegions = getOrganizationRegions(organization);

        // ========== SCALE FILTER ==========
        // All 중소벤처기업부 programs exclude large enterprises (대기업)
        if (orgScale === 'LARGE_ENTERPRISE') {
          continue; // Large enterprises not eligible for SME programs
        }

        // 창업성장기술개발/TIPS/디딤돌 require STARTUP or early-stage SME
        // These programs target 창업기업 (업력 7년 이내)
        if (program.title.includes('창업성장') ||
            program.title.includes('TIPS') ||
            program.title.includes('팁스') ||
            program.title.includes('디딤돌')) {
          if (orgScale === 'MID_SIZED') {
            continue; // Mid-sized enterprises not eligible for startup programs
          }
        }

        // ========== REGION FILTER ==========
        // Check for 비수도권 (non-metropolitan) requirement
        // 지역혁신선도기업육성(R&D) - Only 비수도권 14개 시도
        if (program.title.includes('지역혁신선도') || program.title.includes('지역혁신')) {
          if (!hasNonMetropolitanLocation(organization)) {
            continue; // Metropolitan companies not eligible for regional innovation programs
          }
        }

        // Check for regional variants (부산/울산/경남, 대구/경북, etc.)
        // These programs require company presence in specific regions
        let regionCheckPassed = true;
        for (const [regionKeyword, allowedRegions] of Object.entries(SME_REGIONAL_KEYWORD_MAP)) {
          if (program.title.includes(regionKeyword)) {
            // Program has region-specific requirement
            const hasMatchingRegion = orgRegions.some(r => allowedRegions.includes(r));
            if (!hasMatchingRegion && orgRegions.length > 0) {
              // Organization has location data but not in required region
              regionCheckPassed = false;
            }
            break; // Only check first matching region keyword
          }
        }

        if (!regionCheckPassed) {
          continue; // Organization not in required region
        }

        // Cross-industry SME program passed all checks
        // Mark to bypass the industry category compatibility filter below
        bypassIndustryFilterForSME = true;
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
    //
    // BYPASS FOR CROSS-INDUSTRY SME PROGRAMS (v4.1):
    // 중소벤처기업부 cross-industry programs already passed scale + region checks above
    // These programs are designed for all industries - filtering by industry would exclude eligible companies
    if (!bypassIndustryFilterForSME && organization.industrySector && program.category) {
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
    // Keyword-Based Industry Classification (v4.0)
    // ============================================================================
    // Classify program using deterministic keyword rules instead of LLM semantic data.
    // This provides 100% coverage (vs 39% with LLM) at zero cost.
    const keywordClassification = classifyProgram(
      program.title,
      null,  // programName not in schema
      program.ministry || null
    );

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

    const matchScore = calculateMatchScore(organization, program, keywordClassification);

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

    // Attach keyword matching details (v4.0)
    matchScore.keywordMatchInfo = {
      classifiedIndustry: keywordClassification.industry,
      confidence: keywordClassification.confidence,
      matchedKeywords: keywordClassification.matchedKeywords,
      explanation: `이 과제는 ${getIndustryKoreanLabel(keywordClassification.industry)} 분야로 분류됩니다.`,
    };

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
 * Updated in v4.0 to use keyword-based classification instead of LLM semantic enrichment
 */
export function calculateMatchScore(
  organization: Organization,
  program: FundingProgram,
  precomputedClassification?: ClassificationResult
): MatchScore {
  if (!organization || !program) {
    return {
      programId: program?.id || '',
      program: program,
      score: 0,
      breakdown: {
        keywordScore: 0,
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

  // 1. Keyword-Based Industry Match (25 points) - NEW in v4.0
  // Uses precomputed classification or computes fresh if not provided
  const classification = precomputedClassification || classifyProgram(
    program.title,
    null,  // programName not in schema
    program.ministry || null
  );
  const keywordScore = scoreKeywordIndustryMatch(organization, classification, reasons);

  // 2. Industry/Keyword alignment (20 points)
  const industryResult = scoreIndustryKeywordsEnhanced(organization, program);
  const industryScore = Math.min(20, Math.round(industryResult.score * (20 / 30)));
  reasons.push(...industryResult.reasons);

  // 3. TRL compatibility (15 points)
  const trlResult = scoreTRLEnhanced(organization, program);
  const trlScore = Math.min(15, Math.round(trlResult.score * (15 / 20)));
  reasons.push(trlResult.reason);

  // 4. Organization type match (15 points)
  const rawTypeScore = scoreOrganizationType(organization, program, reasons);
  const typeScore = Math.min(15, Math.round(rawTypeScore * (15 / 20)));

  // 5. R&D experience (10 points)
  const rawRdScore = scoreRDExperience(organization, program, reasons);
  const rdScore = Math.min(10, Math.round(rawRdScore * (10 / 15)));

  // 6. Deadline proximity (15 points)
  const deadlineScore = scoreDeadline(program, reasons);

  const totalScore = keywordScore + industryScore + trlScore + typeScore + rdScore + deadlineScore;

  return {
    programId: program.id,
    program,
    score: Math.round(Math.max(0, totalScore)), // Ensure non-negative
    breakdown: {
      keywordScore,
      industryScore,
      trlScore,
      typeScore,
      rdScore,
      deadlineScore,
    },
    reasons,
  };
}

/**
 * Score keyword-based industry alignment (0-25 points)
 * Replaces LLM semantic sub-domain scoring with deterministic keyword classification
 */
function scoreKeywordIndustryMatch(
  org: Organization,
  classification: ClassificationResult,
  reasons: string[]
): number {
  const orgIndustry = org.industrySector || org.primaryBusinessDomain;

  if (!orgIndustry) {
    // No industry data for organization - give moderate score
    reasons.push('KEYWORD_NO_ORG_INDUSTRY');
    return 10;
  }

  // Get relevance between org industry and program's classified industry
  const relevance = getIndustryRelevance(orgIndustry, classification.industry);

  // Perfect match (relevance 1.0) = 25 points
  // High relevance (0.7+) = 18-24 points
  // Medium relevance (0.4-0.7) = 10-17 points
  // Low relevance (<0.4) = 0-9 points
  const score = Math.round(25 * relevance);

  if (relevance >= 0.9) {
    reasons.push('KEYWORD_INDUSTRY_MATCH');
  } else if (relevance >= 0.5) {
    reasons.push('KEYWORD_INDUSTRY_RELATED');
  } else {
    reasons.push('KEYWORD_INDUSTRY_WEAK');
  }

  return score;
}

// ═══════════════════════════════════════════════════════════════
// REMOVED in v4.0: LLM Semantic Sub-Domain Matching
// ═══════════════════════════════════════════════════════════════
// The scoreSemanticSubDomainMatch function was removed in v4.0.
// It had 61% failure rate with ~₩27/program LLM cost.
// Replaced by keyword-based classifyProgram() from ./keyword-classifier.ts
// ═══════════════════════════════════════════════════════════════

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
