/**
 * Test Script: Compare Match Scoring Between Production and Localhost
 *
 * Purpose: Verify that TRL confidence backfill produces consistent scoring
 *
 * Expected Behavior:
 * - Production (563 inferred): Uses 0.85× multiplier → Lower TRL scores
 * - Localhost (567 explicit): Uses 1.0× multiplier → Higher TRL scores
 *
 * This test will reveal the 3-point scoring difference due to confidence levels.
 */

import { PrismaClient } from '@prisma/client';
import { generateMatches } from '../lib/matching/algorithm';

const db = new PrismaClient();

async function testMatchScoring() {
  console.log('🧪 Match Scoring Comparison Test\n');
  console.log('═'.repeat(80));

  try {
    // Find the test organization (Innowave)
    const organization = await db.organizations.findFirst({
      where: {
        name: '이노웨이브',
        profileCompleted: true
      }
    });

    if (!organization) {
      console.error('❌ Test organization "이노웨이브" not found');
      return;
    }

    console.log('\n📋 Test Organization Profile:\n');
    console.log(`   Name: ${organization.name}`);
    console.log(`   TRL Level: ${organization.technologyReadinessLevel}`);
    console.log(`   Industry: ${organization.industrySector}`);
    console.log(`   R&D Experience: ${organization.rdExperience ? 'Yes' : 'No'}`);

    // Fetch active programs
    const programs = await db.funding_programs.findMany({
      where: {
        status: 'ACTIVE',
        announcementType: 'R_D_PROJECT'
      },
      take: 100 // Test with first 100 programs
    });

    console.log(`\n📊 Testing with ${programs.length} active programs\n`);
    console.log('─'.repeat(80));

    // Check TRL confidence distribution in test set
    const confidenceDistribution = programs.reduce((acc, p) => {
      const conf = p.trlConfidence || 'null';
      acc[conf] = (acc[conf] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('\n📌 TRL Confidence Distribution in Test Set:\n');
    Object.entries(confidenceDistribution).forEach(([conf, count]) => {
      const percentage = ((count / programs.length) * 100).toFixed(1);
      console.log(`   ${conf}: ${count} programs (${percentage}%)`);
    });

    // Generate matches
    console.log('\n─'.repeat(80));
    console.log('\n🔍 Generating Top 5 Matches...\n');

    const matches = generateMatches(organization, programs, 5);

    if (matches.length === 0) {
      console.log('⚠️  No matches generated');
      return;
    }

    console.log(`✅ Generated ${matches.length} matches\n`);
    console.log('═'.repeat(80));

    // Display detailed match breakdown
    matches.forEach((match, index) => {
      const program = match.program;
      console.log(`\n📌 Match #${index + 1}: ${program.title?.substring(0, 60)}...`);
      console.log('─'.repeat(80));
      console.log(`   Total Score: ${match.score}/100`);
      console.log('\n   Score Breakdown:');
      console.log(`   ├─ Industry/Keywords: ${match.breakdown.industryScore}/30`);
      console.log(`   ├─ TRL Compatibility: ${match.breakdown.trlScore}/20`);
      console.log(`   ├─ Organization Type: ${match.breakdown.typeScore}/20`);
      console.log(`   ├─ R&D Experience: ${match.breakdown.rdScore}/15`);
      console.log(`   └─ Deadline Urgency: ${match.breakdown.deadlineScore}/15`);

      console.log('\n   Program TRL Details:');
      console.log(`   ├─ Required TRL Range: ${program.minTrl}-${program.maxTrl}`);
      console.log(`   ├─ TRL Confidence: ${program.trlConfidence || 'null'}`);
      console.log(`   ├─ TRL Inferred: ${program.trlInferred}`);
      console.log(`   └─ Organization TRL: ${organization.technologyReadinessLevel}`);

      // Show the confidence multiplier effect
      if (program.trlConfidence === 'explicit') {
        console.log('\n   💡 Confidence Multiplier: 1.0× (explicit TRL)');
        console.log(`      Base TRL score before multiplier: ${match.breakdown.trlScore}`);
      } else if (program.trlConfidence === 'inferred') {
        console.log('\n   💡 Confidence Multiplier: 0.85× (inferred TRL)');
        const baseScore = match.breakdown.trlScore / 0.85;
        console.log(`      Base TRL score before multiplier: ${baseScore.toFixed(1)}`);
        console.log(`      After 0.85× multiplier: ${match.breakdown.trlScore}`);
      } else if (program.trlConfidence === 'missing') {
        console.log('\n   💡 Confidence Multiplier: 0.7× (missing TRL)');
        const baseScore = match.breakdown.trlScore / 0.7;
        console.log(`      Base TRL score before multiplier: ${baseScore.toFixed(1)}`);
        console.log(`      After 0.7× multiplier: ${match.breakdown.trlScore}`);
      }
    });

    console.log('\n' + '═'.repeat(80));

    // Calculate average scores
    const avgTotal = matches.reduce((sum, m) => sum + m.score, 0) / matches.length;
    const avgTRL = matches.reduce((sum, m) => sum + m.breakdown.trlScore, 0) / matches.length;

    console.log('\n📊 Summary Statistics:\n');
    console.log(`   Average Total Score: ${avgTotal.toFixed(1)}/100`);
    console.log(`   Average TRL Score: ${avgTRL.toFixed(1)}/20`);
    console.log(`   Programs Tested: ${programs.length}`);
    console.log(`   Matches Generated: ${matches.length}`);

    console.log('\n' + '═'.repeat(80));
    console.log('✅ Test Complete\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

// Run test
testMatchScoring().catch(console.error);
