/**
 * bizinfo.go.kr Detail Page Batch Scraper
 *
 * Scrapes bizinfo.go.kr detail pages for active SME programs to extract
 * full announcement text, 해시태그, and optionally download 공고문 files.
 *
 * This replaces the unreliable attachment download approach (~20% success)
 * with direct detail page scraping (~94% coverage).
 *
 * Run: npx tsx scripts/scrape-bizinfo-details.ts [options]
 *
 * Options:
 *   --dry-run          Preview without scraping or DB changes
 *   --limit=N          Process N programs (default: 50)
 *   --batch-size=N     Programs per batch (default: 10)
 *   --force            Re-scrape already-scraped programs
 *   --offset=N         Skip first N programs
 *   --with-download    Also download 본문출력파일 (default: HTML only)
 *   --with-llm         Also run Tier 3 LLM extraction on scraped text
 *   --model=haiku|opus LLM model (default: haiku)
 */

import { PrismaClient } from '@prisma/client';
import {
  scrapeBizinfoDetailPage,
  BizinfoDetailResult,
  sleep,
} from '../lib/sme24-api/bizinfo-detail-scraper';
import { extractEligibilityFromDocument } from '../lib/sme24-api/mappers/sme-tier3-document-extractor';
import * as fs from 'fs';

const prisma = new PrismaClient();

// ============================================================================
// Region Maps (consistent with other enrichment scripts)
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
// Stats
// ============================================================================

interface ScrapeStats {
  total: number;
  processed: number;
  scraped: number;
  downloaded: number;
  llmCalled: number;
  dbUpdated: number;
  skipped: number;
  errors: number;
  totalCostUSD: number;
  totalCostKRW: number;
  scrapeErrors: Array<{ programId: string; url: string; error: string }>;
  totalPageTextChars: number;
  totalDocTextChars: number;
  totalTags: number;
  downloadUrlsFound: number;
}

// ============================================================================
// Main
// ============================================================================

