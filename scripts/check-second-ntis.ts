import { chromium } from 'playwright';

const url = 'https://www.ntis.go.kr/rndgate/eg/un/ra/view.do?roRndUid=1249663&flag=rndList';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

  const bodyText = (await page.textContent('body')) || '';

  console.log('Sample NTIS Detail Page (2026년 미래자동차 SDV):\n');

  // Extract text around key fields
  const fields = ['공고일', '마감일', '공고금액', '부처명'];

  fields.forEach((label) => {
    const index = bodyText.indexOf(label);
    if (index !== -1) {
      const start = Math.max(0, index);
      const end = Math.min(bodyText.length, index + 120);
      const context = bodyText.substring(start, end).replace(/\s+/g, ' ').trim();
      console.log(`${label}: ${context}\n`);
    }
  });

  await browser.close();
})();
