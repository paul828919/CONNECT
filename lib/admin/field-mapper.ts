/**
 * Field Mapper: Claude Extraction → Database Columns
 *
 * Purpose: Transform Claude Web extracted fields into database-compatible values
 *
 * Handles:
 * - Date parsing (Korean formats → DateTime)
 * - Budget parsing ("260백만원/년 × 2년" → BigInt)
 * - Organization type mapping (Korean → OrganizationType enum)
 * - Array field splitting ("A, B, C" → string[])
 */

import { OrganizationType } from '@prisma/client';

/**
 * Null value indicators in Korean extraction outputs
 * These should be treated as null/undefined rather than stored as strings
 */
const NULL_INDICATORS = [
  '명시되지 않음',
  '해당없음',
  '해당 없음',
  '미정',
  '미공개',
  '추후 공지',
  '추후공지',
  '별도 공지',
  '별도공지',
  'N/A',
  'n/a',
  '-',
  '없음',
  '미상',
  '공고문 미기재',
  '미기재',
];

/**
 * Check if a value represents a null/undefined indicator
 * @param value - The string value to check
 * @returns true if the value should be treated as null
 */
export function isNullValue(value: string | null | undefined): boolean {
  if (!value) return true;
  const trimmed = value.trim();
  if (!trimmed) return true;
  return NULL_INDICATORS.some(
    (indicator) => trimmed === indicator || trimmed.toLowerCase() === indicator.toLowerCase()
  );
}

/**
 * Return null if value is a null indicator, otherwise return the value
 * @param value - The string value to normalize
 * @returns The original value or null if it's a null indicator
 */
export function normalizeNullValue(value: string | null | undefined): string | null {
  if (isNullValue(value)) return null;
  return value!.trim();
}

/**
 * Database-ready enrichment data structure
 */
export interface EnrichmentData {
  // Section A: 신청/운영 메타
  applicationStart?: Date | null;
  deadline?: Date | null;
  deadlineTimeRule?: string | null;
  submissionSystem?: string | null;
  contactInfo?: {
    institution?: string;
    department?: string;
    phone?: string;
    email?: string;
  };

  // Section B: 돈/기간
  budgetAmount?: bigint | null;
  budgetPerProject?: string | null; // Keep as string for display
  fundingRate?: string | null;
  fundingPeriod?: string | null;
  numAwards?: number | null;

  // Section C: 지원대상/자격요건
  targetType?: OrganizationType[];
  leadRoleAllowed?: string[];
  coRoleAllowed?: string[];
  requiresResearchInstitute?: boolean;
  requiredCertifications?: string[];
  preferredCertifications?: string[];
  exclusionRules?: string[];

  // Section D: 분야/주제
  keywords?: string[];
  domainTags?: string[];
  primaryTargetIndustry?: string | null;
  technologyDomainsSpecific?: string[];

  // Metadata
  eligibilityConfidence?: 'HIGH' | 'MEDIUM' | 'LOW';
  enrichedAt?: Date;
  enrichedBy?: string;
  enrichmentSource?: 'CLAUDE_WEB' | 'MANUAL' | 'API';
}

/**
 * Map a flat key-value object to EnrichmentData
 */
