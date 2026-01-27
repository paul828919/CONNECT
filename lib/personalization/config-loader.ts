/**
 * Personalization Config Loader
 *
 * Loads the active personalization configuration from the database.
 * Used by the match generation pipeline to determine whether personalization
 * is enabled and which weights/features to use.
 *
 * Design decisions:
 * - DB query (not env var): Allows runtime on/off toggle without redeployment
 * - Graceful degradation: Returns { isActive: false } on error
 * - Single active config: Only one config can be active at a time
 *
 * @module lib/personalization/config-loader
 */

import { db } from '@/lib/db';
import type { PersonalizationConfig } from './personalization-layer';

// ============================================================================
// Types
// ============================================================================

export interface LoadedPersonalizationConfig {
  isActive: boolean;
  config?: PersonalizationConfig;
  configName?: string;
}

// ============================================================================
// Main Function
// ============================================================================

/**
 * Load the active personalization configuration from the database.
 *
 * @returns Active config if found, otherwise { isActive: false }
 *
 * @example
 * ```ts
 * const { isActive, config } = await loadActivePersonalizationConfig();
 * if (isActive && config) {
 *   // Apply personalization with config weights
 * }
 * ```
 */
export async function loadActivePersonalizationConfig(): Promise<LoadedPersonalizationConfig> {
  try {
    const dbConfig = await db.personalization_config.findFirst({
      where: { isActive: true },
    });

    if (!dbConfig) {
      return { isActive: false };
    }

    // Derive exploration positions from slot count (distribute evenly)
    const explorationSlots = dbConfig.enableExploration ? dbConfig.explorationSlots : 0;
    const totalSlots = 10; // Default match list size
    const explorationPositions = Array.from(
      { length: explorationSlots },
      (_, i) => Math.floor((i + 1) * totalSlots / (explorationSlots + 1))
    );

    return {
      isActive: true,
      configName: dbConfig.name,
      config: {
        baseScoreWeight: dbConfig.baseScoreWeight,
        behavioralWeight: dbConfig.behavioralWeight,
        cfWeight: dbConfig.cfWeight,
        contextualWeight: dbConfig.contextualWeight,
        enableBehavioral: dbConfig.enableBehavioral,
        enableCF: dbConfig.enableItemItemCF,
        enableContextual: dbConfig.enableContextual,
        explorationConfig: {
          totalSlots,
          explorationSlots,
          explorationPositions,
          strategy: dbConfig.explorationStrategy as 'random' | 'epsilon_greedy' | 'ucb',
        },
      },
    };
  } catch (error) {
    console.error('[CONFIG_LOADER] Failed to load personalization config:', error);
    // Graceful degradation: personalization disabled on error
    return { isActive: false };
  }
}
