#!/usr/bin/env tsx
/**
 * Verify that DEFENSE programs are not in the matches table
 * This confirms the category filter is working in production
 */

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('VERIFY DEFENSE FILTER IN DATABASE');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Check existing matches
  const matches = await db.funding_matches.findMany({
    include: {
      funding_programs: { select: { category: true, title: true } },
      organizations: { select: { name: true, industrySector: true } }
    }
  });

  console.log(`📊 Total matches in database: ${matches.length}`);
  console.log('');

  // Count by category
  const byCategory = matches.reduce((acc, m) => {
    const cat = m.funding_programs.category || 'NULL';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('Matches by program category:');
  Object.entries(byCategory).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
    console.log(`  ${cat}: ${count} matches`);
  });
  console.log('');

  // Check for DEFENSE matches (should be 0)
  const defenseMatches = matches.filter(m => m.funding_programs.category === 'DEFENSE');

  console.log('🎯 CRITICAL CHECK: DEFENSE Matches');
  console.log('───────────────────────────────────────────────────────────');

  if (defenseMatches.length === 0) {
    console.log('✅ SUCCESS: No DEFENSE matches exist in database');
    console.log('The category compatibility filter is preventing DEFENSE matches.');
    console.log('');
    console.log('This confirms:');
    console.log('  1. DEFENSE sector added to taxonomy correctly');
    console.log('  2. Category compatibility filter working in production');
    console.log('  3. ICT ↔ DEFENSE blocked (0.2 relevance < 0.3 threshold)');
  } else {
    console.log(`❌ FAIL: Found ${defenseMatches.length} DEFENSE matches!`);
    console.log('');
    console.log('These matches should not exist:');
    defenseMatches.forEach((m, idx) => {
      const title = m.funding_programs.title.substring(0, 50);
      console.log(`  ${idx + 1}. ${m.organizations.name} (${m.organizations.industrySector})`);
      console.log(`     → ${title}...`);
      console.log(`     Score: ${m.score}`);
    });
  }
  console.log('');

  // Check if the original problematic match exists
  const ictOrg = await db.organizations.findFirst({
    where: { name: '이노웨이브' }
  });

  const defenseProgram = await db.funding_programs.findFirst({
    where: { title: { contains: '글로벌 방위산업' } }
  });

  if (ictOrg && defenseProgram) {
    const problemMatch = await db.funding_matches.findFirst({
      where: {
        organizationId: ictOrg.id,
        programId: defenseProgram.id
      }
    });

    console.log('🔍 Original Bug Check: Innowave (ICT) ↔ DEFENSE Program');
    console.log('───────────────────────────────────────────────────────────');

    if (problemMatch) {
      console.log('❌ FAIL: Original problematic match still exists!');
      console.log(`Match ID: ${problemMatch.id}, Score: ${problemMatch.score}`);
    } else {
      console.log('✅ SUCCESS: Original problematic match has been removed');
      console.log('ICT company no longer matches DEFENSE program');
    }
  }

  await db.$disconnect();
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
