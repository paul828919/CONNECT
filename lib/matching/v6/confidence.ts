/**
 * Match Confidence Scoring (v6.0)
 *
 * Rewards matches where we have high confidence in the scoring quality.
 * When an ideal applicant profile exists and has high confidence, the
 * proximity scoring dimensions are much more accurate — so we reward
 * these matches with bonus points.
 *
 * Bonus range: 0-10 points (part of Stage 2 semantic score)
 *
 * Factors:
 * - Ideal profile existence and confidence (0-6 pts)
 * - Profile completeness — primary domain + sub-domains defined (0-4 pts)
 */

import { IdealApplicantProfile } from '../ideal-profile';

export function calculateConfidenceBonus(
  idealProfile: IdealApplicantProfile | null | undefined
): number {
  if (!idealProfile) return 0;

  let bonus = 0;

  // Profile confidence score (0-6)
  const confidence = Math.max(0, Math.min(1, idealProfile.confidence || 0));
  bonus += Math.round(confidence * 6);

  // Profile completeness bonus (0-4)
  let completeness = 0;
  if (idealProfile.primaryDomain) completeness += 1;
  if (idealProfile.subDomains && idealProfile.subDomains.length > 0) completeness += 1;
  if (idealProfile.technologyKeywords && idealProfile.technologyKeywords.length > 0) completeness += 1;
  if (idealProfile.expectedCapabilities && idealProfile.expectedCapabilities.length > 0) completeness += 1;
  bonus += completeness;

  return Math.min(10, bonus);
}
