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

    // Track active user via internal API
    // Uses fetch to Node.js API route because Edge Runtime doesn't support `redis` package
    // IMPORTANT: Must await with timeout for Edge Runtime compatibility
    // (fire-and-forget pattern fails in Edge Runtime as execution context ends on return)
    if (sessionToken?.value) {
      // Use internal localhost URL to avoid hairpin NAT through public network
      // Production containers have PORT env (3001/3002), development uses 3000
      // This ensures direct container-to-container communication without DNS/SSL overhead
      const port = process.env.PORT || '3000';
      const trackingUrl = `http://localhost:${port}/api/internal/track-user`;

      const trackingPromise = fetch(trackingUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-request': 'middleware',
        },
        body: JSON.stringify({ sessionToken: sessionToken.value }),
      });

      // Race with 200ms timeout to ensure tracking completes in Edge Runtime
      // but doesn't block user requests for too long
      const timeoutPromise = new Promise<void>((resolve) => setTimeout(resolve, 200));

      await Promise.race([trackingPromise, timeoutPromise]).catch(() => {
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
