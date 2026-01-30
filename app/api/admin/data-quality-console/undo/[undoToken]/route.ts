import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** Maps resourceType from audit log → Prisma model name + restore field */
const RESOURCE_CONFIG: Record<
  string,
  { model: string; restoreField: string }
> = {
  sme_program: { model: 'sme_programs', restoreField: 'status' },
  sme_program_match: { model: 'sme_program_matches', restoreField: 'deletedAt' },
  funding_program: { model: 'funding_programs', restoreField: 'status' },
  funding_match: { model: 'funding_matches', restoreField: 'deletedAt' },
  organization: { model: 'organizations', restoreField: 'status' },
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ undoToken: string }> }
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

    const { undoToken } = await params;

    // Find audit log entry by undo token
    const auditEntry = await db.audit_logs.findUnique({
      where: { undoToken },
    });

    if (!auditEntry) {
      return NextResponse.json(
        { error: '실행 취소 토큰을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // Check expiration
    if (!auditEntry.undoExpiresAt || auditEntry.undoExpiresAt < new Date()) {
      return NextResponse.json(
        { error: '실행 취소 기간이 만료되었습니다. (5분)' },
        { status: 410 }
      );
    }

    // Look up the resource config
    const config = RESOURCE_CONFIG[auditEntry.resourceType];
    if (!config) {
      return NextResponse.json(
        { error: `Unknown resource type: ${auditEntry.resourceType}` },
        { status: 400 }
      );
    }

    // Restore the original value from beforeValues
    const beforeValues = auditEntry.beforeValues as Record<string, any> | null;
    if (!beforeValues) {
      return NextResponse.json(
        { error: '복원할 이전 값이 없습니다.' },
        { status: 400 }
      );
    }

    const restoreValue = beforeValues[config.restoreField];
    const prismaModel = (db as any)[config.model];

    // Restore the row
    await prismaModel.update({
      where: { id: auditEntry.resourceId },
      data: { [config.restoreField]: restoreValue ?? null },
    });

    // Create audit log for the undo action
    await db.audit_logs.create({
      data: {
        userId: (session.user as any).id,
        action: 'UNDO_DELETE',
        resourceType: auditEntry.resourceType,
        resourceId: auditEntry.resourceId,
        purpose: `Undo soft-delete of ${auditEntry.resourceType} via data quality console`,
      },
    });

    // Invalidate the undo token (prevent re-use)
    await db.audit_logs.update({
      where: { id: auditEntry.id },
      data: {
        undoToken: null,
        undoExpiresAt: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: '삭제가 취소되었습니다.',
    });
  } catch (error: any) {
    console.error('Error undoing deletion:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
