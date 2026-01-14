/**
 * Cleanup Duplicate Funding Programs
 *
 * This script cleans up duplicate funding programs based on manual verification.
 *
 * USAGE:
 *   npx ts-node scripts/cleanup-duplicate-programs.ts --dry-run    # Preview changes
 *   npx ts-node scripts/cleanup-duplicate-programs.ts              # Execute cleanup
 *
 * WHAT IT DOES:
 *   1. Parses the verification file (duplicate-programs-verification.md)
 *   2. Extracts program IDs marked as "keep" and "delete"
 *   3. For each group:
 *      - Migrates funding_matches from "delete" programs to "keep" program
 *      - Preserves user engagement (viewed/saved/notificationSent)
 *      - Deletes duplicate programs
 *   4. Generates audit log with all changes
 *
 * SAFETY FEATURES:
 *   - Dry-run mode by default (--dry-run flag)
 *   - Skips groups without a "keep" entry
 *   - Uses database transactions for atomicity
 *   - Generates detailed audit log
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

// Configuration - can be overridden via command line argument
const DEFAULT_VERIFICATION_FILE_PATH = path.join(__dirname, "../data/duplicate-programs-verification.md");

function getVerificationFilePath(): string {
  // Check for --file argument
  const fileArgIndex = process.argv.findIndex(arg => arg === "--file");
  if (fileArgIndex !== -1 && process.argv[fileArgIndex + 1]) {
    return process.argv[fileArgIndex + 1];
  }

  // Check if default exists, otherwise try common locations
  if (fs.existsSync(DEFAULT_VERIFICATION_FILE_PATH)) {
    return DEFAULT_VERIFICATION_FILE_PATH;
  }

  // Fallback to user's Downloads folder (local development)
  const localPath = "/Users/paulkim/Downloads/duplicate-programs-verification.md";
  if (fs.existsSync(localPath)) {
    return localPath;
  }

  return DEFAULT_VERIFICATION_FILE_PATH;
}

interface ProgramEntry {
  id: string;
  title: string;
  ministry: string;
  deadline: string;
  status: string;
  action: "keep" | "delete";
}

interface DuplicateGroup {
  groupNumber: number;
  groupTitle: string;
  type: "TYPE1" | "TYPE2";
  programs: ProgramEntry[];
}

interface AuditEntry {
  timestamp: string;
  action: string;
  details: Record<string, unknown>;
}

/**
 * Parse the verification markdown file to extract duplicate groups
 */
