/**
 * SME Program Enrichment Service
 *
 * Extracts eligibility criteria from text fields using Tier 1 (rule-based)
 * and optionally Tier 2 (LLM) extraction.
 *
 * This service is called:
 * 1. Automatically after SME24 API sync (cron job)
 * 2. Manually via CLI script (scripts/enrich-sme-programs.ts)
 */

import { db } from '@/lib/db';
import {
  extractEligibilityFromText,
  hasExtractedEligibility,
} from './mappers/eligibility-text-extractor';

// ============================================================================
// Types
// ============================================================================

export interface EnrichmentResult {
  success: boolean;
  total: number;
  processed: number;
  updated: number;
  skipped: number;
  errors: number;
  duration: number;
  breakdown: {
    regions: number;
    companyScale: number;
    employees: number;
    revenue: number;
    businessAge: number;
  };
}

export interface EnrichmentOptions {
  /** Process only N programs (default: all) */
  limit?: number;
  /** Re-extract even for programs with existing data */
  force?: boolean;
  /** Skip DB updates (preview mode) */
  dryRun?: boolean;
}

// ============================================================================
// Region Code Mappings
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

// ============================================================================
// Main Enrichment Function
// ============================================================================

/**
 * Run Tier 1 enrichment on SME programs
 *
 * @param options Enrichment options
 * @returns Enrichment result summary
 */
export async function runTier1Enrichment(
  options: EnrichmentOptions = {}
): Promise<EnrichmentResult> {
  const startTime = Date.now();
  const { limit, force = false, dryRun = false } = options;

  const result: EnrichmentResult = {
    success: true,
    total: 0,
    processed: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    duration: 0,
    breakdown: {
      regions: 0,
      companyScale: 0,
      employees: 0,
      revenue: 0,
      businessAge: 0,
    },
  };

  try {
    // Build query conditions
    const whereConditions: any = {
      status: 'ACTIVE',
    };

    // If not forcing, only process programs with empty eligibility data
    if (!force) {
      whereConditions.OR = [
        { targetRegionCodes: { isEmpty: true } },
        { targetRegionCodes: { equals: [] } },
        { targetCompanyScale: { isEmpty: true } },
        { targetCompanyScale: { equals: [] } },
      ];
    }

    // Get programs to process
    const programs = await db.sme_programs.findMany({
      where: whereConditions,
      select: {
        id: true,
        title: true,
        description: true,
        supportTarget: true,
        targetRegionCodes: true,
        targetCompanyScale: true,
        minEmployeeCount: true,
        maxEmployeeCount: true,
        minSalesAmount: true,
        maxSalesAmount: true,
        minBusinessAge: true,
        maxBusinessAge: true,
      },
      take: limit,
      orderBy: { syncedAt: 'desc' },
    });

    result.total = programs.length;

    // Process each program
    for (const program of programs) {
      try {
        result.processed++;

        // Extract eligibility from text
        const extracted = extractEligibilityFromText(
          program.title,
          program.description,
          program.supportTarget
        );

        if (!hasExtractedEligibility(extracted)) {
          result.skipped++;
          continue;
        }

        // Build update payload
        const updatePayload: any = {};
        let hasUpdates = false;

        // Update regions if API didn't provide them
        const currentRegions = program.targetRegionCodes || [];
        if (currentRegions.length === 0 && extracted.regions.length > 0) {
          updatePayload.targetRegionCodes = extracted.regions.map((r) => REGION_CODE_MAP[r]);
          updatePayload.targetRegions = extracted.regions.map((r) => REGION_NAME_MAP[r]);
          result.breakdown.regions++;
          hasUpdates = true;
        }

        // Update company scale if API didn't provide it
        const currentScale = program.targetCompanyScale || [];
        if (currentScale.length === 0 && extracted.companyScale.length > 0) {
          updatePayload.targetCompanyScale = extracted.companyScale;
          result.breakdown.companyScale++;
          hasUpdates = true;
        }

        // Update employee count if API didn't provide it
        if (program.minEmployeeCount === null && extracted.minEmployees !== null) {
          updatePayload.minEmployeeCount = extracted.minEmployees;
          result.breakdown.employees++;
          hasUpdates = true;
        }
        if (program.maxEmployeeCount === null && extracted.maxEmployees !== null) {
          updatePayload.maxEmployeeCount = extracted.maxEmployees;
          hasUpdates = true;
        }

        // Update revenue if API didn't provide it (convert 억원 to 원)
        if (program.minSalesAmount === null && extracted.minRevenue !== null) {
          updatePayload.minSalesAmount = BigInt(Math.round(extracted.minRevenue * 100_000_000));
          result.breakdown.revenue++;
          hasUpdates = true;
        }
        if (program.maxSalesAmount === null && extracted.maxRevenue !== null) {
          updatePayload.maxSalesAmount = BigInt(Math.round(extracted.maxRevenue * 100_000_000));
          hasUpdates = true;
        }

        // Update business age if API didn't provide it
        if (program.minBusinessAge === null && extracted.minBusinessAge !== null) {
          updatePayload.minBusinessAge = extracted.minBusinessAge;
          result.breakdown.businessAge++;
          hasUpdates = true;
        }
        if (program.maxBusinessAge === null && extracted.maxBusinessAge !== null) {
          updatePayload.maxBusinessAge = extracted.maxBusinessAge;
          hasUpdates = true;
        }

        // Apply update
        if (hasUpdates && !dryRun) {
          await db.sme_programs.update({
            where: { id: program.id },
            data: updatePayload,
          });
          result.updated++;
        } else if (hasUpdates) {
          result.updated++; // Count for dry run
        } else {
          result.skipped++;
        }
      } catch (error) {
        result.errors++;
        console.error(`[Enrichment] Error processing program ${program.id}:`, error);
      }
    }

    result.duration = Date.now() - startTime;
    return result;
  } catch (error: any) {
    result.success = false;
    result.duration = Date.now() - startTime;
    console.error('[Enrichment] Fatal error:', error.message);
    return result;
  }
}
