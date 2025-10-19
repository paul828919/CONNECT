/**
 * NextAuth.js Configuration
 *
 * Centralized auth configuration for Connect Platform:
 * - Kakao OAuth
 * - Naver OAuth
 * - JWT sessions
 * - Database user storage
 *
 * See: https://next-auth.js.org/configuration/options
 */

import { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { db } from '@/lib/db';


export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
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
          const { provider, params, checks } = context;

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
  secret: process.env.NEXTAUTH_SECRET,
};
