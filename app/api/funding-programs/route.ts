/**
 * Funding Programs API
 *
 * GET /api/funding-programs - List all active funding programs
 * Query params:
 * - agency: Filter by agency (IITP, KEIT, TIPA, KIMST)
 * - limit: Pagination limit (default: 20)
 * - offset: Pagination offset (default: 0)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const agency = searchParams.get('agency');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // TODO: Implement funding program listing
    // 1. Query active programs from database
    // 2. Filter by agency if specified
    // 3. Apply pagination
    // 4. Return results with metadata

    return NextResponse.json(
      {
        error: 'Not implemented yet',
        endpoint: '/api/funding-programs GET',
        params: { agency, limit, offset },
      },
      { status: 501 }
    );
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}