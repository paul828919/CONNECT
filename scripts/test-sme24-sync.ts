/**
 * Quick test script for SME24 API sync
 *
 * Run with: npx tsx scripts/test-sme24-sync.ts
 */

// Load environment variables first
import 'dotenv/config';

import { sme24Client } from '../lib/sme24-api/client';
import { syncSMEPrograms } from '../lib/sme24-api/program-service';

async function main() {
  console.log('='.repeat(60));
  console.log('SME24 API Integration Test');
  console.log('='.repeat(60));
  console.log('');

  // Step 1: Test API fetch directly
  console.log('Step 1: Testing API fetch...');
  console.log('-'.repeat(40));

  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const formatDate = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  };

  const apiResult = await sme24Client.fetchAnnouncements({
    strDt: formatDate(sevenDaysAgo),
    endDt: formatDate(today),
  });

  console.log(`API Success: ${apiResult.success}`);
  console.log(`Programs Found: ${apiResult.totalCount}`);
  if (apiResult.error) {
    console.log(`Error: ${apiResult.error}`);
  }

  if (apiResult.success && apiResult.data && apiResult.data.length > 0) {
    console.log('\nSample programs (first 5):');
    apiResult.data.slice(0, 5).forEach((item, i) => {
      console.log(`  ${i + 1}. ${item.pblancNm?.substring(0, 50)}... (ID: ${item.pblancSeq})`);
    });
  }

  console.log('');

  // Step 2: Test sync to database
  console.log('Step 2: Testing sync to database...');
  console.log('-'.repeat(40));

  const syncResult = await syncSMEPrograms({
    strDt: formatDate(sevenDaysAgo),
    endDt: formatDate(today),
  });

  console.log(`Sync Success: ${syncResult.success}`);
  console.log(`Programs Found: ${syncResult.programsFound}`);
  console.log(`Programs Created: ${syncResult.programsCreated}`);
  console.log(`Programs Updated: ${syncResult.programsUpdated}`);
  console.log(`Programs Expired: ${syncResult.programsExpired}`);
  console.log(`Duration: ${(syncResult.duration / 1000).toFixed(2)}s`);

  if (syncResult.errors.length > 0) {
    console.log('\nErrors:');
    syncResult.errors.forEach((err) => console.log(`  - ${err}`));
  }

  console.log('');
  console.log('='.repeat(60));
  console.log(syncResult.success ? '✓ Test completed successfully!' : '✗ Test failed');
  console.log('='.repeat(60));

  return syncResult.success;
}

main()
  .then((success) => process.exit(success ? 0 : 1))
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
