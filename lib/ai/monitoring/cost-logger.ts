/**
 * AI Cost Logger
 * Connect Platform - Week 3-4 AI Integration
 *
 * Logs all AI requests to database for cost tracking and analytics
 */

import { PrismaClient, AIServiceType } from '@prisma/client';
import { nanoid } from 'nanoid';
import { db } from '@/lib/db';


export interface CostLogEntry {
  serviceType: AIServiceType;
  userId?: string;
  organizationId?: string;
  endpoint: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costKRW: number;
  duration: number; // milliseconds
  success: boolean;
  errorMessage?: string;
  cacheHit?: boolean;
}

/**
 * Log AI cost to database
 */
export async function logAICost(entry: CostLogEntry): Promise<void> {
  try {
    await db.ai_cost_logs.create({
      data: {
        id: nanoid(),
        serviceType: entry.serviceType,
        userId: entry.userId,
        organizationId: entry.organizationId,
        endpoint: entry.endpoint,
        model: entry.model,
        inputTokens: entry.inputTokens,
        outputTokens: entry.outputTokens,
        totalTokens: entry.inputTokens + entry.outputTokens,
        costKRW: entry.costKRW,
        duration: entry.duration,
        success: entry.success,
        errorMessage: entry.errorMessage,
        cacheHit: entry.cacheHit || false,
      },
    });

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 AI Cost Logged:', {
        service: entry.serviceType,
        cost: `₩${entry.costKRW.toFixed(2)}`,
        tokens: entry.inputTokens + entry.outputTokens,
        duration: `${entry.duration}ms`,
        cacheHit: entry.cacheHit,
      });
    }
  } catch (error) {
    // Don't throw - cost logging failures shouldn't break the app
    console.error('❌ Failed to log AI cost:', error);
  }
}

/**
 * Get cost statistics for a date range
 */
export async function getCostStats(startDate: Date, endDate: Date): Promise<{
  totalCost: number;
  totalRequests: number;
  successRate: number;
  cacheHitRate: number;
  averageCost: number;
  averageDuration: number;
  byService: Record<AIServiceType, {
    count: number;
    cost: number;
    averageDuration: number;
  }>;
}> {
  const logs = await db.ai_cost_logs.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  if (logs.length === 0) {
    return {
      totalCost: 0,
      totalRequests: 0,
      successRate: 100,
      cacheHitRate: 0,
      averageCost: 0,
      averageDuration: 0,
      byService: {} as Record<AIServiceType, { count: number; cost: number; averageDuration: number }>,
    };
  }

  const totalCost = logs.reduce((sum, log) => sum + log.costKRW, 0);
  const successCount = logs.filter((log) => log.success).length;
  const cacheHitCount = logs.filter((log) => log.cacheHit).length;
  const totalDuration = logs.reduce((sum, log) => sum + log.duration, 0);

  // Group by service type
  const byService: Record<string, { count: number; cost: number; totalDuration: number; averageDuration?: number }> = {};
  for (const log of logs) {
    if (!byService[log.serviceType]) {
      byService[log.serviceType] = {
        count: 0,
        cost: 0,
        totalDuration: 0,
      };
    }
    byService[log.serviceType].count++;
    byService[log.serviceType].cost += log.costKRW;
    byService[log.serviceType].totalDuration += log.duration;
  }

  // Calculate averages per service and convert to final type
  const finalByService: Record<string, { count: number; cost: number; averageDuration: number }> = {};
  for (const service in byService) {
    finalByService[service] = {
      count: byService[service].count,
      cost: byService[service].cost,
      averageDuration: byService[service].totalDuration / byService[service].count,
    };
  }

  return {
    totalCost,
    totalRequests: logs.length,
    successRate: (successCount / logs.length) * 100,
    cacheHitRate: (cacheHitCount / logs.length) * 100,
    averageCost: totalCost / logs.length,
    averageDuration: totalDuration / logs.length,
    byService: finalByService as Record<AIServiceType, { count: number; cost: number; averageDuration: number }>,
  };
}

/**
 * Get daily cost breakdown for last N days
 */
export async function getDailyCostBreakdown(days: number): Promise<Array<{
  date: string;
  totalCost: number;
  totalRequests: number;
  matchExplanationCost: number;
  qaChatCost: number;
}>> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const logs = await db.ai_cost_logs.findMany({
    where: {
      createdAt: {
        gte: startDate,
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  // Group by date
  const byDate: Record<string, { totalCost: number; totalRequests: number; matchExplanationCost: number; qaChatCost: number }> = {};
  for (const log of logs) {
    const date = log.createdAt.toISOString().split('T')[0];
    if (!byDate[date]) {
      byDate[date] = {
        totalCost: 0,
        totalRequests: 0,
        matchExplanationCost: 0,
        qaChatCost: 0,
      };
    }
    byDate[date].totalCost += log.costKRW;
    byDate[date].totalRequests++;
    if (log.serviceType === 'MATCH_EXPLANATION') {
      byDate[date].matchExplanationCost += log.costKRW;
    } else if (log.serviceType === 'QA_CHAT') {
      byDate[date].qaChatCost += log.costKRW;
    }
  }

  // Convert to array and sort
  return Object.entries(byDate)
    .map(([date, data]) => ({
      date,
      ...data,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get top users by AI cost
 */
export async function getTopUsersByCost(
  startDate: Date,
  endDate: Date,
  limit: number = 10
): Promise<Array<{
  userId: string;
  totalCost: number;
  totalRequests: number;
  userName?: string;
  userEmail?: string;
}>> {
  const logs = await db.ai_cost_logs.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      userId: {
        not: null,
      },
    },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  // Group by user
  interface UserCost {
    userId: string;
    totalCost: number;
    totalRequests: number;
    userName?: string;
    userEmail?: string;
  }

  const byUser: Record<string, UserCost> = {};
  for (const log of logs) {
    if (!log.userId) continue;
    if (!byUser[log.userId]) {
      byUser[log.userId] = {
        userId: log.userId,
        totalCost: 0,
        totalRequests: 0,
        userName: log.user?.name ?? undefined,
        userEmail: log.user?.email ?? undefined,
      };
    }
    byUser[log.userId].totalCost += log.costKRW;
    byUser[log.userId].totalRequests++;
  }

  // Convert to array, sort, and limit
  return Object.values(byUser)
    .sort((a, b) => b.totalCost - a.totalCost)
    .slice(0, limit);
}

/**
 * Clean up old logs (keep last 90 days)
 */
export async function cleanupOldLogs(): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 90);

  const result = await db.ai_cost_logs.deleteMany({
    where: {
      createdAt: {
        lt: cutoffDate,
      },
    },
  });

  console.log(`🧹 Cleaned up ${result.count} old AI cost logs`);
  return result.count;
}

const costLogger = {
  logAICost,
  getCostStats,
  getDailyCostBreakdown,
  getTopUsersByCost,
  cleanupOldLogs,
};

export default costLogger;
