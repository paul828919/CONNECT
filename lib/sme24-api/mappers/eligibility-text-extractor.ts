/**
 * Eligibility Text Extractor for SME Programs
 *
 * Extracts eligibility criteria from description/supportTarget text fields
 * when SME24 API does not provide structured data (common for regional programs).
 *
 * Extraction targets:
 * - Company scale (중소기업, 소상공인, 예비창업자 등)
 * - Employee count range
 * - Revenue range
 * - Business age range
 *
 * This is Tier 1 (rule-based) extraction for zero-cost, high-speed processing.
 */

import { KoreanRegion } from '@prisma/client';
import {
  extractRegionFromTitle,
  extractRegionFromDescription,
} from './code-mapper';

// ============================================================================
// Types
// ============================================================================

export interface ExtractedEligibility {
  /** Company scale types: 중소기업, 소상공인, 예비창업자, etc. */
  companyScale: string[];
  /** Minimum employee count */
  minEmployees: number | null;
  /** Maximum employee count */
  maxEmployees: number | null;
  /** Minimum revenue in 억원 (100 million KRW) */
  minRevenue: number | null;
  /** Maximum revenue in 억원 */
  maxRevenue: number | null;
  /** Minimum business age in years */
  minBusinessAge: number | null;
  /** Maximum business age in years */
  maxBusinessAge: number | null;
  /** Extracted regions */
  regions: KoreanRegion[];
  /** Extraction confidence level */
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  /** Source of extraction */
  source: 'TITLE' | 'DESCRIPTION' | 'SUPPORT_TARGET' | 'COMBINED';
}

// ============================================================================
// Company Scale Extraction
// ============================================================================

/** Company scale patterns ordered by specificity (longer patterns first to avoid partial matches) */
const COMPANY_SCALE_PATTERNS: Array<{ pattern: RegExp; scale: string }> = [
  // Longest/most specific patterns first to avoid partial matches
  { pattern: /예비\s*창업자/g, scale: '예비창업자' },
  { pattern: /예비\s*창업/g, scale: '예비창업자' },
  { pattern: /1인\s*창조기업/g, scale: '1인기업' },
  { pattern: /1인\s*기업/g, scale: '1인기업' },
  { pattern: /소상공인/g, scale: '소상공인' },
  // "중소기업" must be checked before "소기업" to prevent partial match
  { pattern: /중소기업/g, scale: '중소기업' },
  { pattern: /중견기업/g, scale: '중견기업' },
  // "소기업" and "중기업" only match when NOT part of "중소기업"
  { pattern: /(?<!중)소기업/g, scale: '소기업' },
  { pattern: /(?<!소)중기업(?!업)/g, scale: '중기업' },
  { pattern: /스타트업/g, scale: '스타트업' },
  { pattern: /창업기업/g, scale: '창업기업' },
  { pattern: /벤처기업/g, scale: '벤처기업' },
];

/**
 * Extract company scale types from text
 */
export function extractCompanyScale(text: string): string[] {
  const scales: string[] = [];

  for (const { pattern, scale } of COMPANY_SCALE_PATTERNS) {
    if (pattern.test(text) && !scales.includes(scale)) {
      scales.push(scale);
    }
  }

  return scales;
}

// ============================================================================
// Employee Count Extraction
// ============================================================================

/**
 * Extract employee count range from text
 *
 * Patterns:
 * - "상시근로자 50인 미만"
 * - "종업원 10명 이상"
 * - "직원 수 5~20명"
 * - "고용인원 100명 이하"
 */
