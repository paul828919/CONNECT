import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const FUNDING_COMPLETENESS_FIELDS = [
  'description',
  'announcementUrl',
  'targetType',
  'minTrl',
  'maxTrl',
  'eligibilityCriteria',
  'budgetAmount',
  'fundingPeriod',
  'deadline',
  'category',
  'keywords',
  'applicationStart',
  'requiredCertifications',
  'primaryTargetIndustry',
  'programIntent',
  'semanticSubDomain',
  'technologyDomainsSpecific',
  'targetCompanyProfile',
] as const;

const TOTAL_FIELDS = FUNDING_COMPLETENESS_FIELDS.length; // 18

function computeCompleteness(row: any): { percent: number; filled: number; total: number } {
  let filled = 0;
  for (const field of FUNDING_COMPLETENESS_FIELDS) {
    const value = row[field];
    if (value === null || value === undefined) continue;
    if (Array.isArray(value)) {
      if (value.length > 0) filled++;
    } else {
      filled++;
    }
  }
  return { percent: Math.round((filled / TOTAL_FIELDS) * 100), filled, total: TOTAL_FIELDS };
}

/** Convert BigInt/Decimal to JSON-safe types */
function serializeRow(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return Number(obj);
  if (typeof obj === 'object' && obj.constructor?.name === 'Decimal') return Number(obj);
  if (obj instanceof Date) return obj.toISOString();
  if (Array.isArray(obj)) return obj.map(serializeRow);
  if (typeof obj === 'object') {
    const out: any = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = serializeRow(v);
    }
    return out;
  }
  return obj;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if ((session.user as any).role !== 'ADMIN' && (session.user as any).role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
    const skip = (page - 1) * limit;

    const agencyId = searchParams.get('agencyId');
    const status = searchParams.get('status');
    const announcementType = searchParams.get('announcementType');
    const eligibilityConfidence = searchParams.get('eligibilityConfidence');
    const programIntent = searchParams.get('programIntent');

    // Build where clause
    const where: any = {};

    if (agencyId) where.agencyId = agencyId;
    if (status) where.status = status;
    if (announcementType) where.announcementType = announcementType;
    if (eligibilityConfidence) where.eligibilityConfidence = eligibilityConfidence;
    if (programIntent) where.programIntent = programIntent;

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { announcingAgency: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Query data and count in parallel
    const [data, totalCount] = await Promise.all([
      db.funding_programs.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
        include: {
          _count: { select: { funding_matches: true } },
        },
      }),
      db.funding_programs.count({ where }),
    ]);

    // Compute stats: total and by agency
    const [total, lowConfidence, byAgencyRaw] = await Promise.all([
      db.funding_programs.count(),
      db.funding_programs.count({ where: { eligibilityConfidence: 'LOW' } }),
      db.funding_programs.groupBy({
        by: ['agencyId'],
        _count: { id: true },
      }),
    ]);

    const byAgency: Record<string, number> = {};
    for (const row of byAgencyRaw) {
      byAgency[row.agencyId] = row._count.id;
    }

    // Add completeness to each row and serialize BigInt/Decimal
    const dataWithCompleteness = data.map((row) => ({
      ...serializeRow(row),
      completeness: computeCompleteness(row),
    }));

    const avgCompleteness =
      dataWithCompleteness.length > 0
        ? Math.round(
            dataWithCompleteness.reduce((sum, r) => sum + r.completeness.percent, 0) /
              dataWithCompleteness.length
          )
        : 0;

    return NextResponse.json({
      data: dataWithCompleteness,
      totalCount,
      page,
      limit,
      stats: {
        total,
        byAgency,
        avgCompleteness,
        lowConfidence,
      },
    });
  } catch (error: any) {
    console.error('Error fetching funding programs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
