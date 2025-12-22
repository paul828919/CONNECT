/**
 * Account Linking Callback Handler
 *
 * This endpoint is called after OAuth completes when linking accounts.
 * It verifies the linking token and redirects appropriately.
 *
 * Flow:
 * 1. User initiates linking → token stored in DB
 * 2. User completes OAuth → NextAuth signs them in (as new or existing user)
 * 3. NextAuth redirects here with token
 * 4. We verify token and complete the linking
 * 5. Redirect to accounts page with success/error message
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get('token');
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

  if (!token) {
    console.error('[LINK_CALLBACK] No token provided');
    return NextResponse.redirect(
      `${baseUrl}/dashboard/accounts?error=missing_token`
    );
  }

  try {
    // Find the linking request
    const linkingRequest = await db.accountLinkingRequest.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!linkingRequest) {
      console.error('[LINK_CALLBACK] Invalid or expired token');
      return NextResponse.redirect(
        `${baseUrl}/dashboard/accounts?error=invalid_token`
      );
    }

    // Check if expired
    if (linkingRequest.expiresAt < new Date()) {
      await db.accountLinkingRequest.delete({ where: { token } });
      console.error('[LINK_CALLBACK] Token expired');
      return NextResponse.redirect(
        `${baseUrl}/dashboard/accounts?error=token_expired`
      );
    }

    // Get current session - this is the user who just signed in via OAuth
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      console.error('[LINK_CALLBACK] No session found after OAuth');
      return NextResponse.redirect(
        `${baseUrl}/dashboard/accounts?error=no_session`
      );
    }

    const currentUserId = (session.user as any).id;
    const targetUserId = linkingRequest.userId;
    const provider = linkingRequest.provider;

    console.log(`[LINK_CALLBACK] Current user: ${currentUserId}, Target user: ${targetUserId}, Provider: ${provider}`);

    // Case 1: OAuth created a new user (different from target)
    // This happens when the OAuth email doesn't match and a new user was created
    if (currentUserId !== targetUserId) {
      // Find the OAuth account that was just created
      const newAccount = await db.account.findFirst({
        where: {
          userId: currentUserId,
          provider: provider,
        },
      });

      if (newAccount) {
        // Move the account from the new user to the target user
        await db.account.update({
          where: { id: newAccount.id },
          data: { userId: targetUserId },
        });

        console.log(`[LINK_CALLBACK] Moved ${provider} account from ${currentUserId} to ${targetUserId}`);

        // Check if the new user has any other accounts or data
        const remainingAccounts = await db.account.count({
          where: { userId: currentUserId },
        });

        // If the new user has no accounts and no organization, delete them
        const newUser = await db.user.findUnique({
          where: { id: currentUserId },
          select: { organizationId: true },
        });

        if (remainingAccounts === 0 && !newUser?.organizationId) {
          await db.user.delete({ where: { id: currentUserId } });
          console.log(`[LINK_CALLBACK] Deleted orphaned user ${currentUserId}`);
        }
      }
    }

    // Clean up the linking request
    await db.accountLinkingRequest.delete({ where: { token } });

    // Redirect to accounts page with success message
    // Note: We need to sign the user back in as the target user
    // For now, redirect to signin to refresh the session
    return NextResponse.redirect(
      `${baseUrl}/auth/signin?callbackUrl=${encodeURIComponent('/dashboard/accounts?linked=' + provider)}`
    );
  } catch (error: any) {
    console.error('[LINK_CALLBACK] Error:', error);
    return NextResponse.redirect(
      `${baseUrl}/dashboard/accounts?error=linking_failed`
    );
  }
}
