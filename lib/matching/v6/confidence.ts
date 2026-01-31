import { IdealApplicantProfile } from '../ideal-profile';

export function calculateConfidenceBonus(idealProfile: IdealApplicantProfile | null | undefined): number {
  if (!idealProfile) return 0;
  const confidence = Math.max(0, Math.min(1, idealProfile.confidence || 0));
  return Math.round(confidence * 10);
}
