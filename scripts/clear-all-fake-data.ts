/**
 * Clear ALL fake seed data matches and programs
 * This removes the 8 test programs and all their matches
 * Usage: npx tsx scripts/clear-all-fake-data.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearAllFakeData() {
  console.log('🧹 Starting cleanup of fake seed data...\n');

  try {
    // Step 1: Count current data
    const matchCount = await prisma.funding_matches.count();
    const programCount = await prisma.funding_programs.count();
    
    console.log(`📊 Current database state:`);
    console.log(`   - Funding Programs: ${programCount}`);
    console.log(`   - Funding Matches: ${matchCount}\n`);

    // Step 2: Delete all matches
    console.log('🗑️  Deleting all funding matches...');
    const deletedMatches = await prisma.funding_matches.deleteMany({});
    console.log(`   ✅ Deleted ${deletedMatches.count} matches\n`);

    // Step 3: Delete fake seed programs (no scrapingSource = seed data)
    console.log('🗑️  Deleting fake seed programs...');
    const deletedPrograms = await prisma.funding_programs.deleteMany({
      where: {
        scrapingSource: null // Seed programs have no scrapingSource
      }
    });
    console.log(`   ✅ Deleted ${deletedPrograms.count} seed programs\n`);

    // Step 4: Show final state
    const finalProgramCount = await prisma.funding_programs.count();
    const finalMatchCount = await prisma.funding_matches.count();
    
    console.log(`📊 Final database state:`);
    console.log(`   - Funding Programs: ${finalProgramCount} (real scraped data)`);
    console.log(`   - Funding Matches: ${finalMatchCount}\n`);

    console.log('✅ Cleanup completed successfully!');
    console.log('💡 New matches will be generated automatically from real scraped programs.');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

clearAllFakeData();
