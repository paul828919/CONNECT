/**
 * Script to delete all matching results for Kim Byung-jin (Inowave) profile
 *
 * This script:
 * 1. Finds the organization profile for Inowave/Kim Byung-jin
 * 2. Lists all funding_matches for that organization
 * 3. Deletes all matches (cascade deletes match_notifications)
 * 4. Reports deletion summary
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteInoaveMatches() {
  console.log('🔍 Step 1: Finding Kim Byung-jin (Inowave) organization profile...\n');

  try {
    // Search for organization profile
    const organizations = await prisma.organizations.findMany({
      where: {
        OR: [
          { name: { contains: 'Inowave', mode: 'insensitive' } },
          { name: { contains: '이노웨이브' } },
          { primaryContactName: { contains: '김병진' } },
          { primaryContactName: { contains: 'Kim', mode: 'insensitive' } },
        ]
      },
      select: {
        id: true,
        name: true,
        primaryContactName: true,
        primaryContactEmail: true,
        createdAt: true,
      }
    });

    console.log(`Found ${organizations.length} matching organization(s):\n`);
    organizations.forEach((org, idx) => {
      console.log(`${idx + 1}. ID: ${org.id}`);
      console.log(`   Name: ${org.name}`);
      console.log(`   Contact: ${org.primaryContactName || 'N/A'}`);
      console.log(`   Email: ${org.primaryContactEmail || 'N/A'}`);
      console.log(`   Created: ${org.createdAt.toISOString()}\n`);
    });

    if (organizations.length === 0) {
      console.log('❌ No matching organization found. Exiting...');
      return;
    }

    if (organizations.length > 1) {
      console.log('⚠️  Multiple organizations found. Please manually select the correct one.');
      console.log('   Edit this script to specify the exact organization ID.\n');
      return;
    }

    const targetOrg = organizations[0];
    console.log(`✅ Target organization identified: ${targetOrg.name} (${targetOrg.id})\n`);

    // Step 2: Count matches
    console.log('📊 Step 2: Counting funding matches...\n');

    const matchCount = await prisma.funding_matches.count({
      where: { organizationId: targetOrg.id }
    });

    console.log(`Found ${matchCount} funding match(es) to delete.\n`);

    if (matchCount === 0) {
      console.log('ℹ️  No matches to delete. Exiting...');
      return;
    }

    // Step 3: List matches before deletion
    console.log('📋 Step 3: Listing matches to be deleted...\n');

    const matches = await prisma.funding_matches.findMany({
      where: { organizationId: targetOrg.id },
      include: {
        funding_programs: {
          select: {
            id: true,
            title: true,
            agencyId: true,
            deadline: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    matches.forEach((match, idx) => {
      console.log(`${idx + 1}. Match ID: ${match.id}`);
      console.log(`   Program: ${match.funding_programs.title}`);
      console.log(`   Agency: ${match.funding_programs.agencyId}`);
      console.log(`   Score: ${match.score}`);
      console.log(`   Created: ${match.createdAt.toISOString()}`);
      console.log(`   Viewed: ${match.viewed}, Saved: ${match.saved}\n`);
    });

    // Step 4: Delete matches (CASCADE deletes match_notifications)
    console.log('🗑️  Step 4: Deleting all matches...\n');

    const deleteResult = await prisma.funding_matches.deleteMany({
      where: { organizationId: targetOrg.id }
    });

    console.log(`✅ Successfully deleted ${deleteResult.count} funding match(es).\n`);
    console.log('   Note: Related match_notifications were also deleted (CASCADE).\n');

    // Step 5: Verify deletion
    console.log('✓ Step 5: Verifying deletion...\n');

    const remainingMatches = await prisma.funding_matches.count({
      where: { organizationId: targetOrg.id }
    });

    if (remainingMatches === 0) {
      console.log('✅ Verification successful - All matches deleted.\n');
    } else {
      console.log(`⚠️  Warning: ${remainingMatches} match(es) still remain!\n`);
    }

    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ Deletion Complete');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Organization: ${targetOrg.name}`);
    console.log(`Contact: ${targetOrg.primaryContactName || 'N/A'}`);
    console.log(`Matches Deleted: ${deleteResult.count}`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log('═══════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Error during deletion:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

deleteInoaveMatches()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
