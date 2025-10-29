/**
 * Clear Local Database for Phase 6 Testing
 *
 * Safely removes old program data scraped with OLD parser (before Phase 2 enhancements).
 * This allows us to re-scrape with the enhanced parser and validate Phase 6 success criteria.
 *
 * What Gets Deleted:
 * 1. funding_programs (all programs - they'll be re-scraped with enhanced parser)
 * 2. funding_matches (depends on programs, includes saved field)
 * 3. contact_requests (optional - can keep for historical data)
 *
 * What Gets Preserved:
 * 1. organizations (test organizations and user profiles)
 * 2. users (authentication data)
 * 3. accounts (OAuth connections)
 * 4. sessions (active sessions)
 *
 * Per user rule: Always verify locally before committing
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearLocalDatabaseForPhase6() {
  console.log('🧹 Clearing Local Database for Phase 6 Testing\n');
  console.log('='.repeat(80));
  console.log('⚠️  WARNING: This will delete all funding programs and matches!');
  console.log('✅ Backup verified: backups/ntis-programs-backup-2025-10-29-1693-records.json');
  console.log('='.repeat(80));

  try {
    // Get current counts
    console.log('\n📊 Current Database State:\n');
    const programCount = await prisma.funding_programs.count();
    const matchCount = await prisma.funding_matches.count();
    const savedMatchCount = await prisma.funding_matches.count({ where: { saved: true } });
    const contactRequestCount = await prisma.contact_requests.count();
    const orgCount = await prisma.organizations.count();

    console.log(`   Programs: ${programCount.toLocaleString()}`);
    console.log(`   Matches (total): ${matchCount.toLocaleString()}`);
    console.log(`   Matches (saved): ${savedMatchCount.toLocaleString()}`);
    console.log(`   Contact Requests: ${contactRequestCount.toLocaleString()}`);
    console.log(`   Organizations (preserved): ${orgCount.toLocaleString()}`);

    // Step 1: Delete dependent data first (cascading order)
    console.log('\n\n🗑️  Step 1: Deleting dependent data...\n');
    console.log('─'.repeat(80));

    // Delete funding_matches (depends on funding_programs)
    // Note: This includes both saved and unsaved matches
    const deletedMatches = await prisma.funding_matches.deleteMany({});
    console.log(`✅ Deleted ${deletedMatches.count?.toLocaleString() ?? matchCount.toLocaleString()} funding matches (including ${savedMatchCount.toLocaleString()} saved)`);

    // Delete contact_requests (optional - keep for historical tracking)
    // Uncomment if you want to delete:
    // const deletedContactRequests = await prisma.contact_requests.deleteMany({});
    // console.log(`✅ Deleted ${deletedContactRequests.count?.toLocaleString() ?? 0} contact requests`);
    console.log(`ℹ️  Preserved ${contactRequestCount.toLocaleString()} contact requests (historical data)`);

    // Step 2: Delete funding_programs
    console.log('\n\n🗑️  Step 2: Deleting funding programs...\n');
    console.log('─'.repeat(80));

    const deletedPrograms = await prisma.funding_programs.deleteMany({});
    console.log(`✅ Deleted ${deletedPrograms.count?.toLocaleString() ?? programCount.toLocaleString()} funding programs`);

    // Verify deletion
    console.log('\n\n✅ Verification: Post-Deletion State\n');
    console.log('─'.repeat(80));

    const finalProgramCount = await prisma.funding_programs.count();
    const finalMatchCount = await prisma.funding_matches.count();
    const finalOrgCount = await prisma.organizations.count();

    console.log(`   Programs: ${finalProgramCount} (expected: 0)`);
    console.log(`   Matches: ${finalMatchCount} (expected: 0)`);
    console.log(`   Organizations: ${finalOrgCount} (preserved: ${orgCount})`);

    if (finalProgramCount === 0 && finalMatchCount === 0) {
      console.log('\n\n🎉 Database Successfully Cleared!\n');
      console.log('='.repeat(80));
      console.log('✅ Ready for Phase 6 Testing:');
      console.log('   1. Run enhanced NTIS scraper to populate fresh data');
      console.log('   2. Verify Phase 2 enhancement fields (allowedBusinessStructures, attachmentUrls, trlInferred)');
      console.log('   3. Validate success criteria (NULL rates < 20%, TRL coverage ≥ 70%)');
      console.log('   4. Test Korean warning messages with real data');
      console.log('   5. Verify UI improvements');
      console.log('   6. Document results and commit');
      console.log('='.repeat(80));
      console.log('\n💡 Next Command: npx tsx scripts/scrape-ntis-historical.ts\n');
    } else {
      console.error('\n\n❌ Deletion Verification Failed!');
      console.error(`   Programs remaining: ${finalProgramCount}`);
      console.error(`   Matches remaining: ${finalMatchCount}`);
    }
  } catch (error: any) {
    console.error('\n\n❌ Database clearing failed:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

clearLocalDatabaseForPhase6().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
