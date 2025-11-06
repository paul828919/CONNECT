import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkDetailPageData() {
  console.log("🔍 Checking detailPageData Structure\n");
  console.log("═".repeat(80));

  // Get first July program
  const program = await prisma.funding_programs.findFirst({
    where: {
      scraping_job: {
        dateRange: "2025-07-01 to 2025-07-31",
      },
    },
    include: {
      scraping_job: {
        select: {
          id: true,
          announcementTitle: true,
          detailPageData: true,
        },
      },
    },
  });

  if (!program || !program.scraping_job) {
    console.log("❌ No program found");
    await prisma.$disconnect();
    return;
  }

  console.log(`\nProgram: ${program.title}`);
  console.log(`Scraping Job ID: ${program.scraping_job.id}`);
  console.log(`\n📊 DetailPageData Structure:\n`);

  const detailData = program.scraping_job.detailPageData as Record<string, any>;

  console.log(JSON.stringify(detailData, null, 2));

  console.log(`\n\n🔍 Key Fields Present:\n`);
  console.log(`  ministry: ${detailData.ministry ? "✅ " + detailData.ministry : "❌ NULL"}`);
  console.log(`  announcingAgency: ${detailData.announcingAgency ? "✅ " + detailData.announcingAgency : "❌ NULL"}`);
  console.log(`  title: ${detailData.title ? "✅" : "❌ NULL"}`);
  console.log(`  description: ${detailData.description ? "✅ (length: " + detailData.description.length + ")" : "❌ NULL"}`);
  console.log(`  deadline: ${detailData.deadline ? "✅" : "❌ NULL"}`);

  console.log("\n" + "═".repeat(80));

  await prisma.$disconnect();
}

checkDetailPageData().catch(console.error);
