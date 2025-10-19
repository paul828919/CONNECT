/**
 * Test Cache Optimization
 * 
 * Tests the cache improvements and measures hit rates
 * Phase 3: Cache Optimization
 */

import { PrismaClient } from '@prisma/client';
import {
  warmProgramsCache,
  warmOrganizationCache,
  smartWarmCache,
} from '../lib/cache/cache-warming';
import { getCacheStats } from '../lib/cache/redis-cache';

const db = new PrismaClient();

interface TestResults {
  initialStats: any;
  afterWarmingStats: any;
  warmingResults: any;
  improvements: {
    itemsAdded: number;
    timeElapsed: string;
  };
}

async function testCacheOptimization(): Promise<TestResults> {
  console.log('='.repeat(60));
  console.log('CACHE OPTIMIZATION TEST - Phase 3');
  console.log('='.repeat(60));
  console.log('');

  // 1. Get initial cache stats
  console.log('📊 Step 1: Checking initial cache state...');
  const initialStats = getCacheStats();
  console.log('Initial stats:', initialStats);
  console.log('');

  // 2. Test programs cache warming
  console.log('🔥 Step 2: Warming programs cache...');
  const programsWarmed = await warmProgramsCache();
  console.log(`✅ Warmed ${programsWarmed} programs`);
  console.log('');

  // 3. Test organization cache warming
  console.log('🔥 Step 3: Finding and warming organization caches...');
  
  // Get first organization from database
  const organization = await db.organizations.findFirst({
    include: {
      users: true,
    },
  });

  if (organization) {
    console.log(`Found organization: ${organization.name} (${organization.id})`);
    const orgItemsWarmed = await warmOrganizationCache(organization.id);
    console.log(`✅ Warmed ${orgItemsWarmed} items for organization`);
  } else {
    console.log('⚠️ No organizations found in database');
  }
  console.log('');

  // 4. Test smart warming
  console.log('🔥 Step 4: Running smart warming...');
  const startTime = Date.now();
  const warmingResults = await smartWarmCache();
  const endTime = Date.now();
  console.log('Smart warming complete:', warmingResults);
  console.log('');

  // 5. Get final cache stats
  console.log('📊 Step 5: Checking cache state after warming...');
  const afterWarmingStats = getCacheStats();
  console.log('After warming stats:', afterWarmingStats);
  console.log('');

  // 6. Calculate improvements
  const improvements = {
    itemsAdded: warmingResults.itemsWarmed,
    timeElapsed: `${((endTime - startTime) / 1000).toFixed(2)}s`,
  };

  console.log('='.repeat(60));
  console.log('TEST RESULTS SUMMARY');
  console.log('='.repeat(60));
  console.log('');
  console.log('Before Warming:');
  console.log(`  - Hits: ${initialStats.hits}`);
  console.log(`  - Misses: ${initialStats.misses}`);
  console.log(`  - Errors: ${initialStats.errors}`);
  console.log('');
  console.log('After Warming:');
  console.log(`  - Items warmed: ${improvements.itemsAdded}`);
  console.log(`  - Time taken: ${improvements.timeElapsed}`);
  console.log(`  - Organizations: ${warmingResults.breakdown.organizations}`);
  console.log(`  - Programs: ${warmingResults.breakdown.programs}`);
  console.log(`  - Matches: ${warmingResults.breakdown.matches}`);
  console.log('');
  console.log('✅ Cache optimization test complete!');
  console.log('');

  return {
    initialStats,
    afterWarmingStats,
    warmingResults,
    improvements,
  };
}

// Run the test
testCacheOptimization()
  .then((results) => {
    console.log('Test completed successfully');
    console.log(JSON.stringify(results, null, 2));
    process.exit(0);
  })
  .catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

