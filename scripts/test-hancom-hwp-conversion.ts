/**
 * Test Hancom Docs HWP Conversion
 *
 * Tests the complete HWP → PDF → text extraction pipeline using Hancom Docs.
 * This script verifies the integration by:
 * 1. Downloading a real HWP file from NTIS database
 * 2. Extracting text using the Hancom Docs converter
 * 3. Validating the extracted content
 */

import { PrismaClient } from '@prisma/client';
import { chromium, Browser, Page } from 'playwright';
import fs from 'fs';
import { extractTextFromAttachment } from '../lib/scraping/utils/attachment-parser';

const prisma = new PrismaClient();

async function testHancomConversion() {
  console.log('🧪 Testing Hancom Docs HWP Conversion\n');

  try {
    // 1. Find a program with HWP attachments
    console.log('🔍 Finding NTIS program with HWP attachments...');
    const program = await prisma.funding_programs.findFirst({
      where: {
        scrapingSource: 'ntis',
        attachmentUrls: { isEmpty: false },
      },
      select: {
        id: true,
        title: true,
        announcementUrl: true,
        attachmentUrls: true,
      },
    });

    if (!program || !program.attachmentUrls || program.attachmentUrls.length === 0) {
      console.log('❌ No programs with attachments found');
      return;
    }

    // Find first HWP file
    const hwpFileName = program.attachmentUrls.find((url: string) =>
      url.toLowerCase().endsWith('.hwp')
    );

    if (!hwpFileName) {
      console.log('❌ No HWP files found in attachments');
      console.log('   Attachments:', program.attachmentUrls);
      return;
    }

    console.log(`✅ Found program: ${program.title.substring(0, 80)}...`);
    console.log(`   HWP file: ${hwpFileName}\n`);

    // 2. Download the HWP file from NTIS
    console.log('📥 Downloading HWP file from NTIS...');
    const hwpBuffer = await downloadNTISAttachment(
      program.announcementUrl!,
      hwpFileName
    );

    if (!hwpBuffer) {
      console.log('❌ Failed to download HWP file');
      return;
    }

    console.log(`✅ Downloaded: ${hwpBuffer.length} bytes\n`);

    // 3. Test Hancom Docs conversion
    console.log('🔄 Testing Hancom Docs conversion...');
    const extractedText = await extractTextFromAttachment(hwpFileName, hwpBuffer);

    if (!extractedText) {
      console.log('❌ Text extraction failed');
      return;
    }

    console.log(`✅ Successfully extracted ${extractedText.length} characters\n`);

    // 4. Display sample text
    console.log('📄 Sample extracted text (first 500 characters):');
    console.log('─'.repeat(80));
    console.log(extractedText.substring(0, 500));
    console.log('─'.repeat(80));
    console.log('\n✨ Hancom Docs HWP conversion test PASSED!');

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Download attachment from NTIS using Playwright
 */
async function downloadNTISAttachment(
  announcementUrl: string,
  fileName: string
): Promise<Buffer | null> {
  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Navigate to announcement page
    await page.goto(announcementUrl, { waitUntil: 'networkidle', timeout: 60000 });

    // Wait for attachment links
    await page.waitForSelector('a[href*="atchFileDown"]', { timeout: 10000 });

    // Find the specific HWP file link
    const attachmentLinks = await page.$$('a[href*="atchFileDown"]');

    for (const link of attachmentLinks) {
      const linkText = await link.textContent();
      const fileNamePrefix = fileName.split('_')[0].substring(0, 20);

      if (linkText && linkText.includes(fileNamePrefix)) {
        console.log(`   Downloading: ${linkText.trim()}`);

        // Set up download handler
        const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
        await link.click();
        const download = await downloadPromise;

        // Get file buffer
        const stream = await download.createReadStream();
        const chunks: Buffer[] = [];

        for await (const chunk of stream) {
          chunks.push(chunk);
        }

        return Buffer.concat(chunks);
      }
    }

    console.log('   ⚠️  Could not find matching attachment link');
    return null;

  } catch (error: any) {
    console.error('   ❌ Download error:', error.message);
    return null;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the test
testHancomConversion()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
