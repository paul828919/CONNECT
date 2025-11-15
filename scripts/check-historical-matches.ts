/**
 * Check if historical matches exist in database
 *
 * Diagnostic script to verify match generation
 */

import { PrismaClient, ProgramStatus } from '@prisma/client';

const db = new PrismaClient({
  log: ['error', 'warn'],
});

async function checkHistoricalMatches() {
  console.log('🔍 Checking for historical matches in database...\n');

  try {
    // 1. Count all matches
    const totalMatches = await db.funding_matches.count();
    console.log(`📊 Total matches in database: ${totalMatches}`);

    // 2. Count matches to EXPIRED programs
    const historicalMatches = await db.funding_matches.findMany({
      where: {
        funding_programs: {
          status: ProgramStatus.EXPIRED,
        },
      },
      include: {
        funding_programs: {
          select: {
            title: true,
            status: true,
            agencyId: true,
          },
        },
        organizations: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      take: 10,
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`\n🎯 Matches to EXPIRED programs: ${historicalMatches.length}`);

    if (historicalMatches.length > 0) {
      console.log('\n✅ Sample historical matches:');
      historicalMatches.forEach((match, idx) => {
        console.log(`\n   ${idx + 1}. Score: ${match.score}`);
        console.log(`      Organization: ${match.organizations.name}`);
        console.log(`      Program: ${match.funding_programs.title.substring(0, 60)}...`);
        console.log(`      Agency: ${match.funding_programs.agencyId}`);
        console.log(`      Status: ${match.funding_programs.status}`);
        console.log(`      Created: ${match.createdAt.toLocaleDateString('ko-KR')}`);
      });
    } else {
      console.log('\n❌ NO historical matches found in database!');
      console.log('\n💡 This means:');
      console.log('   1. User has never clicked "View 2025 Reference Projects" button');
      console.log('   2. OR the generation API is failing silently');
      console.log('   3. OR matches are being generated but not saved to database');
    }

    // 3. Check if there are any matches at all (to verify DB connection)
    if (totalMatches === 0) {
      console.log('\n⚠️  No matches found at all - database might be empty');
      console.log('   This could mean the app is in initial state');
    }

    // 4. Check organizations that have generated matches
    const orgsWithMatches = await db.funding_matches.groupBy({
      by: ['organizationId'],
      _count: {
        organizationId: true,
      },
    });

    console.log(`\n📈 Organizations with matches: ${orgsWithMatches.length}`);
    if (orgsWithMatches.length > 0) {
      console.log('   Organization IDs:');
      orgsWithMatches.forEach(({ organizationId, _count }) => {
        console.log(`   - ${organizationId}: ${_count.organizationId} matches`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await db.$disconnect();
  }
}

checkHistoricalMatches();
