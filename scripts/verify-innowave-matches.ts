/**
 * Verify Innowave Matches After Re-Classification
 *
 * Validates that Innowave (ICT company) only sees true ICT programs
 * after the database re-classification using official Korean taxonomy.
 *
 * Checks:
 * 1. No Nano/Materials programs (now MANUFACTURING)
 * 2. No Nuclear Safety programs (now ENERGY)
 * 3. Only genuine ICT programs in matches
 * 4. Diverse categories across all company matches
 *
 * Run: npx tsx scripts/verify-innowave-matches.ts
 */

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function verifyInnowaveMatches() {
  console.log('🧪 Verifying Innowave Matches After Re-Classification\n');
  console.log('='.repeat(80));

  try {
    // 1. Find Innowave organization
    console.log('\n🔍 Finding Innowave organization...');
    const innowave = await db.organizations.findFirst({
      where: {
        OR: [
          { name: { contains: 'Innowave', mode: 'insensitive' } },
          { name: { contains: '이노웨이브', mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        industrySector: true,
        researchFocusAreas: true,
      },
    });

    if (!innowave) {
      console.log('   ⚠️  Innowave organization not found in database');
      console.log('   Available companies with "inno" in name:');

      const companies = await db.organizations.findMany({
        where: {
          name: { contains: 'inno', mode: 'insensitive' },
        },
        select: {
          name: true,
          industrySector: true,
        },
      });

      companies.forEach(c => {
        console.log(`      - ${c.name} (${c.industrySector || 'N/A'})`);
      });

      return;
    }

    console.log(`   ✅ Found: ${innowave.name}`);
    console.log(`      Industry Sector: ${innowave.industrySector || 'N/A'}`);
    console.log(`      Research Focus Areas: ${innowave.researchFocusAreas?.join(', ') || 'N/A'}`);

    // 2. Get matches for Innowave
    console.log('\n\n' + '='.repeat(80));
    console.log('📊 Fetching Innowave Matches...\n');

    const matches = await db.funding_matches.findMany({
      where: {
        organizationId: innowave.id,
      },
      include: {
        funding_programs: {
          select: {
            id: true,
            title: true,
            category: true,
            ministry: true,
            announcingAgency: true,
            minTrl: true,
            maxTrl: true,
          },
        },
      },
      orderBy: {
        score: 'desc',
      },
    });

    console.log(`   Total matches: ${matches.length}`);

    if (matches.length === 0) {
      console.log('\n   ⚠️  No matches found for Innowave');
      console.log('   This might indicate:');
      console.log('      1. Matches need to be regenerated after cache clear');
      console.log('      2. Organization profile needs to be completed');
      return;
    }

    // 3. Analyze match categories
    console.log('\n\n' + '='.repeat(80));
    console.log('📈 Match Category Analysis\n');

    const byCategory = matches.reduce((acc, match) => {
      const cat = match.funding_programs.category || 'UNKNOWN';
      if (!acc[cat]) {
        acc[cat] = [];
      }
      acc[cat].push(match);
      return acc;
    }, {} as Record<string, typeof matches>);

    console.log('   Category Distribution:');
    Object.entries(byCategory)
      .sort((a, b) => b[1].length - a[1].length)
      .forEach(([category, matchList]) => {
        const pct = ((matchList.length / matches.length) * 100).toFixed(1);
        const avgScore = (matchList.reduce((sum, m) => sum + m.score, 0) / matchList.length).toFixed(1);
        console.log(`      ${category.padEnd(20)} ${matchList.length.toString().padStart(3)} matches (${pct.padStart(5)}%)  Avg Score: ${avgScore}`);
      });

    // 4. Check for known misclassifications
    console.log('\n\n' + '='.repeat(80));
    console.log('🔍 Checking for Known Misclassifications\n');

    const knownMisclassifications = [
      { keywords: ['나노', '소재'], expectedCategory: 'MANUFACTURING', description: 'Nano/Materials programs' },
      { keywords: ['원자력', '원전'], expectedCategory: 'ENERGY', description: 'Nuclear programs' },
      { keywords: ['농업', '축산'], expectedCategory: 'AGRICULTURE', description: 'Agriculture programs' },
      { keywords: ['건설', '토목'], expectedCategory: 'CONSTRUCTION', description: 'Construction programs' },
    ];

    let foundMisclassifications = false;

    for (const check of knownMisclassifications) {
      const suspicious = matches.filter(match =>
        check.keywords.some(keyword => match.funding_programs.title.includes(keyword)) &&
        match.funding_programs.category === 'ICT'
      );

      if (suspicious.length > 0) {
        foundMisclassifications = true;
        console.log(`\n   ❌ POTENTIAL MISCLASSIFICATION: ${check.description}`);
        console.log(`      Found ${suspicious.length} programs marked as ICT:`);
        suspicious.forEach((match, idx) => {
          console.log(`      ${idx + 1}. ${match.funding_programs.title.substring(0, 60)}...`);
          console.log(`         Category: ${match.funding_programs.category} (Expected: ${check.expectedCategory})`);
          console.log(`         Score: ${match.score}`);
        });
      }
    }

    if (!foundMisclassifications) {
      console.log('   ✅ No known misclassifications found in Innowave matches');
      console.log('      All suspicious programs correctly categorized');
    }

    // 5. Sample ICT matches
    console.log('\n\n' + '='.repeat(80));
    console.log('📋 Sample ICT Matches (Top 10)\n');

    const ictMatches = matches.filter(m => m.funding_programs.category === 'ICT');
    ictMatches.slice(0, 10).forEach((match, idx) => {
      console.log(`\n   ${idx + 1}. ${match.funding_programs.title.substring(0, 80)}...`);
      console.log(`      Ministry: ${match.funding_programs.ministry || 'N/A'}`);
      console.log(`      Agency: ${match.funding_programs.announcingAgency || 'N/A'}`);
      console.log(`      TRL: ${match.funding_programs.minTrl}-${match.funding_programs.maxTrl || 'N/A'}`);
      console.log(`      Score: ${match.score}`);
    });

    // 6. Check all companies for category diversity
    console.log('\n\n' + '='.repeat(80));
    console.log('🌍 Overall Category Diversity Across All Companies\n');

    const allMatches = await db.funding_matches.findMany({
      include: {
        funding_programs: {
          select: {
            category: true,
          },
        },
        organizations: {
          select: {
            name: true,
            industrySector: true,
          },
        },
      },
    });

    const categoryDistribution = allMatches.reduce((acc, match) => {
      const cat = match.funding_programs.category || 'UNKNOWN';
      if (!acc[cat]) {
        acc[cat] = 0;
      }
      acc[cat]++;
      return acc;
    }, {} as Record<string, number>);

    console.log('   Category Distribution Across All Matches:');
    Object.entries(categoryDistribution)
      .sort((a, b) => b[1] - a[1])
      .forEach(([category, count]) => {
        const pct = ((count / allMatches.length) * 100).toFixed(1);
        console.log(`      ${category.padEnd(20)} ${count.toString().padStart(4)} matches (${pct.padStart(5)}%)`);
      });

    // 7. Summary & Recommendations
    console.log('\n\n' + '='.repeat(80));
    console.log('✅ VERIFICATION SUMMARY\n');

    const ictPct = ((ictMatches.length / matches.length) * 100).toFixed(1);
    const hasNonICT = matches.some(m => m.funding_programs.category !== 'ICT');

    console.log(`   Innowave Matches Analysis:`);
    console.log(`      Total Matches: ${matches.length}`);
    console.log(`      ICT Matches: ${ictMatches.length} (${ictPct}%)`);
    console.log(`      Non-ICT Matches: ${matches.length - ictMatches.length} (${(100 - parseFloat(ictPct)).toFixed(1)}%)`);
    console.log(`      Misclassifications Found: ${foundMisclassifications ? 'YES ❌' : 'NO ✅'}`);

    console.log('\n   Status:');
    if (foundMisclassifications) {
      console.log('      ❌ FAILED - Database still contains misclassified programs');
      console.log('      Action Required: Re-run update script or investigate why changes didn\'t apply');
    } else if (ictPct === '100.0' && !hasNonICT) {
      console.log('      ⚠️  WARNING - 100% ICT matches detected');
      console.log('      This might indicate:');
      console.log('         1. Matches generated before database update (need regeneration)');
      console.log('         2. Industry filter still blocking cross-category matches');
    } else {
      console.log('      ✅ PASSED - No misclassifications found');
      console.log('      Database re-classification successful');
      console.log('      ICT company seeing appropriate category diversity');
    }

    console.log('\n   Next Steps:');
    if (foundMisclassifications || ictPct === '100.0') {
      console.log('      1. 🔄 Regenerate matches for Innowave');
      console.log('      2. 🧪 Re-run this verification script');
      console.log('      3. 📊 Monitor match quality');
    } else {
      console.log('      1. ✅ Database re-classification validated');
      console.log('      2. 📊 Monitor match quality over 24 hours');
      console.log('      3. 🚀 Consider updating agency-mapper.ts for future scrapes');
    }

    console.log('\n' + '='.repeat(80));

  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await db.$disconnect();
  }
}

verifyInnowaveMatches();
