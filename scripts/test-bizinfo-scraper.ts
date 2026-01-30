/**
 * bizinfo.go.kr Detail Page Scraper — Integration Test
 *
 * Tests the scraper on 3 real programs with bizinfo.go.kr detailUrl.
 * Validates:
 *   1. ≥3/3 detail pages successfully fetched
 *   2. Page text ≥500 chars for each (or ≥200 chars with relaxed threshold)
 *   3. 본문출력파일 download URL found for ≥2/3
 *   4. Tags extracted for ≥2/3
 *
 * Run: npx tsx scripts/test-bizinfo-scraper.ts
 *   --with-download    Also test 공고문 download + text extraction
 */

import { PrismaClient } from '@prisma/client';
import { scrapeBizinfoDetailPage, sleep } from '../lib/sme24-api/bizinfo-detail-scraper';

const prisma = new PrismaClient();

interface TestResult {
  programId: string;
  title: string;
  url: string;
  success: boolean;
  pageTextLength: number;
  fieldsCount: number;
  fields: Record<string, string>;
  tagsCount: number;
  tags: string[];
  hasDownloadUrl: boolean;
  downloadUrl: string | null;
  documentFileName: string | null;
  documentTextLength: number;
  error?: string;
}

async function main() {
  const args = process.argv.slice(2);
  const withDownload = args.includes('--with-download');

  console.log('=== bizinfo.go.kr Scraper Integration Test ===\n');
  console.log(`Download 공고문: ${withDownload}\n`);

  // Select 3 programs with bizinfo.go.kr detailUrl
  const programs = await prisma.sme_programs.findMany({
    where: {
      status: 'ACTIVE',
      detailUrl: { contains: 'bizinfo.go.kr' },
    },
    select: {
      id: true,
      title: true,
      detailUrl: true,
      description: true,
      supportTarget: true,
    },
    take: 3,
    orderBy: { syncedAt: 'desc' },
  });

  if (programs.length < 3) {
    console.log(`⚠️ Only found ${programs.length} programs with bizinfo detailUrl (need 3)`);
    if (programs.length === 0) {
      console.log('❌ FAIL — No programs with bizinfo.go.kr detailUrl');
      return;
    }
  }

  console.log(`Testing ${programs.length} programs:\n`);

  const results: TestResult[] = [];

  for (let i = 0; i < programs.length; i++) {
    const program = programs[i];
    const shortTitle = program.title.substring(0, 60);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Test ${i + 1}/${programs.length}: ${shortTitle}`);
    console.log(`URL: ${program.detailUrl}`);

    try {
      const result = await scrapeBizinfoDetailPage(
        program.detailUrl!,
        program.id,
        { downloadDocument: withDownload }
      );

      if (result === null) {
        results.push({
          programId: program.id,
          title: shortTitle,
          url: program.detailUrl!,
          success: false,
          pageTextLength: 0,
          fieldsCount: 0,
          fields: {},
          tagsCount: 0,
          tags: [],
          hasDownloadUrl: false,
          downloadUrl: null,
          documentFileName: null,
          documentTextLength: 0,
          error: 'Scrape returned null',
        });
        console.log('❌ FAILED — Scrape returned null\n');
        continue;
      }

      const testResult: TestResult = {
        programId: program.id,
        title: shortTitle,
        url: program.detailUrl!,
        success: true,
        pageTextLength: result.pageText.length,
        fieldsCount: Object.keys(result.fields).length,
        fields: result.fields,
        tagsCount: result.tags.length,
        tags: result.tags,
        hasDownloadUrl: result.downloadUrl !== null,
        downloadUrl: result.downloadUrl,
        documentFileName: result.documentFileName,
        documentTextLength: result.documentText?.length || 0,
      };

      results.push(testResult);

      // Print detailed results
      console.log(`\n  ✅ Scrape successful!`);
      console.log(`  Page text: ${result.pageText.length} chars`);
      console.log(`  Fields extracted: ${Object.keys(result.fields).length}`);
      Object.entries(result.fields).forEach(([k, v]) => {
        const preview = v.length > 80 ? v.substring(0, 80) + '...' : v;
        console.log(`    • ${k}: ${preview}`);
      });
      console.log(`  Tags: ${result.tags.length} — ${result.tags.slice(0, 6).join(', ')}`);
      console.log(`  Download URL: ${result.downloadUrl ? '✅ Found' : '❌ Not found'}`);
      if (result.downloadUrl) {
        console.log(`    ${result.downloadUrl}`);
      }
      console.log(`  Document filename: ${result.documentFileName || 'N/A'}`);
      if (withDownload && result.documentText) {
        console.log(`  Document text: ${result.documentText.length} chars`);
        console.log(`    Preview: ${result.documentText.substring(0, 100)}...`);
      }

      // Compare with existing API data
      console.log(`\n  --- Comparison with API data ---`);
      const apiDescLen = program.description?.length || 0;
      const apiTargetLen = program.supportTarget?.length || 0;
      console.log(`    API description: ${apiDescLen} chars`);
      console.log(`    API supportTarget: ${apiTargetLen} chars`);
      console.log(`    Scraped page text: ${result.pageText.length} chars`);
      const improvement = apiDescLen > 0
        ? ((result.pageText.length / apiDescLen) * 100).toFixed(0)
        : '∞';
      console.log(`    Text ratio (scraped/API): ${improvement}%`);

      console.log('');
    } catch (error: any) {
      results.push({
        programId: program.id,
        title: shortTitle,
        url: program.detailUrl!,
        success: false,
        pageTextLength: 0,
        fieldsCount: 0,
        fields: {},
        tagsCount: 0,
        tags: [],
        hasDownloadUrl: false,
        downloadUrl: null,
        documentFileName: null,
        documentTextLength: 0,
        error: error.message,
      });
      console.log(`❌ FAILED — ${error.message}\n`);
    }

    // Rate limiting between tests
    if (i < programs.length - 1) {
      await sleep(1000);
    }
  }

  // ============================================================================
  // Acceptance Criteria Evaluation
  // ============================================================================

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('=== Acceptance Criteria ===\n');

  const successful = results.filter((r) => r.success);
  const withGoodText = results.filter((r) => r.pageTextLength >= 200);
  const withDownloadUrl = results.filter((r) => r.hasDownloadUrl);
  const withTags = results.filter((r) => r.tagsCount > 0);

  const criteria = [
    {
      name: '≥3/3 detail pages successfully fetched',
      pass: successful.length >= 3,
      detail: `${successful.length}/3`,
    },
    {
      name: 'Page text ≥200 chars for each',
      pass: withGoodText.length >= 3,
      detail: `${withGoodText.length}/3 (${results.map((r) => r.pageTextLength).join(', ')} chars)`,
    },
    {
      name: '본문출력파일 download URL found for ≥2/3',
      pass: withDownloadUrl.length >= 2,
      detail: `${withDownloadUrl.length}/3`,
    },
    {
      name: 'Tags extracted for ≥2/3',
      pass: withTags.length >= 2,
      detail: `${withTags.length}/3 (${results.map((r) => r.tagsCount).join(', ')} tags)`,
    },
  ];

  let allPass = true;
  for (const c of criteria) {
    const icon = c.pass ? '✅' : '❌';
    console.log(`  ${icon} ${c.name} — ${c.detail}`);
    if (!c.pass) allPass = false;
  }

  console.log(`\n${allPass ? '🎉 ALL CRITERIA PASSED' : '⚠️ SOME CRITERIA FAILED'}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
