import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function resetJobsForTesting() {
  console.log("🔄 Resetting 3 July jobs to PENDING for idle timeout testing...\n");

  // Find 3 completed jobs
  const jobsToReset = await prisma.scraping_jobs.findMany({
    where: {
      dateRange: "2025-07-01 to 2025-07-10",
      processingStatus: "COMPLETED",
    },
    take: 3,
    select: { id: true, announcementTitle: true },
  });

  if (jobsToReset.length === 0) {
    console.log("❌ No completed jobs found to reset\n");
    await prisma.$disconnect();
    return;
  }

  console.log(`📋 Found ${jobsToReset.length} jobs to reset:\n`);
  jobsToReset.forEach((job, idx) => {
    console.log(`   ${idx + 1}. ${job.announcementTitle.substring(0, 60)}...`);
  });
  console.log("");

  // Reset them back to PENDING
  const result = await prisma.scraping_jobs.updateMany({
    where: {
      id: { in: jobsToReset.map((j) => j.id) },
    },
    data: {
      processingStatus: "PENDING",
      processingWorker: null,
      processingAttempts: 0,
      processingStartedAt: null,
      processedAt: null,
      processingError: null,
    },
  });

  console.log(`✅ Reset ${result.count} jobs to PENDING status\n`);

  // Verify the reset
  const pendingCount = await prisma.scraping_jobs.count({
    where: {
      dateRange: "2025-07-01 to 2025-07-10",
      processingStatus: "PENDING",
    },
  });

  console.log(`📊 Total PENDING jobs for July 1-10: ${pendingCount}\n`);

  await prisma.$disconnect();
}

resetJobsForTesting().catch(console.error);
