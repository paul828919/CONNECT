/**
 * URL Discovery Tool
 * 
 * This tool helps you manually discover the correct announcement URLs
 * for each government agency.
 * 
 * Usage:
 * 1. Visit each agency's website manually in your browser
 * 2. Navigate to their "사업공고" or "공지사항" (announcements) page
 * 3. Copy the URL
 * 4. Update this file with the correct URLs
 * 5. Run: npx tsx scripts/test-url.ts [url]
 * 
 * Example:
 *   npx tsx scripts/test-url.ts "https://www.iitp.kr/kr/1/business/announce/list.it"
 */

import { chromium } from 'playwright';

async function testUrl(url: string) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🔍 Testing URL: ${url}`);
  console.log(`${'='.repeat(80)}\n`);

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
  });

  const page = await context.newPage();

  try {
    console.log('🌐 Loading page...');
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

    // Check if it's an error page
    const title = await page.title();
    console.log(`📄 Page Title: ${title}`);

    if (title.includes('에러') || title.includes('Error') || title.includes('404')) {
      console.log('❌ This appears to be an error page!\n');
      await browser.close();
      return;
    }

    console.log('✅ Page loaded successfully!\n');

    // Try to find common announcement patterns
    const patterns = [
      { selector: 'table tbody tr', description: 'Table rows' },
      { selector: '.board-list tbody tr', description: 'Board list table rows' },
      { selector: '.notice-list li', description: 'Notice list items' },
      { selector: '[class*="list"] tbody tr', description: 'Any list table rows' },
      { selector: 'ul.board li', description: 'Board ul items' },
      { selector: '.list-group-item', description: 'Bootstrap list items' },
    ];

    console.log('🔎 Searching for announcement elements:\n');

    for (const pattern of patterns) {
      const elements = await page.$$(pattern.selector);
      if (elements.length > 0) {
        console.log(`   ✅ '${pattern.selector}' → ${elements.length} elements (${pattern.description})`);

        // Get first element's HTML
        if (elements[0]) {
          const html = await elements[0].innerHTML();
          console.log(`      First element sample: ${html.substring(0, 150)}...\n`);
        }
      }
    }

    console.log('\n📸 Taking screenshot...');
    await page.screenshot({ path: `logs/screenshots/test-${Date.now()}.png`, fullPage: true });

    console.log('🔍 Browser will stay open for 60 seconds for manual inspection...');
    console.log('   Look at the page and identify:');
    console.log('   1. The selector for announcement rows');
    console.log('   2. The selector for announcement title');
    console.log('   3. The selector for announcement link');
    console.log('\n   Press Ctrl+C to close immediately\n');
    
    await page.waitForTimeout(60000);

    await browser.close();
    console.log('\n✅ Test complete!\n');

  } catch (error: any) {
    console.error(`\n❌ Error: ${error.message}\n`);
    await browser.close();
  }
}

// Main
const url = process.argv[2];

if (!url) {
  console.log('\n❌ Error: Please provide a URL to test\n');
  console.log('Usage: npx tsx scripts/test-url.ts "https://example.com/announcements"\n');
  console.log('📚 Known agency websites:\n');
  console.log('   IITP:  https://www.iitp.kr');
  console.log('   KEIT:  https://www.keit.re.kr');
  console.log('   TIPA:  https://www.tipa.or.kr');
  console.log('   KIMST: https://www.kimst.re.kr\n');
  console.log('🎯 Steps to find announcement URLs:\n');
  console.log('   1. Visit the agency website in your browser');
  console.log('   2. Look for "사업공고" or "공지사항" in the menu');
  console.log('   3. Click on it and copy the URL');
  console.log('   4. Test with: npx tsx scripts/test-url.ts "[URL]"\n');
  process.exit(1);
}

testUrl(url).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
