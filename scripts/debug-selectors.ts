/**
 * Debug Scraper Selectors
 * 
 * This script helps debug why the scraper finds 0 announcements.
 * It will:
 * 1. Visit each agency website
 * 2. Take screenshots
 * 3. Print the actual HTML structure
 * 4. Test if selectors match any elements
 * 
 * Usage: npx tsx scripts/debug-selectors.ts [agency]
 *        npx tsx scripts/debug-selectors.ts        (all agencies)
 *        npx tsx scripts/debug-selectors.ts iitp   (single agency)
 */

import { chromium, Browser, Page } from 'playwright';
import { scrapingConfig } from '../lib/scraping/config';
import * as fs from 'fs';
import * as path from 'path';

async function debugAgency(agencyId: string) {
  const config = scrapingConfig[agencyId];
  if (!config) {
    console.error(`❌ Agency '${agencyId}' not found in config`);
    return;
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log(`🔍 Debugging ${config.name} (${agencyId.toUpperCase()})`);
  console.log(`${'='.repeat(80)}\n`);

  const url = config.baseUrl + config.listingPath;
  console.log(`📍 URL: ${url}`);
  console.log(`🎯 Target Selector: ${config.selectors.announcementList}\n`);

  let browser: Browser | null = null;

  try {
    // Launch browser
    console.log('🚀 Launching browser...');
    browser = await chromium.launch({ 
      headless: false, // Show browser so you can see what's happening
      slowMo: 1000, // Slow down by 1 second so you can see actions
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 },
      locale: 'ko-KR',
      timezoneId: 'Asia/Seoul',
    });

    const page = await context.newPage();

    // Navigate
    console.log('🌐 Navigating to page...');
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    console.log('✅ Page loaded\n');

    // Take screenshot
    const screenshotDir = path.join(process.cwd(), 'logs', 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    
    const screenshotPath = path.join(screenshotDir, `${agencyId}-debug.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`📸 Screenshot saved: ${screenshotPath}\n`);

    // Test selector
    console.log('🎯 Testing announcement list selector...');
    const elements = await page.$$(config.selectors.announcementList);
    console.log(`   Found ${elements.length} elements matching '${config.selectors.announcementList}'`);

    if (elements.length === 0) {
      console.log('\n⚠️  No elements found! Let\'s inspect the page structure:\n');
      
      // Get common selectors that might contain announcements
      const commonSelectors = [
        'table tbody tr',
        '.board-list tbody tr',
        '.notice-list li',
        '.list-item',
        'ul li',
        '.table tbody tr',
        '[class*="list"] li',
        '[class*="board"] tr',
      ];

      console.log('🔎 Trying common announcement list patterns:\n');
      for (const selector of commonSelectors) {
        const count = await page.$$(selector);
        if (count.length > 0) {
          console.log(`   ✅ '${selector}' → ${count.length} elements`);
        }
      }

      // Print page HTML structure
      console.log('\n📄 Page HTML structure (first 100 lines):\n');
      const html = await page.content();
      const lines = html.split('\n').slice(0, 100);
      lines.forEach((line, i) => {
        console.log(`${(i + 1).toString().padStart(3)}: ${line.substring(0, 120)}`);
      });

      // Save full HTML
      const htmlPath = path.join(screenshotDir, `${agencyId}-debug.html`);
      fs.writeFileSync(htmlPath, html, 'utf8');
      console.log(`\n💾 Full HTML saved: ${htmlPath}`);

    } else {
      // Test sub-selectors
      console.log('\n🎯 Testing title and link selectors on first element:\n');
      
      const firstElement = elements[0];
      
      // Test title selector
      const titleEl = await firstElement.$(config.selectors.title);
      if (titleEl) {
        const titleText = await titleEl.textContent();
        console.log(`   ✅ Title selector '${config.selectors.title}' found:`);
        console.log(`      Text: ${titleText?.trim()}\n`);
      } else {
        console.log(`   ❌ Title selector '${config.selectors.title}' NOT FOUND\n`);
      }

      // Test link selector
      const linkEl = await firstElement.$(config.selectors.link);
      if (linkEl) {
        const href = await linkEl.getAttribute('href');
        console.log(`   ✅ Link selector '${config.selectors.link}' found:`);
        console.log(`      href: ${href}\n`);
      } else {
        console.log(`   ❌ Link selector '${config.selectors.link}' NOT FOUND\n`);
      }

      // Get HTML of first element
      const elementHtml = await firstElement.innerHTML();
      console.log('📋 First element HTML:\n');
      console.log(elementHtml.substring(0, 500));
      console.log('\n');
    }

    // Keep browser open for manual inspection
    console.log('🔍 Browser will stay open for 30 seconds for manual inspection...');
    console.log('   Press Ctrl+C to close immediately');
    await page.waitForTimeout(30000);

    await browser.close();
    console.log('\n✅ Debug complete!\n');

  } catch (error: any) {
    console.error(`\n❌ Error: ${error.message}\n`);
    if (browser) {
      await browser.close();
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    // Debug all agencies
    console.log('🔍 Debugging all agencies...\n');
    for (const agencyId of ['iitp', 'keit', 'tipa', 'kimst']) {
      await debugAgency(agencyId);
    }
  } else {
    // Debug single agency
    const agencyId = args[0].toLowerCase();
    await debugAgency(agencyId);
  }

  process.exit(0);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
