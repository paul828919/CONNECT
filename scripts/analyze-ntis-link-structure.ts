/**
 * Analyze NTIS attachment link structure (Oct 30, 2025)
 *
 * Purpose: Understand how NTIS attachment links work to fix navigation bug
 * - What is the href attribute?
 * - What is the onclick attribute?
 * - What causes navigation to about:blank after dialog dismiss?
 */

import { chromium } from 'playwright';

async function analyzeLinks() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('🔍 Navigating to problematic NTIS announcement...\n');
    await page.goto('https://www.ntis.go.kr/rndgate/eg/un/ra/view.do?roRndUid=1243450');
    await page.waitForTimeout(2000);

    // Extract attachment link details
    const linkDetails = await page.evaluate(() => {
      const allElements = Array.from(document.querySelectorAll('*'));
      const attachmentHeader = allElements.find((el) => el.textContent?.trim() === '첨부파일');

      if (!attachmentHeader) return [];

      const container = attachmentHeader.parentElement;
      if (!container) return [];

      const links = container.querySelectorAll('a');
      const details: any[] = [];

      links.forEach((link) => {
        const fileName = link.textContent?.trim() || '';
        if (fileName && /\.(pdf|hwp|hwpx|zip|doc|docx)$/i.test(fileName)) {
          details.push({
            fileName,
            href: link.getAttribute('href'),
            onclick: link.getAttribute('onclick'),
            target: link.getAttribute('target'),
            outerHTML: link.outerHTML.substring(0, 200),
          });
        }
      });

      return details;
    });

    console.log('📎 NTIS Attachment Link Analysis:\n');
    linkDetails.forEach((link, idx) => {
      console.log(`   ${idx + 1}. ${link.fileName}`);
      console.log(`      - href: ${link.href}`);
      console.log(`      - onclick: ${link.onclick}`);
      console.log(`      - target: ${link.target || '(none)'}`);
      console.log(`      - HTML preview: ${link.outerHTML}...`);
      console.log('');
    });

    // Now let's see what happens when we click the first link
    console.log('🖱️  Simulating click on first attachment...\n');

    const dialogPromise = new Promise((resolve) => {
      page.once('dialog', async (dialog) => {
        console.log(`   Dialog appeared: "${dialog.message()}"`);
        console.log(`   Dialog type: ${dialog.type()}`);
        await dialog.accept();
        console.log(`   Dialog accepted\n`);
        resolve(true);
      });
    });

    const navigationPromise = new Promise((resolve) => {
      page.once('framenavigated', (frame) => {
        if (frame === page.mainFrame()) {
          console.log(`   🚨 PAGE NAVIGATED TO: ${frame.url()}`);
          resolve(frame.url());
        }
      });
    });

    // Click first attachment
    await page.click(`a:has-text("${linkDetails[0].fileName}")`);

    // Wait for either dialog or navigation
    await Promise.race([
      dialogPromise,
      navigationPromise,
      page.waitForTimeout(3000),
    ]);

    await page.waitForTimeout(1000);

    const currentUrl = page.url();
    console.log(`   Current URL after click: ${currentUrl}\n`);

    if (currentUrl.includes('about:blank')) {
      console.log('   ⚠️  CONFIRMED: Page navigated to about:blank after dialog dismiss!\n');
    } else if (currentUrl.includes('ntis.go.kr')) {
      console.log('   ✓ Page stayed on NTIS domain\n');
    }

  } finally {
    console.log('Press Ctrl+C to close browser and exit...');
    await new Promise(() => {}); // Keep browser open for manual inspection
  }
}

analyzeLinks();
