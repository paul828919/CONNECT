#!/usr/bin/env node

/**
 * Enrich Program from PDF Extraction
 *
 * CLI script for Claude Code to save extracted PDF data to the database.
 * This enables a fully automated workflow:
 *   User attaches PDF → Claude extracts data → This script saves to DB → Claude verifies
 *
 * Usage:
 *   npx ts-node scripts/enrich-program-from-pdf.ts <program-id> '<json-data>'
 *
 * Example:
 *   npx ts-node scripts/enrich-program-from-pdf.ts \
 *     "3706a440-14b0-4052-8cff-e59eb3ebee5e" \
 *     '{"application_close_at":"2025-11-17 13:00","budget_per_project":"300백만원"}'
 *
 * JSON Field Reference (from PDF extraction):
 *   Section A - Application/Operation Metadata:
 *     - application_open_at: "2025-02-09 09:00"
 *     - application_close_at: "2025-11-17 13:00"
 *     - deadline_time_rule: "18:00까지 접수 시스템 제출 완료"
 *     - submission_system: "범부처통합혁신사업관리시스템(IRIS)"
 *     - contact: "한국연구재단 | 02-3460-5500 | korea@example.com"
 *
 *   Section B - Budget/Duration:
 *     - budget_total: "총 52억원"
 *     - budget_per_project: "300백만원/년 × 2년"
 *     - funding_rate: "정부 75%, 민간 25%"
 *     - project_duration: "2년"
 *     - num_awards: "12개 과제"
 *
 *   Section C - Eligibility/Requirements:
 *     - applicant_org_types: "기업, 대학, 연구기관"
 *     - lead_role_allowed: "중소기업, 중견기업"
 *     - co_role_allowed: "대학, 연구기관"
 *     - consortium_required: "필수" or "선택"
 *     - required_registrations: "기업부설연구소"
 *     - required_certifications: "벤처기업, INNO-BIZ"
 *     - exclusion_rules: "3년 이내 부정행위 기업, 휴/폐업 기업"
 *
 *   Section D - Domain/Keywords:
 *     - tech_keywords: "양자기술, 양자컴퓨팅, 양자센싱"
 *     - domain_tags: "양자기술, 양자정보통신, 국제공동연구"
 *     - program_type: "연구개발" or "사업화" or "인프라"
 */

import { PrismaClient, ConfidenceLevel, OrganizationType } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================================
// Null Value Detection (from field-mapper.ts)
// ============================================================================

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

function isNullValue(value: string | null | undefined): boolean {
  if (!value) return true;
  const trimmed = value.trim();
  if (!trimmed) return true;
  return NULL_INDICATORS.some(
    (indicator) => trimmed === indicator || trimmed.toLowerCase() === indicator.toLowerCase()
  );
}

function normalizeNullValue(value: string | null | undefined): string | null {
  if (isNullValue(value)) return null;
  return value!.trim();
}

// ============================================================================
// Parsing Functions (from field-mapper.ts)
// ============================================================================

/**
 * Parse Korean date formats into Date object
 * Handles: "2026-02-09 09:00", "2026년 2월 9일", "2/9", etc.
 */
