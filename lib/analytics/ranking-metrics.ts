/**
 * SME Ranking Quality Metrics
 *
 * Provides offline metrics for measuring SME matching algorithm quality:
 * - Precision@K: What fraction of top-K recommendations were saved?
 * - nDCG@K: Position-aware metric penalizing relevant items appearing lower
 *
 * Design decisions (from 8 rounds of expert review):
 * - Position is 1-based (position ∈ {1, 2, 3, ..., N})
 * - Binary relevance (saved = 1, not saved = 0)
 * - 7-day attribution window
 * - Minimum 30 samples for statistical significance
 */

import crypto from 'crypto';

// ============================================================================
// Configuration
// ============================================================================

/**
 * Get algorithm configuration name with stable hash.
 *
 * Format: "{version}-{hash8}"
 * Example: "v2.1-a1b2c3d4"
 *
 * The hash is computed from sorted scoring weights to ensure
 * identical configs produce identical names.
 */
export function getConfigName(
  scoringWeights: Record<string, number>,
  version?: string
): string {
  const ver = version || process.env.MATCHING_SCORING_VERSION || 'v2.1';

  // Stable ordering (sorted keys)
  const sortedWeights = Object.keys(scoringWeights)
    .sort()
    .reduce((acc, key) => ({ ...acc, [key]: scoringWeights[key] }), {});

  const hash = crypto
    .createHash('sha256')
    .update(JSON.stringify(sortedWeights))
    .digest('hex')
    .slice(0, 8);

  return `${ver}-${hash}`;
}

/**
 * Default SME algorithm weights (from sme-algorithm.ts v2.1)
 * Used when weights are not explicitly provided
 */
export const DEFAULT_SME_WEIGHTS: Record<string, number> = {
  companyScale: 20,
  revenueRange: 15,
  employeeCount: 10,
  businessAge: 10,
  region: 10,
  certifications: 5,
  bizType: 28,
  lifecycle: 2,
  industryContent: 30,
  deadline: 15,
  financialRelevance: 2,
  sportType: 3,
};

// ============================================================================
// Precision@K
// ============================================================================

/**
 * Compute Precision@K for a single session.
 *
 * @param savedPositions - Array of 1-based positions where saves occurred
 * @param K - Number of top positions to consider
 * @param generatedCount - Total number of matches generated in session
 * @returns Precision@K value (0.0-1.0) or null if effectiveK is 0
 *
 * Formula:
 *   effectiveK = min(K, generatedCount)
 *   P@K = |{saved items with position ≤ effectiveK}| / effectiveK
 *
 * Example:
 *   savedPositions = [1, 3, 8, 15]  // User saved items at positions 1, 3, 8, 15
 *   K = 5, generatedCount = 20
 *   effectiveK = min(5, 20) = 5
 *   relevantInTopK = 2  // positions 1 and 3 are ≤ 5
 *   P@5 = 2/5 = 0.4
 */
export function generatedPrecisionAtK(
  savedPositions: number[],
  K: number,
  generatedCount: number
): number | null {
  const effectiveK = Math.min(K, generatedCount);
  if (effectiveK === 0) return null;

  // Count saves in top-K (1-based positions)
  const relevantInTopK = savedPositions.filter(
    (pos) => pos >= 1 && pos <= effectiveK
  ).length;

  return relevantInTopK / effectiveK;
}

/**
 * Aggregate Precision@K across multiple sessions.
 *
 * @param sessions - Array of session data with saved positions
 * @param K - Number of top positions to consider
 * @param minSampleSize - Minimum sessions for reliable metric (default: 30)
 * @returns Aggregated P@K or null if insufficient samples
 */
export function aggregatePrecisionAtK(
  sessions: Array<{
    savedPositions: number[];
    generatedCount: number;
  }>,
  K: number,
  minSampleSize: number = 30
): { value: number | null; sampleSize: number; isSufficient: boolean } {
  const validSessions = sessions.filter((s) => s.generatedCount > 0);
  const sampleSize = validSessions.length;

  if (sampleSize === 0) {
    return { value: null, sampleSize: 0, isSufficient: false };
  }

  const precisions = validSessions
    .map((s) => generatedPrecisionAtK(s.savedPositions, K, s.generatedCount))
    .filter((p): p is number => p !== null);

  if (precisions.length === 0) {
    return { value: null, sampleSize, isSufficient: false };
  }

  const avgPrecision = precisions.reduce((a, b) => a + b, 0) / precisions.length;

  return {
    value: avgPrecision,
    sampleSize: precisions.length,
    isSufficient: precisions.length >= minSampleSize,
  };
}

