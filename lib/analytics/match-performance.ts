/**
 * Match Performance Tracking Service
 *
 * Core analytics service for tracking match quality and category performance.
 *
 * Features:
 * - Match quality logging (individual match tracking)
 * - Category performance metrics (daily aggregation)
 * - Performance reporting (trend analysis)
 * - Low-quality category detection
 *
 * Database Tables:
 * - match_quality_logs: Individual match records
 * - category_performance_metrics: Aggregated daily metrics
 */

import { db } from '@/lib/db';

// ============================================================================
// Type Definitions
// ============================================================================

export interface MatchQualityInput {
  matchId: string;
  organizationId: string;
  programId: string;
  category: string;
  score: number;
  breakdown: {
    industryScore: number;
    trlScore: number;
    typeScore: number;
    rdScore: number;
    deadlineScore: number;
  };
  saved?: boolean;
  viewed?: boolean;
}

export interface CategoryMetrics {
  category: string;
  date: Date;
  matchCount: number;
  avgMatchScore: number;
  savedRate: number;
  viewedRate: number;
  trlMatchRate: number;
}

export interface PerformanceReport {
  category: string;
  period: 'daily' | 'weekly' | 'monthly';
  startDate: Date;
  endDate: Date;
  totalMatches: number;
  avgScore: number;
  savedRate: number;
  viewedRate: number;
  trlMatchRate: number;
  trend: 'improving' | 'stable' | 'declining';
  alerts: string[];
}

export interface LowQualityAlert {
  category: string;
  avgScore: number;
  matchCount: number;
  savedRate: number;
  viewedRate: number;
  threshold: number;
  recommendation: string;
}

// ============================================================================
// Match Quality Logging
// ============================================================================

/**
 * Log match quality details for analytics
 *
 * Called after match generation to track:
 * - Individual component scores
 * - Category distribution
 * - User engagement (saved/viewed)
 */
export async function logMatchQuality(input: MatchQualityInput): Promise<void> {
  try {
    await db.match_quality_logs.create({
      data: {
        matchId: input.matchId,
        organizationId: input.organizationId,
        programId: input.programId,
        category: input.category,
        score: input.score,
        industryScore: input.breakdown.industryScore,
        trlScore: input.breakdown.trlScore,
        typeScore: input.breakdown.typeScore,
        rdScore: input.breakdown.rdScore,
        deadlineScore: input.breakdown.deadlineScore,
        saved: input.saved ?? false,
        viewed: input.viewed ?? false,
      },
    });

    console.log('[ANALYTICS] Match quality logged:', {
      matchId: input.matchId,
      category: input.category,
      score: input.score,
    });
  } catch (error) {
    // Don't throw - analytics logging should never break match generation
    console.error('[ANALYTICS] Failed to log match quality:', error);
  }
}

/**
 * Bulk log match quality for multiple matches
 */
export async function logMatchQualityBulk(inputs: MatchQualityInput[]): Promise<void> {
  try {
    await db.match_quality_logs.createMany({
      data: inputs.map(input => ({
        matchId: input.matchId,
        organizationId: input.organizationId,
        programId: input.programId,
        category: input.category,
        score: input.score,
        industryScore: input.breakdown.industryScore,
        trlScore: input.breakdown.trlScore,
        typeScore: input.breakdown.typeScore,
        rdScore: input.breakdown.rdScore,
        deadlineScore: input.breakdown.deadlineScore,
        saved: input.saved ?? false,
        viewed: input.viewed ?? false,
      })),
      skipDuplicates: true, // Ignore duplicates if match already logged
    });

    console.log('[ANALYTICS] Bulk match quality logged:', inputs.length, 'matches');
  } catch (error) {
    console.error('[ANALYTICS] Failed to bulk log match quality:', error);
  }
}

/**
 * Update match engagement status (when user views or saves)
 */
export async function updateMatchEngagement(
  matchId: string,
  updates: { saved?: boolean; viewed?: boolean }
): Promise<void> {
  try {
    await db.match_quality_logs.update({
      where: { matchId },
      data: updates,
    });

    console.log('[ANALYTICS] Match engagement updated:', matchId, updates);
  } catch (error) {
    console.error('[ANALYTICS] Failed to update match engagement:', error);
  }
}

// ============================================================================
// Category Metrics Calculation
// ============================================================================

/**
 * Calculate category performance metrics for a specific date
 *
 * Aggregates all matches for a category on a given date:
 * - Match count
 * - Average score
 * - Saved rate (how many matches were saved by users)
 * - Viewed rate (how many matches were viewed)
 * - TRL match rate (how many had TRL score > 15/20)
 */
