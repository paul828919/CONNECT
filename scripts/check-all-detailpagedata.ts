import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkAllJulyDetailData() {
  const jobs = await prisma.scraping_jobs.findMany({
    where: {
      dateRange: "2025-07-01 to 2025-07-31",
      processingStatus: "COMPLETED",
    },
    select: {
      id: true,
      announcementTitle: true,
      detailPageData: true,
    },
    take: 10,
  });

  console.log(`Checking first 10 completed jobs for detailPageData fields:\n`);

  jobs.forEach((job, idx) => {
    const data = job.detailPageData as Record<string, any>;
    const fieldsPresent = Object.keys(data).filter(
      (k) => data[k] != null && data[k] !== ""
    );

    console.log(
      `[${idx + 1}] ${job.announcementTitle.substring(0, 60)}...`
    );
    console.log(`    Fields present: ${fieldsPresent.join(", ")}`);
    console.log(`    ministry: ${data.ministry || "❌ NULL"}`);
    console.log(
      `    announcingAgency: ${data.announcingAgency || "❌ NULL"}`
    );
    console.log(`    description: ${data.description ? "✅ (length: " + data.description.length + ")" : "❌ NULL"}`);
    console.log(`    deadline: ${data.deadline || "❌ NULL"}`);
    console.log(`    publishedAt: ${data.publishedAt || "❌ NULL"}`);
    console.log();
  });

  console.log("\n═".repeat(80));
  console.log("Summary:");
  console.log(
    "If ALL programs show NULL for ministry/announcingAgency, the Discovery Scraper's"
  );
  console.log("CSS selectors are failing to match the NTIS HTML structure.");
  console.log("═".repeat(80));

  await prisma.$disconnect();
}

checkAllJulyDetailData().catch(console.error);
