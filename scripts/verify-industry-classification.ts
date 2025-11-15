/**
 * Verify Industry Classification for All Programs
 *
 * Investigates what fields are actually being used for industry classification
 */

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function verifyIndustryClassification() {
  console.log('🔍 Verifying Industry Classification for All Programs\n');
  console.log('='.repeat(80));

  try {
    // 1. Get all programs with their industry classification
    const programs = await db.funding_programs.findMany({
      select: {
        id: true,
        title: true,
        ministry: true,
        announcingAgency: true,
        category: true,
        status: true,
        keywords: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`\n📊 Total Programs in Database: ${programs.length}\n`);

    // 2. Group by category (this might be what's showing as "industry")
    const byCategory = programs.reduce((acc, p) => {
      const cat = p.category || 'NULL';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(p);
      return acc;
    }, {} as Record<string, typeof programs>);

    console.log('📈 Category Distribution:\n');
    Object.entries(byCategory).forEach(([cat, progs]) => {
      console.log(`   ${cat}: ${progs.length} programs (${((progs.length / programs.length) * 100).toFixed(1)}%)`);
    });

    // 3. Show sample programs from each category
    console.log('\n\n' + '='.repeat(80));
    console.log('📋 Sample Programs by Category:\n');

    Object.entries(byCategory).forEach(([cat, progs]) => {
      console.log(`\n▸ ${cat} (${progs.length} programs):`);
      progs.slice(0, 3).forEach((p, idx) => {
        console.log(`   ${idx + 1}. [${p.status}] ${p.title.substring(0, 60)}...`);
        console.log(`      Ministry: ${p.ministry}`);
        console.log(`      Agency: ${p.announcingAgency}`);
        console.log(`      Keywords: ${p.keywords?.slice(0, 5).join(', ')}\n`);
      });
      if (progs.length > 3) {
        console.log(`   ... and ${progs.length - 3} more programs\n`);
      }
    });

    // 4. Check Innowave's matches specifically
    console.log('\n' + '='.repeat(80));
    console.log('👤 Innowave (Kim Byungjin) Historical Matches:\n');

    const innowaveMatches = await db.funding_matches.findMany({
      where: {
        organizationId: 'e81e467f-a84c-4a8d-ac57-b7527913c695',
        funding_programs: {
          status: 'EXPIRED',
        },
      },
      include: {
        funding_programs: {
          select: {
            title: true,
            category: true,
            ministry: true,
            announcingAgency: true,
            keywords: true,
          },
        },
      },
      orderBy: {
        score: 'desc',
      },
    });

    console.log(`   Total Historical Matches: ${innowaveMatches.length}\n`);

    innowaveMatches.forEach((match, idx) => {
      const p = match.funding_programs;
      console.log(`   ${idx + 1}. [Score: ${match.score}] ${p.title.substring(0, 50)}...`);
      console.log(`      Category: ${p.category}`);
      console.log(`      Ministry: ${p.ministry}`);
      console.log(`      Agency: ${p.announcingAgency}`);
      console.log(`      Keywords: ${p.keywords?.slice(0, 3).join(', ')}\n`);
    });

    // 5. Check organization's industrySector field
    console.log('\n' + '='.repeat(80));
    console.log('👤 Innowave Organization Profile:\n');

    const org = await db.organizations.findUnique({
      where: { id: 'e81e467f-a84c-4a8d-ac57-b7527913c695' },
      select: {
        name: true,
        type: true,
        industrySector: true,
        technologyReadinessLevel: true,
      },
    });

    if (org) {
      console.log(`   Name: ${org.name}`);
      console.log(`   Type: ${org.type}`);
      console.log(`   Industry Sector: ${org.industrySector}`);
      console.log(`   TRL: ${org.technologyReadinessLevel}`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('💡 ANALYSIS:\n');

    console.log('   ⚠️  SCHEMA OBSERVATION:');
    console.log('      - Organizations have: industrySector field (String?)');
    console.log('      - Programs have: category field (String?)');
    console.log('      - Programs DO NOT have: industrySector field\n');

    console.log('   ❓ QUESTION:');
    console.log('      Is the UI showing program.category as "industry"?');
    console.log('      Or is there a mapping/classification logic we need to find?\n');

    await db.$disconnect();
  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Stack:', error.stack);
    await db.$disconnect();
  }
}

verifyIndustryClassification();
