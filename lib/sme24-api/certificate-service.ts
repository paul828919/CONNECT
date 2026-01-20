/**
 * SME24 Certificate Verification Service
 *
 * Service layer for verifying company certifications via SME24 API.
 * Handles concurrent verification of all 3 certificate types and
 * updates organization records with verification results.
 *
 * Supported certifications:
 * - InnoBiz (이노비즈): Technology Innovation SME
 * - Venture (벤처기업): Venture Business
 * - MainBiz (메인비즈): Management Innovation SME
 */

import { sme24Client } from './client';
import { decrypt, logDecryptionAccess } from '@/lib/encryption';
import { db } from '@/lib/db';
import {
  CertificateVerifyResult,
  OrganizationCertificationResult,
} from './types';

/**
 * Verify all certifications for an organization
 *
 * @param organizationId Organization UUID
 * @param userId User ID for audit logging
 * @returns Combined verification results for all certificate types
 */
export async function verifyOrganizationCertifications(
  organizationId: string,
  userId: string
): Promise<OrganizationCertificationResult> {
  // Fetch organization with encrypted business number
  const organization = await db.organizations.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      name: true,
      businessNumberEncrypted: true,
      certifications: true,
    },
  });

  if (!organization) {
    throw new Error('Organization not found');
  }

  if (!organization.businessNumberEncrypted) {
    throw new Error('Business number not registered for this organization');
  }

  // Decrypt business number for API call
  const businessNumber = decrypt(organization.businessNumberEncrypted);

  // Log decryption access for PIPA compliance
  await logDecryptionAccess(
    userId,
    organizationId,
    'SME24 certification verification'
  );

  // Verify all 3 certificate types in parallel
  const [innoBizResult, ventureResult, mainBizResult] = await Promise.all([
    sme24Client.verifyInnoBiz(businessNumber),
    sme24Client.verifyVenture(businessNumber),
    sme24Client.verifyMainBiz(businessNumber),
  ]);

  // Build verification result
  const verifiedAt = new Date().toISOString();
  const certificationSummary: string[] = [];

  if (innoBizResult.verified && !innoBizResult.isExpired) {
    certificationSummary.push('이노비즈');
  }
  if (ventureResult.verified && !ventureResult.isExpired) {
    certificationSummary.push('벤처기업');
  }
  if (mainBizResult.verified && !mainBizResult.isExpired) {
    certificationSummary.push('메인비즈');
  }

  const result: OrganizationCertificationResult = {
    innoBiz: innoBizResult.verified ? innoBizResult : null,
    venture: ventureResult.verified ? ventureResult : null,
    mainBiz: mainBizResult.verified ? mainBizResult : null,
    verifiedAt,
    hasAnyCertification: certificationSummary.length > 0,
    certificationSummary,
  };

  // Update organization with verification results
  await updateOrganizationCertifications(organizationId, result);

  return result;
}

/**
 * Update organization record with certification verification results
 */
async function updateOrganizationCertifications(
  organizationId: string,
  result: OrganizationCertificationResult
): Promise<void> {
  // Get current certifications to merge with API-verified ones
  const org = await db.organizations.findUnique({
    where: { id: organizationId },
    select: { certifications: true },
  });

  const existingCerts = new Set(org?.certifications || []);

  // Add verified certifications
  if (result.innoBiz?.verified && !result.innoBiz.isExpired) {
    existingCerts.add('이노비즈');
    existingCerts.add('INNO-BIZ');
  }
  if (result.venture?.verified && !result.venture.isExpired) {
    existingCerts.add('벤처기업');
    existingCerts.add('VENTURE');
  }
  if (result.mainBiz?.verified && !result.mainBiz.isExpired) {
    existingCerts.add('메인비즈');
    existingCerts.add('MAIN-BIZ');
  }

  // Update organization
  await db.organizations.update({
    where: { id: organizationId },
    data: {
      certifications: Array.from(existingCerts),
      certificationVerifiedAt: new Date(),
      certificationVerifyResult: {
        innoBiz: result.innoBiz ? {
          verified: result.innoBiz.verified,
          validFrom: result.innoBiz.validFrom,
          validUntil: result.innoBiz.validUntil,
          isExpired: result.innoBiz.isExpired,
          daysUntilExpiry: result.innoBiz.daysUntilExpiry,
          grade: result.innoBiz.additionalInfo?.grade,
          score: result.innoBiz.additionalInfo?.score,
        } : null,
        venture: result.venture ? {
          verified: result.venture.verified,
          validFrom: result.venture.validFrom,
          validUntil: result.venture.validUntil,
          isExpired: result.venture.isExpired,
          daysUntilExpiry: result.venture.daysUntilExpiry,
          ventureType: result.venture.additionalInfo?.ventureType,
          techField: result.venture.additionalInfo?.techField,
        } : null,
        mainBiz: result.mainBiz ? {
          verified: result.mainBiz.verified,
          validFrom: result.mainBiz.validFrom,
          validUntil: result.mainBiz.validUntil,
          isExpired: result.mainBiz.isExpired,
          daysUntilExpiry: result.mainBiz.daysUntilExpiry,
        } : null,
        verifiedAt: result.verifiedAt,
      },
    },
  });
}

/**
 * Check if certification verification is needed
 * Returns true if:
 * - Never verified, OR
 * - Last verification was more than 30 days ago
 */
export async function shouldVerifyCertifications(
  organizationId: string
): Promise<boolean> {
  const org = await db.organizations.findUnique({
    where: { id: organizationId },
    select: { certificationVerifiedAt: true },
  });

  if (!org?.certificationVerifiedAt) {
    return true;
  }

  const daysSinceVerification = Math.floor(
    (Date.now() - new Date(org.certificationVerifiedAt).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  return daysSinceVerification > 30;
}

/**
 * Get certification status summary for an organization
 */
export async function getCertificationStatus(
  organizationId: string
): Promise<{
  verifiedAt: Date | null;
  certifications: string[];
  verifyResult: OrganizationCertificationResult | null;
  needsRefresh: boolean;
}> {
  const org = await db.organizations.findUnique({
    where: { id: organizationId },
    select: {
      certifications: true,
      certificationVerifiedAt: true,
      certificationVerifyResult: true,
    },
  });

  if (!org) {
    throw new Error('Organization not found');
  }

  const needsRefresh = await shouldVerifyCertifications(organizationId);

  return {
    verifiedAt: org.certificationVerifiedAt,
    certifications: org.certifications,
    verifyResult: org.certificationVerifyResult as OrganizationCertificationResult | null,
    needsRefresh,
  };
}

/**
 * Verify a single certificate type for testing or targeted verification
 */
export async function verifySingleCertificate(
  organizationId: string,
  userId: string,
  certType: 'INNOBIZ' | 'VENTURE' | 'MAINBIZ'
): Promise<CertificateVerifyResult> {
  const organization = await db.organizations.findUnique({
    where: { id: organizationId },
    select: {
      businessNumberEncrypted: true,
    },
  });

  if (!organization?.businessNumberEncrypted) {
    throw new Error('Business number not registered');
  }

  const businessNumber = decrypt(organization.businessNumberEncrypted);

  await logDecryptionAccess(
    userId,
    organizationId,
    `SME24 ${certType} certificate verification`
  );

  switch (certType) {
    case 'INNOBIZ':
      return sme24Client.verifyInnoBiz(businessNumber);
    case 'VENTURE':
      return sme24Client.verifyVenture(businessNumber);
    case 'MAINBIZ':
      return sme24Client.verifyMainBiz(businessNumber);
    default:
      throw new Error(`Unknown certificate type: ${certType}`);
  }
}
