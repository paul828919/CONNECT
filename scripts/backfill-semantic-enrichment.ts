/**
 * Backfill Script: Add Semantic Sub-Domain Enrichment to Existing Programs
 *
 * Purpose: Enrich existing funding programs with semantic sub-domain data
 * for improved matching precision across all industries.
 *
 * Strategy:
 * 1. Fetch all programs without semantic enrichment (semanticEnrichedAt IS NULL)
 * 2. For each program, call the LLM-powered semantic enrichment service
 * 3. Update program with extracted semantic data if confidence >= 0.7
 * 4. Track progress and allow resumability via checkpoint file
 *
 * Expected Impact:
 * - Before: Matching uses category-level industry alignment (BIO_HEALTH = all bio)
 * - After: Matching uses semantic sub-domains (animal vs human vs plant in BIO_HEALTH)
 * - False positive rate reduction: ~30% (per plan success criteria)
 *
 * Cost Estimation:
 * - ~500 programs × ~₩27/program = ~₩13,500 total (~$10 USD)
 * - Rate limit: 50 RPM → ~10 minutes for 500 programs
 *
 * Usage:
 *   npx tsx scripts/backfill-semantic-enrichment.ts [options]
 *
 * Options:
 *   --dry-run        Show what would be enriched without making changes
 *   --limit=N        Process only first N programs (for testing)
 *   --category=X     Process only programs of specific category (e.g., BIO_HEALTH)
 *   --resume         Resume from last checkpoint
 *   --force          Re-enrich programs that already have semantic data
 */

import { db } from '@/lib/db';
import { enrichProgramSemantics, isSemanticDataUsable } from '@/lib/ai/services/semantic-enrichment';
import * as fs from 'fs';
import * as path from 'path';

// ═══════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════

const RATE_LIMIT_DELAY_MS = 1200; // 1.2 seconds = 50 requests per minute
const CHECKPOINT_FILE = path.join(__dirname, '../logs/semantic-backfill-checkpoint.json');
const LOG_FILE = path.join(__dirname, '../logs/semantic-backfill-log.json');

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

interface BackfillStats {
  totalPrograms: number;
  programsEnriched: number;
  programsSkipped: number;      // Low confidence or already enriched
  programsFailed: number;
  avgConfidence: number;
  totalCostKRW: number;
  startTime: Date;
  endTime?: Date;
  durationMinutes?: number;
}

interface Checkpoint {
  lastProcessedId: string | null;
  processedIds: string[];
  stats: BackfillStats;
  updatedAt: Date;
}

interface ProgramLog {
  id: string;
  title: string;
  category: string | null;
  result: 'enriched' | 'skipped' | 'failed';
  confidence?: number;
  primaryTargetIndustry?: string;
  semanticSubDomain?: Record<string, string>;
  error?: string;
  timestamp: Date;
}

// ═══════════════════════════════════════════════════════════════
// CLI Arguments
// ═══════════════════════════════════════════════════════════════

function parseArgs(): {
  dryRun: boolean;
  limit: number | null;
  category: string | null;
  resume: boolean;
  force: boolean;
} {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes('--dry-run'),
    limit: args.find(a => a.startsWith('--limit='))
      ? parseInt(args.find(a => a.startsWith('--limit='))!.split('=')[1])
      : null,
    category: args.find(a => a.startsWith('--category='))
      ? args.find(a => a.startsWith('--category='))!.split('=')[1]
      : null,
    resume: args.includes('--resume'),
    force: args.includes('--force'),
  };
}

// ═══════════════════════════════════════════════════════════════
// Checkpoint Management
// ═══════════════════════════════════════════════════════════════

