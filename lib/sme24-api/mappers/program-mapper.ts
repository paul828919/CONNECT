/**
 * SME24 Program Mapper
 *
 * Maps API response data from 중소벤처24 민간공고목록정보 API
 * to the sme_programs Prisma model for database storage.
 *
 * Key responsibilities:
 * - Parse pipe-separated values to arrays
 * - Convert date formats (YYYYMMDD → Date)
 * - Strip HTML from text fields
 * - Generate content hash for deduplication
 */

import { Prisma, SMEProgramStatus } from '@prisma/client';
import { SME24AnnouncementItem } from '../types';
import crypto from 'crypto';

/**
 * Strip HTML tags from a string
 */
function stripHtml(html: string | undefined | null): string | null {
  if (!html) return null;

  return html
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Decode HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim() || null;
}

/**
 * Parse pipe-separated values to array
 * Example: "서울|경기|부산" → ["서울", "경기", "부산"]
 */
function parsePipeSeparated(value: string | undefined | null): string[] {
  if (!value) return [];
  return value
    .split('|')
    .map(v => v.trim())
    .filter(Boolean);
}

/**
 * Parse date string from various formats to Date object
 * Handles: YYYYMMDD, YYYY-MM-DD, YYYY-MM-DD HH:MM:SS
 */
function parseDate(dateStr: string | undefined | null): Date | null {
  if (!dateStr) return null;

  // Handle YYYYMMDD format
  if (/^\d{8}$/.test(dateStr)) {
    const year = parseInt(dateStr.slice(0, 4));
    const month = parseInt(dateStr.slice(4, 6)) - 1; // 0-indexed
    const day = parseInt(dateStr.slice(6, 8));
    return new Date(year, month, day);
  }

  // Handle YYYY-MM-DD and YYYY-MM-DD HH:MM:SS formats
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  return null;
}

/**
 * Parse numeric value safely
 */
function parseNumber(value: number | string | undefined | null): number | null {
  if (value === undefined || value === null || value === '') return null;
  const parsed = typeof value === 'number' ? value : parseInt(String(value));
  return isNaN(parsed) ? null : parsed;
}

/**
 * Parse BigInt value safely
 */
function parseBigInt(value: number | string | undefined | null): bigint | null {
  if (value === undefined || value === null || value === '') return null;
  try {
    return BigInt(String(value).replace(/,/g, ''));
  } catch {
    return null;
  }
}

/**
 * Parse Decimal value safely
 */
function parseDecimal(value: number | string | undefined | null): Prisma.Decimal | null {
  if (value === undefined || value === null || value === '') return null;
  const parsed = typeof value === 'number' ? value : parseFloat(String(value));
  return isNaN(parsed) ? null : new Prisma.Decimal(parsed);
}

/**
 * Generate content hash for deduplication
 * Uses pblancSeq as the primary unique identifier
 */
function generateContentHash(item: SME24AnnouncementItem): string {
  const hashInput = `sme24-${item.pblancSeq}`;
  return crypto.createHash('md5').update(hashInput).digest('hex');
}

/**
 * Map SME24 API response to sme_programs Prisma model
 *
 * @param apiData Raw API response item
 * @returns Prisma create input for sme_programs
 */
