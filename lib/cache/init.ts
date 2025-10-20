/**
 * Cache Initialization Module
 *
 * Initializes cache warming scheduler on app startup
 * Only runs in app1 container to prevent duplicate jobs
 *
 * Phase 3: Cache Optimization - Week 9 Automation
 */

import { startCacheWarmingScheduler } from './cache-warming-scheduler';

let initialized = false;

/**
 * Initialize cache warming scheduler
 *
 * Call this once during app startup (server-side only)
 * Only starts scheduler in app1 container (checks INSTANCE_ID)
 */
export function initializeCacheScheduler() {
  // Prevent multiple initializations
  if (initialized) {
    console.log('[CACHE INIT] Scheduler already initialized, skipping');
    return;
  }

  // Only run in app1 container or scraper container (shared cache, no need for duplicate jobs)
  // Skip only in app2 to prevent duplicate jobs
  const instanceId = process.env.INSTANCE_ID;

  if (instanceId === 'app2') {
    console.log(`[CACHE INIT] Skipping scheduler initialization (instance: ${instanceId})`);
    console.log('[CACHE INIT] Cache warming scheduler only runs in app1 or scraper container');
    return;
  }

  // Only run in production or development (not during build)
  const nodeEnv = process.env.NODE_ENV;

  if (nodeEnv === 'production' || nodeEnv === 'development') {
    try {
      console.log('[CACHE INIT] Initializing cache warming scheduler...');
      console.log(`[CACHE INIT] Environment: ${nodeEnv}`);
      console.log(`[CACHE INIT] Instance: ${instanceId}`);

      startCacheWarmingScheduler();

      initialized = true;
      console.log('✅ [CACHE INIT] Cache warming scheduler initialized successfully');
    } catch (error: any) {
      console.error('❌ [CACHE INIT] Failed to initialize cache scheduler:', error.message);
      console.error('Stack trace:', error.stack);
      // Don't throw - app should still start even if scheduler fails
    }
  } else {
    console.log(`[CACHE INIT] Skipping scheduler in ${nodeEnv} environment`);
  }
}

export default {
  initializeCacheScheduler,
};
