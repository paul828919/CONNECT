/**
 * Next.js Middleware for Route Protection
 *
 * Protects dashboard routes by verifying NextAuth session before allowing access.
 * Runs on the Edge runtime for optimal performance.
 *
 * Protected routes:
 * - /dashboard/* (all dashboard pages require authentication)
 *
 * Public routes (allowed without auth):
 * - / (homepage)
 * - /auth/* (sign-in, sign-out, error pages)
 * - /api/auth/* (NextAuth API routes)
 * - /_next/* (Next.js static assets)
 * - /favicon.ico
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Define protected routes (dashboard pages)
  const isProtectedRoute = pathname.startsWith('/dashboard');

  // If accessing protected route, check for session cookie
  if (isProtectedRoute) {
    // Check for NextAuth session token cookie
    const sessionToken =
      request.cookies.get('next-auth.session-token') ||
      request.cookies.get('__Secure-next-auth.session-token');

    // If no session token, redirect to sign-in
    if (!sessionToken) {
      const signInUrl = new URL('/auth/signin', request.url);
      // Add callback URL to redirect back after sign-in
      signInUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(signInUrl);
    }
  }

  // Allow request to proceed
  return NextResponse.next();
}

// Configure which routes this middleware runs on
export const config = {
  matcher: [
    /*
     * Only run on dashboard routes that need authentication
     */
    '/dashboard/:path*',
  ],
};