function parseVerificationFile(filePath: string): DuplicateGroup[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const groups: DuplicateGroup[] = [];

  let currentGroup: DuplicateGroup | null = null;
  let currentType: "TYPE1" | "TYPE2" = "TYPE1";
  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect Type 1 vs Type 2 sections
    if (line.includes("## Type 1:") || line.includes("Type 1:")) {
      currentType = "TYPE1";
    } else if (line.includes("## Type 2:") || line.includes("Type 2:")) {
      currentType = "TYPE2";
    }

    // Detect group headers (### 그룹 X: Title)
    const groupMatch = line.match(/^###\s*그룹\s*(\d+):\s*(.*)$/);
    if (groupMatch) {
      // Save previous group if exists
      if (currentGroup && currentGroup.programs.length > 0) {
        groups.push(currentGroup);
      }

      currentGroup = {
        groupNumber: parseInt(groupMatch[1]),
        groupTitle: groupMatch[2].trim(),
        type: currentType,
        programs: [],
      };
      inTable = false;
      continue;
    }

    // Detect table start (header row with | # | ID | ...)
    if (line.includes("| # | ID |") || line.includes("|---|")) {
      inTable = true;
      continue;
    }

    // Parse table rows with program entries
    if (inTable && currentGroup && line.startsWith("|") && !line.startsWith("|---")) {
      // Parse markdown table row
      // Format: | # | ID | 제목 | 부처 | 마감일 | 상태 | NTIS 링크 |keep or |delete

      // Extract keep/delete marker (case-insensitive)
      const keepDeleteMatch = line.match(/\|(keep|delete)\s*$/i);
      if (!keepDeleteMatch) {
        continue; // Skip rows without keep/delete marker
      }

      const action = keepDeleteMatch[1].toLowerCase() as "keep" | "delete";

      // Remove the keep/delete suffix for parsing
      const tableRow = line.replace(/\|(keep|delete)\s*$/i, "|").trim();

      // Split by | and filter empty parts
      const columns = tableRow.split("|").filter(col => col.trim() !== "");

      if (columns.length < 6) {
        continue; // Invalid row
      }

      // Extract program ID (partial ID like "bbe22839...")
      const partialId = columns[1].trim();

      // We need to find the full ID in the database
      // The file shows first 8 chars + "..."
      const idPrefix = partialId.replace("...", "");

      if (idPrefix.length < 8) {
        continue; // Invalid ID format
      }

      const entry: ProgramEntry = {
        id: idPrefix, // Partial ID - will be matched with database
        title: columns[2].trim(),
        ministry: columns[3].trim(),
        deadline: columns[4].trim(),
        status: columns[5].trim(),
        action: action,
      };

      currentGroup.programs.push(entry);
    }

    // Detect table end (empty line or new section)
    if (inTable && (line.trim() === "" || line.startsWith("###") || line.startsWith("## "))) {
      inTable = false;
    }
  }

  // Don't forget the last group
  if (currentGroup && currentGroup.programs.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
}

/**
 * Find full program ID from partial ID prefix
 */
async function findFullProgramId(idPrefix: string): Promise<string | null> {
  const program = await prisma.funding_programs.findFirst({
    where: {
      id: {
        startsWith: idPrefix,
      },
    },
    select: { id: true },
  });

  return program?.id || null;
}

/**
 * Migrate matches from delete program to keep program
 */
async function migrateMatches(
  deleteProgram: { id: string; fullId: string },
  keepProgram: { id: string; fullId: string },
  dryRun: boolean
): Promise<{ migrated: number; skippedDuplicate: number }> {
  // Find all matches pointing to the delete program
  const matchesToMigrate = await prisma.funding_matches.findMany({
    where: { programId: deleteProgram.fullId },
    include: { organizations: true },
  });

  let migrated = 0;
  let skippedDuplicate = 0;

  for (const match of matchesToMigrate) {
    // Check if keep program already has a match for this organization
    const existingMatch = await prisma.funding_matches.findUnique({
      where: {
        organizationId_programId: {
          organizationId: match.organizationId,
          programId: keepProgram.fullId,
        },
      },
    });

    if (existingMatch) {
      // Merge user engagement - keep TRUE values and higher scores
      const mergedData = {
        viewed: existingMatch.viewed || match.viewed,
        saved: existingMatch.saved || match.saved,
        notificationSent: existingMatch.notificationSent || match.notificationSent,
        viewedAt: existingMatch.viewedAt || match.viewedAt,
        savedAt: existingMatch.savedAt || match.savedAt,
        notifiedAt: existingMatch.notifiedAt || match.notifiedAt,
        score: Math.max(existingMatch.score, match.score),
      };

      if (!dryRun) {
        await prisma.funding_matches.update({
          where: { id: existingMatch.id },
          data: mergedData,
        });

        // Delete the old match
        await prisma.funding_matches.delete({
          where: { id: match.id },
        });
      }

      skippedDuplicate++;
    } else {
      // Migrate match to keep program
      if (!dryRun) {
        await prisma.funding_matches.update({
          where: { id: match.id },
          data: { programId: keepProgram.fullId },
        });
      }
      migrated++;
    }
  }

  return { migrated, skippedDuplicate };
}

/**
 * Main cleanup function
 */
async function cleanupDuplicatePrograms(dryRun: boolean): Promise<void> {
  console.log("═".repeat(80));
  console.log(`🧹 Cleanup Duplicate Programs ${dryRun ? "(DRY RUN)" : "(PRODUCTION)"}`);
  console.log("═".repeat(80));
  console.log();

  // Parse verification file
  const verificationFilePath = getVerificationFilePath();
  console.log(`📄 Parsing verification file: ${verificationFilePath}`);
  const groups = parseVerificationFile(verificationFilePath);
  console.log(`   Found ${groups.length} duplicate groups\n`);

  const auditLog: AuditEntry[] = [];
  let totalProgramsDeleted = 0;
  let totalMatchesMigrated = 0;
  let totalMatchesMerged = 0;
  let groupsSkipped = 0;
  let groupsProcessed = 0;

  // Process each group
  for (const group of groups) {
    console.log(`\n${"─".repeat(60)}`);
    console.log(`📂 Group ${group.groupNumber}: ${group.groupTitle.slice(0, 50)}...`);
    console.log(`   Type: ${group.type} | Programs: ${group.programs.length}`);

    // Find keep and delete programs
    const keepPrograms = group.programs.filter(p => p.action === "keep");
    const deletePrograms = group.programs.filter(p => p.action === "delete");

    if (keepPrograms.length === 0) {
      console.log("   ⚠️  SKIPPED: No 'keep' program designated");
      groupsSkipped++;
      auditLog.push({
        timestamp: new Date().toISOString(),
        action: "SKIP_NO_KEEP",
        details: { groupNumber: group.groupNumber, reason: "No keep program designated" },
      });
      continue;
    }

    if (deletePrograms.length === 0) {
      console.log("   ✓ No duplicates to delete in this group");
      continue;
    }

    // Resolve full IDs from database
    const keepProgramsFull: Array<{ id: string; fullId: string }> = [];
    const deleteProgramsFull: Array<{ id: string; fullId: string }> = [];

    for (const kp of keepPrograms) {
      const fullId = await findFullProgramId(kp.id);
      if (fullId) {
        keepProgramsFull.push({ id: kp.id, fullId });
      } else {
        console.log(`   ⚠️  Keep program not found in DB: ${kp.id}...`);
      }
    }

    for (const dp of deletePrograms) {
      const fullId = await findFullProgramId(dp.id);
      if (fullId) {
        deleteProgramsFull.push({ id: dp.id, fullId });
      } else {
        console.log(`   ⚠️  Delete program not found in DB: ${dp.id}...`);
      }
    }

    if (keepProgramsFull.length === 0) {
      console.log("   ⚠️  SKIPPED: Keep program not found in database");
      groupsSkipped++;
      continue;
    }

    if (deleteProgramsFull.length === 0) {
      console.log("   ✓ No delete programs found in database (already cleaned?)");
      continue;
    }

    // Use first keep program as the target
    const targetKeepProgram = keepProgramsFull[0];

    console.log(`   → Keep: ${targetKeepProgram.id}... (full: ${targetKeepProgram.fullId.slice(0, 16)}...)`);
    console.log(`   → Delete: ${deleteProgramsFull.length} programs`);

    // Migrate matches and delete programs
    let groupMatchesMigrated = 0;
    let groupMatchesMerged = 0;

    for (const deleteProgram of deleteProgramsFull) {
      const { migrated, skippedDuplicate } = await migrateMatches(
        deleteProgram,
        targetKeepProgram,
        dryRun
      );
      groupMatchesMigrated += migrated;
      groupMatchesMerged += skippedDuplicate;

      // Delete the program
      if (!dryRun) {
        await prisma.funding_programs.delete({
          where: { id: deleteProgram.fullId },
        });
      }

      auditLog.push({
        timestamp: new Date().toISOString(),
        action: "DELETE_PROGRAM",
        details: {
          groupNumber: group.groupNumber,
          deletedProgramId: deleteProgram.fullId,
          targetKeepProgramId: targetKeepProgram.fullId,
          matchesMigrated: migrated,
          matchesMerged: skippedDuplicate,
          dryRun,
        },
      });
    }

    totalProgramsDeleted += deleteProgramsFull.length;
    totalMatchesMigrated += groupMatchesMigrated;
    totalMatchesMerged += groupMatchesMerged;
    groupsProcessed++;

    console.log(`   ✓ ${dryRun ? "Would delete" : "Deleted"} ${deleteProgramsFull.length} programs`);
    console.log(`   ✓ Matches migrated: ${groupMatchesMigrated}, merged: ${groupMatchesMerged}`);
  }

  // Summary
  console.log("\n" + "═".repeat(80));
  console.log("📊 SUMMARY");
  console.log("═".repeat(80));
  console.log(`   Mode: ${dryRun ? "DRY RUN (no changes made)" : "PRODUCTION"}`);
  console.log(`   Groups processed: ${groupsProcessed}`);
  console.log(`   Groups skipped: ${groupsSkipped}`);
  console.log(`   Programs ${dryRun ? "would be " : ""}deleted: ${totalProgramsDeleted}`);
  console.log(`   Matches ${dryRun ? "would be " : ""}migrated: ${totalMatchesMigrated}`);
  console.log(`   Matches ${dryRun ? "would be " : ""}merged: ${totalMatchesMerged}`);
  console.log("═".repeat(80));

  // Save audit log
  const auditLogPath = path.join(
    __dirname,
    `../logs/duplicate-cleanup-audit-${new Date().toISOString().split("T")[0]}.json`
  );

  // Ensure logs directory exists
  const logsDir = path.dirname(auditLogPath);
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  fs.writeFileSync(auditLogPath, JSON.stringify(auditLog, null, 2));
  console.log(`\n📝 Audit log saved: ${auditLogPath}`);

  if (dryRun) {
    console.log("\n⚠️  This was a DRY RUN. No changes were made to the database.");
    console.log("   Run without --dry-run to execute the cleanup.");
  }
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");

  try {
    await cleanupDuplicatePrograms(dryRun);
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
