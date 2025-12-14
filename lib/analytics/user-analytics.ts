/**
 * User Analytics Library (Admin Dashboard)
 *
 * Time-series aggregation and analysis functions for admin statistics dashboard.
 *
 * Features:
 * - Multi-period aggregations (daily, weekly, monthly)
 * - Growth rate calculations (WoW, MoM)
 * - Trend analysis and forecasting
 * - Summary statistics and KPIs
 *
 * Data Source: active_user_stats table (populated by Session 1 cron job)
 */

import { PrismaClient } from '@prisma/client';
import { subDays, subWeeks, subMonths, startOfWeek, startOfMonth, format, differenceInDays } from 'date-fns';

const prisma = new PrismaClient();

/**
 * Time period type for aggregations
 */
export type TimePeriod = 'daily' | 'weekly' | 'monthly';

/**
 * Data point for time-series charts
 */
export interface DataPoint {
  date: string; // ISO date string (YYYY-MM-DD)
  uniqueUsers: number;
  totalPageViews: number;
  avgPageViewsPerUser: number; // Calculated: totalPageViews / uniqueUsers
}

/**
 * Summary statistics for dashboard KPIs
 */
export interface SummaryStats {
  totalUsers: number; // Total unique users in period
  totalPageViews: number; // Total page views in period
  avgDailyUsers: number; // Average daily active users
  avgPageViewsPerUser: number; // Average page views per user
  peakUsers: number; // Maximum daily users
  peakDate: string; // Date of peak users
  growthRate: number; // Percentage growth vs previous period
  trend: 'up' | 'down' | 'stable'; // Overall trend direction
}

/**
 * Complete analytics response for API
 */
export interface UserAnalytics {
  period: TimePeriod;
  startDate: string;
  endDate: string;
  dataPoints: DataPoint[];
  summary: SummaryStats;
  generatedAt: string; // ISO timestamp
}

/**
 * Get user analytics for specified time period
 *
 * @param period - Aggregation period (daily, weekly, monthly)
 * @param days - Number of days to look back (default: 30 for daily, 12*7 for weekly, 12*30 for monthly)
 * @returns Complete analytics with time-series data and summary stats
 *
 * @example
 * // Get last 30 days of daily data
 * const analytics = await getUserAnalytics('daily');
 *
 * @example
 * // Get last 12 weeks of weekly data
 * const analytics = await getUserAnalytics('weekly', 12 * 7);
 */
