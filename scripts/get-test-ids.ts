/**
 * Quick script to fetch test user and organization IDs
 */

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  console.log('📋 Fetching test IDs from database...\n');

  // Get test users
  const users = await db.user.findMany({
    where: { email: { not: null } },
    select: { id: true, email: true },
    take: 3,
  });

  console.log('👤 Available Test Users:');
  users.forEach((user, i) => {
    console.log(`  ${i + 1}. ID: ${user.id}`);
    console.log(`     Email: ${user.email}\n`);
  });

  // Get test organizations with completed profiles
  const orgs = await db.organizations.findMany({
    where: { profileCompleted: true },
    select: {
      id: true,
      name: true,
      industrySector: true,
      type: true,
      profileCompleted: true,
    },
    take: 3,
  });

  console.log('🏢 Available Test Organizations (with completed profiles):');
  orgs.forEach((org, i) => {
    console.log(`  ${i + 1}. ID: ${org.id}`);
    console.log(`     Name: ${org.name}`);
    console.log(`     Industry: ${org.industrySector}`);
    console.log(`     Type: ${org.type}\n`);
  });

  if (users.length === 0 || orgs.length === 0) {
    console.log('⚠️  Warning: No test data found. You may need to:');
    console.log('   1. Create a test user account');
    console.log('   2. Create and complete an organization profile');
  }

  await db.$disconnect();
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
