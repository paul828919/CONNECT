/**
 * Debug Script: Title Flow Through Parser
 *
 * This script helps diagnose why the announcement title is not being used
 * correctly in the NTIS parser for classification and keyword extraction.
 */

import { chromium } from 'playwright';

async function testTitleFlow() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔍 Testing Title Flow Through NTIS Parser');
  console.log('═══════════════════════════════════════════════════════════\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // Navigate to the Nuclear program detail page
    const url = 'https://www.ntis.go.kr/project/pjtInfo.do?pjtId=1711000032';
    const title = '2025년도 하반기 원자력정책연구사업 재공고';

    console.log(`📋 Announcement Title: ${title}`);
    console.log(`🔗 Detail Page URL: ${url}\n`);

    // Import the parser
    const { parseNTISAnnouncementDetails } = await import('../lib/scraping/parsers/ntis-announcement-parser');

    console.log('🔄 Calling parseNTISAnnouncementDetails with title parameter...\n');

    // Call parser with title
    const result = await parseNTISAnnouncementDetails(page, url, title);

    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 Parser Results:');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log(`✅ Category: ${result.category}`);
    console.log(`   Expected: ENERGY`);
    console.log(`   Match: ${result.category === 'ENERGY' ? '✓ YES' : '✗ NO'}\n`);

    console.log(`🏷️  Keywords (${result.keywords?.length || 0}):`);
    const keywords = result.keywords || [];
    console.log(`   ${keywords.join(', ')}`);
    console.log(`   Contains "원자력": ${keywords.includes('원자력') ? '✓ YES' : '✗ NO'}`);
    console.log(`   Contains ICT keywords: ${keywords.some(k => ['ICT', '정보통신', 'AI'].includes(k)) ? '⚠️  YES' : '✓ NO'}\n`);

    console.log(`🏛️  Ministry: ${result.ministry}`);
    console.log(`🏢 Agency: ${result.announcingAgency}`);
    console.log(`📅 Published: ${result.publishedAt?.toISOString() || 'N/A'}`);
    console.log(`📝 Description: ${result.description?.substring(0, 100)}...`);

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log(result.category === 'ENERGY' && keywords.includes('원자력')
      ? '✅ SUCCESS: Classification and keywords are correct!'
      : '❌ FAILURE: Classification or keywords are incorrect!');
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await browser.close();
  }
}

testTitleFlow().catch(console.error);
