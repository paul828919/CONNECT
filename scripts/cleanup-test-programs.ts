/**
 * Clean up test programs created during process worker testing
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanup() {
  console.log('🔍 Finding programs created in the last hour...');

  const cutoffTime = new Date(Date.now() - 60 * 60 * 1000);

  const recentPrograms = await prisma.funding_programs.findMany({
    where: {
      createdAt: {
        gte: cutoffTime
      }
    },
    select: {
      id: true,
      title: true,
      announcingAgency: true,
      createdAt: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  console.log(`Found ${recentPrograms.length} recent programs:`);
  recentPrograms.forEach(p => {
    console.log(`  - [${p.id.substring(0, 8)}] ${p.title} (from ${p.announcingAgency || 'N/A'})`);
  });

  if (recentPrograms.length > 0) {
    console.log('\n🗑️  Deleting these programs...');
    const deleted = await prisma.funding_programs.deleteMany({
      where: {
        id: {
          in: recentPrograms.map(p => p.id)
        }
      }
    });
    console.log(`✓ Deleted ${deleted.count} programs`);
  } else {
    console.log('✓ No recent programs to delete');
  }

  await prisma.$disconnect();
}

cleanup().catch((error) => {
  console.error('Error during cleanup:', error);
  process.exit(1);
});