// ============================================================================
// nDCG@K (Normalized Discounted Cumulative Gain)
// ============================================================================

/**
 * Compute DCG@K (Discounted Cumulative Gain).
 *
 * @param savedPositions - Set of 1-based positions where saves occurred
 * @param K - Number of top positions to consider
 * @returns DCG@K value
 *
 * Formula (binary relevance):
 *   DCG@K = Σ_{i=1}^{K} rel_i / log2(i + 1)
 *   where rel_i = 1 if position i is saved, 0 otherwise
 *
 * The log2(i+1) discount penalizes relevant items appearing lower.
 * Position 1: discount = log2(2) = 1.0 (no penalty)
 * Position 2: discount = log2(3) ≈ 1.58
 * Position 10: discount = log2(11) ≈ 3.46
 */
export function dcgAtK(savedPositions: Set<number>, K: number): number {
  let dcg = 0;
  for (let i = 1; i <= K; i++) {
    const rel = savedPositions.has(i) ? 1 : 0;
    dcg += rel / Math.log2(i + 1);
  }
  return dcg;
}

/**
 * Compute IDCG@K (Ideal DCG) - the maximum possible DCG.
 *
 * @param totalSaved - Total number of saved items
 * @param K - Number of top positions to consider
 * @returns IDCG@K value
 *
 * IDCG assumes all relevant items are ranked at the top.
 * For binary relevance with n saves:
 *   IDCG@K = Σ_{i=1}^{min(n, K)} 1 / log2(i + 1)
 */
export function idcgAtK(totalSaved: number, K: number): number {
  let idcg = 0;
  const nRelevant = Math.min(totalSaved, K);
  for (let i = 1; i <= nRelevant; i++) {
    idcg += 1 / Math.log2(i + 1);
  }
  return idcg;
}

/**
 * Compute nDCG@K (conditional on having at least one save).
 *
 * @param savedPositions - Set of 1-based positions where saves occurred
 * @param totalSaved - Total number of saved items (for IDCG)
 * @param K - Number of top positions to consider
 * @returns nDCG@K value (0.0-1.0) or null if no saves
 *
 * Formula:
 *   nDCG@K = DCG@K / IDCG@K
 *
 * Returns null if IDCG is 0 (no saves), which avoids division by zero
 * and indicates the metric is undefined for this session.
 */
export function conditionalNdcgAtK(
  savedPositions: Set<number>,
  totalSaved: number,
  K: number
): number | null {
  const idcg = idcgAtK(totalSaved, K);
  if (idcg === 0) return null; // No saves → metric undefined

  const dcg = dcgAtK(savedPositions, K);
  return dcg / idcg;
}

/**
 * Aggregate nDCG@K across multiple sessions.
 *
 * @param sessions - Array of session data with saved positions
 * @param K - Number of top positions to consider
 * @param minSampleSize - Minimum sessions with saves for reliable metric
 * @returns Aggregated nDCG@K or null if insufficient samples
 */
export function aggregateNdcgAtK(
  sessions: Array<{
    savedPositions: Set<number>;
    totalSaved: number;
  }>,
  K: number,
  minSampleSize: number = 30
): { value: number | null; sampleSize: number; isSufficient: boolean } {
  // Only sessions with at least one save are considered
  const sessionsWithSaves = sessions.filter((s) => s.totalSaved > 0);
  const sampleSize = sessionsWithSaves.length;

  if (sampleSize === 0) {
    return { value: null, sampleSize: 0, isSufficient: false };
  }

  const ndcgs = sessionsWithSaves
    .map((s) => conditionalNdcgAtK(s.savedPositions, s.totalSaved, K))
    .filter((n): n is number => n !== null);

  if (ndcgs.length === 0) {
    return { value: null, sampleSize, isSufficient: false };
  }

  const avgNdcg = ndcgs.reduce((a, b) => a + b, 0) / ndcgs.length;

  return {
    value: avgNdcg,
    sampleSize: ndcgs.length,
    isSufficient: ndcgs.length >= minSampleSize,
  };
}

// ============================================================================
// Hit Rate
// ============================================================================

/**
 * Compute Hit Rate@K - fraction of sessions with at least one save in top-K.
 *
 * @param sessions - Array of session data
 * @param K - Number of top positions to consider
 * @returns Hit rate (0.0-1.0)
 */
export function computeHitRate(
  sessions: Array<{
    savedPositions: number[];
    generatedCount: number;
  }>,
  K: number
): { value: number | null; sampleSize: number } {
  const validSessions = sessions.filter((s) => s.generatedCount > 0);

  if (validSessions.length === 0) {
    return { value: null, sampleSize: 0 };
  }

  const hits = validSessions.filter((s) => {
    const effectiveK = Math.min(K, s.generatedCount);
    return s.savedPositions.some((pos) => pos >= 1 && pos <= effectiveK);
  }).length;

  return {
    value: hits / validSessions.length,
    sampleSize: validSessions.length,
  };
}

