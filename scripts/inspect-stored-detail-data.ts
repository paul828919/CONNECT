import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function inspectStoredData() {
  console.log("🔍 Inspecting Stored detailPageData\n");
  console.log("═".repeat(80));

  const job = await prisma.scraping_jobs.findFirst({
    where: {
      dateRange: "2025-07-01 to 2025-07-10",
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (!job) {
    console.log("❌ No jobs found for date range 2025-07-01 to 2025-07-10");
    await prisma.$disconnect();
    return;
  }

  console.log(`\n📋 Job Details:\n`);
  console.log(`   Title: ${job.announcementTitle}`);
  console.log(`   URL: ${job.announcementUrl}`);
  console.log(`   Attachment Count: ${job.attachmentCount}`);
  console.log(`   Scraping Status: ${job.scrapingStatus}`);

  console.log("\n" + "─".repeat(80));
  console.log("\n🔬 Inspecting detailPageData:\n");

  // Prisma stores JSON as object, not string
  const data = job.detailPageData as any;

  console.log(`   Data Type: ${typeof data}`);
  console.log(`   Is Object: ${typeof data === "object" && data !== null}`);

  if (typeof data === "object" && data !== null) {
    console.log("\n📊 Stored Fields:");
    console.log(`   title: ${data.title || "NULL"}`);
    console.log(`   ministry: ${data.ministry || "NULL"}`);
    console.log(`   announcingAgency: ${data.announcingAgency || "NULL"}`);
    console.log(`   publishedAt: ${data.publishedAt || "NULL"}`);
    console.log(`   deadline: ${data.deadline || "NULL"}`);
    console.log(`   description length: ${data.description?.length || 0} chars`);
    console.log(`   attachments: ${data.attachments?.length || 0} items`);
    console.log(`   rawHtml length: ${data.rawHtml?.length || 0} chars`);

    // Show full object keys
    console.log("\n🔑 Available Keys:");
    console.log(`   ${Object.keys(data).join(", ")}`);
  } else {
    console.log(`❌ Unexpected data type: ${typeof data}`);
  }

  console.log("\n" + "═".repeat(80));

  await prisma.$disconnect();
}

inspectStoredData().catch(console.error);
