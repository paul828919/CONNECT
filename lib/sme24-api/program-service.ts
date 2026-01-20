/**
 * SME24 Program Sync Service
 *
 * Service layer for synchronizing SME support programs from 중소벤처24 API
 * to the local database. Handles:
 * - Full sync (initial load or refresh)
 * - Incremental sync (daily updates)
 * - Deduplication via contentHash
 * - Status management (ACTIVE → EXPIRED)
 */

import { db } from '@/lib/db';
import { SMEProgramStatus } from '@prisma/client';
import { sme24Client } from './client';
import { SME24SearchParams, SME24AnnouncementItem } from './types';
import { mapSME24ToSMEProgram, mapSME24ToSMEProgramUpdate } from './mappers/program-mapper';

export interface SyncResult {
  success: boolean;
  programsFound: number;
  programsCreated: number;
  programsUpdated: number;
  programsExpired: number;
  errors: string[];
  duration: number;
}

/**
 * Sync SME programs from API to database
 *
 * @param params Search parameters for API
 * @param fullSync If true, fetch all pages; if false, only recent updates
 * @returns Sync statistics
 */
export async function syncSMEPrograms(
  params: SME24SearchParams = {},
  fullSync: boolean = false
): Promise<SyncResult> {
  const startTime = Date.now();
  const errors: string[] = [];

  let programsFound = 0;
  let programsCreated = 0;
  let programsUpdated = 0;
  let programsExpired = 0;

  try {
    console.log('[SME24 Sync] Starting sync...');
    console.log('[SME24 Sync] Params:', JSON.stringify(params));
    console.log('[SME24 Sync] Full sync:', fullSync);

    // Fetch programs from API
    const apiResponse = fullSync
      ? await sme24Client.fetchAllAnnouncements(params, 20)
      : await sme24Client.fetchAnnouncements(params);

    if (!apiResponse.success || !apiResponse.data) {
      return {
        success: false,
        programsFound: 0,
        programsCreated: 0,
        programsUpdated: 0,
        programsExpired: 0,
        errors: [apiResponse.error || 'API fetch failed'],
        duration: Date.now() - startTime,
      };
    }

    programsFound = apiResponse.data.length;
    console.log(`[SME24 Sync] Fetched ${programsFound} programs from API`);

    // Process each program
    for (const item of apiResponse.data) {
      try {
        const result = await upsertProgram(item);
        if (result === 'created') programsCreated++;
        if (result === 'updated') programsUpdated++;
      } catch (error: any) {
        console.error(`[SME24 Sync] Error processing program ${item.pblancSeq}:`, error.message);
        errors.push(`Program ${item.pblancSeq}: ${error.message}`);
      }
    }

    // Mark expired programs
    programsExpired = await markExpiredPrograms();

    console.log('[SME24 Sync] Sync completed');
    console.log(`[SME24 Sync] Created: ${programsCreated}, Updated: ${programsUpdated}, Expired: ${programsExpired}`);

    return {
      success: true,
      programsFound,
      programsCreated,
      programsUpdated,
      programsExpired,
      errors,
      duration: Date.now() - startTime,
    };
  } catch (error: any) {
    console.error('[SME24 Sync] Sync failed:', error.message);
    return {
      success: false,
      programsFound,
      programsCreated,
      programsUpdated,
      programsExpired,
      errors: [...errors, error.message],
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Upsert a single program to the database
 */
async function upsertProgram(
  item: SME24AnnouncementItem
): Promise<'created' | 'updated' | 'unchanged'> {
  // Check if program exists by pblancSeq
  const existing = await db.sme_programs.findUnique({
    where: { pblancSeq: item.pblancSeq },
    select: { id: true, syncedAt: true },
  });

  if (existing) {
    // Update existing program
    const updateData = mapSME24ToSMEProgramUpdate(item);
    await db.sme_programs.update({
      where: { pblancSeq: item.pblancSeq },
      data: updateData,
    });
    return 'updated';
  } else {
    // Create new program
    const createData = mapSME24ToSMEProgram(item);
    await db.sme_programs.create({
      data: createData,
    });
    return 'created';
  }
}

/**
 * Mark programs as expired based on application end date
 */
async function markExpiredPrograms(): Promise<number> {
  const now = new Date();

  const result = await db.sme_programs.updateMany({
    where: {
      status: SMEProgramStatus.ACTIVE,
      applicationEnd: {
        lt: now,
      },
    },
    data: {
      status: SMEProgramStatus.EXPIRED,
    },
  });

  return result.count;
}

/**
 * Get sync statistics
 */
export async function getSyncStats(): Promise<{
  totalPrograms: number;
  activePrograms: number;
  expiredPrograms: number;
  lastSyncAt: Date | null;
}> {
  const [total, active, expired, lastSync] = await Promise.all([
    db.sme_programs.count(),
    db.sme_programs.count({ where: { status: 'ACTIVE' } }),
    db.sme_programs.count({ where: { status: 'EXPIRED' } }),
    db.sme_programs.findFirst({
      orderBy: { syncedAt: 'desc' },
      select: { syncedAt: true },
    }),
  ]);

  return {
    totalPrograms: total,
    activePrograms: active,
    expiredPrograms: expired,
    lastSyncAt: lastSync?.syncedAt || null,
  };
}

/**
 * Daily sync helper - called by scheduler
 * Syncs programs from the last 7 days
 */
export async function dailySync(): Promise<SyncResult> {
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Format dates as YYYYMMDD for API
  const formatDate = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  };

  return syncSMEPrograms({
    strDt: formatDate(sevenDaysAgo),
    endDt: formatDate(today),
  });
}

/**
 * Get active programs for matching
 */
export async function getActivePrograms(
  limit?: number,
  offset?: number
): Promise<{
  programs: any[];
  total: number;
}> {
  const [programs, total] = await Promise.all([
    db.sme_programs.findMany({
      where: {
        status: 'ACTIVE',
        applicationEnd: {
          gte: new Date(),
        },
      },
      orderBy: { applicationEnd: 'asc' },
      take: limit,
      skip: offset,
    }),
    db.sme_programs.count({
      where: {
        status: 'ACTIVE',
        applicationEnd: {
          gte: new Date(),
        },
      },
    }),
  ]);

  return { programs, total };
}

/**
 * Get program by ID
 */
export async function getProgramById(id: string) {
  return db.sme_programs.findUnique({
    where: { id },
  });
}

/**
 * Get program by pblancSeq (API ID)
 */
export async function getProgramByPblancSeq(pblancSeq: number) {
  return db.sme_programs.findUnique({
    where: { pblancSeq },
  });
}
