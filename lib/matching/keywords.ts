/**
 * Advanced Keyword Matching for Korean R&D Programs
 *
 * Features:
 * - Korean text normalization (spacing, case)
 * - Synonym matching via taxonomy
 * - Hierarchical industry matching
 * - Technology keyword detection
 * - Cross-industry relevance scoring
 */

import { organizations, funding_programs } from '@prisma/client';
import {
  findIndustrySector,
  findSubSector,
  getAllKeywordsForSector,
  calculateIndustryRelevance,
  normalizeKoreanKeyword,
  matchTechnologyKeyword,
  INDUSTRY_TAXONOMY,
} from './taxonomy';

// Type aliases for cleaner code
type Organization = organizations;
type FundingProgram = funding_programs;

export interface KeywordMatchResult {
  score: number; // 0-30 points
  reasons: string[];
  details: {
    exactMatches: number;
    sectorMatches: number;
    subSectorMatches: number;
    crossIndustryMatches: number;
    technologyMatches: number;
  };
}

/**
 * Categorized keywords from organization profile
 * Tracks source of keywords to provide accurate match explanations
 */
interface CategorizedKeywords {
  sectorKeywords: string[];      // From industrySector and taxonomy
  technologyKeywords: string[];  // From keyTechnologies
  researchKeywords: string[];    // From researchFocusAreas
  all: string[];                 // Combined for legacy compatibility
}

/**
 * Enhanced industry/keyword scoring with taxonomy and Korean support
 */
export function scoreIndustryKeywordsEnhanced(
  org: Organization,
  program: FundingProgram
): KeywordMatchResult {
  const result: KeywordMatchResult = {
    score: 0,
    reasons: [],
    details: {
      exactMatches: 0,
      sectorMatches: 0,
      subSectorMatches: 0,
      crossIndustryMatches: 0,
      technologyMatches: 0,
    },
  };

  // Extract organization keywords (categorized for accurate match explanations)
  const orgKeywordsCategorized = extractOrganizationKeywordsCategorized(org);

  // Extract program keywords
  const programKeywords = extractProgramKeywords(program);

  if (orgKeywordsCategorized.all.length === 0 || programKeywords.length === 0) {
    return result;
  }

  // ============================================================================
  // STAGE 2.2: Exact Category Match Bonus (+10 points)
  // ============================================================================
  // Award bonus for exact string match between org.industrySector and program.category
  // This ensures highly relevant programs rank above fuzzy taxonomy matches
  // Example: "제조업" org → "제조업" program category = +10 points (before keyword analysis)
  if (org.industrySector && program.category) {
    const normalizedOrgSector = normalizeKoreanKeyword(org.industrySector);
    const normalizedProgramCategory = normalizeKoreanKeyword(program.category);

    if (normalizedOrgSector === normalizedProgramCategory) {
      result.score += 10;
      result.details.sectorMatches++;
      result.reasons.push('EXACT_CATEGORY_MATCH');
    }
  }

  // 1. Exact keyword matching (up to 15 points) - using categorized approach
  // This ensures EXACT_KEYWORD_MATCH is only claimed when actual keyTechnologies matched
  const exactMatchScore = scoreExactKeywordMatchesCategorized(orgKeywordsCategorized, programKeywords, result);
  result.score += exactMatchScore;

  // 2. Sector-level matching (up to 10 points)
  const sectorMatchScore = scoreSectorMatches(org, program, result);
  result.score += sectorMatchScore;

  // 3. Cross-industry relevance (up to 5 points)
  // Skip if exact category match exists to avoid contradictory explanations
  // (can't be both "exact match" and "different industry with high relevance")
  if (!result.reasons.includes('EXACT_CATEGORY_MATCH')) {
    const crossIndustryScore = scoreCrossIndustryRelevance(org, program, result);
    result.score += crossIndustryScore;
  }

  // 4. Technology keyword matching for research institutes (bonus points)
  if (org.type === 'RESEARCH_INSTITUTE' && org.keyTechnologies) {
    const technologyScore = scoreTechnologyMatches(
      org.keyTechnologies,
      programKeywords,
      result
    );
    result.score += technologyScore;
  }

  // Cap at 30 points
  result.score = Math.min(30, result.score);

  return result;
}

