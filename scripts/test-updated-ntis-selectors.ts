import { chromium } from "playwright";

/**
 * Test Updated NTIS Selectors
 *
 * Verifies that the corrected selector patterns work correctly
 * on an actual NTIS detail page before re-running full scrape.
 */

async function testUpdatedSelectors() {
  console.log("🧪 Testing Updated NTIS Selectors\n");
  console.log("═".repeat(80));

  // Test URL from our sample
  const testUrl =
    "https://www.ntis.go.kr/rndgate/eg/un/ra/view.do?roRndUid=1243873&flag=rndList";

  console.log(`\n🔗 Test URL: ${testUrl}\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(testUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(2000);

    // Helper function
    const safeTextContent = async (
      selector: string,
      timeoutMs: number = 5000
    ): Promise<string | null> => {
      try {
        return (await page.textContent(selector, { timeout: timeoutMs }))?.trim() || null;
      } catch (error) {
        return null;
      }
    };

    console.log("─".repeat(80));
    console.log("\n📊 OLD SELECTORS (Table-based - INCORRECT):\n");

    const oldMinistry = await safeTextContent('th:has-text("부처명") + td');
    const oldAgency = await safeTextContent('th:has-text("공고기관명") + td');
    const oldPublished = await safeTextContent('th:has-text("공고일") + td');
    const oldDeadline = await safeTextContent('th:has-text("접수마감일") + td');

    console.log(`   Ministry (th + td):          ${oldMinistry || "❌ NULL"}`);
    console.log(`   Agency (th + td):            ${oldAgency || "❌ NULL"}`);
    console.log(`   Published (th + td):         ${oldPublished || "❌ NULL"}`);
    console.log(`   Deadline (th + td):          ${oldDeadline || "❌ NULL"}`);

    console.log("\n" + "─".repeat(80));
    console.log("\n📊 NEW SELECTORS (List-based - CORRECT):\n");

    // Test new selectors
    const ministryRaw = await safeTextContent('li:has-text("부처명")');
    const ministry = ministryRaw?.replace("부처명 :", "").trim() || null;

    const agencyRaw = await safeTextContent('li:has-text("공고기관명")');
    const announcingAgency = agencyRaw?.replace("공고기관명 :", "").trim() || null;

    const publishedAtRaw = await safeTextContent('li:has-text("공고일")');
    const publishedAt = publishedAtRaw?.replace("공고일 :", "").trim() || null;

    const deadlineRaw = await safeTextContent('li:has-text("마감일")');
    const deadline = deadlineRaw?.replace("마감일 :", "").trim() || null;

    const description = await safeTextContent(".content, .description, .summary");

    console.log(`   Ministry (li:has-text):      ${ministry || "❌ NULL"}`);
    console.log(`   Agency (li:has-text):        ${announcingAgency || "❌ NULL"}`);
    console.log(`   Published (li:has-text):     ${publishedAt || "❌ NULL"}`);
    console.log(`   Deadline (li:has-text):      ${deadline || "❌ NULL"}`);
    console.log(`   Description length:          ${description?.length || 0} chars`);

    console.log("\n" + "─".repeat(80));
    console.log("\n✅ VERIFICATION:\n");

    const allFieldsPresent =
      ministry !== null &&
      announcingAgency !== null &&
      publishedAt !== null;

    if (allFieldsPresent) {
      console.log("   ✅ All critical fields successfully extracted!");
      console.log(`\n   📋 Extracted Values:`);
      console.log(`      Ministry: ${ministry}`);
      console.log(`      Agency: ${announcingAgency}`);
      console.log(`      Published: ${publishedAt}`);
      console.log(`      Deadline: ${deadline || "(not found - may be in PDF)"}`);

      console.log("\n   🎯 Category Extraction Preview:");

      // Import and test category extraction
      const { extractCategoryFromMinistryAndAgency } = await import(
        "../lib/scraping/parsers/agency-mapper"
      );

      const categoryResult = extractCategoryFromMinistryAndAgency(
        ministry,
        announcingAgency
      );

      console.log(`      Category: ${categoryResult.category || "NULL"}`);
      console.log(`      Keywords: ${categoryResult.keywords.join(", ")}`);
      console.log(`      Source: ${categoryResult.source}`);
      console.log(`      Confidence: ${categoryResult.confidence}`);
      console.log(
        `      Requires Manual Review: ${categoryResult.requiresManualReview}`
      );
    } else {
      console.log("   ❌ FAILED - Some critical fields are still NULL");
      console.log(`      Ministry: ${ministry === null ? "NULL" : "OK"}`);
      console.log(
        `      Agency: ${announcingAgency === null ? "NULL" : "OK"}`
      );
      console.log(
        `      Published: ${publishedAt === null ? "NULL" : "OK"}`
      );
    }

    console.log("\n" + "═".repeat(80));

    if (allFieldsPresent) {
      console.log("\n✅ SUCCESS - Selectors are working correctly!");
      console.log(
        "   Ready to re-run Discovery Scraper with updated selectors."
      );
    } else {
      console.log("\n❌ FAILURE - Selectors still need adjustment");
      console.log("   Do not proceed with full scrape yet.");
    }

    console.log("\n" + "═".repeat(80));
  } finally {
    await browser.close();
  }
}

testUpdatedSelectors().catch(console.error);
