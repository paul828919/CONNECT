import { chromium } from "playwright";

/**
 * Quick Selector Verification
 * Tests that the updated selectors work correctly in the rebuilt container
 */

async function quickVerification() {
  console.log("🔬 Quick Selector Verification in Container\n");
  console.log("═".repeat(80));

  const testUrl = "https://www.ntis.go.kr/rndgate/eg/un/ra/view.do?roRndUid=1243873";

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(testUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(2000);

    // Test updated selectors
    const ministryRaw = await page.textContent('li:has-text("부처명")', { timeout: 5000 });
    const ministry = ministryRaw?.replace("부처명 :", "").trim() || null;

    const agencyRaw = await page.textContent('li:has-text("공고기관명")', { timeout: 5000 });
    const agency = agencyRaw?.replace("공고기관명 :", "").trim() || null;

    const publishedRaw = await page.textContent('li:has-text("공고일")', { timeout: 5000 });
    const published = publishedRaw?.replace("공고일 :", "").trim() || null;

    console.log("\n✅ VERIFICATION RESULTS:\n");
    console.log(`   Ministry:  ${ministry || "❌ FAILED"}`);
    console.log(`   Agency:    ${agency || "❌ FAILED"}`);
    console.log(`   Published: ${published || "❌ FAILED"}`);

    const success = ministry !== null && agency !== null && published !== null;

    console.log("\n" + "═".repeat(80));

    if (success) {
      console.log("\n✅ SUCCESS - Container has correct selector code!");
      console.log("   Ready to run Discovery Scraper with July 1-10 date range.\n");
    } else {
      console.log("\n❌ FAILURE - Selectors still not working!");
      console.log("   DO NOT proceed with Discovery Scraper.\n");
    }

    console.log("═".repeat(80));
  } finally {
    await browser.close();
  }
}

quickVerification().catch(console.error);
