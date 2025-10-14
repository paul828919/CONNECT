/**
 * Test Script for Enhanced Matching Algorithm v2.0
 *
 * Tests the improvements in Phase 3B:
 * - Korean keyword normalization and taxonomy matching
 * - Graduated TRL scoring
 * - Cross-industry relevance
 * - Technology keyword matching for research institutes
 */

import { PrismaClient } from '@prisma/client';
import { generateMatches } from '../lib/matching/algorithm';
import { generateExplanation } from '../lib/matching/explainer';

const prisma = new PrismaClient();

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 Testing Enhanced Matching Algorithm v2.0');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  // 1. Fetch test organizations
  const organizations = await prisma.organizations.findMany({
    where: { status: 'ACTIVE' },
  });

  console.log(`✓ Found ${organizations.length} test organizations`);
  console.log('');

  // 2. Fetch active funding programs
  const programs = await prisma.funding_programs.findMany({
    where: {
      status: 'ACTIVE',
      deadline: { gte: new Date() }, // Only future deadlines
    },
  });

  console.log(`✓ Found ${programs.length} active funding programs`);
  console.log('');

  if (organizations.length === 0 || programs.length === 0) {
    console.log('⚠️  No test data found. Please run `npm run db:seed` first.');
    return;
  }

  // 3. Test matching for each organization
  for (const org of organizations) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📊 Testing Matches for: ${org.name}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log(`Organization Type: ${org.type}`);
    console.log(`Industry Sector: ${org.industrySector || 'N/A'}`);
    console.log(`TRL: ${org.technologyReadinessLevel || 'N/A'}`);
    console.log(`R&D Experience: ${org.rdExperience ? 'Yes' : 'No'}`);

    if (org.researchFocusAreas && org.researchFocusAreas.length > 0) {
      console.log(`Research Focus: ${org.researchFocusAreas.join(', ')}`);
    }

    if (org.keyTechnologies && org.keyTechnologies.length > 0) {
      console.log(`Key Technologies: ${org.keyTechnologies.join(', ')}`);
    }

    console.log('');

    // Generate matches
    const matches = generateMatches(org, programs, 5); // Top 5 matches

    if (matches.length === 0) {
      console.log('❌ No matches found');
      console.log('');
      continue;
    }

    console.log(`✅ Generated ${matches.length} matches\n`);

    // Display each match with details
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const program = match.program;

      console.log(`${i + 1}. ${program.title}`);
      console.log(`   Agency: ${program.agencyId}`);
      console.log(`   Score: ${match.score}/100`);
      console.log('');
      console.log('   Score Breakdown:');
      console.log(`   - Industry/Keywords: ${match.breakdown.industryScore}/30`);
      console.log(`   - TRL Compatibility: ${match.breakdown.trlScore}/20`);
      console.log(`   - Organization Type: ${match.breakdown.typeScore}/20`);
      console.log(`   - R&D Experience: ${match.breakdown.rdScore}/15`);
      console.log(`   - Deadline Proximity: ${match.breakdown.deadlineScore}/15`);
      console.log('');

      // Generate Korean explanation
      const explanation = generateExplanation(match, org, program);

      console.log('   Summary:');
      console.log(`   ${explanation.summary}`);
      console.log('');

      if (explanation.reasons.length > 0) {
        console.log('   Reasons:');
        explanation.reasons.forEach((reason) => {
          console.log(`   • ${reason}`);
        });
        console.log('');
      }

      if (explanation.warnings && explanation.warnings.length > 0) {
        console.log('   Warnings:');
        explanation.warnings.forEach((warning) => {
          console.log(`   ⚠️  ${warning}`);
        });
        console.log('');
      }

      if (explanation.recommendations && explanation.recommendations.length > 0) {
        console.log('   Recommendations:');
        explanation.recommendations.forEach((rec) => {
          console.log(`   → ${rec}`);
        });
        console.log('');
      }

      console.log('   Raw Reason Codes:', match.reasons.join(', '));
      console.log('');
    }

    console.log('');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Enhanced matching algorithm test complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  // 4. Show improvement comparison
  console.log('📈 Algorithm Enhancements (v2.0 vs v1.0):');
  console.log('');
  console.log('✓ Korean keyword normalization (spacing, case-insensitive)');
  console.log('✓ Hierarchical industry taxonomy (9 sectors, 30+ sub-sectors)');
  console.log('✓ Cross-industry relevance scoring (e.g., ICT + Manufacturing = 0.8)');
  console.log('✓ Graduated TRL scoring (±1: 12-15pts, ±2: 6-10pts, ±3: 0-5pts)');
  console.log('✓ Technology keyword matching for research institutes');
  console.log('✓ Enhanced Korean explanations for new reason codes');
  console.log('');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
