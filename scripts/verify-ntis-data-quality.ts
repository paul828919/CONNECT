import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyDataQuality() {
  console.log('🔍 Starting NTIS Data Quality Verification...\n');

  try {
    // Get all NTIS programs (from latest scrape)
    const ntisPrograms = await prisma.funding_programs.findMany({
      where: {
        agencyId: 'NTIS',
      },
      orderBy: { scrapedAt: 'desc' },
    });

    console.log(`📊 Total NTIS Programs: ${ntisPrograms.length}\n`);

    if (ntisPrograms.length === 0) {
      console.log('❌ No NTIS programs found');
      return;
    }

    // Show scraping date range
    if (ntisPrograms.length > 0) {
      const oldestScrape = ntisPrograms[ntisPrograms.length - 1].scrapedAt;
      const newestScrape = ntisPrograms[0].scrapedAt;
      console.log(`📅 Scraping Period: ${oldestScrape.toISOString().split('T')[0]} to ${newestScrape.toISOString().split('T')[0]}\n`);
    }

    // Field completeness analysis
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📋 FIELD COMPLETENESS ANALYSIS');
    console.log('═══════════════════════════════════════════════════════════\n');

    const fieldStats = {
      total: ntisPrograms.length,
      title: 0,
      description: 0,
      announcementUrl: 0,
      targetType: 0,
      minTrl: 0,
      maxTrl: 0,
      eligibilityCriteria: 0,
      budgetAmount: 0,
      fundingPeriod: 0,
      deadline: 0,
      category: 0,
      keywords: 0,
      publishedAt: 0,
      scrapingSource: 0,
      announcementType: 0,
      status: 0,
    };

    // Count populated fields
    for (const program of ntisPrograms) {
      if (program.title) fieldStats.title++;
      if (program.description) fieldStats.description++;
      if (program.announcementUrl) fieldStats.announcementUrl++;
      if (program.targetType && program.targetType.length > 0) fieldStats.targetType++;
      if (program.minTrl !== null) fieldStats.minTrl++;
      if (program.maxTrl !== null) fieldStats.maxTrl++;
      if (program.eligibilityCriteria) fieldStats.eligibilityCriteria++;
      if (program.budgetAmount !== null) fieldStats.budgetAmount++;
      if (program.fundingPeriod) fieldStats.fundingPeriod++;
      if (program.deadline) fieldStats.deadline++;
      if (program.category) fieldStats.category++;
      if (program.keywords && program.keywords.length > 0) fieldStats.keywords++;
      if (program.publishedAt) fieldStats.publishedAt++;
      if (program.scrapingSource) fieldStats.scrapingSource++;
      if (program.announcementType) fieldStats.announcementType++;
      if (program.status) fieldStats.status++;
    }

    // Calculate percentages and display
    const displayStats = Object.entries(fieldStats)
      .filter(([key]) => key !== 'total')
      .map(([field, count]) => {
        const percentage = ((count / fieldStats.total) * 100).toFixed(1);
        const icon = count === fieldStats.total ? '✅' : count > fieldStats.total * 0.5 ? '⚠️' : '❌';
        return { field, count, percentage: parseFloat(percentage), icon };
      })
      .sort((a, b) => b.percentage - a.percentage);

    console.log('Required Fields:');
    console.log('─────────────────────────────────────────────────────────');
    for (const { field, count, percentage, icon } of displayStats.filter(s =>
      ['title', 'announcementUrl', 'announcementType', 'status'].includes(s.field)
    )) {
      console.log(`${icon} ${field.padEnd(25)} ${count}/${fieldStats.total} (${percentage}%)`);
    }

    console.log('\nCore Data Fields:');
    console.log('─────────────────────────────────────────────────────────');
    for (const { field, count, percentage, icon } of displayStats.filter(s =>
      ['targetType', 'keywords', 'description', 'budgetAmount', 'deadline'].includes(s.field)
    )) {
      console.log(`${icon} ${field.padEnd(25)} ${count}/${fieldStats.total} (${percentage}%)`);
    }

    console.log('\nOptional/Metadata Fields:');
    console.log('─────────────────────────────────────────────────────────');
    for (const { field, count, percentage, icon } of displayStats.filter(s =>
      ['minTrl', 'maxTrl', 'category', 'fundingPeriod', 'eligibilityCriteria', 'publishedAt', 'scrapingSource'].includes(s.field)
    )) {
      console.log(`${icon} ${field.padEnd(25)} ${count}/${fieldStats.total} (${percentage}%)`);
    }

    // Data quality checks
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🔬 DATA QUALITY CHECKS');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Check 1: Programs missing critical fields
    const missingTitle = ntisPrograms.filter(p => !p.title);
    const missingUrl = ntisPrograms.filter(p => !p.announcementUrl);
    const missingKeywords = ntisPrograms.filter(p => !p.keywords || p.keywords.length === 0);
    const missingTargetType = ntisPrograms.filter(p => !p.targetType || p.targetType.length === 0);

    console.log('Critical Field Issues:');
    console.log(`  Missing title: ${missingTitle.length}`);
    console.log(`  Missing announcementUrl: ${missingUrl.length}`);
    console.log(`  Missing keywords: ${missingKeywords.length}`);
    console.log(`  Missing targetType: ${missingTargetType.length}`);

    // Check 2: Budget analysis
    console.log('\nBudget Data:');
    const programsWithBudget = ntisPrograms.filter(p => p.budgetAmount !== null);
    const totalBudget = programsWithBudget.reduce((sum, p) => sum + Number(p.budgetAmount || 0), 0);
    console.log(`  Programs with budget: ${programsWithBudget.length}/${ntisPrograms.length}`);
    console.log(`  Total budget: ₩${(totalBudget / 1_000_000_000).toFixed(1)}B`);
    if (programsWithBudget.length > 0) {
      console.log(`  Average budget: ₩${(totalBudget / programsWithBudget.length / 1_000_000_000).toFixed(2)}B`);
    }

    // Check 3: Deadline analysis
    console.log('\nDeadline Data:');
    const programsWithDeadline = ntisPrograms.filter(p => p.deadline);
    console.log(`  Programs with deadline: ${programsWithDeadline.length}/${ntisPrograms.length}`);
    if (programsWithDeadline.length > 0) {
      const earliestDeadline = new Date(Math.min(...programsWithDeadline.map(p => p.deadline!.getTime())));
      const latestDeadline = new Date(Math.max(...programsWithDeadline.map(p => p.deadline!.getTime())));
      console.log(`  Earliest: ${earliestDeadline.toISOString().split('T')[0]}`);
      console.log(`  Latest: ${latestDeadline.toISOString().split('T')[0]}`);
    }

    // Check 4: Status distribution
    console.log('\nStatus Distribution:');
    const statusCounts = ntisPrograms.reduce((acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    for (const [status, count] of Object.entries(statusCounts)) {
      console.log(`  ${status}: ${count}`);
    }

    // Check 5: AnnouncementType distribution
    console.log('\nAnnouncement Type Distribution:');
    const typeCounts = ntisPrograms.reduce((acc, p) => {
      acc[p.announcementType] = (acc[p.announcementType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    for (const [type, count] of Object.entries(typeCounts)) {
      console.log(`  ${type}: ${count}`);
    }

    // Check 6: Keywords analysis
    console.log('\nKeywords Analysis:');
    const allKeywords = ntisPrograms.flatMap(p => p.keywords || []);
    const uniqueKeywords = new Set(allKeywords);
    console.log(`  Total keywords: ${allKeywords.length}`);
    console.log(`  Unique keywords: ${uniqueKeywords.size}`);
    if (programsWithBudget.length > 0) {
      console.log(`  Average keywords per program: ${(allKeywords.length / ntisPrograms.length).toFixed(1)}`);
    }

    // Check 7: URL validation
    console.log('\nURL Validation:');
    const invalidUrls = ntisPrograms.filter(p => {
      try {
        new URL(p.announcementUrl);
        return false;
      } catch {
        return true;
      }
    });
    console.log(`  Invalid URLs: ${invalidUrls.length}`);

    // Sample programs
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📑 SAMPLE PROGRAMS (First 3)');
    console.log('═══════════════════════════════════════════════════════════\n');

    const samples = ntisPrograms.slice(0, 3);
    for (let i = 0; i < samples.length; i++) {
      const program = samples[i];
      console.log(`\n${i + 1}. ${program.title}`);
      console.log('─────────────────────────────────────────────────────────');
      console.log(`   ID: ${program.id}`);
      console.log(`   Agency: ${program.agencyId}`);
      console.log(`   URL: ${program.announcementUrl}`);
      console.log(`   Type: ${program.announcementType}`);
      console.log(`   Status: ${program.status}`);
      console.log(`   Target Type: ${program.targetType?.join(', ') || 'N/A'}`);
      console.log(`   Budget: ${program.budgetAmount ? `₩${(Number(program.budgetAmount) / 1_000_000_000).toFixed(1)}B` : 'TBD'}`);
      console.log(`   Deadline: ${program.deadline ? program.deadline.toISOString().split('T')[0] : 'N/A'}`);
      console.log(`   Keywords (${program.keywords?.length || 0}): ${program.keywords?.slice(0, 5).join(', ')}${program.keywords && program.keywords.length > 5 ? '...' : ''}`);
      console.log(`   TRL Range: ${program.minTrl ?? 'N/A'} - ${program.maxTrl ?? 'N/A'}`);
      console.log(`   Scraped: ${program.scrapedAt.toISOString().split('T')[0]}`);
      if (program.description) {
        console.log(`   Description: ${program.description.substring(0, 100)}${program.description.length > 100 ? '...' : ''}`);
      }
    }

    // Data quality summary
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📊 DATA QUALITY SUMMARY');
    console.log('═══════════════════════════════════════════════════════════\n');

    const criticalFieldsComplete = missingTitle.length === 0 && missingUrl.length === 0;
    const coreFieldsGood = (fieldStats.keywords / fieldStats.total) > 0.9 &&
                           (fieldStats.targetType / fieldStats.total) > 0.9;
    const budgetCoverage = (fieldStats.budgetAmount / fieldStats.total) > 0.05;
    const deadlineCoverage = (fieldStats.deadline / fieldStats.total) > 0.1;

    console.log('Overall Assessment:');
    console.log(`  ${criticalFieldsComplete ? '✅' : '❌'} Critical fields (title, URL): ${criticalFieldsComplete ? 'Complete' : 'Issues found'}`);
    console.log(`  ${coreFieldsGood ? '✅' : '⚠️'} Core fields (keywords, targetType): ${coreFieldsGood ? 'Good' : 'Needs improvement'}`);
    console.log(`  ${budgetCoverage ? '✅' : '⚠️'} Budget coverage: ${((fieldStats.budgetAmount / fieldStats.total) * 100).toFixed(1)}%`);
    console.log(`  ${deadlineCoverage ? '✅' : '⚠️'} Deadline coverage: ${((fieldStats.deadline / fieldStats.total) * 100).toFixed(1)}%`);

    const overallQualityScore = [
      criticalFieldsComplete ? 25 : 0,
      coreFieldsGood ? 35 : ((fieldStats.keywords / fieldStats.total) * 35),
      budgetCoverage ? 20 : ((fieldStats.budgetAmount / fieldStats.total) * 20),
      deadlineCoverage ? 20 : ((fieldStats.deadline / fieldStats.total) * 20),
    ].reduce((sum, score) => sum + score, 0);

    console.log(`\n📈 Overall Quality Score: ${overallQualityScore.toFixed(1)}/100`);

    if (overallQualityScore >= 80) {
      console.log('   Status: ✅ Excellent - Data is production-ready');
    } else if (overallQualityScore >= 60) {
      console.log('   Status: ⚠️ Good - Minor improvements recommended');
    } else if (overallQualityScore >= 40) {
      console.log('   Status: ⚠️ Fair - Significant improvements needed');
    } else {
      console.log('   Status: ❌ Poor - Major data quality issues detected');
    }

    // Recommendations
    console.log('\n💡 Recommendations:');
    const recommendations: string[] = [];

    if (!criticalFieldsComplete) {
      recommendations.push('  • Fix missing critical fields (title, URL)');
    }
    if ((fieldStats.keywords / fieldStats.total) < 0.9) {
      recommendations.push('  • Improve keyword extraction from announcements');
    }
    if ((fieldStats.targetType / fieldStats.total) < 0.9) {
      recommendations.push('  • Enhance target type classification');
    }
    if ((fieldStats.budgetAmount / fieldStats.total) < 0.1) {
      recommendations.push('  • Improve budget information extraction');
    }
    if ((fieldStats.deadline / fieldStats.total) < 0.2) {
      recommendations.push('  • Enhance deadline parsing logic');
    }
    if ((fieldStats.description / fieldStats.total) < 0.8) {
      recommendations.push('  • Extract more detailed program descriptions');
    }

    if (recommendations.length === 0) {
      console.log('  ✅ No critical recommendations - Data quality is excellent!');
    } else {
      recommendations.forEach(rec => console.log(rec));
    }

    console.log('\n✅ Data quality verification complete!');

  } catch (error) {
    console.error('❌ Error during verification:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

verifyDataQuality();
