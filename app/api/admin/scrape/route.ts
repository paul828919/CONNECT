/**
 * Manual Scraping API
 *
 * Admin endpoint to manually trigger scraping jobs.
 * Useful for testing and on-demand updates.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import { triggerManualScrape, getQueueStats } from '@/lib/scraping/scheduler';

export async function POST(request: NextRequest) {
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

    // 3. Parse request body
    const body = await request.json().catch(() => ({}));
    const { agencyId } = body;

    // 4. Trigger manual scrape
    const result = await triggerManualScrape(agencyId);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    // 5. Get queue stats
    const queueStats = await getQueueStats();

    return NextResponse.json(
      {
        success: true,
        message: result.message,
        queueStats,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Manual scrape error:', error);
    return NextResponse.json(
      { error: 'Failed to trigger manual scrape' },
      { status: 500 }
    );
  }
}

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

    // 3. Get queue statistics
    const queueStats = await getQueueStats();

    return NextResponse.json(
      {
        success: true,
        queueStats,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Queue stats error:', error);
    return NextResponse.json(
      { error: 'Failed to get queue stats' },
      { status: 500 }
    );
  }
}
