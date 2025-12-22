/**
 * Account Linking Initiation API
 *
 * POST: Start the OAuth flow to link a new provider to existing account
 *
 * Flow:
 * 1. Verify user is logged in
 * 2. Check if provider is already linked
 * 3. Create linking request in database with secure token
 * 4. Return OAuth authorization URL with token in callback
 *
 * The signIn callback will verify the token and perform the linking.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import { db } from '@/lib/db';
import { randomBytes } from 'crypto';

const VALID_PROVIDERS = ['kakao', 'naver'] as const;
type Provider = (typeof VALID_PROVIDERS)[number];

export async function POST(request: NextRequest) {
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

    // Check if this provider is already linked to the user
    const existingAccount = await db.account.findFirst({
      where: {
        userId,
        provider,
      },
    });

    if (existingAccount) {
      return NextResponse.json(
        { error: `${provider === 'kakao' ? 'Kakao' : 'Naver'} 계정이 이미 연동되어 있습니다` },
        { status: 400 }
      );
    }

    // Clean up any existing linking requests for this user
    await db.accountLinkingRequest.deleteMany({
      where: { userId },
    });

    // Create a secure token for this linking request
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store the linking request in database
    await db.accountLinkingRequest.create({
      data: {
        userId,
        provider,
        token,
        expiresAt,
      },
    });

    console.log(`[LINK_API] Created linking request for user ${userId}, provider: ${provider}`);

    // Build OAuth authorization URL
    // Include the linking token in the callback URL for verification
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const callbackUrl = `${baseUrl}/api/auth/link-callback?token=${token}`;

    // Use NextAuth's CSRF-protected signin endpoint
    // This will be handled by the frontend using signIn() from next-auth/react
    return NextResponse.json({
      success: true,
      message: `${provider === 'kakao' ? 'Kakao' : 'Naver'} 계정 연동을 시작합니다`,
      provider,
      callbackUrl,
      token, // For client-side signIn() call
    });
  } catch (error: any) {
    console.error('[LINK_API] Failed to initiate account linking:', error);
    return NextResponse.json(
      { error: 'Failed to initiate account linking' },
      { status: 500 }
    );
  }
}
