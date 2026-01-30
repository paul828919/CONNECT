import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { db } from '@/lib/db';
import crypto from 'crypto';
import { serializeRow } from '@/lib/utils/completeness';

export const dynamic = 'force-dynamic';

const MAX_BULK_DELETE = 100;

/** Reuse TABLE_CONFIG pattern from the single-delete route */
const TABLE_CONFIG: Record<
  string,
  {
    model: string;
    softDeleteField: string;
    softDeleteValue: any;
    resourceType: string;
    matchCountRelation?: string;
  }
> = {
  'sme-programs': {
    model: 'sme_programs',
    softDeleteField: 'status',
    softDeleteValue: 'ARCHIVED',
    resourceType: 'sme_program',
    matchCountRelation: 'matches',
  },
  'funding-programs': {
    model: 'funding_programs',
    softDeleteField: 'status',
    softDeleteValue: 'ARCHIVED',
    resourceType: 'funding_program',
    matchCountRelation: 'funding_matches',
  },
};

export async function POST(
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
    const config = TABLE_CONFIG[table];
    if (!config) {
      return NextResponse.json(
        { error: `Bulk delete is not supported for: ${table}` },
        { status: 400 }
      );
    }

    const body = await request.json();
    const ids: string[] = body.ids;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'ids must be a non-empty array' },
        { status: 400 }
      );
    }
    if (ids.length > MAX_BULK_DELETE) {
      return NextResponse.json(
        { error: `Maximum ${MAX_BULK_DELETE} items per bulk delete` },
        { status: 400 }
      );
    }

    const prismaModel = (db as any)[config.model];
    const userId = (session.user as any).id;
    const undoExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    const deleteValue =
      typeof config.softDeleteValue === 'function'
        ? config.softDeleteValue()
        : config.softDeleteValue;

    // Execute in a transaction: fetch all → soft-delete all → create audit entries
    const result = await db.$transaction(async (tx: any) => {
      const txModel = tx[config.model];

      // Fetch existing rows for beforeValues snapshot
      const existingRows = await txModel.findMany({
        where: { id: { in: ids } },
        ...(config.matchCountRelation
          ? { include: { _count: { select: { [config.matchCountRelation]: true } } } }
          : {}),
      });

      if (existingRows.length === 0) {
        return { deletedCount: 0, undoTokens: [] };
      }

      // Soft-delete all rows
      await txModel.updateMany({
        where: { id: { in: existingRows.map((r: any) => r.id) } },
        data: { [config.softDeleteField]: deleteValue },
      });

      // Create individual audit log entries with undo tokens
      const undoTokens: string[] = [];
      for (const row of existingRows) {
        const undoToken = crypto.randomUUID();
        undoTokens.push(undoToken);

        await tx.audit_logs.create({
          data: {
            userId,
            action: 'DELETE',
            resourceType: config.resourceType,
            resourceId: row.id,
            purpose: `Bulk soft-delete ${config.resourceType} via data quality console (duplicate cleanup)`,
            beforeValues: serializeRow(row),
            undoToken,
            undoExpiresAt,
          },
        });
      }

      return { deletedCount: existingRows.length, undoTokens };
    });

    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount,
      undoTokens: result.undoTokens,
      message: `${result.deletedCount}개 항목이 보관 처리되었습니다.`,
    });
  } catch (error: any) {
    console.error('Error bulk-deleting rows:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
