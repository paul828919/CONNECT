import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyNTISData() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║          NTIS HISTORICAL SCRAPE VERIFICATION             ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // 1. Total program count
  const totalPrograms = await prisma.program.count();
  console.log(`📊 Total Programs in Database: ${totalPrograms}`);

  // 2. NTIS source count
  const ntisPrograms = await prisma.program.count({
    where: { source: 'NTIS' }
  });
  console.log(`🔬 NTIS Programs: ${ntisPrograms}`);

  // 3. Programs created in last 24 hours (recent scrape)
  const recentPrograms = await prisma.program.count({
    where: {
      source: 'NTIS',
      createdAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
      }
    }
  });
  console.log(`✨ Programs Added in Last 24h: ${recentPrograms}`);

  // 4. Date range of NTIS programs
  const dateRange = await prisma.program.aggregate({
    where: { source: 'NTIS' },
    _min: { announcementDate: true },
    _max: { announcementDate: true }
  });

  const minDate = dateRange._min.announcementDate;
  const maxDate = dateRange._max.announcementDate;

  console.log(`\n📅 Date Range:`);
  console.log(`   Earliest: ${minDate ? minDate.toISOString().split('T')[0] : 'N/A'}`);
  console.log(`   Latest: ${maxDate ? maxDate.toISOString().split('T')[0] : 'N/A'}`);

  // 5. Categorization stats
  const categoryStats = await prisma.program.groupBy({
    by: ['ntisCategory'],
    where: { source: 'NTIS' },
    _count: true,
    orderBy: { _count: { ntisCategory: 'desc' } }
  });

  console.log(`\n🏷️  NTIS Category Distribution (Top 10):`);
  categoryStats.slice(0, 10).forEach(stat => {
    console.log(`   ${stat.ntisCategory || 'UNCATEGORIZED'}: ${stat._count}`);
  });

  // 6. TRL Distribution
  const trlStats = await prisma.program.groupBy({
    by: ['trlLevel'],
    where: { source: 'NTIS' },
    _count: true,
    orderBy: { trlLevel: 'asc' }
  });

  console.log(`\n🔬 TRL Level Distribution:`);
  trlStats.forEach(stat => {
    const trlValue = stat.trlLevel !== null ? `TRL ${stat.trlLevel}` : 'NULL';
    console.log(`   ${trlValue}: ${stat._count}`);
  });

  // 7. Data quality checks
  const qualityChecks = {
    hasTitle: await prisma.program.count({ where: { source: 'NTIS', title: { not: null } } }),
    hasDescription: await prisma.program.count({ where: { source: 'NTIS', description: { not: null } } }),
    hasDeadline: await prisma.program.count({ where: { source: 'NTIS', deadline: { not: null } } }),
    hasAgency: await prisma.program.count({ where: { source: 'NTIS', agency: { not: null } } }),
    hasCategory: await prisma.program.count({ where: { source: 'NTIS', ntisCategory: { not: null } } }),
    hasTRL: await prisma.program.count({ where: { source: 'NTIS', trlLevel: { not: null } } })
  };

  console.log(`\n✅ Data Quality (out of ${ntisPrograms} NTIS programs):`);
  console.log(`   Title: ${qualityChecks.hasTitle} (${((qualityChecks.hasTitle/ntisPrograms)*100).toFixed(1)}%)`);
  console.log(`   Description: ${qualityChecks.hasDescription} (${((qualityChecks.hasDescription/ntisPrograms)*100).toFixed(1)}%)`);
  console.log(`   Deadline: ${qualityChecks.hasDeadline} (${((qualityChecks.hasDeadline/ntisPrograms)*100).toFixed(1)}%)`);
  console.log(`   Agency: ${qualityChecks.hasAgency} (${((qualityChecks.hasAgency/ntisPrograms)*100).toFixed(1)}%)`);
  console.log(`   Category: ${qualityChecks.hasCategory} (${((qualityChecks.hasCategory/ntisPrograms)*100).toFixed(1)}%)`);
  console.log(`   TRL Level: ${qualityChecks.hasTRL} (${((qualityChecks.hasTRL/ntisPrograms)*100).toFixed(1)}%)`);

  // 8. Agency distribution
  const agencyStats = await prisma.program.groupBy({
    by: ['agency'],
    where: { source: 'NTIS', agency: { not: null } },
    _count: true,
    orderBy: { _count: { agency: 'desc' } }
  });

  console.log(`\n🏢 Top 10 Agencies:`);
  agencyStats.slice(0, 10).forEach(stat => {
    console.log(`   ${stat.agency}: ${stat._count}`);
  });

  // 9. Sample recent programs
  console.log(`\n📝 Sample of 5 Most Recent NTIS Programs:`);
  const samples = await prisma.program.findMany({
    where: { source: 'NTIS' },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      title: true,
      agency: true,
      deadline: true,
      ntisCategory: true,
      trlLevel: true,
      announcementDate: true,
      createdAt: true
    }
  });

  samples.forEach((program, idx) => {
    const title = program.title || 'Untitled';
    const truncatedTitle = title.length > 60 ? title.substring(0, 60) + '...' : title;
    console.log(`\n   ${idx + 1}. ${truncatedTitle}`);
    console.log(`      Agency: ${program.agency || 'N/A'}`);
    console.log(`      Deadline: ${program.deadline ? program.deadline.toISOString().split('T')[0] : 'N/A'}`);
    console.log(`      Category: ${program.ntisCategory || 'N/A'}`);
    console.log(`      TRL: ${program.trlLevel !== null ? program.trlLevel : 'N/A'}`);
    console.log(`      Scraped: ${program.createdAt.toISOString().split('T')[0]}`);
  });

  console.log('\n' + '═'.repeat(60));
  console.log('\n✅ Verification Complete!\n');
}

verifyNTISData()
  .catch((error) => {
    console.error('\n❌ Error during verification:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
