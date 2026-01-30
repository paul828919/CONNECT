/**
 * SME Document Extraction Service (Tier 3)
 *
 * Orchestrates the full document-based enrichment pipeline:
 *   1. Download announcement attachments (PDF/HWP/HWPX)
 *   2. Extract text from downloaded files
 *   3. Send document text to LLM for eligibility extraction
 *   4. Update database with extracted fields (conditional — never overwrite API data)
 *
 * This service handles programs that Tier 1 (regex) and Tier 2 (LLM on API text)
 * couldn't enrich because the eligibility data only exists in attached documents.
 *
 * Uses `eligibilityConfidence = 'HIGH'` to mark Tier 3 processed programs,
 * as document-based extraction provides the highest confidence level.
 */

import { db } from '@/lib/db';
import { downloadSMEAttachments, DownloadError } from './attachment-downloader';
import { extractTextFromAttachment } from '../scraping/utils/attachment-parser';
import {
  extractEligibilityFromDocument,
  Tier3ExtractionResult,
} from './mappers/sme-tier3-document-extractor';
import { logAICost } from '../ai/monitoring/cost-logger';

// ============================================================================
// Types
// ============================================================================

export interface DocumentEnrichmentResult {
  success: boolean;
  total: number;
  processed: number;
  downloaded: number;
  extracted: number;
  updated: number;
  skipped: number;
  errors: number;
  downloadErrors: DownloadError[];
  totalCostUSD: number;
  totalCostKRW: number;
  duration: number;
  breakdown: {
    regions: number;
    companyScale: number;
    employees: number;
    revenue: number;
    businessAge: number;
    certs: number;
    industry: number;
    exclusions: number;
    supportAmount: number;
  };
}

export interface DocumentEnrichmentOptions {
  limit?: number;
  force?: boolean;
  dryRun?: boolean;
  model?: 'haiku' | 'opus';
  offset?: number;
  batchSize?: number;
}

// ============================================================================
// Region Mappings
// ============================================================================

const REGION_CODE_MAP: Record<string, string> = {
  SEOUL: '1100',
  GYEONGGI: '4100',
  INCHEON: '2800',
  BUSAN: '2600',
  DAEGU: '2700',
  GWANGJU: '2900',
  DAEJEON: '3000',
  ULSAN: '3100',
  SEJONG: '3611',
  GANGWON: '4200',
  CHUNGBUK: '4300',
  CHUNGNAM: '4400',
  JEONBUK: '4500',
  JEONNAM: '4600',
  GYEONGBUK: '4700',
  GYEONGNAM: '4800',
  JEJU: '5000',
};

const REGION_NAME_MAP: Record<string, string> = {
  SEOUL: '서울',
  GYEONGGI: '경기',
  INCHEON: '인천',
  BUSAN: '부산',
  DAEGU: '대구',
  GWANGJU: '광주',
  DAEJEON: '대전',
  ULSAN: '울산',
  SEJONG: '세종',
  GANGWON: '강원',
  CHUNGBUK: '충북',
  CHUNGNAM: '충남',
  JEONBUK: '전북',
  JEONNAM: '전남',
  GYEONGBUK: '경북',
  GYEONGNAM: '경남',
  JEJU: '제주',
};

// KRW per USD (approximate)
const KRW_PER_USD = 1300;

// ============================================================================
// Main Enrichment Function
// ============================================================================

/**
 * Run Tier 3 document-based enrichment on SME programs
 *
 * Processes programs that have attachment URLs but lack eligibility data
 * from Tier 1/2 enrichment.
 */
