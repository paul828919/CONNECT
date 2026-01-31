/**
 * Ideal Profile Matching A/B Test Script
 * Phase 5.2: Compare v4.4 vs v5.0 algorithm quality
 *
 * Selects representative organizations, runs both algorithms against
 * all active programs, and outputs comparison metrics:
 * - Score distribution (variance, clustering)
 * - Top-10 overlap between algorithms
 * - Rank correlation (Kendall's tau)
 * - Sub-domain differentiation (how many distinct score levels)
 * - False positive analysis
 *
 * Usage:
 *   npx tsx scripts/test-ideal-profile-matching.ts
 *   npx tsx scripts/test-ideal-profile-matching.ts --org-id=xxx   # Test specific org
 *   npx tsx scripts/test-ideal-profile-matching.ts --limit=5      # Limit orgs to test
 */

import { PrismaClient, ProgramStatus, organizations } from '@prisma/client';
import { generateMatches } from '../lib/matching/algorithm';
import { calculateProximityScore } from '../lib/matching/proximity-scorer';
import { generateMatchExplanation } from '../lib/matching/proximity-explainer';
import { IdealApplicantProfile } from '../lib/matching/ideal-profile';

const prisma = new PrismaClient();

// ═══════════════════════════════════════════════════════════════
// CLI Args
// ═══════════════════════════════════════════════════════════════

const args = process.argv.slice(2);
const specificOrgId = args.find(a => a.startsWith('--org-id='))?.split('=')[1];
const orgLimit = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '10', 10);

// ═══════════════════════════════════════════════════════════════
// Metrics
// ═══════════════════════════════════════════════════════════════

interface ComparisonResult {
  orgName: string;
  orgIndustry: string | null;
  programCount: number;

  // Score distributions
  v44Scores: number[];
  v50Scores: number[];

  // Statistics
  v44Mean: number;
  v44StdDev: number;
  v50Mean: number;
  v50StdDev: number;

  // Overlap
  top10Overlap: number;
  top3Overlap: number;

  // Rank correlation
  kendallTau: number;

  // Differentiation
  v44UniqueScoreLevels: number;
  v50UniqueScoreLevels: number;
}

function mean(arr: number[]): number {
  return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

function stdDev(arr: number[]): number {
  const m = mean(arr);
  return arr.length > 0
    ? Math.sqrt(arr.reduce((sum, x) => sum + (x - m) ** 2, 0) / arr.length)
    : 0;
}

function kendallTau(ranks1: string[], ranks2: string[]): number {
  // Simplified: count concordant/discordant pairs
  const n = Math.min(ranks1.length, ranks2.length);
  if (n < 2) return 1;

  // Build rank lookup
  const rank2Map = new Map<string, number>();
  ranks2.forEach((id, i) => rank2Map.set(id, i));

  let concordant = 0;
  let discordant = 0;

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const rank2_i = rank2Map.get(ranks1[i]) ?? n;
      const rank2_j = rank2Map.get(ranks1[j]) ?? n;

      if (rank2_i < rank2_j) concordant++;
      else if (rank2_i > rank2_j) discordant++;
    }
  }

  const total = concordant + discordant;
  return total > 0 ? (concordant - discordant) / total : 0;
}

// ═══════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════

