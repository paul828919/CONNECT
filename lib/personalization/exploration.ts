/**
 * Exploration Slots Module
 *
 * Injects exploration candidates into personalized results to enable
 * unbiased learning and discovery of user preferences.
 *
 * Design decisions:
 * - Reserved slots at fixed positions (e.g., 3 and 7)
 * - Exploration candidates from lower-ranked results
 * - Marked for tracking (isExploration flag)
 * - Multiple strategies: random, epsilon-greedy, UCB
 *
 * @module lib/personalization/exploration
 */

// ============================================================================
// Types
// ============================================================================

export interface ExplorationConfig {
  totalSlots: number;          // Total items to show (e.g., 10)
  explorationSlots: number;    // Reserved for exploration (e.g., 2)
  explorationPositions: number[]; // Where to insert (e.g., [3, 7])
  strategy: ExplorationStrategy;
}

export type ExplorationStrategy = 'random' | 'epsilon_greedy' | 'ucb';

export interface PersonalizedMatch {
  programId: string;
  score: number;
  personalizedScore: number;
  isExploration?: boolean;
  explorationReason?: string;
}

export interface ExplorationResult {
  finalMatches: PersonalizedMatch[];
  explorationCount: number;
  exploitationCount: number;
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_EXPLORATION_CONFIG: ExplorationConfig = {
  totalSlots: 10,
  explorationSlots: 2,
  explorationPositions: [3, 7], // 0-indexed: positions 4 and 8 in display
  strategy: 'epsilon_greedy',
};

// Epsilon for epsilon-greedy strategy
const EPSILON = 0.1; // 10% chance of pure random

// ============================================================================
// Main Exploration Function
// ============================================================================

/**
 * Inject exploration slots into personalized matches
 *
 * @param rankedMatches - Personalized matches (sorted by score, desc)
 * @param allCandidates - All candidates (including lower-scored)
 * @param config - Exploration configuration
 * @returns Final matches with exploration slots
 *
 * @example
 * ```ts
 * const result = injectExplorationSlots(ranked, candidates, config);
 * // { finalMatches: [...], explorationCount: 2, exploitationCount: 8 }
 * ```
 */
export function injectExplorationSlots(
  rankedMatches: PersonalizedMatch[],
  allCandidates: PersonalizedMatch[],
  config: ExplorationConfig = DEFAULT_EXPLORATION_CONFIG
): ExplorationResult {
  // Validate config
  if (config.explorationSlots > config.totalSlots) {
    throw new Error('explorationSlots cannot exceed totalSlots');
  }

  if (config.explorationPositions.length !== config.explorationSlots) {
    throw new Error('explorationPositions length must match explorationSlots');
  }

  // 1. Take top exploitSlots for exploitation
  const exploitSlots = config.totalSlots - config.explorationSlots;
  const exploitMatches = rankedMatches.slice(0, exploitSlots);
  const exploitIds = new Set(exploitMatches.map(m => m.programId));

  // 2. Select exploration candidates (not in exploit set)
  const explorationPool = allCandidates.filter(
    c => !exploitIds.has(c.programId)
  );

  const explorationPicks = selectExplorationCandidates(
    explorationPool,
    config.explorationSlots,
    config.strategy
  );

  // Mark as exploration
  explorationPicks.forEach(pick => {
    pick.isExploration = true;
    pick.explorationReason = config.strategy;
  });

  // 3. Interleave at specified positions
  const finalMatches = interleaveAtPositions(
    exploitMatches,
    explorationPicks,
    config.explorationPositions
  );

  return {
    finalMatches,
    explorationCount: explorationPicks.length,
    exploitationCount: exploitMatches.length,
  };
}

// ============================================================================
// Candidate Selection Strategies
// ============================================================================

/**
 * Select exploration candidates using configured strategy
 */
function selectExplorationCandidates(
  pool: PersonalizedMatch[],
  count: number,
  strategy: ExplorationStrategy
): PersonalizedMatch[] {
  if (pool.length === 0 || count === 0) {
    return [];
  }

  switch (strategy) {
    case 'random':
      return selectRandom(pool, count);

    case 'epsilon_greedy':
      return selectEpsilonGreedy(pool, count);

    case 'ucb':
      return selectUCB(pool, count);

    default:
      return selectRandom(pool, count);
  }
}

/**
 * Pure random selection
 */
function selectRandom(pool: PersonalizedMatch[], count: number): PersonalizedMatch[] {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Epsilon-greedy: Random with probability ε, else from top of pool
 */
function selectEpsilonGreedy(pool: PersonalizedMatch[], count: number): PersonalizedMatch[] {
  const selected: PersonalizedMatch[] = [];
  const remaining = [...pool];

  while (selected.length < count && remaining.length > 0) {
    const useRandom = Math.random() < EPSILON;

    if (useRandom) {
      // Random selection
      const randomIndex = Math.floor(Math.random() * remaining.length);
      selected.push(remaining.splice(randomIndex, 1)[0]);
    } else {
      // Select from top half (somewhat good but not best)
      const midPoint = Math.floor(remaining.length / 2);
      const topHalf = remaining.slice(0, Math.max(midPoint, 1));
      const randomFromTop = Math.floor(Math.random() * topHalf.length);
      const pick = remaining.splice(randomFromTop, 1)[0];
      selected.push(pick);
    }
  }

  return selected;
}

/**
 * Upper Confidence Bound (UCB) - Simplified version
 * Prefers items with fewer impressions (exploration bonus)
 */
function selectUCB(pool: PersonalizedMatch[], count: number): PersonalizedMatch[] {
  // For a proper UCB, we'd need impression counts per item
  // This is a simplified version that adds randomness to less-seen items
  // In practice, use impression data from recommendation_events

  // Sort by a combination of score and randomness (simulating UCB)
  const withUCB = pool.map(match => ({
    match,
    ucbScore: match.personalizedScore + Math.random() * 20, // Exploration bonus
  }));

  withUCB.sort((a, b) => b.ucbScore - a.ucbScore);

  return withUCB.slice(0, count).map(item => item.match);
}

// ============================================================================
// Interleaving
// ============================================================================

/**
 * Interleave exploration picks at specified positions
 */
function interleaveAtPositions(
  exploitMatches: PersonalizedMatch[],
  explorationPicks: PersonalizedMatch[],
  positions: number[]
): PersonalizedMatch[] {
  const result: PersonalizedMatch[] = [...exploitMatches];
  const sortedPositions = [...positions].sort((a, b) => a - b);

  // Insert exploration picks at specified positions
  for (let i = 0; i < explorationPicks.length && i < sortedPositions.length; i++) {
    const position = sortedPositions[i];
    const adjustedPosition = Math.min(position, result.length);
    result.splice(adjustedPosition, 0, explorationPicks[i]);
  }

  return result;
}

// ============================================================================
// Feature Flag Check
// ============================================================================

/**
 * Check if exploration is enabled (can be controlled via config)
 */
export function isExplorationEnabled(config?: ExplorationConfig): boolean {
  const effectiveConfig = config || DEFAULT_EXPLORATION_CONFIG;
  return effectiveConfig.explorationSlots > 0;
}

/**
 * Disable exploration (for A/B testing control group)
 */
export function createNoExplorationConfig(totalSlots: number): ExplorationConfig {
  return {
    totalSlots,
    explorationSlots: 0,
    explorationPositions: [],
    strategy: 'random',
  };
}
