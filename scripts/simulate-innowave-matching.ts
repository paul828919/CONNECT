/**
 * Simulate Matching for Innowave (이노웨이브)
 *
 * Tests both ACTIVE and EXPIRED matching to diagnose the issue
 */

import { PrismaClient, ProgramStatus, AnnouncementType } from '@prisma/client';
import { generateMatches } from '../lib/matching/algorithm';

const db = new PrismaClient({ log: ['error', 'warn'] });

async function simulateInnowave() {
  console.log('🧪 Simulating Matching for Innowave (이노웨이브)\n');
  console.log('='.repeat(70));

  const orgId = 'e81e467f-a84c-4a8d-ac57-b7527913c695'; // Updated Innowave

  try {
    // Fetch organization
    const organization = await db.organizations.findUnique({
      where: { id: orgId },
    });

    if (!organization) {
      console.log('❌ Organization not found!');
      return;
    }

    console.log('\n📋 Organization Profile:');
    console.log(`   Name: ${organization.name}`);
    console.log(`   Type: ${organization.type}`);
    console.log(`   Industry: ${organization.industrySector}`);
    console.log(`   Employee Count: ${organization.employeeCount}`);
    console.log(`   TRL: ${organization.technologyReadinessLevel}`);
    console.log(`   R&D Experience: ${organization.rdExperience}`);
    console.log(`   Business Structure: ${organization.businessStructure}`);
    console.log(`   Certifications: ${organization.certifications?.join(', ') || 'None'}`);
    console.log(`   Profile Score: ${organization.profileScore}/150`);

    // Test 1: ACTIVE program matching (normal flow)
    console.log('\n' + '='.repeat(70));
    console.log('TEST 1: ACTIVE Program Matching (Normal Flow)\n');

    const activePrograms = await db.funding_programs.findMany({
      where: {
        status: ProgramStatus.ACTIVE,
        announcementType: AnnouncementType.R_D_PROJECT,
        scrapingSource: {
          not: null,
          notIn: ['NTIS_API'],
        },
      },
      take: 100,
    });

    console.log(`📊 Testing against ${activePrograms.length} ACTIVE programs...\n`);

    const activeMatches = generateMatches(
      organization,
      activePrograms,
      10,
      { includeExpired: false }
    );

    console.log(`✅ Result: ${activeMatches.length} matches generated`);

    if (activeMatches.length > 0) {
      console.log('\n   Top matches:');
      activeMatches.slice(0, 5).forEach((match, idx) => {
        console.log(`   ${idx + 1}. Score: ${match.score} - ${match.program.title.substring(0, 60)}...`);
      });
    } else {
      console.log('   ⚠️  No matches found for ACTIVE programs');
    }

    // Test 2: EXPIRED program matching (historical flow)
    console.log('\n' + '='.repeat(70));
    console.log('TEST 2: EXPIRED Program Matching (Historical Flow)\n');

    const expiredPrograms = await db.funding_programs.findMany({
      where: {
        status: ProgramStatus.EXPIRED,
        announcementType: AnnouncementType.R_D_PROJECT,
        scrapingSource: {
          not: null,
          notIn: ['NTIS_API'],
        },
      },
      take: 100,
      orderBy: [
        { publishedAt: 'desc' },
        { deadline: 'desc' },
      ],
    });

    console.log(`📊 Testing against ${expiredPrograms.length} EXPIRED programs...\n`);

    const expiredMatches = generateMatches(
      organization,
      expiredPrograms,
      10,
      { includeExpired: true }
    );

    console.log(`✅ Result: ${expiredMatches.length} matches generated`);

    if (expiredMatches.length > 0) {
      console.log('\n   Top matches:');
      expiredMatches.slice(0, 5).forEach((match, idx) => {
        console.log(`   ${idx + 1}. Score: ${match.score} - ${match.program.title.substring(0, 60)}...`);
      });
    } else {
      console.log('   ⚠️  No matches found for EXPIRED programs');
    }

    // Detailed analysis if no matches
    if (activeMatches.length === 0 && expiredMatches.length === 0) {
      console.log('\n' + '='.repeat(70));
      console.log('🔍 DIAGNOSTIC: Why No Matches?\n');

      // Sample program analysis
      const sampleProgram = expiredPrograms[0];
      if (sampleProgram) {
        console.log('Sample Program Analysis:');
        console.log(`   Title: ${sampleProgram.title.substring(0, 60)}...`);
        console.log(`   TRL Range: ${sampleProgram.minTrl} - ${sampleProgram.maxTrl}`);
        console.log(`   Target Types: ${sampleProgram.targetType?.join(', ') || 'Not specified'}`);
        console.log(`   Category: ${sampleProgram.category}`);
        console.log(`   Business Structures: ${sampleProgram.allowedBusinessStructures?.join(', ') || 'Not specified'}`);

        console.log('\n   Compatibility Check:');
        console.log(`   ├─ TRL Match: Org TRL ${organization.technologyReadinessLevel} vs Program ${sampleProgram.minTrl}-${sampleProgram.maxTrl}`);

        const trlMatch = organization.technologyReadinessLevel !== null &&
          sampleProgram.minTrl !== null &&
          sampleProgram.maxTrl !== null &&
          organization.technologyReadinessLevel >= sampleProgram.minTrl &&
          organization.technologyReadinessLevel <= sampleProgram.maxTrl;
        console.log(`   │  ${trlMatch ? '✅' : '❌'} ${trlMatch ? 'Compatible' : 'Incompatible'}`);

        const typeMatch = !sampleProgram.targetType || sampleProgram.targetType.includes(organization.type);
        console.log(`   ├─ Type Match: ${typeMatch ? '✅' : '❌'} ${typeMatch ? 'Compatible' : `Incompatible (needs ${sampleProgram.targetType?.join(' or ')})`}`);

        const industryMatch = organization.industrySector === sampleProgram.category;
        console.log(`   └─ Industry Match: ${industryMatch ? '✅' : '❌'} ${industryMatch ? 'Compatible' : `Different (${organization.industrySector} vs ${sampleProgram.category})`}`);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('📈 SUMMARY\n');
    console.log(`ACTIVE Programs Tested: ${activePrograms.length}`);
    console.log(`ACTIVE Matches Generated: ${activeMatches.length} (${((activeMatches.length / Math.max(activePrograms.length, 1)) * 100).toFixed(1)}%)`);
    console.log(`\nEXPIRED Programs Tested: ${expiredPrograms.length}`);
    console.log(`EXPIRED Matches Generated: ${expiredMatches.length} (${((expiredMatches.length / Math.max(expiredPrograms.length, 1)) * 100).toFixed(1)}%)`);

    if (activeMatches.length === 0 && expiredMatches.length === 0) {
      console.log('\n⚠️  CRITICAL ISSUE: Algorithm is too strict - generating 0 matches');
      console.log('   This confirms the root cause identified in previous diagnostics.');
      console.log('   Recommend implementing Option B (relax TRL + Target Type filters).');
    }

  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
    console.error('   Stack:', error.stack);
  } finally {
    await db.$disconnect();
  }
}

simulateInnowave();
