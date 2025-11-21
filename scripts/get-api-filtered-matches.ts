/**
 * Query matches using the EXACT same filters as /api/matches endpoint
 * This will show what the dashboard "22" actually represents
 */

import { PrismaClient, AnnouncementType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Querying matches with API filters (ACTIVE + R_D_PROJECT + valid scrapingSource)...\n');

  try {
    const user = await prisma.user.findUnique({
      where: { email: 'kbj20415@gmail.com' },
      include: { organization: true },
    });

    if (!user || !user.organizationId) {
      console.log('❌ User not found or has no organization');
      return;
    }

    console.log(`✅ Found user: ${user.name} (${user.email})`);
    console.log(`   Organization: ${user.organization?.name}`);
    console.log(`   Organization ID: ${user.organizationId}\n`);

    // Use EXACT same query as /api/matches endpoint (line 68-89)
    const matches = await prisma.funding_matches.findMany({
      where: {
        organizationId: user.organizationId,
        funding_programs: {
          status: 'ACTIVE', // Only show matches to active programs (exclude EXPIRED)
          announcementType: AnnouncementType.R_D_PROJECT, // Only R&D funding opportunities (exclude surveys, events, notices)
          scrapingSource: {
            not: null, // Exclude test seed data
            notIn: ['NTIS_API'], // Exclude NTIS_API (old project data)
          },
        },
      },
      include: {
        funding_programs: true,
      },
      orderBy: [
        { funding_programs: { publishedAt: 'desc' } }, // Newest announcements first
        { funding_programs: { deadline: 'asc' } },     // Then by urgency (NULLs last)
      ],
    });

    console.log('='.repeat(150));
    console.log(`\n🎯 API FILTERED MATCHES: ${matches.length}\n`);
    console.log('='.repeat(150));

    console.log('\n📊 Match Statistics:');
    console.log(`   Total API Matches: ${matches.length} (This is what dashboard shows)`);
    console.log(`   Saved Matches: ${matches.filter(m => m.saved).length} ⭐`);
    console.log(`   Viewed Matches: ${matches.filter(m => m.viewed).length} 👁️`);
    console.log(`   Unsaved/Unviewed: ${matches.filter(m => !m.saved && !m.viewed).length} 🆕\n`);

    console.log('🔍 Dashboard Label Analysis:');
    console.log(`   ❌ Misleading Label: "저장된 매칭" (saved matches) = ${matches.filter(m => m.saved).length}`);
    console.log(`   ✅ Actual Value Shown: "전체 매칭" (total matches) = ${matches.length}`);
    console.log(`   💡 Fix: Change label from "저장된 매칭" to "전체 매칭" or "매칭 결과"\n`);

    console.log('='.repeat(150));
    console.log('\n📋 All Filtered Matches:\n');

    matches.forEach((match, index) => {
      const program = match.funding_programs;
      const status = [];
      if (match.saved) status.push('⭐');
      if (match.viewed) status.push('👁️');
      if (!match.saved && !match.viewed) status.push('🆕');

      console.log(`${index + 1}. [${match.score}점] ${status.join(' ')} ${program.agencyId}`);
      console.log(`   ${program.title}`);
      console.log(`   마감: ${program.deadline ? new Date(program.deadline).toLocaleDateString('ko-KR') : 'N/A'} | 공고: ${program.publishedAt ? new Date(program.publishedAt).toLocaleDateString('ko-KR') : 'N/A'}`);
      console.log(`   예산: ${program.budgetAmount ? `₩${Number(program.budgetAmount).toLocaleString('ko-KR')}` : 'N/A'}`);
      console.log(`   URL: ${program.announcementUrl}\n`);
    });

    console.log('='.repeat(150));
    console.log('\n📈 Breakdown by Agency:\n');

    const byAgency = matches.reduce((acc, m) => {
      const agency = m.funding_programs.agencyId;
      acc[agency] = (acc[agency] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(byAgency)
      .sort(([, a], [, b]) => b - a)
      .forEach(([agency, count]) => {
        console.log(`   ${agency}: ${count} matches`);
      });

    console.log('\n📈 Breakdown by Score:\n');
    const scoreRanges = {
      'Excellent (90-100)': matches.filter(m => m.score >= 90).length,
      'Good (80-89)': matches.filter(m => m.score >= 80 && m.score < 90).length,
      'Fair (70-79)': matches.filter(m => m.score >= 70 && m.score < 80).length,
      'Poor (<70)': matches.filter(m => m.score < 70).length,
    };

    Object.entries(scoreRanges).forEach(([range, count]) => {
      console.log(`   ${range}: ${count} matches`);
    });

    console.log('\n✅ Summary:');
    console.log(`   The dashboard shows ${matches.length} because the API returns ALL matches`);
    console.log(`   that meet the filtering criteria (ACTIVE + R_D_PROJECT + valid source).`);
    console.log(`   The label "저장된 매칭" is misleading and should be changed.\n`);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
