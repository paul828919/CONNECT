/**
 * Scraping Logs API
 *
 * Admin endpoint to fetch scraping logs for monitoring.
 *
 * Architecture Update (Nov 2025):
 * - Now reads from scraping_jobs table (Discovery Scraper architecture)
 * - Maps job-level data to legacy ScrapingLog interface for dashboard compatibility
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

    // 3. Fetch recent scraping jobs (last 50) from new Discovery Scraper architecture
    const jobs = await db.scraping_jobs.findMany({
      orderBy: {
        scrapedAt: 'desc',
      },
      take: 50,
      select: {
        id: true,
        announcementTitle: true,
        scrapingStatus: true,
        scrapingError: true,
        scrapedAt: true,
        processingStatus: true,
        processedAt: true,
      },
    });

    // 4. Transform scraping_jobs to legacy ScrapingLog interface for dashboard compatibility
    // ScrapingStatus enum: SCRAPED | SCRAPING_FAILED
    // ProcessingStatus enum: PENDING | PROCESSING | COMPLETED | FAILED | SKIPPED
    const logs = jobs.map(job => ({
      id: job.id,
      agencyId: 'ntis', // Discovery Scraper only scrapes NTIS
      success: job.scrapingStatus === 'SCRAPED',
      programsFound: 1, // Each job = one announcement
      programsNew: job.processingStatus === 'PENDING' ? 1 : 0,
      programsUpdated: job.processingStatus === 'COMPLETED' ? 1 : 0,
      errorMessage: job.scrapingError,
      startedAt: job.scrapedAt,
      completedAt: job.processedAt || job.scrapedAt,
      duration: job.processedAt
        ? new Date(job.processedAt).getTime() - new Date(job.scrapedAt).getTime()
        : 0,
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