/**
 * Extract normalized keywords from organization profile
 * Returns categorized keywords to track match source for accurate explanations
 */
function extractOrganizationKeywordsCategorized(org: Organization): CategorizedKeywords {
  const sectorKeywords: Set<string> = new Set();
  const technologyKeywords: Set<string> = new Set();
  const researchKeywords: Set<string> = new Set();

  // Industry sector keywords
  if (org.industrySector) {
    sectorKeywords.add(normalizeKoreanKeyword(org.industrySector));

    // Add all related keywords from taxonomy
    const sector = findIndustrySector(org.industrySector);
    if (sector) {
      const taxonomyKeywords = getAllKeywordsForSector(sector);
      taxonomyKeywords.forEach(k => sectorKeywords.add(normalizeKoreanKeyword(k)));
    }
  }

  // Research focus areas (for research institutes)
  if (org.researchFocusAreas && org.researchFocusAreas.length > 0) {
    org.researchFocusAreas.forEach(area => {
      researchKeywords.add(normalizeKoreanKeyword(area));
    });
  }

  // Key technologies (for research institutes)
  if (org.keyTechnologies && org.keyTechnologies.length > 0) {
    org.keyTechnologies.forEach(tech => {
      technologyKeywords.add(normalizeKoreanKeyword(tech));
    });
  }

  // Combine all for legacy compatibility
  const all = new Set([
    ...Array.from(sectorKeywords),
    ...Array.from(technologyKeywords),
    ...Array.from(researchKeywords),
  ]);

  return {
    sectorKeywords: Array.from(sectorKeywords),
    technologyKeywords: Array.from(technologyKeywords),
    researchKeywords: Array.from(researchKeywords),
    all: Array.from(all),
  };
}

/**
 * Extract normalized keywords from organization profile (legacy interface)
 * @deprecated Use extractOrganizationKeywordsCategorized for accurate match explanations
 */
function extractOrganizationKeywords(org: Organization): string[] {
  return extractOrganizationKeywordsCategorized(org).all;
}

/**
 * Extract normalized keywords from funding program
 */
function extractProgramKeywords(program: FundingProgram): string[] {
  const keywords: Set<string> = new Set();

  // Title keywords (extract meaningful words)
  if (program.title) {
    const titleWords = program.title.split(/\s+/);
    titleWords.forEach(word => {
      if (word.length >= 2) {
        // Filter out very short words
        keywords.add(normalizeKoreanKeyword(word));
      }
    });
  }

  // Category
  if (program.category) {
    keywords.add(normalizeKoreanKeyword(program.category));
  }

  // Explicit keywords array
  if (program.keywords && program.keywords.length > 0) {
    program.keywords.forEach(k => keywords.add(normalizeKoreanKeyword(k)));
  }

  // Description keywords (extract from first 200 chars)
  if (program.description) {
    const desc = program.description.substring(0, 200);
    const descWords = desc.split(/\s+/);
    descWords.forEach(word => {
      if (word.length >= 3) {
        // Longer words for description
        keywords.add(normalizeKoreanKeyword(word));
      }
    });
  }

  return Array.from(keywords);
}

/**
 * Score exact keyword matches with source tracking (0-15 points)
 * Fixed in v2.2: Track which category of keywords matched for accurate explanations
 */
