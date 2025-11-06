/**
 * Stage 3.1: Backfill trlConfidence for Existing Programs
 *
 * This script analyzes all existing programs and assigns appropriate
 * trlConfidence values based on how TRL data was determined:
 *
 * Confidence Levels:
 * - 'explicit': TRL explicitly stated in announcement (minTrl/maxTrl set, not inferred)
 * - 'inferred': TRL inferred from Korean keywords (trlInferred = true)
 * - 'missing': No TRL data available (minTrl/maxTrl = null)
 *
 * Impact on Matching Algorithm (lib/matching/trl.ts):
 * - Explicit: 1.0x multiplier (full score, max 20 points)
 * - Inferred: 0.85x multiplier (good confidence, max 17 points)
 * - Missing: 0.7x multiplier (lower confidence, max 14 points)
 *
 * Example:
 * - Program A: Perfect TRL match (20 base points)
 *   - Explicit TRL → 20 * 1.0 = 20 final points
 *   - Inferred TRL → 20 * 0.85 = 17 final points
 *   - Missing TRL → 20 * 0.7 = 14 final points
 */

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function backfillTRLConfidence() {
  console.log('🔄 Stage 3.1: Backfilling trlConfidence for Existing Programs\n');
  console.log('═'.repeat(80));

  try {
    // ============================================================================
    // Step 1: Analyze Current State
    // ============================================================================
    console.log('\n📊 Step 1: Analyzing Current Database State\n');

    const totalPrograms = await db.funding_programs.count();
    const programsWithTRL = await db.funding_programs.count({
      where: {
        minTrl: { not: null },
        maxTrl: { not: null }
      }
    });
    const programsInferred = await db.funding_programs.count({
      where: { trlInferred: true }
    });
    const programsExplicit = await db.funding_programs.count({
      where: {
        minTrl: { not: null },
        maxTrl: { not: null },
        trlInferred: false
      }
    });
    const programsMissing = await db.funding_programs.count({
      where: {
        OR: [
          { minTrl: null },
          { maxTrl: null }
        ]
      }
    });
    const programsWithConfidence = await db.funding_programs.count({
      where: { trlConfidence: { not: null } }
    });

    console.log('   Current State:');
    console.log(`   ├─ Total Programs: ${totalPrograms}`);
    console.log(`   ├─ Programs with TRL data: ${programsWithTRL}`);
    console.log(`   │  ├─ Explicit TRL (not inferred): ${programsExplicit}`);
    console.log(`   │  └─ Inferred TRL (from keywords): ${programsInferred}`);
    console.log(`   ├─ Programs missing TRL: ${programsMissing}`);
    console.log(`   └─ Programs with trlConfidence already set: ${programsWithConfidence}\n`);

    if (totalPrograms === 0) {
      console.log('⚠️  No programs in database. Exiting.');
      return;
    }

    // ============================================================================
    // Step 2: Backfill Strategy
    // ============================================================================
    console.log('─'.repeat(80));
    console.log('\n📋 Step 2: Backfill Strategy\n');
    console.log('   Strategy for assigning trlConfidence:');
    console.log('   1. Explicit: Programs with minTrl/maxTrl AND trlInferred = false');
    console.log('   2. Inferred: Programs with minTrl/maxTrl AND trlInferred = true');
    console.log('   3. Missing: Programs with minTrl = null OR maxTrl = null\n');

    // ============================================================================
    // Step 3: Execute Backfill
    // ============================================================================
    console.log('─'.repeat(80));
    console.log('\n🔧 Step 3: Executing Backfill Updates\n');

    // Update 1: Set 'explicit' for programs with TRL data that wasn't inferred
    const explicitUpdate = await db.funding_programs.updateMany({
      where: {
        minTrl: { not: null },
        maxTrl: { not: null },
        trlInferred: false
      },
      data: {
        trlConfidence: 'explicit'
      }
    });

    console.log(`   ✅ Updated ${explicitUpdate.count} programs to 'explicit'`);

    // Update 2: Set 'inferred' for programs with TRL data that was inferred
    const inferredUpdate = await db.funding_programs.updateMany({
      where: {
        minTrl: { not: null },
        maxTrl: { not: null },
        trlInferred: true
      },
      data: {
        trlConfidence: 'inferred'
      }
    });

    console.log(`   ✅ Updated ${inferredUpdate.count} programs to 'inferred'`);

    // Update 3: Set 'missing' for programs without TRL data
    const missingUpdate = await db.funding_programs.updateMany({
      where: {
        OR: [
          { minTrl: null },
          { maxTrl: null }
        ]
      },
      data: {
        trlConfidence: 'missing'
      }
    });

    console.log(`   ✅ Updated ${missingUpdate.count} programs to 'missing'\n`);

    // ============================================================================
    // Step 4: Verification
    // ============================================================================
    console.log('─'.repeat(80));
    console.log('\n✅ Step 4: Verification\n');

    const afterExplicit = await db.funding_programs.count({
      where: { trlConfidence: 'explicit' }
    });
    const afterInferred = await db.funding_programs.count({
      where: { trlConfidence: 'inferred' }
    });
    const afterMissing = await db.funding_programs.count({
      where: { trlConfidence: 'missing' }
    });
    const afterNull = await db.funding_programs.count({
      where: { trlConfidence: null }
    });

    console.log('   Final Distribution:');
    console.log(`   ├─ Explicit: ${afterExplicit} programs (1.0x multiplier)`);
    console.log(`   ├─ Inferred: ${afterInferred} programs (0.85x multiplier)`);
    console.log(`   ├─ Missing: ${afterMissing} programs (0.7x multiplier)`);
    console.log(`   └─ Null (should be 0): ${afterNull} programs\n`);

    const total = afterExplicit + afterInferred + afterMissing + afterNull;
    if (total !== totalPrograms) {
      console.error(`   ❌ ERROR: Total count mismatch! Expected ${totalPrograms}, got ${total}`);
      throw new Error('Verification failed: count mismatch');
    }

    if (afterNull > 0) {
      console.error(`   ❌ ERROR: ${afterNull} programs still have null trlConfidence!`);
      throw new Error('Verification failed: null values remain');
    }

    console.log('   ✅ PASS: All programs have trlConfidence assigned');
    console.log('   ✅ PASS: Total count matches expected');

    // ============================================================================
    // Step 5: Sample Verification
    // ============================================================================
    console.log('\n' + '─'.repeat(80));
    console.log('\n🔍 Step 5: Sample Programs (5 from each category)\n');

    // Sample explicit programs
    const sampleExplicit = await db.funding_programs.findMany({
      where: { trlConfidence: 'explicit' },
      select: {
        title: true,
        minTrl: true,
        maxTrl: true,
        trlInferred: true,
        trlConfidence: true
      },
      take: 5
    });

    console.log('   📌 Explicit TRL Programs (Full Confidence):');
    sampleExplicit.forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.title.substring(0, 55)}...`);
      console.log(`      TRL: ${p.minTrl}-${p.maxTrl} | Inferred: ${p.trlInferred} | Confidence: ${p.trlConfidence}`);
    });

    // Sample inferred programs
    const sampleInferred = await db.funding_programs.findMany({
      where: { trlConfidence: 'inferred' },
      select: {
        title: true,
        minTrl: true,
        maxTrl: true,
        trlInferred: true,
        trlConfidence: true
      },
      take: 5
    });

    console.log('\n   📌 Inferred TRL Programs (Good Confidence):');
    sampleInferred.forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.title.substring(0, 55)}...`);
      console.log(`      TRL: ${p.minTrl}-${p.maxTrl} | Inferred: ${p.trlInferred} | Confidence: ${p.trlConfidence}`);
    });

    // Sample missing programs
    const sampleMissing = await db.funding_programs.findMany({
      where: { trlConfidence: 'missing' },
      select: {
        title: true,
        minTrl: true,
        maxTrl: true,
        trlInferred: true,
        trlConfidence: true,
        announcementType: true
      },
      take: 5
    });

    console.log('\n   📌 Missing TRL Programs (Lower Confidence):');
    sampleMissing.forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.title.substring(0, 55)}...`);
      console.log(`      TRL: ${p.minTrl}-${p.maxTrl} | Type: ${p.announcementType} | Confidence: ${p.trlConfidence}`);
    });

    // ============================================================================
    // Step 6: Summary
    // ============================================================================
    console.log('\n' + '═'.repeat(80));
    console.log('\n📊 Backfill Summary:\n');
    console.log(`   Total Programs Updated: ${explicitUpdate.count + inferredUpdate.count + missingUpdate.count}`);
    console.log(`   ├─ Explicit (1.0x): ${explicitUpdate.count} programs`);
    console.log(`   ├─ Inferred (0.85x): ${inferredUpdate.count} programs`);
    console.log(`   └─ Missing (0.7x): ${missingUpdate.count} programs\n`);

    console.log('   Impact on Matching Algorithm:');
    console.log('   • Programs with explicit TRL will maintain full scoring (20 pts max)');
    console.log('   • Programs with inferred TRL will receive 85% weight (17 pts max)');
    console.log('   • Programs with missing TRL will receive 70% weight (14 pts max)\n');

    console.log('   Next Steps:');
    console.log('   1. ✅ Stage 3.1 complete - trlConfidence backfilled');
    console.log('   2. ⏳ Stage 3.2 - Update parsers to populate trlConfidence for new programs');
    console.log('   3. ⏳ Stage 3.3 - Test with Kim Byung-jin profile');
    console.log('   4. ⏳ Stage 3.4 - Deploy to production\n');

    console.log('═'.repeat(80));
    console.log('✅ Stage 3.1 Complete!\n');

  } catch (error: any) {
    console.error('\n❌ Backfill failed:', error.message);
    console.error('Stack trace:', error.stack);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

// Execute backfill
backfillTRLConfidence().catch(console.error);
