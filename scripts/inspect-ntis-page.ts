/**
 * NTIS Page Inspector
 * Inspects the HTML structure of NTIS announcement listing page
 * to determine the correct link selector for detail pages
 */

import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('🌐 Navigating to NTIS announcements page...');
  await page.goto('https://www.ntis.go.kr/rndgate/eg/un/ra/mng.do', {
    waitUntil: 'networkidle',
    timeout: 60000,
  });

  console.log('\n📋 Inspecting table structure...');

  // Get first 3 rows to analyze structure
  const rows = await page.$$('table tbody tr');
  console.log(`Found ${rows.length} table rows\n`);

  // Find rows with many columns (likely announcement data, not filters)
  console.log('Analyzing row structure to find announcement data...\n');

  const rowAnalysis = [];
  for (let i = 0; i < rows.length; i++) {
    const cells = await rows[i].$$('td');
    const firstCellText = cells.length > 0 ? (await cells[0].textContent())?.trim().substring(0, 40) : '';
    rowAnalysis.push({ index: i, columns: cells.length, firstCell: firstCellText });
  }

  // Print summary
  rowAnalysis.forEach((row) => {
    console.log(`Row ${row.index + 1}: ${row.columns} cols | "${row.firstCell}"`);
  });

  // Find rows with 6-8 columns (likely announcement data based on NTIS structure)
  const announcementRows = rowAnalysis.filter(r => r.columns >= 6 && r.columns <= 8);
  console.log(`\n📋 Found ${announcementRows.length} potential announcement rows\n`);

  // Inspect first 3 announcement rows
  for (const rowInfo of announcementRows.slice(0, 3)) {
    const i = rowInfo.index;
    console.log(`━━━━━━━━━━ Row ${i + 1} (${rowInfo.columns} columns) ━━━━━━━━━━`);

    const cells = await rows[i].$$('td');

    // Inspect each cell
    for (let j = 0; j < cells.length; j++) {
      const text = (await cells[j].textContent())?.trim().substring(0, 80) || '';
      const links = await cells[j].$$('a');

      console.log(`  Col ${j + 1}: ${text}`);

      if (links.length > 0) {
        for (let k = 0; k < links.length; k++) {
          const href = await links[k].getAttribute('href');
          const onclick = await links[k].getAttribute('onclick');
          const linkText = (await links[k].textContent())?.trim().substring(0, 60) || '';
          console.log(`    └─ Link ${k + 1}:`);
          console.log(`       text: "${linkText}"`);
          console.log(`       href: ${href}`);
          if (onclick) console.log(`       onclick: ${onclick.substring(0, 100)}`);
        }
      }
    }
    console.log('');
  }

  console.log('\n🔍 Testing selectors on announcement rows...');

  // If we found announcement rows, test selectors on them
  if (announcementRows.length > 0) {
    const firstAnnouncementIndex = announcementRows[0].index;

    const testResults = await page.$$eval(
      'table tbody tr',
      (rows, startIndex) => {
        return rows.slice(startIndex, startIndex + 3).map((row, idx) => {
          const allLinks = Array.from(row.querySelectorAll('a'));
          return {
            rowIndex: startIndex + idx,
            allLinks: allLinks.map((a) => ({
              text: a.textContent?.trim().substring(0, 60) || '',
              href: a.getAttribute('href') || '',
              onclick: a.getAttribute('onclick') || '',
            })),
          };
        });
      },
      firstAnnouncementIndex
    );

    testResults.forEach((result) => {
      console.log(`\nRow ${result.rowIndex + 1} - All links:`);
      result.allLinks.forEach((link, idx) => {
        console.log(`  Link ${idx + 1}:`);
        console.log(`    text: "${link.text}"`);
        console.log(`    href: ${link.href}`);
        if (link.onclick) console.log(`    onclick: ${link.onclick.substring(0, 80)}`);
      });
    });
  }

  await browser.close();
})();
