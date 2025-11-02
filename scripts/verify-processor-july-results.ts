import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function verifyProcessorResults() {
  console.log("📊 Processor Worker Results Verification\n");
  console.log("═".repeat(80));

  // Get all scraping_jobs for July 1-10 that have been processed
  const julyScrapingJobs = await prisma.scraping_jobs.findMany({
    where: {
      dateRange: "2025-07-01 to 2025-07-10",
      processingStatus: "COMPLETED",
      fundingProgramId: {
        not: null,
      },
    },
    include: {
      fundingProgram: true,
    },
    orderBy: {
      processedAt: "desc",
    },
  });

  // Extract the funding_programs from the scraping_jobs
  const julyPrograms = julyScrapingJobs
    .map((job) => job.fundingProgram)
    .filter((p) => p !== null) as any[];

  console.log(`\n✅ Total Programs Created: ${julyPrograms.length}\n`);

  if (julyPrograms.length === 0) {
    console.log("❌ No funding_programs found for July 1-10, 2025 date range\n");
    console.log("═".repeat(80));
    await prisma.$disconnect();
    return;
  }

  // Calculate field population statistics
  const withCategory = julyPrograms.filter((p) => p.category !== null);
  const withMinistry = julyPrograms.filter((p) => p.ministry !== null);
  const withAgency = julyPrograms.filter((p) => p.announcingAgency !== null);
  const withKeywords = julyPrograms.filter(
    (p) => p.keywords !== null && p.keywords.length > 0
  );
  const withStartDate = julyPrograms.filter((p) => p.applicationStart !== null);
  const withDeadline = julyPrograms.filter((p) => p.applicationDeadline !== null);

  console.log("📈 Field Population:\n");
  console.log(
    `   Category:         ${withCategory.length}/${julyPrograms.length} (${Math.round((withCategory.length / julyPrograms.length) * 100)}%)`
  );
  console.log(
    `   Ministry:         ${withMinistry.length}/${julyPrograms.length} (${Math.round((withMinistry.length / julyPrograms.length) * 100)}%)`
  );
  console.log(
    `   Agency:           ${withAgency.length}/${julyPrograms.length} (${Math.round((withAgency.length / julyPrograms.length) * 100)}%)`
  );
  console.log(
    `   Keywords:         ${withKeywords.length}/${julyPrograms.length} (${Math.round((withKeywords.length / julyPrograms.length) * 100)}%)`
  );
  console.log(
    `   Start Date:       ${withStartDate.length}/${julyPrograms.length} (${Math.round((withStartDate.length / julyPrograms.length) * 100)}%)`
  );
  console.log(
    `   Deadline:         ${withDeadline.length}/${julyPrograms.length} (${Math.round((withDeadline.length / julyPrograms.length) * 100)}%)`
  );

  console.log("\n" + "─".repeat(80));
  console.log("\n🔍 Sample Data (First 3 Programs):\n");

  julyPrograms.slice(0, 3).forEach((program, idx) => {
    console.log(`   ${idx + 1}. ${program.title}`);
    console.log(`      Category: ${program.category || "NULL"}`);
    console.log(`      Ministry: ${program.ministry || "NULL"}`);
    console.log(`      Agency: ${program.announcingAgency || "NULL"}`);
    console.log(
      `      Keywords: ${program.keywords && program.keywords.length > 0 ? program.keywords.join(", ") : "NULL"}`
    );
    console.log(
      `      Start Date: ${program.applicationStart?.toISOString().split("T")[0] || "NULL"}`
    );
    console.log(
      `      Deadline: ${program.applicationDeadline?.toISOString().split("T")[0] || "NULL"}`
    );
    console.log(`      Source: ${program.sourceUrl}`);
    console.log("");
  });

  console.log("═".repeat(80));

  // Category distribution breakdown
  if (withCategory.length > 0) {
    console.log("\n📊 Category Distribution:\n");
    const categoryCount: Record<string, number> = {};
    withCategory.forEach((p) => {
      const cat = p.category!;
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    });

    Object.entries(categoryCount)
      .sort(([, a], [, b]) => b - a)
      .forEach(([category, count]) => {
        console.log(
          `   ${category}: ${count} (${Math.round((count / withCategory.length) * 100)}%)`
        );
      });

    console.log("\n" + "═".repeat(80));
  }

  // Final assessment
  const categoryRate = (withCategory.length / julyPrograms.length) * 100;
  const keywordRate = (withKeywords.length / julyPrograms.length) * 100;

  console.log("\n📊 ASSESSMENT:\n");

  if (categoryRate >= 90 && keywordRate >= 90) {
    console.log("✅ EXCELLENT - Category/keyword population exceeds 90%");
    console.log("   Processor Worker is functioning correctly!");
  } else if (categoryRate >= 70 && keywordRate >= 70) {
    console.log(
      "⚠️  ACCEPTABLE - Category/keyword population 70-90% (some agencies may be unmapped)"
    );
    console.log(
      "   Review unmapped agencies and update category mapping if needed."
    );
  } else {
    console.log("❌ POOR - Category/keyword population below 70%");
    console.log("   Investigation required - check processor logs for errors.");
  }

  console.log("\n" + "═".repeat(80));

  await prisma.$disconnect();
}

verifyProcessorResults().catch(console.error);
