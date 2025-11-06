/**
 * Investigate NTIS Attachment Types
 *
 * This script checks what file types are available on NTIS announcement pages.
 * Helps determine which parsers we need to implement (PDF, HWP, HWPX, DOC, etc.)
 */

import { chromium } from 'playwright';

async function investigateNTISAttachments() {
  console.log('🔍 Investigating NTIS Attachment Types\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // Test with recent NTIS URLs from database
    const testUrls = [
      'https://www.ntis.go.kr/rndgate/eg/un/ra/view.do?roRndUid=1199437&flag=rndList',
      'https://www.ntis.go.kr/rndgate/eg/un/ra/view.do?roRndUid=1203233&flag=rndList',
    ];

    for (const testUrl of testUrls) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`📄 Testing: ${testUrl}`);
      console.log('='.repeat(80));

      await page.goto(testUrl, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000); // Wait for dynamic content

      // Extract all links that could be attachments
      const attachmentLinks = await page.$$eval('a[href]', (links) => {
        return links
          .map((link) => {
            const href = (link as HTMLAnchorElement).href;
            const text = link.textContent?.trim() || '';
            return { href, text };
          })
          .filter(({ href }) => {
            // Look for common document file extensions
            const docExtensions = [
              '.pdf',
              '.hwp',
              '.hwpx',
              '.doc',
              '.docx',
              '.xls',
              '.xlsx',
              '.zip',
            ];
            return docExtensions.some((ext) =>
              href.toLowerCase().includes(ext.toLowerCase())
            );
          });
      });

      console.log(`\n📎 Found ${attachmentLinks.length} potential attachment(s):\n`);

      if (attachmentLinks.length === 0) {
        console.log('  ⚠️  No attachments found on this page');
        console.log('  ℹ️  Possible reasons:');
        console.log('     - Attachments loaded dynamically after page load');
        console.log('     - Attachments behind authentication');
        console.log('     - No attachments for this specific announcement');
      } else {
        // Group by file type
        const byType: Record<string, Array<{ href: string; text: string }>> = {};

        attachmentLinks.forEach((link) => {
          const ext = link.href.toLowerCase().match(/\.(pdf|hwp|hwpx|doc|docx|xls|xlsx|zip)(\?|$)/i);
          const fileType = ext ? ext[1].toUpperCase() : 'UNKNOWN';

          if (!byType[fileType]) {
            byType[fileType] = [];
          }
          byType[fileType].push(link);
        });

        // Display grouped results
        Object.entries(byType).forEach(([fileType, links]) => {
          console.log(`  📌 ${fileType} files (${links.length}):`);
          links.forEach((link, i) => {
            console.log(`     [${i + 1}] ${link.text || '(no text)'}`);
            console.log(`         URL: ${link.href.substring(0, 100)}...`);
          });
          console.log('');
        });
      }

      // Also check for any elements that might indicate attachments
      const attachmentSections = await page.$$eval(
        'div, section, table',
        (elements) => {
          return elements
            .map((el) => {
              const text = el.textContent || '';
              const html = el.innerHTML;
              // Look for Korean keywords related to attachments
              const hasAttachmentKeyword =
                /첨부|파일|다운로드|공고문|신청서|지침|양식/i.test(text);
              const hasFileIcon = /file|download|attach/i.test(html);

              if ((hasAttachmentKeyword || hasFileIcon) && text.length < 200) {
                return text.trim().substring(0, 100);
              }
              return null;
            })
            .filter(Boolean);
        }
      );

      if (attachmentSections.length > 0) {
        console.log(`\n📋 Found ${attachmentSections.length} sections mentioning attachments:\n`);
        attachmentSections.slice(0, 5).forEach((section, i) => {
          console.log(`  [${i + 1}] ${section}`);
        });
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 SUMMARY');
    console.log('='.repeat(80));
    console.log('✓ Investigation complete');
    console.log('ℹ️  Next steps:');
    console.log('   1. If HWP/HWPX files found → Implement HWP parser');
    console.log('   2. If no attachments found → Check page structure or authentication');
    console.log('   3. Review attachment extraction logic in ntis-announcement-parser.ts');
  } catch (error: any) {
    console.error('\n❌ Investigation failed:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    await browser.close();
  }
}

investigateNTISAttachments().catch(console.error);