let shuttingDown = false;

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const force = args.includes('--force');
  const withDownload = args.includes('--with-download');
  const withLlm = args.includes('--with-llm');
  const limitArg = args.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 50;
  const batchSizeArg = args.find((a) => a.startsWith('--batch-size='));
  const batchSize = batchSizeArg ? parseInt(batchSizeArg.split('=')[1], 10) : 10;
  const modelArg = args.find((a) => a.startsWith('--model='));
  const model = (modelArg?.split('=')[1] as 'haiku' | 'opus') || 'haiku';
  const offsetArg = args.find((a) => a.startsWith('--offset='));
  const offset = offsetArg ? parseInt(offsetArg.split('=')[1], 10) : 0;

  console.log('=== bizinfo.go.kr Detail Page Batch Scraper ===\n');
  console.log(`Mode: ${dryRun ? 'DRY RUN (no DB changes)' : 'LIVE'}`);
  console.log(`Limit: ${limit}, Batch size: ${batchSize}, Offset: ${offset}`);
  console.log(`Force re-scrape: ${force}`);
  console.log(`Download 공고문: ${withDownload}`);
  console.log(`LLM extraction: ${withLlm ? `YES (${model})` : 'NO'}\n`);

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\nReceived SIGINT — finishing current program and shutting down...');
    shuttingDown = true;
  });

  const stats: ScrapeStats = {
    total: 0,
    processed: 0,
    scraped: 0,
    downloaded: 0,
    llmCalled: 0,
    dbUpdated: 0,
    skipped: 0,
    errors: 0,
    totalCostUSD: 0,
    totalCostKRW: 0,
    scrapeErrors: [],
    totalPageTextChars: 0,
    totalDocTextChars: 0,
    totalTags: 0,
    downloadUrlsFound: 0,
  };

  // Query programs with bizinfo.go.kr detailUrl
  const whereConditions: any = {
    status: 'ACTIVE',
    detailUrl: { contains: 'bizinfo.go.kr' },
  };

  if (!force) {
    whereConditions.detailPageScrapedAt = null;
  }

  const programs = await prisma.sme_programs.findMany({
    where: whereConditions,
    select: {
      id: true,
      title: true,
      detailUrl: true,
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
  console.log(`Found ${stats.total} programs to scrape\n`);

  if (stats.total === 0) {
    console.log('No programs to process. Exiting.');
    return;
  }

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
        const detailUrl = program.detailUrl;

        if (!detailUrl) {
          console.log(`  ⏭️  No detailUrl: ${shortTitle}`);
          stats.skipped++;
          continue;
        }

        if (dryRun) {
          console.log(`  [DRY RUN] Would scrape: ${shortTitle}`);
          console.log(`    URL: ${detailUrl}`);
          stats.scraped++;
          continue;
        }

        // Scrape the detail page
        const result = await scrapeBizinfoDetailPage(detailUrl, program.id, {
          downloadDocument: withDownload,
        });

        if (result === null) {
          console.log(`  ❌ Scrape failed: ${shortTitle}`);
          stats.errors++;
          stats.scrapeErrors.push({
            programId: program.id,
            url: detailUrl,
            error: 'scrapeBizinfoDetailPage returned null',
          });
          continue;
        }

        stats.scraped++;
        stats.totalPageTextChars += result.pageText.length;
        stats.totalTags += result.tags.length;
        if (result.downloadUrl) stats.downloadUrlsFound++;
        if (result.documentText) {
          stats.downloaded++;
          stats.totalDocTextChars += result.documentText.length;
        }

        // Save scraped data to DB
        const dbUpdate: any = {
          detailPageText: result.pageText || null,
          detailPageScrapedAt: result.scrapedAt,
          detailPageTags: result.tags,
        };

        if (result.documentText) {
          dbUpdate.detailPageDocumentText = result.documentText;
        }

        await prisma.sme_programs.update({
          where: { id: program.id },
          data: dbUpdate,
        });
        stats.dbUpdated++;

        console.log(
          `  ✅ ${shortTitle}` +
            ` — ${result.pageText.length} chars, ${result.tags.length} tags` +
            (result.downloadUrl ? ', 📎 download URL' : '') +
            (result.documentText ? `, 📄 ${result.documentText.length} doc chars` : '')
        );

        // Optional: LLM extraction on scraped text
        if (withLlm && result.pageText.length > 100) {
          stats.llmCalled++;
          const combinedText = result.documentText
            ? `${result.pageText}\n\n---\n\n${result.documentText}`
            : result.pageText;

          const tier3Result = await extractEligibilityFromDocument(
            combinedText,
            program.title,
            model
          );

          stats.totalCostUSD += tier3Result.cost;
          stats.totalCostKRW += tier3Result.cost * KRW_PER_USD;

          // Build conditional update payload
          const llmUpdate = buildLlmUpdatePayload(program, tier3Result);
          if (Object.keys(llmUpdate).length > 0) {
            llmUpdate.eligibilityConfidence = 'HIGH';
            llmUpdate.eligibilityLastUpdated = new Date();
            await prisma.sme_programs.update({
              where: { id: program.id },
              data: llmUpdate,
            });
            console.log(
              `    🤖 LLM: ${Object.keys(llmUpdate).length - 2} fields updated ($${tier3Result.cost.toFixed(4)})`
            );
          } else {
            console.log(`    🤖 LLM: no new data ($${tier3Result.cost.toFixed(4)})`);
          }

          // Rate limiting for LLM calls
          await sleep(1000);
        }

        // Rate limiting: 1 second between scrape requests
        await sleep(1000);
      } catch (error: any) {
        stats.errors++;
        stats.scrapeErrors.push({
          programId: program.id,
          url: program.detailUrl || 'unknown',
          error: error.message,
        });
        console.error(`  ❌ Error: ${program.id} — ${error.message}`);
      }
    }

    // Batch progress
    console.log(
      `\n  Batch ${batchNum} complete: ${stats.scraped} scraped, ${stats.errors} errors` +
        (withLlm ? `, $${stats.totalCostUSD.toFixed(4)} LLM cost` : '')
    );

    // Pause between batches (5 seconds)
    if (batchStart + batchSize < programs.length && !shuttingDown) {
      console.log('  Waiting 5s before next batch...');
      await sleep(5000);
    }
  }

  // Print summary
  printSummary(stats, dryRun, withDownload, withLlm, model);

  // Save error log
  if (stats.scrapeErrors.length > 0) {
    const errorLogPath = `/tmp/bizinfo-scrape-errors-${Date.now()}.json`;
    fs.writeFileSync(errorLogPath, JSON.stringify(stats.scrapeErrors, null, 2));
    console.log(`\nError log saved to: ${errorLogPath}`);
  }
}

