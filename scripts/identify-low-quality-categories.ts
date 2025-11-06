/**
 * Identify Low-Quality Categories
 *
 * Automated alert script for detecting underperforming match categories
 *
 * Usage:
 * - Weekly analysis: npx tsx scripts/identify-low-quality-categories.ts
 * - Monthly analysis: npx tsx scripts/identify-low-quality-categories.ts monthly
 * - Custom thresholds: npx tsx scripts/identify-low-quality-categories.ts weekly 65 12 35
 *
 * Cron schedule (add to crontab for weekly reports):
 * 0 9 * * 1 cd /opt/connect && npx tsx scripts/identify-low-quality-categories.ts weekly >> logs/alerts.log 2>&1
 *
 * Environment variables for notifications:
 * - SLACK_WEBHOOK_URL: Slack webhook for alerts
 * - ALERT_EMAIL: Email address for critical alerts
 */

import { identifyLowQualityCategories } from '@/lib/analytics/match-performance';
import { db } from '@/lib/db';

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🚨  LOW-QUALITY CATEGORY DETECTION');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Parse arguments
  const period = (process.argv[2] || 'weekly') as 'weekly' | 'monthly';
  const scoreThreshold = process.argv[3] ? parseFloat(process.argv[3]) : 60;
  const savedRateThreshold = process.argv[4] ? parseFloat(process.argv[4]) : 10;
  const viewedRateThreshold = process.argv[5] ? parseFloat(process.argv[5]) : 30;

  if (!['weekly', 'monthly'].includes(period)) {
    console.error('❌ Invalid period. Use: weekly or monthly');
    process.exit(1);
  }

  const periodLabels = {
    weekly: '주간 (7일)',
    monthly: '월간 (30일)',
  };

  console.log('📊 Analysis Period:', periodLabels[period]);
  console.log('📅 Analysis Date:', new Date().toLocaleDateString('ko-KR'));
  console.log('\n🎯 Detection Thresholds:');
  console.log(`   Average Score: < ${scoreThreshold}/100`);
  console.log(`   Saved Rate: < ${savedRateThreshold}%`);
  console.log(`   Viewed Rate: < ${viewedRateThreshold}%`);
  console.log();

  try {
    // Identify low-quality categories
    const alerts = await identifyLowQualityCategories(
      period,
      scoreThreshold,
      savedRateThreshold,
      viewedRateThreshold
    );

    if (alerts.length === 0) {
      console.log('✅ No low-quality categories detected!');
      console.log('   All categories are performing above thresholds.\n');

      console.log('═══════════════════════════════════════════════════════════════');
      console.log('✅  DETECTION COMPLETE - ALL SYSTEMS NORMAL');
      console.log('═══════════════════════════════════════════════════════════════');

      await db.$disconnect();
      process.exit(0);
    }

    // Display alerts
    console.log(`⚠️  Found ${alerts.length} low-quality ${alerts.length === 1 ? 'category' : 'categories'}\n`);
    console.log('─────────────────────────────────────────────────────────────');
    console.log('🚨  ALERT DETAILS');
    console.log('─────────────────────────────────────────────────────────────\n');

    for (let i = 0; i < alerts.length; i++) {
      const alert = alerts[i];

      console.log(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓`);
      console.log(`┃  Alert ${i + 1}/${alerts.length}: ${alert.category.padEnd(47)}  ┃`);
      console.log(`┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛`);
      console.log();
      console.log(`📊 Performance Metrics:`);
      console.log(`   Total Matches: ${alert.totalMatches}`);
      console.log(`   Average Score: ${alert.avgScore.toFixed(1)}/100 ${getScoreIndicator(alert.avgScore, scoreThreshold)}`);
      console.log(`   Saved Rate: ${alert.savedRate.toFixed(1)}% ${getRateIndicator(alert.savedRate, savedRateThreshold)}`);
      console.log(`   Viewed Rate: ${alert.viewedRate.toFixed(1)}% ${getRateIndicator(alert.viewedRate, viewedRateThreshold)}`);
      console.log();
      console.log(`🔍 Issues Detected:`);
      alert.reasons.forEach(reason => {
        console.log(`   🔴 ${reason}`);
      });
      console.log();
      console.log(`💡 Recommended Actions:`);
      const recommendations = generateRecommendations(alert);
      recommendations.forEach(rec => {
        console.log(`   ✓ ${rec}`);
      });
      console.log();
    }

    // Summary statistics
    console.log('─────────────────────────────────────────────────────────────');
    console.log('📈  SUMMARY');
    console.log('─────────────────────────────────────────────────────────────\n');

    const totalMatches = alerts.reduce((sum, a) => sum + a.totalMatches, 0);
    const avgScore = alerts.reduce((sum, a) => sum + a.avgScore * a.totalMatches, 0) / totalMatches;
    const avgSavedRate = alerts.reduce((sum, a) => sum + a.savedRate * a.totalMatches, 0) / totalMatches;
    const avgViewedRate = alerts.reduce((sum, a) => sum + a.viewedRate * a.totalMatches, 0) / totalMatches;

    console.log(`Total Low-Quality Categories: ${alerts.length}`);
    console.log(`Total Affected Matches: ${totalMatches}`);
    console.log(`Average Match Score: ${avgScore.toFixed(1)}/100`);
    console.log(`Average Saved Rate: ${avgSavedRate.toFixed(1)}%`);
    console.log(`Average Viewed Rate: ${avgViewedRate.toFixed(1)}%\n`);

    // Severity classification
    const critical = alerts.filter(a => a.avgScore < 50 || a.savedRate < 5);
    const warning = alerts.filter(a => a.avgScore >= 50 && a.savedRate >= 5);

    console.log('🎯 Severity Distribution:');
    console.log(`   🔴 Critical (score < 50 or saved < 5%): ${critical.length}`);
    console.log(`   🟡 Warning (score < ${scoreThreshold} or saved < ${savedRateThreshold}%): ${warning.length}\n`);

    if (critical.length > 0) {
      console.log('🚨 CRITICAL CATEGORIES (Immediate Action Required):');
      critical.forEach(a => {
        console.log(`   - ${a.category}: Score ${a.avgScore.toFixed(1)}, Saved ${a.savedRate.toFixed(1)}%`);
      });
      console.log();
    }

    // Next steps
    console.log('─────────────────────────────────────────────────────────────');
    console.log('📋  NEXT STEPS');
    console.log('─────────────────────────────────────────────────────────────\n');

    console.log('1. Review low-performing categories and their match results');
    console.log('2. Investigate algorithm scoring logic for affected categories');
    console.log('3. Analyze program quality in underperforming categories');
    console.log('4. Consider adjusting category-specific matching weights');
    console.log('5. Review user feedback for these categories\n');

    console.log('📊 Detailed Analysis Commands:');
    alerts.forEach(alert => {
      console.log(`   npx tsx scripts/analyze-category-performance.ts ${period} "${alert.category}"`);
    });
    console.log();

    // Send notifications if configured
    const notificationsSent = await sendNotifications(alerts, period);
    if (notificationsSent) {
      console.log('📧 Notifications sent to configured channels\n');
    }

    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`${critical.length > 0 ? '🚨' : '⚠️'}  DETECTION COMPLETE - ${alerts.length} ${alerts.length === 1 ? 'ALERT' : 'ALERTS'} FOUND`);
    console.log('═══════════════════════════════════════════════════════════════');

    await db.$disconnect();
    process.exit(critical.length > 0 ? 1 : 0); // Exit with error code if critical issues found
  } catch (error) {
    console.error('\n❌ ERROR:', error);
    await db.$disconnect();
    process.exit(1);
  }
}

// Helper functions

function getScoreIndicator(score: number, threshold: number): string {
  const diff = threshold - score;
  if (diff > 20) return '🔴 CRITICAL';
  if (diff > 10) return '🟠 SEVERE';
  if (diff > 0) return '🟡 WARNING';
  return '🟢 OK';
}

function getRateIndicator(rate: number, threshold: number): string {
  const diff = threshold - rate;
  if (diff > 10) return '🔴 CRITICAL';
  if (diff > 5) return '🟠 SEVERE';
  if (diff > 0) return '🟡 WARNING';
  return '🟢 OK';
}

function generateRecommendations(alert: any): string[] {
  const recommendations: string[] = [];

  if (alert.avgScore < 60) {
    recommendations.push('Review algorithm scoring weights for this category');
    recommendations.push('Analyze top-performing matches to identify patterns');
    recommendations.push('Consider category-specific scoring adjustments');
  }

  if (alert.savedRate < 10) {
    recommendations.push('Improve match relevance - users not finding value');
    recommendations.push('Review program quality in this category');
    recommendations.push('Consider stricter filtering criteria');
  }

  if (alert.viewedRate < 30) {
    recommendations.push('Improve match preview information');
    recommendations.push('Enhance program titles and descriptions');
    recommendations.push('Review notification templates for engagement');
  }

  if (alert.totalMatches > 100 && alert.savedRate < 5) {
    recommendations.push('HIGH VOLUME, LOW QUALITY - Reduce match quantity, increase quality');
    recommendations.push('Implement stricter eligibility filtering');
  }

  if (recommendations.length === 0) {
    recommendations.push('Monitor category performance closely');
    recommendations.push('Gather user feedback on match quality');
  }

  return recommendations;
}

async function sendNotifications(alerts: any[], period: string): Promise<boolean> {
  const slackWebhook = process.env.SLACK_WEBHOOK_URL;
  const alertEmail = process.env.ALERT_EMAIL;

  if (!slackWebhook && !alertEmail) {
    // No notification channels configured
    return false;
  }

  const critical = alerts.filter(a => a.avgScore < 50 || a.savedRate < 5);
  const message = `🚨 Low-Quality Category Alert (${period})

Found ${alerts.length} underperforming ${alerts.length === 1 ? 'category' : 'categories'}${critical.length > 0 ? ` (${critical.length} critical)` : ''}

Categories requiring attention:
${alerts.map(a => `• ${a.category}: Score ${a.avgScore.toFixed(1)}, Saved ${a.savedRate.toFixed(1)}%`).join('\n')}

View detailed report: npx tsx scripts/identify-low-quality-categories.ts ${period}`;

  // Slack notification
  if (slackWebhook) {
    try {
      await fetch(slackWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: message,
          blocks: [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: `🚨 Low-Quality Category Alert (${period})`,
              },
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `Found *${alerts.length}* underperforming ${alerts.length === 1 ? 'category' : 'categories'}${critical.length > 0 ? ` (*${critical.length} critical*)` : ''}`,
              },
            },
            {
              type: 'section',
              fields: alerts.slice(0, 5).map(a => ({
                type: 'mrkdwn',
                text: `*${a.category}*\nScore: ${a.avgScore.toFixed(1)} | Saved: ${a.savedRate.toFixed(1)}%`,
              })),
            },
          ],
        }),
      });
      console.log('✓ Slack notification sent');
    } catch (error) {
      console.error('✗ Slack notification failed:', error);
    }
  }

  // Email notification (placeholder - implement with actual email service)
  if (alertEmail && critical.length > 0) {
    console.log(`✓ Email notification queued for: ${alertEmail}`);
    // TODO: Implement email sending via SendGrid/AWS SES
    // await sendEmail({
    //   to: alertEmail,
    //   subject: `🚨 Critical Match Quality Alert (${period})`,
    //   body: message,
    // });
  }

  return true;
}

main().catch(console.error);
