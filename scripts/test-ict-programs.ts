/**
 * Deep Analysis: ICT Programs Scoring
 *
 * Why aren't ICT programs (exact category match) ranking in top 5?
 * This script analyzes the 7 ICT programs to understand their scoring breakdown.
 */

import { PrismaClient } from '@prisma/client';
import { calculateMatchScore } from '@/lib/matching/algorithm';

const db = new PrismaClient();

async function analyzeICTPrograms() {
  console.log('🔍 Deep Analysis: ICT Programs Scoring\n');
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
      console.error('❌ Organization not found');
      return;
    }

    const org = user.organization;
    console.log(`\n✅ Organization: ${org.name}`);
    console.log(`   Industry Sector: "${org.industrySector}"`);

    // 2. Find ICT programs
    const ictPrograms = await db.funding_programs.findMany({
      where: {
        status: 'ACTIVE',
        announcementType: 'R_D_PROJECT',
        category: 'ICT', // Exact match
        scrapingSource: { not: null },
      },
      orderBy: { publishedAt: 'desc' },
    });

    console.log(`\n📊 Found ${ictPrograms.length} ICT programs (category="ICT")\n`);
    console.log('─'.repeat(80));

    // 3. Score each ICT program
    ictPrograms.forEach((program, index) => {
      const matchScore = calculateMatchScore(org, program);

      console.log(`\n${index + 1}. "${program.title.substring(0, 70)}..."`);
      console.log(`   Published: ${program.publishedAt?.toISOString().split('T')[0] || 'N/A'}`);
      console.log(`   Deadline: ${program.deadline?.toISOString().split('T')[0] || 'N/A'}`);
      console.log(`   TRL Range: ${program.minTrl}-${program.maxTrl}`);
      console.log(`\n   🎯 Total Score: ${matchScore.score}/100`);
      console.log(`   ├─ Industry: ${matchScore.breakdown.industryScore}/30 pts`);
      console.log(`   ├─ TRL: ${matchScore.breakdown.trlScore}/20 pts`);
      console.log(`   ├─ Type: ${matchScore.breakdown.typeScore}/20 pts`);
      console.log(`   ├─ R&D: ${matchScore.breakdown.rdScore}/15 pts`);
      console.log(`   └─ Deadline: ${matchScore.breakdown.deadlineScore}/15 pts`);

      console.log(`\n   Reasons: ${matchScore.reasons.join(', ')}`);

      const hasExactCategoryMatch = matchScore.reasons.includes('EXACT_CATEGORY_MATCH');
      if (hasExactCategoryMatch) {
        console.log(`   ⭐ EXACT_CATEGORY_MATCH detected! (+10 bonus points)`);
      } else {
        console.log(`   ⚠️  WARNING: EXACT_CATEGORY_MATCH NOT detected!`);
        console.log(`      Org sector: "${org.industrySector}"`);
        console.log(`      Program category: "${program.category}"`);
      }
    });

    console.log('\n' + '═'.repeat(80));
    console.log('✅ Analysis Complete!\n');

  } catch (error: any) {
    console.error('\n❌ Analysis failed:', error.message);
    console.error('Stack trace:', error.stack);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

analyzeICTPrograms().catch(console.error);
