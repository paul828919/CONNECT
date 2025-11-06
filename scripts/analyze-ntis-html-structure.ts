import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function analyzeNtisHtmlStructure() {
  console.log("🔍 Analyzing NTIS HTML Structure for Selector Patterns\n");
  console.log("═".repeat(80));

  const program = await prisma.funding_programs.findFirst({
    where: {
      scraping_job: {
        dateRange: "2025-07-01 to 2025-07-31",
      },
    },
    include: {
      scraping_job: {
        select: {
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
    rawHtml: string;
  };

  const html = detailData.rawHtml;

  console.log(`\n📊 Analyzing HTML Patterns:\n`);
  console.log("─".repeat(80));

  // Pattern 1: <li><span>부처명 : </span>VALUE</li>
  console.log(`\n1️⃣  Pattern: <li><span>LABEL : </span>VALUE</li>\n`);

  const patterns = [
    { label: "Ministry (부처명)", regex: /<li[^>]*>.*?<span[^>]*>부처명[^<]*<\/span>(.*?)<\/li>/gi },
    { label: "Agency (공고기관명)", regex: /<li[^>]*>.*?<span[^>]*>공고기관명[^<]*<\/span>(.*?)<\/li>/gi },
    { label: "Published Date (공고일)", regex: /<li[^>]*>.*?<span[^>]*>공고일[^<]*<\/span>(.*?)<\/li>/gi },
  ];

  patterns.forEach(({ label, regex }) => {
    const matches = html.match(regex);
    if (matches && matches.length > 0) {
      console.log(`   ✅ ${label}:`);
      matches.forEach((match, idx) => {
        // Extract value after </span>
        const valueMatch = match.match(/<\/span>(.*?)<\/li>/i);
        if (valueMatch) {
          const value = valueMatch[1].trim();
          console.log(`      [${idx + 1}] ${value}`);
        }
      });
    } else {
      console.log(`   ❌ ${label} - not found`);
    }
  });

  // More detailed extraction
  console.log(`\n─`.repeat(80));
  console.log(`\n2️⃣  Extracting with Context (200 chars around each field):\n`);

  const detailedPatterns = [
    { label: "부처명", term: "부처명" },
    { label: "공고기관명", term: "공고기관명" },
    { label: "공고일", term: "공고일" },
    { label: "사업명", term: "사업명" },
  ];

  detailedPatterns.forEach(({ label, term }) => {
    const index = html.indexOf(term);
    if (index !== -1) {
      const start = Math.max(0, index - 50);
      const end = Math.min(html.length, index + 150);
      const snippet = html.substring(start, end);
      console.log(`\n   ${label}:`);
      console.log(`   ${snippet.replace(/\s+/g, " ")}`);
    }
  });

  // Search for all <li> metadata fields
  console.log(`\n─`.repeat(80));
  console.log(`\n3️⃣  All Metadata Fields in <li> Elements:\n`);

  const liPattern = /<li[^>]*>.*?<span[^>]*>([^<:]+)[^<]*<\/span>(.*?)<\/li>/gi;
  const allFields = new Map<string, string>();

  let match;
  while ((match = liPattern.exec(html)) !== null) {
    const fieldName = match[1].trim();
    const fieldValue = match[2].replace(/<[^>]*>/g, "").trim();
    allFields.set(fieldName, fieldValue);
  }

  console.log(`   Total fields found: ${allFields.size}\n`);

  let counter = 1;
  allFields.forEach((value, field) => {
    if (counter <= 20) {
      console.log(
        `   ${counter}. ${field}: ${value.substring(0, 50)}${value.length > 50 ? "..." : ""}`
      );
      counter++;
    }
  });

  // Extract key values
  console.log(`\n${"═".repeat(80)}\n`);
  console.log(`🎯 EXTRACTED VALUES:\n`);

  const ministry = allFields.get("부처명");
  const agency = allFields.get("공고기관명");
  const publishedDate = allFields.get("공고일");
  const programName = allFields.get("사업명");

  console.log(`   ✅ Ministry (부처명): ${ministry || "❌ NOT FOUND"}`);
  console.log(`   ✅ Agency (공고기관명): ${agency || "❌ NOT FOUND"}`);
  console.log(`   ✅ Published Date (공고일): ${publishedDate || "❌ NOT FOUND"}`);
  console.log(`   ✅ Program Name (사업명): ${programName || "❌ NOT FOUND"}`);

  // Search for deadline patterns
  console.log(`\n─`.repeat(80));
  console.log(`\n4️⃣  Searching for Deadline Patterns:\n`);

  const deadlineTerms = ["접수마감일", "마감일", "신청마감", "접수기간", "신청기간"];

  deadlineTerms.forEach((term) => {
    const found = allFields.get(term);
    if (found) {
      console.log(`   ✅ ${term}: ${found}`);
    } else {
      // Search in raw HTML
      if (html.includes(term)) {
        console.log(`   ⚠️  ${term} exists in HTML but not in <li> structure`);
        const index = html.indexOf(term);
        const snippet = html.substring(index, index + 100).replace(/\s+/g, " ");
        console.log(`      Context: ${snippet}...`);
      } else {
        console.log(`   ❌ ${term} not found`);
      }
    }
  });

  // Search for description/content
  console.log(`\n─`.repeat(80));
  console.log(`\n5️⃣  Searching for Description/Content Sections:\n`);

  const descriptionPatterns = [
    { label: "공고내용", regex: /공고내용[\s\S]{0,50}?>([\s\S]{200,500}?)</gi },
    { label: "사업개요", regex: /사업개요[\s\S]{0,50}?>([\s\S]{200,500}?)</gi },
    { label: "지원내용", regex: /지원내용[\s\S]{0,50}?>([\s\S]{200,500}?)</gi },
  ];

  descriptionPatterns.forEach(({ label, regex }) => {
    const matches = html.match(regex);
    if (matches && matches.length > 0) {
      console.log(`   ✅ Found "${label}" section`);
      const firstMatch = matches[0].replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
      console.log(`      Preview: ${firstMatch.substring(0, 150)}...`);
    } else {
      console.log(`   ❌ "${label}" pattern not found`);
    }
  });

  console.log(`\n${"═".repeat(80)}\n`);
  console.log(`📋 SUMMARY & RECOMMENDATIONS:\n`);

  console.log(`   Current Discovery Scraper uses:`);
  console.log(`   ❌ th:has-text("부처명") + td  (Playwright selector)`);
  console.log(`      → This assumes <th><td> table structure\n`);

  console.log(`   Actual NTIS structure uses:`);
  console.log(`   ✅ <li><span>부처명 : </span>VALUE</li>`);
  console.log(`      → This is a list structure, not a table!\n`);

  console.log(`   🔧 Required Playwright selectors:`);
  console.log(`      Ministry:        li:has-text("부처명")`);
  console.log(`      Agency:          li:has-text("공고기관명")`);
  console.log(`      Published Date:  li:has-text("공고일")`);
  console.log(`      Program Name:    li:has-text("사업명")\n`);

  console.log(`   ⚙️  Text extraction method:`);
  console.log(`      const fullText = await element.textContent();`);
  console.log(`      const value = fullText.replace("부처명 :", "").trim();\n`);

  console.log("═".repeat(80));

  await prisma.$disconnect();
}

analyzeNtisHtmlStructure().catch(console.error);
