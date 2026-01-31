/**
 * Proximity Match Explanation Generator (Korean)
 * Phase 4.2: Ideal Profile Construction & Proximity Matching
 *
 * Generates human-readable Korean explanations for proximity matching results.
 * Used in the match detail UI to show users WHY a program was matched.
 *
 * Design: Explanations are always from the user's perspective —
 * "귀사의 X가 이 프로그램의 Y와 일치합니다" not technical scores.
 */

import {
  ProximityScore,
  ProximityGap,
  IdealApplicantProfile,
} from './ideal-profile';

// ═══════════════════════════════════════════════════════════════
// Match Explanation Types
// ═══════════════════════════════════════════════════════════════

export interface MatchExplanation {
  /** One-line Korean summary */
  headline: string;
  /** Star rating (1-5) for quick visual */
  rating: number;
  /** Top 3 reasons this is a good match */
  strengths: string[];
  /** Actionable gaps (things org could improve) */
  improvements: string[];
  /** Whether this match has blocking compliance issues */
  hasBlockers: boolean;
  /** Score category label */
  category: '매우 적합' | '적합' | '보통' | '부분 적합' | '부적합';
}

// ═══════════════════════════════════════════════════════════════
// Explanation Generator
// ═══════════════════════════════════════════════════════════════

/**
 * Generate a Korean explanation for a proximity match result.
 */
export function generateMatchExplanation(
  score: ProximityScore,
  ideal: IdealApplicantProfile,
  programTitle: string
): MatchExplanation {
  const { totalScore, dimensions, explanations, gaps } = score;

  // Score category
  const category = categorizeScore(totalScore);
  const rating = scoreToRating(totalScore);

  // Build strengths (highest-scoring dimensions)
  const strengths = buildStrengths(dimensions, explanations, ideal);

  // Build improvements (lowest-scoring dimensions + gaps)
  const improvements = buildImprovements(dimensions, explanations, gaps, ideal);

  // Headline
  const headline = buildHeadline(totalScore, category, ideal, programTitle);

  const hasBlockers = gaps.some(g => g.isBlocker);

  return {
    headline,
    rating,
    strengths: strengths.slice(0, 3),
    improvements: improvements.slice(0, 3),
    hasBlockers,
    category,
  };
}

function categorizeScore(score: number): MatchExplanation['category'] {
  if (score >= 80) return '매우 적합';
  if (score >= 65) return '적합';
  if (score >= 50) return '보통';
  if (score >= 35) return '부분 적합';
  return '부적합';
}

function scoreToRating(score: number): number {
  if (score >= 85) return 5;
  if (score >= 70) return 4;
  if (score >= 55) return 3;
  if (score >= 40) return 2;
  return 1;
}

function buildHeadline(
  score: number,
  category: string,
  ideal: IdealApplicantProfile,
  programTitle: string
): string {
  const shortTitle = programTitle.length > 30 ? programTitle.slice(0, 30) + '...' : programTitle;

  if (score >= 80) {
    return `귀사는 "${shortTitle}"의 이상적 지원자 프로필과 ${score}% 일치합니다`;
  }
  if (score >= 60) {
    return `이 프로그램과의 적합도 ${score}점 — ${category}`;
  }
  return `적합도 ${score}점 — 일부 요건 확인 필요`;
}

function buildStrengths(
  dimensions: ProximityScore['dimensions'],
  explanations: ProximityScore['explanations'],
  ideal: IdealApplicantProfile
): string[] {
  const strengths: string[] = [];

  // Sort dimensions by score (descending)
  const dimEntries: Array<[keyof typeof dimensions, number]> = [
    ['domainFit', dimensions.domainFit],
    ['technologyFit', dimensions.technologyFit],
    ['organizationFit', dimensions.organizationFit],
    ['capabilityFit', dimensions.capabilityFit],
    ['complianceFit', dimensions.complianceFit],
    ['financialFit', dimensions.financialFit],
  ];

  dimEntries.sort((a, b) => b[1] - a[1]);

  // Convert top dimensions to user-friendly Korean
  for (const [dim, score] of dimEntries) {
    if (score <= 0) continue;

    const maxScore = {
      domainFit: 30,
      technologyFit: 20,
      organizationFit: 15,
      capabilityFit: 15,
      complianceFit: 10,
      financialFit: 5,
      deadlineUrgency: 5,
    }[dim];

    const ratio = score / maxScore;
    if (ratio < 0.5) continue; // Only show strengths

    const explanation = explanations[dim];
    if (explanation && explanation !== '정보 부족' && !explanation.includes('부족')) {
      strengths.push(formatStrength(dim, explanation, ratio));
    }
  }

  return strengths;
}

