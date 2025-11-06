import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function cleanupJulyAugustData() {
  console.log("🧹 Cleaning up July/August 2025 Data\n");
  console.log("═".repeat(80));

  try {
    // Get counts before deletion
    const julyAugustJobs = await prisma.scraping_jobs.findMany({
      where: {
        OR: [
          { dateRange: "2025-07-01 to 2025-07-31" },
          { dateRange: "2025-08-01 to 2025-08-31" },
        ],
      },
      select: {
        id: true,
        dateRange: true,
        fundingProgramId: true,
      },
    });

    const totalJobs = julyAugustJobs.length;
    const jobsWithPrograms = julyAugustJobs.filter(
      (j) => j.fundingProgramId !== null
    ).length;

    console.log(`\n📊 Current Data:\n`);
    console.log(`   Total scraping_jobs (July + August): ${totalJobs}`);
    console.log(`   Jobs with funding_programs: ${jobsWithPrograms}`);

    const julyJobs = julyAugustJobs.filter(
      (j) => j.dateRange === "2025-07-01 to 2025-07-31"
    ).length;
    const augustJobs = julyAugustJobs.filter(
      (j) => j.dateRange === "2025-08-01 to 2025-08-31"
    ).length;

    console.log(`   July jobs: ${julyJobs}`);
    console.log(`   August jobs: ${augustJobs}`);

    console.log(`\n${"─".repeat(80)}\n`);
    console.log(`🗑️  Deleting all July/August data...\n`);

    // Delete funding_programs first (child records)
    // Note: ON DELETE CASCADE should handle this automatically, but explicit deletion is clearer
    const deletedPrograms = await prisma.funding_programs.deleteMany({
      where: {
        scraping_job: {
          OR: [
            { dateRange: "2025-07-01 to 2025-07-31" },
            { dateRange: "2025-08-01 to 2025-08-31" },
          ],
        },
      },
    });

    console.log(`   ✅ Deleted ${deletedPrograms.count} funding_programs`);

    // Delete extraction_logs (cascade should handle, but being explicit)
    const deletedLogs = await prisma.extraction_logs.deleteMany({
      where: {
        scrapingJob: {
          OR: [
            { dateRange: "2025-07-01 to 2025-07-31" },
            { dateRange: "2025-08-01 to 2025-08-31" },
          ],
        },
      },
    });

    console.log(`   ✅ Deleted ${deletedLogs.count} extraction_logs`);

    // Delete scraping_jobs
    const deletedJobs = await prisma.scraping_jobs.deleteMany({
      where: {
        OR: [
          { dateRange: "2025-07-01 to 2025-07-31" },
          { dateRange: "2025-08-01 to 2025-08-31" },
        ],
      },
    });

    console.log(`   ✅ Deleted ${deletedJobs.count} scraping_jobs`);

    console.log(`\n${"═".repeat(80)}\n`);
    console.log(`✅ Cleanup Complete!\n`);
    console.log(`   Database is ready for fresh July/August scrape.`);
    console.log(`   All old data with incorrect selectors has been removed.\n`);
    console.log("═".repeat(80));
  } finally {
    await prisma.$disconnect();
  }
}

cleanupJulyAugustData().catch(console.error);
