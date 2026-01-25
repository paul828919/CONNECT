/**
 * Metrics Collector Module
 *
 * Collects and tracks personalization performance metrics:
 * - Processing times (per request)
 * - Score distributions (base vs personalized)
 * - Cold start ratios
 * - Click-through and save rates
 *
 * Uses in-memory accumulation with periodic flush to reduce DB writes.
 *
 * @module lib/personalization/metrics-collector
 */

import { ColdStartStatus } from '@prisma/client';

// ============================================================================
// Types
// ============================================================================

export interface ProcessingMetric {
  organizationId: string;
  processingTimeMs: number;
  coldStartStatus: ColdStartStatus;
  matchCount: number;
  avgBaseScore: number;
  avgPersonalizedScore: number;
  explorationCount: number;
}

export interface ScoreDistribution {
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
}

export interface MetricsSnapshot {
  timestamp: Date;
  configName: string;

  // Processing
  requestCount: number;
  avgProcessingTimeMs: number;
  p95ProcessingTimeMs: number;

  // Cold start breakdown
  coldStartBreakdown: {
    fullCold: number;
    partialCold: number;
    warm: number;
  };

  // Score metrics
  avgBaseScore: number;
  avgPersonalizedScore: number;
  avgScoreLift: number;

  // Exploration
  totalExplorationSlots: number;
}

// ============================================================================
// In-Memory Accumulator
// ============================================================================

class MetricsAccumulator {
  private metrics: ProcessingMetric[] = [];
  private configName: string = 'default';
  private flushInterval: NodeJS.Timeout | null = null;
  private readonly maxBufferSize = 1000;
  private readonly flushIntervalMs = 60 * 1000; // 1 minute

