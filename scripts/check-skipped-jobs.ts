import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkSkippedJobs() {
  console.log("🔍 Analyzing Skipped Jobs\n");
  console.log("═".repeat(80));

  // Get all July scraping_jobs
  const allJobs = await prisma.scraping_jobs.findMany({
    where: {
      dateRange: "2025-07-01 to 2025-07-10",
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  console.log(`\n📊 Total Jobs: ${allJobs.length}\n`);

  // Breakdown by processing status
  const pending = allJobs.filter((j) => j.processingStatus === "PENDING");
  const processing = allJobs.filter((j) => j.processingStatus === "PROCESSING");
  const completed = allJobs.filter((j) => j.processingStatus === "COMPLETED");
  const failed = allJobs.filter((j) => j.processingStatus === "FAILED");
  const skipped = allJobs.filter((j) => j.processingStatus === "SKIPPED");

  console.log("📈 Processing Status Breakdown:\n");
  console.log(`   PENDING:    ${pending.length}`);
  console.log(`   PROCESSING: ${processing.length}`);
  console.log(`   COMPLETED:  ${completed.length}`);
  console.log(`   FAILED:     ${failed.length}`);
  console.log(`   SKIPPED:    ${skipped.length}`);

  console.log("\n" + "─".repeat(80));

  if (skipped.length > 0) {
    console.log("\n🔎 Skipped Jobs Details:\n");
    skipped.forEach((job, idx) => {
      console.log(`   ${idx + 1}. ${job.announcementTitle}`);
      console.log(`      Reason: ${job.processingError || "No error message"}`);
      console.log(`      Attachments: ${job.attachmentCount} files`);
      console.log(`      URL: ${job.announcementUrl}`);
      console.log("");
    });
  }

  if (failed.length > 0) {
    console.log("\n❌ Failed Jobs Details:\n");
    failed.forEach((job, idx) => {
      console.log(`   ${idx + 1}. ${job.announcementTitle}`);
      console.log(`      Error: ${job.processingError || "No error message"}`);
      console.log(`      Attachments: ${job.attachmentCount} files`);
      console.log(`      Attempts: ${job.processingAttempts}`);
      console.log("");
    });
  }

  // Check jobs without attachments
  const noAttachments = allJobs.filter((j) => j.attachmentCount === 0);
  console.log("\n" + "─".repeat(80));
  console.log(`\n📎 Jobs Without Attachments: ${noAttachments.length}/${allJobs.length}\n`);

  if (noAttachments.length > 0) {
    noAttachments.slice(0, 5).forEach((job, idx) => {
      console.log(
        `   ${idx + 1}. ${job.announcementTitle.substring(0, 60)}... (Status: ${job.processingStatus})`
      );
    });
    if (noAttachments.length > 5) {
      console.log(`   ... and ${noAttachments.length - 5} more`);
    }
  }

  console.log("\n" + "═".repeat(80));

  await prisma.$disconnect();
}

checkSkippedJobs().catch(console.error);
