/**
 * Inspect NTIS Page Structure for Attachments
 *
 * This script takes screenshots and inspects the full DOM structure
 * to understand where attachments might be located.
 */

import { chromium } from 'playwright';

async function inspectNTISPageStructure() {
  console.log('🔍 Inspecting NTIS Page Structure\n');

  const browser = await chromium.launch({ headless: false }); // Run with UI
  const page = await browser.newPage();

  try {
    const testUrl =
      'https://www.ntis.go.kr/rndgate/eg/un/ra/view.do?roRndUid=1199437&flag=rndList';

    console.log(`📄 Navigating to: ${testUrl}\n`);
    await page.goto(testUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Take initial screenshot
    await page.screenshot({ path: '.playwright-mcp/ntis-page-structure-1.png', fullPage: true });
    console.log('✓ Screenshot saved: ntis-page-structure-1.png\n');

    // Look for tabs, buttons, or sections related to attachments
    console.log('🔍 Searching for attachment-related UI elements:\n');

    // Check for tabs
    const tabs = await page.$$eval(
      'button, a.tab, li.tab, div[role="tab"]',
      (elements) => {
        return elements.map((el) => ({
          text: el.textContent?.trim() || '',
          tag: el.tagName.toLowerCase(),
          classes: el.className,
        }));
      }
    );

    console.log(`📑 Found ${tabs.length} tab-like elements:`);
    tabs.slice(0, 10).forEach((tab, i) => {
      console.log(`  [${i + 1}] ${tab.tag}.${tab.classes}: "${tab.text}"`);
    });

    // Check for download buttons
    const downloadButtons = await page.$$eval(
      'button, a, input[type="button"]',
      (elements) => {
        return elements
          .map((el) => ({
            text: el.textContent?.trim() || '',
            onclick: (el as HTMLElement).onclick?.toString() || '',
          }))
          .filter(
            ({ text, onclick }) =>
              /다운로드|첨부|파일|공고문|신청서/i.test(text) ||
              /download|file|attach/i.test(onclick)
          );
      }
    );

    console.log(`\n🔘 Found ${downloadButtons.length} download-related buttons:`);
    downloadButtons.slice(0, 10).forEach((btn, i) => {
      console.log(`  [${i + 1}] "${btn.text}"`);
    });

    // Check for file lists or tables
    const fileTables = await page.$$eval('table, ul, ol', (elements) => {
      return elements
        .map((el) => {
          const text = el.textContent?.trim() || '';
          const hasFileKeyword = /첨부|파일|다운로드|공고문|신청서|\.hwp|\.pdf/i.test(text);
          if (hasFileKeyword && text.length < 500) {
            return {
              tag: el.tagName.toLowerCase(),
              preview: text.substring(0, 150),
            };
          }
          return null;
        })
        .filter(Boolean);
    });

    console.log(`\n📋 Found ${fileTables.length} file-related tables/lists:`);
    fileTables.slice(0, 5).forEach((table, i) => {
      console.log(`  [${i + 1}] <${table!.tag}>: ${table!.preview}...`);
    });

    // Check for iframes (attachments might be in iframe)
    const iframes = await page.$$eval('iframe', (frames) => {
      return frames.map((frame) => ({
        src: (frame as HTMLIFrameElement).src,
        id: frame.id,
        name: (frame as HTMLIFrameElement).name,
      }));
    });

    console.log(`\n🖼️  Found ${iframes.length} iframes:`);
    iframes.forEach((iframe, i) => {
      console.log(`  [${i + 1}] src: ${iframe.src}, id: ${iframe.id}, name: ${iframe.name}`);
    });

    // Get page title and main headings
    const title = await page.title();
    const headings = await page.$$eval('h1, h2, h3', (elements) =>
      elements.map((el) => ({
        tag: el.tagName.toLowerCase(),
        text: el.textContent?.trim() || '',
      }))
    );

    console.log(`\n📌 Page Title: ${title}`);
    console.log(`\n📌 Main Headings:`);
    headings.slice(0, 5).forEach((h, i) => {
      console.log(`  [${i + 1}] <${h.tag}>: ${h.text}`);
    });

    // Check for any elements with "file" or "attach" in id/class
    const fileElements = await page.$$eval('[id*="file"], [class*="file"], [id*="attach"], [class*="attach"]', elements => {
      return elements.map(el => ({
        tag: el.tagName.toLowerCase(),
        id: el.id,
        classes: el.className,
        text: el.textContent?.trim().substring(0, 100) || '',
      }));
    });

    console.log(`\n🎯 Found ${fileElements.length} elements with 'file' or 'attach' in id/class:`);
    fileElements.slice(0, 10).forEach((el, i) => {
      console.log(`  [${i + 1}] <${el.tag}> id="${el.id}" class="${el.classes}"`);
      console.log(`      Text: ${el.text}`);
    });

    console.log('\n✓ Inspection complete. Check screenshot for visual reference.');
    console.log('⏸️  Browser will remain open for 30 seconds for manual inspection...');

    await page.waitForTimeout(30000);
  } catch (error: any) {
    console.error('\n❌ Inspection failed:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

inspectNTISPageStructure().catch(console.error);
