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
 *
 * User Tracking:
 * - Calls internal API endpoint (Node.js runtime) for Redis tracking
 * - Edge Runtime doesn't support `redis` package directly
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

    // Track active user via internal API (non-blocking, silent fail)
    // Uses fetch to Node.js API route because Edge Runtime doesn't support `redis` package
    if (sessionToken?.value) {
      const trackingUrl = new URL('/api/internal/track-user', request.url);
      fetch(trackingUrl.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-request': 'middleware',
        },
        body: JSON.stringify({ sessionToken: sessionToken.value }),
      }).catch(() => {
        // Silent fail - tracking should never block user requests
      });
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
