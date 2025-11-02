import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function verifyDiscoveryResults() {
  console.log("📊 Discovery Scraper Results Verification\n");
  console.log("═".repeat(80));

  const jobs = await prisma.scraping_jobs.findMany({
    where: {
      dateRange: "2025-07-01 to 2025-07-10",
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  console.log(`\n✅ Total Jobs Created: ${jobs.length}\n`);

  // Check critical fields population (detailPageData is already a JSON object in Prisma)
  const withMinistry = jobs.filter((j) => {
    const data = j.detailPageData as any;
    return data?.ministry != null && data.ministry !== "";
  });

  const withAgency = jobs.filter((j) => {
    const data = j.detailPageData as any;
    return data?.announcingAgency != null && data.announcingAgency !== "";
  });

  const withAttachments = jobs.filter((j) => j.attachmentCount > 0);

  console.log("📈 Field Population:\n");
  console.log(
    `   Ministry:  ${withMinistry.length}/${jobs.length} (${Math.round((withMinistry.length / jobs.length) * 100)}%)`
  );
  console.log(
    `   Agency:    ${withAgency.length}/${jobs.length} (${Math.round((withAgency.length / jobs.length) * 100)}%)`
  );
  console.log(
    `   Attachments: ${withAttachments.length}/${jobs.length} (${Math.round((withAttachments.length / jobs.length) * 100)}%)`
  );

  console.log("\n" + "─".repeat(80));
  console.log("\n🔍 Sample Data (First 3 Jobs):\n");

  jobs.slice(0, 3).forEach((job, idx) => {
    const data = job.detailPageData as any;
    console.log(`   ${idx + 1}. ${job.announcementTitle}`);
    console.log(`      Ministry: ${data?.ministry || "NULL"}`);
    console.log(`      Agency: ${data?.announcingAgency || "NULL"}`);
    console.log(`      Published: ${data?.publishedAt || "NULL"}`);
    console.log(`      Attachments: ${job.attachmentCount} files`);
    console.log("");
  });

  console.log("═".repeat(80));

  // Check if ready for processor
  const readyForProcessor = withMinistry.length > 0 && withAgency.length > 0;

  if (readyForProcessor) {
    console.log("\n✅ READY FOR PROCESSOR WORKER");
    console.log(
      "   Ministry and Agency fields are populated - category extraction will succeed!\n"
    );
    console.log("🚀 Run Processor Worker:");
    console.log(
      '   docker exec connect_dev_scraper npx tsx scripts/scrape-ntis-processor.ts --workerId july-test-worker --dateRange "2025-07-01 to 2025-07-10"\n'
    );
  } else {
    console.log("\n❌ NOT READY FOR PROCESSOR WORKER");
    console.log(
      "   Ministry/Agency fields are still NULL - selectors may need adjustment\n"
    );
  }

  console.log("═".repeat(80));

  await prisma.$disconnect();
}

verifyDiscoveryResults().catch(console.error);
