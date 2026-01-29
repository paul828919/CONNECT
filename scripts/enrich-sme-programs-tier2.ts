/**
 * SME Programs Tier 2 Enrichment Batch Script
 *
 * Uses Claude Haiku to extract eligibility criteria for programs
 * that Tier 1 rule-based extraction couldn't handle.
 *
 * Run: npx tsx scripts/enrich-sme-programs-tier2.ts
 *
 * Options:
 *   --dry-run     Preview changes without updating database or calling API
 *   --limit=N     Process only N programs (default: 50)
 *   --force       Process even programs with existing data
 */

import { PrismaClient } from '@prisma/client';
import {
  extractEligibilityFromText,
  hasExtractedEligibility,
} from '../lib/sme24-api/mappers/eligibility-text-extractor';
import {
  extractEligibilityWithHaiku,
  shouldUseTier2,
} from '../lib/sme24-api/mappers/sme-tier2-extractor';

const prisma = new PrismaClient();

interface Tier2Stats {
  total: number;
  processed: number;
  updated: number;
  skippedTier1Success: number;
  skippedExistingData: number;
  apiCalls: number;
  totalCost: number;
  errors: number;
  fieldsExtracted: {
    regions: number;
    companyScale: number;
    employees: number;
    revenue: number;
    businessAge: number;
  };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const force = args.includes('--force');
  const limitArg = args.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 50;

  console.log('=== SME Programs Tier 2 (Haiku LLM) Enrichment ===\n');
  console.log(`Mode: ${dryRun ? 'DRY RUN (no API calls or DB changes)' : 'LIVE'}`);
  console.log(`Force re-extract: ${force}`);
  console.log(`Limit: ${limit}\n`);

  const stats: Tier2Stats = {
    total: 0,
    processed: 0,
    updated: 0,
    skippedTier1Success: 0,
    skippedExistingData: 0,
    apiCalls: 0,
    totalCost: 0,
    errors: 0,
    fieldsExtracted: {
      regions: 0,
      companyScale: 0,
      employees: 0,
      revenue: 0,
      businessAge: 0,
    },
  };

  // Get programs that need Tier 2 processing
  const whereConditions: any = {
    status: 'ACTIVE',
  };

  // If not forcing, only process programs with empty eligibility data
  if (!force) {
    whereConditions.AND = [
      {
        OR: [{ targetRegionCodes: { isEmpty: true } }, { targetRegionCodes: { equals: [] } }],
      },
      {
        OR: [{ targetCompanyScale: { isEmpty: true } }, { targetCompanyScale: { equals: [] } }],
      },
    ];
  }

