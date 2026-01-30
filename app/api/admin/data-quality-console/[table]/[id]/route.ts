import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { db } from '@/lib/db';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

/** Table slug → Prisma model + soft-delete strategy */
const TABLE_CONFIG: Record<
  string,
  {
    model: string;
    softDeleteField: string;
    softDeleteValue: any;
    resourceType: string;
    labelField: string;
    matchCountRelation?: string;
  }
> = {
  'sme-programs': {
    model: 'sme_programs',
    softDeleteField: 'status',
    softDeleteValue: 'ARCHIVED',
    resourceType: 'sme_program',
    labelField: 'title',
    matchCountRelation: 'matches',
  },
  'sme-matches': {
    model: 'sme_program_matches',
    softDeleteField: 'deletedAt',
    softDeleteValue: () => new Date(),
    resourceType: 'sme_program_match',
    labelField: 'id',
  },
  'funding-programs': {
    model: 'funding_programs',
    softDeleteField: 'status',
    softDeleteValue: 'ARCHIVED',
    resourceType: 'funding_program',
    labelField: 'title',
    matchCountRelation: 'funding_matches',
  },
  'funding-matches': {
    model: 'funding_matches',
    softDeleteField: 'deletedAt',
    softDeleteValue: () => new Date(),
    resourceType: 'funding_match',
    labelField: 'id',
  },
  'users-orgs': {
    model: 'organizations',
    softDeleteField: 'status',
    softDeleteValue: 'DEACTIVATED',
    resourceType: 'organization',
    labelField: 'name',
  },
};

const DELETE_MESSAGES: Record<string, string> = {
  'sme-programs': '프로그램이 보관 처리되었습니다.',
  'sme-matches': '매칭이 삭제되었습니다.',
  'funding-programs': '프로그램이 보관 처리되었습니다.',
  'funding-matches': '매칭이 삭제되었습니다.',
  'users-orgs': '기업이 비활성화 처리되었습니다.',
};

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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ table: string; id: string }> }
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

    const { table, id } = await params;

    // Validate table against allowlist
    const config = TABLE_CONFIG[table];
    if (!config) {
      return NextResponse.json(
        { error: `Invalid table: ${table}` },
        { status: 400 }
      );
    }

    const prismaModel = (db as any)[config.model];

    // Fetch existing row for beforeValues snapshot
    const existingRow = await prismaModel.findUnique({
      where: { id },
      ...(config.matchCountRelation
        ? { include: { _count: { select: { [config.matchCountRelation]: true } } } }
        : {}),
    });

    if (!existingRow) {
      return NextResponse.json({ error: 'Row not found' }, { status: 404 });
    }

    // Extract match count for programs (cascade warning)
    const matchCount = config.matchCountRelation
      ? existingRow._count?.[config.matchCountRelation] ?? 0
      : undefined;

    // Compute the soft-delete value
    const deleteValue =
      typeof config.softDeleteValue === 'function'
        ? config.softDeleteValue()
        : config.softDeleteValue;

    // Execute soft-delete
    await prismaModel.update({
      where: { id },
      data: { [config.softDeleteField]: deleteValue },
    });

    // Create audit log with undo support
    const undoToken = crypto.randomUUID();
    const undoExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await db.audit_logs.create({
      data: {
        userId: (session.user as any).id,
        action: 'DELETE',
        resourceType: config.resourceType,
        resourceId: id,
        purpose: `Soft-delete ${config.resourceType} via data quality console`,
        beforeValues: serializeRow(existingRow),
        undoToken,
        undoExpiresAt,
      },
    });

    return NextResponse.json({
      success: true,
      undoToken,
      matchCount,
      message: DELETE_MESSAGES[table],
    });
  } catch (error: any) {
    console.error('Error soft-deleting row:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