export function mapToEnrichmentData(
  flatData: Record<string, string | null>,
  adminUserId: string
): EnrichmentData {
  const result: EnrichmentData = {
    enrichedAt: new Date(),
    enrichedBy: adminUserId,
    enrichmentSource: 'CLAUDE_WEB',
    eligibilityConfidence: 'HIGH', // Manually enriched = HIGH confidence
  };

  // Section A mappings
  if (flatData.application_open_at) {
    result.applicationStart = parseKoreanDate(flatData.application_open_at);
  }
  if (flatData.application_close_at) {
    result.deadline = parseKoreanDate(flatData.application_close_at);
  }
  if (flatData.deadline_time_rule) {
    result.deadlineTimeRule = normalizeNullValue(flatData.deadline_time_rule);
  }
  if (flatData.submission_system) {
    result.submissionSystem = normalizeNullValue(flatData.submission_system);
  }
  if (flatData.contact) {
    result.contactInfo = parseContactInfo(flatData.contact);
  }

  // Section B mappings
  if (flatData.budget_total) {
    result.budgetAmount = parseBudgetAmount(flatData.budget_total);
  }
  if (flatData.budget_per_project) {
    const normalizedBudgetPerProject = normalizeNullValue(flatData.budget_per_project);
    result.budgetPerProject = normalizedBudgetPerProject;
    // Also try to extract numeric value for budgetAmount if not set
    if (!result.budgetAmount && normalizedBudgetPerProject) {
      result.budgetAmount = parseBudgetAmount(normalizedBudgetPerProject);
    }
  }
  if (flatData.funding_rate) {
    result.fundingRate = normalizeNullValue(flatData.funding_rate);
  }
  if (flatData.project_duration) {
    result.fundingPeriod = normalizeNullValue(flatData.project_duration);
  }
  if (flatData.num_awards) {
    result.numAwards = parseNumAwards(flatData.num_awards);
  }

  // Section C mappings
  if (flatData.applicant_org_types) {
    result.targetType = parseOrganizationTypes(flatData.applicant_org_types);
  }
  if (flatData.lead_role_allowed) {
    result.leadRoleAllowed = parseArrayField(flatData.lead_role_allowed);
  }
  if (flatData.co_role_allowed) {
    result.coRoleAllowed = parseArrayField(flatData.co_role_allowed);
  }
  if (flatData.consortium_required) {
    result.requiresResearchInstitute = parseBoolean(flatData.consortium_required);
  }
  if (flatData.required_registrations) {
    // Merge into requiredCertifications
    const regs = parseArrayField(flatData.required_registrations);
    result.requiredCertifications = [
      ...(result.requiredCertifications || []),
      ...regs,
    ];
  }
  if (flatData.required_certifications) {
    const certs = parseArrayField(flatData.required_certifications);
    result.requiredCertifications = [
      ...(result.requiredCertifications || []),
      ...certs,
    ];
  }
  if (flatData.exclusion_rules) {
    result.exclusionRules = parseArrayField(flatData.exclusion_rules);
  }

  // Section D mappings
  if (flatData.tech_keywords) {
    result.keywords = parseArrayField(flatData.tech_keywords);
  }
  if (flatData.domain_tags) {
    result.domainTags = parseArrayField(flatData.domain_tags);
    // Also use first domain tag as primaryTargetIndustry
    if (!result.primaryTargetIndustry && result.domainTags.length > 0) {
      result.primaryTargetIndustry = result.domainTags[0];
    }
  }
  if (flatData.program_type) {
    // Map program type if needed
  }

  return result;
}

/**
 * Parse Korean date formats into Date object
 * Handles: "2026-02-09 09:00", "2026년 2월 9일", "2/9", etc.
 * Returns null for null indicators like "명시되지 않음"
 */
export function parseKoreanDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  if (isNullValue(dateStr)) return null;

  const cleaned = dateStr.trim();

  // ISO-like format: "2026-02-09 09:00" or "2026-02-09"
  const isoMatch = cleaned.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (isoMatch) {
    const [, year, month, day, hour = '0', minute = '0'] = isoMatch;
    return new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hour),
      parseInt(minute)
    );
  }

  // Korean format: "2026년 2월 9일" or "2026년2월9일"
  const koreanMatch = cleaned.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
  if (koreanMatch) {
    const [, year, month, day] = koreanMatch;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }

  // Short format with current year: "2/9" or "2월 9일"
  const shortMatch = cleaned.match(/^(\d{1,2})(?:\/|월\s*)(\d{1,2})(?:일)?$/);
  if (shortMatch) {
    const [, month, day] = shortMatch;
    const year = new Date().getFullYear();
    return new Date(year, parseInt(month) - 1, parseInt(day));
  }

  console.warn(`Could not parse date: ${dateStr}`);
  return null;
}

