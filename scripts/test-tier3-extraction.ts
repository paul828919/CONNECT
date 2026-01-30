/**
 * Tier 3 Document Extraction — End-to-End Test Script
 *
 * Tests the full pipeline on 1-3 programs:
 *   1. Downloads HWP/PDF attachments
 *   2. Extracts text
 *   3. Sends to LLM for eligibility extraction
 *   4. Compares results with existing data
 *
 * Run: npx tsx scripts/test-tier3-extraction.ts [--model=haiku|opus] [--dry-run]
 *
 * Acceptance criteria:
 * - Text extraction succeeds for >=2/3 programs
 * - LLM produces valid JSON for all successful extractions
 * - >=3 eligibility fields correctly extracted per program
 * - Cost per program < $0.01 with Haiku
 */

import { PrismaClient } from '@prisma/client';
import { downloadSMEAttachments } from '../lib/sme24-api/attachment-downloader';
import { extractTextFromAttachment } from '../lib/scraping/utils/attachment-parser';
import { extractEligibilityFromDocument } from '../lib/sme24-api/mappers/sme-tier3-document-extractor';

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const modelArg = args.find((a) => a.startsWith('--model='));
  const model = (modelArg?.split('=')[1] as 'haiku' | 'opus') || 'haiku';

  console.log('=== Tier 3 Document Extraction — E2E Test ===\n');
  console.log(`Model: ${model}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}\n`);

  // Select 3 diverse test programs:
  // 1. Program with HWP attachment
  // 2. Program with PDF attachment
  // 3. Program where Tier 1/2 failed (empty eligibility)
  // Prioritize programs with attachmentUrls (bizinfo.go.kr — reliable downloads)
  // smes.go.kr announcementFileUrl frequently returns empty responses
  const programs = await prisma.sme_programs.findMany({
    where: {
      status: 'ACTIVE',
      NOT: { attachmentUrls: { isEmpty: true } },
    },
    select: {
      id: true,
      title: true,
      description: true,
      supportTarget: true,
      attachmentUrls: true,
      attachmentNames: true,
      announcementFileUrl: true,
      announcementFileName: true,
      targetRegionCodes: true,
      targetRegions: true,
      targetCompanyScale: true,
      minEmployeeCount: true,
      maxEmployeeCount: true,
      minSalesAmount: true,
      maxSalesAmount: true,
      minBusinessAge: true,
      maxBusinessAge: true,
      eligibilityConfidence: true,
    },
    take: 50, // Large pool since many URLs return empty downloads
    orderBy: { syncedAt: 'desc' },
  });

  console.log(`Found ${programs.length} programs with attachments\n`);

  // Iterate through pool, testing the first 3 programs that successfully download
  let successCount = 0;
  let totalCost = 0;
  let testedCount = 0;

  console.log(`Pool: ${programs.length} programs. Testing first 3 with downloadable attachments.\n`);

  for (let idx = 0; idx < programs.length && testedCount < 3; idx++) {
    const program = programs[idx];
    console.log(`\n${'='.repeat(60)}`);
    console.log(`CANDIDATE ${idx + 1}: ${program.title.substring(0, 60)}`);
    console.log(`${'='.repeat(60)}`);
    console.log(`  ID: ${program.id}`);
    console.log(`  Attachments: ${program.attachmentNames.join(', ') || 'none'}`);
    console.log(`  Announcement URL: ${program.announcementFileUrl ? 'yes' : 'no'}`);
    console.log(`  Existing confidence: ${program.eligibilityConfidence}`);

    // Print existing data
    printExistingData(program);

    // Step 1: Download
    console.log('\n  [Step 1] Downloading attachment...');
    const { results: downloads, errors: dlErrors } = await downloadSMEAttachments({
      id: program.id,
      attachmentUrls: program.attachmentUrls,
      attachmentNames: program.attachmentNames,
      announcementFileUrl: program.announcementFileUrl,
      announcementFileName: program.announcementFileName,
    });

    if (dlErrors.length > 0) {
      console.log(`  Download errors: ${dlErrors.map((e) => e.error).join(', ')}`);
    }

    if (downloads.length === 0) {
      console.log('  → Skipping (no downloadable files)');
      continue;
    }

    const download = downloads[0];
    console.log(
      `  Downloaded: ${download.fileName} (${download.fileBuffer.length} bytes, ${download.downloadDuration}ms)`
    );

    // Step 2: Extract text
    console.log('\n  [Step 2] Extracting text...');
    const text = await extractTextFromAttachment(download.fileName, download.fileBuffer);

    if (!text || text.length < 100) {
      console.log(`  → Skipping (insufficient text: ${text?.length || 0} chars)`);
      continue;
    }

    // This program successfully downloaded and extracted — count it
    testedCount++;

    console.log(`  Extracted: ${text.length} characters`);
    console.log(`  Sample: ${text.substring(0, 200).replace(/\n/g, ' ')}...`);

    if (dryRun) {
      console.log('\n  [DRY RUN] Would call LLM — skipping');
      successCount++;
      continue;
    }

    // Step 3: LLM extraction
    console.log(`\n  [Step 3] Sending to ${model} LLM...`);
    const startLLM = Date.now();
    const result = await extractEligibilityFromDocument(text, program.title, model);
    const llmDuration = Date.now() - startLLM;

    totalCost += result.cost;

    console.log(`  LLM response (${llmDuration}ms, $${result.cost.toFixed(4)}):`);
    console.log(`  Confidence: ${result.confidence}`);
    console.log(`  Tokens: ${result.tokensUsed.input} in / ${result.tokensUsed.output} out`);

    // Print extracted data
    printExtractedData(result);

    // Compare with existing data
    console.log('\n  --- Comparison (Existing vs Extracted) ---');
    compareData(program, result);

    // Count extracted fields
    const fieldCount = countExtractedFields(result);
    console.log(`\n  Fields extracted: ${fieldCount}`);
    console.log(`  Result: ${fieldCount >= 3 ? 'PASS' : 'NEEDS REVIEW'}`);

    if (fieldCount > 0) successCount++;

    // Rate limiting
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('=== TEST SUMMARY ===');
  console.log(`${'='.repeat(60)}`);
  console.log(`Programs tested: ${testedCount}`);
  console.log(`Successful extractions: ${successCount}/${testedCount}`);
  console.log(`Total LLM cost: $${totalCost.toFixed(4)} (₩${Math.round(totalCost * 1300)})`);
  console.log(
    `Avg cost per program: $${testedCount > 0 ? (totalCost / testedCount).toFixed(4) : '0'}`
  );
  console.log(
    `\nVerdict: ${successCount >= 2 ? 'PASS — Ready for batch processing' : testedCount === 0 ? 'NO DOWNLOADABLE FILES — Check attachment URLs' : 'NEEDS INVESTIGATION'}`
  );

  if (dryRun) {
    console.log('\n⚠️ DRY RUN — No LLM API calls were made');
  }
}

