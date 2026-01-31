import { organizations, funding_programs, ProgramIntent } from '@prisma/client';
import { calculateProximityScore } from '../proximity-scorer';
import { classifyProgram, getIndustryRelevance } from '../keyword-classifier';
import { IdealApplicantProfile } from '../ideal-profile';
import { calculateConfidenceBonus } from './confidence';
import { detectNegativeSignals, sumNegativeSignalPenalty } from './negative-signals';
import { SemanticScore } from './types';

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

function scoreKeywordOverlap(organization: organizations, program: funding_programs): number {
  const orgKeywords = [
    ...(organization.keyTechnologies || []),
    ...(organization.technologyDomainsSpecific || []),
    ...(organization.researchFocusAreas || []),
  ].map(k => k.toLowerCase());

  const programKeywords = [
    ...(program.keywords || []),
    ...program.title.toLowerCase().split(/\s+/),
  ].map(k => k.toLowerCase());

  let overlapCount = 0;
  for (const orgK of orgKeywords) {
    if (programKeywords.some(pk => pk.includes(orgK) || orgK.includes(pk))) {
      overlapCount++;
    }
  }

  if (overlapCount >= 3) return 15;
  if (overlapCount === 2) return 12;
  if (overlapCount === 1) return 7;
  return 0;
}

export function scoreSemanticRelevance(
  organization: organizations,
  program: funding_programs,
  idealProfile: IdealApplicantProfile | null
): SemanticScore {
  const reasons: string[] = [];

  let domainRelevance = 0;
  let capabilityFit = 0;

  if (idealProfile) {
    const proximity = calculateProximityScore(organization, idealProfile, program.deadline ?? null);
    domainRelevance = Math.round((proximity.dimensions.domainFit / 30) * 25);
    capabilityFit = Math.round((proximity.dimensions.capabilityFit / 15) * 15);
    reasons.push('SEMANTIC_PROXIMITY_USED');
  } else {
    const classification = classifyProgram(program.title, null, program.ministry || null);
    if (organization.industrySector) {
      const relevance = getIndustryRelevance(organization.industrySector, classification.industry);
      domainRelevance = Math.round(relevance * 25);
    } else {
      domainRelevance = 8;
      reasons.push('SEMANTIC_NO_ORG_INDUSTRY');
    }

    capabilityFit = scoreKeywordOverlap(organization, program);
    if (capabilityFit > 0) reasons.push('SEMANTIC_KEYWORD_OVERLAP');
  }

  const intentResult = scoreIntentAlignment(program.programIntent || null, organization);
  const intentAlignment = intentResult.score;
  reasons.push(intentResult.reason);

  const negativeSignals = detectNegativeSignals(organization, program);
  const rawPenalty = sumNegativeSignalPenalty(negativeSignals);
  const negativePenalty = Math.max(-10, Math.min(0, rawPenalty));
  if (negativePenalty < 0) reasons.push('NEGATIVE_SIGNAL');

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
