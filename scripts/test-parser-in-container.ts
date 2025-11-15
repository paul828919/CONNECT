/**
 * Test Parser Execution Inside Container
 *
 * This script tests the ACTUAL parser execution flow that the worker uses
 */

import { chromium } from 'playwright';
import { parseNTISAnnouncementDetails } from '../lib/scraping/parsers/ntis-announcement-parser';

async function testParserExecution() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('🧪 Testing Parser Execution (Container Environment)');
  console.log('═══════════════════════════════════════════════════════════\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    const url = 'https://www.ntis.go.kr/project/pjtInfo.do?pjtId=1711000032';
    const title = '2025년도 하반기 원자력정책연구사업 재공고';

    console.log(`📋 Title: ${title}`);
    console.log(`🔗 URL: ${url}\n`);

    console.log('🔄 Calling parseNTISAnnouncementDetails...\n');

    // Call the ACTUAL parser function that the worker uses
    const result = await parseNTISAnnouncementDetails(page, url, title);

    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 PARSER RESULT:');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log(`Category: ${result.category}`);
    console.log(`  Expected: ENERGY`);
    console.log(`  ${result.category === 'ENERGY' ? '✅ CORRECT' : '❌ WRONG'}\n`);

    console.log(`Keywords (${result.keywords?.length || 0}):`);
    console.log(`  ${(result.keywords || []).join(', ')}`);
    console.log(`  Contains "원자력": ${(result.keywords || []).includes('원자력') ? '✅ YES' : '❌ NO'}\n`);

    console.log(`Ministry: ${result.ministry}`);
    console.log(`Agency: ${result.announcingAgency}\n`);

    console.log('═══════════════════════════════════════════════════════════');
    if (result.category === 'ENERGY' && (result.keywords || []).includes('원자력')) {
      console.log('✅ SUCCESS: Parser returns correct values');
    } else {
      console.log('❌ FAILURE: Parser returns incorrect values');
    }
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await browser.close();
  }
}

testParserExecution().catch(console.error);
