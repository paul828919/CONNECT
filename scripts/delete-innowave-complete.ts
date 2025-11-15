/**
 * Complete deletion of Innowave organization profile and all related data
 */

import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

const prisma = new PrismaClient();
const redisCache = new Redis({
  host: 'localhost',
  port: 6379, // cache port
  maxRetriesPerRequest: null,
});

async function deleteInnoaveComplete() {
  console.log('🔍 Finding Innowave organization...\n');

  try {
    // Find organization
    const org = await prisma.organizations.findFirst({
      where: {
        OR: [
          { name: { contains: 'Inowave', mode: 'insensitive' } },
          { name: { contains: '이노웨이브' } },
        ]
      }
    });

    if (!org) {
      console.log('✅ No Innowave organization found - already deleted or never created\n');
      return;
    }

    console.log(`📋 Found organization: ${org.name} (${org.id})\n`);

    // Check for related data
    const matches = await prisma.funding_matches.findMany({
      where: { organizationId: org.id },
      select: { id: true }
    });
    const matchIds = matches.map(m => m.id);

    const notificationsCount = matchIds.length > 0
      ? await prisma.match_notifications.count({
          where: { matchId: { in: matchIds } }
        })
      : 0;

    console.log('📊 Related data:');
    console.log(`   - Funding matches: ${matches.length}`);
    console.log(`   - Match notifications: ${notificationsCount}\n`);

    // Delete related data first (due to foreign keys)
    if (notificationsCount > 0) {
      console.log('🗑️  Deleting match notifications...');
      await prisma.match_notifications.deleteMany({
        where: { matchId: { in: matchIds } }
      });
      console.log(`   ✓ Deleted ${notificationsCount} notifications\n`);
    }

    if (matches.length > 0) {
      console.log('🗑️  Deleting funding matches...');
      await prisma.funding_matches.deleteMany({
        where: { organizationId: org.id }
      });
      console.log(`   ✓ Deleted ${matches.length} matches\n`);
    }

    // Delete organization profile
    console.log('🗑️  Deleting organization profile...');
    await prisma.organizations.delete({
      where: { id: org.id }
    });
    console.log('   ✓ Organization deleted\n');

    // Clear Redis caches
    console.log('🗑️  Clearing Redis caches...');
    const cacheKeys = await redisCache.keys(`*${org.id}*`);
    if (cacheKeys.length > 0) {
      await redisCache.del(...cacheKeys);
      console.log(`   ✓ Cleared ${cacheKeys.length} cache keys\n`);
    } else {
      console.log('   ✓ No cache keys to clear\n');
    }

    // Verify deletion
    const remaining = await prisma.organizations.findUnique({
      where: { id: org.id }
    });

    if (!remaining) {
      console.log('✅ SUCCESS: Innowave organization and all related data deleted\n');
    } else {
      console.log('⚠️  WARNING: Organization still exists after deletion\n');
    }

  } catch (error) {
    console.error('❌ Error during deletion:', error);
    throw error;
  } finally {
    await redisCache.quit();
    await prisma.$disconnect();
  }
}

deleteInnoaveComplete()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
