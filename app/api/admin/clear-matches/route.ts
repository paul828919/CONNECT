/**
 * Admin API: Clear all matches for an organization
 * DELETE /api/admin/clear-matches?organizationId=xxx
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function DELETE(request: NextRequest) {
  try {
    // 1. Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // 2. Get organization ID from query params
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Missing organizationId parameter' },
        { status: 400 }
      );
    }

    // 3. Verify user owns this organization
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        users: {
          where: { id: userId },
        },
      },
    });

    if (!organization || organization.users.length === 0) {
      return NextResponse.json(
        { error: 'You do not have access to this organization' },
        { status: 403 }
      );
    }

    // 4. Delete all matches for this organization
    const result = await prisma.fundingMatch.deleteMany({
      where: {
        organizationId: organizationId,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${result.count} matches`,
      deletedCount: result.count,
    }, { status: 200 });

  } catch (error) {
    console.error('Error clearing matches:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
