/**
 * Next.js Instrumentation Hook
 *
 * This file runs once when the server starts (not on every request)
 * Perfect for initializing scheduled tasks like cache warming
 *
 * Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run on server-side (not in Edge runtime or client)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('[INSTRUMENTATION] Server starting up...');

    // Initialize cache warming scheduler (only in app1 container)
    const { initializeCacheScheduler } = await import('@/lib/cache/init');
    initializeCacheScheduler();

    console.log('[INSTRUMENTATION] Server initialization complete');
  }
}