export function mapSME24ToSMEProgram(
  apiData: SME24AnnouncementItem
): Prisma.sme_programsCreateInput {
  // Determine program status based on application end date
  let status: SMEProgramStatus = 'ACTIVE';
  const applicationEnd = parseDate(apiData.pblancEndDt);
  if (applicationEnd && applicationEnd < new Date()) {
    status = 'EXPIRED';
  }

  return {
    // Core identifiers
    pblancSeq: apiData.pblancSeq,
    title: apiData.pblancNm,
    detailBsnsNm: apiData.detailBsnsNm || null,

    // Content (strip HTML)
    description: stripHtml(apiData.policyCnts),
    supportScale: stripHtml(apiData.sportMg),
    supportContents: stripHtml(apiData.sportCnts),
    supportTarget: stripHtml(apiData.sportTrget),
    applicationMethod: stripHtml(apiData.reqstRcept),

    // Organization & Contact
    supportInstitution: apiData.sportInsttNm || null,
    supportInstitutionCd: apiData.sportInsttCd || null,
    contactInfo: stripHtml(apiData.refrnc),
    contactUrl: apiData.refrncUrl || null,
    contactDept: apiData.refrncDept || null,
    contactTel: apiData.refrncTel || null,
    linkedInstitution: apiData.cntcInsttNm || null,
    linkedInstitutionCd: apiData.cntcInsttCd || null,

    // URLs & Attachments
    detailUrl: apiData.pblancDtlUrl || null,
    applicationUrl: apiData.reqstLinkInfo || null,
    attachmentUrls: parsePipeSeparated(apiData.pblancAttach),
    attachmentNames: parsePipeSeparated(apiData.pblancAttachNm),
    announcementFileUrl: apiData.pblancFileUrl || null,
    announcementFileName: apiData.pblancFileNm || null,

    // Dates
    applicationStart: parseDate(apiData.pblancBgnDt),
    applicationEnd: applicationEnd,
    apiCreatedAt: parseDate(apiData.creatDt),
    apiUpdatedAt: parseDate(apiData.updDt),

    // Classification
    bizType: apiData.bizType || null,
    bizTypeCd: apiData.bizTypeCd || null,
    sportType: apiData.sportType || null,
    sportTypeCd: apiData.sportTypeCd || null,
    lifeCycle: parsePipeSeparated(apiData.lifeCyclDvsn),
    lifeCycleCd: parsePipeSeparated(apiData.lifeCyclDvsnCd),

    // Eligibility Criteria (all pipe-separated → arrays)
    targetRegions: parsePipeSeparated(apiData.areaNm),
    targetRegionCodes: parsePipeSeparated(apiData.areaCd),
    targetCompanyScale: parsePipeSeparated(apiData.cmpScale),
    targetCompanyScaleCd: parsePipeSeparated(apiData.cmpScaleCd),
    targetSalesRange: parsePipeSeparated(apiData.salsAmt),
    targetSalesRangeCd: parsePipeSeparated(apiData.salsAmtCd),
    minSalesAmount: parseBigInt(apiData.minSalsAmt),
    maxSalesAmount: parseBigInt(apiData.maxSalsAmt),
    targetEmployeeRange: parsePipeSeparated(apiData.emplyCnt),
    targetEmployeeRangeCd: parsePipeSeparated(apiData.emplyCntCd),
    minEmployeeCount: parseNumber(apiData.minEmplyCnt),
    maxEmployeeCount: parseNumber(apiData.mixEmplyCnt), // Note: API typo "mix" not "max"
    targetBusinessAge: parsePipeSeparated(apiData.ablbiz),
    targetBusinessAgeCd: parsePipeSeparated(apiData.ablbizCd),
    minBusinessAge: parseNumber(apiData.minAblbiz),
    maxBusinessAge: parseNumber(apiData.maxAblbiz),
    targetCeoAge: parseNumber(apiData.rpsntAge),
    minCeoAge: parseNumber(apiData.minRpsntAge),
    maxCeoAge: parseNumber(apiData.maxRpsntAge),
    targetIndustry: apiData.induty || null,

    // Required certifications
    requiredCerts: parsePipeSeparated(apiData.needCrtfn),
    requiredCertsCd: parsePipeSeparated(apiData.needCrtfnCd),

    // Financial
    minSupportAmount: parseBigInt(apiData.minSportAmt),
    maxSupportAmount: parseBigInt(apiData.maxSportAmt),
    minInterestRate: parseDecimal(apiData.minInrst),
    maxInterestRate: parseDecimal(apiData.maxInrst),

    // Special flags
    isRestart: apiData.refntnYn === 'Y',
    isPreStartup: apiData.fntnYn === 'Y',
    isFemaleOwner: apiData.fmleRpsntYn === 'Y',

    // Internal
    status: status,
    contentHash: generateContentHash(apiData),
    syncedAt: new Date(),
  };
}

/**
 * Map SME24 API response to update input (for existing programs)
 */
export function mapSME24ToSMEProgramUpdate(
  apiData: SME24AnnouncementItem
): Prisma.sme_programsUpdateInput {
  // Get full mapping and remove id-related fields
  const fullMapping = mapSME24ToSMEProgram(apiData);

  // These fields should not be updated (keep original)
  const { pblancSeq, contentHash, ...updateData } = fullMapping;

  return {
    ...updateData,
    syncedAt: new Date(),
  };
}

/**
 * Batch map multiple API items
 */
export function mapSME24Programs(
  items: SME24AnnouncementItem[]
): Prisma.sme_programsCreateInput[] {
  return items.map(mapSME24ToSMEProgram);
}
