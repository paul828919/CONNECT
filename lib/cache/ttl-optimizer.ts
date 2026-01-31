/**
 * Cache TTL Optimizer
 * 
 * Dynamic TTL strategies based on data characteristics:
 * - High-change data: Shorter TTL
 * - Stable data: Longer TTL
 * - Time-sensitive data: Smart TTL based on deadline
 * 
 * Phase 3: Cache Optimization
 */

// Base TTL constants (in seconds)
export const BASE_TTL = {
  // Very stable data (rarely changes)
  ORGANIZATION_PROFILE: 2 * 60 * 60,     // 2 hours (was 1 hour)
  
  // Moderately stable data (changes 2-4x daily)
  PROGRAMS: 4 * 60 * 60,                  // 4 hours (was 6 hours - optimized for fresher data)
  
  // Match results (updated after scraping or profile changes)
  MATCH_RESULTS: 12 * 60 * 60,            // 12 hours (scraper runs 2x/day)
  
  // AI-generated content (very expensive, rarely needs regeneration)
  AI_EXPLANATION: 7 * 24 * 60 * 60,       // 7 days (was 24 hours - AI explanations are expensive)
  AI_CHAT: 1 * 60 * 60,                   // 1 hour (chat is contextual, needs freshness)
  
  // Session data
  USER_SESSION: 30 * 60,                  // 30 minutes
  
  // Rate limiting data
  RATE_LIMIT: 60,                         // 1 minute
  
  // Analytics data
  ANALYTICS: 5 * 60,                      // 5 minutes
} as const;

/**
 * Get optimized TTL for AI explanations based on match characteristics
 * 
 * Strategy:
 * - Higher scores get longer TTL (more likely to be accessed repeatedly)
 * - Explanations near deadline get shorter TTL (needs freshness)
 * - Older matches get shorter TTL (may need refresh)
 * 
 * @param matchScore - Match score (0-100)
 * @param programDeadline - Program deadline
 * @param matchCreatedAt - When match was created
 * @returns Optimized TTL in seconds
 */
