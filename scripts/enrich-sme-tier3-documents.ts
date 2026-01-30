/**
 * SME Tier 3 Document Enrichment — Batch Processing Script
 *
 * Extracts eligibility criteria from SME program text using Claude LLM.
 * Prefers scraped bizinfo.go.kr text (~94% available) over attachment
 * downloads (~20% success rate).
 *
 * Text source priority:
 *   1. detailPageDocumentText (bizinfo 공고문 — highest quality)
 *   2. detailPageText (bizinfo HTML — always available if scraped)
 *   3. Attachment download (fallback — ~20% success)
 *
 * Run: npx tsx scripts/enrich-sme-tier3-documents.ts [options]
 *
 * Options:
 *   --dry-run          Preview without API calls or DB changes
 *   --limit=N          Process N programs (default: 10)
 *   --batch-size=N     Programs per batch (default: 10)
 *   --model=haiku|opus LLM model (default: haiku)
 *   --force            Re-process existing data
 *   --offset=N         Skip first N programs
 */

import { PrismaClient } from '@prisma/client';
import { downloadSMEAttachments, DownloadError } from '../lib/sme24-api/attachment-downloader';
import { extractTextFromAttachment } from '../lib/scraping/utils/attachment-parser';
import { extractEligibilityFromDocument } from '../lib/sme24-api/mappers/sme-tier3-document-extractor';
import * as fs from 'fs';

const prisma = new PrismaClient();

// ============================================================================
// Region Maps (same pattern as enrich-sme-programs-tier2.ts)
// ============================================================================

const REGION_CODE_MAP: Record<string, string> = {
  SEOUL: '1100', GYEONGGI: '4100', INCHEON: '2800', BUSAN: '2600',
  DAEGU: '2700', GWANGJU: '2900', DAEJEON: '3000', ULSAN: '3100',
  SEJONG: '3611', GANGWON: '4200', CHUNGBUK: '4300', CHUNGNAM: '4400',
  JEONBUK: '4500', JEONNAM: '4600', GYEONGBUK: '4700', GYEONGNAM: '4800',
  JEJU: '5000',
};

const REGION_NAME_MAP: Record<string, string> = {
  SEOUL: '서울', GYEONGGI: '경기', INCHEON: '인천', BUSAN: '부산',
  DAEGU: '대구', GWANGJU: '광주', DAEJEON: '대전', ULSAN: '울산',
  SEJONG: '세종', GANGWON: '강원', CHUNGBUK: '충북', CHUNGNAM: '충남',
  JEONBUK: '전북', JEONNAM: '전남', GYEONGBUK: '경북', GYEONGNAM: '경남',
  JEJU: '제주',
};

const KRW_PER_USD = 1300;

// ============================================================================
// Stats Interface
// ============================================================================

