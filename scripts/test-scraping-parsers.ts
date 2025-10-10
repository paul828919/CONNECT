/**
 * Scraping Parser Test Script
 *
 * Tests all 4 agency parsers to verify:
 * - Deadline extraction
 * - Budget amount parsing
 * - Target type detection
 * - Description extraction
 * - TRL range extraction
 * - Eligibility criteria parsing
 *
 * Usage: npx tsx scripts/test-scraping-parsers.ts
 */

import { chromium } from 'playwright';
import { parseProgramDetails } from '../lib/scraping/parsers';

// Test URLs for each agency (update with real announcement URLs)
const testUrls = {
  iitp: 'https://www.iitp.kr/kr/1/business/business.it', // Replace with actual announcement URL
  keit: 'https://www.keit.re.kr/page?id=030101', // Replace with actual announcement URL
  tipa: 'https://www.tipa.or.kr/notice/notice.do', // Replace with actual announcement URL
  kimst: 'https://www.kimst.re.kr/business/notice', // Replace with actual announcement URL
};

async function testParser(agencyId: string, url: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🧪 Testing ${agencyId.toUpperCase()} Parser`);
  console.log(`${'='.repeat(60)}`);
  console.log(`URL: ${url}\n`);

  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();

    // Parse the page
    const details = await parseProgramDetails(page, agencyId, url);

    // Display results
    console.log('✅ Parsing Results:');
    console.log('─'.repeat(60));
    console.log(`Description: ${details.description ? `${details.description.substring(0, 100)}...` : '❌ None'}`);
    console.log(`Deadline: ${details.deadline ? `✅ ${details.deadline.toLocaleDateString('ko-KR')}` : '❌ None'}`);
    console.log(`Budget Amount: ${details.budgetAmount ? `✅ ₩${details.budgetAmount.toLocaleString()}` : '❌ None'}`);
    console.log(`Target Type: ${details.targetType}`);
    console.log(`TRL Range: ${details.minTRL && details.maxTRL ? `✅ ${details.minTRL}-${details.maxTRL}` : '❌ None'}`);
    console.log(`Eligibility Criteria: ${details.eligibilityCriteria ? `✅ ${JSON.stringify(details.eligibilityCriteria, null, 2)}` : '❌ None'}`);

    // Quality score
    let score = 0;
    if (details.description) score += 20;
    if (details.deadline) score += 30;
    if (details.budgetAmount) score += 30;
    if (details.minTRL && details.maxTRL) score += 10;
    if (details.eligibilityCriteria) score += 10;

    console.log('\n📊 Data Quality Score: ' + `${score}/100`.padStart(6));

    if (score >= 80) {
      console.log('✅ EXCELLENT - All critical fields extracted');
    } else if (score >= 60) {
      console.log('⚠️  GOOD - Some fields missing');
    } else if (score >= 40) {
      console.log('⚠️  FAIR - Major fields missing');
    } else {
      console.log('❌ POOR - Critical data extraction failed');
    }
  } catch (error: any) {
    console.error(`❌ Test failed: ${error.message}`);
  } finally {
    await browser.close();
  }
}

async function testAllParsers() {
  console.log('\n🚀 Starting Scraping Parser Tests');
  console.log(`${'='.repeat(60)}\n`);

  for (const [agencyId, url] of Object.entries(testUrls)) {
    await testParser(agencyId, url);
    await new Promise(resolve => setTimeout(resolve, 3000)); // 3-second delay between tests
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('✅ All parser tests completed!');
  console.log(`${'='.repeat(60)}\n`);

  console.log('📝 Next Steps:');
  console.log('1. Update test URLs with real announcement pages');
  console.log('2. If scores are low, adjust parser selectors');
  console.log('3. Test with multiple pages from each agency');
  console.log('4. Run manual scrape: POST /api/admin/scrape');
}

// Main execution
testAllParsers()
  .then(() => {
    console.log('\n✅ Test script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test script failed:', error);
    process.exit(1);
  });
