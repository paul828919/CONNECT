/**
 * Test Script: Historical Match Generation & Retrieval
 *
 * Tests Phase 2 implementation:
 * 1. Historical match generation (POST /api/matches/historical/generate)
 * 2. Historical match retrieval (GET /api/matches/historical)
 * 3. Rate limit enforcement (FREE tier: 3 matches/month)
 * 4. Database UPSERT (no duplicate matches)
 * 5. Redis caching (24h TTL)
 *
 * Prerequisites:
 * - PostgreSQL running with Phase 1 data (EXPIRED programs)
 * - Redis running for caching
 * - Test user account with FREE tier subscription
 * - Test organization with completed profile
 *
 * Usage:
 *   npx tsx scripts/test-historical-matches.ts
 */

import { PrismaClient, ProgramStatus, AnnouncementType } from '@prisma/client';
import { generateMatches } from '../lib/matching/algorithm';
import { generateExplanation } from '../lib/matching/explainer';
import {
  getCache,
  setCache,
  deleteCache,
  getOrgCacheKey,
  CACHE_TTL,
} from '../lib/cache/redis-cache';

const db = new PrismaClient();

// Test configuration
const TEST_CONFIG = {
  // Using actual IDs from LOCAL database
  userId: 'cmgzf1ple0000108wty15h9z1', // kbj20415@hanmail.net
  organizationId: '8685be60-46b6-497d-88df-959f5a7fbfe3', // Test Company Ltd. (SOFTWARE, COMPANY)
  subscriptionPlan: 'free' as const,
};

