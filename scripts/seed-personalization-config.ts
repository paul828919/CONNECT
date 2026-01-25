/**
 * Seed Default Personalization Config
 *
 * Creates the default personalization configuration for production use.
 * Safe to run in production - uses upsert to avoid duplicates.
 *
 * Usage:
 *   npx tsx scripts/seed-personalization-config.ts
 *
 * @module scripts/seed-personalization-config
 */

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient({
  log: ['error', 'warn'],
});

async function main(): Promise<void> {
  console.log('🔧 Seeding default personalization config...\n');

  try {
    // Create default personalization config
    const config = await db.personalization_config.upsert({
      where: { name: 'default' },
      create: {
        name: 'default',
        // Weights (sum to 1.0)
        baseScoreWeight: 0.55,      // 55% base algorithm score
        behavioralWeight: 0.25,     // 25% behavioral preferences
        cfWeight: 0.10,             // 10% collaborative filtering
        contextualWeight: 0.10,     // 10% contextual signals (deadline, etc.)
        // Exploration settings
        explorationSlots: 2,        // 2 slots reserved for exploration
        explorationStrategy: 'epsilon_greedy', // random, epsilon_greedy, ucb
        // Feature flags (all enabled for default)
        enableBehavioral: true,
        enableItemItemCF: true,
        enableContextual: true,
        enableExploration: true,
        // Rollout control
        isActive: true,             // Enabled by default
        trafficPercentage: 100,     // 100% of traffic
        // Metadata
        description: 'Default personalization config for production. Weights: Base=55%, Behavioral=25%, CF=10%, Contextual=10%',
      },
      update: {
        // Only update if it exists and isActive is false (don't override active configs)
        isActive: true,
        trafficPercentage: 100,
      },
    });

    console.log('✅ Default personalization config created/updated:');
    console.log(`   ID: ${config.id}`);
    console.log(`   Name: ${config.name}`);
    console.log(`   Base Score Weight: ${config.baseScoreWeight}`);
    console.log(`   Behavioral Weight: ${config.behavioralWeight}`);
    console.log(`   CF Weight: ${config.cfWeight}`);
    console.log(`   Contextual Weight: ${config.contextualWeight}`);
    console.log(`   Exploration Slots: ${config.explorationSlots}`);
    console.log(`   Active: ${config.isActive}`);
    console.log(`   Traffic: ${config.trafficPercentage}%`);
    console.log('');
  } catch (error) {
    console.error('❌ Failed to seed personalization config:', error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

main();
