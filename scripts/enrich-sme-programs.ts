/**
 * SME Programs Enrichment Batch Script
 *
 * Extracts eligibility criteria from text fields and updates database.
 * This is Tier 1 (rule-based) extraction for zero-cost processing.
 *
 * Run: npx tsx scripts/enrich-sme-programs.ts
 *
 * Options:
 *   --dry-run    Preview changes without updating database
 *   --limit=N    Process only N programs (default: all)
 *   --force      Re-extract even for programs with existing data
 */

import { PrismaClient } from '@prisma/client';
import {
  extractRegionFromTitleAndDescription,
} from '../lib/sme24-api/mappers/code-mapper';
import {
  extractEligibilityFromText,
  extractCompanyScale,
  hasExtractedEligibility,
} from '../lib/sme24-api/mappers/eligibility-text-extractor';

const prisma = new PrismaClient();

interface EnrichmentStats {
  total: number;
  processed: number;
  updated: number;
  skipped: number;
  errors: number;
  regionExtracted: number;
  scaleExtracted: number;
  employeesExtracted: number;
  revenueExtracted: number;
  businessAgeExtracted: number;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const force = args.includes('--force');
  const limitArg = args.find(a => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : undefined;

  console.log('=== SME Programs Enrichment Batch ===\n');
  console.log(`Mode: ${dryRun ? 'DRY RUN (no database changes)' : 'LIVE'}`);
  console.log(`Force re-extract: ${force}`);
  console.log(`Limit: ${limit || 'none'}\n`);

  const stats: EnrichmentStats = {
    total: 0,
    processed: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    regionExtracted: 0,
    scaleExtracted: 0,
    employeesExtracted: 0,
    revenueExtracted: 0,
    businessAgeExtracted: 0,
  };

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
  const programs = await prisma.sme_programs.findMany({
    where: whereConditions,
    select: {
      id: true,
      title: true,
      description: true,
      supportTarget: true,
      targetRegionCodes: true,
      targetCompanyScale: true,
      targetCompanyScaleCd: true,
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

  stats.total = programs.length;
  console.log(`Found ${stats.total} programs to process\n`);

  // Process each program
  for (const program of programs) {
    try {
      stats.processed++;

      // Extract eligibility from text
      const extracted = extractEligibilityFromText(
        program.title,
        program.description,
        program.supportTarget
      );

      if (!hasExtractedEligibility(extracted)) {
        stats.skipped++;
        continue;
      }

      // Build update payload
      const updatePayload: any = {};
      let hasUpdates = false;

      // Update regions if API didn't provide them
      const currentRegions = program.targetRegionCodes || [];
      if (currentRegions.length === 0 && extracted.regions.length > 0) {
        // Convert KoreanRegion enum to region codes
        const regionCodeMap: Record<string, string> = {
          SEOUL: '1100', GYEONGGI: '4100', INCHEON: '2800', BUSAN: '2600',
          DAEGU: '2700', GWANGJU: '2900', DAEJEON: '3000', ULSAN: '3100',
          SEJONG: '3611', GANGWON: '4200', CHUNGBUK: '4300', CHUNGNAM: '4400',
          JEONBUK: '4500', JEONNAM: '4600', GYEONGBUK: '4700', GYEONGNAM: '4800',
          JEJU: '5000',
        };
        const regionNameMap: Record<string, string> = {
          SEOUL: '서울', GYEONGGI: '경기', INCHEON: '인천', BUSAN: '부산',
          DAEGU: '대구', GWANGJU: '광주', DAEJEON: '대전', ULSAN: '울산',
          SEJONG: '세종', GANGWON: '강원', CHUNGBUK: '충북', CHUNGNAM: '충남',
          JEONBUK: '전북', JEONNAM: '전남', GYEONGBUK: '경북', GYEONGNAM: '경남',
          JEJU: '제주',
        };

        updatePayload.targetRegionCodes = extracted.regions.map(r => regionCodeMap[r]);
        updatePayload.targetRegions = extracted.regions.map(r => regionNameMap[r]);
        stats.regionExtracted++;
        hasUpdates = true;
      }

      // Update company scale if API didn't provide it
      const currentScale = program.targetCompanyScale || [];
      if (currentScale.length === 0 && extracted.companyScale.length > 0) {
        updatePayload.targetCompanyScale = extracted.companyScale;
        stats.scaleExtracted++;
        hasUpdates = true;
      }

      // Update employee count if API didn't provide it
      if (program.minEmployeeCount === null && extracted.minEmployees !== null) {
        updatePayload.minEmployeeCount = extracted.minEmployees;
        stats.employeesExtracted++;
        hasUpdates = true;
      }
      if (program.maxEmployeeCount === null && extracted.maxEmployees !== null) {
        updatePayload.maxEmployeeCount = extracted.maxEmployees;
        if (!hasUpdates) stats.employeesExtracted++;
        hasUpdates = true;
      }

      // Update revenue if API didn't provide it (convert 억원 to 원)
      if (program.minSalesAmount === null && extracted.minRevenue !== null) {
        updatePayload.minSalesAmount = BigInt(Math.round(extracted.minRevenue * 100_000_000));
        stats.revenueExtracted++;
        hasUpdates = true;
      }
      if (program.maxSalesAmount === null && extracted.maxRevenue !== null) {
        updatePayload.maxSalesAmount = BigInt(Math.round(extracted.maxRevenue * 100_000_000));
        if (!hasUpdates) stats.revenueExtracted++;
        hasUpdates = true;
      }

      // Update business age if API didn't provide it
      if (program.minBusinessAge === null && extracted.minBusinessAge !== null) {
        updatePayload.minBusinessAge = extracted.minBusinessAge;
        stats.businessAgeExtracted++;
        hasUpdates = true;
      }
      if (program.maxBusinessAge === null && extracted.maxBusinessAge !== null) {
        updatePayload.maxBusinessAge = extracted.maxBusinessAge;
        if (!hasUpdates) stats.businessAgeExtracted++;
        hasUpdates = true;
      }

      // Apply update
      if (hasUpdates) {
        if (!dryRun) {
          await prisma.sme_programs.update({
            where: { id: program.id },
            data: updatePayload,
          });
        }
        stats.updated++;

        // Log progress every 100 programs
        if (stats.updated % 100 === 0) {
          console.log(`Progress: ${stats.processed}/${stats.total} processed, ${stats.updated} updated`);
        }
      } else {
        stats.skipped++;
      }
    } catch (error) {
      stats.errors++;
      console.error(`Error processing program ${program.id}:`, error);
    }
  }

  // Print summary
  console.log('\n=== Enrichment Summary ===\n');
  console.log(`Total programs: ${stats.total}`);
  console.log(`Processed: ${stats.processed}`);
  console.log(`Updated: ${stats.updated}`);
  console.log(`Skipped (no extractable data): ${stats.skipped}`);
  console.log(`Errors: ${stats.errors}`);
  console.log('\n--- Extraction Breakdown ---');
  console.log(`Regions extracted: ${stats.regionExtracted}`);
  console.log(`Company scale extracted: ${stats.scaleExtracted}`);
  console.log(`Employees extracted: ${stats.employeesExtracted}`);
  console.log(`Revenue extracted: ${stats.revenueExtracted}`);
  console.log(`Business age extracted: ${stats.businessAgeExtracted}`);

  if (dryRun) {
    console.log('\n⚠️  DRY RUN - No database changes were made');
    console.log('Run without --dry-run to apply changes');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
