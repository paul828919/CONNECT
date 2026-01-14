/**
 * One-Time Match Limit Reset Script
 *
 * Purpose: Reset January 2026 match limits for all free users
 * to allow them to experience the updated matching algorithm.
 *
 * This is a ONE-TIME promotional action to boost conversion by
 * letting existing free users see the improved match quality.
 *
 * Key Pattern: match:limit:{userId}:2026-01
 *
 * @see lib/rateLimit.ts - checkMatchLimit() for limit enforcement
 *
 * Usage:
 *   Local:      npx ts-node scripts/reset-january-match-limits.ts
 *   Production: npx ts-node scripts/reset-january-match-limits.ts
 */

import { createClient } from 'redis';

// Month to reset (January 2026)
const TARGET_MONTH = '2026-01';
const MATCH_LIMIT_PATTERN = `match:limit:*:${TARGET_MONTH}`;

interface ResetResult {
  success: boolean;
  keysFound: number;
  keysDeleted: number;
  userIds: string[];
  timestamp: string;
  error?: string;
}

async function resetJanuaryMatchLimits(): Promise<ResetResult> {
  console.log('\n' + '='.repeat(60));
  console.log('ONE-TIME MATCH LIMIT RESET');
  console.log('Target Month: ' + TARGET_MONTH);
  console.log('='.repeat(60) + '\n');

  const result: ResetResult = {
    success: false,
    keysFound: 0,
    keysDeleted: 0,
    userIds: [],
    timestamp: new Date().toISOString(),
  };

  // Create Redis client
  const redis = createClient({
    url: process.env.REDIS_CACHE_URL || 'redis://localhost:6379',
  });

  redis.on('error', (err) => {
    console.error('[REDIS] Connection error:', err.message);
  });

  try {
    // Connect to Redis
    console.log('📡 Connecting to Redis...');
    await redis.connect();
    console.log('✅ Connected to Redis\n');

    // Step 1: Find all match limit keys for January 2026
    console.log(`🔍 Searching for keys matching: ${MATCH_LIMIT_PATTERN}`);
    const keys = await redis.keys(MATCH_LIMIT_PATTERN);
    result.keysFound = keys.length;

    if (keys.length === 0) {
      console.log('ℹ️  No match limit keys found for January 2026.');
      console.log('   This could mean:');
      console.log('   - No users have generated matches this month yet');
      console.log('   - Keys have already been reset');
      result.success = true;
      return result;
    }

    console.log(`✅ Found ${keys.length} match limit keys\n`);

    // Step 2: Extract user IDs and current counts for logging
    console.log('📋 Current Usage Before Reset:');
    console.log('-'.repeat(50));

    for (const key of keys) {
      // Extract userId from key: match:limit:{userId}:2026-01
      const parts = key.split(':');
      const userId = parts[2];
      const currentCount = await redis.get(key);

      result.userIds.push(userId);
      console.log(`   User: ${userId.substring(0, 8)}... | Used: ${currentCount}/2 matches`);
    }
    console.log('-'.repeat(50) + '\n');

    // Step 3: Delete all keys (reset to 0)
    console.log('🗑️  Resetting match limits...');

    // Use pipeline for efficiency (atomic operation)
    const pipeline = redis.multi();
    for (const key of keys) {
      pipeline.del(key);
    }
    await pipeline.exec();

    result.keysDeleted = keys.length;
    result.success = true;

    console.log(`✅ Successfully reset ${result.keysDeleted} match limit counters\n`);

    // Step 4: Verify reset
    console.log('🔍 Verifying reset...');
    const remainingKeys = await redis.keys(MATCH_LIMIT_PATTERN);

    if (remainingKeys.length === 0) {
      console.log('✅ Verification passed: All keys deleted\n');
    } else {
      console.log(`⚠️  Warning: ${remainingKeys.length} keys remain (retry may be needed)\n`);
    }

    // Summary
    console.log('='.repeat(60));
    console.log('RESET COMPLETE - SUMMARY');
    console.log('='.repeat(60));
    console.log(`   Target Month:    ${TARGET_MONTH}`);
    console.log(`   Keys Found:      ${result.keysFound}`);
    console.log(`   Keys Deleted:    ${result.keysDeleted}`);
    console.log(`   Users Affected:  ${result.userIds.length}`);
    console.log(`   Timestamp:       ${result.timestamp}`);
    console.log('='.repeat(60) + '\n');

    console.log('📌 RESULT: All free users can now use 2 additional matches this month.');
    console.log('   This allows them to experience the updated matching algorithm.\n');

  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    console.error('❌ Error during reset:', result.error);
  } finally {
    // Always close Redis connection
    try {
      await redis.quit();
      console.log('📡 Redis connection closed');
    } catch {
      // Ignore close errors
    }
  }

  return result;
}

// Execute
resetJanuaryMatchLimits()
  .then((result) => {
    if (result.success) {
      console.log('\n✅ Script completed successfully');
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    } else {
      console.log('\n❌ Script failed');
      console.log(JSON.stringify(result, null, 2));
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('\n❌ Unexpected error:', error);
    process.exit(1);
  });
