/**
 * Script to retrieve ALL funding program matches for user 김병진
 * (both saved and unsaved) to investigate the dashboard count discrepancy
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Retrieving ALL funding program matches for 김병진...\n');

  try {
    // Find user by email
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

    // Get ALL matches (saved and unsaved)
    const allMatches = await prisma.funding_matches.findMany({
      where: {
        organizationId: user.organizationId,
      },
      include: {
        funding_programs: true,
      },
      orderBy: [
        { score: 'desc' },
      ],
    });

    const savedMatches = allMatches.filter(m => m.saved);
    const viewedMatches = allMatches.filter(m => m.viewed);

    console.log('📊 Match Statistics:');
    console.log(`   Total Matches: ${allMatches.length}`);
    console.log(`   Saved Matches: ${savedMatches.length} ⭐`);
    console.log(`   Viewed Matches: ${viewedMatches.length} 👁️`);
    console.log(`   Unsaved/Unviewed: ${allMatches.length - Math.max(savedMatches.length, viewedMatches.length)}\n`);

    console.log('='.repeat(150));

    // Display summary of all matches
    allMatches.forEach((match, index) => {
      const program = match.funding_programs;
      const status = [];
      if (match.saved) status.push('⭐ SAVED');
      if (match.viewed) status.push('👁️ VIEWED');
      if (!match.saved && !match.viewed) status.push('🆕 NEW');

      console.log(`\n${index + 1}. [Score: ${match.score}] ${status.join(' ')} - ${program.agencyId}`);
      console.log(`   ${program.title}`);
      console.log(`   Deadline: ${program.deadline ? new Date(program.deadline).toLocaleDateString('ko-KR') : 'N/A'}`);
      console.log(`   Created: ${new Date(match.createdAt).toLocaleDateString('ko-KR')}`);
    });

    console.log('\n' + '='.repeat(150));
    console.log('\n📈 Breakdown by Category:\n');

    // By Agency
    const byAgency = allMatches.reduce((acc, m) => {
      const agency = m.funding_programs.agencyId;
      acc[agency] = (acc[agency] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('By Agency:');
    Object.entries(byAgency).forEach(([agency, count]) => {
      console.log(`   ${agency}: ${count} matches`);
    });

    // By Score Range
    console.log('\nBy Score Range:');
    const scoreRanges = {
      'Excellent (90-100)': allMatches.filter(m => m.score >= 90).length,
      'Good (80-89)': allMatches.filter(m => m.score >= 80 && m.score < 90).length,
      'Fair (70-79)': allMatches.filter(m => m.score >= 70 && m.score < 80).length,
      'Poor (<70)': allMatches.filter(m => m.score < 70).length,
    };
    Object.entries(scoreRanges).forEach(([range, count]) => {
      console.log(`   ${range}: ${count} matches`);
    });

    console.log('\n🔍 Dashboard Discrepancy Analysis:');
    console.log(`   Dashboard shows: 22 저장된 매칭`);
    console.log(`   Database shows: ${savedMatches.length} saved matches`);
    console.log(`   Difference: ${22 - savedMatches.length} matches\n`);

    if (allMatches.length !== 22) {
      console.log(`⚠️  Note: Total matches (${allMatches.length}) also doesn't match dashboard count (22)`);
      console.log(`   Possible reasons:`);
      console.log(`   - Dashboard may be caching old data`);
      console.log(`   - Matches may have been deleted`);
      console.log(`   - Different database environment`);
      console.log(`   - Dashboard counting logic may be different\n`);
    }

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
