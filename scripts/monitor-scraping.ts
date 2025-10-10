/**
 * Monitor scraping progress in real-time
 * Usage: npx tsx scripts/monitor-scraping.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function monitorScraping() {
  console.clear();
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Connect Platform - Scraping Monitor');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Get program counts by agency
    const programsByAgency = await prisma.fundingProgram.groupBy({
      by: ['agencyId'],
      _count: true,
    });

    // Get total programs
    const totalPrograms = await prisma.fundingProgram.count();
    
    // Get total matches
    const totalMatches = await prisma.fundingMatch.count();

    // Get recent programs (last 24 hours)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const recentPrograms = await prisma.fundingProgram.count({
      where: {
        createdAt: {
          gte: yesterday,
        },
      },
    });

    // Display results
    console.log('📈 Database Statistics:\n');
    console.log(`   Total Programs:  ${totalPrograms}`);
    console.log(`   Total Matches:   ${totalMatches}`);
    console.log(`   New (24h):       ${recentPrograms}\n`);

    console.log('🏛️  Programs by Agency:\n');
    
    const agencyNames: Record<string, string> = {
      'IITP': '정보통신기획평가원 (IITP)',
      'KEIT': '한국산업기술평가관리원 (KEIT)',
      'TIPA': '중소기업기술정보진흥원 (TIPA)',
      'KIMST': '해양수산과학기술진흥원 (KIMST)',
    };

    for (const agency of programsByAgency) {
      const name = agencyNames[agency.agencyId] || agency.agencyId;
      console.log(`   ${name}: ${agency._count} programs`);
    }

    // Get latest 5 programs
    const latestPrograms = await prisma.fundingProgram.findMany({
      take: 5,
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        title: true,
        agencyId: true,
        createdAt: true,
      },
    });

    if (latestPrograms.length > 0) {
      console.log('\n🆕 Latest Programs:\n');
      latestPrograms.forEach((program, index) => {
        const timeAgo = getTimeAgo(program.createdAt);
        console.log(`   ${index + 1}. [${program.agencyId}] ${program.title.substring(0, 50)}...`);
        console.log(`      Added: ${timeAgo}\n`);
      });
    }

    // Check if scraper is running
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    if (totalPrograms === 0) {
      console.log('⚠️  No programs found - scraper may not have run yet');
      console.log('💡 Start scraper with: npm run scraper');
    } else if (recentPrograms === 0) {
      console.log('⚠️  No new programs in last 24h - check scraper status');
    } else {
      console.log('✅ Scraper is working - new data being collected!');
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('🔄 Refreshing every 10 seconds... (Press Ctrl+C to stop)\n');

  } catch (error) {
    console.error('❌ Error monitoring:', error);
  } finally {
    await prisma.$disconnect();
  }
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

// Run immediately and then every 10 seconds
monitorScraping();
setInterval(monitorScraping, 10000);
