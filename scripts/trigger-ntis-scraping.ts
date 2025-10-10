/**
 * Trigger NTIS API Scraping
 * 
 * Manually triggers scraping using the NTIS API instead of web scraping
 * More stable and efficient than Playwright-based scraping
 * 
 * Usage: npx tsx scripts/trigger-ntis-scraping.ts
 */

import { NTISApiScraper } from '../lib/ntis-api';

async function triggerNTISScraping() {
  console.log('🚀 Triggering NTIS API scraping...\n');

  const scraper = new NTISApiScraper();

  try {
    // Scrape recent programs from last 30 days
    const result = await scraper.scrapeAllAgencies(30);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ NTIS API Scraping Results:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   📊 Total Found: ${result.totalFound}`);
    console.log(`   ✨ New Programs: ${result.programsNew}`);
    console.log(`   🔄 Updated Programs: ${result.programsUpdated}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (result.success) {
      console.log('✅ NTIS API scraping completed successfully!');
      console.log('\n📊 View results in Prisma Studio:');
      console.log('   npm run db:studio');
      console.log('   Then navigate to http://localhost:5555');
    } else {
      console.log('❌ NTIS API scraping failed. Check the error messages above.');
    }

    process.exit(result.success ? 0 : 1);
  } catch (error: any) {
    console.error('❌ Fatal error during NTIS API scraping:', error);
    process.exit(1);
  }
}

triggerNTISScraping();
