/**
 * Fix SME Program Categories Migration Script (v4.1)
 *
 * This script updates 중소벤처기업부 (Ministry of SMEs and Startups) program categories
 * to enable proper cross-industry matching.
 *
 * Problem:
 * - Most SME programs (~80%) are cross-industry (창업성장기술개발, TIPS, 중소기업기술혁신개발)
 * - They were incorrectly categorized as MANUFACTURING, causing zero matches for
 *   BIO_HEALTH, ICT, CULTURAL companies that should be eligible
 *
 * Solution:
 * - Update cross-industry SME programs to category = 'OTHER' (will be treated as GENERAL)
 * - Keep industry-specific programs (중소제조, K-뷰티, 소부장) unchanged
 *
 * Usage:
 * npx tsx scripts/fix-sme-program-categories.ts
 *
 * @see docs/implementation/phase2a-match-generation.md
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Industry-specific keywords - programs with these keywords should keep their categories
const INDUSTRY_SPECIFIC_KEYWORDS = [
  '중소제조',      // Manufacturing-specific
  '제조산재',      // Manufacturing-specific
  '산재예방',      // Industrial accident prevention (manufacturing)
  '제조기업',      // Manufacturing company specific
  '제조혁신',      // Manufacturing innovation
  '소부장',        // 소재부품장비 (materials, parts, equipment)
  'K-뷰티',        // K-Beauty (cultural)
  '뷰티',          // Beauty (cultural)
  '탄소감축',      // Carbon reduction (environment)
  '탄소중립',      // Carbon neutral (environment)
];

/**
 * Check if a program title contains any industry-specific keyword
 */
function isIndustrySpecificProgram(title: string): boolean {
  return INDUSTRY_SPECIFIC_KEYWORDS.some(keyword => title.includes(keyword));
}

async function main() {
  console.log('🔧 Starting SME Program Categories Migration (v4.1)');
  console.log('=' .repeat(60));

  try {
    // 1. Fetch all 중소벤처기업부 programs
    const smePrograms = await prisma.funding_programs.findMany({
      where: {
        ministry: '중소벤처기업부',
      },
      select: {
        id: true,
        title: true,
        category: true,
      },
    });

    console.log(`\n📊 Found ${smePrograms.length} 중소벤처기업부 programs`);

    // 2. Categorize programs
    const crossIndustryPrograms = smePrograms.filter(
      p => !isIndustrySpecificProgram(p.title)
    );
    const industrySpecificPrograms = smePrograms.filter(
      p => isIndustrySpecificProgram(p.title)
    );

    console.log(`\n📋 Analysis:`);
    console.log(`   - Cross-industry programs: ${crossIndustryPrograms.length} (will be updated to OTHER)`);
    console.log(`   - Industry-specific programs: ${industrySpecificPrograms.length} (will keep current category)`);

    // 3. Show industry-specific programs for verification
    console.log(`\n🏭 Industry-specific programs (unchanged):`);
    industrySpecificPrograms.slice(0, 10).forEach(p => {
      console.log(`   - [${p.category}] ${p.title.substring(0, 60)}...`);
    });
    if (industrySpecificPrograms.length > 10) {
      console.log(`   ... and ${industrySpecificPrograms.length - 10} more`);
    }

    // 4. Show cross-industry programs that will be updated
    console.log(`\n🌐 Cross-industry programs (will be updated to OTHER):`);
    crossIndustryPrograms.slice(0, 10).forEach(p => {
      console.log(`   - [${p.category} → OTHER] ${p.title.substring(0, 50)}...`);
    });
    if (crossIndustryPrograms.length > 10) {
      console.log(`   ... and ${crossIndustryPrograms.length - 10} more`);
    }

    // 5. Perform the update
    console.log(`\n🔄 Updating ${crossIndustryPrograms.length} cross-industry programs...`);

    const updateResult = await prisma.funding_programs.updateMany({
      where: {
        ministry: '중소벤처기업부',
        id: {
          in: crossIndustryPrograms.map(p => p.id),
        },
      },
      data: {
        category: 'OTHER',
      },
    });

    console.log(`\n✅ Updated ${updateResult.count} programs to category = 'OTHER'`);

    // 6. Verification
    console.log(`\n📊 Post-migration verification:`);

    const categoryStats = await prisma.funding_programs.groupBy({
      by: ['category'],
      where: {
        ministry: '중소벤처기업부',
      },
      _count: {
        id: true,
      },
    });

    console.log(`   Category distribution for 중소벤처기업부 programs:`);
    categoryStats.forEach(stat => {
      console.log(`   - ${stat.category}: ${stat._count.id} programs`);
    });

    console.log(`\n🎉 Migration completed successfully!`);
    console.log(`\n📝 Next steps:`);
    console.log(`   1. Regenerate matches for all organizations`);
    console.log(`   2. Verify ICT/BIO_HEALTH organizations now see 중소벤처기업부 programs`);
    console.log(`   3. Run: npx tsx scripts/verify-v4-keyword-classification.ts`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