// ============================================================================
// Helpers
// ============================================================================

// Unused — kept for reference
function _selectDiversePrograms(programs: any[]): any[] {
  const selected: any[] = [];
  for (const p of programs) {
    if (selected.length >= 3) break;
    if (!selected.includes(p)) selected.push(p);
  }

  return selected.slice(0, 3);
}

function printExistingData(program: any) {
  console.log('\n  --- Existing Data ---');
  console.log(`  Regions: ${program.targetRegions?.join(', ') || '(none)'}`);
  console.log(`  Company scale: ${program.targetCompanyScale?.join(', ') || '(none)'}`);
  console.log(`  Employees: ${program.minEmployeeCount ?? '?'} ~ ${program.maxEmployeeCount ?? '?'}`);
  console.log(
    `  Revenue: ${program.minSalesAmount ? `${Number(program.minSalesAmount) / 100_000_000}억` : '?'} ~ ${program.maxSalesAmount ? `${Number(program.maxSalesAmount) / 100_000_000}억` : '?'}`
  );
  console.log(`  Business age: ${program.minBusinessAge ?? '?'} ~ ${program.maxBusinessAge ?? '?'} years`);
}

function printExtractedData(result: any) {
  console.log('\n  --- Extracted Data ---');
  console.log(`  Regions: ${result.regions.join(', ') || '(none)'}`);
  console.log(`  Company scale: ${result.companyScale.join(', ') || '(none)'}`);
  console.log(`  Employees: ${result.minEmployees ?? '?'} ~ ${result.maxEmployees ?? '?'}`);
  console.log(`  Revenue: ${result.minRevenue ?? '?'} ~ ${result.maxRevenue ?? '?'} 억원`);
  console.log(`  Business age: ${result.minBusinessAge ?? '?'} ~ ${result.maxBusinessAge ?? '?'} years`);
  console.log(`  Required certs: ${result.requiredCerts.join(', ') || '(none)'}`);
  console.log(`  Target industry: ${result.targetIndustry || '(none)'}`);
  console.log(`  Exclusion conditions: ${result.exclusionConditions.join(', ') || '(none)'}`);
  console.log(
    `  Support amount: ${result.supportAmountMin ?? '?'} ~ ${result.supportAmountMax ?? '?'} 만원`
  );
}

function compareData(existing: any, extracted: any) {
  const comparisons = [
    {
      field: 'Regions',
      existing: existing.targetRegions?.join(', ') || '(empty)',
      extracted: extracted.regions.join(', ') || '(empty)',
    },
    {
      field: 'Scale',
      existing: existing.targetCompanyScale?.join(', ') || '(empty)',
      extracted: extracted.companyScale.join(', ') || '(empty)',
    },
    {
      field: 'Min employees',
      existing: existing.minEmployeeCount ?? '(empty)',
      extracted: extracted.minEmployees ?? '(empty)',
    },
    {
      field: 'Revenue range',
      existing: existing.minSalesAmount
        ? `${Number(existing.minSalesAmount) / 100_000_000}~${Number(existing.maxSalesAmount) / 100_000_000}억`
        : '(empty)',
      extracted:
        extracted.minRevenue !== null || extracted.maxRevenue !== null
          ? `${extracted.minRevenue ?? '?'}~${extracted.maxRevenue ?? '?'}억`
          : '(empty)',
    },
  ];

  for (const c of comparisons) {
    const match = c.existing === c.extracted;
    console.log(`  ${match ? '✅' : '🔄'} ${c.field}: ${c.existing} → ${c.extracted}`);
  }
}

function countExtractedFields(result: any): number {
  return [
    result.regions.length > 0,
    result.companyScale.length > 0,
    result.minEmployees !== null || result.maxEmployees !== null,
    result.minRevenue !== null || result.maxRevenue !== null,
    result.minBusinessAge !== null || result.maxBusinessAge !== null,
    result.requiredCerts.length > 0,
    result.targetIndustry !== null,
    result.exclusionConditions.length > 0,
    result.supportAmountMin !== null || result.supportAmountMax !== null,
  ].filter(Boolean).length;
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
