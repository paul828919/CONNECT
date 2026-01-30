import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { db } from '@/lib/db';
import {
  SME_COMPLETENESS_FIELDS,
  FUNDING_COMPLETENESS_FIELDS,
  computeCompleteness,
  serializeRow,
} from '@/lib/utils/completeness';
import { detectDuplicates, DuplicateProgram } from '@/lib/utils/duplicate-detection';

export const dynamic = 'force-dynamic';
export const maxDuration = 30; // title similarity can take a few seconds on large datasets

const VALID_TABLES = ['sme-programs', 'funding-programs'] as const;
type ValidTable = (typeof VALID_TABLES)[number];

function isValidTable(table: string): table is ValidTable {
  return (VALID_TABLES as readonly string[]).includes(table);
}

const TABLE_DB_CONFIG: Record<
  ValidTable,
  {
    model: string;
    completenessFields: readonly string[];
    matchCountRelation: string;
    enablePblancSeq: boolean;
  }
> = {
  'sme-programs': {
    model: 'sme_programs',
    completenessFields: SME_COMPLETENESS_FIELDS,
    matchCountRelation: 'matches',
    enablePblancSeq: true,
  },
  'funding-programs': {
    model: 'funding_programs',
    completenessFields: FUNDING_COMPLETENESS_FIELDS,
    matchCountRelation: 'funding_matches',
    enablePblancSeq: false,
  },
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userRole = (session.user as any).role;
    if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { table } = await params;

    if (!isValidTable(table)) {
      return NextResponse.json(
        { error: `Duplicate detection is only available for: ${VALID_TABLES.join(', ')}` },
        { status: 400 }
      );
    }

    const config = TABLE_DB_CONFIG[table];
    const prismaModel = (db as any)[config.model];

    // Fetch all non-ARCHIVED programs with match counts
    const rows = await prismaModel.findMany({
      where: { status: { not: 'ARCHIVED' } },
      include: {
        _count: { select: { [config.matchCountRelation]: true } },
      },
    });

    // Map to DuplicateProgram shape
    const programs: DuplicateProgram[] = rows.map((row: any) => {
      const serialized = serializeRow(row);
      return {
        id: serialized.id,
        title: serialized.title || '',
        pblancSeq: serialized.pblancSeq ?? null,
        contentHash: serialized.contentHash ?? null,
        status: serialized.status,
        completeness: computeCompleteness(row, config.completenessFields),
        matchCount: row._count?.[config.matchCountRelation] ?? 0,
        createdAt: serialized.createdAt,
        updatedAt: serialized.updatedAt,
      };
    });

    const result = detectDuplicates(programs, {
      enablePblancSeq: config.enablePblancSeq,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error detecting duplicates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
