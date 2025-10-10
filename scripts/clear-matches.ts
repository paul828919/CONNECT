/**
 * Clear matches for a specific organization
 * Usage: npx tsx scripts/clear-matches.ts <organizationId>
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearMatches(organizationId: string) {
  try {
    console.log(`Clearing matches for organization: ${organizationId}`);

    const result = await prisma.fundingMatch.deleteMany({
      where: {
        organizationId: organizationId,
      },
    });

    console.log(`✅ Successfully deleted ${result.count} matches`);
  } catch (error) {
    console.error('❌ Error clearing matches:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Get organization ID from command line argument
const organizationId = process.argv[2];

if (!organizationId) {
  console.error('❌ Please provide an organization ID');
  console.log('Usage: npx tsx scripts/clear-matches.ts <organizationId>');
  process.exit(1);
}

clearMatches(organizationId);
