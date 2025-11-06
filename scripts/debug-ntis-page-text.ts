/**
 * Debug NTIS Page Text Content
 * Shows actual text content to verify regex patterns
 */

import { chromium } from 'playwright';

async function debugNTISPage() {
  console.log('🔍 Debugging NTIS page text content...\n');

  const browser = await chromium.launch({ headless: true }); // Headless for CI/automation
  const page = await browser.newPage();

  try {
    const testUrl = 'https://www.ntis.go.kr/rndgate/eg/un/ra/view.do?progrmSn=549050';
    console.log(`📄 Loading: ${testUrl}\n`);

    await page.goto(testUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(5000); // Wait longer for dynamic content

    // Get full body text
    const bodyText = await page.textContent('body') || '';

    console.log('📄 Full page text length:', bodyText.length, 'characters\n');

    // Search for key Korean labels
    const labels = ['공고일', '마감일', '접수마감', '공고금액', '지원금액', '부처명', '공고기관명'];

    console.log('🔎 Searching for field labels:');
    console.log('─'.repeat(80));

    labels.forEach(label => {
      const regex = new RegExp(`${label}[^\\n]{0,100}`, 'g');
      const matches = bodyText.match(regex);

      if (matches && matches.length > 0) {
        console.log(`\n✅ Found "${label}":`);
        matches.forEach(match => {
          console.log(`   ${match.substring(0, 100)}`);
        });
      } else {
        console.log(`\n❌ NOT FOUND: "${label}"`);
      }
    });

    console.log('\n' + '─'.repeat(80));

    // Show first 2000 characters of cleaned text
    const cleanText = bodyText
      .replace(/\s+/g, ' ')
      .replace(/\t+/g, ' ')
      .trim();

    console.log('\n📝 First 2000 characters (cleaned):');
    console.log('─'.repeat(80));
    console.log(cleanText.substring(0, 2000));
    console.log('─'.repeat(80));

    // Take screenshot for manual inspection
    await page.screenshot({ path: '/tmp/ntis-debug.png', fullPage: true });
    console.log('\n📸 Screenshot saved to: /tmp/ntis-debug.png');

  } catch (error: any) {
    console.error('❌ Debug failed:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

debugNTISPage().catch(console.error);
