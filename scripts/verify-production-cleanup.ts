#!/usr/bin/env npx tsx
/**
 * Verify Production Cleanup
 *
 * This script verifies that all cleanup operations completed successfully
 */

import { PrismaClient } from "@prisma/client";

const databaseUrl = process.env.PRODUCTION_DATABASE_URL || process.env.DATABASE_URL;

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
});

const SEPARATOR = "═".repeat(80);

async function verify() {
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║      PRODUCTION CLEANUP VERIFICATION                       ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  try {
    // Check database tables
    const [jobs, programs, verifications, logs] = await Promise.all([
      prisma.scraping_jobs.count(),
      prisma.funding_programs.count(),
      prisma.eligibility_verification.count(),
      prisma.extraction_logs.count(),
    ]);

    console.log("📊 Database Tables:");
    console.log(`   - Scraping Jobs: ${jobs}`);
    console.log(`   - Funding Programs: ${programs}`);
    console.log(`   - Eligibility Verifications: ${verifications}`);
    console.log(`   - Extraction Logs: ${logs}`);

    // Check Innowave organization
    const innowaveOrgs = await prisma.organizations.count({
      where: {
        OR: [
          { name: { contains: "Innowave", mode: "insensitive" } },
          { name: { contains: "이노웨이브" } },
        ],
      },
    });

    console.log(`\n👤 Innowave Organizations: ${innowaveOrgs}`);

    // Summary
    const totalRecords = jobs + programs + verifications + logs + innowaveOrgs;
    console.log(`\n📈 Total Records Remaining: ${totalRecords}`);

    if (totalRecords === 0) {
      console.log("\n" + SEPARATOR);
      console.log("🎉 SUCCESS: All data successfully cleaned up!");
      console.log(SEPARATOR + "\n");
    } else {
      console.log("\n" + SEPARATOR);
      console.log(`⚠️  WARNING: ${totalRecords} records still remain!`);
      console.log(SEPARATOR + "\n");
    }
  } catch (error) {
    console.error("\n❌ Verification failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

verify()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Verification error:", error);
    process.exit(1);
  });