export function extractEmployeeCount(text: string): { min: number | null; max: number | null } {
  const result = { min: null as number | null, max: null as number | null };

  // Pattern: "XX명 미만" or "XX인 미만"
  const underMatch = text.match(/(?:상시\s*)?(?:근로자|종업원|직원|고용인원)\s*(\d+)\s*(?:명|인)\s*미만/);
  if (underMatch) {
    result.max = parseInt(underMatch[1], 10) - 1;
  }

  // Pattern: "XX명 이하" or "XX인 이하"
  const maxMatch = text.match(/(?:상시\s*)?(?:근로자|종업원|직원|고용인원)\s*(\d+)\s*(?:명|인)\s*이하/);
  if (maxMatch) {
    result.max = parseInt(maxMatch[1], 10);
  }

  // Pattern: "XX명 이상" or "XX인 이상"
  const minMatch = text.match(/(?:상시\s*)?(?:근로자|종업원|직원|고용인원)\s*(\d+)\s*(?:명|인)\s*이상/);
  if (minMatch) {
    result.min = parseInt(minMatch[1], 10);
  }

  // Pattern: "XX~YY명" or "XX명~YY명" (also handles "직원 수" with space)
  const rangeMatch = text.match(/(?:상시\s*)?(?:근로자|종업원|직원|고용인원)(?:\s*수)?\s*(\d+)\s*(?:명|인)?\s*[~\-]\s*(\d+)\s*(?:명|인)/);
  if (rangeMatch) {
    result.min = parseInt(rangeMatch[1], 10);
    result.max = parseInt(rangeMatch[2], 10);
  }

  return result;
}

// ============================================================================
// Revenue Extraction
// ============================================================================

/**
 * Extract revenue range from text
 *
 * Patterns:
 * - "매출액 100억 미만"
 * - "연매출 50억 이상"
 * - "매출 10억~100억"
 * - "매출액 5억원 이하"
 *
 * @returns Revenue in 억원 (100 million KRW)
 */
export function extractRevenue(text: string): { min: number | null; max: number | null } {
  const result = { min: null as number | null, max: null as number | null };

  // Helper to convert Korean units to 억원
  const parseKoreanRevenue = (amount: string, unit: string): number | null => {
    const num = parseFloat(amount.replace(/,/g, ''));
    if (isNaN(num)) return null;

    switch (unit) {
      case '조':
        return num * 10000; // 1조 = 10000억
      case '억':
        return num;
      case '백만':
      case '백만원':
        return num / 100; // 100백만 = 1억
      case '천만':
      case '천만원':
        return num / 10; // 10천만 = 1억
      case '만':
      case '만원':
        return num / 10000; // 10000만 = 1억
      case '원':
        return num / 100000000;
      default:
        return num; // Assume 억원
    }
  };

  // Pattern: "매출 XX억 미만"
  const underMatch = text.match(/(?:연)?매출(?:액)?\s*([\d,\.]+)\s*(조|억|백만|천만|만)?(?:원)?\s*미만/);
  if (underMatch) {
    const value = parseKoreanRevenue(underMatch[1], underMatch[2] || '억');
    if (value !== null) result.max = value - 0.1;
  }

  // Pattern: "매출 XX억 이하"
  const maxMatch = text.match(/(?:연)?매출(?:액)?\s*([\d,\.]+)\s*(조|억|백만|천만|만)?(?:원)?\s*이하/);
  if (maxMatch) {
    const value = parseKoreanRevenue(maxMatch[1], maxMatch[2] || '억');
    if (value !== null) result.max = value;
  }

  // Pattern: "매출 XX억 이상"
  const minMatch = text.match(/(?:연)?매출(?:액)?\s*([\d,\.]+)\s*(조|억|백만|천만|만)?(?:원)?\s*이상/);
  if (minMatch) {
    const value = parseKoreanRevenue(minMatch[1], minMatch[2] || '억');
    if (value !== null) result.min = value;
  }

  // Pattern: "매출 XX억~YY억"
  const rangeMatch = text.match(/(?:연)?매출(?:액)?\s*([\d,\.]+)\s*(조|억|백만)?(?:원)?\s*[~\-]\s*([\d,\.]+)\s*(조|억|백만)?(?:원)?/);
  if (rangeMatch) {
    const minVal = parseKoreanRevenue(rangeMatch[1], rangeMatch[2] || '억');
    const maxVal = parseKoreanRevenue(rangeMatch[3], rangeMatch[4] || rangeMatch[2] || '억');
    if (minVal !== null) result.min = minVal;
    if (maxVal !== null) result.max = maxVal;
  }

  return result;
}

// ============================================================================
// Business Age Extraction
// ============================================================================

/**
 * Extract business age range from text
 *
 * Patterns:
 * - "창업 7년 이내"
 * - "업력 3년 미만"
 * - "설립 5년 이상"
 * - "창업 3~7년"
 *
 * @returns Business age in years
 */
