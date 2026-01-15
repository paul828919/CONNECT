/**
 * Audit Logging Utility for PIPA Compliance
 *
 * Creates audit logs for personal data access and deletion activities.
 * Logs are retained for 3 years as required by PIPA Article 31.
 *
 * PIPA Article 31: Personal data processors must keep records of:
 * - Personal information collection/use/provision
 * - Access to personal information
 * - Destruction of personal information
 *
 * Retention: 3 years minimum
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Audit action types for personal data lifecycle
 *
 * Maps to PIPA Article 31 requirements:
 * - DATA_EXPORT: User exercised data portability right (Article 35)
 * - DELETION_CODE_SENT: Initiated deletion process (Article 21)
 * - ACCOUNT_DELETION_INITIATED: User confirmed deletion request
 * - SUBSCRIPTION_CANCELLED: Canceled Toss Payments subscription
 * - ACCOUNT_DELETION_COMPLETED: Hard delete completed
 *
 * Conversion Funnel Events (for analytics):
 * - PROFILE_COMPLETED: User finished organization profile
 * - FIRST_MATCH_GENERATED: User generated their first match
 * - MATCH_SAVED: User saved/favorited a match
 * - UPGRADE_VIEWED: User visited pricing page or saw upgrade modal
 * - UPGRADE_STARTED: User initiated payment flow
 */
export enum AuditAction {
  // PIPA compliance actions
  DATA_EXPORT = 'DATA_EXPORT',
  DELETION_CODE_SENT = 'DELETION_CODE_SENT',
  ACCOUNT_DELETION_INITIATED = 'ACCOUNT_DELETION_INITIATED',
  SUBSCRIPTION_CANCELLED = 'SUBSCRIPTION_CANCELLED',
  ACCOUNT_DELETION_COMPLETED = 'ACCOUNT_DELETION_COMPLETED',
  // Conversion funnel events
  PROFILE_COMPLETED = 'PROFILE_COMPLETED',
  FIRST_MATCH_GENERATED = 'FIRST_MATCH_GENERATED',
  MATCH_SAVED = 'MATCH_SAVED',
  UPGRADE_VIEWED = 'UPGRADE_VIEWED',
  UPGRADE_STARTED = 'UPGRADE_STARTED',
}

/**
 * Audit log parameters
 */
export interface AuditLogParams {
  userId: string;
  action: AuditAction;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
  requestPath?: string;
}

/**
 * Create audit log entry
 *
 * @param params - Audit log parameters
 *
 * @example
 * await createAuditLog({
 *   userId: user.id,
 *   action: AuditAction.DATA_EXPORT,
 *   ipAddress: '192.168.1.1',
 *   details: 'CSV export downloaded',
 * });
 */
export async function createAuditLog(params: AuditLogParams): Promise<void> {
  try {
    await prisma.audit_logs.create({
      data: {
        userId: params.userId,
        action: params.action,
        resourceType: 'USER',
        resourceId: params.userId,
        purpose: params.details || null,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
        requestPath: params.requestPath || null,
      },
    });

    console.log(`[AUDIT] ${params.action} logged for user ${params.userId}`);
  } catch (error) {
    console.error('[AUDIT] Failed to create audit log:', error instanceof Error ? error.message : error);
    // Don't throw - audit logging failures shouldn't block user operations
  }
}

/**
 * Get audit logs for a user (for admin review)
 *
 * @param userId - User ID
 * @param limit - Maximum number of logs to return (default: 100)
 * @returns Array of audit log entries
 *
 * @example
 * const logs = await getUserAuditLogs('user-123', 50);
 */
export async function getUserAuditLogs(
  userId: string,
  limit: number = 100
): Promise<Array<{
  id: string;
  action: string;
  purpose: string | null;
  ipAddress: string | null;
  createdAt: Date;
}>> {
  try {
    const logs = await prisma.audit_logs.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        action: true,
        purpose: true,
        ipAddress: true,
        createdAt: true,
      },
    });

    return logs;
  } catch (error) {
    console.error('[AUDIT] Failed to get audit logs:', error instanceof Error ? error.message : error);
    return [];
  }
}

/**
 * Log conversion funnel event
 *
 * Simplified helper for logging funnel events with appropriate resource types.
 * These events help track user journey: signup → profile → match → save → upgrade
 *
 * @param userId - User ID
 * @param action - Funnel action type
 * @param resourceId - Optional resource ID (e.g., matchId, organizationId)
 * @param details - Optional additional details
 *
 * @example
 * await logFunnelEvent('user-123', AuditAction.PROFILE_COMPLETED, 'org-456');
 * await logFunnelEvent('user-123', AuditAction.MATCH_SAVED, 'match-789');
 */
export async function logFunnelEvent(
  userId: string,
  action: AuditAction,
  resourceId?: string,
  details?: string
): Promise<void> {
  // Map actions to resource types
  const resourceTypeMap: Record<string, string> = {
    [AuditAction.PROFILE_COMPLETED]: 'ORGANIZATION',
    [AuditAction.FIRST_MATCH_GENERATED]: 'MATCH',
    [AuditAction.MATCH_SAVED]: 'MATCH',
    [AuditAction.UPGRADE_VIEWED]: 'SUBSCRIPTION',
    [AuditAction.UPGRADE_STARTED]: 'SUBSCRIPTION',
  };

  try {
    await prisma.audit_logs.create({
      data: {
        userId,
        action,
        resourceType: resourceTypeMap[action] || 'USER',
        resourceId: resourceId || userId,
        purpose: details || null,
      },
    });

    console.log(`[FUNNEL] ${action} logged for user ${userId}`);
  } catch (error) {
    console.error('[FUNNEL] Failed to log event:', error instanceof Error ? error.message : error);
    // Don't throw - funnel logging failures shouldn't block user operations
  }
}

/**
 * Check if user has already triggered a specific funnel event
 *
 * Used to ensure events like FIRST_MATCH_GENERATED are only logged once.
 *
 * @param userId - User ID
 * @param action - Action to check
 * @returns true if action was already logged
 */
export async function hasFunnelEvent(userId: string, action: AuditAction): Promise<boolean> {
  try {
    const existing = await prisma.audit_logs.findFirst({
      where: {
        userId,
        action,
      },
    });
    return !!existing;
  } catch (error) {
    console.error('[FUNNEL] Failed to check event:', error instanceof Error ? error.message : error);
    return false; // Assume not logged on error (better to log duplicate than miss)
  }
}

/**
 * Cleanup old audit logs (older than 3 years)
 *
 * Run this monthly via cron job to comply with data minimization principles
 * while maintaining PIPA Article 31 retention requirements.
 *
 * @returns Number of logs deleted
 *
 * @example
 * // In monthly cron job
 * const deleted = await cleanupOldAuditLogs();
 * console.log(`Cleaned up ${deleted} old audit logs`);
 */
export async function cleanupOldAuditLogs(): Promise<number> {
  try {
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

    const result = await prisma.audit_logs.deleteMany({
      where: {
        createdAt: {
          lt: threeYearsAgo,
        },
      },
    });

    console.log(`[AUDIT] Cleaned up ${result.count} audit logs older than 3 years`);
    return result.count;
  } catch (error) {
    console.error('[AUDIT] Failed to cleanup old logs:', error instanceof Error ? error.message : error);
    return 0;
  }
}
