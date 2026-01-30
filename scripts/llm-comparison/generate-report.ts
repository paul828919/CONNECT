/**
 * LLM Comparison Report Generator
 *
 * Takes output from run-comparison.ts and generates a detailed
 * Haiku vs Opus quality comparison report.
 *
 * Run: npx tsx scripts/llm-comparison/generate-report.ts [--input=FILE]
 *
 * Default input: /tmp/llm-comparison-results.json
 * Output: /tmp/llm-comparison-report.json + console summary
 */

import * as fs from 'fs';
import { ModelResult, ModelSummary, ComparisonReport, ProgramComparison } from './types';

const KRW_PER_USD = 1300;

async function main() {
  const args = process.argv.slice(2);
  const inputArg = args.find((a) => a.startsWith('--input='));
  const inputPath = inputArg?.split('=')[1] || '/tmp/llm-comparison-results.json';
  const outputPath = inputPath.replace('-results.json', '-report.json');

  console.log('=== LLM Comparison Report Generator ===\n');
  console.log(`Input: ${inputPath}`);
  console.log(`Output: ${outputPath}\n`);

  if (!fs.existsSync(inputPath)) {
    console.error(`Input file not found: ${inputPath}`);
    console.error('Run run-comparison.ts first to generate results.');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
  const results: ModelResult[] = data.results;

  // Group by program
  const byProgram: Record<string, { haiku?: ModelResult; opus?: ModelResult }> = {};
  for (const r of results) {
    if (!byProgram[r.programId]) byProgram[r.programId] = {};
    byProgram[r.programId][r.model] = r;
  }

  // Compare programs where both models ran
  const comparisons: ProgramComparison[] = [];
  for (const [programId, models] of Object.entries(byProgram)) {
    if (!models.haiku || !models.opus) continue;

    comparisons.push({
      programId,
      title: programId, // Will be filled from DB if needed
      category: 'unknown',
      complexity: 'unknown',
      haiku: scoreModel(models.haiku, models.opus),
      opus: scoreModel(models.opus, models.haiku),
    });
  }

  // Build summaries
  const haikuResults = results.filter((r) => r.model === 'haiku');
  const opusResults = results.filter((r) => r.model === 'opus');

  const haikuSummary = buildSummary('haiku', haikuResults, comparisons);
  const opusSummary = buildSummary('opus', opusResults, comparisons);

  // Decision
  const { recommendation, reason } = makeRecommendation(haikuSummary, opusSummary);

  const report: ComparisonReport = {
    timestamp: new Date().toISOString(),
    totalPrograms: comparisons.length,
    summary: {
      haiku: haikuSummary,
      opus: opusSummary,
    },
    comparisons,
    recommendation,
    recommendationReason: reason,
  };

  // Save report
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(`Report saved to: ${outputPath}\n`);

  // Print summary
  printReport(report);
}

// ============================================================================
// Scoring
// ============================================================================

function scoreModel(
  model: ModelResult,
  other: ModelResult
): ProgramComparison['haiku'] {
  const fields = [
    'regions',
    'companyScale',
    'minEmployees',
    'maxEmployees',
    'minRevenue',
    'maxRevenue',
    'minBusinessAge',
    'maxBusinessAge',
    'requiredCerts',
    'targetIndustry',
    'exclusionConditions',
    'supportAmountMin',
    'supportAmountMax',
  ];

  const scores = fields.map((field) => {
    const extracted = (model.extracted as any)[field];
    const otherVal = (other.extracted as any)[field];

    if (Array.isArray(extracted) && Array.isArray(otherVal)) {
      // Jaccard similarity for arrays
      const setA = new Set(extracted.map(String));
      const setB = new Set(otherVal.map(String));
      const intersection = new Set([...setA].filter((x) => setB.has(x)));
      const union = new Set([...setA, ...setB]);
      const similarity = union.size > 0 ? intersection.size / union.size : 1;

      return {
        field,
        exactMatch: similarity === 1,
        partialMatch: similarity,
        hallucination: extracted.length > 0 && otherVal.length === 0 && intersection.size === 0,
      };
    } else {
      // Scalar comparison
      const exactMatch = extracted === otherVal;
      return {
        field,
        exactMatch,
        partialMatch: exactMatch ? 1 : 0,
        hallucination: extracted !== null && otherVal === null,
      };
    }
  });

  const overallAccuracy =
    scores.reduce((sum, s) => sum + s.partialMatch, 0) / scores.length;

  return {
    scores,
    overallAccuracy,
    costUSD: model.costUSD,
    latencyMs: model.latencyMs,
    jsonValid: model.jsonValid,
  };
}

function buildSummary(
  model: 'haiku' | 'opus',
  results: ModelResult[],
  comparisons: ProgramComparison[]
): ModelSummary {
  const totalCost = results.reduce((s, r) => s + r.costUSD, 0);
  const validResults = results.filter((r) => r.jsonValid);
  const avgLatency =
    validResults.length > 0
      ? validResults.reduce((s, r) => s + r.latencyMs, 0) / validResults.length
      : 0;

  // Field-level accuracy
  const fieldAccuracy: Record<string, number> = {};
  const fieldTotals: Record<string, number[]> = {};

  for (const c of comparisons) {
    const scores = model === 'haiku' ? c.haiku.scores : c.opus.scores;
    for (const s of scores) {
      if (!fieldTotals[s.field]) fieldTotals[s.field] = [];
      fieldTotals[s.field].push(s.partialMatch);
    }
  }

  for (const [field, values] of Object.entries(fieldTotals)) {
    fieldAccuracy[field] = values.reduce((s, v) => s + v, 0) / values.length;
  }

  // Hallucination rate
  let hallucinationCount = 0;
  let totalFields = 0;
  for (const c of comparisons) {
    const scores = model === 'haiku' ? c.haiku.scores : c.opus.scores;
    for (const s of scores) {
      totalFields++;
      if (s.hallucination) hallucinationCount++;
    }
  }

  const overallAccuracy =
    comparisons.length > 0
      ? comparisons.reduce(
          (s, c) => s + (model === 'haiku' ? c.haiku.overallAccuracy : c.opus.overallAccuracy),
          0
        ) / comparisons.length
      : 0;

  return {
    model: model === 'haiku' ? 'claude-haiku-4-5-20251001' : 'claude-opus-4-5-20251101',
    totalCostUSD: totalCost,
    totalCostKRW: totalCost * KRW_PER_USD,
    avgCostPerProgram: results.length > 0 ? totalCost / results.length : 0,
    avgLatencyMs: avgLatency,
    jsonValidRate: results.length > 0 ? validResults.length / results.length : 0,
    overallAccuracy,
    fieldAccuracy,
    hallucinationRate: totalFields > 0 ? hallucinationCount / totalFields : 0,
  };
}

function makeRecommendation(
  haiku: ModelSummary,
  opus: ModelSummary
): { recommendation: 'haiku' | 'opus' | 'hybrid'; reason: string } {
  const accuracyRatio = haiku.overallAccuracy / Math.max(opus.overallAccuracy, 0.01);
  const costRatio = opus.avgCostPerProgram / Math.max(haiku.avgCostPerProgram, 0.0001);

  if (accuracyRatio >= 0.9) {
    return {
      recommendation: 'haiku',
      reason:
        `Haiku accuracy (${(haiku.overallAccuracy * 100).toFixed(1)}%) is ≥90% of Opus ` +
        `(${(opus.overallAccuracy * 100).toFixed(1)}%) while being ${costRatio.toFixed(0)}x cheaper. ` +
        `Haiku: $${haiku.avgCostPerProgram.toFixed(4)}/program vs Opus: $${opus.avgCostPerProgram.toFixed(4)}/program.`,
    };
  }

  if (accuracyRatio >= 0.75) {
    return {
      recommendation: 'hybrid',
      reason:
        `Haiku accuracy (${(haiku.overallAccuracy * 100).toFixed(1)}%) is ${(accuracyRatio * 100).toFixed(0)}% of Opus ` +
        `(${(opus.overallAccuracy * 100).toFixed(1)}%). Recommend: Haiku first, Opus fallback for LOW confidence results.`,
    };
  }

  return {
    recommendation: 'opus',
    reason:
      `Opus accuracy (${(opus.overallAccuracy * 100).toFixed(1)}%) significantly exceeds Haiku ` +
      `(${(haiku.overallAccuracy * 100).toFixed(1)}%). Cost premium justified by quality gap.`,
  };
}

// ============================================================================
// Report Printer
// ============================================================================

function printReport(report: ComparisonReport) {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║     LLM COMPARISON REPORT: HAIKU vs OPUS        ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  console.log(`Programs compared: ${report.totalPrograms}`);
  console.log(`Generated: ${report.timestamp}\n`);

  // Side-by-side summary
  const h = report.summary.haiku;
  const o = report.summary.opus;

  console.log('┌─────────────────────┬──────────────┬──────────────┐');
  console.log('│ Metric              │ Haiku 4.5    │ Opus 4.5     │');
  console.log('├─────────────────────┼──────────────┼──────────────┤');
  console.log(`│ Total cost (USD)    │ $${h.totalCostUSD.toFixed(4).padStart(10)} │ $${o.totalCostUSD.toFixed(4).padStart(10)} │`);
  console.log(`│ Cost/program        │ $${h.avgCostPerProgram.toFixed(4).padStart(10)} │ $${o.avgCostPerProgram.toFixed(4).padStart(10)} │`);
  console.log(`│ Avg latency         │ ${Math.round(h.avgLatencyMs).toString().padStart(8)}ms │ ${Math.round(o.avgLatencyMs).toString().padStart(8)}ms │`);
  console.log(`│ JSON validity       │ ${(h.jsonValidRate * 100).toFixed(1).padStart(10)}% │ ${(o.jsonValidRate * 100).toFixed(1).padStart(10)}% │`);
  console.log(`│ Overall accuracy    │ ${(h.overallAccuracy * 100).toFixed(1).padStart(10)}% │ ${(o.overallAccuracy * 100).toFixed(1).padStart(10)}% │`);
  console.log(`│ Hallucination rate  │ ${(h.hallucinationRate * 100).toFixed(1).padStart(10)}% │ ${(o.hallucinationRate * 100).toFixed(1).padStart(10)}% │`);
  console.log('└─────────────────────┴──────────────┴──────────────┘\n');

  // Field-level accuracy
  console.log('--- Field-level Accuracy ---');
  const allFields = new Set([
    ...Object.keys(h.fieldAccuracy),
    ...Object.keys(o.fieldAccuracy),
  ]);

  for (const field of allFields) {
    const hAcc = ((h.fieldAccuracy[field] || 0) * 100).toFixed(1);
    const oAcc = ((o.fieldAccuracy[field] || 0) * 100).toFixed(1);
    const winner = (h.fieldAccuracy[field] || 0) >= (o.fieldAccuracy[field] || 0) ? '← H' : 'O →';
    console.log(`  ${field.padEnd(22)} Haiku: ${hAcc.padStart(5)}%  Opus: ${oAcc.padStart(5)}%  ${winner}`);
  }

  // Recommendation
  console.log(`\n${'═'.repeat(50)}`);
  console.log(`RECOMMENDATION: ${report.recommendation.toUpperCase()}`);
  console.log(`${report.recommendationReason}`);
  console.log(`${'═'.repeat(50)}`);
}

main().catch(console.error);
