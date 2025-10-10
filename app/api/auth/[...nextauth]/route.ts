/**
 * NextAuth.js Route Handler
 *
 * Handles authentication for Connect Platform with Kakao and Naver OAuth.
 * Auth configuration is centralized in lib/auth.config.ts for reusability.
 *
 * See: https://next-auth.js.org/configuration/options
 */

import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth.config';

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };