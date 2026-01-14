/**
 * Rehash Funding Programs
 *
 * Updates contentHash for all funding_programs using the new V2 algorithm.
 * This script should be run AFTER cleanup-duplicate-programs.ts and BEFORE
 * deploying the new scraper.
 *
 * USAGE:
 *   npx ts-node scripts/rehash-funding-programs.ts --dry-run    # Preview changes
 *   npx ts-node scripts/rehash-funding-programs.ts              # Execute rehash
 *
 * V2 Hash Algorithm:
 *   - Old: SHA-256(agencyId|title|announcementUrl)
 *   - New: SHA-256(agencyId|normalizedTitle|deadline|ministry)
 *
 * The new algorithm uses content-based hashing instead of URL-based,
 * preventing duplicates caused by NTIS generating different URLs for
 * the same announcement.
 */

import { PrismaClient } from "@prisma/client";
import * as crypto from "crypto";

// Inline the hash functions to avoid ES module import issues
function generateContentHash(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

function normalizeKoreanTitle(title: string): string {
  return title
    .replace(/^\d{4}년도?\s*/g, '')
    .replace(/\([^)]*\)\s*$/g, '')
    .replace(/_?\(?20\d{2}\)?.*$/g, '')
    .replace(/\s*(공고|모집|시행계획|대상과제|신규과제|신규지원)\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function generateProgramHash(data: {
  agencyId: string;
  title: string;
  deadline?: Date | string | null;
  ministry?: string | null;
}): string {
  const normalizedTitle = normalizeKoreanTitle(data.title);
  let deadlineStr = 'no-deadline';
  if (data.deadline) {
    const d = data.deadline instanceof Date ? data.deadline : new Date(data.deadline);
    if (!isNaN(d.getTime())) {
      deadlineStr = d.toISOString().split('T')[0];
    }
  }
  const ministryStr = (data.ministry || 'unknown').toLowerCase().trim();
  const hashInput = `${data.agencyId}|${normalizedTitle}|${deadlineStr}|${ministryStr}`;
  return generateContentHash(hashInput);
}

const prisma = new PrismaClient();

interface RehashStats {
  total: number;
  updated: number;
  unchanged: number;
  errors: number;
}

async function rehashFundingPrograms(dryRun: boolean): Promise<void> {
  console.log("═".repeat(80));
  console.log(`🔄 Rehash Funding Programs ${dryRun ? "(DRY RUN)" : "(PRODUCTION)"}`);
  console.log("═".repeat(80));
  console.log();

  const stats: RehashStats = {
    total: 0,
    updated: 0,
    unchanged: 0,
    errors: 0,
  };

  // Fetch all programs
  console.log("📊 Fetching all funding programs...");
  const programs = await prisma.funding_programs.findMany({
    select: {
      id: true,
      agencyId: true,
      title: true,
      contentHash: true,
      deadline: true,
      ministry: true,
    },
  });

  stats.total = programs.length;
  console.log(`   Found ${stats.total} programs\n`);

  // Process in batches for better progress tracking
  const batchSize = 100;
  const batches = Math.ceil(programs.length / batchSize);

  for (let i = 0; i < batches; i++) {
    const batchStart = i * batchSize;
    const batchEnd = Math.min((i + 1) * batchSize, programs.length);
    const batch = programs.slice(batchStart, batchEnd);

    console.log(`📦 Processing batch ${i + 1}/${batches} (${batchStart + 1}-${batchEnd})...`);

    for (const program of batch) {
      try {
        // Generate new V2 hash
        const newHash = generateProgramHash({
          agencyId: program.agencyId,
          title: program.title,
          deadline: program.deadline,
          ministry: program.ministry,
        });

        // Check if hash changed
        if (newHash === program.contentHash) {
          stats.unchanged++;
          continue;
        }

        // Update hash
        if (!dryRun) {
          await prisma.funding_programs.update({
            where: { id: program.id },
            data: { contentHash: newHash },
          });
        }
        stats.updated++;

      } catch (error) {
        console.error(`   ❌ Error updating ${program.id}: ${error}`);
        stats.errors++;
      }
    }
  }

  // Summary
  console.log("\n" + "═".repeat(80));
  console.log("📊 SUMMARY");
  console.log("═".repeat(80));
  console.log(`   Mode: ${dryRun ? "DRY RUN (no changes made)" : "PRODUCTION"}`);
  console.log(`   Total programs: ${stats.total}`);
  console.log(`   ${dryRun ? "Would be updated" : "Updated"}: ${stats.updated}`);
  console.log(`   Unchanged: ${stats.unchanged}`);
  console.log(`   Errors: ${stats.errors}`);
  console.log("═".repeat(80));

  if (dryRun) {
    console.log("\n⚠️  This was a DRY RUN. No changes were made to the database.");
    console.log("   Run without --dry-run to execute the rehash.");
  }

  // Show sample transformations
  if (stats.updated > 0 && dryRun) {
    console.log("\n📝 Sample hash transformations:");
    const samplePrograms = programs.slice(0, 3);
    for (const program of samplePrograms) {
      const newHash = generateProgramHash({
        agencyId: program.agencyId,
        title: program.title,
        deadline: program.deadline,
        ministry: program.ministry,
      });
      console.log(`   Title: "${program.title.substring(0, 50)}..."`);
      console.log(`   Normalized: "${normalizeKoreanTitle(program.title).substring(0, 50)}..."`);
      console.log(`   Old hash: ${program.contentHash.substring(0, 16)}...`);
      console.log(`   New hash: ${newHash.substring(0, 16)}...`);
      console.log();
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");

  try {
    await rehashFundingPrograms(dryRun);
  } catch (error) {
    console.error("\n❌ Error during rehash:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