/**
 * Parse budget amount from Korean format
 * Handles: "260백만원", "7억원", "260백만원/년 × 2년", "총 52억원"
 * Returns null for null indicators like "명시되지 않음"
 */
export function parseBudgetAmount(budgetStr: string): bigint | null {
  if (!budgetStr) return null;
  if (isNullValue(budgetStr)) return null;

  const cleaned = budgetStr.trim();

  // Extract numeric value and unit
  // Pattern: optional "총", number, unit (억/백만/천만/만/원)
  const match = cleaned.match(/(?:총\s*)?(\d+(?:\.\d+)?)\s*(억|백만|천만|만)?원?/);
  if (!match) {
    console.warn(`Could not parse budget: ${budgetStr}`);
    return null;
  }

  const [, numStr, unit] = match;
  const num = parseFloat(numStr);

  let multiplier = 1;
  switch (unit) {
    case '억':
      multiplier = 100_000_000;
      break;
    case '백만':
      multiplier = 1_000_000;
      break;
    case '천만':
      multiplier = 10_000_000;
      break;
    case '만':
      multiplier = 10_000;
      break;
    default:
      multiplier = 1;
  }

  return BigInt(Math.round(num * multiplier));
}

/**
 * Parse number of awards from text
 * Handles: "12개 과제", "5개", "약 10개"
 * Returns null for null indicators like "명시되지 않음"
 */
export function parseNumAwards(numStr: string): number | null {
  if (!numStr) return null;
  if (isNullValue(numStr)) return null;

  const match = numStr.match(/(\d+)/);
  if (match) {
    return parseInt(match[1]);
  }

  return null;
}

/**
 * Parse organization types from Korean text
 * Maps Korean terms to OrganizationType enum
 * Returns empty array for null indicators like "명시되지 않음"
 */
export function parseOrganizationTypes(typesStr: string): OrganizationType[] {
  if (!typesStr) return [];
  if (isNullValue(typesStr)) return [];

  const types: OrganizationType[] = [];
  const lower = typesStr.toLowerCase();

  // Mapping Korean terms to enum values
  const mappings: Record<string, OrganizationType> = {
    '기업': 'COMPANY',
    '중소기업': 'COMPANY',
    '중견기업': 'COMPANY',
    '대기업': 'COMPANY',
    '스타트업': 'COMPANY',
    '벤처기업': 'COMPANY',
    '연구기관': 'RESEARCH_INSTITUTE',
    '연구소': 'RESEARCH_INSTITUTE',
    '출연연': 'RESEARCH_INSTITUTE',
    '공공연구기관': 'RESEARCH_INSTITUTE',
    '대학': 'UNIVERSITY',
    '대학교': 'UNIVERSITY',
    '학교': 'UNIVERSITY',
    '공공기관': 'PUBLIC_INSTITUTION',
    '지자체': 'PUBLIC_INSTITUTION',
    '정부기관': 'PUBLIC_INSTITUTION',
  };

  for (const [korean, enumValue] of Object.entries(mappings)) {
    if (lower.includes(korean) && !types.includes(enumValue)) {
      types.push(enumValue);
    }
  }

  return types;
}

/**
 * Parse array field from comma/semicolon separated string
 * Returns empty array for null indicators like "명시되지 않음"
 */
export function parseArrayField(str: string): string[] {
  if (!str) return [];
  if (isNullValue(str)) return [];

  return str
    .split(/[,;，；]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !isNullValue(s)); // Also filter out null indicators within arrays
}

/**
 * Parse boolean from Korean text
 * Returns false for null indicators like "명시되지 않음"
 */
export function parseBoolean(str: string): boolean {
  if (!str) return false;
  if (isNullValue(str)) return false;

  const lower = str.toLowerCase().trim();
  const trueValues = ['예', '필수', 'yes', 'true', 'y', '1', '필수', '있음'];
  return trueValues.some((v) => lower.includes(v));
}