function parseKoreanDate(dateStr: string): Date | null {
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
 */
function parseBudgetAmount(budgetStr: string): bigint | null {
  if (!budgetStr) return null;
  if (isNullValue(budgetStr)) return null;

  const cleaned = budgetStr.trim();

  // Extract numeric value and unit
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
 */
function parseNumAwards(numStr: string): number | null {
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
 */
function parseOrganizationTypes(typesStr: string): OrganizationType[] {
  if (!typesStr) return [];
  if (isNullValue(typesStr)) return [];

  const types: OrganizationType[] = [];
  const lower = typesStr.toLowerCase();

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
 * Parse array field from comma/semicolon/newline separated string
 */
function parseArrayField(str: string): string[] {
  if (!str) return [];
  if (isNullValue(str)) return [];

  return str
    .split(/[,;，；\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !isNullValue(s));
}

/**
 * Parse boolean from Korean text
 */
function parseBoolean(str: string): boolean {
  if (!str) return false;
  if (isNullValue(str)) return false;

  const lower = str.toLowerCase().trim();
  const trueValues = ['예', '필수', 'yes', 'true', 'y', '1', '있음'];
  return trueValues.some((v) => lower.includes(v));
}

/**
 * Parse contact info from text
 */
function parseContactInfo(contactStr: string): Record<string, string> | undefined {
  if (!contactStr) return undefined;
  if (isNullValue(contactStr)) return undefined;

  const result: Record<string, string> = {};

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

// ============================================================================
// Extracted Data Interface
// ============================================================================

interface ExtractedData {
  // Section A - Application/Operation Metadata
  application_open_at?: string;
  application_close_at?: string;
  deadline_time_rule?: string;
  submission_system?: string;
  contact?: string;

  // Section B - Budget/Duration
  budget_total?: string;
  budget_per_project?: string;
  funding_rate?: string;
  project_duration?: string;
  num_awards?: string;

  // Section C - Eligibility/Requirements
  applicant_org_types?: string;
  lead_role_allowed?: string;
  co_role_allowed?: string;
  consortium_required?: string;
  required_registrations?: string;
  required_certifications?: string;
  exclusion_rules?: string;

  // Section D - Domain/Keywords
  tech_keywords?: string;
  domain_tags?: string;
  program_type?: string;
}

// ============================================================================
// Build Prisma Update Payload
// ============================================================================

function buildUpdatePayload(data: ExtractedData): Record<string, any> {
  const payload: Record<string, any> = {};
  const eligibilityCriteria: Record<string, any> = {};

  // Section A mappings
  if (data.application_open_at) {
    payload.applicationStart = parseKoreanDate(data.application_open_at);
  }
  if (data.application_close_at) {
    payload.deadline = parseKoreanDate(data.application_close_at);
  }
  if (data.deadline_time_rule) {
    eligibilityCriteria.deadlineTimeRule = normalizeNullValue(data.deadline_time_rule);
  }
  if (data.submission_system) {
    eligibilityCriteria.submissionSystem = normalizeNullValue(data.submission_system);
  }
  if (data.contact) {
    eligibilityCriteria.contactInfo = parseContactInfo(data.contact);
  }

  // Section B mappings
  if (data.budget_total) {
    payload.budgetAmount = parseBudgetAmount(data.budget_total);
  }
  if (data.budget_per_project) {
    const normalizedBudgetPerProject = normalizeNullValue(data.budget_per_project);
    eligibilityCriteria.budgetPerProject = normalizedBudgetPerProject;
    // Also try to extract numeric value for budgetAmount if not set
    if (!payload.budgetAmount && normalizedBudgetPerProject) {
      payload.budgetAmount = parseBudgetAmount(normalizedBudgetPerProject);
    }
  }
  if (data.funding_rate) {
    eligibilityCriteria.fundingRate = normalizeNullValue(data.funding_rate);
  }
  if (data.project_duration) {
    payload.fundingPeriod = normalizeNullValue(data.project_duration);
  }
  if (data.num_awards) {
    eligibilityCriteria.numAwards = parseNumAwards(data.num_awards);
  }

  // Section C mappings
  if (data.applicant_org_types) {
    payload.targetType = parseOrganizationTypes(data.applicant_org_types);
  }
  if (data.lead_role_allowed) {
    eligibilityCriteria.leadRoleAllowed = parseArrayField(data.lead_role_allowed);
  }
  if (data.co_role_allowed) {
    eligibilityCriteria.coRoleAllowed = parseArrayField(data.co_role_allowed);
  }
  if (data.consortium_required) {
    payload.requiresResearchInstitute = parseBoolean(data.consortium_required);
  }
  if (data.required_registrations) {
    const regs = parseArrayField(data.required_registrations);
    payload.requiredCertifications = [
      ...(payload.requiredCertifications || []),
      ...regs,
    ];
  }
  if (data.required_certifications) {
    const certs = parseArrayField(data.required_certifications);
    payload.requiredCertifications = [
      ...(payload.requiredCertifications || []),
      ...certs,
    ];
  }
  if (data.exclusion_rules) {
    eligibilityCriteria.exclusionRules = parseArrayField(data.exclusion_rules);
  }

  // Section D mappings
  if (data.tech_keywords) {
    payload.keywords = parseArrayField(data.tech_keywords);
  }
  if (data.domain_tags) {
    const domainTags = parseArrayField(data.domain_tags);
    eligibilityCriteria.domainTags = domainTags;
    // Also use first domain tag as primaryTargetIndustry
    if (!payload.primaryTargetIndustry && domainTags.length > 0) {
      payload.primaryTargetIndustry = domainTags[0];
    }
  }

  // Store additional data in eligibilityCriteria JSON field
  if (Object.keys(eligibilityCriteria).length > 0) {
    payload.eligibilityCriteria = eligibilityCriteria;
  }

  // Metadata
  payload.eligibilityConfidence = ConfidenceLevel.HIGH;
  payload.eligibilityLastUpdated = new Date();
  payload.manualReviewCompletedAt = new Date();
  payload.manualReviewCompletedBy = 'claude-code-pdf-extraction';

  return payload;
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
  const [, , programId, jsonData] = process.argv;

  if (!programId || !jsonData) {
    console.error(JSON.stringify({
      success: false,
      error: 'Missing required arguments',
      usage: "npx ts-node scripts/enrich-program-from-pdf.ts <program-id> '<json-data>'",
    }));
    process.exit(1);
  }

  try {
    // Validate program exists
    const existingProgram = await prisma.funding_programs.findUnique({
      where: { id: programId },
      select: { id: true, title: true },
    });

    if (!existingProgram) {
      console.error(JSON.stringify({
        success: false,
        error: `Program not found: ${programId}`,
      }));
      process.exit(1);
    }

    // Parse JSON data
    const data: ExtractedData = JSON.parse(jsonData);

    // Build update payload
    const updatePayload = buildUpdatePayload(data);

    // Update database
    const updated = await prisma.funding_programs.update({
      where: { id: programId },
      data: updatePayload,
    });

    // Output success result
    console.log(JSON.stringify({
      success: true,
      programId: updated.id,
      title: updated.title,
      updatedFields: Object.keys(updatePayload),
      fieldsDetail: {
        deadline: updated.deadline?.toISOString(),
        applicationStart: updated.applicationStart?.toISOString(),
        budgetAmount: updated.budgetAmount?.toString(),
        fundingPeriod: updated.fundingPeriod,
        targetType: updated.targetType,
        keywords: updated.keywords,
        eligibilityConfidence: updated.eligibilityConfidence,
      },
    }, null, 2));

  } catch (error: any) {
    console.error(JSON.stringify({
      success: false,
      error: error.message,
      stack: error.stack,
    }));
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