// ============================================================================
// LLM Update Payload Builder
// ============================================================================

function buildLlmUpdatePayload(
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
  tier3Result: any
): Record<string, any> {
  const payload: Record<string, any> = {};

  if ((!program.targetRegionCodes || program.targetRegionCodes.length === 0) && tier3Result.regions?.length > 0) {
    payload.targetRegionCodes = tier3Result.regions.map((r: string) => REGION_CODE_MAP[r]);
    payload.targetRegions = tier3Result.regions.map((r: string) => REGION_NAME_MAP[r]);
  }

  if ((!program.targetCompanyScale || program.targetCompanyScale.length === 0) && tier3Result.companyScale?.length > 0) {
    payload.targetCompanyScale = tier3Result.companyScale;
  }

  if (program.minEmployeeCount === null && tier3Result.minEmployees !== null) {
    payload.minEmployeeCount = tier3Result.minEmployees;
  }
  if (program.maxEmployeeCount === null && tier3Result.maxEmployees !== null) {
    payload.maxEmployeeCount = tier3Result.maxEmployees;
  }

  if (program.minSalesAmount === null && tier3Result.minRevenue !== null) {
    payload.minSalesAmount = BigInt(Math.round(tier3Result.minRevenue * 100_000_000));
  }
  if (program.maxSalesAmount === null && tier3Result.maxRevenue !== null) {
    payload.maxSalesAmount = BigInt(Math.round(tier3Result.maxRevenue * 100_000_000));
  }

  if (program.minBusinessAge === null && tier3Result.minBusinessAge !== null) {
    payload.minBusinessAge = tier3Result.minBusinessAge;
  }
  if (program.maxBusinessAge === null && tier3Result.maxBusinessAge !== null) {
    payload.maxBusinessAge = tier3Result.maxBusinessAge;
  }

  return payload;
}

// ============================================================================
// Summary Printer
// ============================================================================

function printSummary(
  stats: ScrapeStats,
  dryRun: boolean,
  withDownload: boolean,
  withLlm: boolean,
  model: string
) {
  console.log('\n\n=== bizinfo.go.kr Scraping Summary ===\n');
  console.log(`Total programs found: ${stats.total}`);
  console.log(`Processed: ${stats.processed}`);
  console.log(`Successfully scraped: ${stats.scraped}`);
  console.log(`DB records updated: ${stats.dbUpdated}`);
  console.log(`Skipped: ${stats.skipped}`);
  console.log(`Errors: ${stats.errors}`);

  console.log('\n--- Text Quality ---');
  console.log(`Total page text: ${stats.totalPageTextChars.toLocaleString()} chars`);
  console.log(`Avg page text: ${stats.scraped > 0 ? Math.round(stats.totalPageTextChars / stats.scraped).toLocaleString() : 0} chars/program`);
  console.log(`Total tags extracted: ${stats.totalTags}`);
  console.log(`Download URLs found: ${stats.downloadUrlsFound}/${stats.scraped}`);

  if (withDownload) {
    console.log(`\n--- Document Downloads ---`);
    console.log(`Documents downloaded: ${stats.downloaded}`);
    console.log(`Total document text: ${stats.totalDocTextChars.toLocaleString()} chars`);
  }

  if (withLlm) {
    console.log(`\n--- LLM Extraction (${model}) ---`);
    console.log(`LLM calls: ${stats.llmCalled}`);
    console.log(`Total cost (USD): $${stats.totalCostUSD.toFixed(4)}`);
    console.log(`Total cost (KRW): ₩${Math.round(stats.totalCostKRW)}`);
    console.log(`Avg cost per call: $${stats.llmCalled > 0 ? (stats.totalCostUSD / stats.llmCalled).toFixed(4) : '0'}`);
  }

  if (shuttingDown) {
    console.log('\n⚠️ Process was interrupted (SIGINT) — partial results above');
  }
  if (dryRun) {
    console.log('\n⚠️ DRY RUN — No scraping or database changes were made');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