export async function getUserAnalytics(
  period: TimePeriod = 'daily',
  days?: number
): Promise<UserAnalytics> {
  const endDate = new Date();
  endDate.setHours(0, 0, 0, 0); // Start of today

  // Set default lookback based on period
  const defaultDays = {
    daily: 30,
    weekly: 12 * 7, // 12 weeks
    monthly: 12 * 30, // 12 months
  };

  const lookbackDays = days || defaultDays[period];
  const startDate = subDays(endDate, lookbackDays);

  // Fetch raw data from database
  const rawData = await prisma.active_user_stats.findMany({
    where: {
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: {
      date: 'asc',
    },
    select: {
      date: true,
      uniqueUsers: true,
      totalPageViews: true,
    },
  });

  // Aggregate data by period
  const dataPoints = aggregateByPeriod(rawData, period);

  // Calculate summary statistics
  const summary = calculateSummaryStats(dataPoints, period);

  return {
    period,
    startDate: format(startDate, 'yyyy-MM-dd'),
    endDate: format(endDate, 'yyyy-MM-dd'),
    dataPoints,
    summary,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Aggregate raw data points by time period
 *
 * @param rawData - Raw daily data from database
 * @param period - Aggregation period
 * @returns Aggregated data points
 */
function aggregateByPeriod(
  rawData: Array<{ date: Date; uniqueUsers: number; totalPageViews: number }>,
  period: TimePeriod
): DataPoint[] {
  if (period === 'daily') {
    // Daily: Return as-is with calculated avg
    return rawData.map((d) => ({
      date: format(d.date, 'yyyy-MM-dd'),
      uniqueUsers: d.uniqueUsers,
      totalPageViews: d.totalPageViews,
      avgPageViewsPerUser: d.uniqueUsers > 0 ? d.totalPageViews / d.uniqueUsers : 0,
    }));
  }

  // Group data by week or month
  const groups = new Map<string, Array<{ uniqueUsers: number; totalPageViews: number }>>();

  rawData.forEach((d) => {
    const key =
      period === 'weekly'
        ? format(startOfWeek(d.date, { weekStartsOn: 1 }), 'yyyy-MM-dd') // Monday start
        : format(startOfMonth(d.date), 'yyyy-MM-dd');

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key)!.push({
      uniqueUsers: d.uniqueUsers,
      totalPageViews: d.totalPageViews,
    });
  });

  // Aggregate each group
  const aggregated: DataPoint[] = [];

  groups.forEach((values, key) => {
    // Sum unique users and page views across the period
    const totalUsers = values.reduce((sum, v) => sum + v.uniqueUsers, 0);
    const totalViews = values.reduce((sum, v) => sum + v.totalPageViews, 0);

    aggregated.push({
      date: key,
      uniqueUsers: totalUsers,
      totalPageViews: totalViews,
      avgPageViewsPerUser: totalUsers > 0 ? totalViews / totalUsers : 0,
    });
  });

  return aggregated.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Calculate summary statistics from data points
 *
 * @param dataPoints - Aggregated data points
 * @param period - Time period (for growth calculation)
 * @returns Summary statistics
 */
function calculateSummaryStats(dataPoints: DataPoint[], period: TimePeriod): SummaryStats {
  if (dataPoints.length === 0) {
    return {
      totalUsers: 0,
      totalPageViews: 0,
      avgDailyUsers: 0,
      avgPageViewsPerUser: 0,
      peakUsers: 0,
      peakDate: '',
      growthRate: 0,
      trend: 'stable',
    };
  }

  // Total metrics
  const totalUsers = dataPoints.reduce((sum, d) => sum + d.uniqueUsers, 0);
  const totalPageViews = dataPoints.reduce((sum, d) => sum + d.totalPageViews, 0);

  // Average daily users (normalize to daily even for weekly/monthly)
  const avgDailyUsers = totalUsers / dataPoints.length;

  // Average page views per user
  const avgPageViewsPerUser = totalUsers > 0 ? totalPageViews / totalUsers : 0;

  // Peak metrics
  const peakPoint = dataPoints.reduce((max, d) =>
    d.uniqueUsers > max.uniqueUsers ? d : max
  );

  // Growth rate (compare first half vs second half)
  const midpoint = Math.floor(dataPoints.length / 2);
  const firstHalf = dataPoints.slice(0, midpoint);
  const secondHalf = dataPoints.slice(midpoint);

  const firstHalfAvg =
    firstHalf.reduce((sum, d) => sum + d.uniqueUsers, 0) / firstHalf.length;
  const secondHalfAvg =
    secondHalf.reduce((sum, d) => sum + d.uniqueUsers, 0) / secondHalf.length;

  const growthRate =
    firstHalfAvg > 0 ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 : 0;

  // Trend direction
  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (growthRate > 5) trend = 'up';
  else if (growthRate < -5) trend = 'down';

  return {
    totalUsers,
    totalPageViews,
    avgDailyUsers: parseFloat(avgDailyUsers.toFixed(1)),
    avgPageViewsPerUser: parseFloat(avgPageViewsPerUser.toFixed(1)),
    peakUsers: peakPoint.uniqueUsers,
    peakDate: peakPoint.date,
    growthRate: parseFloat(growthRate.toFixed(1)),
    trend,
  };
}

/**
 * Get comparison between two time periods
 *
 * @param currentPeriod - Current period data
 * @param previousPeriod - Previous period data (for comparison)
 * @returns Comparison metrics
 *
 * @example
 * const current = await getUserAnalytics('weekly', 7);
 * const previous = await getUserAnalytics('weekly', 7, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
 * const comparison = comparePeriods(current.summary, previous.summary);
 */
export interface PeriodComparison {
  userGrowth: number; // % change in users
  pageViewGrowth: number; // % change in page views
  engagementChange: number; // % change in avg page views per user
  direction: 'up' | 'down' | 'stable';
}

export function comparePeriods(
  current: SummaryStats,
  previous: SummaryStats
): PeriodComparison {
  const userGrowth =
    previous.totalUsers > 0
      ? ((current.totalUsers - previous.totalUsers) / previous.totalUsers) * 100
      : 0;

  const pageViewGrowth =
    previous.totalPageViews > 0
      ? ((current.totalPageViews - previous.totalPageViews) / previous.totalPageViews) * 100
      : 0;

  const engagementChange =
    previous.avgPageViewsPerUser > 0
      ? ((current.avgPageViewsPerUser - previous.avgPageViewsPerUser) /
          previous.avgPageViewsPerUser) *
        100
      : 0;

  let direction: 'up' | 'down' | 'stable' = 'stable';
  if (userGrowth > 5) direction = 'up';
  else if (userGrowth < -5) direction = 'down';

  return {
    userGrowth: parseFloat(userGrowth.toFixed(1)),
    pageViewGrowth: parseFloat(pageViewGrowth.toFixed(1)),
    engagementChange: parseFloat(engagementChange.toFixed(1)),
    direction,
  };
}

/**
 * Get real-time statistics (today's data from Redis)
 *
 * @returns Today's active user count and page views
 *
 * Note: This queries Redis directly for real-time data before cron aggregation
 */
export async function getTodayStats(): Promise<{
  uniqueUsers: number;
  totalPageViews: number;
  date: string;
}> {
  try {
    // Import Redis client from tracking service
    const { createClient } = await import('redis');
    const redis = createClient({
      url: process.env.REDIS_CACHE_URL || 'redis://localhost:6379',
    });

    await redis.connect();

    const today = new Date().toISOString().split('T')[0];
    const activeUsersKey = `active_users:${today}`;
    const pageViewsKey = `page_views:${today}`;

    const uniqueUsers = await redis.sCard(activeUsersKey);
    const pageViewsStr = await redis.get(pageViewsKey);
    const totalPageViews = pageViewsStr ? parseInt(pageViewsStr, 10) : 0;

    await redis.quit();

    return {
      uniqueUsers,
      totalPageViews,
      date: today,
    };
  } catch (error) {
    console.error('[ANALYTICS] Failed to get today stats:', error instanceof Error ? error.message : error);
    return {
      uniqueUsers: 0,
      totalPageViews: 0,
      date: new Date().toISOString().split('T')[0],
    };
  }
}

/**
 * Export data to CSV format for Excel
 *
 * @param analytics - Analytics data to export
 * @returns CSV string with UTF-8 BOM
 */
export function exportToCSV(analytics: UserAnalytics): string {
  const BOM = '\uFEFF'; // UTF-8 BOM for Excel

  const header = '날짜,고유 사용자 수,총 페이지 뷰,평균 페이지뷰/사용자\n';

  const rows = analytics.dataPoints
    .map((d) =>
      [
        d.date,
        d.uniqueUsers,
        d.totalPageViews,
        d.avgPageViewsPerUser.toFixed(2),
      ].join(',')
    )
    .join('\n');

  const summary = `\n\n===== 요약 통계 =====\n` +
    `기간,${analytics.period}\n` +
    `시작일,${analytics.startDate}\n` +
    `종료일,${analytics.endDate}\n` +
    `총 활성 세션 수,${analytics.summary.totalUsers}\n` +
    `총 페이지 뷰,${analytics.summary.totalPageViews}\n` +
    `평균 일일 활성 사용자 (DAU),${analytics.summary.avgDailyUsers}\n` +
    `평균 페이지뷰/사용자,${analytics.summary.avgPageViewsPerUser}\n` +
    `일일 최고 활성 사용자,${analytics.summary.peakUsers}\n` +
    `최고 기록일,${analytics.summary.peakDate}\n` +
    `성장률,${analytics.summary.growthRate}%\n` +
    `추세,${analytics.summary.trend === 'up' ? '상승' : analytics.summary.trend === 'down' ? '하락' : '안정'}\n`;

  return BOM + header + rows + summary;
}

/**
 * DAU/MAU Ratio Interface
 */
export interface DAUMAURatio {
  dau: number;        // Today's active users
  mau: number;        // Monthly active users (30-day rolling)
  ratio: number;      // DAU/MAU ratio as percentage
  benchmark: string;  // Industry benchmark comparison
}

/**
 * Calculate DAU/MAU (Stickiness) Ratio
 *
 * Industry standard engagement metric:
 * - 10-20%: Average SaaS product
 * - 20-25%: Good engagement
 * - 25%+: Excellent engagement (daily habit-forming products)
 *
 * @returns DAU, MAU, ratio, and benchmark comparison
 *
 * @example
 * const ratio = await getDAUMAURatio();
 * console.log(`Stickiness: ${ratio.ratio}% (${ratio.benchmark})`);
 */
export async function getDAUMAURatio(): Promise<DAUMAURatio> {
  try {
    const today = new Date();
    const thirtyDaysAgo = subDays(today, 30);

    // Get today's DAU from Redis
    const todayStats = await getTodayStats();
    const dau = todayStats.uniqueUsers;

    // Get MAU (sum of unique users over 30 days)
    // Note: This is an approximation using daily aggregates
    const monthlyData = await prisma.active_user_stats.findMany({
      where: {
        date: {
          gte: thirtyDaysAgo,
          lte: today,
        },
      },
      select: {
        uniqueUsers: true,
      },
    });

    // Sum unique users (upper bound, as some users may repeat across days)
    const mau = monthlyData.reduce((sum, day) => sum + day.uniqueUsers, 0);

    // Calculate ratio (avoid division by zero)
    const ratio = mau > 0 ? (dau / mau) * 100 : 0;

    // Determine benchmark category
    let benchmark: string;
    if (ratio >= 25) {
      benchmark = '우수 (일상적 사용)';
    } else if (ratio >= 20) {
      benchmark = '양호 (좋은 참여도)';
    } else if (ratio >= 10) {
      benchmark = '평균 (일반적인 SaaS)';
    } else {
      benchmark = '개선 필요';
    }

    return {
      dau,
      mau,
      ratio: parseFloat(ratio.toFixed(1)),
      benchmark,
    };
  } catch (error) {
    console.error('[ANALYTICS] Failed to calculate DAU/MAU:', error instanceof Error ? error.message : error);
    return {
      dau: 0,
      mau: 0,
      ratio: 0,
      benchmark: '데이터 없음',
    };
  }
}