function scoreExactKeywordMatchesCategorized(
  orgKeywords: CategorizedKeywords,
  programKeywords: string[],
  result: KeywordMatchResult
): number {
  let technologyExactMatches = 0;
  let technologyPartialMatches = 0;
  let sectorExactMatches = 0;
  let sectorPartialMatches = 0;
  let researchExactMatches = 0;
  let researchPartialMatches = 0;
  let score = 0;

  // Check technology keyword matches (highest priority for EXACT_KEYWORD_MATCH)
  for (const orgKw of orgKeywords.technologyKeywords) {
    for (const progKw of programKeywords) {
      if (orgKw === progKw) {
        technologyExactMatches++;
      } else if (orgKw.length >= 3 && progKw.length >= 3) {
        if (orgKw.includes(progKw) || progKw.includes(orgKw)) {
          technologyPartialMatches++;
        }
      }
    }
  }

  // Check research focus area matches
  for (const orgKw of orgKeywords.researchKeywords) {
    for (const progKw of programKeywords) {
      if (orgKw === progKw) {
        researchExactMatches++;
      } else if (orgKw.length >= 3 && progKw.length >= 3) {
        if (orgKw.includes(progKw) || progKw.includes(orgKw)) {
          researchPartialMatches++;
        }
      }
    }
  }

  // Check sector keyword matches (lowest priority - avoid claiming "기술 분야" match)
  for (const orgKw of orgKeywords.sectorKeywords) {
    for (const progKw of programKeywords) {
      if (orgKw === progKw) {
        sectorExactMatches++;
      } else if (orgKw.length >= 3 && progKw.length >= 3) {
        if (orgKw.includes(progKw) || progKw.includes(orgKw)) {
          sectorPartialMatches++;
        }
      }
    }
  }

  const totalMatches =
    technologyExactMatches + technologyPartialMatches +
    researchExactMatches + researchPartialMatches +
    sectorExactMatches + sectorPartialMatches;

  if (totalMatches > 0) {
    // 5 points for first match, 2 points for each additional (max 15)
    score = Math.min(15, 5 + (totalMatches - 1) * 2);
    result.details.exactMatches = technologyExactMatches + researchExactMatches + sectorExactMatches;

    // Use appropriate reason codes based on what actually matched
    // Priority: technology > research > sector
    if (technologyExactMatches > 0) {
      result.reasons.push('EXACT_KEYWORD_MATCH'); // Technology keywords matched - accurate claim
    } else if (technologyPartialMatches > 0) {
      result.reasons.push('PARTIAL_KEYWORD_MATCH');
    }

    if (researchExactMatches > 0 && technologyExactMatches === 0) {
      result.reasons.push('RESEARCH_KEYWORD_MATCH'); // Research focus areas matched
    }

    // Only add sector match reason if no technology/research matches
    // This prevents misleading "기술 분야" claims when only sector matched
    if (sectorExactMatches > 0 && technologyExactMatches === 0 && researchExactMatches === 0) {
      // Don't add EXACT_KEYWORD_MATCH - use sector-specific codes instead
      // The SECTOR_MATCH or EXACT_CATEGORY_MATCH reasons handle this case
    } else if (sectorPartialMatches > 0 && technologyPartialMatches === 0 && researchPartialMatches === 0) {
      // Sector-only partial match - don't claim technology match
    }
  }

  return score;
}

/**
 * Score exact keyword matches (0-15 points) - Legacy interface
 * @deprecated Use scoreExactKeywordMatchesCategorized for accurate match explanations
 */
function scoreExactKeywordMatches(
  orgKeywords: string[],
  programKeywords: string[],
  result: KeywordMatchResult
): number {
  let exactMatches = 0;
  let partialMatches = 0;
  let score = 0;

  for (const orgKw of orgKeywords) {
    for (const progKw of programKeywords) {
      // True exact match (identical keywords)
      if (orgKw === progKw) {
        exactMatches++;
      }
      // Substring/partial match (one contains the other, but not identical)
      else if (orgKw.length >= 3 && progKw.length >= 3) {
        if (orgKw.includes(progKw) || progKw.includes(orgKw)) {
          partialMatches++;
        }
      }
    }
  }

  const totalMatches = exactMatches + partialMatches;

  if (totalMatches > 0) {
    // 5 points for first match, 2 points for each additional (max 15)
    score = Math.min(15, 5 + (totalMatches - 1) * 2);
    result.details.exactMatches = exactMatches; // Only count TRUE exact matches

    // Use appropriate reason code based on match type
    if (exactMatches > 0) {
      result.reasons.push('EXACT_KEYWORD_MATCH');
    } else if (partialMatches > 0) {
      result.reasons.push('PARTIAL_KEYWORD_MATCH'); // New: More honest about partial matches
    }
  }

  return score;
}

/**
 * Score sector-level matches (0-10 points)
 */
