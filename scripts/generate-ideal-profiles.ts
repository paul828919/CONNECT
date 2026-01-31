/**
 * Batch Ideal Profile Generation Script
 * Phase 3.3: Ideal Profile Construction & Proximity Matching
 *
 * Processes all active programs in batches, generating ideal applicant
 * profiles using the hybrid rule+LLM generator.
 *
 * Features:
 * - Resume capability (skips already-generated programs)
 * - Batch processing with rate limiting
 * - Cost tracking and reporting
 * - Rule-only mode (--no-llm) for zero-cost generation
 * - Dry-run mode (--dry-run) for testing
 * - Program type filter (--type=rd|sme|all)
 *
 * Usage:
 *   npx tsx scripts/generate-ideal-profiles.ts                    # All programs, with LLM
 *   npx tsx scripts/generate-ideal-profiles.ts --no-llm           # Rule-only, ₩0 cost
 *   npx tsx scripts/generate-ideal-profiles.ts --type=rd          # R&D programs only
 *   npx tsx scripts/generate-ideal-profiles.ts --type=sme         # SME programs only
 *   npx tsx scripts/generate-ideal-profiles.ts --dry-run          # Preview, no DB writes
 *   npx tsx scripts/generate-ideal-profiles.ts --batch-size=10    # Custom batch size
 *   npx tsx scripts/generate-ideal-profiles.ts --limit=50         # Process only 50 programs
 */

import { PrismaClient, Prisma, ProgramStatus, SMEProgramStatus } from '@prisma/client';
import {
  generateIdealProfileForRD,
  generateIdealProfileForSME,
  generateRuleOnlyProfile,
} from '../lib/matching/ideal-profile-generator';

const prisma = new PrismaClient();

// ═══════════════════════════════════════════════════════════════
// CLI Argument Parsing
// ═══════════════════════════════════════════════════════════════

interface CliOptions {
  useLLM: boolean;
  type: 'rd' | 'sme' | 'all';
  dryRun: boolean;
  batchSize: number;
  limit: number | null;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  return {
    useLLM: !args.includes('--no-llm'),
    type: (args.find(a => a.startsWith('--type='))?.split('=')[1] as 'rd' | 'sme' | 'all') || 'all',
    dryRun: args.includes('--dry-run'),
    batchSize: parseInt(args.find(a => a.startsWith('--batch-size='))?.split('=')[1] || '20', 10),
    limit: (() => {
      const limitArg = args.find(a => a.startsWith('--limit='))?.split('=')[1];
      return limitArg ? parseInt(limitArg, 10) : null;
    })(),
  };
}

// ═══════════════════════════════════════════════════════════════
// Batch Processing
// ═══════════════════════════════════════════════════════════════

interface BatchStats {
  totalProcessed: number;
  totalSkipped: number;
  totalErrors: number;
  totalLLMCostKRW: number;
  llmCallCount: number;
  ruleOnlyCount: number;
  avgConfidence: number;
  startTime: number;
}

