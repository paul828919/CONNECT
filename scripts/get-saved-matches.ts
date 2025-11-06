/**
 * Script to retrieve all saved funding program matches for user 김병진
 *
 * Retrieves:
 * - Program title
 * - Agency/Institution
 * - Application deadline
 * - Published date
 * - Budget amount
 * - Match score
 * - Announcement URL
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Retrieving saved funding program matches for 김병진...\n');

  try {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: 'kbj20415@gmail.com' },
      include: { organizations: true },
    });

    if (!user) {
      console.log('❌ User not found: kbj20415@gmail.com');
      return;
    }

    console.log(`✅ Found user: ${user.name} (${user.email})`);
    console.log(`   Organization: ${user.organizations?.name || 'N/A'}`);
    console.log(`   Organization ID: ${user.organizationId}\n`);

    if (!user.organizationId) {
      console.log('❌ User has no organization assigned');
      return;
    }

    // Get all saved matches with program details
    const savedMatches = await prisma.funding_matches.findMany({
      where: {
        organizationId: user.organizationId,
        saved: true,
      },
      include: {
        funding_programs: true,
      },
      orderBy: [
        { score: 'desc' },
        { savedAt: 'desc' },
      ],
    });

    console.log(`📊 Total Saved Matches: ${savedMatches.length}\n`);
    console.log('='.repeat(150));
    console.log('\n');

    // Display each match with details
    savedMatches.forEach((match, index) => {
      const program = match.funding_programs;

      console.log(`\n${'─'.repeat(150)}`);
      console.log(`\n🎯 Match #${index + 1} | Score: ${match.score}/100 | ${match.saved ? '⭐ SAVED' : ''}`);
      console.log(`${'─'.repeat(150)}\n`);

      console.log(`📌 Program Title (과제명):`);
      console.log(`   ${program.title}\n`);

      console.log(`🏢 Agency (기관): ${program.agencyId}`);
      console.log(`📅 Deadline (마감일): ${program.deadline ? new Date(program.deadline).toLocaleString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) : 'N/A'}`);
      console.log(`📰 Published (공고일): ${program.publishedAt ? new Date(program.publishedAt).toLocaleString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }) : 'N/A'}`);
      console.log(`💰 Budget (예산): ${program.budgetAmount ? `₩${Number(program.budgetAmount).toLocaleString('ko-KR')}` : 'N/A'}`);
      console.log(`📊 Status: ${program.status}`);
      console.log(`🔗 URL: ${program.announcementUrl}`);

      if (program.description) {
        console.log(`\n📝 Description:`);
        console.log(`   ${program.description.substring(0, 200)}${program.description.length > 200 ? '...' : ''}`);
      }

      console.log(`\n🎯 Match Details:`);
      console.log(`   - Viewed: ${match.viewed ? '✓' : '✗'} ${match.viewedAt ? `(${new Date(match.viewedAt).toLocaleDateString('ko-KR')})` : ''}`);
      console.log(`   - Saved: ${match.saved ? '✓' : '✗'} ${match.savedAt ? `(${new Date(match.savedAt).toLocaleDateString('ko-KR')})` : ''}`);
      console.log(`   - Notification Sent: ${match.notificationSent ? '✓' : '✗'}`);
      console.log(`   - Created: ${new Date(match.createdAt).toLocaleDateString('ko-KR')}`);
    });

    console.log(`\n\n${'='.repeat(150)}\n`);
    console.log(`📊 Summary: ${savedMatches.length} saved matches retrieved successfully\n`);

    // Group by agency
    const byAgency = savedMatches.reduce((acc, match) => {
      const agency = match.funding_programs.agencyId;
      acc[agency] = (acc[agency] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('📈 Matches by Agency:');
    Object.entries(byAgency)
      .sort(([, a], [, b]) => b - a)
      .forEach(([agency, count]) => {
        console.log(`   ${agency}: ${count} matches`);
      });

    // Group by status
    const byStatus = savedMatches.reduce((acc, match) => {
      const status = match.funding_programs.status;
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('\n📈 Matches by Status:');
    Object.entries(byStatus)
      .sort(([, a], [, b]) => b - a)
      .forEach(([status, count]) => {
        console.log(`   ${status}: ${count} matches`);
      });

    // Score distribution
    const avgScore = savedMatches.reduce((sum, m) => sum + m.score, 0) / savedMatches.length;
    const maxScore = Math.max(...savedMatches.map(m => m.score));
    const minScore = Math.min(...savedMatches.map(m => m.score));

    console.log('\n📊 Score Distribution:');
    console.log(`   Average: ${avgScore.toFixed(1)}/100`);
    console.log(`   Highest: ${maxScore}/100`);
    console.log(`   Lowest: ${minScore}/100`);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
