/**
 * Scraping Logs API
 *
 * Admin endpoint to fetch scraping logs for monitoring.
 *
 * Architecture (Nov 30, 2025 - Corrected):
 * - Reads from scraping_logs table (session-level data)
 * - scraping_logs = Session-level logs (when scraping ran, overall results)
 * - scraping_jobs = Announcement-level jobs (individual items) - NOT for dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // 1. Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Check if user is admin
    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // 3. Fetch recent scraping logs (last 50) - session-level data
    const scrapingLogs = await db.scraping_logs.findMany({
      orderBy: {
        startedAt: 'desc',
      },
      take: 50,
    });

    // 4. Map to ScrapingLog interface for dashboard
    const logs = scrapingLogs.map(log => ({
      id: log.id,
      agencyId: log.agencyId.toLowerCase(),
      success: log.success,
      programsFound: log.programsFound,
      programsNew: log.programsNew,
      programsUpdated: log.programsUpdated,
      errorMessage: log.error,
      startedAt: log.startedAt,
      completedAt: log.completedAt || log.startedAt,
      duration: log.duration || 0,
    }));

    return NextResponse.json(logs, { status: 200 });
  } catch (error: any) {
    console.error('Scraping logs error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scraping logs' },
      { status: 500 }
    );
  }
}
