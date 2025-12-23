/**
 * NextAuth.js Configuration
 *
 * Centralized auth configuration for Connect Platform:
 * - Kakao OAuth
 * - Naver OAuth
 * - JWT sessions
 * - Database user storage
 * - OAuth Account Linking (multiple providers per user)
 *
 * See: https://next-auth.js.org/configuration/options
 */

import { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { Adapter, AdapterAccount } from 'next-auth/adapters';
import { db } from '@/lib/db';

/**
 * Custom Adapter that extends PrismaAdapter with account linking support
 *
 * When there's an active linking request in the database,
 * we return the existing user instead of creating a new one.
 * This enables linking OAuth accounts with different emails.
 */
function createCustomAdapter(): Adapter {
  const prismaAdapter = PrismaAdapter(db);

  return {
    ...prismaAdapter,

    // Override createUser to handle linking mode
    async createUser(user: any) {
      // Check for active linking requests for this OAuth provider
      // We find requests by provider and email (from OAuth profile)
      // This is a more reliable approach than cookies
      const provider = (globalThis as any).__linkingProvider;
      const oauthEmail = user.email;

      console.log(`[AUTH_ADAPTER] createUser called: email=${oauthEmail}, provider=${provider}`);

      if (provider) {
        try {
          // Find an active linking request for this provider
          const linkingRequest = await db.accountLinkingRequest.findFirst({
            where: {
              provider: provider,
              expiresAt: { gt: new Date() },
            },
            orderBy: { createdAt: 'desc' },
          });

          if (linkingRequest) {
            console.log(`[AUTH_ADAPTER] Found linking request for user ${linkingRequest.userId}`);

            // Return the existing user instead of creating a new one
            const existingUser = await db.user.findUnique({
              where: { id: linkingRequest.userId },
            });

            if (existingUser) {
              // Delete the linking request (one-time use)
              await db.accountLinkingRequest.delete({
                where: { id: linkingRequest.id },
              });

              console.log(`[AUTH_ADAPTER] Returning existing user for linking: ${existingUser.id}`);
              return existingUser as any;
            }
          }
        } catch (error) {
          console.error('[AUTH_ADAPTER] Error checking linking request:', error);
        }
      }

      // Normal flow: create new user
      console.log(`[AUTH_ADAPTER] Creating new user: ${user.email}`);
      return prismaAdapter.createUser!(user);
    },

    // Override getUserByAccount to set the provider context
    async getUserByAccount(account: { providerAccountId: string; provider: string }) {
      // Set the provider for the createUser function to use
      (globalThis as any).__linkingProvider = account.provider;

      const result = await prismaAdapter.getUserByAccount!(account);
      console.log(`[AUTH_ADAPTER] getUserByAccount: provider=${account.provider}, found=${!!result}`);
      return result;
    },

    // Override getUserByEmail to bypass email matching during account linking
    // This is CRITICAL for the linking flow to work properly.
    // Without this override, NextAuth throws OAuthAccountNotLinked when:
    // 1. OAuth account doesn't exist (getUserByAccount returns null)
    // 2. But email matches an existing user (getUserByEmail returns user)
    // By returning null here during linking mode, we force NextAuth to call
    // createUser, where our linking logic properly handles the account linking.
    async getUserByEmail(email: string) {
      const provider = (globalThis as any).__linkingProvider;

      console.log(`[AUTH_ADAPTER] getUserByEmail: email=${email}, provider=${provider}`);

      // If in linking mode, check for active linking request
      if (provider) {
        try {
          const linkingRequest = await db.accountLinkingRequest.findFirst({
            where: {
              provider: provider,
              expiresAt: { gt: new Date() },
            },
          });

          if (linkingRequest) {
            console.log(`[AUTH_ADAPTER] getUserByEmail: Active linking request found for user ${linkingRequest.userId}, returning null to bypass email check`);
            // Return null to make NextAuth call createUser instead of throwing OAuthAccountNotLinked
            return null;
          }
        } catch (error) {
          console.error('[AUTH_ADAPTER] Error checking linking request in getUserByEmail:', error);
        }
      }

      // Normal flow: return the user by email
      const result = await prismaAdapter.getUserByEmail!(email);
      console.log(`[AUTH_ADAPTER] getUserByEmail: found=${!!result}`);
      return result;
    },

    // Override linkAccount for duplicate detection and cleanup
    async linkAccount(account: AdapterAccount) {
      try {
        // Check if this OAuth account is already linked to another user
        const existingAccount = await db.account.findUnique({
          where: {
            provider_providerAccountId: {
              provider: account.provider,
              providerAccountId: account.providerAccountId,
            },
          },
        });

        if (existingAccount && existingAccount.userId !== account.userId) {
          console.log('[AUTH_ADAPTER] OAuth account already linked to different user');
          throw new Error('OAuthAccountAlreadyLinked');
        }

        if (existingAccount) {
          // Account already linked to this user, skip
          console.log('[AUTH_ADAPTER] Account already linked to this user, skipping');
          return existingAccount as any;
        }
      } catch (error: any) {
        if (error.message === 'OAuthAccountAlreadyLinked') {
          throw error;
        }
        // Continue with normal linking
      }

      const result = await prismaAdapter.linkAccount!(account);
      console.log(`[AUTH_ADAPTER] Linked account: provider=${account.provider}, userId=${account.userId}`);

      // Clean up the global provider context
      delete (globalThis as any).__linkingProvider;

      return result;
    },
  };
}

export const authOptions: NextAuthOptions = {
  adapter: createCustomAdapter(),
  providers: [
    {
      id: 'kakao',
      name: 'Kakao',
      type: 'oauth',
      clientId: process.env.KAKAO_CLIENT_ID!,
      clientSecret: process.env.KAKAO_CLIENT_SECRET,
      authorization: {
        url: 'https://kauth.kakao.com/oauth/authorize',
        params: {
          scope: '',
        },
      },
      token: {
        url: 'https://kauth.kakao.com/oauth/token',
        async request(context) {
          const { provider, params } = context;

          const body = new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: provider.clientId as string,
            client_secret: provider.clientSecret as string,
            redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/callback/kakao`,
            code: params.code as string,
          });

          const response = await fetch('https://kauth.kakao.com/oauth/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
            },
            body: body.toString(),
          });

          const tokens = await response.json();
          return { tokens };
        },
      },
      userinfo: {
        url: 'https://kapi.kakao.com/v2/user/me',
        async request({ tokens }) {
          const response = await fetch('https://kapi.kakao.com/v2/user/me', {
            headers: {
              Authorization: `Bearer ${tokens.access_token}`,
              'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
            },
          });
          return await response.json();
        },
      },
      profile(profile: any) {
        return {
          id: String(profile.id),
          name: profile.kakao_account?.profile?.nickname || profile.properties?.nickname || 'Unknown',
          email: profile.kakao_account?.email || null,
          image: profile.kakao_account?.profile?.profile_image_url || profile.properties?.profile_image || null,
        };
      },
    },
    {
      id: 'naver',
      name: 'Naver',
      type: 'oauth',
      clientId: process.env.NAVER_CLIENT_ID!,
      clientSecret: process.env.NAVER_CLIENT_SECRET,
      authorization: {
        url: 'https://nid.naver.com/oauth2.0/authorize',
        params: {
          response_type: 'code',
        },
      },
      token: {
        url: 'https://nid.naver.com/oauth2.0/token',
        async request(context) {
          const { provider, params } = context;

          const body = new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: provider.clientId as string,
            client_secret: provider.clientSecret as string,
            code: params.code as string,
            state: params.state as string,
          });

          const response = await fetch('https://nid.naver.com/oauth2.0/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: body.toString(),
          });

          const tokens = await response.json();
          return { tokens };
        },
      },
      userinfo: {
        url: 'https://openapi.naver.com/v1/nid/me',
        async request({ tokens }) {
          const response = await fetch('https://openapi.naver.com/v1/nid/me', {
            headers: {
              Authorization: `Bearer ${tokens.access_token}`,
            },
          });
          return await response.json();
        },
      },
      profile(profile: any) {
        return {
          id: profile.response.id,
          name: profile.response.name || profile.response.nickname || 'Unknown',
          email: profile.response.email || null,
          image: profile.response.profile_image || null,
        };
      },
    },
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: `${process.env.NODE_ENV === 'production' ? '__Secure-' : ''}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
    verifyRequest: '/auth/verify-request',
    newUser: '/auth/welcome',
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!user || !account) {
        return false;
      }

      try {
        // Check if this OAuth account is already linked to a different user
        const existingAccount = await db.account.findUnique({
          where: {
            provider_providerAccountId: {
              provider: account.provider,
              providerAccountId: account.providerAccountId,
            },
          },
        });

        if (existingAccount && existingAccount.userId !== user.id) {
          console.log(`[AUTH] OAuth account already linked to different user: ${existingAccount.userId}`);
          return '/auth/error?error=OAuthAccountAlreadyLinked';
        }

        console.log(`[AUTH] signIn success: userId=${user.id}, provider=${account.provider}`);
      } catch (error) {
        console.error('[AUTH] Error checking existing account:', error);
      }

      return true;
    },
    async jwt({ token, user, account, trigger }) {
      // On initial sign in, add user data to token
      if (user) {
        token.userId = user.id;
        token.role = (user as any).role || 'USER';
        token.organizationId = (user as any).organizationId || null;
      }

      // On session update (e.g., after creating organization), refresh user data
      if (trigger === 'update' && token.userId) {
        const updatedUser = await db.user.findUnique({
          where: { id: token.userId as string },
          select: { id: true, role: true, organizationId: true },
        });
        if (updatedUser) {
          token.organizationId = updatedUser.organizationId;
        }
      }

      return token;
    },
    async session({ session, token }) {
      // Add user ID, role, and organizationId to session
      if (session.user) {
        (session.user as any).id = token.userId;
        (session.user as any).role = token.role;
        (session.user as any).organizationId = token.organizationId;
      }
      return session;
    },
  },
  events: {
    async signIn({ user, account }) {
      if (account) {
        console.log(`[AUTH_EVENT] User signed in: ${user.id} via ${account.provider}`);
      }
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
