/**
 * Funding Program Detail API
 *
 * GET /api/funding-programs/[id] - Get single program details
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // TODO: Implement program detail retrieval
    // 1. Fetch program from database by ID
    // 2. Return full program details
    // 3. Include eligibility criteria
    // 4. Include application deadlines

    return NextResponse.json(
      {
        error: 'Not implemented yet',
        endpoint: `/api/funding-programs/${id} GET`,
      },
      { status: 501 }
    );
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}