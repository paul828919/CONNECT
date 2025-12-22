/**
 * Account Unlinking API
 *
 * DELETE: Remove a linked OAuth provider from user's account
 *
 * Security:
 * - Must have at least 1 account remaining (can't unlink the last one)
 * - Only the account owner can unlink
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import { db } from '@/lib/db';

const VALID_PROVIDERS = ['kakao', 'naver'] as const;
type Provider = (typeof VALID_PROVIDERS)[number];

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();
    const { provider } = body as { provider: Provider };

    // Validate provider
    if (!provider || !VALID_PROVIDERS.includes(provider)) {
      return NextResponse.json(
        { error: 'Invalid provider. Must be "kakao" or "naver"' },
        { status: 400 }
      );
    }

    // Count total linked accounts
    const totalAccounts = await db.account.count({
      where: { userId },
    });

    // Prevent unlinking if it's the last account
    if (totalAccounts <= 1) {
      return NextResponse.json(
        { error: '최소 1개의 로그인 방법이 필요합니다. 다른 계정을 먼저 연동해 주세요.' },
        { status: 400 }
      );
    }

    // Find the account to unlink
    const accountToUnlink = await db.account.findFirst({
      where: {
        userId,
        provider,
      },
    });

    if (!accountToUnlink) {
      return NextResponse.json(
        { error: `${provider === 'kakao' ? 'Kakao' : 'Naver'} 계정이 연동되어 있지 않습니다` },
        { status: 404 }
      );
    }

    // Delete the account
    await db.account.delete({
      where: {
        id: accountToUnlink.id,
      },
    });

    console.log(`[UNLINK_API] User ${userId} unlinked ${provider} account`);

    return NextResponse.json({
      success: true,
      message: `${provider === 'kakao' ? 'Kakao' : 'Naver'} 계정 연동이 해제되었습니다`,
      remainingAccounts: totalAccounts - 1,
    });
  } catch (error: any) {
    console.error('[UNLINK_API] Failed to unlink account:', error);
    return NextResponse.json(
      { error: 'Failed to unlink account' },
      { status: 500 }
    );
  }
}