// ============================================================================
// Metric Computation from Attribution Data
// ============================================================================

export interface AttributedSave {
  sessionId: string;
  programId: string;
  position: number; // 1-based
  saveAt: Date;
}

export interface SessionMetadata {
  sessionId: string;
  organizationId: string;
  generatedCount: number;
  isCached: boolean;
  configName: string;
  createdAt: Date;
}

export interface ComputedMetrics {
  periodStart: Date;
  periodEnd: Date;
  configName: string;
  precisionAt5: number | null;
  precisionAt10: number | null;
  ndcgAt10: number | null;
  hitRate: number | null;
  sampleSize: number;
  cachedSessionRatio: number | null;
  isSufficientSample: boolean;
  computedAt: Date;
  dataWatermark: Date;
}

/**
 * Compute all ranking metrics from attributed saves.
 *
 * @param sessions - Session metadata with generated counts
 * @param attributedSaves - Saves attributed to sessions
 * @param periodStart - Start of measurement period (KST date)
 * @param periodEnd - End of measurement period (KST date)
 * @param minSampleSize - Minimum sessions for reliable metrics
 * @returns Computed metrics object
 */
export function computeMetricsFromAttribution(
  sessions: SessionMetadata[],
  attributedSaves: AttributedSave[],
  periodStart: Date,
  periodEnd: Date,
  minSampleSize: number = 30
): ComputedMetrics {
  // Group saves by session
  const savesBySession = new Map<string, number[]>();
  for (const save of attributedSaves) {
    if (!savesBySession.has(save.sessionId)) {
      savesBySession.set(save.sessionId, []);
    }
    savesBySession.get(save.sessionId)!.push(save.position);
  }

  // Build session data for metrics
  const sessionData = sessions.map((s) => ({
    savedPositions: savesBySession.get(s.sessionId) || [],
    savedPositionsSet: new Set(savesBySession.get(s.sessionId) || []),
    totalSaved: (savesBySession.get(s.sessionId) || []).length,
    generatedCount: s.generatedCount,
    isCached: s.isCached,
  }));

  // Compute metrics
  const p5 = aggregatePrecisionAtK(sessionData, 5, minSampleSize);
  const p10 = aggregatePrecisionAtK(sessionData, 10, minSampleSize);
  const ndcg10 = aggregateNdcgAtK(
    sessionData.map((s) => ({
      savedPositions: s.savedPositionsSet,
      totalSaved: s.totalSaved,
    })),
    10,
    minSampleSize
  );
  const hr = computeHitRate(sessionData, 10);

  // Cache stats
  const cachedCount = sessionData.filter((s) => s.isCached).length;
  const cachedRatio =
    sessionData.length > 0 ? cachedCount / sessionData.length : null;

  // Determine dominant config name
  const configCounts = new Map<string, number>();
  for (const s of sessions) {
    configCounts.set(s.configName, (configCounts.get(s.configName) || 0) + 1);
  }
  const dominantConfig =
    [...configCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown';

  // Data watermark (latest event time)
  const watermark =
    attributedSaves.length > 0
      ? new Date(
          Math.max(...attributedSaves.map((s) => s.saveAt.getTime()))
        )
      : periodEnd;

  return {
    periodStart,
    periodEnd,
    configName: dominantConfig,
    precisionAt5: p5.value,
    precisionAt10: p10.value,
    ndcgAt10: ndcg10.value,
    hitRate: hr.value,
    sampleSize: sessions.length,
    cachedSessionRatio: cachedRatio,
    isSufficientSample: sessions.length >= minSampleSize,
    computedAt: new Date(),
    dataWatermark: watermark,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Round metric value to 4 decimal places for storage.
 */
export function roundMetric(value: number | null): number | null {
  if (value === null) return null;
  return Math.round(value * 10000) / 10000;
}

/**
 * Convert Date to KST date boundary.
 * Used for period_start and period_end fields.
 */
export function toKSTDate(date: Date): Date {
  // Convert to KST by adding 9 hours offset
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstTime = new Date(date.getTime() + kstOffset);
  // Truncate to date only
  return new Date(kstTime.toISOString().split('T')[0] + 'T00:00:00.000Z');
}

/**
 * Get 7-day rolling window boundaries (KST).
 */
export function get7DayWindow(endDate: Date): { start: Date; end: Date } {
  const end = toKSTDate(endDate);
  const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
  return { start, end };
}