  const programs = await prisma.sme_programs.findMany({
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

  stats.total = programs.length;
  console.log(`Found ${stats.total} programs to evaluate\n`);

  for (const program of programs) {
    try {
      stats.processed++;

      // First try Tier 1 extraction
      const tier1Result = extractEligibilityFromText(
        program.title,
        program.description,
        program.supportTarget
      );

      // Skip if Tier 1 succeeded
      if (hasExtractedEligibility(tier1Result) && !force) {
        stats.skippedTier1Success++;
        continue;
      }

      // Skip if already has data and not forcing
      if (!force) {
        const hasExistingData =
          (program.targetRegionCodes && program.targetRegionCodes.length > 0) ||
          (program.targetCompanyScale && program.targetCompanyScale.length > 0);

        if (hasExistingData) {
          stats.skippedExistingData++;
          continue;
        }
      }

      // Check if Tier 2 should be used
      if (!shouldUseTier2(tier1Result) && !force) {
        stats.skippedTier1Success++;
        continue;
      }

      console.log(`Processing: ${program.title.substring(0, 50)}...`);

      if (dryRun) {
        console.log('  [DRY RUN] Would call Haiku API\n');
        continue;
      }

      // Call Haiku for extraction
      stats.apiCalls++;
      const tier2Result = await extractEligibilityWithHaiku(
        program.title,
        program.description,
        program.supportTarget
      );

      stats.totalCost += tier2Result.cost;

      // Build update payload
      const updatePayload: any = {};
      let hasUpdates = false;

      // Update regions
      if (tier2Result.regions.length > 0) {
        const regionCodeMap: Record<string, string> = {
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
        const regionNameMap: Record<string, string> = {
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

        updatePayload.targetRegionCodes = tier2Result.regions.map((r) => regionCodeMap[r]);
        updatePayload.targetRegions = tier2Result.regions.map((r) => regionNameMap[r]);
        stats.fieldsExtracted.regions++;
        hasUpdates = true;
      }

      // Update company scale
      if (tier2Result.companyScale.length > 0) {
        updatePayload.targetCompanyScale = tier2Result.companyScale;
        stats.fieldsExtracted.companyScale++;
        hasUpdates = true;
      }

      // Update employees
      if (tier2Result.minEmployees !== null) {
        updatePayload.minEmployeeCount = tier2Result.minEmployees;
        stats.fieldsExtracted.employees++;
        hasUpdates = true;
      }
      if (tier2Result.maxEmployees !== null) {
        updatePayload.maxEmployeeCount = tier2Result.maxEmployees;
        hasUpdates = true;
      }

      // Update revenue (convert 억원 to 원)
      if (tier2Result.minRevenue !== null) {
        updatePayload.minSalesAmount = BigInt(Math.round(tier2Result.minRevenue * 100_000_000));
        stats.fieldsExtracted.revenue++;
        hasUpdates = true;
      }
      if (tier2Result.maxRevenue !== null) {
        updatePayload.maxSalesAmount = BigInt(Math.round(tier2Result.maxRevenue * 100_000_000));
        hasUpdates = true;
      }

      // Update business age
      if (tier2Result.minBusinessAge !== null) {
        updatePayload.minBusinessAge = tier2Result.minBusinessAge;
        stats.fieldsExtracted.businessAge++;
        hasUpdates = true;
      }
      if (tier2Result.maxBusinessAge !== null) {
        updatePayload.maxBusinessAge = tier2Result.maxBusinessAge;
        hasUpdates = true;
      }

      // Apply update
      if (hasUpdates) {
        await prisma.sme_programs.update({
          where: { id: program.id },
          data: updatePayload,
        });
        stats.updated++;
        console.log(
          `  ✅ Updated: regions=${tier2Result.regions.length}, scale=${tier2Result.companyScale.length}`
        );
        console.log(
          `     Cost: $${tier2Result.cost.toFixed(4)} (${tier2Result.tokensUsed.input}+${tier2Result.tokensUsed.output} tokens)\n`
        );
      } else {
        console.log('  ⏭️  No extractable data\n');
      }

      // Rate limiting: 1 request per second to be safe
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      stats.errors++;
      console.error(`Error processing ${program.id}:`, error);
    }
  }

  // Print summary
  console.log('\n=== Tier 2 Enrichment Summary ===\n');
  console.log(`Total programs evaluated: ${stats.total}`);
  console.log(`Processed (API calls): ${stats.apiCalls}`);
  console.log(`Updated: ${stats.updated}`);
  console.log(`Skipped (Tier 1 success): ${stats.skippedTier1Success}`);
  console.log(`Skipped (existing data): ${stats.skippedExistingData}`);
  console.log(`Errors: ${stats.errors}`);
  console.log('\n--- Fields Extracted ---');
  console.log(`Regions: ${stats.fieldsExtracted.regions}`);
  console.log(`Company Scale: ${stats.fieldsExtracted.companyScale}`);
  console.log(`Employees: ${stats.fieldsExtracted.employees}`);
  console.log(`Revenue: ${stats.fieldsExtracted.revenue}`);
  console.log(`Business Age: ${stats.fieldsExtracted.businessAge}`);
  console.log(`\n--- Cost ---`);
  console.log(`Total API cost: $${stats.totalCost.toFixed(4)}`);
  console.log(`Average per program: $${stats.apiCalls > 0 ? (stats.totalCost / stats.apiCalls).toFixed(4) : 0}`);

  if (dryRun) {
    console.log('\n⚠️  DRY RUN - No API calls or database changes were made');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