function formatStrength(
  dimension: keyof ProximityScore['dimensions'],
  explanation: string,
  ratio: number
): string {
  const percentText = ratio >= 0.8 ? '높은' : ratio >= 0.6 ? '양호한' : '보통의';

  const labels: Record<string, string> = {
    domainFit: '산업분야',
    technologyFit: '기술',
    organizationFit: '조직',
    capabilityFit: '역량',
    complianceFit: '자격요건',
    financialFit: '재무',
    deadlineUrgency: '마감',
  };

  return `${labels[dimension] || dimension} ${percentText} 적합성: ${explanation}`;
}

function buildImprovements(
  dimensions: ProximityScore['dimensions'],
  explanations: ProximityScore['explanations'],
  gaps: ProximityGap[],
  ideal: IdealApplicantProfile
): string[] {
  const improvements: string[] = [];

  // Add blocker gaps first
  for (const gap of gaps.filter(g => g.isBlocker)) {
    improvements.push(`⚠️ ${gap.description}`);
  }

  // Add non-blocker gaps
  for (const gap of gaps.filter(g => !g.isBlocker)) {
    improvements.push(gap.description);
  }

  // Add specific recommendations based on ideal profile
  if (ideal.requiredCertifications && ideal.requiredCertifications.length > 0 && dimensions.complianceFit < 8) {
    improvements.push(`필요 인증: ${ideal.requiredCertifications.join(', ')}`);
  }

  if (ideal.expectedCapabilities && ideal.expectedCapabilities.length > 0 && dimensions.capabilityFit < 8) {
    const missing = ideal.expectedCapabilities.slice(0, 3).join(', ');
    improvements.push(`프로그램 기대 역량: ${missing}`);
  }

  return improvements;
}

// ═══════════════════════════════════════════════════════════════
// Score Comparison Explanation
// ═══════════════════════════════════════════════════════════════

/**
 * Generate explanation comparing old vs new algorithm scores.
 * Used in shadow mode reporting.
 */
export function explainScoreDifference(
  currentScore: number,
  proximityScore: ProximityScore,
  programTitle: string
): string {
  const delta = proximityScore.totalScore - currentScore;
  const absDelta = Math.abs(delta);

  if (absDelta < 5) {
    return `"${programTitle}" — 두 알고리즘 유사한 점수 (v4.4: ${currentScore}, v5.0: ${proximityScore.totalScore})`;
  }

  if (delta > 0) {
    // New algorithm scores higher
    const topDim = Object.entries(proximityScore.dimensions)
      .sort((a, b) => b[1] - a[1])[0];
    return `"${programTitle}" — v5.0이 +${delta}점 높음 (주요인: ${formatDimName(topDim[0])} ${topDim[1]}점)`;
  }

  // New algorithm scores lower
  const lowDim = Object.entries(proximityScore.dimensions)
    .sort((a, b) => a[1] - b[1])[0];
  return `"${programTitle}" — v5.0이 ${delta}점 낮음 (약점: ${formatDimName(lowDim[0])})`;
}

function formatDimName(dim: string): string {
  const names: Record<string, string> = {
    domainFit: '산업분야 적합성',
    technologyFit: '기술 적합성',
    organizationFit: '조직 적합성',
    capabilityFit: '역량 적합성',
    complianceFit: '자격요건',
    financialFit: '재무 적합성',
    deadlineUrgency: '마감 긴급도',
  };
  return names[dim] || dim;
}