export function extractBusinessAge(text: string): { min: number | null; max: number | null } {
  const result = { min: null as number | null, max: null as number | null };

  // Pattern: "XX년 이내" or "XX년 미만"
  const underMatch = text.match(/(?:창업|업력|설립)\s*(\d+)\s*년\s*(?:이내|미만)/);
  if (underMatch) {
    result.max = parseInt(underMatch[1], 10);
  }

  // Pattern: "XX년 이하"
  const maxMatch = text.match(/(?:창업|업력|설립)\s*(\d+)\s*년\s*이하/);
  if (maxMatch) {
    result.max = parseInt(maxMatch[1], 10);
  }

  // Pattern: "XX년 이상"
  const minMatch = text.match(/(?:창업|업력|설립)\s*(\d+)\s*년\s*이상/);
  if (minMatch) {
    result.min = parseInt(minMatch[1], 10);
  }

  // Pattern: "XX~YY년" or "XX년~YY년"
  const rangeMatch = text.match(/(?:창업|업력|설립)\s*(\d+)\s*(?:년)?\s*[~\-]\s*(\d+)\s*년/);
  if (rangeMatch) {
    result.min = parseInt(rangeMatch[1], 10);
    result.max = parseInt(rangeMatch[2], 10);
  }

  // Pattern: "XX년차 이상/이하" (convert to years)
  const yearMatch = text.match(/(\d+)\s*년차\s*(이상|이하|미만)/);
  if (yearMatch) {
    const years = parseInt(yearMatch[1], 10);
    if (yearMatch[2] === '이상') {
      result.min = years;
    } else {
      result.max = years;
    }
  }

  return result;
}

// ============================================================================
// Main Extraction Function
// ============================================================================

/**
 * Extract all eligibility criteria from program text fields
 *
 * @param title Program title
 * @param description Program description (policyCnts)
 * @param supportTarget Support target text (sportTrget)
 * @returns Extracted eligibility criteria
 */
export function extractEligibilityFromText(
  title: string,
  description: string | null | undefined,
  supportTarget: string | null | undefined
): ExtractedEligibility {
  // Combine all text sources for extraction
  const allText = [
    title,
    description || '',
    supportTarget || '',
  ].join(' ');

  // Prioritize supportTarget for eligibility criteria (most relevant)
  const targetText = supportTarget || description || title;

  // Extract each criterion
  const companyScale = extractCompanyScale(allText);
  const employees = extractEmployeeCount(targetText);
  const revenue = extractRevenue(targetText);
  const businessAge = extractBusinessAge(targetText);

  // Extract regions (title first, then description)
  const titleRegions = extractRegionFromTitle(title);
  const descRegions = extractRegionFromDescription(description);
  const regions = titleRegions.length > 0 ? titleRegions : descRegions;

  // Determine confidence level based on extraction quality
  let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';

  const extractedCount =
    (companyScale.length > 0 ? 1 : 0) +
    (employees.min !== null || employees.max !== null ? 1 : 0) +
    (revenue.min !== null || revenue.max !== null ? 1 : 0) +
    (businessAge.min !== null || businessAge.max !== null ? 1 : 0) +
    (regions.length > 0 ? 1 : 0);

  if (extractedCount >= 3) {
    confidence = 'HIGH';
  } else if (extractedCount >= 1) {
    confidence = 'MEDIUM';
  }

  // Determine primary source
  let source: ExtractedEligibility['source'] = 'COMBINED';
  if (supportTarget && supportTarget.length > 50) {
    source = 'SUPPORT_TARGET';
  } else if (description && description.length > 100) {
    source = 'DESCRIPTION';
  } else if (titleRegions.length > 0) {
    source = 'TITLE';
  }

  return {
    companyScale,
    minEmployees: employees.min,
    maxEmployees: employees.max,
    minRevenue: revenue.min,
    maxRevenue: revenue.max,
    minBusinessAge: businessAge.min,
    maxBusinessAge: businessAge.max,
    regions,
    confidence,
    source,
  };
}

/**
 * Check if extracted eligibility has meaningful data
 */
export function hasExtractedEligibility(eligibility: ExtractedEligibility): boolean {
  return (
    eligibility.companyScale.length > 0 ||
    eligibility.minEmployees !== null ||
    eligibility.maxEmployees !== null ||
    eligibility.minRevenue !== null ||
    eligibility.maxRevenue !== null ||
    eligibility.minBusinessAge !== null ||
    eligibility.maxBusinessAge !== null ||
    eligibility.regions.length > 0
  );
}
