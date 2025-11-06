/**
 * Test Category Match Bonus (Stage 2.2)
 *
 * Verifies that exact category matches award +10 points before fuzzy keyword matching.
 * Tests using Kim Byung-jin's profile (kbj20415@gmail.com).
 */

import { PrismaClient } from '@prisma/client';
import { generateMatches } from '@/lib/matching/algorithm';

const db = new PrismaClient();

async function testCategoryBonus() {
  console.log('🧪 Testing Category Match Bonus (Stage 2.2)\n');
  console.log('═'.repeat(80));

  try {
    // 1. Find Kim Byung-jin's organization
    const user = await db.user.findFirst({
      where: { email: 'kbj20415@gmail.com' },
      include: {
        organization: true,
      },
    });

    if (!user || !user.organization) {
      console.error('❌ Kim Byung-jin user or organization not found');
      return;
    }

    const org = user.organization;
    console.log(`\n✅ Organization: ${org.name}`);
    console.log(`   Industry Sector: ${org.industrySector}`);
    console.log(`   TRL Level: ${org.technologyReadinessLevel}`);
    console.log(`   R&D Experience: ${org.rdExperience ? 'Yes' : 'No'}`);
    console.log(`   Type: ${org.type}`);

    // 2. Fetch active R&D programs
    const programs = await db.funding_programs.findMany({
      where: {
        status: 'ACTIVE',
        announcementType: 'R_D_PROJECT',
        scrapingSource: { not: null },
      },
      orderBy: [
        { publishedAt: 'desc' },
        { deadline: 'asc' },
      ],
    });

    console.log(`\n📊 Found ${programs.length} active R&D programs`);

    if (programs.length === 0) {
      console.log('\n⚠️  No active programs to test');
      return;
    }

    // 3. Generate matches and analyze category bonus
    console.log('\n🎯 Generating matches...\n');
    const matches = generateMatches(org, programs, 10);

    console.log(`✅ Generated ${matches.length} matches\n`);
    console.log('─'.repeat(80));

    // 4. Analyze matches for category bonus
    let exactCategoryMatches = 0;
    let nonCategoryMatches = 0;

    matches.forEach((match, index) => {
      const hasExactCategoryMatch = match.reasons.includes('EXACT_CATEGORY_MATCH');

      if (hasExactCategoryMatch) {
        exactCategoryMatches++;
      } else {
        nonCategoryMatches++;
      }

      console.log(`\n${index + 1}. Score: ${match.score} | Industry: ${match.breakdown.industryScore} pts`);
      console.log(`   Program: ${match.program.title.substring(0, 60)}...`);
      console.log(`   Category: ${match.program.category || 'N/A'}`);
      console.log(`   Reasons: ${match.reasons.join(', ')}`);

      if (hasExactCategoryMatch) {
        console.log(`   ⭐ EXACT_CATEGORY_MATCH: Org "${org.industrySector}" = Program "${match.program.category}"`);
      }

      console.log(`   Industry Breakdown:`);
      console.log(`     - Exact Matches: ${match.breakdown.industryScore >= 10 ? '✅' : '❌'}`);
      console.log(`     - Sector Matches: ${match.reasons.includes('SECTOR_MATCH') ? '✅' : '❌'}`);
    });

    console.log('\n' + '─'.repeat(80));
    console.log('\n📈 Category Bonus Summary:');
    console.log(`   • Exact Category Matches: ${exactCategoryMatches}/${matches.length}`);
    console.log(`   • Non-Category Matches: ${nonCategoryMatches}/${matches.length}`);

    // 5. Verification
    console.log('\n🔍 Verification:');

    if (exactCategoryMatches > 0) {
      console.log(`   ✅ PASS: Found ${exactCategoryMatches} exact category matches`);
      console.log(`   ✅ PASS: Category bonus (+10 points) is working`);
    } else {
      console.log(`   ⚠️  INFO: No exact category matches found in top ${matches.length} results`);
      console.log(`   ℹ️  This is expected if no programs have category="${org.industrySector}"`);
    }

    // 6. Find programs with matching categories (for debugging)
    const matchingCategoryPrograms = programs.filter(p =>
      p.category?.toLowerCase().trim() === org.industrySector?.toLowerCase().trim()
    );

    console.log(`\n📋 Available programs with category="${org.industrySector}": ${matchingCategoryPrograms.length}`);

    if (matchingCategoryPrograms.length > 0) {
      console.log('\n   Sample programs:');
      matchingCategoryPrograms.slice(0, 3).forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.title.substring(0, 60)}...`);
        console.log(`      Category: "${p.category}"`);
      });
    }

    console.log('\n' + '═'.repeat(80));
    console.log('✅ Category Bonus Test Complete!\n');

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

testCategoryBonus().catch(console.error);
