/**
 * Debug NTIS Detail Page Structure
 * Inspects an actual NTIS announcement detail page to understand the HTML structure
 * and identify why field extraction is failing
 */
import { chromium } from 'playwright';

const TEST_URL = 'https://www.ntis.go.kr/rndgate/eg/un/ra/view.do?roRndUid=1249723&flag=rndList';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('🌐 Navigating to NTIS detail page...\n');
    console.log(`URL: ${TEST_URL}\n`);

    await page.goto(TEST_URL, { waitUntil: 'networkidle', timeout: 30000 });

    // 1. Check for <th>/<td> table structure
    console.log('━━━━ Table Structure Analysis ━━━━');
    const tableInfo = await page.evaluate(() => {
      const tables = document.querySelectorAll('table');
      return Array.from(tables).map((table, idx) => {
        const rows = table.querySelectorAll('tr');
        const hasHeaders = table.querySelectorAll('th').length > 0;
        return {
          tableIndex: idx + 1,
          rowCount: rows.length,
          hasHeaders,
          className: table.className,
          id: table.id || 'N/A',
        };
      });
    });

    console.table(tableInfo);

    // 2. Search for field labels (공고일, 마감일, 공고금액)
    console.log('\n━━━━ Field Label Search ━━━━');
    const fieldLabels = ['공고일', '마감일', '접수마감', '공고금액', '지원금액', '부처명', '공고기관명'];

    for (const label of fieldLabels) {
      const result = await page.evaluate((searchLabel) => {
        // Search in all <th> elements
        const thElements = Array.from(document.querySelectorAll('th'));
        const matchingTh = thElements.find(th => th.textContent?.includes(searchLabel));

        if (matchingTh) {
          const nextTd = matchingTh.nextElementSibling as HTMLElement;
          const tr = matchingTh.closest('tr');
          const tdInRow = tr?.querySelector('td');

          return {
            found: true,
            thText: matchingTh.textContent?.trim().substring(0, 50),
            nextSiblingTag: nextTd?.tagName || 'N/A',
            nextSiblingText: nextTd?.textContent?.trim().substring(0, 80) || 'N/A',
            tdInRowText: tdInRow?.textContent?.trim().substring(0, 80) || 'N/A',
          };
        }

        // Search in all text content
        const bodyText = document.body.textContent || '';
        const hasLabel = bodyText.includes(searchLabel);

        return {
          found: false,
          existsInPage: hasLabel,
        };
      }, label);

      if (result.found) {
        console.log(`✅ "${label}" found in <th>:`);
        console.log(`   TH text: ${result.thText}`);
        console.log(`   Next sibling: <${result.nextSiblingTag}> - ${result.nextSiblingText}`);
        console.log(`   TD in row: ${result.tdInRowText}\n`);
      } else {
        console.log(`❌ "${label}" not found in <th> elements`);
        console.log(`   Exists in page text: ${result.existsInPage ? '✓' : '✗'}\n`);
      }
    }

    // 3. Extract all <th>/<td> pairs for reference
    console.log('\n━━━━ All <th>/<td> Pairs in Page ━━━━');
    const allPairs = await page.evaluate(() => {
      const thElements = Array.from(document.querySelectorAll('th'));
      return thElements.slice(0, 20).map((th) => {
        const tr = th.closest('tr');
        const td = tr?.querySelector('td');
        return {
          thText: th.textContent?.trim().substring(0, 60) || '',
          tdText: td?.textContent?.trim().substring(0, 80) || 'N/A',
        };
      });
    });

    console.table(allPairs);

    // 4. Check for alternative structures (divs, labels, etc.)
    console.log('\n━━━━ Alternative Structure Check ━━━━');
    const altStructures = await page.evaluate(() => {
      const results = {
        dtDdPairs: 0,
        labelDivPairs: 0,
        divStructures: 0,
      };

      // Check for <dt>/<dd> structure
      results.dtDdPairs = document.querySelectorAll('dt').length;

      // Check for label/div pairs
      results.labelDivPairs = document.querySelectorAll('label').length;

      // Check for div-based structures
      results.divStructures = document.querySelectorAll('div.field, div.row, div.item').length;

      return results;
    });

    console.log('Alternative structures found:');
    console.log(`  <dt>/<dd> pairs: ${altStructures.dtDdPairs}`);
    console.log(`  <label> elements: ${altStructures.labelDivPairs}`);
    console.log(`  Div-based structures: ${altStructures.divStructures}`);

    // 5. Sample page text around key dates
    console.log('\n━━━━ Text Content Around Dates ━━━━');
    const dateContext = await page.evaluate(() => {
      const bodyText = document.body.textContent || '';
      const results = [];

      const dateLabels = ['공고일', '마감일', '접수마감', '공고금액'];

      for (const label of dateLabels) {
        const index = bodyText.indexOf(label);
        if (index !== -1) {
          const start = Math.max(0, index - 20);
          const end = Math.min(bodyText.length, index + 100);
          results.push({
            label,
            context: bodyText.substring(start, end).replace(/\s+/g, ' '),
          });
        }
      }

      return results;
    });

    dateContext.forEach((item) => {
      console.log(`"${item.label}":`, item.context);
    });

    console.log('\n✅ Detail page analysis complete!');
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await browser.close();
  }
})();
