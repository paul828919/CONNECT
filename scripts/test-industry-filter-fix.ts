/**
 * Test Industry Filter Fix
 *
 * Verifies that industry filter bypass for EXPIRED programs is working correctly
 */

import { PrismaClient } from '@prisma/client';
import { generateMatches } from '../lib/matching/algorithm';

const db = new PrismaClient();

async function testIndustryFilterFix() {
  console.log('🧪 Testing Industry Filter Fix for EXPIRED Programs\n');
  console.log('='.repeat(80));

  const orgId = 'e81e467f-a84c-4a8d-ac57-b7527913c695'; // Innowave

  try {
    // 1. Fetch organization
    const org = await db.organizations.findUnique({
      where: { id: orgId },
    });

    if (!org) {
      console.log('❌ Organization not found');
      return;
    }

    console.log('\n👤 ORGANIZATION PROFILE');
    console.log(`   Name: ${org.name}`);
    console.log(`   Type: ${org.type}`);
    console.log(`   Industry Sector: ${org.industrySector}`);
    console.log(`   TRL: ${org.technologyReadinessLevel}`);

    // 2. Fetch ALL EXPIRED programs (across all industries)
    const expiredPrograms = await db.funding_programs.findMany({
      where: {
        status: 'EXPIRED',
      },
    });

    console.log(`\n\n📊 DATABASE STATISTICS`);
    console.log(`   Total EXPIRED Programs: ${expiredPrograms.length}`);

    // Group by category
    const byCategory = expiredPrograms.reduce((acc, p) => {
      const cat = p.category || 'NULL';
      if (!acc[cat]) acc[cat] = 0;
      acc[cat]++;
      return acc;
    }, {} as Record<string, number>);

    console.log(`\n   Category Distribution:`);
    Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .forEach(([cat, count]) => {
        const pct = ((count / expiredPrograms.length) * 100).toFixed(1);
        console.log(`      ${cat}: ${count} (${pct}%)`);
      });

    // 3. Generate matches using the UPDATED algorithm (with industry filter bypass)
    console.log('\n\n' + '='.repeat(80));
    console.log('🔧 TESTING UPDATED ALGORITHM (Industry Filter Bypassed for EXPIRED)\n');

    const matches = generateMatches(org, expiredPrograms, 20, { includeExpired: true });

    console.log(`   Generated Matches: ${matches.length}`);

    // 4. Analyze match diversity
    const matchByCategory = matches.reduce((acc, m) => {
      const cat = m.program.category || 'NULL';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(m);
      return acc;
    }, {} as Record<string, typeof matches>);

    console.log(`\n   Match Category Distribution:`);
    Object.entries(matchByCategory)
      .sort((a, b) => b[1].length - a[1].length)
      .forEach(([cat, ms]) => {
        const pct = ((ms.length / matches.length) * 100).toFixed(1);
        console.log(`      ${cat}: ${ms.length} matches (${pct}%) - Avg Score: ${(ms.reduce((sum, m) => sum + m.score, 0) / ms.length).toFixed(1)}`);
      });

    // 5. Show top matches from each category
    console.log('\n\n' + '='.repeat(80));
    console.log('🏆 TOP MATCHES BY INDUSTRY CATEGORY:\n');

    Object.entries(matchByCategory)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 5) // Top 5 categories
      .forEach(([cat, ms]) => {
        console.log(`\n▸ ${cat} (${ms.length} matches):`);
        ms.slice(0, 2).forEach((m, idx) => {
          console.log(`   ${idx + 1}. [Score: ${m.score}] ${m.program.title.substring(0, 60)}...`);
          console.log(`      Ministry: ${m.program.ministry}`);
          console.log(`      Agency: ${m.program.announcingAgency}\n`);
        });
      });

    // 6. Verification Summary
    console.log('\n' + '='.repeat(80));
    console.log('✅ VERIFICATION RESULTS:\n');

    const uniqueCategories = Object.keys(matchByCategory).length;
    const hasNonICT = matches.some(m => m.program.category !== 'ICT');

    if (uniqueCategories >= 5) {
      console.log(`   ✅ EXCELLENT DIVERSITY - ${uniqueCategories} different industry categories in top 20 matches`);
    } else if (uniqueCategories >= 3) {
      console.log(`   ✅ GOOD DIVERSITY - ${uniqueCategories} different industry categories in top 20 matches`);
    } else {
      console.log(`   ⚠️  LOW DIVERSITY - Only ${uniqueCategories} industry categories in top 20 matches`);
    }

    if (hasNonICT) {
      const nonICTCount = matches.filter(m => m.program.category !== 'ICT').length;
      console.log(`   ✅ FILTER BYPASS WORKING - ${nonICTCount} non-ICT programs included (${((nonICTCount / matches.length) * 100).toFixed(1)}%)`);
    } else {
      console.log(`   ❌ FILTER BYPASS NOT WORKING - All matches are still ICT only`);
    }

    console.log(`\n   📈 Industry Breakdown:`);
    Object.entries(matchByCategory).forEach(([cat, ms]) => {
      const count = ms.length;
      const pct = ((count / matches.length) * 100).toFixed(1);
      console.log(`      ${cat}: ${count} (${pct}%)`);
    });

    console.log('\n' + '='.repeat(80));

    await db.$disconnect();
  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Stack:', error.stack);
    await db.$disconnect();
  }
}

testIndustryFilterFix();
