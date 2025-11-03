/**
 * Clear all data from funding_programs table
 *
 * Purpose: Prepare clean state for testing pyhwp extraction pipeline
 * This script deletes all records from funding_programs table
 * and reports the count before/after deletion.
 */

import { db } from '../lib/db';

async function clearFundingPrograms() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Clearing funding_programs Table');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  try {
    // Count records before deletion
    const countBefore = await db.funding_programs.count();
    console.log(`📊 Records before deletion: ${countBefore.toLocaleString()}`);

    if (countBefore === 0) {
      console.log('');
      console.log('✓ Table is already empty. No deletion needed.');
      console.log('');
      return;
    }

    // Delete all records
    console.log('');
    console.log('🗑️  Deleting all records...');
    const result = await db.funding_programs.deleteMany({});
    console.log(`   Deleted: ${result.count.toLocaleString()} records`);

    // Verify deletion
    const countAfter = await db.funding_programs.count();
    console.log('');
    console.log(`📊 Records after deletion: ${countAfter}`);

    if (countAfter === 0) {
      console.log('');
      console.log('✅ SUCCESS: funding_programs table is now empty');
      console.log('   Ready for fresh data extraction test');
    } else {
      console.log('');
      console.log(`⚠️  WARNING: ${countAfter} records remain after deletion`);
    }

    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
  } catch (error: any) {
    console.error('');
    console.error('❌ Error clearing funding_programs table:', error.message);
    console.error('');
    throw error;
  }
}

clearFundingPrograms()
  .then(() => {
    console.log('Cleanup completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Cleanup failed:', error);
    process.exit(1);
  });