function loadCheckpoint(): Checkpoint | null {
  try {
    if (fs.existsSync(CHECKPOINT_FILE)) {
      const data = fs.readFileSync(CHECKPOINT_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('[CHECKPOINT] Failed to load checkpoint:', error);
  }
  return null;
}

function saveCheckpoint(checkpoint: Checkpoint): void {
  try {
    // Ensure logs directory exists
    const logsDir = path.dirname(CHECKPOINT_FILE);
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(checkpoint, null, 2));
  } catch (error) {
    console.error('[CHECKPOINT] Failed to save checkpoint:', error);
  }
}

function clearCheckpoint(): void {
  try {
    if (fs.existsSync(CHECKPOINT_FILE)) {
      fs.unlinkSync(CHECKPOINT_FILE);
    }
  } catch (error) {
    console.error('[CHECKPOINT] Failed to clear checkpoint:', error);
  }
}

// ═══════════════════════════════════════════════════════════════
// Logging
// ═══════════════════════════════════════════════════════════════

function appendLog(log: ProgramLog): void {
  try {
    const logsDir = path.dirname(LOG_FILE);
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    let logs: ProgramLog[] = [];
    if (fs.existsSync(LOG_FILE)) {
      logs = JSON.parse(fs.readFileSync(LOG_FILE, 'utf-8'));
    }
    logs.push(log);
    fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));
  } catch (error) {
    console.error('[LOG] Failed to append log:', error);
  }
}

// ═══════════════════════════════════════════════════════════════
// Main Backfill Logic
// ═══════════════════════════════════════════════════════════════

