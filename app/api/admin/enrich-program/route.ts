/**
 * Admin Program Enrichment API
 *
 * GET: Fetch programs needing enrichment (LOW/MEDIUM confidence)
 *
 * Supports two data sources:
 * - NTIS: R&D research programs from funding_programs table
 * - SME24: SME support programs from sme_programs table
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
    const sourceFilter = searchParams.get('source') || 'NTIS'; // Default to NTIS
    const statusFilter = searchParams.get('status'); // OPEN, CLOSED, or null for ALL
    const sortBy = searchParams.get('sortBy') || 'deadline';

    // Calculate date thresholds
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    if (sourceFilter === 'SME24') {
      // Query sme_programs table
      return await handleSME24Query(confidenceFilter, statusFilter, sortBy, now, sevenDaysFromNow);
    } else {
      // Query funding_programs table (NTIS - default)
      return await handleNTISQuery(confidenceFilter, statusFilter, sortBy, now, sevenDaysFromNow);
    }
  } catch (error: any) {
    console.error('Error fetching enrichment queue:', error);
    return NextResponse.json(
      { error: 'Failed to fetch programs', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Handle NTIS (R&D) programs query from funding_programs table
 */
async function handleNTISQuery(
  confidenceFilter: string | null,
  statusFilter: string | null,
  sortBy: string,
  now: Date,
  sevenDaysFromNow: Date
) {
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

  // Add status filter based on deadline
  if (statusFilter === 'OPEN') {
    // Currently open: deadline is in the future or null
    where.OR = [
      { deadline: { gte: now } },
      { deadline: null },
    ];
  } else if (statusFilter === 'CLOSED') {
    // Closed: deadline has passed
    where.deadline = { lt: now };
  }

  // Build orderBy clause
  let orderBy: any = [];
  switch (sortBy) {
    case 'deadline':
      orderBy = [
        { deadline: { sort: 'asc', nulls: 'last' } },
        { eligibilityConfidence: 'asc' },
      ];
      break;
    case 'scraped':
      orderBy = [{ scrapedAt: 'desc' }];
      break;
    case 'confidence':
      orderBy = [
        { eligibilityConfidence: 'asc' },
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
    take: 100,
  });

  // Transform data
  const transformedPrograms = programs.map((program) => {
    let daysUntilDeadline: number | null = null;
    if (program.deadline) {
      const diffTime = program.deadline.getTime() - now.getTime();
      daysUntilDeadline = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    return {
      id: program.id,
      title: program.title,
      agencyId: program.agencyId,
      announcementUrl: program.announcementUrl,
      attachmentUrls: program.attachmentUrls,
      eligibilityConfidence: program.eligibilityConfidence,
      deadline: program.deadline?.toISOString() || null,
      applicationStart: program.applicationStart?.toISOString() || null,
      budgetAmount: program.budgetAmount ? Number(program.budgetAmount) : null,
      scrapedAt: program.scrapedAt.toISOString(),
      daysUntilDeadline,
      source: 'NTIS',
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
    source: 'NTIS',
  });
}

/**
 * Handle SME24 (중소벤처스타트업) programs query from sme_programs table
 */
async function handleSME24Query(
  confidenceFilter: string | null,
  statusFilter: string | null,
  sortBy: string,
  now: Date,
  sevenDaysFromNow: Date
) {
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

  // Add status filter based on applicationEnd
  if (statusFilter === 'OPEN') {
    // Currently open: applicationEnd is in the future or null
    where.OR = [
      { applicationEnd: { gte: now } },
      { applicationEnd: null },
    ];
  } else if (statusFilter === 'CLOSED') {
    // Closed: applicationEnd has passed
    where.applicationEnd = { lt: now };
  }

  // Build orderBy clause
  let orderBy: any = [];
  switch (sortBy) {
    case 'deadline':
      // SME programs use applicationEnd instead of deadline
      orderBy = [
        { applicationEnd: { sort: 'asc', nulls: 'last' } },
        { eligibilityConfidence: 'asc' },
      ];
      break;
    case 'scraped':
      // SME programs use syncedAt instead of scrapedAt
      orderBy = [{ syncedAt: { sort: 'desc', nulls: 'last' } }];
      break;
    case 'confidence':
      orderBy = [
        { eligibilityConfidence: 'asc' },
        { applicationEnd: { sort: 'asc', nulls: 'last' } },
      ];
      break;
    default:
      orderBy = [{ applicationEnd: { sort: 'asc', nulls: 'last' } }];
  }

  // Fetch programs
  const programs = await db.sme_programs.findMany({
    where,
    select: {
      id: true,
      title: true,
      supportInstitution: true,
      detailUrl: true,
      attachmentUrls: true,
      eligibilityConfidence: true,
      applicationEnd: true,
      applicationStart: true,
      maxSupportAmount: true,
      syncedAt: true,
    },
    orderBy,
    take: 100,
  });

  // Transform data to match the expected format
  const transformedPrograms = programs.map((program) => {
    let daysUntilDeadline: number | null = null;
    if (program.applicationEnd) {
      const diffTime = program.applicationEnd.getTime() - now.getTime();
      daysUntilDeadline = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    return {
      id: program.id,
      title: program.title,
      // Map SME fields to unified format
      agencyId: program.supportInstitution || 'SME24',
      announcementUrl: program.detailUrl || '',
      attachmentUrls: program.attachmentUrls || [],
      eligibilityConfidence: program.eligibilityConfidence,
      deadline: program.applicationEnd?.toISOString() || null,
      applicationStart: program.applicationStart?.toISOString() || null,
      budgetAmount: program.maxSupportAmount ? Number(program.maxSupportAmount) : null,
      scrapedAt: program.syncedAt?.toISOString() || new Date().toISOString(),
      daysUntilDeadline,
      source: 'SME24',
    };
  });

  // Calculate stats
  const stats = {
    total: programs.length,
    low: programs.filter((p) => p.eligibilityConfidence === 'LOW').length,
    medium: programs.filter((p) => p.eligibilityConfidence === 'MEDIUM').length,
    urgent: programs.filter(
      (p) => p.applicationEnd && p.applicationEnd <= sevenDaysFromNow && p.applicationEnd >= now
    ).length,
  };

  return NextResponse.json({
    programs: transformedPrograms,
    stats,
    source: 'SME24',
  });
}