async function processRDPrograms(options: CliOptions, stats: BatchStats): Promise<void> {
  console.log('\n📡 Processing R&D Programs (funding_programs)');
  console.log('─'.repeat(60));

  // Find programs that need profiles
  const where = {
    status: ProgramStatus.ACTIVE,
    ...(options.limit ? {} : {}), // prisma doesn't support conditional where
    idealApplicantProfile: { equals: Prisma.DbNull }, // Only process programs without profiles (resume)
  };

  const totalCount = await prisma.funding_programs.count({ where });
  const processLimit = options.limit ? Math.min(options.limit, totalCount) : totalCount;

  console.log(`  Total active R&D programs: ${totalCount}`);
  console.log(`  Programs needing profiles: ${totalCount}`);
  console.log(`  Will process: ${processLimit}`);

  let processed = 0;

  while (processed < processLimit) {
    const batchSize = Math.min(options.batchSize, processLimit - processed);

    // Re-query from start each time — processed records no longer match DbNull filter
    const programs = await prisma.funding_programs.findMany({
      where,
      take: batchSize,
      orderBy: { scrapedAt: 'desc' },
    });

    if (programs.length === 0) break;

    for (const program of programs) {
      try {
        const result = options.useLLM
          ? await generateIdealProfileForRD(program, true)
          : await generateRuleOnlyProfile(program, 'RD');

        if (!options.dryRun) {
          await prisma.funding_programs.update({
            where: { id: program.id },
            data: {
              idealApplicantProfile: result.profile as object,
              idealProfileGeneratedAt: new Date(),
              idealProfileVersion: result.profile.version,
            },
          });
        }

        stats.totalProcessed++;
        stats.totalLLMCostKRW += result.llmCostKRW;
        if (result.usedLLM) stats.llmCallCount++;
        else stats.ruleOnlyCount++;
        stats.avgConfidence += result.profile.confidence;

        processed++;

        // Progress logging every 10 programs
        if (processed % 10 === 0 || processed === processLimit) {
          const elapsed = (Date.now() - stats.startTime) / 1000;
          const rate = processed / elapsed;
          const eta = (processLimit - processed) / rate;
          console.log(
            `  [RD] ${processed}/${processLimit} processed | ` +
            `Cost: ₩${stats.totalLLMCostKRW.toFixed(1)} | ` +
            `Rate: ${rate.toFixed(1)}/s | ` +
            `ETA: ${eta.toFixed(0)}s`
          );
        }
      } catch (error) {
        stats.totalErrors++;
        console.error(`  ❌ Error processing RD ${program.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Rate limiting between batches (avoid API throttling)
    if (options.useLLM && processed < processLimit) {
      await sleep(1000);
    }
  }
}

async function processSMEPrograms(options: CliOptions, stats: BatchStats): Promise<void> {
  console.log('\n📡 Processing SME Programs (sme_programs)');
  console.log('─'.repeat(60));

  const where = {
    status: SMEProgramStatus.ACTIVE,
    idealApplicantProfile: { equals: Prisma.DbNull }, // Resume: skip already-generated
  };

  const totalCount = await prisma.sme_programs.count({ where });
  const processLimit = options.limit
    ? Math.min(options.limit - stats.totalProcessed, totalCount)
    : totalCount;

  if (processLimit <= 0) {
    console.log('  Skipped (limit reached from R&D processing)');
    return;
  }

  console.log(`  Total active SME programs: ${totalCount}`);
  console.log(`  Programs needing profiles: ${totalCount}`);
  console.log(`  Will process: ${processLimit}`);

  let processed = 0;

  while (processed < processLimit) {
    const batchSize = Math.min(options.batchSize, processLimit - processed);

    // Re-query from start each time — processed records no longer match DbNull filter
    const programs = await prisma.sme_programs.findMany({
      where,
      take: batchSize,
      orderBy: { updatedAt: 'desc' },
    });

    if (programs.length === 0) break;

    for (const program of programs) {
      try {
        const result = options.useLLM
          ? await generateIdealProfileForSME(program, true)
          : await generateRuleOnlyProfile(program, 'SME');

        if (!options.dryRun) {
          await prisma.sme_programs.update({
            where: { id: program.id },
            data: {
              idealApplicantProfile: result.profile as object,
              idealProfileGeneratedAt: new Date(),
              idealProfileVersion: result.profile.version,
            },
          });
        }

        stats.totalProcessed++;
        stats.totalLLMCostKRW += result.llmCostKRW;
        if (result.usedLLM) stats.llmCallCount++;
        else stats.ruleOnlyCount++;
        stats.avgConfidence += result.profile.confidence;

        processed++;

        if (processed % 10 === 0 || processed === processLimit) {
          const elapsed = (Date.now() - stats.startTime) / 1000;
          const rate = stats.totalProcessed / elapsed;
          console.log(
            `  [SME] ${processed}/${processLimit} processed | ` +
            `Cost: ₩${stats.totalLLMCostKRW.toFixed(1)} | ` +
            `Rate: ${rate.toFixed(1)}/s`
          );
        }
      } catch (error) {
        stats.totalErrors++;
        console.error(`  ❌ Error processing SME ${program.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    if (options.useLLM && processed < processLimit) {
      await sleep(1000);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ═══════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════

async function main() {
  const options = parseArgs();

  console.log('🏭 Batch Ideal Profile Generation');
  console.log('═'.repeat(60));
  console.log(`  Mode:       ${options.useLLM ? 'Hybrid (Rule + Haiku LLM)' : 'Rule-only (₩0)'}`);
  console.log(`  Type:       ${options.type}`);
  console.log(`  Batch size: ${options.batchSize}`);
  console.log(`  Limit:      ${options.limit || 'none'}`);
  console.log(`  Dry run:    ${options.dryRun}`);

  if (options.dryRun) {
    console.log('\n  ⚠️  DRY RUN — no database writes will be made\n');
  }

  const stats: BatchStats = {
    totalProcessed: 0,
    totalSkipped: 0,
    totalErrors: 0,
    totalLLMCostKRW: 0,
    llmCallCount: 0,
    ruleOnlyCount: 0,
    avgConfidence: 0,
    startTime: Date.now(),
  };

  try {
    if (options.type === 'rd' || options.type === 'all') {
      await processRDPrograms(options, stats);
    }

    if (options.type === 'sme' || options.type === 'all') {
      await processSMEPrograms(options, stats);
    }

    // Final report
    const elapsed = (Date.now() - stats.startTime) / 1000;
    const avgConf = stats.totalProcessed > 0 ? stats.avgConfidence / stats.totalProcessed : 0;

    console.log('\n\n📊 GENERATION SUMMARY');
    console.log('═'.repeat(60));
    console.log(`  Total processed:     ${stats.totalProcessed}`);
    console.log(`  Errors:              ${stats.totalErrors}`);
    console.log(`  LLM calls:           ${stats.llmCallCount}`);
    console.log(`  Rule-only:           ${stats.ruleOnlyCount}`);
    console.log(`  Total LLM cost:      ₩${stats.totalLLMCostKRW.toFixed(1)} (~$${(stats.totalLLMCostKRW / 1350).toFixed(2)})`);
    console.log(`  Avg cost/program:    ₩${stats.totalProcessed > 0 ? (stats.totalLLMCostKRW / stats.totalProcessed).toFixed(2) : '0'}`);
    console.log(`  Avg confidence:      ${(avgConf * 100).toFixed(1)}%`);
    console.log(`  Total time:          ${elapsed.toFixed(1)}s`);
    console.log(`  Processing rate:     ${(stats.totalProcessed / elapsed).toFixed(1)} programs/sec`);

    if (options.dryRun) {
      console.log('\n  ⚠️  DRY RUN complete — no changes written to database');
    }

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
