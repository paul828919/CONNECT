/**
 * Auto-Cleanup Duplicate Programs
 *
 * Automatically removes duplicate funding programs based on normalized title.
 * This is a simpler alternative to the manual verification cleanup.
 *
 * USAGE:
 *   npx tsx scripts/auto-cleanup-duplicates.ts --dry-run    # Preview changes
 *   npx tsx scripts/auto-cleanup-duplicates.ts              # Execute cleanup
 *
 * DEDUPLICATION RULES:
 * 1. Group programs by (agencyId, normalizedTitle)
 * 2. Keep one program per group based on:
 *    - Programs with deadlines preferred
 *    - Programs with budgets preferred
 *    - Earlier scraped programs preferred (original source)
 * 3. Migrate funding_matches from deleted to kept programs
 * 4. Delete duplicate programs
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface DuplicateGroup {
  normalizedTitle: string;
  programs: Array<{
    id: string;
    title: string;
    deadline: Date | null;
    budgetAmount: bigint | null;
    scrapedAt: Date;
    ministry: string | null;
  }>;
}

function normalizeTitle(title: string): string {
  return title
    .replace(/^\d{4}년도?\s*/g, '')
    .replace(/\([^)]*\)\s*$/g, '')
    .replace(/_?\(?20\d{2}\)?.*$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

async function findDuplicateGroups(): Promise<DuplicateGroup[]> {
  // Get all programs
  const programs = await prisma.funding_programs.findMany({
    select: {
      id: true,
      title: true,
      deadline: true,
      budgetAmount: true,
      scrapedAt: true,
      ministry: true,
    },
    orderBy: { scrapedAt: 'asc' },
  });

  // Group by normalized title
  const groups = new Map<string, DuplicateGroup['programs']>();

  for (const program of programs) {
    const normalized = normalizeTitle(program.title);
    if (!groups.has(normalized)) {
      groups.set(normalized, []);
    }
    groups.get(normalized)!.push(program);
  }

  // Filter to only groups with duplicates
  return Array.from(groups.entries())
    .filter(([_, progs]) => progs.length > 1)
    .map(([normalizedTitle, programs]) => ({ normalizedTitle, programs }));
}

function selectBestProgram(programs: DuplicateGroup['programs']): string {
  // Sort by preference criteria
  const sorted = [...programs].sort((a, b) => {
    // Prefer programs with deadlines
    if (a.deadline && !b.deadline) return -1;
    if (!a.deadline && b.deadline) return 1;
    // Prefer programs with budgets
    if (a.budgetAmount && !b.budgetAmount) return -1;
    if (!a.budgetAmount && b.budgetAmount) return 1;
    // Prefer earlier scraped (original source)
    return new Date(a.scrapedAt).getTime() - new Date(b.scrapedAt).getTime();
  });

  return sorted[0].id;
}

async function migrateMatchesAndDelete(
  keepId: string,
  deleteIds: string[],
  dryRun: boolean
): Promise<{ matchesMigrated: number; matchesMerged: number }> {
  let matchesMigrated = 0;
  let matchesMerged = 0;

  for (const deleteId of deleteIds) {
    // Find matches for this program
    const matchesToMigrate = await prisma.funding_matches.findMany({
      where: { programId: deleteId },
    });

    for (const match of matchesToMigrate) {
      // Check if keep program already has a match for this org
      const existingMatch = await prisma.funding_matches.findUnique({
        where: {
          organizationId_programId: {
            organizationId: match.organizationId,
            programId: keepId,
          },
        },
      });

      if (existingMatch) {
        // Merge engagement data
        if (!dryRun) {
          await prisma.funding_matches.update({
            where: { id: existingMatch.id },
            data: {
              viewed: existingMatch.viewed || match.viewed,
              saved: existingMatch.saved || match.saved,
              notificationSent: existingMatch.notificationSent || match.notificationSent,
              score: Math.max(existingMatch.score, match.score),
            },
          });
          await prisma.funding_matches.delete({ where: { id: match.id } });
        }
        matchesMerged++;
      } else {
        // Migrate match
        if (!dryRun) {
          await prisma.funding_matches.update({
            where: { id: match.id },
            data: { programId: keepId },
          });
        }
        matchesMigrated++;
      }
    }

    // Delete the duplicate program
    if (!dryRun) {
      await prisma.funding_programs.delete({ where: { id: deleteId } });
    }
  }

  return { matchesMigrated, matchesMerged };
}

async function autoCleanupDuplicates(dryRun: boolean): Promise<void> {
  console.log("═".repeat(80));
  console.log(`🧹 Auto-Cleanup Duplicates ${dryRun ? "(DRY RUN)" : "(PRODUCTION)"}`);
  console.log("═".repeat(80));
  console.log();

  // Find duplicate groups
  console.log("📊 Finding duplicate groups...");
  const groups = await findDuplicateGroups();
  console.log(`   Found ${groups.length} groups with duplicates\n`);

  if (groups.length === 0) {
    console.log("✅ No duplicates found. Database is clean.");
    return;
  }

  let totalDeleted = 0;
  let totalMatchesMigrated = 0;
  let totalMatchesMerged = 0;

  // Process each group
  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    const keepId = selectBestProgram(group.programs);
    const deleteIds = group.programs.filter(p => p.id !== keepId).map(p => p.id);

    if (i < 10 || i === groups.length - 1) {
      console.log(`\n📂 Group ${i + 1}/${groups.length}: ${group.normalizedTitle.slice(0, 50)}...`);
      console.log(`   Programs: ${group.programs.length} | Keep: ${keepId.slice(0, 8)}... | Delete: ${deleteIds.length}`);
    } else if (i === 10) {
      console.log(`\n   ... processing ${groups.length - 11} more groups ...`);
    }

    const { matchesMigrated, matchesMerged } = await migrateMatchesAndDelete(
      keepId,
      deleteIds,
      dryRun
    );

    totalDeleted += deleteIds.length;
    totalMatchesMigrated += matchesMigrated;
    totalMatchesMerged += matchesMerged;
  }

  // Summary
  console.log("\n" + "═".repeat(80));
  console.log("📊 SUMMARY");
  console.log("═".repeat(80));
  console.log(`   Mode: ${dryRun ? "DRY RUN (no changes made)" : "PRODUCTION"}`);
  console.log(`   Duplicate groups found: ${groups.length}`);
  console.log(`   Programs ${dryRun ? "would be " : ""}deleted: ${totalDeleted}`);
  console.log(`   Matches ${dryRun ? "would be " : ""}migrated: ${totalMatchesMigrated}`);
  console.log(`   Matches ${dryRun ? "would be " : ""}merged: ${totalMatchesMerged}`);
  console.log("═".repeat(80));

  if (dryRun) {
    console.log("\n⚠️  This was a DRY RUN. No changes were made to the database.");
    console.log("   Run without --dry-run to execute the cleanup.");
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");

  try {
    await autoCleanupDuplicates(dryRun);
  } catch (error) {
    console.error("\n❌ Error during cleanup:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
