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

  // Extract organization keywords
  const orgKeywords = extractOrganizationKeywords(org);

  // Extract program keywords
  const programKeywords = extractProgramKeywords(program);

  if (orgKeywords.length === 0 || programKeywords.length === 0) {
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

  // 1. Exact keyword matching (up to 15 points)
  const exactMatchScore = scoreExactKeywordMatches(orgKeywords, programKeywords, result);
  result.score += exactMatchScore;

  // 2. Sector-level matching (up to 10 points)
  const sectorMatchScore = scoreSectorMatches(org, program, result);
  result.score += sectorMatchScore;

  // 3. Cross-industry relevance (up to 5 points)
  const crossIndustryScore = scoreCrossIndustryRelevance(org, program, result);
  result.score += crossIndustryScore;

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
 */
function extractOrganizationKeywords(org: Organization): string[] {
  const keywords: Set<string> = new Set();

  // Industry sector
  if (org.industrySector) {
    keywords.add(normalizeKoreanKeyword(org.industrySector));

    // Add all related keywords from taxonomy
    const sector = findIndustrySector(org.industrySector);
    if (sector) {
      const sectorKeywords = getAllKeywordsForSector(sector);
      sectorKeywords.forEach(k => keywords.add(normalizeKoreanKeyword(k)));
    }
  }

  // Research focus areas (for research institutes)
  if (org.researchFocusAreas && org.researchFocusAreas.length > 0) {
    org.researchFocusAreas.forEach(area => {
      keywords.add(normalizeKoreanKeyword(area));
    });
  }

  // Key technologies (for research institutes)
  if (org.keyTechnologies && org.keyTechnologies.length > 0) {
    org.keyTechnologies.forEach(tech => {
      keywords.add(normalizeKoreanKeyword(tech));
    });
  }

  return Array.from(keywords);
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
 * Score exact keyword matches (0-15 points)
 */
function scoreExactKeywordMatches(
  orgKeywords: string[],
  programKeywords: string[],
  result: KeywordMatchResult
): number {
  let matches = 0;
  let score = 0;

  for (const orgKw of orgKeywords) {
    for (const progKw of programKeywords) {
      // Exact match
      if (orgKw === progKw) {
        matches++;
      }
      // Substring match (one contains the other)
      else if (orgKw.length >= 3 && progKw.length >= 3) {
        if (orgKw.includes(progKw) || progKw.includes(orgKw)) {
          matches++;
        }
      }
    }
  }

  if (matches > 0) {
    // 5 points for first match, 2 points for each additional (max 15)
    score = Math.min(15, 5 + (matches - 1) * 2);
    result.details.exactMatches = matches;
    result.reasons.push('EXACT_KEYWORD_MATCH');
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
