/**
 * Quick diagnostic: Check scraping progress in database
 * Run while scraping is in progress to monitor data quality
 */

import { db } from '@/lib/db';

async function checkProgress() {
  console.log('🔍 Database Progress Check\n');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    // 1. Total count
    const totalCount = await db.funding_programs.count();
    console.log(`📊 Total programs saved: ${totalCount}\n`);

    if (totalCount === 0) {
      console.log('⚠️  No programs found in database yet.\n');
      return;
    }

    // 2. Category breakdown
    const categoryBreakdown = await db.funding_programs.groupBy({
      by: ['category'],
      _count: true
    });

    console.log('📋 Category Breakdown:');
    console.log('─────────────────────────────────────────────────────────');
    categoryBreakdown.forEach(item => {
      const category = item.category || 'NULL';
      const count = item._count;
      const percentage = ((count / totalCount) * 100).toFixed(1);
      console.log(`   ${category.padEnd(20)} ${count.toString().padStart(4)} programs (${percentage}%)`);
    });
    console.log('─────────────────────────────────────────────────────────\n');

    // 3. Ministry breakdown
    const ministryBreakdown = await db.funding_programs.groupBy({
      by: ['ministry'],
      _count: true
    });

    console.log('🏛️  Ministry Breakdown:');
    console.log('─────────────────────────────────────────────────────────');
    ministryBreakdown.slice(0, 10).forEach(item => {
      const ministry = item.ministry || 'NULL';
      const count = item._count;
      const percentage = ((count / totalCount) * 100).toFixed(1);
      console.log(`   ${ministry.padEnd(30)} ${count.toString().padStart(3)} (${percentage}%)`);
    });
    if (ministryBreakdown.length > 10) {
      console.log(`   ... and ${ministryBreakdown.length - 10} more`);
    }
    console.log('─────────────────────────────────────────────────────────\n');

    // 4. Data quality metrics
    const nullCategory = await db.funding_programs.count({
      where: { category: null }
    });
    const nullMinistry = await db.funding_programs.count({
      where: { ministry: null }
    });
    const emptyKeywords = await db.funding_programs.count({
      where: { keywords: { isEmpty: true } }
    });

    const categoryRate = ((nullCategory / totalCount) * 100).toFixed(2);
    const ministryRate = ((nullMinistry / totalCount) * 100).toFixed(2);
    const keywordsRate = ((emptyKeywords / totalCount) * 100).toFixed(2);

    console.log('🔍 Data Quality Metrics:');
    console.log('─────────────────────────────────────────────────────────');
    console.log(`   NULL category:   ${nullCategory.toString().padStart(4)} (${categoryRate}% omission)`);
    console.log(`   NULL ministry:   ${nullMinistry.toString().padStart(4)} (${ministryRate}%)`);
    console.log(`   Empty keywords:  ${emptyKeywords.toString().padStart(4)} (${keywordsRate}%)`);
    console.log('─────────────────────────────────────────────────────────\n');

    // 5. Sample programs with full categorization details
    console.log('📝 Sample Programs (Latest 5):');
    console.log('─────────────────────────────────────────────────────────');
    const samplePrograms = await db.funding_programs.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        title: true,
        ministry: true,
        announcingAgency: true,
        category: true,
        keywords: true,
      }
    });

    samplePrograms.forEach((program, index) => {
      console.log(`\n${index + 1}. ${program.title.substring(0, 60)}...`);
      console.log(`   Ministry: ${program.ministry || 'NULL'}`);
      console.log(`   Agency:   ${program.announcingAgency || 'NULL'}`);
      console.log(`   Category: ${program.category || 'NULL'}`);
      console.log(`   Keywords: ${program.keywords.length} keywords`);
      if (program.keywords.length > 0) {
        console.log(`             [${program.keywords.slice(0, 5).join(', ')}${program.keywords.length > 5 ? ', ...' : ''}]`);
      }
    });

    console.log('\n─────────────────────────────────────────────────────────\n');

    // 6. Ministry fallback effectiveness
    const programsWithMinistry = await db.funding_programs.count({
      where: { ministry: { not: null } }
    });
    const programsWithCategory = await db.funding_programs.count({
      where: { category: { not: null } }
    });

    console.log('✅ Ministry Fallback Effectiveness:');
    console.log('─────────────────────────────────────────────────────────');
    console.log(`   Programs with ministry: ${programsWithMinistry}/${totalCount} (${((programsWithMinistry/totalCount)*100).toFixed(1)}%)`);
    console.log(`   Programs categorized:   ${programsWithCategory}/${totalCount} (${((programsWithCategory/totalCount)*100).toFixed(1)}%)`);

    if (programsWithMinistry > 0 && programsWithCategory > 0) {
      const fallbackSuccess = ((programsWithCategory / programsWithMinistry) * 100).toFixed(1);
      console.log(`   Categorization success: ${fallbackSuccess}% of programs with ministry`);
    }
    console.log('─────────────────────────────────────────────────────────\n');

    // 7. Compare to previous run (before fix)
    console.log('📊 Comparison to Previous Run (Before Ministry Fallback Fix):');
    console.log('─────────────────────────────────────────────────────────');
    console.log(`   BEFORE: 99.0% NULL ministry, 54.74% NULL category`);
    console.log(`   NOW:    ${ministryRate}% NULL ministry, ${categoryRate}% NULL category`);
    console.log('─────────────────────────────────────────────────────────\n');

    const ministryImprovement = (99.0 - parseFloat(ministryRate)).toFixed(2);
    const categoryImprovement = (54.74 - parseFloat(categoryRate)).toFixed(2);

    if (parseFloat(ministryImprovement) > 0 || parseFloat(categoryImprovement) > 0) {
      console.log('✅ IMPROVEMENTS DETECTED:');
      if (parseFloat(ministryImprovement) > 0) {
        console.log(`   ✓ Ministry coverage improved by ${ministryImprovement}%`);
      }
      if (parseFloat(categoryImprovement) > 0) {
        console.log(`   ✓ Category coverage improved by ${categoryImprovement}%`);
      }
      console.log('');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

checkProgress();