export async function calculateCategoryMetrics(
  category: string,
  date: Date
): Promise<CategoryMetrics | null> {
  try {
    // Normalize date to start of day (UTC)
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    // Get all match logs for this category on this date
    const logs = await db.match_quality_logs.findMany({
      where: {
        category,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    if (logs.length === 0) {
      return null;
    }

    // Calculate metrics
    const matchCount = logs.length;
    const avgMatchScore = logs.reduce((sum, log) => sum + log.score, 0) / matchCount;
    const savedCount = logs.filter(log => log.saved).length;
    const viewedCount = logs.filter(log => log.viewed).length;
    const trlMatchCount = logs.filter(log => log.trlScore >= 15).length;

    const savedRate = savedCount / matchCount;
    const viewedRate = viewedCount / matchCount;
    const trlMatchRate = trlMatchCount / matchCount;

    return {
      category,
      date: startOfDay,
      matchCount,
      avgMatchScore: Math.round(avgMatchScore * 100) / 100, // Round to 2 decimals
      savedRate: Math.round(savedRate * 10000) / 100, // Convert to percentage (0-100)
      viewedRate: Math.round(viewedRate * 10000) / 100,
      trlMatchRate: Math.round(trlMatchRate * 10000) / 100,
    };
  } catch (error) {
    console.error('[ANALYTICS] Failed to calculate category metrics:', error);
    return null;
  }
}

/**
 * Calculate and store metrics for all categories on a given date
 *
 * This should be run daily (via cron job) to aggregate yesterday's data
 */
export async function calculateAllCategoryMetrics(date: Date): Promise<void> {
  try {
    // Get all distinct categories from match logs for this date
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const categoriesResult = await db.match_quality_logs.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      select: {
        category: true,
      },
      distinct: ['category'],
    });

    const categories = categoriesResult.map(r => r.category);

    console.log('[ANALYTICS] Calculating metrics for', categories.length, 'categories on', date.toISOString());

    // Calculate metrics for each category
    for (const category of categories) {
      const metrics = await calculateCategoryMetrics(category, date);

      if (metrics) {
        // Upsert metrics (create or update existing)
        await db.category_performance_metrics.upsert({
          where: {
            category_date: {
              category: metrics.category,
              date: metrics.date,
            },
          },
          update: {
            matchCount: metrics.matchCount,
            avgMatchScore: metrics.avgMatchScore,
            savedRate: metrics.savedRate,
            viewedRate: metrics.viewedRate,
            trlMatchRate: metrics.trlMatchRate,
          },
          create: {
            category: metrics.category,
            date: metrics.date,
            matchCount: metrics.matchCount,
            avgMatchScore: metrics.avgMatchScore,
            savedRate: metrics.savedRate,
            viewedRate: metrics.viewedRate,
            trlMatchRate: metrics.trlMatchRate,
          },
        });

        console.log('[ANALYTICS] Category metrics saved:', {
          category: metrics.category,
          matchCount: metrics.matchCount,
          avgScore: metrics.avgMatchScore,
        });
      }
    }

    console.log('[ANALYTICS] All category metrics calculated for', date.toISOString());
  } catch (error) {
    console.error('[ANALYTICS] Failed to calculate all category metrics:', error);
    throw error; // Throw for cron job error handling
  }
}

// ============================================================================
// Performance Reporting
// ============================================================================

/**
 * Get category performance report for a time period
 *
 * Provides trend analysis and quality alerts
 */
export async function getCategoryPerformanceReport(
  category: string,
  period: 'daily' | 'weekly' | 'monthly',
  endDate: Date = new Date()
): Promise<PerformanceReport | null> {
  try {
    // Calculate start date based on period
    const startDate = new Date(endDate);
    switch (period) {
      case 'daily':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case 'weekly':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'monthly':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
    }

    // Get metrics for this period
    const metrics = await db.category_performance_metrics.findMany({
      where: {
        category,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    if (metrics.length === 0) {
      return null;
    }

    // Calculate aggregate statistics
    const totalMatches = metrics.reduce((sum, m) => sum + m.matchCount, 0);
    const avgScore = metrics.reduce((sum, m) => sum + m.avgMatchScore * m.matchCount, 0) / totalMatches;
    const savedRate = metrics.reduce((sum, m) => sum + m.savedRate * m.matchCount, 0) / totalMatches;
    const viewedRate = metrics.reduce((sum, m) => sum + m.viewedRate * m.matchCount, 0) / totalMatches;
    const trlMatchRate = metrics.reduce((sum, m) => sum + m.trlMatchRate * m.matchCount, 0) / totalMatches;

    // Determine trend
    const trend = analyzeTrend(metrics);

    // Generate alerts
    const alerts = generateAlerts(category, avgScore, savedRate, viewedRate, trlMatchRate);

    return {
      category,
      period,
      startDate,
      endDate,
      totalMatches,
      avgScore: Math.round(avgScore * 100) / 100,
      savedRate: Math.round(savedRate * 100) / 100,
      viewedRate: Math.round(viewedRate * 100) / 100,
      trlMatchRate: Math.round(trlMatchRate * 100) / 100,
      trend,
      alerts,
    };
  } catch (error) {
    console.error('[ANALYTICS] Failed to get category performance report:', error);
    return null;
  }
}

/**
 * Get performance reports for all categories
 */
export async function getAllCategoryReports(
  period: 'daily' | 'weekly' | 'monthly',
  endDate: Date = new Date()
): Promise<PerformanceReport[]> {
  try {
    // Get all distinct categories
    const categoriesResult = await db.category_performance_metrics.findMany({
      select: {
        category: true,
      },
      distinct: ['category'],
    });

    const categories = categoriesResult.map(r => r.category);

    // Get reports for each category
    const reports: PerformanceReport[] = [];
    for (const category of categories) {
      const report = await getCategoryPerformanceReport(category, period, endDate);
      if (report) {
        reports.push(report);
      }
    }

    // Sort by avgScore (lowest first to highlight problem areas)
    return reports.sort((a, b) => a.avgScore - b.avgScore);
  } catch (error) {
    console.error('[ANALYTICS] Failed to get all category reports:', error);
    return [];
  }
}

// ============================================================================
// Low-Quality Category Detection
// ============================================================================

/**
 * Identify categories with poor match quality
 *
 * Thresholds:
 * - Avg score < 60: Low quality
 * - Saved rate < 10%: Poor user engagement
 * - Viewed rate < 30%: Low user interest
 */
export async function identifyLowQualityCategories(
  period: 'weekly' | 'monthly' = 'weekly',
  scoreThreshold: number = 60,
  savedRateThreshold: number = 10,
  viewedRateThreshold: number = 30
): Promise<LowQualityAlert[]> {
  try {
    const reports = await getAllCategoryReports(period);

    const alerts: LowQualityAlert[] = [];

    for (const report of reports) {
      const issues: string[] = [];

      if (report.avgScore < scoreThreshold) {
        issues.push('평균 매칭 점수가 낮습니다');
      }

      if (report.savedRate < savedRateThreshold) {
        issues.push('저장률이 낮습니다');
      }

      if (report.viewedRate < viewedRateThreshold) {
        issues.push('조회율이 낮습니다');
      }

      if (issues.length > 0) {
        const recommendation = generateRecommendation(report);

        alerts.push({
          category: report.category,
          avgScore: report.avgScore,
          matchCount: report.totalMatches,
          savedRate: report.savedRate,
          viewedRate: report.viewedRate,
          threshold: scoreThreshold,
          recommendation,
        });
      }
    }

    return alerts.sort((a, b) => a.avgScore - b.avgScore);
  } catch (error) {
    console.error('[ANALYTICS] Failed to identify low-quality categories:', error);
    return [];
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Analyze trend based on recent metrics
 */
function analyzeTrend(metrics: CategoryMetrics[]): 'improving' | 'stable' | 'declining' {
  if (metrics.length < 2) {
    return 'stable';
  }

  // Compare first half vs second half average scores
  const midpoint = Math.floor(metrics.length / 2);
  const firstHalf = metrics.slice(0, midpoint);
  const secondHalf = metrics.slice(midpoint);

  const firstAvg = firstHalf.reduce((sum, m) => sum + m.avgMatchScore, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, m) => sum + m.avgMatchScore, 0) / secondHalf.length;

  const difference = secondAvg - firstAvg;

  if (difference > 5) {
    return 'improving';
  } else if (difference < -5) {
    return 'declining';
  } else {
    return 'stable';
  }
}

/**
 * Generate performance alerts
 */
function generateAlerts(
  category: string,
  avgScore: number,
  savedRate: number,
  viewedRate: number,
  trlMatchRate: number
): string[] {
  const alerts: string[] = [];

  if (avgScore < 50) {
    alerts.push('⚠️ 매우 낮은 평균 점수 - 매칭 알고리즘 검토 필요');
  } else if (avgScore < 60) {
    alerts.push('⚡ 낮은 평균 점수 - 개선 권장');
  }

  if (savedRate < 5) {
    alerts.push('⚠️ 매우 낮은 저장률 - 사용자가 결과를 유용하게 여기지 않음');
  } else if (savedRate < 10) {
    alerts.push('⚡ 낮은 저장률 - 매칭 품질 개선 필요');
  }

  if (viewedRate < 20) {
    alerts.push('⚠️ 매우 낮은 조회율 - 사용자 관심도 낮음');
  } else if (viewedRate < 30) {
    alerts.push('⚡ 낮은 조회율 - 매칭 관련성 확인 필요');
  }

  if (trlMatchRate < 30) {
    alerts.push('⚠️ 낮은 TRL 매칭률 - TRL 감지 및 분류 개선 필요');
  }

  return alerts;
}

/**
 * Generate recommendations for low-quality categories
 */
function generateRecommendation(report: PerformanceReport): string {
  const recommendations: string[] = [];

  if (report.avgScore < 60) {
    recommendations.push('매칭 알고리즘 가중치 조정');
    recommendations.push('카테고리 키워드 확장');
  }

  if (report.savedRate < 10) {
    recommendations.push('사용자 피드백 수집');
    recommendations.push('매칭 설명 개선');
  }

  if (report.viewedRate < 30) {
    recommendations.push('카테고리 세분화 검토');
    recommendations.push('프로그램 메타데이터 품질 향상');
  }

  if (report.trlMatchRate < 30) {
    recommendations.push('TRL 추출 로직 강화');
    recommendations.push('프로그램 설명에서 TRL 키워드 보강');
  }

  return recommendations.join(', ');
}
