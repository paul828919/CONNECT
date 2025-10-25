/**
 * Unmapped Agency Detection Monitoring Service
 *
 * Tracks agencies that don't have category mappings during scraping
 * to maintain 0% omission rate over time.
 *
 * Features:
 * - Automatic detection during scraping
 * - Deduplication by ministry-agency pair
 * - Resolution tracking after mapping added
 * - Summary reports for manual review
 *
 * Usage:
 * ```typescript
 * import { logUnmappedAgency, getUnmappedAgencySummary } from '@/lib/scraping/monitoring';
 *
 * // During scraping (called automatically by parser)
 * if (category === null) {
 *   await logUnmappedAgency({
 *     ministry,
 *     agency,
 *     programId,
 *     programTitle
 *   });
 * }
 *
 * // For reporting
 * const summary = await getUnmappedAgencySummary(7); // Last 7 days
 * ```
 */

import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

export interface UnmappedAgencyData {
  ministry: string | null;
  agency: string | null;
  programId: string;
  programTitle: string;
}

export interface UnmappedAgencySummary {
  ministry: string | null;
  agency: string | null;
  programCount: number;
  firstDetected: Date;
  lastDetected: Date;
  samplePrograms: Array<{
    id: string;
    title: string;
  }>;
}

/**
 * Log an unmapped agency detection to the database
 *
 * Uses upsert to avoid duplicate entries for the same ministry-agency pair.
 * If already exists, updates the programId and programTitle with latest detection.
 *
 * @param data - Unmapped agency information
 * @returns Created or updated detection record
 */
export async function logUnmappedAgency(
  data: UnmappedAgencyData
): Promise<void> {
  try {
    // Use upsert to update existing detection or create new one
    await db.unmapped_agency_detections.upsert({
      where: {
        ministry_agency: {
          ministry: data.ministry || '',
          agency: data.agency || '',
        },
      },
      update: {
        programId: data.programId,
        programTitle: data.programTitle,
        detectedAt: new Date(), // Update detection timestamp
      },
      create: {
        ministry: data.ministry,
        agency: data.agency,
        programId: data.programId,
        programTitle: data.programTitle,
      },
    });
  } catch (error) {
    // Log error but don't throw - monitoring should not break scraping
    console.error('[Monitoring] Failed to log unmapped agency:', error);
  }
}

/**
 * Get summary of unmapped agencies detected in the last N days
 *
 * Groups detections by ministry-agency pair and provides:
 * - Count of programs from this agency
 * - First and last detection timestamps
 * - Sample program titles for context
 *
 * @param days - Number of days to look back (default: 7)
 * @param onlyUnresolved - Only show unresolved detections (default: true)
 * @returns Array of agency summaries
 */
export async function getUnmappedAgencySummary(
  days: number = 7,
  onlyUnresolved: boolean = true
): Promise<UnmappedAgencySummary[]> {
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - days);

  // Build where clause
  const whereClause: Prisma.unmapped_agency_detectionsWhereInput = {
    detectedAt: {
      gte: sinceDate,
    },
  };

  if (onlyUnresolved) {
    whereClause.resolved = false;
  }

  // Fetch all detections
  const detections = await db.unmapped_agency_detections.findMany({
    where: whereClause,
    orderBy: {
      detectedAt: 'desc',
    },
  });

  // Group by ministry-agency pair
  const grouped = new Map<string, typeof detections>();
  for (const detection of detections) {
    const key = `${detection.ministry || 'NULL'}|||${detection.agency || 'NULL'}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(detection);
  }

  // Build summary for each group
  const summaries: UnmappedAgencySummary[] = [];
  for (const [key, group] of grouped.entries()) {
    const [ministry, agency] = key.split('|||');

    // Get sample programs (up to 3)
    const samplePrograms = group.slice(0, 3).map((d) => ({
      id: d.programId,
      title: d.programTitle.substring(0, 100) + (d.programTitle.length > 100 ? '...' : ''),
    }));

    summaries.push({
      ministry: ministry === 'NULL' ? null : ministry,
      agency: agency === 'NULL' ? null : agency,
      programCount: group.length,
      firstDetected: group[group.length - 1].detectedAt,
      lastDetected: group[0].detectedAt,
      samplePrograms,
    });
  }

  // Sort by program count (descending)
  summaries.sort((a, b) => b.programCount - a.programCount);

  return summaries;
}

/**
 * Mark an unmapped agency detection as resolved
 *
 * Called after adding the agency mapping to agency-mapper.ts
 * and re-classifying affected programs.
 *
 * @param ministry - Ministry name (null if not applicable)
 * @param agency - Agency name (null if not applicable)
 * @param category - Category assigned after resolution
 * @returns Number of detections marked as resolved
 */
export async function markAsResolved(
  ministry: string | null,
  agency: string | null,
  category: string
): Promise<number> {
  try {
    const result = await db.unmapped_agency_detections.updateMany({
      where: {
        ministry: ministry || '',
        agency: agency || '',
        resolved: false,
      },
      data: {
        resolved: true,
        resolvedAt: new Date(),
        category,
      },
    });

    return result.count;
  } catch (error) {
    console.error('[Monitoring] Failed to mark detection as resolved:', error);
    return 0;
  }
}

/**
 * Get count of unresolved unmapped agency detections
 *
 * Quick check for monitoring dashboard or health checks.
 *
 * @returns Count of unresolved detections
 */
export async function getUnresolvedCount(): Promise<number> {
  return await db.unmapped_agency_detections.count({
    where: {
      resolved: false,
    },
  });
}

/**
 * Clear all resolved detections older than N days
 *
 * Cleanup function to prevent database bloat.
 * Should be run periodically (e.g., monthly).
 *
 * @param days - Age threshold in days (default: 30)
 * @returns Number of detections deleted
 */
export async function cleanupResolvedDetections(days: number = 30): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const result = await db.unmapped_agency_detections.deleteMany({
    where: {
      resolved: true,
      resolvedAt: {
        lt: cutoffDate,
      },
    },
  });

  return result.count;
}