export async function runTier3DocumentEnrichment(
  options: DocumentEnrichmentOptions = {}
): Promise<DocumentEnrichmentResult> {
  const startTime = Date.now();
  const {
    limit = 10,
    force = false,
    dryRun = false,
    model = 'haiku',
    offset = 0,
  } = options;

  const result: DocumentEnrichmentResult = {
    success: true,
    total: 0,
    processed: 0,
    downloaded: 0,
    extracted: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    downloadErrors: [],
    totalCostUSD: 0,
    totalCostKRW: 0,
    duration: 0,
    breakdown: {
      regions: 0,
      companyScale: 0,
      employees: 0,
      revenue: 0,
      businessAge: 0,
      certs: 0,
      industry: 0,
      exclusions: 0,
      supportAmount: 0,
    },
  };

  try {
    // Build query: active programs with attachments but missing eligibility
    const whereConditions: any = {
      status: 'ACTIVE',
      OR: [
        { NOT: { attachmentUrls: { isEmpty: true } } },
        { announcementFileUrl: { not: null } },
      ],
    };

    if (!force) {
      // Only process programs not yet enriched by Tier 3
      // and missing key eligibility data
      whereConditions.AND = [
        { eligibilityConfidence: { not: 'HIGH' } },
        {
          OR: [
            { targetRegionCodes: { isEmpty: true } },
            { targetRegionCodes: { equals: [] } },
            { targetCompanyScale: { isEmpty: true } },
            { targetCompanyScale: { equals: [] } },
          ],
        },
      ];
    }

    const programs = await db.sme_programs.findMany({
      where: whereConditions,
      select: {
        id: true,
        title: true,
        description: true,
        attachmentUrls: true,
        attachmentNames: true,
        announcementFileUrl: true,
        targetRegionCodes: true,
        targetRegions: true,
        targetCompanyScale: true,
        targetCompanyScaleCd: true,
        minEmployeeCount: true,
        maxEmployeeCount: true,
        minSalesAmount: true,
        maxSalesAmount: true,
        minBusinessAge: true,
        maxBusinessAge: true,
        eligibilityConfidence: true,
      },
      skip: offset,
      take: limit,
      orderBy: { syncedAt: 'desc' },
    });

    result.total = programs.length;

    for (const program of programs) {
      try {
        result.processed++;

        // Step 1: Download attachments
        const { results: downloads, errors: dlErrors } = await downloadSMEAttachments({
          id: program.id,
          attachmentUrls: program.attachmentUrls,
          attachmentNames: program.attachmentNames,
          announcementFileUrl: program.announcementFileUrl,
        });

        result.downloadErrors.push(...dlErrors);

        if (downloads.length === 0) {
          console.log(`[Tier3] No downloadable attachments for: ${program.title.substring(0, 50)}`);
          result.skipped++;
          continue;
        }

        result.downloaded++;
        const download = downloads[0]; // Use first successful download

        // Step 2: Extract text from document
        const documentText = await extractTextFromAttachment(
          download.fileName,
          download.fileBuffer
        );

        if (!documentText || documentText.length < 100) {
          console.log(
            `[Tier3] Insufficient text extracted (${documentText?.length || 0} chars): ${download.fileName}`
          );
          result.skipped++;
          continue;
        }

        result.extracted++;

        if (dryRun) {
          console.log(
            `[Tier3] [DRY RUN] Would extract from ${download.fileName} (${documentText.length} chars)`
          );
          continue;
        }

        // Step 3: LLM extraction
        const tier3Result = await extractEligibilityFromDocument(
          documentText,
          program.title,
          model
        );

        result.totalCostUSD += tier3Result.cost;
        result.totalCostKRW += tier3Result.cost * KRW_PER_USD;

        // Log cost to database
        await logAICost({
          serviceType: 'EXTRACTION',
          endpoint: 'sme-tier3-document-extraction',
          model: tier3Result.model,
          inputTokens: tier3Result.tokensUsed.input,
          outputTokens: tier3Result.tokensUsed.output,
          costKRW: tier3Result.cost * KRW_PER_USD,
          duration: 0, // not measured individually
          success: tier3Result.confidence !== 'LOW',
        });

        // Step 4: Build conditional update payload
        const updatePayload = buildUpdatePayload(program, tier3Result, result.breakdown);

        if (Object.keys(updatePayload).length > 0) {
          // Always mark as HIGH confidence when processed by Tier 3
          updatePayload.eligibilityConfidence = 'HIGH';
          updatePayload.eligibilityLastUpdated = new Date();

          await db.sme_programs.update({
            where: { id: program.id },
            data: updatePayload,
          });
          result.updated++;

          console.log(
            `[Tier3] Updated: ${program.title.substring(0, 50)} ` +
              `(${Object.keys(updatePayload).length - 2} fields, $${tier3Result.cost.toFixed(4)})`
          );
        } else {
          // Still mark as processed even if no new data
          await db.sme_programs.update({
            where: { id: program.id },
            data: {
              eligibilityConfidence: 'HIGH',
              eligibilityLastUpdated: new Date(),
            },
          });
          result.skipped++;
          console.log(`[Tier3] No new data for: ${program.title.substring(0, 50)}`);
        }

        // Rate limiting: 1s between LLM calls
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error: any) {
        result.errors++;
        console.error(`[Tier3] Error processing program ${program.id}:`, error.message);
      }
    }

    result.duration = Date.now() - startTime;
    return result;
  } catch (error: any) {
    result.success = false;
    result.duration = Date.now() - startTime;
    console.error('[Tier3] Fatal error:', error.message);
    return result;
  }
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Build conditional update payload — only fill empty fields (never overwrite API data)
 */
function buildUpdatePayload(
  program: {
    targetRegionCodes: string[];
    targetCompanyScale: string[];
    minEmployeeCount: number | null;
    maxEmployeeCount: number | null;
    minSalesAmount: bigint | null;
    maxSalesAmount: bigint | null;
    minBusinessAge: number | null;
    maxBusinessAge: number | null;
  },
  tier3: Tier3ExtractionResult,
  breakdown: DocumentEnrichmentResult['breakdown']
): Record<string, any> {
  const payload: Record<string, any> = {};

  // Regions
  const currentRegions = program.targetRegionCodes || [];
  if (currentRegions.length === 0 && tier3.regions.length > 0) {
    payload.targetRegionCodes = tier3.regions.map((r) => REGION_CODE_MAP[r]);
    payload.targetRegions = tier3.regions.map((r) => REGION_NAME_MAP[r]);
    breakdown.regions++;
  }

  // Company scale
  const currentScale = program.targetCompanyScale || [];
  if (currentScale.length === 0 && tier3.companyScale.length > 0) {
    payload.targetCompanyScale = tier3.companyScale;
    breakdown.companyScale++;
  }

  // Employees
  if (program.minEmployeeCount === null && tier3.minEmployees !== null) {
    payload.minEmployeeCount = tier3.minEmployees;
    breakdown.employees++;
  }
  if (program.maxEmployeeCount === null && tier3.maxEmployees !== null) {
    payload.maxEmployeeCount = tier3.maxEmployees;
  }

  // Revenue (convert 억원 to 원)
  if (program.minSalesAmount === null && tier3.minRevenue !== null) {
    payload.minSalesAmount = BigInt(Math.round(tier3.minRevenue * 100_000_000));
    breakdown.revenue++;
  }
  if (program.maxSalesAmount === null && tier3.maxRevenue !== null) {
    payload.maxSalesAmount = BigInt(Math.round(tier3.maxRevenue * 100_000_000));
  }

  // Business age
  if (program.minBusinessAge === null && tier3.minBusinessAge !== null) {
    payload.minBusinessAge = tier3.minBusinessAge;
    breakdown.businessAge++;
  }
  if (program.maxBusinessAge === null && tier3.maxBusinessAge !== null) {
    payload.maxBusinessAge = tier3.maxBusinessAge;
  }

  // Tier 3 additional fields — these are new columns that would need schema additions
  // For now, log them for review; they can be added to the schema in a future migration
  if (tier3.requiredCerts.length > 0) {
    breakdown.certs++;
  }
  if (tier3.targetIndustry) {
    breakdown.industry++;
  }
  if (tier3.exclusionConditions.length > 0) {
    breakdown.exclusions++;
  }
  if (tier3.supportAmountMin !== null || tier3.supportAmountMax !== null) {
    breakdown.supportAmount++;
  }

  return payload;
}
