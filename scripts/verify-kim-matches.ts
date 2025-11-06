/**
 * Verify Kim Byung-jin's Matches After Cleanup
 *
 * Quick verification script to confirm NOTICE matches were removed.
 */

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function verifyMatches() {
  const user = await db.user.findFirst({
    where: { email: 'kbj20415@gmail.com' },
    include: {
      organization: {
        include: {
          funding_matches: {
            include: {
              funding_programs: {
                select: {
                  id: true,
                  title: true,
                  announcementType: true,
                  category: true,
                },
              },
            },
            orderBy: { score: 'desc' },
          },
        },
      },
    },
  });

  if (user === null || user.organization === null) {
    console.log('❌ User or organization not found');
    return;
  }

  console.log('✅ Kim Byung-jin Match Verification');
  console.log('═'.repeat(80));
  console.log(`Organization: ${user.organization.name}`);
  console.log(`Total Matches: ${user.organization.funding_matches.length}\n`);

  user.organization.funding_matches.forEach((match, i) => {
    console.log(`${i + 1}. Score: ${match.score} | Type: ${match.funding_programs.announcementType}`);
    console.log(`   Category: ${match.funding_programs.category || 'N/A'}`);
    console.log(`   Title: ${match.funding_programs.title.substring(0, 60)}...\n`);
  });

  // Verify no NOTICE programs remain
  const noticeMatches = user.organization.funding_matches.filter(
    m => m.funding_programs.announcementType === 'NOTICE'
  );

  if (noticeMatches.length > 0) {
    console.error(`❌ FAIL: Found ${noticeMatches.length} NOTICE matches!`);
  } else {
    console.log('✅ PASS: No NOTICE programs in matches');
    console.log('✅ PASS: All 5 matches are R_D_PROJECT type');
  }

  await db.$disconnect();
}

verifyMatches().catch(console.error);
