import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

async function extractNtisHtml() {
  console.log("🔍 Extracting NTIS HTML for Analysis\n");
  console.log("═".repeat(80));

  // Get first July program with rawHtml
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
          announcementUrl: true,
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

  const detailData = program.scraping_job.detailPageData as {
    title: string;
    rawHtml: string;
    [key: string]: any;
  };

  console.log(`\n📄 Program: ${program.title}`);
  console.log(`📄 Announcement Title: ${program.scraping_job.announcementTitle}`);
  console.log(`🔗 URL: ${program.scraping_job.announcementUrl}`);
  console.log(`📊 HTML Size: ${detailData.rawHtml?.length || 0} characters\n`);

  // Save HTML to file for inspection
  const outputPath = path.join(
    process.cwd(),
    "data",
    "ntis-sample-detail-page.html"
  );

  // Ensure data directory exists
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, detailData.rawHtml);

  console.log(`✅ HTML saved to: ${outputPath}`);
  console.log(`\n📋 To inspect in browser:`);
  console.log(`   1. Open the file in your browser`);
  console.log(`   2. Right-click → Inspect Element`);
  console.log(`   3. Find the table rows containing:`);
  console.log(`      - 부처명 (Ministry)`);
  console.log(`      - 공고기관명 (Announcing Agency)`);
  console.log(`      - 접수마감일 (Deadline)`);
  console.log(`      - 공고일 (Published Date)`);

  console.log(`\n🔍 Quick HTML Preview (first 2000 chars):\n`);
  console.log("═".repeat(80));
  console.log(detailData.rawHtml.substring(0, 2000));
  console.log("═".repeat(80));

  // Try to find key patterns in HTML
  console.log(`\n🔎 Searching for key Korean terms in HTML:\n`);

  const searchTerms = [
    "부처명",
    "공고기관명",
    "접수마감일",
    "공고일",
    "사업명",
    "공고내용",
  ];

  searchTerms.forEach((term) => {
    const regex = new RegExp(`.{0,100}${term}.{0,100}`, "g");
    const matches = detailData.rawHtml.match(regex);

    if (matches && matches.length > 0) {
      console.log(`✅ Found "${term}":`);
      matches.slice(0, 2).forEach((match, idx) => {
        console.log(
          `   [${idx + 1}] ${match.replace(/\s+/g, " ").substring(0, 150)}...`
        );
      });
    } else {
      console.log(`❌ "${term}" not found in HTML`);
    }
  });

  console.log("\n" + "═".repeat(80));
  console.log(`\n📌 Annotation URL: ${program.scraping_job.announcementUrl}`);
  console.log(
    `💡 You can also visit this URL directly to inspect the live page structure.`
  );

  await prisma.$disconnect();
}

extractNtisHtml().catch(console.error);
