/**
 * Practical Fit Scorer (v6.0 Stage 3)
 *
 * Measures operational readiness and practical alignment.
 * Total: 0-35 points (35% of final score)
 *
 * Design principle: No single non-relevance dimension exceeds 10 points.
 * This caps "free points" at 35 total, making it impossible for an
 * irrelevant match (Stage 2 < 20) to reach the 55-point display threshold.
 *
 * Scoring breakdown:
 *   TRL Alignment:       0-10 pts — development stage match
 *   Scale/Revenue Fit:   0-8  pts — company size/financial fit
 *   R&D Track Record:    0-5  pts — experience + collaboration history
 *   Deadline Urgency:    0-7  pts — time sensitivity (capped from v4's 15)
 *   Certification Bonus: 0-5  pts — preferred/required certs held
 */

import { organizations, funding_programs } from '@prisma/client';
import { calculateProximityScore } from '../proximity-scorer';
import { scoreTRLEnhanced } from '../trl';
import { IdealApplicantProfile } from '../ideal-profile';
import { PracticalScore } from './types';

/**
 * Score deadline urgency (0-7, capped from v4's 0-15).
 *
 * Capping deadline at 7 prevents "free points" from inflating irrelevant
 * matches. In v4, a soon-closing deadline gave 15 free points — enough
 * to push a 50-point irrelevant match above the display threshold.
 */
function scoreDeadlineUrgency(program: funding_programs): { score: number; reason: string } {
  if (!program.deadline) {
    return { score: 3, reason: 'DEADLINE_UNKNOWN' };
  }

  const now = new Date();
  const deadline = new Date(program.deadline);
  const daysUntil = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntil < 0) return { score: 0, reason: 'DEADLINE_PASSED' };
  if (daysUntil <= 7) return { score: 7, reason: 'DEADLINE_URGENT' };
  if (daysUntil <= 30) return { score: 6, reason: 'DEADLINE_SOON' };
  if (daysUntil <= 60) return { score: 4, reason: 'DEADLINE_MODERATE' };
  return { score: 3, reason: 'DEADLINE_FAR' };
}

/**
 * Score certification bonus (0-5).
 *
 * Preferred certifications get full bonus, required certifications
 * (already verified in eligibility gate) get partial.
 */
function scoreCertificationBonus(organization: organizations, program: funding_programs): number {
  const orgCerts = [
    ...(organization.certifications || []),
    ...(organization.governmentCertifications || []),
  ];

  if (orgCerts.length === 0) return 0;

  // Preferred certifications — higher bonus (org exceeds minimum)
  if (program.preferredCertifications && program.preferredCertifications.length > 0) {
    const matchCount = program.preferredCertifications.filter(cert =>
      orgCerts.some(oc => oc.toLowerCase().includes(cert.toLowerCase()) || cert.toLowerCase().includes(oc.toLowerCase()))
    ).length;
    if (matchCount > 0) return Math.min(5, matchCount * 3);
  }

  // Required certifications — smaller bonus (meeting the bar, not exceeding)
  if (program.requiredCertifications && program.requiredCertifications.length > 0) {
    const allRequired = program.requiredCertifications.every(cert =>
      orgCerts.some(oc => oc.toLowerCase().includes(cert.toLowerCase()) || cert.toLowerCase().includes(oc.toLowerCase()))
    );
    if (allRequired) return 2;
  }

  return 0;
}

/**
 * Score R&D track record (0-5).
 *
 * Graduated scoring based on experience + collaboration history.
 * In v4, R&D experience was worth 10 points (too much for a binary signal).
 * v6 caps it at 5 and adds graduation.
 */
function scoreRDTrack(organization: organizations): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  // Base R&D experience (0-3)
  if (organization.rdExperience) {
    score += 3;
    reasons.push('RD_EXPERIENCE');
  }

  // Collaboration bonus (0-2) — graduated
  if (organization.collaborationCount) {
    if (organization.collaborationCount >= 3) {
      score += 2;
      reasons.push('COLLABORATION_EXTENSIVE');
    } else if (organization.collaborationCount >= 1) {
      score += 1;
      reasons.push('COLLABORATION_LIMITED');
    }
  }

  return { score: Math.min(5, score), reasons };
}

/**
 * Calculate practical fit score for a program-organization pair.
 */
export function scorePracticalFit(
  organization: organizations,
  program: funding_programs,
  idealProfile: IdealApplicantProfile | null
): PracticalScore {
  const reasons: string[] = [];

  // 1. TRL Alignment (0-10, rescaled from trl.ts's 0-20)
  const trlResult = scoreTRLEnhanced(organization, program);
  const trlAlignment = Math.min(10, Math.round((trlResult.score / 20) * 10));
  reasons.push(trlResult.reason);

  // 2. Scale/Revenue Fit (0-8)
  let scaleFit = 0;
  if (idealProfile) {
    // Use proximity scorer for scale + financial fit
    const proximity = calculateProximityScore(organization, idealProfile, program.deadline ?? null);
    // organizationFit is 0-15 → rescale to 0-6
    const orgFit = Math.round((proximity.dimensions.organizationFit / 15) * 6);
    // financialFit is 0-5 → rescale to 0-2
    const finFit = Math.round((proximity.dimensions.financialFit / 5) * 2);
    scaleFit = Math.min(8, orgFit + finFit);
  } else if (organization.companyScaleType) {
    // No ideal profile — give partial credit based on org data presence
    scaleFit = 4;
  } else {
    scaleFit = 2;
  }

  // 3. R&D Track Record (0-5)
  const rdResult = scoreRDTrack(organization);
  const rdTrack = rdResult.score;
  reasons.push(...rdResult.reasons);

  // 4. Deadline Urgency (0-7)
  const deadlineResult = scoreDeadlineUrgency(program);
  const deadlineUrgency = deadlineResult.score;
  reasons.push(deadlineResult.reason);

  // 5. Certification Bonus (0-5)
  const certificationBonus = scoreCertificationBonus(organization, program);
  if (certificationBonus > 0) reasons.push('CERTIFICATION_BONUS');

  const score = trlAlignment + scaleFit + rdTrack + deadlineUrgency + certificationBonus;

  return {
    score: Math.min(35, score),
    breakdown: {
      trlAlignment,
      scaleFit,
      rdTrack,
      deadlineUrgency,
      certificationBonus,
    },
    reasons,
  };
}
