/**
 * Linked Accounts API
 *
 * GET: Fetch user's linked OAuth accounts (Kakao, Naver)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Fetch all linked accounts for this user
    const accounts = await db.account.findMany({
      where: { userId },
      select: {
        id: true,
        provider: true,
        providerAccountId: true,
      },
    });

    // Get user email for display
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    // Map accounts to a more friendly format
    const linkedAccounts = accounts.map((account) => ({
      id: account.id,
      provider: account.provider,
      providerAccountId: account.providerAccountId,
    }));

    // Determine which providers are linked
    const providers = {
      naver: linkedAccounts.find((a) => a.provider === 'naver') || null,
      kakao: linkedAccounts.find((a) => a.provider === 'kakao') || null,
    };

    return NextResponse.json({
      success: true,
      accounts: linkedAccounts,
      providers,
      userEmail: user?.email,
      totalAccounts: linkedAccounts.length,
    });
  } catch (error: any) {
    console.error('[ACCOUNTS_API] Failed to fetch linked accounts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch linked accounts' },
      { status: 500 }
    );
  }
}