  constructor() {
    // Start periodic flush in production
    if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
      this.startPeriodicFlush();
    }
  }

  /**
   * Record a processing metric
   */
  record(metric: ProcessingMetric): void {
    this.metrics.push(metric);

    // Flush if buffer is full
    if (this.metrics.length >= this.maxBufferSize) {
      this.flush();
    }
  }

  /**
   * Set the current config name for metrics attribution
   */
  setConfigName(name: string): void {
    this.configName = name;
  }

  /**
   * Get current metrics snapshot
   */
  getSnapshot(): MetricsSnapshot | null {
    if (this.metrics.length === 0) {
      return null;
    }

    const processingTimes = this.metrics.map(m => m.processingTimeMs).sort((a, b) => a - b);
    const baseScores = this.metrics.map(m => m.avgBaseScore);
    const personalizedScores = this.metrics.map(m => m.avgPersonalizedScore);

    const coldStartBreakdown = {
      fullCold: this.metrics.filter(m => m.coldStartStatus === 'FULL_COLD').length,
      partialCold: this.metrics.filter(m => m.coldStartStatus === 'PARTIAL_COLD').length,
      warm: this.metrics.filter(m => m.coldStartStatus === 'WARM').length,
    };

    const avgBaseScore = average(baseScores);
    const avgPersonalizedScore = average(personalizedScores);

    return {
      timestamp: new Date(),
      configName: this.configName,
      requestCount: this.metrics.length,
      avgProcessingTimeMs: average(processingTimes),
      p95ProcessingTimeMs: percentile(processingTimes, 95),
      coldStartBreakdown,
      avgBaseScore,
      avgPersonalizedScore,
      avgScoreLift: avgPersonalizedScore - avgBaseScore,
      totalExplorationSlots: sum(this.metrics.map(m => m.explorationCount)),
    };
  }

  /**
   * Flush metrics (for periodic persistence)
   */
  flush(): MetricsSnapshot | null {
    const snapshot = this.getSnapshot();
    this.metrics = [];
    return snapshot;
  }

  /**
   * Start periodic flush timer
   */
  private startPeriodicFlush(): void {
    this.flushInterval = setInterval(() => {
      const snapshot = this.flush();
      if (snapshot) {
        console.log('[METRICS] Flushed metrics snapshot:', {
          configName: snapshot.configName,
          requestCount: snapshot.requestCount,
          avgProcessingTimeMs: snapshot.avgProcessingTimeMs.toFixed(2),
        });
      }
    }, this.flushIntervalMs);
  }

  /**
   * Stop periodic flush (for cleanup)
   */
  stop(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let metricsAccumulator: MetricsAccumulator | null = null;

/**
 * Get the metrics accumulator singleton
 */
export function getMetricsAccumulator(): MetricsAccumulator {
  if (!metricsAccumulator) {
    metricsAccumulator = new MetricsAccumulator();
  }
  return metricsAccumulator;
}

/**
 * Record a processing metric (convenience function)
 */
export function recordProcessingMetric(metric: ProcessingMetric): void {
  getMetricsAccumulator().record(metric);
}

/**
 * Set the active config name for metrics attribution
 */
export function setActiveConfigName(name: string): void {
  getMetricsAccumulator().setConfigName(name);
}

/**
 * Get current metrics snapshot
 */
export function getMetricsSnapshot(): MetricsSnapshot | null {
  return getMetricsAccumulator().getSnapshot();
}

/**
 * Flush metrics and reset accumulator
 */
export function flushMetrics(): MetricsSnapshot | null {
  return getMetricsAccumulator().flush();
}

// ============================================================================
// Position Debiasing Utilities
// ============================================================================

/**
 * Position bias correction factors
 * Based on cascade model: P(click | position k) ∝ 1/k^α
 * α ≈ 1.0 is typical for recommendation lists
 */
const POSITION_BIAS_FACTORS: Record<number, number> = {
  1: 1.0,    // Position 1 = baseline
  2: 0.85,
  3: 0.72,
  4: 0.62,
  5: 0.53,
  6: 0.46,
  7: 0.40,
  8: 0.35,
  9: 0.31,
  10: 0.27,
};

/**
 * Get position bias factor for debiased rate calculation
 */
export function getPositionBiasFactor(position: number): number {
  if (position <= 0) return 1.0;
  if (position > 10) return 0.25; // Minimal visibility beyond 10
  return POSITION_BIAS_FACTORS[position] || 0.25;
}

/**
 * Compute position-debiased rate
 *
 * @param events - Array of events with position
 * @param eventType - Type to count (e.g., 'CLICK', 'SAVE')
 * @returns Debiased rate
 */
export function computeDebiasedRate(
  events: Array<{ position: number; eventType: string }>,
  targetType: string
): number {
  if (events.length === 0) return 0;

  // Weight each event by inverse position bias
  let weightedPositives = 0;
  let totalWeight = 0;

  for (const event of events) {
    const weight = 1 / getPositionBiasFactor(event.position);
    totalWeight += weight;

    if (event.eventType === targetType) {
      weightedPositives += weight;
    }
  }

  return totalWeight > 0 ? weightedPositives / totalWeight : 0;
}

// ============================================================================
// Utility Functions
// ============================================================================

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return sum(values) / values.length;
}

function sum(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0);
}

function percentile(sortedValues: number[], p: number): number {
  if (sortedValues.length === 0) return 0;
  const index = Math.ceil((p / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(0, Math.min(index, sortedValues.length - 1))];
}

// ============================================================================
// Timer Utility for Processing Time Measurement
// ============================================================================

/**
 * Create a timer for measuring processing time
 *
 * @example
 * ```ts
 * const timer = createTimer();
 * // ... do work ...
 * const elapsedMs = timer.elapsed();
 * ```
 */
export function createTimer(): { elapsed: () => number } {
  const start = performance.now();
  return {
    elapsed: () => performance.now() - start,
  };
}

/**
 * Wrap an async function with timing measurement
 */
export async function withTiming<T>(
  fn: () => Promise<T>,
  onComplete: (elapsedMs: number) => void
): Promise<T> {
  const timer = createTimer();
  const result = await fn();
  onComplete(timer.elapsed());
  return result;
}
