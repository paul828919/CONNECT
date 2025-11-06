/**
 * Analyze Category Performance Trends
 *
 * Performance trend analysis script
 *
 * Usage:
 * - Weekly analysis: npx tsx scripts/analyze-category-performance.ts weekly
 * - Monthly analysis: npx tsx scripts/analyze-category-performance.ts monthly
 * - Specific category: npx tsx scripts/analyze-category-performance.ts weekly AI
 */

import { getCategoryPerformanceReport, getAllCategoryReports } from '@/lib/analytics/match-performance';
import { db } from '@/lib/db';

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📈  CATEGORY PERFORMANCE TREND ANALYSIS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Parse arguments
  const period = (process.argv[2] || 'weekly') as 'daily' | 'weekly' | 'monthly';
  const specificCategory = process.argv[3];

  if (!['daily', 'weekly', 'monthly'].includes(period)) {
    console.error('❌ Invalid period. Use: daily, weekly, or monthly');
    process.exit(1);
  }

  const periodLabels = {
    daily: '일간 (24시간)',
    weekly: '주간 (7일)',
    monthly: '월간 (30일)',
  };

  console.log('📊 Analysis Period:', periodLabels[period]);
  console.log('📅 End Date:', new Date().toLocaleDateString('ko-KR'));
  console.log();

  try {
    let reports;

    if (specificCategory) {
      // Analyze specific category
      console.log(`🔍 Analyzing Category: ${specificCategory}\n`);
      const report = await getCategoryPerformanceReport(specificCategory, period);

      if (!report) {
        console.log(`⚠️  No data found for category: ${specificCategory}`);
        console.log('   Check if:');
        console.log('   - Category name is correct');
        console.log('   - Matches exist for this period');
        console.log('   - Daily metrics have been generated\n');
        await db.$disconnect();
        process.exit(0);
      }

      reports = [report];
    } else {
      // Analyze all categories
      console.log('📂 Analyzing All Categories\n');
      reports = await getAllCategoryReports(period);

      if (reports.length === 0) {
        console.log('⚠️  No performance data found for this period');
        console.log('   Run: npx tsx scripts/generate-category-report.ts\n');
        await db.$disconnect();
        process.exit(0);
      }
    }

    console.log('─────────────────────────────────────────────────────────────');
    console.log(`📊  ${period.toUpperCase()} PERFORMANCE REPORTS`);
    console.log('─────────────────────────────────────────────────────────────\n');

    for (const report of reports) {
      displayReport(report);
      console.log();
    }

    // Summary statistics
    console.log('─────────────────────────────────────────────────────────────');
    console.log('📈  OVERALL SUMMARY');
    console.log('─────────────────────────────────────────────────────────────\n');

    const totalMatches = reports.reduce((sum, r) => sum + r.totalMatches, 0);
    const avgScore = reports.reduce((sum, r) => sum + r.avgScore * r.totalMatches, 0) / totalMatches;
    const avgSavedRate = reports.reduce((sum, r) => sum + r.savedRate * r.totalMatches, 0) / totalMatches;
    const avgViewedRate = reports.reduce((sum, r) => sum + r.viewedRate * r.totalMatches, 0) / totalMatches;

    console.log(`Total Categories Analyzed: ${reports.length}`);
    console.log(`Total Matches: ${totalMatches}`);
    console.log(`Average Match Score: ${avgScore.toFixed(1)}/100`);
    console.log(`Average Saved Rate: ${avgSavedRate.toFixed(1)}%`);
    console.log(`Average Viewed Rate: ${avgViewedRate.toFixed(1)}%\n`);

    // Trend summary
    const improving = reports.filter(r => r.trend === 'improving').length;
    const stable = reports.filter(r => r.trend === 'stable').length;
    const declining = reports.filter(r => r.trend === 'declining').length;

    console.log('📊 Trend Distribution:');
    console.log(`   🟢 Improving: ${improving} (${((improving / reports.length) * 100).toFixed(0)}%)`);
    console.log(`   ⚪ Stable: ${stable} (${((stable / reports.length) * 100).toFixed(0)}%)`);
    console.log(`   🔴 Declining: ${declining} (${((declining / reports.length) * 100).toFixed(0)}%)\n`);

    // Top and bottom performers
    if (reports.length >= 3) {
      console.log('🏆 Top 3 Performers (Highest Avg Score):');
      const topPerformers = [...reports].sort((a, b) => b.avgScore - a.avgScore).slice(0, 3);
      topPerformers.forEach((r, i) => {
        console.log(`   ${i + 1}. ${r.category}: ${r.avgScore.toFixed(1)}/100 (${r.trend})`);
      });
      console.log();

      console.log('⚠️  Bottom 3 Performers (Lowest Avg Score):');
      const bottomPerformers = [...reports].sort((a, b) => a.avgScore - b.avgScore).slice(0, 3);
      bottomPerformers.forEach((r, i) => {
        console.log(`   ${i + 1}. ${r.category}: ${r.avgScore.toFixed(1)}/100 (${r.trend})`);
      });
      console.log();
    }

    // Action items
    const actionableCategories = reports.filter(
      r => r.alerts.length > 0 || r.trend === 'declining'
    );

    if (actionableCategories.length > 0) {
      console.log('─────────────────────────────────────────────────────────────');
      console.log('🎯  ACTION ITEMS');
      console.log('─────────────────────────────────────────────────────────────\n');

      console.log(`${actionableCategories.length} categories require attention:\n`);

      actionableCategories.forEach(r => {
        console.log(`📌 ${r.category}`);
        console.log(`   Current Score: ${r.avgScore.toFixed(1)}/100`);
        console.log(`   Trend: ${getTrendEmoji(r.trend)} ${r.trend.toUpperCase()}`);
        if (r.alerts.length > 0) {
          console.log(`   Alerts:`);
          r.alerts.forEach(alert => console.log(`   - ${alert}`));
        }
        console.log();
      });
    }

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅  PERFORMANCE ANALYSIS COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════');

    await db.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR:', error);
    await db.$disconnect();
    process.exit(1);
  }
}

