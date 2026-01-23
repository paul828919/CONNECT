/**
 * Admin Program Enrichment API
 *
 * GET: Fetch programs needing enrichment (LOW/MEDIUM confidence)
 * POST: Save enriched program data
 *
 * Access Control: ADMIN or SUPER_ADMIN only
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const confidenceFilter = searchParams.get('confidence');
    const agencyFilter = searchParams.get('agency');
    const sortBy = searchParams.get('sortBy') || 'deadline';

    // Build where clause - only LOW and MEDIUM confidence need enrichment
    const where: any = {
      status: 'ACTIVE',
      eligibilityConfidence: {
        in: ['LOW', 'MEDIUM'],
      },
    };

    if (confidenceFilter && confidenceFilter !== 'ALL') {
      where.eligibilityConfidence = confidenceFilter;
    }

    if (agencyFilter && agencyFilter !== 'ALL') {
      where.agencyId = agencyFilter;
    }

    // Build orderBy clause
    let orderBy: any = [];
    switch (sortBy) {
      case 'deadline':
        // Programs with deadline first, sorted ascending (soonest first)
        // Then programs without deadline
        orderBy = [
          { deadline: { sort: 'asc', nulls: 'last' } },
          { eligibilityConfidence: 'asc' }, // LOW before MEDIUM
        ];
        break;
      case 'scraped':
        orderBy = [{ scrapedAt: 'desc' }];
        break;
      case 'confidence':
        orderBy = [
          { eligibilityConfidence: 'asc' }, // LOW first
          { deadline: { sort: 'asc', nulls: 'last' } },
        ];
        break;
      default:
        orderBy = [{ deadline: { sort: 'asc', nulls: 'last' } }];
    }

    // Fetch programs
    const programs = await db.funding_programs.findMany({
      where,
      select: {
        id: true,
        title: true,
        agencyId: true,
        announcementUrl: true,
        attachmentUrls: true,
        eligibilityConfidence: true,
        deadline: true,
        applicationStart: true,
        budgetAmount: true,
        scrapedAt: true,
      },
      orderBy,
      take: 100, // Limit for performance
    });

    // Calculate days until deadline and transform data
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const transformedPrograms = programs.map((program) => {
      let daysUntilDeadline: number | null = null;
      if (program.deadline) {
        const diffTime = program.deadline.getTime() - now.getTime();
        daysUntilDeadline = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      return {
        ...program,
        deadline: program.deadline?.toISOString() || null,
        applicationStart: program.applicationStart?.toISOString() || null,
        budgetAmount: program.budgetAmount ? Number(program.budgetAmount) : null,
        scrapedAt: program.scrapedAt.toISOString(),
        daysUntilDeadline,
      };
    });

    // Calculate stats
    const stats = {
      total: programs.length,
      low: programs.filter((p) => p.eligibilityConfidence === 'LOW').length,
      medium: programs.filter((p) => p.eligibilityConfidence === 'MEDIUM').length,
      urgent: programs.filter(
        (p) => p.deadline && p.deadline <= sevenDaysFromNow && p.deadline >= now
      ).length,
    };

    return NextResponse.json({
      programs: transformedPrograms,
      stats,
    });
  } catch (error: any) {
    console.error('Error fetching enrichment queue:', error);
    return NextResponse.json(
      { error: 'Failed to fetch programs', details: error.message },
      { status: 500 }
    );
  }
}
