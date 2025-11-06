import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabaseStatus() {
  console.log('🔍 Checking Local Database Status\n');
  console.log('━'.repeat(80));

  try {
    // Check funding_programs table
    const latestProgram = await prisma.funding_programs.findFirst({
      orderBy: { scrapedAt: 'desc' },
      select: {
        id: true,
        title: true,
        agencyId: true,
        scrapedAt: true,
        updatedAt: true,
        createdAt: true,
      },
    });

    console.log('\n📋 Funding Programs:');
    if (latestProgram) {
      console.log(`   Most Recent Scrape: ${latestProgram.scrapedAt.toLocaleString()}`);
      console.log(`   Agency: ${latestProgram.agencyId}`);
      console.log(`   Title: ${latestProgram.title.substring(0, 60)}...`);
      console.log(`   Created: ${latestProgram.createdAt.toLocaleString()}`);
      console.log(`   Updated: ${latestProgram.updatedAt.toLocaleString()}`);
    } else {
      console.log('   No programs found');
    }

    // Count total programs
    const totalPrograms = await prisma.funding_programs.count();
    console.log(`   Total Programs: ${totalPrograms}`);

    // Check by agency
    const programsByAgency = await prisma.funding_programs.groupBy({
      by: ['agencyId'],
      _count: true,
    });
    console.log('\n   Programs by Agency:');
    programsByAgency.forEach((agency) => {
      console.log(`   - ${agency.agencyId}: ${agency._count} programs`);
    });

    // Check funding_matches table
    const latestMatch = await prisma.funding_matches.findFirst({
      orderBy: { createdAt: 'desc' },
      select: {
        createdAt: true,
        score: true,
      },
    });

    console.log('\n🎯 Funding Matches:');
    if (latestMatch) {
      console.log(`   Most Recent Match: ${latestMatch.createdAt.toLocaleString()}`);
      console.log(`   Match Score: ${latestMatch.score}`);
    } else {
      console.log('   No matches found');
    }

    const totalMatches = await prisma.funding_matches.count();
    console.log(`   Total Matches: ${totalMatches}`);

    // Check scraping_logs table
    const latestScrapingLog = await prisma.scraping_logs.findFirst({
      orderBy: { startedAt: 'desc' },
      select: {
        agencyId: true,
        startedAt: true,
        completedAt: true,
        success: true,
        programsFound: true,
        programsNew: true,
        programsUpdated: true,
      },
    });

    console.log('\n📊 Scraping Logs:');
    if (latestScrapingLog) {
      console.log(`   Most Recent Scrape: ${latestScrapingLog.startedAt.toLocaleString()}`);
      console.log(`   Agency: ${latestScrapingLog.agencyId}`);
      console.log(`   Completed: ${latestScrapingLog.completedAt?.toLocaleString() || 'In Progress'}`);
      console.log(`   Success: ${latestScrapingLog.success ? '✅' : '❌'}`);
      console.log(`   Programs Found: ${latestScrapingLog.programsFound}`);
      console.log(`   New: ${latestScrapingLog.programsNew} | Updated: ${latestScrapingLog.programsUpdated}`);
    } else {
      console.log('   No scraping logs found');
    }

    // Check organizations
    const totalOrgs = await prisma.organizations.count();
    const latestOrg = await prisma.organizations.findFirst({
      orderBy: { createdAt: 'desc' },
      select: {
        name: true,
        type: true,
        createdAt: true,
      },
    });

    console.log('\n🏢 Organizations:');
    console.log(`   Total Organizations: ${totalOrgs}`);
    if (latestOrg) {
      console.log(`   Most Recent: ${latestOrg.name} (${latestOrg.type})`);
      console.log(`   Created: ${latestOrg.createdAt.toLocaleString()}`);
    }

    // Check users
    const totalUsers = await prisma.user.count();
    const latestUser = await prisma.user.findFirst({
      orderBy: { createdAt: 'desc' },
      select: {
        email: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    console.log('\n👤 Users:');
    console.log(`   Total Users: ${totalUsers}`);
    if (latestUser) {
      console.log(`   Most Recent: ${latestUser.email}`);
      console.log(`   Created: ${latestUser.createdAt.toLocaleString()}`);
      console.log(`   Last Login: ${latestUser.lastLoginAt?.toLocaleString() || 'Never'}`);
    }

    // Get the absolute most recent update across all tables
    const updates = [
      { table: 'funding_programs', date: latestProgram?.updatedAt },
      { table: 'funding_programs (scraped)', date: latestProgram?.scrapedAt },
      { table: 'funding_matches', date: latestMatch?.createdAt },
      { table: 'scraping_logs', date: latestScrapingLog?.completedAt },
      { table: 'organizations', date: latestOrg?.createdAt },
      { table: 'users', date: latestUser?.createdAt },
    ].filter((u) => u.date !== null && u.date !== undefined) as Array<{
      table: string;
      date: Date;
    }>;

    if (updates.length > 0) {
      const mostRecent = updates.reduce((prev, current) =>
        prev.date > current.date ? prev : current
      );

      console.log('\n━'.repeat(80));
      console.log('\n⏰ MOST RECENT DATABASE UPDATE:');
      console.log(`   Table: ${mostRecent.table}`);
      console.log(`   Timestamp: ${mostRecent.date.toLocaleString()}`);
      console.log(`   Time Ago: ${getTimeAgo(mostRecent.date)}`);
    }

    console.log('\n━'.repeat(80));
    console.log('\n✅ Database status check completed\n');
  } catch (error) {
    console.error('❌ Error checking database status:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return `${seconds} seconds ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}

checkDatabaseStatus();
