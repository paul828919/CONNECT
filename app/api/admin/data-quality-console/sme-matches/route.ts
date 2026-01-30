import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
    const skip = (page - 1) * limit;

    const organizationId = searchParams.get('organizationId');
    const programId = searchParams.get('programId');
    const scoreMin = searchParams.get('scoreMin');
    const scoreMax = searchParams.get('scoreMax');
    const eligibilityLevel = searchParams.get('eligibilityLevel');
    const viewed = searchParams.get('viewed');
    const saved = searchParams.get('saved');
    const sessionId = searchParams.get('sessionId');

    // Build where clause
    const where: any = {};

    if (organizationId) where.organizationId = organizationId;
    if (programId) where.programId = programId;
    if (eligibilityLevel) where.eligibilityLevel = eligibilityLevel;
    if (sessionId) where.sessionId = sessionId;
    if (viewed === 'true') where.viewed = true;
    else if (viewed === 'false') where.viewed = false;
    if (saved === 'true') where.saved = true;
    else if (saved === 'false') where.saved = false;

    if (scoreMin || scoreMax) {
      where.score = {};
      if (scoreMin) where.score.gte = parseInt(scoreMin);
      if (scoreMax) where.score.lte = parseInt(scoreMax);
    }

    // Query data and count in parallel
    const [data, totalCount] = await Promise.all([
      db.sme_program_matches.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
        include: {
          organization: { select: { id: true, name: true, type: true } },
          program: { select: { id: true, title: true, pblancSeq: true, status: true } },
        },
      }),
      db.sme_program_matches.count({ where }),
    ]);

    // Compute stats
    const [total, viewedCount, savedCount, scoreAgg] = await Promise.all([
      db.sme_program_matches.count(),
      db.sme_program_matches.count({ where: { viewed: true } }),
      db.sme_program_matches.count({ where: { saved: true } }),
      db.sme_program_matches.aggregate({ _avg: { score: true } }),
    ]);

    // Unique orgs and programs
    const [uniqueOrgsResult, uniqueProgramsResult] = await Promise.all([
      db.sme_program_matches.groupBy({ by: ['organizationId'] }),
      db.sme_program_matches.groupBy({ by: ['programId'] }),
    ]);

    const viewedPercent = total > 0 ? Math.round((viewedCount / total) * 100 * 100) / 100 : 0;
    const savedPercent = total > 0 ? Math.round((savedCount / total) * 100 * 100) / 100 : 0;

    return NextResponse.json({
      data: data.map(serializeRow),
      totalCount,
      page,
      limit,
      stats: {
        total,
        avgScore: Math.round((scoreAgg._avg.score || 0) * 100) / 100,
        viewedPercent,
        savedPercent,
        uniqueOrgs: uniqueOrgsResult.length,
        uniquePrograms: uniqueProgramsResult.length,
      },
    });
  } catch (error: any) {
    console.error('Error fetching SME matches:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
