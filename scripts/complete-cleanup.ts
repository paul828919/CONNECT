#!/usr/bin/env npx tsx
/**
 * Complete Development Environment Cleanup Script
 *
 * This script performs a comprehensive cleanup of the development environment:
 * 1. Deletes all data from scraping_jobs, funding_programs, eligibility_verification, extraction_logs
 * 2. Clears all Redis queues (BullMQ)
 * 3. Deletes all downloaded attachment files
 *
 * ⚠️ WARNING: This is a destructive operation for development use only!
 *
 * Usage:
 *   npm run cleanup:complete
 *   or
 *   npx tsx scripts/complete-cleanup.ts
 */

import { PrismaClient } from "@prisma/client";
import Redis from "ioredis";
import { execSync } from "child_process";

const prisma = new PrismaClient();
const redis = new Redis({
  host: "localhost",
  port: 6380,
  maxRetriesPerRequest: null,
});

const SEPARATOR = "═".repeat(80);

async function deleteDatabase() {
  console.log("\n🗑️  STEP 1: Deleting Database Tables");
  console.log(SEPARATOR);

  try {
    // Count records before deletion
    const [scrapingJobsCount, fundingProgramsCount, verificationCount, extractionLogsCount] =
      await Promise.all([
        prisma.scraping_jobs.count(),
        prisma.funding_programs.count(),
        prisma.eligibility_verification.count(),
        prisma.extraction_logs.count(),
      ]);

    console.log("\n📊 Current record counts:");
    console.log(`   - Scraping Jobs: ${scrapingJobsCount}`);
    console.log(`   - Funding Programs: ${fundingProgramsCount}`);
    console.log(`   - Eligibility Verifications: ${verificationCount}`);
    console.log(`   - Extraction Logs: ${extractionLogsCount}`);
    console.log(`   - TOTAL: ${scrapingJobsCount + fundingProgramsCount + verificationCount + extractionLogsCount}`);

    if (scrapingJobsCount + fundingProgramsCount + verificationCount + extractionLogsCount === 0) {
      console.log("\n✅ Database is already empty - nothing to delete\n");
      return;
    }

    console.log("\n🧹 Deleting all records...");

    // Delete in order (child tables first due to foreign keys)
    // extraction_logs references scraping_jobs (CASCADE configured)
    // eligibility_verification is independent

    const [deletedVerification, deletedExtraction, deletedJobs, deletedPrograms] =
      await Promise.all([
        prisma.eligibility_verification.deleteMany({}),
        prisma.extraction_logs.deleteMany({}),
        prisma.scraping_jobs.deleteMany({}),
        prisma.funding_programs.deleteMany({}),
      ]);

    console.log("\n✅ Deletion completed:");
    console.log(`   - Eligibility Verifications: ${deletedVerification.count}`);
    console.log(`   - Extraction Logs: ${deletedExtraction.count}`);
    console.log(`   - Scraping Jobs: ${deletedJobs.count}`);
    console.log(`   - Funding Programs: ${deletedPrograms.count}`);

    // Verify deletion
    const [remainingJobs, remainingPrograms, remainingVerification, remainingLogs] =
      await Promise.all([
        prisma.scraping_jobs.count(),
        prisma.funding_programs.count(),
        prisma.eligibility_verification.count(),
        prisma.extraction_logs.count(),
      ]);

    const totalRemaining = remainingJobs + remainingPrograms + remainingVerification + remainingLogs;

    if (totalRemaining === 0) {
      console.log("\n✅ VERIFIED: All database records successfully deleted");
    } else {
      console.log(`\n⚠️  WARNING: ${totalRemaining} records still remain in database`);
    }

  } catch (error) {
    console.error("\n❌ Database cleanup failed:", error);
    throw error;
  }
}

