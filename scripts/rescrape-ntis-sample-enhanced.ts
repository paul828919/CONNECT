/**
 * Re-scrape Sample NTIS Programs with Enhanced Parser
 *
 * This script re-scrapes 10-20 existing NTIS programs to populate the new enhancement fields:
 * 1. allowedBusinessStructures - Business structure requirements (CORPORATION, SOLE_PROPRIETOR)
 * 2. attachmentUrls - PDF/HWP/HWPX attachment file names
 * 3. trlInferred - Whether TRL was auto-classified vs explicitly stated
 *
 * Strategy:
 * - Select programs from scan results that have attachments (roRndUid=1198102, etc.)
 * - Re-scrape using enhanced parser
 * - Update existing database records (not create new ones)
 * - Verify all three new fields are populated correctly
 *
 * Per user rule: Always verify locally before deploying to production
 */

import { PrismaClient } from '@prisma/client';
import { chromium } from 'playwright';
import { parseNTISAnnouncementDetails } from '@/lib/scraping/parsers/ntis-announcement-parser';

const prisma = new PrismaClient();

/**
 * Sample NTIS URLs with known characteristics (from earlier scan)
 */
const SAMPLE_NTIS_URLS = [
  // Has 4 attachments (2 PDFs, 2 ZIPs)
  'https://www.ntis.go.kr/rndgate/eg/un/ra/view.do?roRndUid=1198102&flag=rndList',

  // Has 3 attachments (verified from scan)
  'https://www.ntis.go.kr/rndgate/eg/un/ra/view.do?roRndUid=1199437&flag=rndList',

  // Has 2 HWPX files (verified from scan)
  'https://www.ntis.go.kr/rndgate/eg/un/ra/view.do?roRndUid=1203233&flag=rndList',

  // Additional URLs from scan results with attachments
  'https://www.ntis.go.kr/rndgate/eg/un/ra/view.do?roRndUid=1198104&flag=rndList',
  'https://www.ntis.go.kr/rndgate/eg/un/ra/view.do?roRndUid=1198106&flag=rndList',
];

async function rescrapeEnhancedSample() {
  console.log('🔄 Re-scraping NTIS Sample with Enhanced Parser\n');
  console.log(`Processing ${SAMPLE_NTIS_URLS.length} NTIS announcements...\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  let successCount = 0;
  let failureCount = 0;
  const results: Array<{
    url: string;
    success: boolean;
    attachmentCount: number;
    businessStructure: string | null;
    trlInferred: boolean;
    error?: string;
  }> = [];

  for (const url of SAMPLE_NTIS_URLS) {
    try {
      console.log(`\n📄 Processing: ${url}`);
      console.log('─'.repeat(80));

      // Parse with enhanced parser
      const details = await parseNTISAnnouncementDetails(page, url);

      if (!details) {
        console.log('❌ Failed to parse announcement');
        failureCount++;
        results.push({
          url,
          success: false,
          attachmentCount: 0,
          businessStructure: null,
          trlInferred: false,
          error: 'Parser returned null',
        });
        continue;
      }

      // Display parsed data
      console.log(`\n✅ Parsed successfully:`);
      console.log(`   Title: ${details.description?.substring(0, 60)}...`);
      console.log(`   Attachments: ${details.attachmentUrls?.length || 0} files`);
      if (details.attachmentUrls && details.attachmentUrls.length > 0) {
        console.log(`     └─ ${details.attachmentUrls.slice(0, 3).join(', ')}`);
      }
      console.log(
        `   Business Structure: ${details.allowedBusinessStructures && details.allowedBusinessStructures.length > 0 ? details.allowedBusinessStructures.join(', ') : 'No restrictions (all business types allowed)'}`
      );
      console.log(`   TRL Inferred: ${details.trlInferred ? 'Yes (keyword-based)' : 'No (explicit or NULL)'}`);
      console.log(`   Keywords: ${details.keywords.length} extracted`);

      // Find existing program by URL to update (not create duplicate)
      const existingProgram = await prisma.funding_programs.findFirst({
        where: { announcementUrl: url },
      });

      if (existingProgram) {
        // Update existing record with new field values
        await prisma.funding_programs.update({
          where: { id: existingProgram.id },
          data: {
            // Use empty array instead of NULL for non-nullable array fields
            allowedBusinessStructures: details.allowedBusinessStructures || [],
            attachmentUrls: details.attachmentUrls || [],
            trlInferred: details.trlInferred || false,
            keywords: details.keywords || [],
            // Also update other fields that may have improved with synonym extraction
            budgetAmount: details.budgetAmount !== undefined ? details.budgetAmount : existingProgram.budgetAmount,
            deadline: details.deadline !== undefined ? details.deadline : existingProgram.deadline,
          },
        });
        console.log(`\n✅ Updated existing program: ${existingProgram.id}`);
      } else {
        console.log(`\n⚠️ Program not found in database (URL not previously scraped)`);
      }

      successCount++;
      results.push({
        url,
        success: true,
        attachmentCount: details.attachmentUrls?.length || 0,
        businessStructure:
          details.allowedBusinessStructures && details.allowedBusinessStructures.length > 0
            ? details.allowedBusinessStructures.join(', ')
            : null,
        trlInferred: details.trlInferred || false,
      });

      // Rate limiting: Wait 2 seconds between requests
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error: any) {
      console.error(`❌ Error processing ${url}:`, error.message);
      failureCount++;
      results.push({
        url,
        success: false,
        attachmentCount: 0,
        businessStructure: null,
        trlInferred: false,
        error: error.message,
      });
    }
  }

  await browser.close();
  await prisma.$disconnect();

  // Summary report
  console.log('\n\n📊 Re-scraping Summary');
  console.log('='.repeat(80));
  console.log(`Total processed: ${SAMPLE_NTIS_URLS.length}`);
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Failures: ${failureCount}`);
  console.log(`\nAttachments found: ${results.filter((r) => r.attachmentCount > 0).length}/${successCount}`);
  console.log(`Business structure detected: ${results.filter((r) => r.businessStructure !== null).length}/${successCount}`);
  console.log(`TRL inferred: ${results.filter((r) => r.trlInferred).length}/${successCount}`);

  // Verify database changes
  console.log('\n\n🔍 Database Verification');
  console.log('='.repeat(80));
  const stats = await prisma.funding_programs.findMany({
    where: {
      announcementUrl: { in: SAMPLE_NTIS_URLS },
    },
    select: {
      announcementUrl: true,
      allowedBusinessStructures: true,
      attachmentUrls: true,
      trlInferred: true,
    },
  });

  console.log(`Found ${stats.length} programs in database:\n`);
  stats.forEach((program, idx) => {
    const urlShort = program.announcementUrl.substring(0, 70) + '...';
    console.log(`${idx + 1}. ${urlShort}`);
    console.log(
      `   Business Structure: ${program.allowedBusinessStructures && program.allowedBusinessStructures.length > 0 ? program.allowedBusinessStructures.join(', ') : 'No restrictions'}`
    );
    console.log(`   Attachments: ${program.attachmentUrls.length} files`);
    console.log(`   TRL Inferred: ${program.trlInferred}`);
    console.log();
  });

  console.log('\n✅ Re-scraping complete! New enhancement fields are now populated for sample programs.');
}

rescrapeEnhancedSample()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
