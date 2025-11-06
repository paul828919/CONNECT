/**
 * Download Test HWP File
 *
 * Downloads one NTIS HWP file to test Hancom Docs conversion
 */
import { chromium } from 'playwright';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function downloadTestHWP() {
  console.log('🔍 Finding NTIS HWP file...\n');

  // 1. Get a program with HWP attachments
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

  if (!program) {
    console.log('❌ No programs with attachments found');
    return;
  }

  // Find first HWP file
  const hwpFileName = program.attachmentUrls?.find((url: string) =>
    url.toLowerCase().endsWith('.hwp')
  );

  if (!hwpFileName) {
    console.log('❌ No HWP files found');
    return;
  }

  console.log(`Program: ${program.title.substring(0, 80)}`);
  console.log(`HWP File: ${hwpFileName}\n`);

  // 2. Launch Playwright to download the file
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('🌐 Navigating to NTIS announcement page...');
    await page.goto(program.announcementUrl!, { waitUntil: 'networkidle', timeout: 60000 });

    console.log('📎 Looking for attachment download link...');

    // Wait for attachment links to load
    await page.waitForSelector('a[href*="atchFileDown"]', { timeout: 10000 });

    // Find the specific HWP file link
    const attachmentLinks = await page.$$('a[href*="atchFileDown"]');

    let downloadStarted = false;
    for (const link of attachmentLinks) {
      const linkText = await link.textContent();
      if (linkText && linkText.includes(hwpFileName.split('_')[0].substring(0, 20))) {
        console.log(`📥 Downloading: ${linkText.trim()}`);

        // Set up download handler
        const downloadPromise = page.waitForEvent('download');
        await link.click();
        const download = await downloadPromise;

        // Save to /tmp directory
        const savePath = `/tmp/test-hancom-${Date.now()}.hwp`;
        await download.saveAs(savePath);

        console.log(`✅ Downloaded to: ${savePath}`);
        console.log(`   File size: ${fs.statSync(savePath).size} bytes\n`);

        downloadStarted = true;
        break;
      }
    }

    if (!downloadStarted) {
      console.log('❌ Could not find matching attachment link');
    }

  } catch (error: any) {
    console.error('❌ Download failed:', error.message);
  } finally {
    await browser.close();
  }
}

downloadTestHWP()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