async function clearRedisQueues() {
  console.log("\n\n🗑️  STEP 2: Clearing Redis Queues");
  console.log(SEPARATOR);

  try {
    const keys = await redis.keys("bull:*");
    console.log(`\n📊 Found ${keys.length} Redis queue keys`);

    if (keys.length === 0) {
      console.log("\n✅ No Redis queue keys to clear\n");
      return;
    }

    console.log("\n🧹 Clearing all queue keys...");

    // Delete all BullMQ keys
    if (keys.length > 0) {
      const deleted = await redis.del(...keys);
      console.log(`\n✅ Deleted ${deleted} Redis keys`);
    }

    // Verify deletion
    const remainingKeys = await redis.keys("bull:*");
    if (remainingKeys.length === 0) {
      console.log("✅ VERIFIED: All Redis queue keys cleared");
    } else {
      console.log(`⚠️  WARNING: ${remainingKeys.length} keys still remain`);
    }

  } catch (error) {
    console.error("\n❌ Redis cleanup failed:", error);
    throw error;
  }
}

async function deleteAttachments() {
  console.log("\n\n🗑️  STEP 3: Deleting Attachment Files");
  console.log(SEPARATOR);

  try {
    // Check if running inside container
    const isContainer = process.env.DOCKER_CONTAINER === "true";

    if (isContainer) {
      console.log("\n📁 Running inside container - direct file deletion");

      // Check if directory exists
      const checkCmd = 'ls -la /app/data/scraper/ntis-attachments 2>/dev/null || echo "NOTFOUND"';
      const checkResult = execSync(checkCmd, { encoding: "utf-8" });

      if (checkResult.includes("NOTFOUND")) {
        console.log("✅ No attachment directory found - nothing to delete\n");
        return;
      }

      console.log("\n🧹 Deleting attachment directory...");
      execSync("rm -rf /app/data/scraper/ntis-attachments/*", { encoding: "utf-8" });

      const verifyResult = execSync('ls /app/data/scraper/ntis-attachments 2>/dev/null | wc -l', { encoding: "utf-8" });
      const remainingFiles = parseInt(verifyResult.trim());

      if (remainingFiles === 0) {
        console.log("✅ VERIFIED: All attachment files deleted");
      } else {
        console.log(`⚠️  WARNING: ${remainingFiles} files still remain`);
      }

    } else {
      console.log("\n📁 Running on host - using docker exec for cleanup");

      // Check if directory exists in container
      const checkCmd = 'docker exec connect_dev_scraper sh -c "ls -la /app/data/scraper/ntis-attachments 2>/dev/null || echo NOTFOUND"';
      const checkResult = execSync(checkCmd, { encoding: "utf-8" });

      if (checkResult.includes("NOTFOUND")) {
        console.log("✅ No attachment directory found - nothing to delete\n");
        return;
      }

      console.log("\n🧹 Deleting attachment directory in container...");
      execSync('docker exec connect_dev_scraper sh -c "rm -rf /app/data/scraper/ntis-attachments/*"', { encoding: "utf-8" });

      const verifyResult = execSync('docker exec connect_dev_scraper sh -c "ls /app/data/scraper/ntis-attachments 2>/dev/null | wc -l"', { encoding: "utf-8" });
      const remainingFiles = parseInt(verifyResult.trim());

      if (remainingFiles === 0) {
        console.log("✅ VERIFIED: All attachment files deleted from container");
      } else {
        console.log(`⚠️  WARNING: ${remainingFiles} files still remain in container`);
      }
    }

  } catch (error) {
    console.error("\n❌ Attachment cleanup failed:", error);
    throw error;
  }
}

async function main() {
  console.log("\n🚨 COMPLETE DEVELOPMENT ENVIRONMENT CLEANUP");
  console.log(SEPARATOR);
  console.log("⚠️  This will DELETE ALL scraping data, queues, and files!");
  console.log(SEPARATOR);

  try {
    await deleteDatabase();
    await clearRedisQueues();
    await deleteAttachments();

    console.log("\n\n" + SEPARATOR);
    console.log("🎉 COMPLETE CLEANUP FINISHED SUCCESSFULLY");
    console.log(SEPARATOR);
    console.log("\n✅ Summary:");
    console.log("   - All database tables cleared");
    console.log("   - All Redis queues cleared");
    console.log("   - All attachment files deleted");
    console.log("\n💡 The development environment is now reset and ready for fresh scraping.\n");

  } catch (error) {
    console.error("\n\n" + SEPARATOR);
    console.error("💥 CLEANUP FAILED");
    console.error(SEPARATOR);
    console.error(error);
    process.exit(1);
  } finally {
    await redis.quit();
    await prisma.$disconnect();
  }
}

// Execute cleanup
main();
