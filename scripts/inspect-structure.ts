/**
 * Detailed Element Inspector
 * 
 * Inspects the exact structure of announcement rows
 * to identify correct selectors for title and link.
 * 
 * Usage: npx tsx scripts/inspect-structure.ts [url]
 */

import { chromium } from 'playwright';

async function inspectStructure(url: string) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🔍 Inspecting: ${url}`);
  console.log(`${'='.repeat(80)}\n`);

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
  });

  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    console.log('✅ Page loaded\n');

    // Get all table rows
    const rows = await page.$$('table tbody tr');
    console.log(`📊 Found ${rows.length} table rows\n`);

    if (rows.length === 0) {
      console.log('❌ No rows found!\n');
      await browser.close();
      return;
    }

    // Inspect first 3 rows in detail
    for (let i = 0; i < Math.min(3, rows.length); i++) {
      console.log(`${'─'.repeat(80)}`);
      console.log(`📋 ROW ${i + 1} DETAILED STRUCTURE:`);
      console.log(`${'─'.repeat(80)}\n`);

      const row = rows[i];
      
      // Get all cells
      const cells = await row.$$('td');
      console.log(`   Columns: ${cells.length}\n`);

      // Inspect each cell
      for (let j = 0; j < cells.length; j++) {
        const cell = cells[j];
        const cellHtml = await cell.innerHTML();
        const cellText = await cell.textContent();
        const cellClass = await cell.getAttribute('class');

        console.log(`   📌 Column ${j + 1}:`);
        console.log(`      Class: ${cellClass || 'none'}`);
        console.log(`      Text: ${cellText?.trim().substring(0, 100)}`);
        
        // Check for links
        const links = await cell.$$('a');
        if (links.length > 0) {
          for (const link of links) {
            const href = await link.getAttribute('href');
            const linkText = await link.textContent();
            console.log(`      🔗 Link: ${linkText?.trim().substring(0, 80)}`);
            console.log(`         href: ${href?.substring(0, 100)}`);
          }
        }
        
        console.log(`      HTML: ${cellHtml.substring(0, 200)}\n`);
      }

      console.log('');
    }

    // Try to auto-detect selectors
    console.log(`${'='.repeat(80)}`);
    console.log('🎯 AUTO-DETECTED SELECTORS:');
    console.log(`${'='.repeat(80)}\n`);

    const firstRow = rows[0];
    
    // Try different selector patterns
    const selectorPatterns = [
      { title: 'td:nth-child(2) a', link: 'td:nth-child(2) a' },
      { title: 'td a', link: 'td a' },
      { title: '.comment-group0 a', link: '.comment-group0 a' },
      { title: 'td[class*="comment"] a', link: 'td[class*="comment"] a' },
    ];

    for (const pattern of selectorPatterns) {
      const titleEl = await firstRow.$(pattern.title);
      const linkEl = await firstRow.$(pattern.link);
      
      if (titleEl && linkEl) {
        const titleText = await titleEl.textContent();
        const linkHref = await linkEl.getAttribute('href');
        
        console.log(`✅ Pattern works: title='${pattern.title}', link='${pattern.link}'`);
        console.log(`   Title text: ${titleText?.trim().substring(0, 80)}`);
        console.log(`   Link href: ${linkHref?.substring(0, 100)}\n`);
      }
    }

    console.log('\n🔍 Browser will stay open for 60 seconds...');
    console.log('   Press Ctrl+C to close immediately\n');
    
    await page.waitForTimeout(60000);
    await browser.close();

  } catch (error: any) {
    console.error(`\n❌ Error: ${error.message}\n`);
    await browser.close();
  }
}

const url = process.argv[2];

if (!url) {
  console.log('\n❌ Please provide a URL\n');
  console.log('Usage: npx tsx scripts/inspect-structure.ts "https://example.com"\n');
  process.exit(1);
}

inspectStructure(url).catch(console.error);
