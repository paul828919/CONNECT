/**
 * Analyze All Row Structures on NTIS Page
 */

import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('https://www.ntis.go.kr/rndgate/eg/un/ra/mng.do', { waitUntil: 'networkidle' });

  // Analyze ALL rows and their link structure
  const results = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('table tbody tr'));

    return rows.map((row, idx) => {
      const cells = Array.from(row.querySelectorAll('td'));
      const allLinks = Array.from(row.querySelectorAll('a'));

      return {
        rowIndex: idx + 1,
        columns: cells.length,
        firstCellText: cells[0]?.textContent?.trim().substring(0, 30) || '',
        totalLinks: allLinks.length,
        firstLink: allLinks[0] ? {
          text: allLinks[0].textContent?.trim().substring(0, 40),
          href: allLinks[0].getAttribute('href'),
        } : null,
      };
    });
  });

  console.log('Full Row Analysis:\n');
  console.log('Rows with 8 columns (announcements):');
  results.filter(r => r.columns === 8).forEach(r => {
    console.log(`  Row ${r.rowIndex}: ${r.totalLinks} links | First: "${r.firstLink?.text}" → ${r.firstLink?.href}`);
  });

  console.log('\nRows with other column counts:');
  results.filter(r => r.columns < 8 && r.columns > 0).forEach(r => {
    console.log(`  Row ${r.rowIndex}: ${r.columns} cols, ${r.totalLinks} links | "${r.firstCellText}"`);
  });

  await browser.close();
})();
