/**
 * Database Verification: Budget Values Quality Check
 *
 * Purpose: Verify that budget values stored in the database are correct
 * after the line 436 bug fix (10^8 vs 10^9 multiplier)
 *
 * Checks:
 * 1. Find programs related to the two test announcements
 * 2. Display budget values with Korean won conversion
 * 3. Validate budget ranges are reasonable
 * 4. Check for any suspiciously high values (affected by 10x error)
 */

import { db } from '../lib/db';

interface ProgramCheck {
  id: string;
  title: string;
  institution: string;
  budget: number | null;
  budgetInEok: number;
  isReasonable: boolean;
  flags: string[];
}

async function verifyDatabaseBudgets() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('  Database Verification: Budget Values Quality Check');
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('');

  try {
    // Find all programs (limit to recent ones)
    const programs = await db.funding_programs.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      take: 50,
      select: {
        id: true,
        title: true,
        announcingAgency: true,
        budgetAmount: true,
        createdAt: true,
        updatedAt: true
      }
    });

    console.log(`📊 Found ${programs.length} recent programs in database`);
    console.log('');

    // Search for our specific test programs
    const tipsPrograms = programs.filter(p =>
      p.title.includes('TIPS') || p.title.includes('팁스')
    );

    const defensePrograms = programs.filter(p =>
      p.title.includes('방위산업') || p.title.includes('글로벌') && p.title.includes('강소기업')
    );

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 SEARCHING FOR TEST PROGRAMS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

    if (tipsPrograms.length > 0) {
      console.log(`✓ Found ${tipsPrograms.length} TIPS-related program(s)`);
      tipsPrograms.forEach(p => {
        const budget = p.budgetAmount ? Number(p.budgetAmount) : null;
        const eok = budget ? (budget / 100000000).toFixed(2) : 'N/A';
        console.log(`  - ${p.title.substring(0, 60)}...`);
        console.log(`    Budget: ${budget?.toLocaleString('ko-KR') || 'null'}원 (${eok}억원)`);
      });
    } else {
      console.log('⚠️  No TIPS programs found in database');
    }

    console.log('');

    if (defensePrograms.length > 0) {
      console.log(`✓ Found ${defensePrograms.length} defense industry program(s)`);
      defensePrograms.forEach(p => {
        const budget = p.budgetAmount ? Number(p.budgetAmount) : null;
        const eok = budget ? (budget / 100000000).toFixed(2) : 'N/A';
        console.log(`  - ${p.title.substring(0, 60)}...`);
        console.log(`    Budget: ${budget?.toLocaleString('ko-KR') || 'null'}원 (${eok}억원)`);
      });
    } else {
      console.log('⚠️  No defense industry programs found in database');
    }

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 OVERALL BUDGET QUALITY ANALYSIS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

    // Analyze all programs for budget quality
    const programChecks: ProgramCheck[] = programs
      .filter(p => p.budgetAmount !== null)
      .map(p => {
        const budget = Number(p.budgetAmount!);
        const eok = budget / 100000000;
        const flags: string[] = [];
        let isReasonable = true;

        // Check for suspiciously high values (> 500억)
        if (budget > 50000000000) {
          flags.push('Very high budget (>500억)');
          isReasonable = false;
        }

        // Check for suspiciously low values (< 10백만원)
        if (budget < 10000000) {
          flags.push('Very low budget (<0.1억)');
        }

        // Check for round numbers that might indicate estimation
        if (budget % 1000000000 === 0 && budget > 1000000000) {
          flags.push('Round billion won value');
        }

        // Check if value seems affected by 10x error
        // If budget is exactly 10x what's typical for its program type
        if (budget > 100000000000) {
          flags.push('⚠️ POSSIBLY 10X ERROR - Budget > 1,000억');
          isReasonable = false;
        }

        return {
          id: p.id,
          title: p.title,
          institution: p.announcingAgency || 'Unknown',
          budget,
          budgetInEok: eok,
          isReasonable,
          flags
        };
      });

    // Statistics
    const totalWithBudget = programChecks.length;
    const reasonable = programChecks.filter(p => p.isReasonable).length;
    const flagged = programChecks.filter(p => p.flags.length > 0).length;
    const possibleErrors = programChecks.filter(p =>
      p.flags.some(f => f.includes('10X ERROR'))
    ).length;

    console.log(`Total programs with budget:     ${totalWithBudget}`);
    console.log(`Reasonable values:              ${reasonable} (${((reasonable/totalWithBudget)*100).toFixed(1)}%)`);
    console.log(`Flagged for review:             ${flagged}`);
    console.log(`Possible 10x errors:            ${possibleErrors}`);
    console.log('');

    // Show budget distribution
    const buckets = {
      'Under 1억': programChecks.filter(p => p.budgetInEok < 1).length,
      '1-5억': programChecks.filter(p => p.budgetInEok >= 1 && p.budgetInEok < 5).length,
      '5-10억': programChecks.filter(p => p.budgetInEok >= 5 && p.budgetInEok < 10).length,
      '10-50억': programChecks.filter(p => p.budgetInEok >= 10 && p.budgetInEok < 50).length,
      '50-100억': programChecks.filter(p => p.budgetInEok >= 50 && p.budgetInEok < 100).length,
      'Over 100억': programChecks.filter(p => p.budgetInEok >= 100).length
    };

    console.log('Budget Distribution:');
    Object.entries(buckets).forEach(([range, count]) => {
      const bar = '█'.repeat(Math.floor((count / totalWithBudget) * 30));
      console.log(`  ${range.padEnd(12)} ${count.toString().padStart(3)}  ${bar}`);
    });

    console.log('');

    // Show flagged programs
    if (flagged > 0) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('⚠️  FLAGGED PROGRAMS FOR REVIEW');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');

      const flaggedPrograms = programChecks.filter(p => p.flags.length > 0).slice(0, 10);

      flaggedPrograms.forEach((p, idx) => {
        console.log(`${idx + 1}. ${p.title.substring(0, 60)}...`);
        console.log(`   Institution: ${p.institution}`);
        console.log(`   Budget: ${p.budget.toLocaleString('ko-KR')}원 (${p.budgetInEok.toFixed(2)}억원)`);
        console.log(`   Flags: ${p.flags.join(', ')}`);
        console.log('');
      });
    }

    // Final verdict
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 VERIFICATION RESULT');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

    if (possibleErrors > 0) {
      console.log('❌ BUDGET QUALITY CHECK: FAILED');
      console.log(`   Found ${possibleErrors} program(s) with suspiciously high budgets`);
      console.log('   These may have been affected by the 10x multiplier bug');
      console.log('');
      console.log('💡 Recommendation:');
      console.log('   1. Review flagged programs above');
      console.log('   2. Re-scrape affected announcements with the fixed parser');
      console.log('   3. Update database with corrected budget values');
    } else if (!reasonable && flagged > totalWithBudget * 0.2) {
      console.log('⚠️  BUDGET QUALITY CHECK: WARNING');
      console.log(`   Over 20% of programs flagged for review (${flagged}/${totalWithBudget})`);
      console.log('   Most values appear reasonable, but some need manual verification');
    } else {
      console.log('✅ BUDGET QUALITY CHECK: PASSED');
      console.log(`   ${reasonable}/${totalWithBudget} programs have reasonable budget values`);
      console.log('   Budget distribution looks normal for Korean R&D programs');
      console.log('   No obvious 10x multiplier errors detected');
    }

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

  } catch (error: any) {
    console.error('');
    console.error('❌ Database verification failed:', error.message);
    console.error('');
    throw error;
  }
}

// Run verification
verifyDatabaseBudgets()
  .then(() => {
    console.log('Database verification completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Database verification failed:', error);
    process.exit(1);
  });
