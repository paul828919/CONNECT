/**
 * Generate Category Performance Report
 *
 * Daily metrics aggregation script
 *
 * Usage:
 * - Run manually: npx tsx scripts/generate-category-report.ts
 * - Run for specific date: npx tsx scripts/generate-category-report.ts 2025-01-15
 * - Via cron: Run daily at midnight to aggregate previous day's data
 *
 * Cron schedule (add to crontab):
 * 0 0 * * * cd /opt/connect && npx tsx scripts/generate-category-report.ts >> logs/analytics.log 2>&1
 */

import { calculateAllCategoryMetrics } from '@/lib/analytics/match-performance';
import { db } from '@/lib/db';

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📊  CATEGORY PERFORMANCE REPORT GENERATION');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Determine date to process
  const dateArg = process.argv[2];
  let targetDate: Date;

  if (dateArg) {
    // Use provided date
    targetDate = new Date(dateArg);
    if (isNaN(targetDate.getTime())) {
      console.error('❌ Invalid date format. Use YYYY-MM-DD');
      process.exit(1);
    }
  } else {
    // Default: yesterday (since cron runs at midnight for previous day)
    targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - 1);
  }

  // Normalize to start of day
  targetDate.setUTCHours(0, 0, 0, 0);

  console.log('📅 Target Date:', targetDate.toISOString().split('T')[0]);
  console.log('⏰ Processing started at:', new Date().toLocaleString('ko-KR'));
  console.log();

  try {
    // Calculate and store metrics for all categories
    await calculateAllCategoryMetrics(targetDate);

    // Fetch and display results
    console.log('\n─────────────────────────────────────────────────────────────');
    console.log('📈  GENERATED METRICS SUMMARY');
    console.log('─────────────────────────────────────────────────────────────\n');

    const metrics = await db.category_performance_metrics.findMany({
      where: {
        date: targetDate,
      },
      orderBy: {
        avgMatchScore: 'asc', // Show lowest performing categories first
      },
    });

    if (metrics.length === 0) {
      console.log('⚠️  No matches found for this date');
      console.log('   This might be normal if:');
      console.log('   - No matches were generated on this date');
      console.log('   - This is a weekend/holiday');
      console.log('   - System was down/maintenance\n');
    } else {
      console.log(`✅ Processed ${metrics.length} categories\n`);

      // Display table header
      console.log('┌──────────────────────────────┬──────────┬─────────┬─────────┬─────────┬─────────┐');
      console.log('│ Category                     │ Matches  │ Avg Score│ Saved % │ Viewed %│ TRL %   │');
      console.log('├──────────────────────────────┼──────────┼─────────┼─────────┼─────────┼─────────┤');

      for (const metric of metrics) {
        const category = metric.category.padEnd(28).substring(0, 28);
        const matchCount = metric.matchCount.toString().padStart(8);
        const avgScore = metric.avgMatchScore.toFixed(1).padStart(7);
        const savedRate = metric.savedRate.toFixed(1).padStart(7);
        const viewedRate = metric.viewedRate.toFixed(1).padStart(7);
        const trlRate = metric.trlMatchRate.toFixed(1).padStart(7);

        // Highlight low performers
        const scoreFlag = metric.avgMatchScore < 60 ? '⚠️' : '  ';
        const savedFlag = metric.savedRate < 10 ? '⚠️' : '  ';

        console.log(
          `│ ${category} │ ${matchCount} │ ${avgScore}${scoreFlag}│ ${savedRate}${savedFlag}│ ${viewedRate}  │ ${trlRate}  │`
        );
      }

      console.log('└──────────────────────────────┴──────────┴─────────┴─────────┴─────────┴─────────┘\n');

      // Summary statistics
      const totalMatches = metrics.reduce((sum, m) => sum + m.matchCount, 0);
      const overallAvgScore = metrics.reduce((sum, m) => sum + m.avgMatchScore * m.matchCount, 0) / totalMatches;
      const overallSavedRate = metrics.reduce((sum, m) => sum + m.savedRate * m.matchCount, 0) / totalMatches;
      const overallViewedRate = metrics.reduce((sum, m) => sum + m.viewedRate * m.matchCount, 0) / totalMatches;

      console.log('📊 Overall Summary:');
      console.log(`   Total Matches: ${totalMatches}`);
      console.log(`   Average Score: ${overallAvgScore.toFixed(1)}/100`);
      console.log(`   Saved Rate: ${overallSavedRate.toFixed(1)}%`);
      console.log(`   Viewed Rate: ${overallViewedRate.toFixed(1)}%\n`);

      // Alert on low performers
      const lowPerformers = metrics.filter(m => m.avgMatchScore < 60 || m.savedRate < 10);
      if (lowPerformers.length > 0) {
        console.log('⚠️  Low Performing Categories:');
        lowPerformers.forEach(m => {
          const issues: string[] = [];
          if (m.avgMatchScore < 60) issues.push('Low Score');
          if (m.savedRate < 10) issues.push('Low Saved Rate');
          console.log(`   - ${m.category}: ${issues.join(', ')}`);
        });
        console.log();
      }
    }

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅  CATEGORY METRICS GENERATION COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════');

    await db.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR:', error);
    await db.$disconnect();
    process.exit(1);
  }
}

main().catch(console.error);
