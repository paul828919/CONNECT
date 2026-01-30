import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { db } from '@/lib/db';
import {
  SME_COMPLETENESS_FIELDS,
  computeCompleteness as computeCompletenessGeneric,
  serializeRow,
} from '@/lib/utils/completeness';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function computeCompleteness(row: any) {
  return computeCompletenessGeneric(row, SME_COMPLETENESS_FIELDS);
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

    const status = searchParams.get('status');
    const bizType = searchParams.get('bizType');
    const eligibilityConfidence = searchParams.get('eligibilityConfidence');
    const hasDetailPage = searchParams.get('hasDetailPage');

    // Build where clause
    const where: any = {};

    if (status) {
      where.status = status;
    }
    if (bizType) {
      where.bizType = bizType;
    }
    if (eligibilityConfidence) {
      where.eligibilityConfidence = eligibilityConfidence;
    }
    if (hasDetailPage === 'true') {
      where.detailPageText = { not: null };
    } else if (hasDetailPage === 'false') {
      where.detailPageText = null;
    }

    if (search) {
      const searchConditions: any[] = [
        { title: { contains: search, mode: 'insensitive' } },
        { supportInstitution: { contains: search, mode: 'insensitive' } },
      ];
      const searchAsNumber = parseInt(search);
      if (!isNaN(searchAsNumber)) {
        searchConditions.push({ pblancSeq: searchAsNumber });
      }
      where.OR = searchConditions;
    }

    // Query data and count in parallel
    const [data, totalCount] = await Promise.all([
      db.sme_programs.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
        include: {
          _count: { select: { matches: true } },
        },
      }),
      db.sme_programs.count({ where }),
    ]);

    // Compute stats
    const [total, active, expired, archived, lowConfidence] = await Promise.all([
      db.sme_programs.count(),
      db.sme_programs.count({ where: { status: 'ACTIVE' } }),
      db.sme_programs.count({ where: { status: 'EXPIRED' } }),
      db.sme_programs.count({ where: { status: 'ARCHIVED' } }),
      db.sme_programs.count({ where: { eligibilityConfidence: 'LOW' } }),
    ]);

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
        active,
        expired,
        archived,
        avgCompleteness,
        lowConfidence,
      },
    });
  } catch (error: any) {
    console.error('Error fetching SME programs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
