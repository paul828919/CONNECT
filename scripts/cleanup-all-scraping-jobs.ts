import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function cleanupAllScrapingJobs() {
  console.log("🧹 Deleting ALL scraping_jobs from local database\n");
  console.log("═".repeat(80));

  try {
    // Count before deletion
    const countBefore = await prisma.scraping_jobs.count();
    console.log(`\n📊 Current scraping_jobs count: ${countBefore}\n`);

    if (countBefore === 0) {
      console.log("✅ Database is already empty - no scraping_jobs to delete\n");
      console.log("═".repeat(80));
      return;
    }

    // Delete all scraping_jobs (CASCADE will delete related extraction_logs)
    const result = await prisma.scraping_jobs.deleteMany({});

    console.log(`✅ Deleted ${result.count} scraping_jobs\n`);

    // Verify deletion
    const countAfter = await prisma.scraping_jobs.count();
    console.log(`📊 Remaining scraping_jobs count: ${countAfter}\n`);

    if (countAfter === 0) {
      console.log("✅ VERIFIED: All scraping_jobs successfully deleted\n");
    } else {
      console.log(`⚠️  WARNING: ${countAfter} scraping_jobs still remain\n`);
    }

    console.log("═".repeat(80));
  } finally {
    await prisma.$disconnect();
  }
}

cleanupAllScrapingJobs().catch(console.error);
