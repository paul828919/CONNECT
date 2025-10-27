/**
 * User Organization API
 *
 * GET: Fetch the current user's organization with consortium preferences
 * Used by: Partner search page to check if user has set consortium preferences
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Fetch user's organization with consortium preferences
    const organization = await db.organizations.findFirst({
      where: {
        users: {
          some: { id: userId },
        },
      },
      select: {
        id: true,
        type: true,
        name: true,
        desiredConsortiumFields: true,
        desiredTechnologies: true,
        targetPartnerTRL: true,
        commercializationCapabilities: true,
        expectedTRLLevel: true,
        targetOrgScale: true,
        targetOrgRevenue: true,
      },
    });

    if (!organization) {
      return NextResponse.json(
        { error: 'No organization found for user' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      organization,
    });
  } catch (error: any) {
    console.error('Failed to fetch user organization:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organization' },
      { status: 500 }
    );
  }
}
