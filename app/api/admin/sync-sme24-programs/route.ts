/**
 * SME24 Program Sync Admin API
 *
 * POST /api/admin/sync-sme24-programs
 *
 * Triggers sync of SME support programs from 중소벤처24 API.
 * Admin-only endpoint for manual sync or scheduled jobs.
 *
 * GET /api/admin/sync-sme24-programs
 *
 * Returns sync statistics (total, active, expired, last sync time).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import {
  syncSMEPrograms,
  dailySync,
  getSyncStats,
} from '@/lib/sme24-api/program-service';
import { validateConfig } from '@/lib/sme24-api/config';

/**
 * GET - Get sync statistics
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role
    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다' },
        { status: 403 }
      );
    }

    const stats = await getSyncStats();

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Sync stats error:', error);
    return NextResponse.json(
      { error: '통계를 불러올 수 없습니다' },
      { status: 500 }
    );
  }
}

/**
 * POST - Trigger sync
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role
    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다' },
        { status: 403 }
      );
    }

    // Validate API configuration
    const configValidation = validateConfig();
    if (!configValidation.valid) {
      console.error('SME24 API keys not configured:', configValidation.missing);
      return NextResponse.json(
        {
          error: 'SME24 API가 구성되지 않았습니다',
          missing: configValidation.missing,
        },
        { status: 503 }
      );
    }

    // Parse request body for options
    let options = {
      fullSync: false,
      strDt: undefined as string | undefined,
      endDt: undefined as string | undefined,
    };

    try {
      const body = await request.json();
      options = {
        fullSync: body.fullSync === true,
        strDt: body.strDt,
        endDt: body.endDt,
      };
    } catch {
      // No body or invalid JSON - use defaults
    }

    console.log('[Admin Sync] Starting sync with options:', options);

    // Run sync
    let result;
    if (options.fullSync) {
      // Full sync - all programs
      result = await syncSMEPrograms({
        strDt: options.strDt,
        endDt: options.endDt,
      }, true);
    } else if (options.strDt && options.endDt) {
      // Date range sync
      result = await syncSMEPrograms({
        strDt: options.strDt,
        endDt: options.endDt,
      });
    } else {
      // Daily sync (last 2 days)
      result = await dailySync();
    }

    return NextResponse.json({
      success: result.success,
      data: {
        programsFound: result.programsFound,
        programsCreated: result.programsCreated,
        programsUpdated: result.programsUpdated,
        programsExpired: result.programsExpired,
        duration: result.duration,
        errors: result.errors,
      },
      message: result.success
        ? `동기화 완료: ${result.programsCreated}개 생성, ${result.programsUpdated}개 업데이트`
        : '동기화 중 오류가 발생했습니다',
    });
  } catch (error: any) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { error: '동기화 중 오류가 발생했습니다: ' + error.message },
      { status: 500 }
    );
  }
}