/**
 * Parse contact info from text
 * Returns undefined for null indicators like "명시되지 않음"
 */
export function parseContactInfo(contactStr: string): EnrichmentData['contactInfo'] {
  if (!contactStr) return undefined;
  if (isNullValue(contactStr)) return undefined;

  const result: EnrichmentData['contactInfo'] = {};

  // Extract phone number
  const phoneMatch = contactStr.match(/(\d{2,4}[-.\s]?\d{3,4}[-.\s]?\d{4})/);
  if (phoneMatch) {
    result.phone = phoneMatch[1];
  }

  // Extract email
  const emailMatch = contactStr.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (emailMatch) {
    result.email = emailMatch[1];
  }

  // Try to extract institution name (usually at the start)
  const parts = contactStr.split(/[,|·/]/).map((s) => s.trim());
  if (parts.length > 0) {
    result.institution = parts[0];
  }
  if (parts.length > 1) {
    result.department = parts[1];
  }

  return result;
}

/**
 * Convert EnrichmentData to Prisma update payload
 */
export function toPrismaUpdatePayload(data: EnrichmentData): Record<string, any> {
  const payload: Record<string, any> = {};

  // Direct mappings
  if (data.applicationStart !== undefined) payload.applicationStart = data.applicationStart;
  if (data.deadline !== undefined) payload.deadline = data.deadline;
  if (data.budgetAmount !== undefined) payload.budgetAmount = data.budgetAmount;
  if (data.fundingPeriod !== undefined) payload.fundingPeriod = data.fundingPeriod;
  if (data.targetType !== undefined) payload.targetType = data.targetType;
  if (data.requiresResearchInstitute !== undefined)
    payload.requiresResearchInstitute = data.requiresResearchInstitute;
  if (data.requiredCertifications !== undefined)
    payload.requiredCertifications = data.requiredCertifications;
  if (data.preferredCertifications !== undefined)
    payload.preferredCertifications = data.preferredCertifications;
  if (data.keywords !== undefined) payload.keywords = data.keywords;
  if (data.primaryTargetIndustry !== undefined)
    payload.primaryTargetIndustry = data.primaryTargetIndustry;
  if (data.technologyDomainsSpecific !== undefined)
    payload.technologyDomainsSpecific = data.technologyDomainsSpecific;

  // Store additional data in eligibilityCriteria JSON field
  const eligibilityCriteria: Record<string, any> = {};
  if (data.deadlineTimeRule) eligibilityCriteria.deadlineTimeRule = data.deadlineTimeRule;
  if (data.submissionSystem) eligibilityCriteria.submissionSystem = data.submissionSystem;
  if (data.contactInfo) eligibilityCriteria.contactInfo = data.contactInfo;
  if (data.budgetPerProject) eligibilityCriteria.budgetPerProject = data.budgetPerProject;
  if (data.fundingRate) eligibilityCriteria.fundingRate = data.fundingRate;
  if (data.numAwards) eligibilityCriteria.numAwards = data.numAwards;
  if (data.leadRoleAllowed) eligibilityCriteria.leadRoleAllowed = data.leadRoleAllowed;
  if (data.coRoleAllowed) eligibilityCriteria.coRoleAllowed = data.coRoleAllowed;
  if (data.exclusionRules) eligibilityCriteria.exclusionRules = data.exclusionRules;
  if (data.domainTags) eligibilityCriteria.domainTags = data.domainTags;

  if (Object.keys(eligibilityCriteria).length > 0) {
    payload.eligibilityCriteria = eligibilityCriteria;
  }

  // Metadata
  if (data.eligibilityConfidence !== undefined)
    payload.eligibilityConfidence = data.eligibilityConfidence;
  if (data.enrichedAt !== undefined) payload.eligibilityLastUpdated = data.enrichedAt;
  if (data.enrichedBy !== undefined) payload.manualReviewCompletedBy = data.enrichedBy;
  payload.manualReviewCompletedAt = new Date();

  return payload;
}
