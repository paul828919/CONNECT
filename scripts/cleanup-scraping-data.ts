/**
 * Database Cleanup Script - Week 6 NTIS Integration
 *
 * One-time script to fix existing scraping data issues:
 * 1. Remove HTML tags from NTIS program titles
 * 2. Fix TIPA scrapingSource (URL fragments → "tipa")
 * 3. Fix IITP scrapingSource (full URLs → "iitp")
 *
 * Run AFTER deployment with:
 * docker exec connect_app1 npx tsx scripts/cleanup-scraping-data.ts
 */

import { db } from '@/lib/db';

async function cleanup() {
  console.log('🧹 Starting database cleanup...\n');

  try {
    // 1. Clean NTIS HTML tags from titles
    console.log('1️⃣ Cleaning HTML tags from NTIS program titles...');
    const ntisCount = await db.$executeRaw`
      UPDATE funding_programs
      SET title = REGEXP_REPLACE(
        REGEXP_REPLACE(title, '<span class="search_word">', '', 'g'),
        '</span>', '', 'g'
      )
      WHERE "scrapingSource" = 'NTIS_API'
        AND title LIKE '%<span%'
    `;
    console.log(`   ✅ Cleaned ${ntisCount} NTIS program titles\n`);

    // 2. Fix TIPA scrapingSource (URL fragments → "tipa")
    console.log('2️⃣ Fixing TIPA scrapingSource values...');
    const tipaCount = await db.$executeRaw`
      UPDATE funding_programs
      SET "scrapingSource" = 'tipa'
      WHERE "scrapingSource" LIKE '/front/ifg/no/%'
    `;
    console.log(`   ✅ Fixed ${tipaCount} TIPA programs\n`);

    // 3. Fix IITP scrapingSource (full URLs → "iitp")
    console.log('3️⃣ Fixing IITP scrapingSource values...');
    const iitpCount = await db.$executeRaw`
      UPDATE funding_programs
      SET "scrapingSource" = 'iitp'
      WHERE "scrapingSource" LIKE 'http://ezone.iitp.kr/%'
         OR "scrapingSource" LIKE 'https://ezone.iitp.kr/%'
    `;
    console.log(`   ✅ Fixed ${iitpCount} IITP programs\n`);

    // 4. Verify results - Show breakdown by scrapingSource
    console.log('4️⃣ Verifying cleanup results...');
    const breakdown = await db.$queryRaw<Array<{ scrapingSource: string; count: bigint }>>`
      SELECT "scrapingSource", COUNT(*) as count
      FROM funding_programs
      GROUP BY "scrapingSource"
      ORDER BY count DESC
    `;

    console.log('\n📊 Updated scrapingSource breakdown:');
    console.table(
      breakdown.map(row => ({
        Source: row.scrapingSource,
        Count: Number(row.count),
      }))
    );

    // 5. Sample NTIS titles (verify no HTML tags)
    console.log('\n5️⃣ Sample NTIS titles (verifying HTML cleanup):');
    const ntisPrograms = await db.funding_programs.findMany({
      where: { scrapingSource: 'NTIS_API' },
      select: { title: true },
      take: 3,
    });

    ntisPrograms.forEach((program, idx) => {
      console.log(`   ${idx + 1}. ${program.title.substring(0, 80)}...`);
    });

    // 6. Final summary
    console.log('\n✅ Database cleanup completed successfully!');
    console.log('\nSummary:');
    console.log(`   - NTIS titles cleaned: ${ntisCount}`);
    console.log(`   - TIPA programs fixed: ${tipaCount}`);
    console.log(`   - IITP programs fixed: ${iitpCount}`);
    console.log(`   - Total changes: ${ntisCount + tipaCount + iitpCount}`);

  } catch (error) {
    console.error('\n❌ Cleanup failed:', error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

// Run cleanup
cleanup()
  .then(() => {
    console.log('\n🎉 Cleanup script finished!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
