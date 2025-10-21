/**
 * Migration Script: Fix Relative URLs in Database
 *
 * Purpose: Update funding_programs table to convert relative URLs to absolute URLs
 * Affected: Programs scraped by Playwright (IITP, KEIT, TIPA, KIMST)
 * Safe: NTIS API programs and seed data already have absolute URLs
 */

import { db } from '../lib/db';
import { scrapingConfig } from '../lib/scraping/config';

interface AgencyBaseUrls {
  [key: string]: string;
}

/**
 * Map agency IDs to their base URLs
 */
const agencyBaseUrls: AgencyBaseUrls = {
  iitp: scrapingConfig.iitp.baseUrl,
  keit: scrapingConfig.keit.baseUrl,
  tipa: scrapingConfig.tipa.baseUrl,
  kimst: scrapingConfig.kimst.baseUrl,
};

/**
 * Normalize URL to absolute format
 */
function normalizeUrl(href: string, baseUrl: string): string {
  if (!href) return href;

  // Already absolute URL
  if (href.startsWith('http://') || href.startsWith('https://')) {
    return href;
  }

  // Relative URL - prepend baseUrl
  const separator = href.startsWith('/') ? '' : '/';
  return baseUrl + separator + href;
}

async function fixRelativeUrls() {
  console.log('🔧 Starting URL migration...\n');

  try {
    // Find all programs with relative URLs from Playwright scraper
    const programsWithRelativeUrls = await db.funding_programs.findMany({
      where: {
        AND: [
          {
            scrapingSource: {
              in: ['iitp', 'keit', 'tipa', 'kimst'],
            },
          },
          {
            announcementUrl: {
              not: {
                startsWith: 'http',
              },
            },
          },
        ],
      },
      select: {
        id: true,
        title: true,
        announcementUrl: true,
        scrapingSource: true,
      },
    });

    console.log(`📊 Found ${programsWithRelativeUrls.length} programs with relative URLs\n`);

    if (programsWithRelativeUrls.length === 0) {
      console.log('✅ No programs need URL fixing. All URLs are already absolute.\n');
      return;
    }

    // Update each program
    let successCount = 0;
    let errorCount = 0;

    for (const program of programsWithRelativeUrls) {
      try {
        const baseUrl = agencyBaseUrls[program.scrapingSource || ''];
        if (!baseUrl) {
          console.warn(`⚠️  Unknown agency: ${program.scrapingSource} for program ${program.id}`);
          errorCount++;
          continue;
        }

        const newUrl = normalizeUrl(program.announcementUrl, baseUrl);

        await db.funding_programs.update({
          where: { id: program.id },
          data: { announcementUrl: newUrl },
        });

        console.log(`✅ [${program.scrapingSource?.toUpperCase()}] ${program.title.substring(0, 50)}...`);
        console.log(`   OLD: ${program.announcementUrl}`);
        console.log(`   NEW: ${newUrl}\n`);

        successCount++;
      } catch (error) {
        console.error(`❌ Error updating program ${program.id}:`, error);
        errorCount++;
      }
    }

    // Summary
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📊 MIGRATION SUMMARY');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`✅ Successfully updated: ${successCount} programs`);
    console.log(`❌ Failed: ${errorCount} programs`);
    console.log(`📁 Total processed: ${programsWithRelativeUrls.length} programs`);
    console.log('═══════════════════════════════════════════════════════════\n');

    if (successCount > 0) {
      console.log('🎉 Migration completed successfully!\n');
      console.log('Next steps:');
      console.log('1. Test clicking "View Posting" buttons on dashboard');
      console.log('2. Verify external links open correctly in new tabs\n');
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

// Run migration
fixRelativeUrls()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