// Helper function to display individual report
function displayReport(report: any) {
  console.log(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓`);
  console.log(`┃  ${report.category.padEnd(56)}  ┃`);
  console.log(`┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛`);
  console.log();
  console.log(`📅 Period: ${report.startDate.toLocaleDateString('ko-KR')} ~ ${report.endDate.toLocaleDateString('ko-KR')}`);
  console.log(`📊 Total Matches: ${report.totalMatches}`);
  console.log();
  console.log(`Performance Metrics:`);
  console.log(`  Average Score:    ${report.avgScore.toFixed(1)}/100 ${getScoreEmoji(report.avgScore)}`);
  console.log(`  Saved Rate:       ${report.savedRate.toFixed(1)}% ${getRateEmoji(report.savedRate, 10)}`);
  console.log(`  Viewed Rate:      ${report.viewedRate.toFixed(1)}% ${getRateEmoji(report.viewedRate, 30)}`);
  console.log(`  TRL Match Rate:   ${report.trlMatchRate.toFixed(1)}%`);
  console.log();
  console.log(`📈 Trend: ${getTrendEmoji(report.trend)} ${report.trend.toUpperCase()}`);

  if (report.alerts.length > 0) {
    console.log();
    console.log(`⚠️  Alerts:`);
    report.alerts.forEach((alert: string) => {
      console.log(`   ${alert}`);
    });
  }
}

// Helper functions for visual indicators
function getScoreEmoji(score: number): string {
  if (score >= 80) return '🟢';
  if (score >= 60) return '🟡';
  return '🔴';
}

function getRateEmoji(rate: number, threshold: number): string {
  return rate >= threshold ? '🟢' : '🔴';
}

function getTrendEmoji(trend: string): string {
  if (trend === 'improving') return '📈';
  if (trend === 'declining') return '📉';
  return '➡️';
}

main().catch(console.error);
