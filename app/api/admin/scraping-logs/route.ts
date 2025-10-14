/**
 * Scraping Logs API
 *
 * Admin endpoint to fetch scraping logs for monitoring.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import { db } from '@/lib/db';


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

    // 3. Fetch recent scraping logs (last 50)
    const logs = await db.scraping_logs.findMany({
      orderBy: {
        completedAt: 'desc',
      },
      take: 50,
    });

    return NextResponse.json(logs, { status: 200 });
  } catch (error: any) {
    console.error('Scraping logs error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scraping logs' },
      { status: 500 }
    );
  }
}
