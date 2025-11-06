/**
 * Rescrape IITP Programs with NULL Deadlines
 *
 * Backfills missing deadline data for existing IITP programs
 * using the updated parser that handles Korean time formats.
 */

import { chromium } from 'playwright';
import { PrismaClient } from '@prisma/client';
import { parseIITPDetails } from '../lib/scraping/parsers/iitp-parser';

const db = new PrismaClient();

async function rescrapeiitpPrograms() {
  console.log('🔄 Rescraping IITP Programs with NULL Deadlines...\n');

  try {
    // Query all IITP programs with NULL deadlines
    const programs = await db.funding_programs.findMany({
      where: {
        scrapingSource: 'iitp',
        deadline: null,
      },
      select: {
        id: true,
        title: true,
        announcementUrl: true,
        deadline: true,
      },
    });

    console.log(`📊 Found ${programs.length} IITP programs with NULL deadlines\n`);

    if (programs.length === 0) {
      console.log('✅ No programs to rescrape. All IITP deadlines are populated.');
      return;
    }

    // Launch browser
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    let successCount = 0;
    let failCount = 0;

    // Process each program
    for (let i = 0; i < programs.length; i++) {
      const program = programs[i];
      console.log(`\n[${i + 1}/${programs.length}] Processing: ${program.title}`);
      console.log(`   URL: ${program.announcementUrl}`);

      try {
        // Use the updated parser to extract details
        const details = await parseIITPDetails(page, program.announcementUrl);

        if (details.deadline) {
          // Convert targetType from single string to array format
          let targetTypeArray: ('COMPANY' | 'RESEARCH_INSTITUTE')[];
          if (details.targetType === 'BOTH') {
            targetTypeArray = ['COMPANY', 'RESEARCH_INSTITUTE'];
          } else {
            targetTypeArray = [details.targetType];
          }

          // Update database with extracted deadline
          await db.funding_programs.update({
            where: { id: program.id },
            data: {
              deadline: details.deadline,
              // Also update other fields if available
              budgetAmount: details.budgetAmount || undefined,
              description: details.description || undefined,
              targetType: targetTypeArray,
              minTRL: details.minTRL || undefined,
              maxTRL: details.maxTRL || undefined,
              eligibilityCriteria: details.eligibilityCriteria || undefined,
            },
          });

          console.log(`   ✅ Updated deadline: ${details.deadline.toISOString().split('T')[0]}`);
          successCount++;
        } else {
          console.log(`   ⚠️  Parser still returned NULL deadline`);
          failCount++;
        }

        // Respectful delay between requests
        await page.waitForTimeout(3000);
      } catch (error: any) {
        console.error(`   ❌ Failed to process: ${error.message}`);
        failCount++;
      }
    }

    await browser.close();

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 Rescrape Summary:');
    console.log(`   Total programs: ${programs.length}`);
    console.log(`   ✅ Successfully updated: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log('='.repeat(80) + '\n');

    if (successCount > 0) {
      console.log('✅ Rescrape completed! Next steps:');
      console.log('   1. Mark expired programs as EXPIRED status');
      console.log('   2. Update match generation to filter EXPIRED programs');
      console.log('   3. Clean up existing matches to expired programs\n');
    }
  } catch (error: any) {
    console.error('❌ Rescrape failed:', error.message);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

rescrapeiitpPrograms().catch(console.error);