interface Tier3Stats {
  total: number;
  processed: number;
  downloaded: number;
  textExtracted: number;
  textFromBizinfoDoc: number;
  textFromBizinfoHtml: number;
  textFromDownload: number;
  llmCalled: number;
  updated: number;
  skipped: number;
  errors: number;
  totalCostUSD: number;
  totalCostKRW: number;
  downloadErrors: DownloadError[];
  fieldsExtracted: {
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

// ============================================================================
// Main
// ============================================================================

let shuttingDown = false;

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const force = args.includes('--force');
  const limitArg = args.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 10;
  const batchSizeArg = args.find((a) => a.startsWith('--batch-size='));
  const batchSize = batchSizeArg ? parseInt(batchSizeArg.split('=')[1], 10) : 10;
  const modelArg = args.find((a) => a.startsWith('--model='));
  const model = (modelArg?.split('=')[1] as 'haiku' | 'opus') || 'haiku';
  const offsetArg = args.find((a) => a.startsWith('--offset='));
  const offset = offsetArg ? parseInt(offsetArg.split('=')[1], 10) : 0;

  console.log('=== SME Tier 3 Document Enrichment ===\n');
  console.log(`Mode: ${dryRun ? 'DRY RUN (no API calls or DB changes)' : 'LIVE'}`);
  console.log(`Model: ${model}`);
  console.log(`Force re-extract: ${force}`);
  console.log(`Limit: ${limit}, Batch size: ${batchSize}, Offset: ${offset}\n`);

  // Graceful shutdown handler
  process.on('SIGINT', () => {
    console.log('\n\nReceived SIGINT — finishing current program and shutting down...');
    shuttingDown = true;
  });

  const stats: Tier3Stats = {
    total: 0,
    processed: 0,
    downloaded: 0,
    textExtracted: 0,
    textFromBizinfoDoc: 0,
    textFromBizinfoHtml: 0,
    textFromDownload: 0,
    llmCalled: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    totalCostUSD: 0,
    totalCostKRW: 0,
    downloadErrors: [],
    fieldsExtracted: {
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

  // Query programs with text sources (scraped or attachments) but missing eligibility
  const whereConditions: any = {
    status: 'ACTIVE',
    OR: [
      { detailPageDocumentText: { not: null } },
      { detailPageText: { not: null } },
      { NOT: { attachmentUrls: { isEmpty: true } } },
      { announcementFileUrl: { not: null } },
    ],
  };

  if (!force) {
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

  const programs = await prisma.sme_programs.findMany({
    where: whereConditions,
    select: {
      id: true,
      title: true,
      detailPageText: true,
      detailPageDocumentText: true,
      attachmentUrls: true,
      attachmentNames: true,
      announcementFileUrl: true,
      announcementFileName: true,
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

  stats.total = programs.length;
  console.log(`Found ${stats.total} programs to process\n`);

  // Process in batches
  for (let batchStart = 0; batchStart < programs.length; batchStart += batchSize) {
    if (shuttingDown) break;

    const batch = programs.slice(batchStart, batchStart + batchSize);
    const batchNum = Math.floor(batchStart / batchSize) + 1;
    const totalBatches = Math.ceil(programs.length / batchSize);
    console.log(`\n--- Batch ${batchNum}/${totalBatches} (${batch.length} programs) ---\n`);

    for (const program of batch) {
      if (shuttingDown) break;

      try {
        stats.processed++;
        const shortTitle = program.title.substring(0, 50);

        // Step 1: Resolve text source (priority: scraped > downloaded)
        let documentText: string | null = null;
        let textSource = '';

        // Priority 1: bizinfo 공고문 full text
        if (program.detailPageDocumentText && program.detailPageDocumentText.length > 100) {
          documentText = program.detailPageDocumentText;
          textSource = 'bizinfo-document';
          stats.textFromBizinfoDoc++;
        }
        // Priority 2: bizinfo HTML text
        else if (program.detailPageText && program.detailPageText.length > 100) {
          documentText = program.detailPageText;
          textSource = 'bizinfo-html';
          stats.textFromBizinfoHtml++;
        }
        // Priority 3: Download attachment (fallback)
        else {
          const { results: downloads, errors: dlErrors } = await downloadSMEAttachments({
            id: program.id,
            attachmentUrls: program.attachmentUrls,
            attachmentNames: program.attachmentNames,
            announcementFileUrl: program.announcementFileUrl,
            announcementFileName: program.announcementFileName,
          });

          stats.downloadErrors.push(...dlErrors);

          if (downloads.length > 0) {
            stats.downloaded++;
            const download = downloads[0];
            documentText = await extractTextFromAttachment(
              download.fileName,
              download.fileBuffer
            );
            if (documentText && documentText.length >= 100) {
              textSource = 'attachment-download';
              stats.textFromDownload++;
            }
          }
        }

        if (!documentText || documentText.length < 100) {
          console.log(`  ⏭️  No usable text: ${shortTitle}`);
          stats.skipped++;
          continue;
        }

        stats.textExtracted++;

        if (dryRun) {
          console.log(
            `  [DRY RUN] ${shortTitle} — ${textSource} (${documentText.length} chars)`
          );
          continue;
        }

        // Step 3: LLM extraction
        stats.llmCalled++;
        const tier3Result = await extractEligibilityFromDocument(
          documentText,
          program.title,
          model
        );

        stats.totalCostUSD += tier3Result.cost;
        stats.totalCostKRW += tier3Result.cost * KRW_PER_USD;

        // Step 4: Build update payload
        const updatePayload: any = {};
        let hasUpdates = false;

        // Regions
        if (
          (!program.targetRegionCodes || program.targetRegionCodes.length === 0) &&
          tier3Result.regions.length > 0
        ) {
          updatePayload.targetRegionCodes = tier3Result.regions.map((r) => REGION_CODE_MAP[r]);
          updatePayload.targetRegions = tier3Result.regions.map((r) => REGION_NAME_MAP[r]);
          stats.fieldsExtracted.regions++;
          hasUpdates = true;
        }

        // Company scale
        if (
          (!program.targetCompanyScale || program.targetCompanyScale.length === 0) &&
          tier3Result.companyScale.length > 0
        ) {
          updatePayload.targetCompanyScale = tier3Result.companyScale;
          stats.fieldsExtracted.companyScale++;
          hasUpdates = true;
        }

        // Employees
        if (program.minEmployeeCount === null && tier3Result.minEmployees !== null) {
          updatePayload.minEmployeeCount = tier3Result.minEmployees;
          stats.fieldsExtracted.employees++;
          hasUpdates = true;
        }
        if (program.maxEmployeeCount === null && tier3Result.maxEmployees !== null) {
          updatePayload.maxEmployeeCount = tier3Result.maxEmployees;
          hasUpdates = true;
        }

        // Revenue
        if (program.minSalesAmount === null && tier3Result.minRevenue !== null) {
          updatePayload.minSalesAmount = BigInt(Math.round(tier3Result.minRevenue * 100_000_000));
          stats.fieldsExtracted.revenue++;
          hasUpdates = true;
        }
        if (program.maxSalesAmount === null && tier3Result.maxRevenue !== null) {
          updatePayload.maxSalesAmount = BigInt(Math.round(tier3Result.maxRevenue * 100_000_000));
          hasUpdates = true;
        }

        // Business age
        if (program.minBusinessAge === null && tier3Result.minBusinessAge !== null) {
          updatePayload.minBusinessAge = tier3Result.minBusinessAge;
          stats.fieldsExtracted.businessAge++;
          hasUpdates = true;
        }
        if (program.maxBusinessAge === null && tier3Result.maxBusinessAge !== null) {
          updatePayload.maxBusinessAge = tier3Result.maxBusinessAge;
          hasUpdates = true;
        }

        // Track Tier 3 additional fields
        if (tier3Result.requiredCerts.length > 0) stats.fieldsExtracted.certs++;
        if (tier3Result.targetIndustry) stats.fieldsExtracted.industry++;
        if (tier3Result.exclusionConditions.length > 0) stats.fieldsExtracted.exclusions++;
        if (tier3Result.supportAmountMin !== null || tier3Result.supportAmountMax !== null)
          stats.fieldsExtracted.supportAmount++;

        // Apply update
        if (hasUpdates) {
          updatePayload.eligibilityConfidence = 'HIGH';
          updatePayload.eligibilityLastUpdated = new Date();

          await prisma.sme_programs.update({
            where: { id: program.id },
            data: updatePayload,
          });
          stats.updated++;
          console.log(
            `  ✅ Updated: ${shortTitle} ` +
              `(regions=${tier3Result.regions.length}, scale=${tier3Result.companyScale.length}, ` +
              `cost=$${tier3Result.cost.toFixed(4)})`
          );
        } else {
          // Mark as processed even without new data
          await prisma.sme_programs.update({
            where: { id: program.id },
            data: {
              eligibilityConfidence: 'HIGH',
              eligibilityLastUpdated: new Date(),
            },
          });
          console.log(`  ⏭️  No new data: ${shortTitle} ($${tier3Result.cost.toFixed(4)})`);
        }

        // Rate limiting: 1s between LLM calls
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error: any) {
        stats.errors++;
        console.error(`  ❌ Error: ${program.id} — ${error.message}`);
      }
    }

    // Batch summary
    console.log(
      `\n  Batch ${batchNum} complete: ` +
        `${stats.updated} updated, ${stats.errors} errors, ` +
        `$${stats.totalCostUSD.toFixed(4)} total cost`
    );

    // 5s delay between batches
    if (batchStart + batchSize < programs.length && !shuttingDown) {
      console.log('  Waiting 5s before next batch...');
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  // Print summary
  printSummary(stats, dryRun, model);

  // Save error log
  if (stats.downloadErrors.length > 0) {
    const errorLogPath = `/tmp/tier3-errors-${Date.now()}.json`;
    fs.writeFileSync(errorLogPath, JSON.stringify(stats.downloadErrors, null, 2));
    console.log(`\nDownload error log saved to: ${errorLogPath}`);
  }
}

function printSummary(stats: Tier3Stats, dryRun: boolean, model: string) {
  console.log('\n\n=== Tier 3 Document Enrichment Summary ===\n');
  console.log(`Model: ${model}`);
  console.log(`Total programs found: ${stats.total}`);
  console.log(`Processed: ${stats.processed}`);
  console.log(`Text extracted: ${stats.textExtracted}`);
  console.log(`  From bizinfo document: ${stats.textFromBizinfoDoc}`);
  console.log(`  From bizinfo HTML: ${stats.textFromBizinfoHtml}`);
  console.log(`  From attachment download: ${stats.textFromDownload}`);
  console.log(`LLM calls: ${stats.llmCalled}`);
  console.log(`Updated: ${stats.updated}`);
  console.log(`Skipped: ${stats.skipped}`);
  console.log(`Errors: ${stats.errors}`);
  console.log(`Download errors: ${stats.downloadErrors.length}`);

  console.log('\n--- Fields Extracted ---');
  console.log(`Regions: ${stats.fieldsExtracted.regions}`);
  console.log(`Company Scale: ${stats.fieldsExtracted.companyScale}`);
  console.log(`Employees: ${stats.fieldsExtracted.employees}`);
  console.log(`Revenue: ${stats.fieldsExtracted.revenue}`);
  console.log(`Business Age: ${stats.fieldsExtracted.businessAge}`);
  console.log(`Required Certs: ${stats.fieldsExtracted.certs}`);
  console.log(`Target Industry: ${stats.fieldsExtracted.industry}`);
  console.log(`Exclusion Conditions: ${stats.fieldsExtracted.exclusions}`);
  console.log(`Support Amount: ${stats.fieldsExtracted.supportAmount}`);

  console.log('\n--- Cost ---');
  console.log(`Total cost (USD): $${stats.totalCostUSD.toFixed(4)}`);
  console.log(`Total cost (KRW): ₩${Math.round(stats.totalCostKRW)}`);
  console.log(
    `Average per program: $${stats.llmCalled > 0 ? (stats.totalCostUSD / stats.llmCalled).toFixed(4) : '0'}`
  );

  if (shuttingDown) {
    console.log('\n⚠️ Process was interrupted (SIGINT) — partial results above');
  }
  if (dryRun) {
    console.log('\n⚠️ DRY RUN — No API calls or database changes were made');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
