/**
 * Semantic Relevance Scorer (v6.0 Stage 2)
 *
 * Measures how semantically relevant a program is to an organization.
 * Total: 0-65 points (65% of final score)
 *
 * Scoring breakdown:
 *   Domain Relevance:    0-25 pts — industry domain match
 *   Capability Fit:      0-15 pts — keyword/technology overlap
 *   Intent Alignment:    0-10 pts — program intent vs org goals
 *   Negative Signals:  -10 to 0  — active mismatch penalties
 *   Confidence Bonus:    0-10 pts — reward well-profiled matches
 *
 * Key difference from v4: Negative signals can subtract points, making it
 * mathematically possible for irrelevant matches to score below the
 * display threshold even with high practical scores.
 */

import { organizations, funding_programs, ProgramIntent } from '@prisma/client';
import { calculateProximityScore } from '../proximity-scorer';
import { classifyProgram, getIndustryRelevance } from '../keyword-classifier';
import { IdealApplicantProfile } from '../ideal-profile';
import { calculateConfidenceBonus } from './confidence';
import { detectNegativeSignals, sumNegativeSignalPenalty } from './negative-signals';
import { SemanticScore } from './types';

/**
 * Score intent alignment between program's research intent and organization's TRL.
 *
 * Programs have different intents (basic research, applied, commercialization)
 * which correlate with the TRL range they target. An org at TRL 8 is a poor
 * fit for basic research (TRL 1-3) regardless of domain match.
 */
function scoreIntentAlignment(
  programIntent: ProgramIntent | null,
  organization: organizations
): { score: number; reason: string } {
  const orgTrl = organization.targetResearchTRL || organization.technologyReadinessLevel;

  if (!programIntent || !orgTrl) {
    return { score: 4, reason: 'INTENT_UNKNOWN' };
  }

  switch (programIntent) {
    case 'BASIC_RESEARCH':
      if (orgTrl <= 3) return { score: 10, reason: 'INTENT_BASIC_MATCH' };
      if (orgTrl <= 5) return { score: 5, reason: 'INTENT_BASIC_PARTIAL' };
      return { score: 0, reason: 'INTENT_BASIC_MISMATCH' };
    case 'APPLIED_RESEARCH':
      if (orgTrl >= 4 && orgTrl <= 6) return { score: 10, reason: 'INTENT_APPLIED_MATCH' };
      if (orgTrl === 3 || orgTrl === 7) return { score: 5, reason: 'INTENT_APPLIED_PARTIAL' };
      return { score: 0, reason: 'INTENT_APPLIED_MISMATCH' };
    case 'COMMERCIALIZATION':
      if (orgTrl >= 7) return { score: 10, reason: 'INTENT_COMMERCIAL_MATCH' };
      if (orgTrl === 6) return { score: 5, reason: 'INTENT_COMMERCIAL_PARTIAL' };
      return { score: 0, reason: 'INTENT_COMMERCIAL_MISMATCH' };
    case 'INFRASTRUCTURE':
    case 'POLICY_SUPPORT':
      return { score: 6, reason: 'INTENT_POLICY_MATCH' };
    default:
      return { score: 4, reason: 'INTENT_UNKNOWN' };
  }
}

/**
 * Score keyword/technology overlap between org and program.
 *
 * Checks how many of the organization's technologies and keywords
 * appear in the program's keywords or title.
 */
function scoreKeywordOverlap(organization: organizations, program: funding_programs): number {
  const orgKeywords = [
    ...(organization.keyTechnologies || []),
    ...(organization.technologyDomainsSpecific || []),
    ...(organization.researchFocusAreas || []),
  ].map(k => k.toLowerCase());

  if (orgKeywords.length === 0) return 3; // No org data — partial credit

  const programKeywords = [
    ...(program.keywords || []),
    ...program.title.toLowerCase().split(/\s+/).filter(w => w.length >= 2),
  ].map(k => k.toLowerCase());

  let overlapCount = 0;
  for (const orgK of orgKeywords) {
    if (programKeywords.some(pk => pk.includes(orgK) || orgK.includes(pk))) {
      overlapCount++;
    }
  }

  if (overlapCount >= 4) return 15;
  if (overlapCount === 3) return 13;
  if (overlapCount === 2) return 10;
  if (overlapCount === 1) return 6;
  return 0;
}

/**
 * Calculate semantic relevance score for a program-organization pair.
 *
 * When an ideal applicant profile exists, uses the proximity scorer for
 * domain and capability dimensions (higher accuracy). Falls back to
 * keyword classification when no profile exists.
 */
export function scoreSemanticRelevance(
  organization: organizations,
  program: funding_programs,
  idealProfile: IdealApplicantProfile | null
): SemanticScore {
  const reasons: string[] = [];

  let domainRelevance = 0;
  let capabilityFit = 0;

  if (idealProfile) {
    // Use proximity scorer for high-accuracy domain + capability scoring
    const proximity = calculateProximityScore(organization, idealProfile, program.deadline ?? null);
    // Rescale: domainFit is 0-30 in proximity → 0-25 here
    domainRelevance = Math.round((proximity.dimensions.domainFit / 30) * 25);
    // capabilityFit is 0-15 in proximity → 0-15 here (same scale)
    capabilityFit = Math.round((proximity.dimensions.capabilityFit / 15) * 15);
    reasons.push('SEMANTIC_PROXIMITY_USED');
  } else {
    // Fallback: keyword classification for domain relevance
    const classification = classifyProgram(program.title, null, program.ministry || null);
    if (organization.industrySector) {
      const relevance = getIndustryRelevance(organization.industrySector, classification.industry);
      domainRelevance = Math.round(relevance * 25);
    } else {
      domainRelevance = 8; // No org sector data — partial credit
      reasons.push('SEMANTIC_NO_ORG_INDUSTRY');
    }

    // Keyword overlap for capability fit
    capabilityFit = scoreKeywordOverlap(organization, program);
    if (capabilityFit > 0) reasons.push('SEMANTIC_KEYWORD_OVERLAP');
  }

  // Intent alignment
  const intentResult = scoreIntentAlignment(program.programIntent || null, organization);
  const intentAlignment = intentResult.score;
  reasons.push(intentResult.reason);

  // Negative signals (the key v6 innovation)
  const negativeSignals = detectNegativeSignals(organization, program);
  const rawPenalty = sumNegativeSignalPenalty(negativeSignals);
  const negativePenalty = Math.max(-10, Math.min(0, rawPenalty));
  if (negativePenalty < 0) reasons.push('NEGATIVE_SIGNAL');

  // Confidence bonus
  const confidenceBonus = calculateConfidenceBonus(idealProfile);

  const score = domainRelevance + capabilityFit + intentAlignment + negativePenalty + confidenceBonus;

  return {
    score: Math.max(0, Math.min(65, score)),
    breakdown: {
      domainRelevance,
      capabilityFit,
      intentAlignment,
      negativeSignals: negativePenalty,
      confidenceBonus,
    },
    reasons,
    negativeSignals,
  };
}