export function getAIExplanationTTL(
  matchScore: number,
  programDeadline?: Date | null,
  matchCreatedAt?: Date
): number {
  let ttl = BASE_TTL.AI_EXPLANATION;

  // 1. Score-based adjustment
  if (matchScore >= 85) {
    // High-score matches: Extend TTL (users will view repeatedly)
    ttl = ttl * 1.5; // 10.5 days
  } else if (matchScore < 70) {
    // Low-score matches: Reduce TTL (less likely to be accessed)
    ttl = ttl * 0.5; // 3.5 days
  }

  // 2. Deadline-based adjustment
  if (programDeadline) {
    const now = new Date();
    const daysUntilDeadline = Math.ceil(
      (programDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilDeadline <= 7) {
      // Near deadline: Reduce TTL for freshness
      ttl = Math.min(ttl, 2 * 24 * 60 * 60); // Max 2 days
    } else if (daysUntilDeadline <= 30) {
      // Medium urgency
      ttl = Math.min(ttl, 5 * 24 * 60 * 60); // Max 5 days
    }

    if (daysUntilDeadline <= 0) {
      // Past deadline: Very short TTL (likely to be cleaned up soon)
      ttl = 6 * 60 * 60; // 6 hours
    }
  }

  // 3. Age-based adjustment
  if (matchCreatedAt) {
    const matchAge = Date.now() - matchCreatedAt.getTime();
    const daysOld = matchAge / (1000 * 60 * 60 * 24);

    if (daysOld > 30) {
      // Old matches: Reduce TTL (data may be stale)
      ttl = ttl * 0.5;
    }
  }

  // Ensure minimum TTL of 1 day
  return Math.max(ttl, 24 * 60 * 60);
}

/**
 * Get optimized TTL for program cache based on deadline
 * 
 * Programs with closer deadlines need fresher data
 * 
 * @param deadline - Program deadline
 * @returns Optimized TTL in seconds
 */
export function getProgramCacheTTL(deadline?: Date | null): number {
  if (!deadline) {
    // No deadline: Use maximum TTL
    return BASE_TTL.PROGRAMS * 2; // 8 hours
  }

  const now = new Date();
  const daysUntilDeadline = Math.ceil(
    (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysUntilDeadline <= 3) {
    // Critical: Cache for 1 hour only
    return 1 * 60 * 60;
  } else if (daysUntilDeadline <= 7) {
    // Urgent: Cache for 2 hours
    return 2 * 60 * 60;
  } else if (daysUntilDeadline <= 14) {
    // Medium: Cache for 4 hours
    return 4 * 60 * 60;
  } else {
    // Normal: Use base TTL
    return BASE_TTL.PROGRAMS;
  }
}

/**
 * Get optimized TTL for match results based on organization activity
 * 
 * More active organizations get shorter TTL for freshness
 * 
 * @param lastLoginAt - User's last login time
 * @returns Optimized TTL in seconds
 */
export function getMatchResultsTTL(lastLoginAt?: Date | null): number {
  if (!lastLoginAt) {
    // No recent activity: Use maximum TTL
    return BASE_TTL.MATCH_RESULTS;
  }

  const hoursSinceLogin = (Date.now() - lastLoginAt.getTime()) / (1000 * 60 * 60);

  if (hoursSinceLogin < 1) {
    // Active right now: Shorter TTL for freshness
    return 6 * 60 * 60; // 6 hours
  } else if (hoursSinceLogin < 24) {
    // Active today: Medium TTL
    return 12 * 60 * 60; // 12 hours
  } else {
    // Not recently active: Full TTL
    return BASE_TTL.MATCH_RESULTS;
  }
}

/**
 * Get cache priority for preloading/warming
 * 
 * Higher priority = more likely to be accessed
 * 
 * @param matchScore - Match score
 * @param deadline - Program deadline
 * @param lastAccessed - When user last accessed this match
 * @returns Priority score (0-100, higher = more important)
 */
export function getCachePriority(
  matchScore: number,
  deadline?: Date | null,
  lastAccessed?: Date | null
): number {
  let priority = matchScore; // Start with match score (0-100)

  // 1. Deadline urgency
  if (deadline) {
    const now = new Date();
    const daysUntilDeadline = Math.ceil(
      (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilDeadline <= 3) {
      priority += 20; // Urgent
    } else if (daysUntilDeadline <= 7) {
      priority += 10; // Soon
    } else if (daysUntilDeadline <= 30) {
      priority += 5; // Medium term
    }
  }

  // 2. Recent access
  if (lastAccessed) {
    const hoursSinceAccess = (Date.now() - lastAccessed.getTime()) / (1000 * 60 * 60);

    if (hoursSinceAccess < 1) {
      priority += 20; // Very recent
    } else if (hoursSinceAccess < 24) {
      priority += 10; // Today
    } else if (hoursSinceAccess < 24 * 7) {
      priority += 5; // This week
    }
  }

  // Cap at 100
  return Math.min(priority, 100);
}

/**
 * Calculate optimal cache size based on available memory
 * 
 * @param maxMemoryMB - Maximum memory in MB
 * @param averageItemSizeKB - Average cache item size in KB
 * @returns Recommended number of items to cache
 */
export function calculateOptimalCacheSize(
  maxMemoryMB: number = 512,
  averageItemSizeKB: number = 50
): {
  maxItems: number;
  warningThreshold: number;
  criticalThreshold: number;
} {
  const maxMemoryKB = maxMemoryMB * 1024;
  
  // Use 80% of available memory for safety
  const usableMemoryKB = maxMemoryKB * 0.8;
  
  const maxItems = Math.floor(usableMemoryKB / averageItemSizeKB);
  
  return {
    maxItems,
    warningThreshold: Math.floor(maxItems * 0.75), // 75% full
    criticalThreshold: Math.floor(maxItems * 0.9), // 90% full
  };
}

/**
 * Generate cache warming schedule recommendations
 * 
 * @returns Recommended warming schedule
 */
export function getWarmingSchedule(): {
  immediate: string[];
  hourly: string[];
  daily: string[];
  weekly: string[];
} {
  return {
    immediate: [
      'Active programs (after scraper runs)',
      'Organizations active in last hour',
      'Top 5 matches for active users',
    ],
    hourly: [
      'Organizations active today',
      'Programs with deadlines <7 days',
    ],
    daily: [
      'All active organizations (last 7 days)',
      'Top 10 matches for each active org',
    ],
    weekly: [
      'All programs',
      'All organizations (last 30 days)',
      'Cleanup expired cache entries',
    ],
  };
}

/**
 * Get cache statistics thresholds for monitoring
 */
export const CACHE_THRESHOLDS = {
  hitRate: {
    excellent: 80,  // 80%+ hit rate
    good: 60,       // 60-80% hit rate
    warning: 40,    // 40-60% hit rate
    critical: 40,   // <40% hit rate
  },
  memoryUsage: {
    normal: 75,     // <75% memory usage
    warning: 85,    // 75-85% memory usage
    critical: 95,   // >95% memory usage
  },
  itemCount: {
    minimum: 100,   // Should have at least 100 items
    optimal: 1000,  // Optimal: 1000-5000 items
    warning: 5000,  // Warning: >5000 items (review strategy)
  },
} as const;

const ttlOptimizer = {
  BASE_TTL,
  getAIExplanationTTL,
  getProgramCacheTTL,
  getMatchResultsTTL,
  getCachePriority,
  calculateOptimalCacheSize,
  getWarmingSchedule,
  CACHE_THRESHOLDS,
};

export default ttlOptimizer;

