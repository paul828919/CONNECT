import { organizations, funding_programs } from '@prisma/client';
import { calculateProximityScore } from '../proximity-scorer';
import { scoreTRLEnhanced } from '../trl';
import { IdealApplicantProfile } from '../ideal-profile';
import { PracticalScore } from './types';

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

function scoreCertificationBonus(organization: organizations, program: funding_programs): number {
  const orgCerts = organization.certifications || [];
  if (program.preferredCertifications && program.preferredCertifications.length > 0) {
    const hasPreferred = program.preferredCertifications.some(cert => orgCerts.includes(cert));
    if (hasPreferred) return 5;
  }

  if (program.requiredCertifications && program.requiredCertifications.length > 0) {
    const hasRequired = program.requiredCertifications.every(cert => orgCerts.includes(cert));
    if (hasRequired) return 2;
  }

  return 0;
}

export function scorePracticalFit(
  organization: organizations,
  program: funding_programs,
  idealProfile: IdealApplicantProfile | null
): PracticalScore {
  const reasons: string[] = [];

  const trlResult = scoreTRLEnhanced(organization, program);
  const trlAlignment = Math.min(10, Math.round((trlResult.score / 20) * 10));
  reasons.push(trlResult.reason);

  let scaleFit = 0;
  if (idealProfile) {
    const proximity = calculateProximityScore(organization, idealProfile, program.deadline ?? null);
    const orgFit = Math.round((proximity.dimensions.organizationFit / 15) * 6);
    const finFit = Math.round((proximity.dimensions.financialFit / 5) * 2);
    scaleFit = Math.min(8, orgFit + finFit);
  } else if (organization.companyScaleType) {
    scaleFit = 4;
  } else {
    scaleFit = 2;
  }

  const rdTrack = organization.rdExperience ? 5 : 0;
  if (organization.rdExperience) reasons.push('RD_EXPERIENCE');

  const deadlineResult = scoreDeadlineUrgency(program);
  const deadlineUrgency = deadlineResult.score;
  reasons.push(deadlineResult.reason);

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
