/**
 * Match Update API
 * PATCH /api/matches/[id]
 *
 * Update match engagement status (saved, viewed)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import { PrismaClient } from '@prisma/client';

// Direct Prisma Client instantiation (bypasses lib/db module resolution issue)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
};

const db = globalForPrisma.prisma ?? new PrismaClient({
  log: ['error'],
});

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = db;
}
import { updateMatchEngagement } from '@/lib/analytics/match-performance';


export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const matchId = params.id;

    // 2. Parse request body
    const body = await request.json();
    const { saved } = body;

    if (saved === undefined) {
      return NextResponse.json(
        { error: 'Missing saved parameter' },
        { status: 400 }
      );
    }

    // 3. Fetch match and verify ownership
    const match = await db.funding_matches.findUnique({
      where: { id: matchId },
      include: {
        organizations: {
          include: {
            users: {
              where: { id: userId },
            },
          },
        },
      },
    });

    if (!match) {
      return NextResponse.json(
        { error: 'Match not found' },
        { status: 404 }
      );
    }

    if (match.organizations.users.length === 0) {
      return NextResponse.json(
        { error: 'You do not have access to this match' },
        { status: 403 }
      );
    }

    // 4. Update match saved status
    const updatedMatch = await db.funding_matches.update({
      where: { id: matchId },
      data: {
        saved: saved,
        savedAt: saved ? new Date() : null,
      },
    });

    // 5. Update analytics engagement tracking
    await updateMatchEngagement(matchId, { saved });

    // 6. Return success
    return NextResponse.json(
      {
        success: true,
        matchId,
        saved: updatedMatch.saved,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Match update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
  // NOTE: Do NOT call db.$disconnect() in Next.js API routes
  // It breaks connection pooling and causes subsequent requests to fail
}
