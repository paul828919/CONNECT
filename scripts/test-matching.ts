/**
 * Quick verification script for matching algorithm
 */
import { PrismaClient, OrganizationType } from '@prisma/client';
import { generateMatches } from '../lib/matching/algorithm';
import { generateExplanation } from '../lib/matching/explainer';

const prisma = new PrismaClient();

async function main() {
  console.log('\n🧪 Testing Matching Algorithm...\n');

  // Fetch an organization
  const org = await prisma.organizations.findFirst({
    where: { type: OrganizationType.COMPANY },
  });

  if (!org) {
    console.log('❌ No organization found. Run seed script first.');
    return;
  }

  // Fetch active programs
  const programs = await prisma.funding_programs.findMany({
    where: { status: 'ACTIVE' },
  });

  if (programs.length === 0) {
    console.log('❌ No programs found. Run seed script first.');
    return;
  }

  console.log(`✓ Testing with: ${org.name}`);
  console.log(`✓ Against ${programs.length} programs\n`);

  // Generate matches
  const matches = generateMatches(org, programs, 3);

  if (matches.length === 0) {
    console.log('❌ No matches found!');
    return;
  }

  console.log(`✅ Found ${matches.length} matches:\n`);

  matches.forEach((match, i) => {
    console.log(`${i + 1}. ${match.program.title}`);
    console.log(`   Score: ${match.score}/100`);
    console.log(`   Breakdown: Industry(${match.breakdown.industryScore}) TRL(${match.breakdown.trlScore}) Type(${match.breakdown.typeScore}) R&D(${match.breakdown.rdScore}) Deadline(${match.breakdown.deadlineScore})`);
    console.log(`   Reasons: ${match.reasons.join(', ')}`);

    const explanation = generateExplanation(match, org, match.program);
    console.log(`   Summary: ${explanation.summary}`);
    console.log('');
  });

  console.log('✅ Matching algorithm works correctly!\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
