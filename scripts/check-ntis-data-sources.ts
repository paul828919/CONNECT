import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkNtisDataSources() {
  console.log('🔍 Investigating NTIS Data Sources...\n');

  try {
    // 1. Count total NTIS programs
    const totalNtis = await prisma.funding_programs.count({
      where: { agencyId: 'NTIS' },
    });

    console.log(`📊 Total NTIS Programs: ${totalNtis}\n`);

    // 2. Group by scrapingSource to see if multiple sources exist
    console.log('📋 Breakdown by scrapingSource:');
    console.log('═══════════════════════════════════════════════════════════');

    const sourceBreakdown = await prisma.funding_programs.groupBy({
      by: ['scrapingSource'],
      where: { agencyId: 'NTIS' },
      _count: { scrapingSource: true },
    });

    for (const { scrapingSource, _count } of sourceBreakdown) {
      const percentage = ((_count.scrapingSource / totalNtis) * 100).toFixed(1);
      console.log(`   ${(scrapingSource || 'NULL').padEnd(20)} ${_count.scrapingSource.toString().padStart(4)} (${percentage.padStart(5)}%)`);
    }
    console.log('═══════════════════════════════════════════════════════════\n');

    // 3. For each scrapingSource, show sample programs and date ranges
    for (const { scrapingSource } of sourceBreakdown) {
      console.log(`\n📂 Source: "${scrapingSource || 'NULL'}"`);
      console.log('─────────────────────────────────────────────────────────');

      // Get date range
      const programs = await prisma.funding_programs.findMany({
        where: {
          agencyId: 'NTIS',
          scrapingSource: scrapingSource || null,
        },
        orderBy: { scrapedAt: 'desc' },
      });

      if (programs.length > 0) {
        const oldestScrapedAt = programs[programs.length - 1].scrapedAt;
        const newestScrapedAt = programs[0].scrapedAt;

        console.log(`   Count: ${programs.length}`);
        console.log(`   Date Range: ${oldestScrapedAt.toISOString().split('T')[0]} → ${newestScrapedAt.toISOString().split('T')[0]}`);

        // Show 3 sample programs
        console.log(`   Samples (latest 3):`);
        for (let i = 0; i < Math.min(3, programs.length); i++) {
          const p = programs[i];
          console.log(`      ${i + 1}. ${p.title.substring(0, 60)}${p.title.length > 60 ? '...' : ''}`);
          console.log(`         Scraped: ${p.scrapedAt.toISOString()}`);
        }
      }
    }

    // 4. Check announcementType distribution by source
    console.log('\n\n📋 AnnouncementType Distribution by Source:');
    console.log('═══════════════════════════════════════════════════════════');

    for (const { scrapingSource } of sourceBreakdown) {
      console.log(`\nSource: "${scrapingSource || 'NULL'}"`);
      console.log('─────────────────────────────────────────────────────────');

      const typesBySource = await prisma.funding_programs.groupBy({
        by: ['announcementType'],
        where: {
          agencyId: 'NTIS',
          scrapingSource: scrapingSource || null,
        },
        _count: { announcementType: true },
      });

      for (const { announcementType, _count } of typesBySource) {
        const sourceCount = sourceBreakdown.find(s => s.scrapingSource === scrapingSource)?._count.scrapingSource || 1;
        const percentage = ((_count.announcementType / sourceCount) * 100).toFixed(1);
        const icon = announcementType === 'R_D_PROJECT' ? '✅' : '⚠️';
        console.log(`   ${icon} ${announcementType.padEnd(15)} ${_count.announcementType.toString().padStart(4)} (${percentage.padStart(5)}%)`);
      }
    }

    // 5. Summary
    console.log('\n\n═══════════════════════════════════════════════════════════');
    console.log('📊 INVESTIGATION SUMMARY');
    console.log('═══════════════════════════════════════════════════════════\n');

    if (sourceBreakdown.length === 1) {
      console.log('✅ All 934 NTIS programs come from a SINGLE source.');
      console.log(`   Source: "${sourceBreakdown[0].scrapingSource || 'NULL'}"\n`);
    } else {
      console.log(`⚠️  NTIS programs come from ${sourceBreakdown.length} DIFFERENT sources:`);
      for (const { scrapingSource, _count } of sourceBreakdown) {
        console.log(`   - "${scrapingSource || 'NULL'}": ${_count.scrapingSource} programs`);
      }
      console.log('\n   → This explains why the count is 934 (combined from multiple sources)\n');
    }

  } catch (error) {
    console.error('❌ Error during investigation:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkNtisDataSources();
