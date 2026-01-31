/**
 * A/B Test Script: v4.3 vs v6.0 Funnel
 *
 * Runs both algorithms against real production data and compares results.
 * Outputs score distributions, rank correlation, and specific program analysis.
 *
 * Usage:
 *   # Single org:
 *   ORG_ID=<uuid> npx tsx scripts/ab-test-v6.ts
 *
 *   # All orgs with completed profiles (top 10):
 *   npx tsx scripts/ab-test-v6.ts
 *
 * Prerequisites:
 * - Database connection (DATABASE_URL in .env)
 * - No Redis required (bypasses cache)
 */

import { PrismaClient, ProgramStatus, AnnouncementType } from '@prisma/client';
import { generateMatches } from '../lib/matching/algorithm';
import { generateMatchesV6 } from '../lib/matching/v6/funnel';

const prisma = new PrismaClient({ log: ['error'] });

async function runComparison(org: any, programs: any[], limit: number) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Organization: ${org.name} (${org.industrySector || 'N/A'})`);
  console.log(`${'─'.repeat(60)}`);

  const v4 = generateMatches(org, programs, limit, { minimumScore: 0 });
  const v6 = generateMatchesV6(org, programs, limit, { minimumScore: 0 });

  // Score distributions
  const v4Scores = v4.map(r => r.score);
  const v6Scores = v6.map(r => r.score);
  const v4Avg = v4Scores.length > 0 ? (v4Scores.reduce((a, b) => a + b, 0) / v4Scores.length).toFixed(1) : 'N/A';
  const v6Avg = v6Scores.length > 0 ? (v6Scores.reduce((a, b) => a + b, 0) / v6Scores.length).toFixed(1) : 'N/A';

  console.log(`\n  v4.3: ${v4.length} matches, avg score: ${v4Avg} (range: ${v4Scores.length > 0 ? `${Math.min(...v4Scores)}-${Math.max(...v4Scores)}` : 'N/A'})`);
  console.log(`  v6.0: ${v6.length} matches, avg score: ${v6Avg} (range: ${v6Scores.length > 0 ? `${Math.min(...v6Scores)}-${Math.max(...v6Scores)}` : 'N/A'})`);

  // Top-3 overlap
  const v4Top3 = new Set(v4.slice(0, 3).map(r => r.programId));
  const v6Top3 = new Set(v6.slice(0, 3).map(r => r.programId));
  const top3Overlap = Array.from(v4Top3).filter(id => v6Top3.has(id)).length;
  console.log(`  Top-3 overlap: ${top3Overlap}/3`);

  // Detailed comparison
  console.log('\n  v4.3 Top 5:');
  for (const r of v4.slice(0, 5)) {
    const inV6 = v6.find(v => v.programId === r.programId);
    const v6Score = inV6 ? inV6.score : 'FILTERED';
    const delta = inV6 ? `${inV6.score - r.score > 0 ? '+' : ''}${inV6.score - r.score}` : 'N/A';
    console.log(`    [${r.score}] ${r.program.title.slice(0, 45)} → v6: ${v6Score} (Δ${delta})`);
  }

  console.log('\n  v6.0 Top 5:');
  for (const r of v6.slice(0, 5)) {
    const inV4 = v4.find(v => v.programId === r.programId);
    const v4Score = inV4 ? inV4.score : 'FILTERED';
    console.log(`    [${r.score}] ${r.program.title.slice(0, 45)} (v4: ${v4Score})`);
    if (r.v6Details) {
      const { semantic, practical } = r.v6Details;
      console.log(`      S2: dom=${semantic.breakdown.domainRelevance} cap=${semantic.breakdown.capabilityFit} int=${semantic.breakdown.intentAlignment} neg=${semantic.breakdown.negativeSignals} conf=${semantic.breakdown.confidenceBonus} | total=${semantic.score}`);
      console.log(`      S3: trl=${practical.breakdown.trlAlignment} scale=${practical.breakdown.scaleFit} rd=${practical.breakdown.rdTrack} dl=${practical.breakdown.deadlineUrgency} cert=${practical.breakdown.certificationBonus} | total=${practical.score}`);
    }
  }

  // False positive analysis
  const v6ProgramIds = new Set(v6.map(r => r.programId));
  const falsePositives = v4.filter(r => r.score >= 55 && !v6ProgramIds.has(r.programId));
  if (falsePositives.length > 0) {
    console.log(`\n  ⚠ Programs in v4 (≥55) but filtered/below in v6 (${falsePositives.length}):`);
    for (const fp of falsePositives.slice(0, 5)) {
      console.log(`    [v4: ${fp.score}] ${fp.program.title.slice(0, 50)}`);
    }
  }

  return { v4Count: v4.length, v6Count: v6.length, top3Overlap };
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  v4.3 vs v6.0 Funnel A/B Comparison');
  console.log('═══════════════════════════════════════════════════════════');

  const orgId = process.env.ORG_ID || process.argv[2];
  const limit = Number(process.env.LIMIT || 10);

  // Fetch programs
  const programs = await prisma.funding_programs.findMany({
    where: {
      status: ProgramStatus.ACTIVE,
      announcementType: AnnouncementType.R_D_PROJECT,
    },
    orderBy: { publishedAt: 'desc' },
  });

  console.log(`Active programs: ${programs.length}`);

  if (orgId) {
    // Single org mode
    const org = await prisma.organizations.findUnique({
      where: { id: orgId },
      include: { locations: true },
    });

    if (!org) {
      console.error('Organization not found:', orgId);
      process.exit(1);
    }

    await runComparison(org, programs, limit);
  } else {
    // All orgs mode
    const organizations = await prisma.organizations.findMany({
      where: { profileCompleted: true },
      include: { locations: true },
      take: 10,
    });

    if (organizations.length === 0) {
      console.error('No organizations with completed profiles found.');
      process.exit(1);
    }

    console.log(`Organizations: ${organizations.length}\n`);

    let totalTop3Overlap = 0;
    for (const org of organizations) {
      const result = await runComparison(org, programs, limit);
      totalTop3Overlap += result.top3Overlap;
    }

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`  Average top-3 overlap: ${(totalTop3Overlap / organizations.length).toFixed(1)}/3`);
    console.log(`${'═'.repeat(60)}`);
  }

  console.log('\nA/B test complete.\n');
}

main()
  .catch(err => {
    console.error('A/B test failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
