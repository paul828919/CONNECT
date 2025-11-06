import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function investigateMissingFields() {
  console.log("🔍 Investigating Missing Category/Agency/Keywords\n");
  console.log("═".repeat(80));

  // Get first 3 July programs with details
  const samplePrograms = await prisma.funding_programs.findMany({
    where: {
      scraping_job: {
        dateRange: "2025-07-01 to 2025-07-31",
      },
    },
    take: 3,
    select: {
      id: true,
      title: true,
      category: true,
      announcingAgency: true,
      keywords: true,
      agencyId: true,
      ministry: true,
      announcementType: true,
      minTrl: true,
      maxTrl: true,
      budgetAmount: true,
      deadline: true,
      scraping_job: {
        select: {
          id: true,
          announcementTitle: true,
          announcementUrl: true,
          attachmentFilenames: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  console.log(`\n📄 Sample Programs (First 3):\n`);
  samplePrograms.forEach((program, index) => {
    console.log(`\n[${index + 1}] ${program.title || "Untitled"}`);
    console.log(`    ID: ${program.id}`);
    console.log(`    Category: ${program.category || "❌ NULL"}`);
    console.log(`    Agency (announcingAgency): ${program.announcingAgency || "❌ NULL"}`);
    console.log(`    Keywords: ${program.keywords?.length || 0} items - ${program.keywords || "❌ EMPTY ARRAY"}`);
    console.log(`    Agency ID (enum): ${program.agencyId}`);
    console.log(`    Ministry: ${program.ministry || "NULL"}`);
    console.log(`    Announcement Type: ${program.announcementType}`);
    console.log(`    TRL: ${program.minTrl}-${program.maxTrl}`);
    console.log(`    Budget: ${program.budgetAmount || "NULL"}`);
    console.log(`    Deadline: ${program.deadline || "NULL"}`);
    console.log(`    Attachments: ${program.scraping_job?.attachmentFilenames?.join(", ") || "None"}`);
  });

  // Check extraction logs for these programs
  console.log("\n\n" + "═".repeat(80));
  console.log("📊 Extraction Logs for Sample Programs:\n");

  for (const program of samplePrograms) {
    const logs = await prisma.extraction_logs.findMany({
      where: {
        scrapingJobId: program.scraping_job?.id,
      },
      select: {
        field: true,
        value: true,
        dataSource: true,
        confidence: true,
        extractionPattern: true,
        attemptedSources: true,
        failureReason: true,
        contextSnippet: true,
      },
      orderBy: { createdAt: "asc" },
    });

    console.log(`\n[${program.title || "Untitled"}]`);
    console.log(`  Total extraction logs: ${logs.length}`);

    // Group by field
    const fieldGroups = new Map<string, typeof logs>();
    logs.forEach((log) => {
      const existing = fieldGroups.get(log.field) || [];
      existing.push(log);
      fieldGroups.set(log.field, existing);
    });

    fieldGroups.forEach((fieldLogs, fieldName) => {
      console.log(`\n  Field: ${fieldName}`);
      fieldLogs.forEach((log, idx) => {
        console.log(`    [${idx + 1}] Value: ${log.value || "❌ NULL"}`);
        console.log(`        Source: ${log.dataSource}`);
        console.log(`        Confidence: ${log.confidence}`);
        if (log.extractionPattern) {
          console.log(`        Pattern: ${log.extractionPattern}`);
        }
        if (log.failureReason) {
          console.log(`        Failure: ${log.failureReason.substring(0, 100)}...`);
        }
        if (log.contextSnippet) {
          console.log(`        Context: ${log.contextSnippet.substring(0, 80)}...`);
        }
      });
    });
  }

  console.log("\n\n" + "═".repeat(80));

  await prisma.$disconnect();
}

investigateMissingFields().catch(console.error);
