/**
 * Scan NTIS Announcements for Attachment File Types
 *
 * This script scans multiple NTIS announcements to determine:
 * 1. How many announcements have attachments
 * 2. Distribution of file types (PDF, HWP, HWPX, ZIP, DOC, etc.)
 * 3. Whether HWP parsing is necessary (and how prevalent)
 *
 * Per user rule: Verify actual architecture before implementation
 */
import { PrismaClient } from '@prisma/client';
import { chromium, Browser, Page } from 'playwright';

const prisma = new PrismaClient();

interface AttachmentStats {
  totalAnnouncements: number;
  withAttachments: number;
  withoutAttachments: number;
  fileTypes: Record<string, number>;
  sampleAttachments: Array<{
    announcementId: string;
    title: string;
    attachments: Array<{ fileName: string; fileType: string }>;
  }>;
}

async function scanNTISAttachmentTypes(): Promise<void> {
  let browser: Browser | null = null;

  try {
    console.log('🔍 Scanning NTIS Announcements for Attachment Types\n');

    // Get 30 random NTIS announcements from database
    const announcements = await prisma.funding_programs.findMany({
      where: { agencyId: 'NTIS' },
      select: { id: true, title: true, announcementUrl: true },
      take: 30,
    });

    console.log(`📊 Scanning ${announcements.length} NTIS announcements...\n`);

    const stats: AttachmentStats = {
      totalAnnouncements: 0,
      withAttachments: 0,
      withoutAttachments: 0,
      fileTypes: {},
      sampleAttachments: [],
    };

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    for (const announcement of announcements) {
      stats.totalAnnouncements++;

      try {
        console.log(`[${stats.totalAnnouncements}/${announcements.length}] ${announcement.title.slice(0, 50)}...`);

        await page.goto(announcement.announcementUrl, { timeout: 15000, waitUntil: 'domcontentloaded' });

        // Extract attachments from the "첨부파일" section
        const attachments = await extractAttachmentsFromPage(page);

        if (attachments.length > 0) {
          stats.withAttachments++;

          // Count file types
          attachments.forEach((attachment) => {
            const ext = attachment.fileType.toUpperCase();
            stats.fileTypes[ext] = (stats.fileTypes[ext] || 0) + 1;
          });

          // Save first 10 announcements with attachments as samples
          if (stats.sampleAttachments.length < 10) {
            stats.sampleAttachments.push({
              announcementId: announcement.id,
              title: announcement.title.slice(0, 60),
              attachments,
            });
          }

          console.log(`  ✓ ${attachments.length} attachments: ${attachments.map((a) => a.fileType).join(', ')}`);
        } else {
          stats.withoutAttachments++;
          console.log(`  ✗ No attachments`);
        }
      } catch (error: any) {
        console.warn(`  ⚠ Error: ${error.message}`);
        stats.withoutAttachments++;
      }

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // Print summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 NTIS Attachment Type Distribution');
    console.log('='.repeat(80));
    console.log(`Total Announcements Scanned: ${stats.totalAnnouncements}`);
    console.log(`With Attachments: ${stats.withAttachments} (${((stats.withAttachments / stats.totalAnnouncements) * 100).toFixed(1)}%)`);
    console.log(`Without Attachments: ${stats.withoutAttachments} (${((stats.withoutAttachments / stats.totalAnnouncements) * 100).toFixed(1)}%)`);
    console.log('\nFile Type Distribution:');

    const sortedTypes = Object.entries(stats.fileTypes).sort(([, a], [, b]) => b - a);
    sortedTypes.forEach(([type, count]) => {
      const percentage = ((count / stats.withAttachments) * 100).toFixed(1);
      console.log(`  ${type.padEnd(10)} ${count.toString().padStart(4)} files (${percentage}% of announcements with attachments)`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('📎 Sample Announcements with Attachments');
    console.log('='.repeat(80));
    stats.sampleAttachments.forEach((sample, idx) => {
      console.log(`\n${idx + 1}. ${sample.title}`);
      sample.attachments.forEach((att) => {
        console.log(`   - [${att.fileType}] ${att.fileName.slice(0, 80)}`);
      });
    });

    console.log('\n' + '='.repeat(80));
    console.log('✅ Scan Complete!');

    // HWP assessment
    const hwpCount = (stats.fileTypes['HWP'] || 0) + (stats.fileTypes['HWPX'] || 0);
    if (hwpCount > 0) {
      const hwpPercentage = ((hwpCount / stats.withAttachments) * 100).toFixed(1);
      console.log(`\n🎯 HWP/HWPX files detected: ${hwpCount} files (${hwpPercentage}% of announcements with attachments)`);
      console.log(`   → HWP parsing implementation is RECOMMENDED`);
    } else {
      console.log(`\n✓ No HWP/HWPX files detected in sample`);
      console.log(`   → HWP parsing may not be necessary (or sample size too small)`);
    }
  } catch (error: any) {
    console.error('❌ Scan failed:', error.message);
    throw error;
  } finally {
    if (browser) await browser.close();
    await prisma.$disconnect();
  }
}

/**
 * Extract attachments from NTIS announcement page
 * Parses the "첨부파일" section and extracts file names/types from link text
 */
async function extractAttachmentsFromPage(page: Page): Promise<Array<{ fileName: string; fileType: string }>> {
  try {
    // Find the "첨부파일" section and extract all links within it
    const attachments = await page.evaluate(() => {
      // Find the element containing "첨부파일" text
      const allElements = Array.from(document.querySelectorAll('*'));
      const attachmentHeader = allElements.find((el) => el.textContent?.trim() === '첨부파일');

      if (!attachmentHeader) {
        return [];
      }

      // Find the parent container and then the list of attachments
      const container = attachmentHeader.parentElement;
      if (!container) {
        return [];
      }

      // Find all links in the attachment section
      const links = container.querySelectorAll('a');
      const results: Array<{ fileName: string; fileType: string }> = [];

      links.forEach((link) => {
        const fileName = link.textContent?.trim() || '';
        if (fileName && fileName.length > 0) {
          // Extract file extension from file name (last part after .)
          const match = fileName.match(/\.([a-zA-Z0-9]+)$/);
          const fileType = match ? match[1].toUpperCase() : 'UNKNOWN';

          results.push({ fileName, fileType });
        }
      });

      return results;
    });

    return attachments;
  } catch (error) {
    return [];
  }
}

// Run the scanner
scanNTISAttachmentTypes()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