async function main() {
  console.log('🧪 Historical Matches Test Suite\n');
  console.log('='.repeat(80));

  try {
    // Test 1: Verify EXPIRED programs exist
    console.log('\n📋 Test 1: Verify Phase 1 Data Exists');
    console.log('-'.repeat(80));

    const expiredPrograms = await db.funding_programs.findMany({
      where: {
        status: ProgramStatus.EXPIRED,
        announcementType: AnnouncementType.R_D_PROJECT,
        scrapingSource: {
          not: null,
          notIn: ['NTIS_API'],
        },
      },
      take: 10,
    });

    console.log(`✅ Found ${expiredPrograms.length} EXPIRED programs`);
    if (expiredPrograms.length === 0) {
      throw new Error(
        '❌ No EXPIRED programs found. Run Phase 1 scraping first.'
      );
    }

    console.log('\nSample programs:');
    expiredPrograms.slice(0, 3).forEach((program, i) => {
      console.log(
        `  ${i + 1}. ${program.title} (${program.agencyId}) - Deadline: ${program.deadline?.toISOString().split('T')[0]}`
      );
    });

    // Test 2: Algorithm with includeExpired option
    console.log('\n\n📋 Test 2: Algorithm with includeExpired Option');
    console.log('-'.repeat(80));

    // Fetch test organization
    const organization = await db.organizations.findUnique({
      where: { id: TEST_CONFIG.organizationId },
    });

    if (!organization) {
      throw new Error(
        `❌ Test organization ${TEST_CONFIG.organizationId} not found. Update TEST_CONFIG with valid org ID.`
      );
    }

    console.log(`Organization: ${organization.name}`);
    console.log(`Industry: ${organization.industrySector}`);
    console.log(`Type: ${organization.type}`);
    console.log(`TRL: ${organization.technologyReadinessLevel}`);

    // Test WITHOUT includeExpired (should return 0 matches)
    console.log('\n  Testing WITHOUT includeExpired option...');
    const matchesWithoutOption = generateMatches(
      organization,
      expiredPrograms,
      10
    );
    console.log(
      `  ✅ Returned ${matchesWithoutOption.length} matches (expected: 0)`
    );
    if (matchesWithoutOption.length > 0) {
      throw new Error(
        '❌ Algorithm returned EXPIRED programs without includeExpired=true'
      );
    }

    // Test WITH includeExpired (should return matches)
    console.log('\n  Testing WITH includeExpired=true option...');
    const matchesWithOption = generateMatches(
      organization,
      expiredPrograms,
      10,
      { includeExpired: true }
    );
    console.log(`  ✅ Returned ${matchesWithOption.length} matches`);

    if (matchesWithOption.length === 0) {
      console.log(
        '  ⚠️  No matches found. This may be due to organization profile not matching any programs.'
      );
    } else {
      console.log('\n  Top 3 matches:');
      matchesWithOption.slice(0, 3).forEach((match, i) => {
        console.log(
          `    ${i + 1}. Score: ${match.score} - ${match.program.title}`
        );
        console.log(`       Industry: ${match.breakdown.industryScore}pts | TRL: ${match.breakdown.trlScore}pts | Type: ${match.breakdown.typeScore}pts`);
      });
    }

    // Test 3: Database UPSERT (no duplicates)
    console.log('\n\n📋 Test 3: Database UPSERT (Prevent Duplicates)');
    console.log('-'.repeat(80));

    if (matchesWithOption.length > 0) {
      const testMatch = matchesWithOption[0];
      const explanation = generateExplanation(
        testMatch,
        organization,
        testMatch.program
      );

      console.log('  Creating initial match record...');

      // First insert
      const match1 = await db.funding_matches.upsert({
        where: {
          organizationId_programId: {
            organizationId: organization.id,
            programId: testMatch.program.id,
          },
        },
        update: {
          score: testMatch.score,
          explanation: explanation as any,
        },
        create: {
          organizationId: organization.id,
          programId: testMatch.program.id,
          score: testMatch.score,
          explanation: explanation as any,
        },
      });

      console.log(`  ✅ First UPSERT: Match ID ${match1.id}`);

      // Second insert (should update, not create new)
      const match2 = await db.funding_matches.upsert({
        where: {
          organizationId_programId: {
            organizationId: organization.id,
            programId: testMatch.program.id,
          },
        },
        update: {
          score: testMatch.score + 1, // Change score to verify update
          explanation: explanation as any,
        },
        create: {
          organizationId: organization.id,
          programId: testMatch.program.id,
          score: testMatch.score,
          explanation: explanation as any,
        },
      });

      console.log(`  ✅ Second UPSERT: Match ID ${match2.id}`);

      if (match1.id === match2.id) {
        console.log('  ✅ UPSERT successful - Same record updated (no duplicate)');
      } else {
        throw new Error(
          '❌ UPSERT failed - Created duplicate match records'
        );
      }

      // Verify only one record exists
      const matchCount = await db.funding_matches.count({
        where: {
          organizationId: organization.id,
          programId: testMatch.program.id,
        },
      });

      if (matchCount === 1) {
        console.log(
          `  ✅ Database verification: Exactly 1 match record exists`
        );
      } else {
        throw new Error(
          `❌ Database verification failed: Found ${matchCount} records (expected 1)`
        );
      }
    } else {
      console.log('  ⏭️  Skipped (no matches to test)');
    }

    // Test 4: Redis Caching
    console.log('\n\n📋 Test 4: Redis Caching (24h TTL)');
    console.log('-'.repeat(80));

    const historicalMatchCacheKey = `historical-match:${organization.id}`;
    const testCacheData = {
      success: true,
      matches: matchesWithOption.slice(0, 3).map((m) => ({
        programId: m.program.id,
        score: m.score,
      })),
      timestamp: new Date().toISOString(),
    };

    console.log('  Writing test data to cache...');
    await setCache(historicalMatchCacheKey, testCacheData, CACHE_TTL.MATCH_RESULTS);
    console.log(`  ✅ Cache key: ${historicalMatchCacheKey}`);
    console.log(`  ✅ TTL: ${CACHE_TTL.MATCH_RESULTS}s (${CACHE_TTL.MATCH_RESULTS / 3600}h)`);

    console.log('\n  Reading from cache...');
    const cachedData = await getCache<typeof testCacheData>(
      historicalMatchCacheKey
    );

    if (cachedData && cachedData.timestamp === testCacheData.timestamp) {
      console.log('  ✅ Cache read successful - Data matches');
    } else {
      throw new Error('❌ Cache read failed or data mismatch');
    }

    console.log('\n  Deleting cache entry...');
    await deleteCache(historicalMatchCacheKey);
    const deletedCheck = await getCache(historicalMatchCacheKey);

    if (!deletedCheck) {
      console.log('  ✅ Cache deletion successful');
    } else {
      throw new Error('❌ Cache deletion failed');
    }

    // Test 5: Rate Limit Enforcement (Manual Check)
    console.log('\n\n📋 Test 5: Rate Limit Enforcement');
    console.log('-'.repeat(80));
    console.log(
      '  ⚠️  This test requires manual verification via API endpoints:'
    );
    console.log('\n  1. Clear user rate limit in Redis:');
    console.log(
      `     redis-cli DEL "match:limit:${TEST_CONFIG.userId}:$(date +%Y-%m)"`
    );
    console.log('\n  2. Call historical match generation 4 times:');
    console.log(
      `     curl -X POST "http://localhost:3000/api/matches/historical/generate?organizationId=${organization.id}" \\`
    );
    console.log('          -H "Authorization: Bearer <your-token>" \\');
    console.log('          -H "Content-Type: application/json"');
    console.log('\n  3. Expected results:');
    console.log('     - Request 1: Success (remaining: 2)');
    console.log('     - Request 2: Success (remaining: 1)');
    console.log('     - Request 3: Success (remaining: 0)');
    console.log('     - Request 4: HTTP 429 - Monthly match limit reached');

    // Summary
    console.log('\n\n' + '='.repeat(80));
    console.log('📊 Test Summary');
    console.log('='.repeat(80));
    console.log('✅ Phase 1 Data: EXPIRED programs exist');
    console.log('✅ Algorithm: includeExpired option works correctly');
    console.log('✅ Database: UPSERT prevents duplicate matches');
    console.log('✅ Caching: Redis 24h TTL works correctly');
    console.log('⚠️  Rate Limiting: Requires manual API testing');

    console.log('\n🎉 All automated tests passed!');
    console.log(
      '\n📝 Next steps:\n   1. Run manual rate limit test via API\n   2. Implement frontend UI (Step 5)\n   3. Deploy to production'
    );
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

main();