async function runBackfill(): Promise<void> {
  const args = parseArgs();
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('     SEMANTIC ENRICHMENT BACKFILL SCRIPT');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Mode: ${args.dryRun ? 'DRY RUN (no changes)' : 'LIVE'}`);
  console.log(`  Limit: ${args.limit ?? 'None (all programs)'}`);
  console.log(`  Category: ${args.category ?? 'All categories'}`);
  console.log(`  Resume: ${args.resume ? 'Yes' : 'No'}`);
  console.log(`  Force: ${args.force ? 'Yes (re-enrich all)' : 'No (skip enriched)'}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Initialize or load checkpoint
  let checkpoint: Checkpoint | null = args.resume ? loadCheckpoint() : null;
  const processedIds = new Set<string>(checkpoint?.processedIds ?? []);

  // Initialize stats
  const stats: BackfillStats = checkpoint?.stats ?? {
    totalPrograms: 0,
    programsEnriched: 0,
    programsSkipped: 0,
    programsFailed: 0,
    avgConfidence: 0,
    totalCostKRW: 0,
    startTime: new Date(),
  };

  // Fetch programs to process
  console.log('[1/4] Fetching programs to enrich...');

  const whereClause: any = {};

  // Filter by category if specified
  if (args.category) {
    whereClause.category = args.category;
  }

  // Filter by semantic enrichment status
  if (!args.force) {
    whereClause.semanticEnrichedAt = null;
  }

  const programs = await db.funding_programs.findMany({
    where: whereClause,
    select: {
      id: true,
      title: true,
      description: true,
      ministry: true,
      announcingAgency: true,
      category: true,
      keywords: true,
      semanticEnrichedAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: args.limit ?? undefined,
  });

  stats.totalPrograms = programs.length;
  console.log(`  Found ${programs.length} programs to process\n`);

  if (programs.length === 0) {
    console.log('✅ No programs need enrichment. Exiting.');
    return;
  }

  // Filter out already processed (if resuming)
  const programsToProcess = programs.filter(p => !processedIds.has(p.id));
  console.log(`  Programs remaining (after checkpoint): ${programsToProcess.length}\n`);

  if (args.dryRun) {
    console.log('[DRY RUN] Would process the following programs:\n');
    programsToProcess.slice(0, 10).forEach((p, i) => {
      console.log(`  ${i + 1}. [${p.category || 'UNKNOWN'}] ${p.title.substring(0, 60)}...`);
    });
    if (programsToProcess.length > 10) {
      console.log(`  ... and ${programsToProcess.length - 10} more\n`);
    }
    console.log('\n[DRY RUN] No changes made. Remove --dry-run to execute.');
    return;
  }

  // Process programs
  console.log('[2/4] Processing programs...\n');
  let confidenceSum = 0;
  let confidenceCount = 0;

  for (let i = 0; i < programsToProcess.length; i++) {
    const program = programsToProcess[i];
    const progress = `[${i + 1}/${programsToProcess.length}]`;

    try {
      console.log(`${progress} Processing: ${program.title.substring(0, 50)}...`);

      // Call semantic enrichment
      const result = await enrichProgramSemantics({
        title: program.title,
        description: program.description,
        ministry: program.ministry,
        announcingAgency: program.announcingAgency,
        category: program.category,
        keywords: program.keywords,
      });

      // Track cost (~₩27/program)
      stats.totalCostKRW += 27;

      // Track confidence for average
      confidenceSum += result.confidence;
      confidenceCount++;

      if (isSemanticDataUsable(result)) {
        // Update program with semantic data
        await db.funding_programs.update({
          where: { id: program.id },
          data: {
            primaryTargetIndustry: result.primaryTargetIndustry || null,
            secondaryTargetIndustries: result.secondaryTargetIndustries,
            semanticSubDomain: result.semanticSubDomain as any,
            technologyDomainsSpecific: result.technologyDomainsSpecific,
            targetCompanyProfile: result.targetCompanyProfile || null,
            programIntent: result.programIntent,
            semanticConfidence: result.confidence,
            semanticEnrichedAt: new Date(),
            semanticEnrichmentModel: 'claude-sonnet-4-5-20250929',
          },
        });

        stats.programsEnriched++;
        console.log(`  ✅ Enriched (confidence: ${result.confidence.toFixed(2)}, target: ${result.primaryTargetIndustry || 'N/A'})`);

        // Log success
        appendLog({
          id: program.id,
          title: program.title,
          category: program.category,
          result: 'enriched',
          confidence: result.confidence,
          primaryTargetIndustry: result.primaryTargetIndustry,
          semanticSubDomain: result.semanticSubDomain as Record<string, string>,
          timestamp: new Date(),
        });
      } else {
        stats.programsSkipped++;
        console.log(`  ⚠️  Skipped (low confidence: ${result.confidence.toFixed(2)})`);

        // Log skip
        appendLog({
          id: program.id,
          title: program.title,
          category: program.category,
          result: 'skipped',
          confidence: result.confidence,
          timestamp: new Date(),
        });
      }

      // Update checkpoint
      processedIds.add(program.id);
      saveCheckpoint({
        lastProcessedId: program.id,
        processedIds: Array.from(processedIds),
        stats,
        updatedAt: new Date(),
      });

    } catch (error) {
      stats.programsFailed++;
      console.error(`  ❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);

      // Log failure
      appendLog({
        id: program.id,
        title: program.title,
        category: program.category,
        result: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      });
    }

    // Rate limit delay (except for last item)
    if (i < programsToProcess.length - 1) {
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY_MS));
    }
  }

  // Calculate final stats
  stats.endTime = new Date();
  stats.durationMinutes = (stats.endTime.getTime() - stats.startTime.getTime()) / 1000 / 60;
  stats.avgConfidence = confidenceCount > 0 ? confidenceSum / confidenceCount : 0;

  // Print summary
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('     BACKFILL COMPLETE');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Total Programs:      ${stats.totalPrograms}`);
  console.log(`  Successfully Enriched: ${stats.programsEnriched}`);
  console.log(`  Skipped (low conf):    ${stats.programsSkipped}`);
  console.log(`  Failed:                ${stats.programsFailed}`);
  console.log(`  Average Confidence:    ${stats.avgConfidence.toFixed(3)}`);
  console.log(`  Estimated Cost:        ₩${stats.totalCostKRW.toLocaleString()}`);
  console.log(`  Duration:              ${stats.durationMinutes?.toFixed(1)} minutes`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Clear checkpoint on successful completion
  if (stats.programsFailed === 0) {
    clearCheckpoint();
    console.log('✅ Checkpoint cleared. Backfill completed successfully!');
  } else {
    console.log('⚠️  Some programs failed. Re-run with --resume to retry.');
  }
}

// ═══════════════════════════════════════════════════════════════
// Entry Point
// ═══════════════════════════════════════════════════════════════

runBackfill()
  .then(() => {
    console.log('\nBackfill script finished.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nBackfill script failed:', error);
    process.exit(1);
  });