async function main() {
  console.log('🔬 Ideal Profile Matching — A/B Test');
  console.log('═'.repeat(80));
  console.log('Comparing v4.4 (current) vs v5.0 (proximity-based)\n');

  // Fetch organizations
  let orgs: organizations[];

  if (specificOrgId) {
    const org = await prisma.organizations.findUnique({
      where: { id: specificOrgId },
    });
    orgs = org ? [org] : [];
  } else {
    // Select diverse organizations
    orgs = await prisma.organizations.findMany({
      where: {
        profileCompleted: true,
        status: 'ACTIVE',
      },
      take: orgLimit,
      orderBy: { updatedAt: 'desc' },
    });
  }

  if (orgs.length === 0) {
    console.log('❌ No organizations found');
    await prisma.$disconnect();
    return;
  }

  console.log(`📋 Testing ${orgs.length} organizations\n`);

  // Fetch active programs with ideal profiles
  const programs = await prisma.funding_programs.findMany({
    where: { status: ProgramStatus.ACTIVE },
    orderBy: { publishedAt: 'desc' },
  });

  const programsWithProfiles = programs.filter(p => p.idealApplicantProfile !== null);

  console.log(`📡 ${programs.length} active programs, ${programsWithProfiles.length} with ideal profiles\n`);

  if (programsWithProfiles.length === 0) {
    console.log('⚠️  No programs have ideal profiles yet!');
    console.log('   Run: npx tsx scripts/generate-ideal-profiles.ts --no-llm');
    await prisma.$disconnect();
    return;
  }

  // Run comparison for each organization
  const results: ComparisonResult[] = [];

  for (const org of orgs) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`🏢 ${org.name} (${org.industrySector || 'No industry'})`);

    // v4.4: Current algorithm
    const v44Results = generateMatches(org, programs, programs.length, { minimumScore: 0 });
    const v44Scores = v44Results.map(r => r.score);
    const v44Map = new Map(v44Results.map(r => [r.program.id, r.score]));

    // v5.0: Proximity algorithm
    const v50Entries: Array<{ programId: string; score: number; title: string }> = [];

    for (const program of programsWithProfiles) {
      const idealProfile = program.idealApplicantProfile as unknown as IdealApplicantProfile;
      const proxScore = calculateProximityScore(org, idealProfile, program.deadline);

      v50Entries.push({
        programId: program.id,
        score: proxScore.totalScore,
        title: program.title,
      });
    }

    const v50Scores = v50Entries.map(e => e.score);

    // Sort by score for ranking
    const v44Ranked = [...v44Results].sort((a, b) => b.score - a.score);
    const v50Ranked = [...v50Entries].sort((a, b) => b.score - a.score);

    // Top-N overlap
    const v44Top10 = new Set(v44Ranked.slice(0, 10).map(r => r.program.id));
    const v50Top10 = new Set(v50Ranked.slice(0, 10).map(r => r.programId));
    const top10Overlap = Array.from(v44Top10).filter(id => v50Top10.has(id)).length;

    const v44Top3 = new Set(v44Ranked.slice(0, 3).map(r => r.program.id));
    const v50Top3 = new Set(v50Ranked.slice(0, 3).map(r => r.programId));
    const top3Overlap = Array.from(v44Top3).filter(id => v50Top3.has(id)).length;

    // Kendall tau on top 20
    const v44RankIds = v44Ranked.slice(0, 20).map(r => r.program.id);
    const v50RankIds = v50Ranked.slice(0, 20).map(r => r.programId);
    const tau = kendallTau(v44RankIds, v50RankIds);

    // Score differentiation
    const v44UniqueScores = new Set(v44Scores.map(s => Math.round(s))).size;
    const v50UniqueScores = new Set(v50Scores.map(s => Math.round(s))).size;

    const result: ComparisonResult = {
      orgName: org.name,
      orgIndustry: org.industrySector,
      programCount: programsWithProfiles.length,
      v44Scores,
      v50Scores,
      v44Mean: mean(v44Scores),
      v44StdDev: stdDev(v44Scores),
      v50Mean: mean(v50Scores),
      v50StdDev: stdDev(v50Scores),
      top10Overlap,
      top3Overlap,
      kendallTau: tau,
      v44UniqueScoreLevels: v44UniqueScores,
      v50UniqueScoreLevels: v50UniqueScores,
    };
    results.push(result);

    // Print per-org results
    console.log(`  v4.4: mean=${result.v44Mean.toFixed(1)}, σ=${result.v44StdDev.toFixed(1)}, unique scores=${result.v44UniqueScoreLevels}`);
    console.log(`  v5.0: mean=${result.v50Mean.toFixed(1)}, σ=${result.v50StdDev.toFixed(1)}, unique scores=${result.v50UniqueScoreLevels}`);
    console.log(`  Top-3 overlap: ${top3Overlap}/3 | Top-10 overlap: ${top10Overlap}/10`);
    console.log(`  Kendall τ (top-20): ${tau.toFixed(3)}`);

    // Show top-5 from each algorithm
    console.log(`\n  v4.4 Top-5:`);
    for (const r of v44Ranked.slice(0, 5)) {
      const v50Score = v50Entries.find(e => e.programId === r.program.id)?.score ?? '—';
      console.log(`    [${r.score}] ${r.program.title.slice(0, 60)}  (v5.0: ${v50Score})`);
    }

    console.log(`  v5.0 Top-5:`);
    for (const r of v50Ranked.slice(0, 5)) {
      const v44Score = v44Map.get(r.programId) ?? '—';
      console.log(`    [${r.score}] ${r.title.slice(0, 60)}  (v4.4: ${v44Score})`);
    }

    // Show biggest score divergences
    const divergences: Array<{ title: string; v44: number; v50: number; delta: number }> = [];
    for (const v50Entry of v50Entries) {
      const v44Score = v44Map.get(v50Entry.programId);
      if (v44Score !== undefined) {
        divergences.push({
          title: v50Entry.title,
          v44: v44Score,
          v50: v50Entry.score,
          delta: v50Entry.score - v44Score,
        });
      }
    }

    const biggestDivergences = [...divergences]
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 5);

    if (biggestDivergences.length > 0) {
      console.log(`\n  Biggest Score Divergences:`);
      for (const d of biggestDivergences) {
        const arrow = d.delta > 0 ? '↑' : '↓';
        console.log(`    ${arrow}${Math.abs(d.delta).toFixed(0)} | v4.4:${d.v44} → v5.0:${d.v50} | ${d.title.slice(0, 50)}`);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Aggregate Metrics
  // ═══════════════════════════════════════════════════════════════

  console.log('\n\n📊 AGGREGATE METRICS');
  console.log('═'.repeat(80));

  const avgV44Mean = mean(results.map(r => r.v44Mean));
  const avgV50Mean = mean(results.map(r => r.v50Mean));
  const avgV44StdDev = mean(results.map(r => r.v44StdDev));
  const avgV50StdDev = mean(results.map(r => r.v50StdDev));
  const avgTop3Overlap = mean(results.map(r => r.top3Overlap));
  const avgTop10Overlap = mean(results.map(r => r.top10Overlap));
  const avgTau = mean(results.map(r => r.kendallTau));
  const avgV44Unique = mean(results.map(r => r.v44UniqueScoreLevels));
  const avgV50Unique = mean(results.map(r => r.v50UniqueScoreLevels));

  console.log(`\n  Metric                      v4.4        v5.0        Assessment`);
  console.log('  ' + '─'.repeat(70));
  console.log(`  Avg Score Mean              ${avgV44Mean.toFixed(1).padStart(6)}      ${avgV50Mean.toFixed(1).padStart(6)}`);
  console.log(`  Avg Score StdDev            ${avgV44StdDev.toFixed(1).padStart(6)}      ${avgV50StdDev.toFixed(1).padStart(6)}      ${avgV50StdDev > avgV44StdDev ? '✅ Better distribution' : '⚠️ Less variance'}`);
  console.log(`  Avg Unique Score Levels     ${avgV44Unique.toFixed(1).padStart(6)}      ${avgV50Unique.toFixed(1).padStart(6)}      ${avgV50Unique > avgV44Unique ? '✅ More differentiated' : '⚠️ Less differentiated'}`);
  console.log(`  Avg Top-3 Overlap           ${avgTop3Overlap.toFixed(1).padStart(6)}/3`);
  console.log(`  Avg Top-10 Overlap          ${avgTop10Overlap.toFixed(1).padStart(6)}/10`);
  console.log(`  Avg Kendall τ (top-20)      ${avgTau.toFixed(3).padStart(6)}                  ${avgTau > 0.5 ? '✅ Reasonable correlation' : avgTau > 0.2 ? '⚠️ Low correlation' : '❌ Very different rankings'}`);

  // Quality targets
  console.log('\n\n🎯 QUALITY TARGETS');
  console.log('═'.repeat(80));
  console.log(`  Score Variance:        ${avgV50StdDev > avgV44StdDev ? '✅ PASS' : '❌ FAIL'} — v5.0 should show wider distribution`);
  console.log(`  Sub-domain Differentiation: ${avgV50Unique > avgV44Unique ? '✅ PASS' : '❌ FAIL'} — More distinct score levels`);
  console.log(`  Rank Stability:        ${avgTop3Overlap >= 1 ? '✅ PASS' : '❌ FAIL'} — Top-3 from v4.4 should appear in v5.0 top-10`);
  console.log(`  Kendall τ > 0.2:       ${avgTau > 0.2 ? '✅ PASS' : '⚠️ WARNING'} — Reasonable rank correlation expected`);

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error('Error:', error);
  await prisma.$disconnect();
});