function scoreSectorMatches(
  org: Organization,
  program: FundingProgram,
  result: KeywordMatchResult
): number {
  let score = 0;

  if (!org.industrySector) return 0;

  const orgSector = findIndustrySector(org.industrySector);
  if (!orgSector) return 0;

  // Check program category
  if (program.category) {
    const programSector = findIndustrySector(program.category);

    if (programSector === orgSector) {
      score += 10;
      result.details.sectorMatches++;
      result.reasons.push('SECTOR_MATCH');
      return score;
    }
  }

  // Check program keywords for sector matches
  if (program.keywords && program.keywords.length > 0) {
    for (const keyword of program.keywords) {
      const programSector = findIndustrySector(keyword);

      if (programSector === orgSector) {
        score += 8;
        result.details.sectorMatches++;
        result.reasons.push('SECTOR_KEYWORD_MATCH');
        return score; // Return early to avoid double-counting
      }

      // Sub-sector match (less points)
      const subSectorMatch = findSubSector(keyword);
      if (subSectorMatch && subSectorMatch.sector === orgSector) {
        score += 6;
        result.details.subSectorMatches++;
        result.reasons.push('SUB_SECTOR_MATCH');
      }
    }
  }

  return Math.min(10, score);
}

/**
 * Score cross-industry relevance (0-5 points)
 */
function scoreCrossIndustryRelevance(
  org: Organization,
  program: FundingProgram,
  result: KeywordMatchResult
): number {
  if (!org.industrySector) return 0;

  const orgSector = findIndustrySector(org.industrySector);
  if (!orgSector) return 0;

  let maxRelevance = 0;

  // Check program category
  if (program.category) {
    const programSector = findIndustrySector(program.category);
    if (programSector && programSector !== orgSector) {
      const relevance = calculateIndustryRelevance(orgSector, programSector);
      maxRelevance = Math.max(maxRelevance, relevance);
    }
  }

  // Check program keywords
  if (program.keywords && program.keywords.length > 0) {
    for (const keyword of program.keywords) {
      const programSector = findIndustrySector(keyword);
      if (programSector && programSector !== orgSector) {
        const relevance = calculateIndustryRelevance(orgSector, programSector);
        maxRelevance = Math.max(maxRelevance, relevance);
      }
    }
  }

  // Convert relevance (0.0-1.0) to points (0-5)
  if (maxRelevance >= 0.7) {
    result.details.crossIndustryMatches++;
    result.reasons.push('CROSS_INDUSTRY_HIGH_RELEVANCE');
    return 5;
  } else if (maxRelevance >= 0.5) {
    result.details.crossIndustryMatches++;
    result.reasons.push('CROSS_INDUSTRY_MEDIUM_RELEVANCE');
    return 3;
  }

  return 0;
}

/**
 * Score technology keyword matches for research institutes (bonus 0-5 points)
 */
function scoreTechnologyMatches(
  orgTechnologies: string[],
  programKeywords: string[],
  result: KeywordMatchResult
): number {
  let matches = 0;

  for (const tech of orgTechnologies) {
    const normalizedTech = normalizeKoreanKeyword(tech);

    // Check against program keywords
    for (const progKw of programKeywords) {
      if (normalizedTech.includes(progKw) || progKw.includes(normalizedTech)) {
        matches++;
      }
    }

    // Check technology domain matches
    const techDomains = matchTechnologyKeyword(tech);
    if (techDomains.length > 0) {
      for (const progKw of programKeywords) {
        const progTechDomains = matchTechnologyKeyword(progKw);
        if (progTechDomains.some(domain => techDomains.includes(domain))) {
          matches++;
        }
      }
    }
  }

  if (matches > 0) {
    result.details.technologyMatches = matches;
    result.reasons.push('TECHNOLOGY_KEYWORD_MATCH');
    return Math.min(5, matches * 2); // 2 points per match, max 5
  }

  return 0;
}

/**
 * Get industry sector name in Korean from organization
 */
export function getOrganizationSectorName(org: Organization): string | null {
  if (!org.industrySector) return null;

  const sectorKey = findIndustrySector(org.industrySector);
  if (!sectorKey) return org.industrySector;

  const sector = INDUSTRY_TAXONOMY[sectorKey as keyof typeof INDUSTRY_TAXONOMY];
  return sector?.name || org.industrySector;
}

/**
 * Get program sector name in Korean from program
 */
export function getProgramSectorName(program: FundingProgram): string | null {
  if (!program.category) return null;

  const sectorKey = findIndustrySector(program.category);
  if (!sectorKey) return program.category;

  const sector = INDUSTRY_TAXONOMY[sectorKey as keyof typeof INDUSTRY_TAXONOMY];
  return sector?.name || program.category;
}
