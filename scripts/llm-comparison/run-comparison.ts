/**
 * LLM Comparison Runner — Haiku vs Opus Quality Evaluation
 *
 * Runs both Haiku 4.5 and Opus 4.5 on the same set of programs,
 * collecting extraction results, costs, latency, and JSON validity.
 *
 * Run: npx tsx scripts/llm-comparison/run-comparison.ts [options]
 *
 * Options:
 *   --limit=N       Process N programs (default: 50)
 *   --haiku-only    Only run Haiku
 *   --opus-only     Only run Opus
 *   --output=FILE   Output file (default: /tmp/llm-comparison-results.json)
 *
 * Estimated cost: ~$5.50 total (Haiku: $0.25 + Opus: $5.25)
 */

import { PrismaClient } from '@prisma/client';
import { downloadSMEAttachments } from '../../lib/sme24-api/attachment-downloader';
import { extractTextFromAttachment } from '../../lib/scraping/utils/attachment-parser';
import { extractEligibilityFromDocument } from '../../lib/sme24-api/mappers/sme-tier3-document-extractor';
import { ModelResult } from './types';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const limitArg = args.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 50;
  const haikuOnly = args.includes('--haiku-only');
  const opusOnly = args.includes('--opus-only');
  const outputArg = args.find((a) => a.startsWith('--output='));
  const outputPath = outputArg?.split('=')[1] || '/tmp/llm-comparison-results.json';

  const modelsToRun: Array<'haiku' | 'opus'> = [];
  if (!opusOnly) modelsToRun.push('haiku');
  if (!haikuOnly) modelsToRun.push('opus');

  console.log('=== LLM Comparison: Haiku vs Opus ===\n');
  console.log(`Models: ${modelsToRun.join(', ')}`);
  console.log(`Programs to process: ${limit}`);
  console.log(`Output: ${outputPath}\n`);

  // Get programs with downloadable attachments
  const programs = await prisma.sme_programs.findMany({
    where: {
      status: 'ACTIVE',
      OR: [
        { NOT: { attachmentUrls: { isEmpty: true } } },
        { announcementFileUrl: { not: null } },
      ],
    },
    select: {
      id: true,
      title: true,
      attachmentUrls: true,
      attachmentNames: true,
      announcementFileUrl: true,
    },
    take: limit * 2, // Get extra in case some fail to download
    orderBy: { syncedAt: 'desc' },
  });

  console.log(`Found ${programs.length} candidate programs\n`);

  const allResults: ModelResult[] = [];
  const documentTexts: Record<string, string> = {};
  let programsProcessed = 0;
  let totalCost = { haiku: 0, opus: 0 };

  for (const program of programs) {
    if (programsProcessed >= limit) break;

    const shortTitle = program.title.substring(0, 50);
    console.log(`\n[${programsProcessed + 1}/${limit}] ${shortTitle}`);

    // Step 1: Download and extract text (shared between models)
    let documentText: string;

    if (documentTexts[program.id]) {
      documentText = documentTexts[program.id];
    } else {
      const { results: downloads } = await downloadSMEAttachments({
        id: program.id,
        attachmentUrls: program.attachmentUrls,
        attachmentNames: program.attachmentNames,
        announcementFileUrl: program.announcementFileUrl,
      });

      if (downloads.length === 0) {
        console.log('  ⏭️  No downloadable attachment, skipping');
        continue;
      }

      const text = await extractTextFromAttachment(
        downloads[0].fileName,
        downloads[0].fileBuffer
      );

      if (!text || text.length < 100) {
        console.log('  ⏭️  Insufficient text extracted, skipping');
        continue;
      }

      documentText = text;
      documentTexts[program.id] = text;
    }

    programsProcessed++;

    // Step 2: Run each model
    for (const model of modelsToRun) {
      try {
        const startTime = Date.now();
        const result = await extractEligibilityFromDocument(documentText, program.title, model);
        const latencyMs = Date.now() - startTime;

        const modelResult: ModelResult = {
          model,
          modelId: result.model,
          programId: program.id,
          extracted: {
            regions: result.regions.map((r) => {
              const nameMap: Record<string, string> = {
                SEOUL: '서울', GYEONGGI: '경기', INCHEON: '인천', BUSAN: '부산',
                DAEGU: '대구', GWANGJU: '광주', DAEJEON: '대전', ULSAN: '울산',
                SEJONG: '세종', GANGWON: '강원', CHUNGBUK: '충북', CHUNGNAM: '충남',
                JEONBUK: '전북', JEONNAM: '전남', GYEONGBUK: '경북', GYEONGNAM: '경남',
                JEJU: '제주',
              };
              return nameMap[r] || r;
            }),
            companyScale: result.companyScale,
            minEmployees: result.minEmployees,
            maxEmployees: result.maxEmployees,
            minRevenue: result.minRevenue,
            maxRevenue: result.maxRevenue,
            minBusinessAge: result.minBusinessAge,
            maxBusinessAge: result.maxBusinessAge,
            requiredCerts: result.requiredCerts,
            targetIndustry: result.targetIndustry,
            exclusionConditions: result.exclusionConditions,
            supportAmountMin: result.supportAmountMin,
            supportAmountMax: result.supportAmountMax,
          },
          tokensUsed: result.tokensUsed,
          costUSD: result.cost,
          latencyMs,
          jsonValid: result.confidence !== 'LOW' || result.cost > 0,
        };

        allResults.push(modelResult);
        totalCost[model] += result.cost;

        console.log(
          `  ${model}: $${result.cost.toFixed(4)}, ${latencyMs}ms, ` +
            `confidence=${result.confidence}, ` +
            `fields=${countFields(result)}`
        );

        // Rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error: any) {
        allResults.push({
          model,
          modelId: model === 'haiku' ? 'claude-haiku-4-5-20251001' : 'claude-opus-4-5-20251101',
          programId: program.id,
          extracted: emptyEligibility(),
          tokensUsed: { input: 0, output: 0 },
          costUSD: 0,
          latencyMs: 0,
          jsonValid: false,
          error: error.message,
        });
        console.log(`  ${model}: ERROR — ${error.message}`);
      }
    }

    // Progress update every 10 programs
    if (programsProcessed % 10 === 0) {
      console.log(
        `\n--- Progress: ${programsProcessed}/${limit} programs, ` +
          `Haiku: $${totalCost.haiku.toFixed(4)}, Opus: $${totalCost.opus.toFixed(4)} ---\n`
      );
    }
  }

  // Save results
  const output = {
    timestamp: new Date().toISOString(),
    programsProcessed,
    modelsRun: modelsToRun,
    totalCost,
    results: allResults,
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`\nResults saved to: ${outputPath}`);

  // Quick summary
  console.log('\n=== Quick Summary ===');
  for (const model of modelsToRun) {
    const modelResults = allResults.filter((r) => r.model === model);
    const validResults = modelResults.filter((r) => r.jsonValid);
    const avgLatency =
      validResults.length > 0
        ? validResults.reduce((s, r) => s + r.latencyMs, 0) / validResults.length
        : 0;

    console.log(`\n${model.toUpperCase()}:`);
    console.log(`  Total cost: $${totalCost[model].toFixed(4)} (₩${Math.round(totalCost[model] * 1300)})`);
    console.log(`  JSON validity: ${validResults.length}/${modelResults.length}`);
    console.log(`  Avg latency: ${Math.round(avgLatency)}ms`);
    console.log(
      `  Avg cost/program: $${modelResults.length > 0 ? (totalCost[model] / modelResults.length).toFixed(4) : '0'}`
    );
  }

  console.log(`\nRun generate-report.ts to produce a detailed comparison report.`);
}

function countFields(result: any): number {
  return [
    result.regions?.length > 0,
    result.companyScale?.length > 0,
    result.minEmployees !== null || result.maxEmployees !== null,
    result.minRevenue !== null || result.maxRevenue !== null,
    result.minBusinessAge !== null || result.maxBusinessAge !== null,
    result.requiredCerts?.length > 0,
    result.targetIndustry !== null,
    result.exclusionConditions?.length > 0,
    result.supportAmountMin !== null || result.supportAmountMax !== null,
  ].filter(Boolean).length;
}

function emptyEligibility() {
  return {
    regions: [],
    companyScale: [],
    minEmployees: null,
    maxEmployees: null,
    minRevenue: null,
    maxRevenue: null,
    minBusinessAge: null,
    maxBusinessAge: null,
    requiredCerts: [],
    targetIndustry: null,
    exclusionConditions: [],
    supportAmountMin: null,
    supportAmountMax: null,
  };
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
