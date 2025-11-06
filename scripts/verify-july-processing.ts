import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function verifyJulyResults() {
  console.log("🔍 July 2025 Processing Results\n");
  console.log("═".repeat(80));

  // First get all July jobs
  const allJulyJobs = await prisma.scraping_jobs.findMany({
    where: { dateRange: "2025-07-01 to 2025-07-31" },
    select: {
      id: true,
      processingStatus: true,
      fundingProgramId: true,
    },
  });

  const totalJobs = allJulyJobs.length;
  const completedJobs = allJulyJobs.filter(
    (job) => job.processingStatus === "COMPLETED"
  ).length;
  const failedJobs = allJulyJobs.filter(
    (job) => job.processingStatus === "FAILED"
  ).length;
  const pendingJobs = allJulyJobs.filter(
    (job) => job.processingStatus === "PENDING"
  ).length;
  const withPrograms = allJulyJobs.filter(
    (job) => job.fundingProgramId !== null
  ).length;

  console.log("\n📊 Processing Summary:");
  console.log(`   Total jobs: ${totalJobs}`);
  console.log(`   ✅ Completed: ${completedJobs}`);
  console.log(`   ⏭️  Pending (no attachments): ${pendingJobs}`);
  console.log(`   ❌ Failed: ${failedJobs}`);
  console.log(`   📝 Programs created: ${withPrograms}`);

  // Get all July programs
  const julyPrograms = await prisma.funding_programs.findMany({
    where: {
      scraping_job: {
        dateRange: "2025-07-01 to 2025-07-31",
      },
    },
    select: {
      id: true,
      category: true,
      announcingAgency: true,
      keywords: true,
      minTrl: true,
      maxTrl: true,
      budgetAmount: true,
      deadline: true,
    },
  });

  const totalPrograms = julyPrograms.length;

  // Critical field population rates
  console.log("\n" + "═".repeat(80));
  console.log("🎯 Critical Field Population Rates (Category, Agency, Keywords):\n");

  const withCategory = julyPrograms.filter((p) => p.category !== null).length;
  const withAgency = julyPrograms.filter(
    (p) => p.announcingAgency !== null
  ).length;
  const withKeywords = julyPrograms.filter(
    (p) => p.keywords && p.keywords.length > 0
  ).length;

  const categoryRate =
    totalPrograms > 0
      ? ((withCategory / totalPrograms) * 100).toFixed(1)
      : "0.0";
  const agencyRate =
    totalPrograms > 0 ? ((withAgency / totalPrograms) * 100).toFixed(1) : "0.0";
  const keywordsRate =
    totalPrograms > 0
      ? ((withKeywords / totalPrograms) * 100).toFixed(1)
      : "0.0";

  console.log(`   📂 Category:  ${withCategory}/${totalPrograms} (${categoryRate}%)`);
  console.log(`   🏢 Agency:    ${withAgency}/${totalPrograms} (${agencyRate}%)`);
  console.log(`   🏷️  Keywords: ${withKeywords}/${totalPrograms} (${keywordsRate}%)`);

  // Additional field population
  console.log("\n" + "═".repeat(80));
  console.log("📋 Additional Field Population:\n");

  const withTRL = julyPrograms.filter(
    (p) => p.minTrl !== null || p.maxTrl !== null
  ).length;
  const withDeadlines = julyPrograms.filter((p) => p.deadline !== null).length;
  const withFundingAmount = julyPrograms.filter(
    (p) => p.budgetAmount !== null
  ).length;

  const trlRate =
    totalPrograms > 0 ? ((withTRL / totalPrograms) * 100).toFixed(1) : "0.0";
  const deadlinesRate =
    totalPrograms > 0
      ? ((withDeadlines / totalPrograms) * 100).toFixed(1)
      : "0.0";
  const fundingRate =
    totalPrograms > 0
      ? ((withFundingAmount / totalPrograms) * 100).toFixed(1)
      : "0.0";

  console.log(`   🔬 TRL:              ${withTRL}/${totalPrograms} (${trlRate}%)`);
  console.log(`   📅 Deadline:         ${withDeadlines}/${totalPrograms} (${deadlinesRate}%)`);
  console.log(`   💰 Funding Amount:   ${withFundingAmount}/${totalPrograms} (${fundingRate}%)`);

  console.log("\n" + "═".repeat(80));

  await prisma.$disconnect();
}

verifyJulyResults().catch(console.error);
