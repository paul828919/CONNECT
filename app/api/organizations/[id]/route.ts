/**
 * Organization Detail API (with Cache Invalidation)
 *
 * Operations for specific organization:
 * - GET: Fetch organization details
 * - PATCH: Update organization (invalidates cache)
 * - DELETE: Delete organization (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import { db } from '@/lib/db';
import { decrypt } from '@/lib/encryption';
import {
  invalidateOrgProfile,
  invalidateOrgMatches,
} from '@/lib/cache/redis-cache';


export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organizationId = params.id;
    const userId = (session.user as any).id;

    const organization = await db.organizations.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        type: true,
        name: true,
        primaryContactEmail: true,
        website: true,
        industrySector: true,
        employeeCount: true,
        rdExperience: true,
        technologyReadinessLevel: true,
        targetResearchTRL: true,
        description: true,
        // Tier 1A: Company eligibility fields
        revenueRange: true,
        businessStructure: true,
        certifications: true,
        patentCount: true,
        investmentHistory: true,
        governmentCertifications: true,
        // Tier 1B: Algorithm enhancement fields
        collaborationCount: true,
        instituteType: true,
        parentDepartment: true,
        researchFocusAreas: true,
        keyTechnologies: true,
        // v5.0: Enhanced profile fields for improved matching quality
        primaryBusinessDomain: true,
        technologyDomainsSpecific: true,
        // Tier 2A: Consortium preference fields
        desiredConsortiumFields: true,
        desiredTechnologies: true,
        targetPartnerTRL: true,
        commercializationCapabilities: true,
        expectedTRLLevel: true,
        targetOrgScale: true,
        targetOrgRevenue: true,
        // v3.0: Semantic sub-domain for industry-specific matching
        semanticSubDomain: true,
        // v4.1: Company scale and locations for 중소벤처기업부 matching
        companyScaleType: true,
        locations: {
          select: {
            id: true,
            locationType: true,
            region: true,
          },
        },
        profileCompleted: true,
        profileScore: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        businessNumberEncrypted: true, // For decryption if needed
        users: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!organization) {
      return NextResponse.json(
        { error: '조직을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // Check if user belongs to this organization
    const userBelongsToOrg = organization.users.some((u) => u.id === userId);
    if (!userBelongsToOrg) {
      return NextResponse.json(
        { error: '이 조직에 접근할 권한이 없습니다' },
        { status: 403 }
      );
    }

    // Decrypt business number for display (masked)
    let businessNumberMasked = '●●●-●●-●●●●●';
    if (organization.businessNumberEncrypted) {
      try {
        const decrypted = decrypt(organization.businessNumberEncrypted);
        // Mask: show first 3 digits only
        businessNumberMasked = decrypted.substring(0, 3) + '-●●-●●●●●';
      } catch (err) {
        // If decryption fails, keep masked
      }
    }

    // Remove sensitive fields from response
    const { businessNumberEncrypted, ...organizationData } = organization;

    return NextResponse.json({
      success: true,
      organization: {
        ...organizationData,
        businessNumberMasked,
      },
    });
  } catch (error) {
    console.error('Organization fetch error:', error);
    return NextResponse.json(
      { error: '조직 정보를 불러올 수 없습니다' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organizationId = params.id;
    const userId = (session.user as any).id;

    // Verify user belongs to this organization
    const existingOrg = await db.organizations.findUnique({
      where: { id: organizationId },
      include: {
        users: {
          select: { id: true },
        },
      },
    });

    if (!existingOrg) {
      return NextResponse.json(
        { error: '조직을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    const userBelongsToOrg = existingOrg.users.some((u) => u.id === userId);
    if (!userBelongsToOrg) {
      return NextResponse.json(
        { error: '이 조직을 수정할 권한이 없습니다' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      type,
      name,
      primaryContactEmail,
      website,
      industrySector,
      employeeCount,
      rdExperience,
      rdExperienceCount, // New field for count-based R&D experience
      technologyReadinessLevel,
      targetResearchTRL,
      description,
      // Tier 1A: Company eligibility fields
      revenueRange,
      businessStructure,
      certifications,
      patentCount,
      investmentHistory,
      // Tier 1B: Algorithm enhancement fields
      collaborationCount,
      instituteType,
      parentDepartment,
      researchFocusAreas,
      keyTechnologies,
      // Tier 2A: Consortium preference fields
      desiredConsortiumFields,
      desiredTechnologies,
      targetPartnerTRL,
      commercializationCapabilities,
      expectedTRLLevel,
      targetOrgScale,
      targetOrgRevenue,
      // v3.0: Semantic sub-domain for industry-specific matching
      semanticSubDomain,
      // v4.1: Company scale and locations for 중소벤처기업부 matching
      companyScaleType,
      locations, // Array of { locationType: string, region: string }
      // v5.0: Enhanced profile fields for improved matching quality
      primaryBusinessDomain,
      technologyDomainsSpecific,
    } = body;

    // Build update data (only include fields that are provided)
    const updateData: any = {};

    // Organization type (with validation)
    if (type !== undefined) {
      const validTypes = ['COMPANY', 'RESEARCH_INSTITUTE', 'UNIVERSITY', 'PUBLIC_INSTITUTION'];
      if (!validTypes.includes(type)) {
        return NextResponse.json({ error: 'Invalid organization type' }, { status: 400 });
      }
      updateData.type = type;
    }

    if (name !== undefined) updateData.name = name;
    if (primaryContactEmail !== undefined) updateData.primaryContactEmail = primaryContactEmail;
    if (website !== undefined) updateData.website = website;
    if (industrySector !== undefined) updateData.industrySector = industrySector;
    if (employeeCount !== undefined) updateData.employeeCount = employeeCount;
    // Handle rdExperience: convert rdExperienceCount string to boolean for backward compatibility
    if (rdExperienceCount !== undefined) {
      // Convert count to boolean (any value > 0 means true)
      updateData.rdExperience = rdExperienceCount !== '0' && rdExperienceCount !== '';
    } else if (rdExperience !== undefined) {
      updateData.rdExperience = rdExperience;
    }
    if (technologyReadinessLevel !== undefined)
      updateData.technologyReadinessLevel = technologyReadinessLevel;
    if (targetResearchTRL !== undefined)
      updateData.targetResearchTRL = targetResearchTRL;
    if (description !== undefined) updateData.description = description;

    // Tier 1A: Company eligibility fields
    if (revenueRange !== undefined) updateData.revenueRange = revenueRange;
    if (businessStructure !== undefined)
      updateData.businessStructure = businessStructure;
    if (certifications !== undefined) updateData.certifications = certifications;
    if (patentCount !== undefined) updateData.patentCount = patentCount;
    if (investmentHistory !== undefined) updateData.investmentHistory = investmentHistory;

    // Tier 1B: Algorithm enhancement fields
    if (collaborationCount !== undefined)
      updateData.collaborationCount = collaborationCount;
    if (instituteType !== undefined) updateData.instituteType = instituteType;
    if (parentDepartment !== undefined) updateData.parentDepartment = parentDepartment;
    // Convert comma-separated strings to arrays for database storage
    if (researchFocusAreas !== undefined) {
      updateData.researchFocusAreas = researchFocusAreas
        ? researchFocusAreas
            .split(',')
            .map((area: string) => area.trim())
            .filter((area: string) => area.length > 0)
        : [];
    }
    if (keyTechnologies !== undefined) {
      updateData.keyTechnologies = keyTechnologies
        ? keyTechnologies
            .split(',')
            .map((tech: string) => tech.trim())
            .filter((tech: string) => tech.length > 0)
        : [];
    }

    // v5.0: Enhanced profile fields for improved matching quality
    if (primaryBusinessDomain !== undefined) {
      updateData.primaryBusinessDomain = primaryBusinessDomain || null;
    }
    if (technologyDomainsSpecific !== undefined) {
      updateData.technologyDomainsSpecific = technologyDomainsSpecific
        ? technologyDomainsSpecific
            .split(',')
            .map((tech: string) => tech.trim())
            .filter((tech: string) => tech.length > 0)
        : [];
    }

    // Tier 2A: Consortium preference fields
    // Convert comma-separated strings to arrays for database storage
    if (desiredConsortiumFields !== undefined) {
      updateData.desiredConsortiumFields = desiredConsortiumFields
        ? desiredConsortiumFields
            .split(',')
            .map((field: string) => field.trim())
            .filter((field: string) => field.length > 0)
        : [];
    }
    if (desiredTechnologies !== undefined) {
      updateData.desiredTechnologies = desiredTechnologies
        ? desiredTechnologies
            .split(',')
            .map((tech: string) => tech.trim())
            .filter((tech: string) => tech.length > 0)
        : [];
    }
    if (commercializationCapabilities !== undefined) {
      updateData.commercializationCapabilities = commercializationCapabilities
        ? commercializationCapabilities
            .split(',')
            .map((cap: string) => cap.trim())
            .filter((cap: string) => cap.length > 0)
        : [];
    }
    // Numeric and enum fields
    if (targetPartnerTRL !== undefined)
      updateData.targetPartnerTRL = targetPartnerTRL;
    if (expectedTRLLevel !== undefined)
      updateData.expectedTRLLevel = expectedTRLLevel;
    if (targetOrgScale !== undefined) updateData.targetOrgScale = targetOrgScale;
    if (targetOrgRevenue !== undefined)
      updateData.targetOrgRevenue = targetOrgRevenue;

    // v3.0: Semantic sub-domain for industry-specific matching
    if (semanticSubDomain !== undefined) {
      updateData.semanticSubDomain = semanticSubDomain;
    }

    // v4.1: Company scale for 중소벤처기업부 program matching
    if (companyScaleType !== undefined) {
      updateData.companyScaleType = companyScaleType;
    }

    // v4.1: Handle locations (delete existing, create new)
    // Note: Locations are handled separately after the main update
    const shouldUpdateLocations = locations !== undefined;

    // Recalculate profile score (enhanced with Tier 1A + 1B)
    let profileScore = 50; // Base score
    if (updateData.name || existingOrg.name) profileScore += 10;
    if (updateData.industrySector || existingOrg.industrySector) profileScore += 10;
    if (updateData.employeeCount || existingOrg.employeeCount) profileScore += 10;
    if (
      updateData.rdExperience !== undefined
        ? updateData.rdExperience
        : existingOrg.rdExperience
    )
      profileScore += 10;
    if (
      updateData.technologyReadinessLevel ||
      existingOrg.technologyReadinessLevel
    )
      profileScore += 5;
    if (
      (updateData.description && updateData.description.length > 20) ||
      (existingOrg.description && existingOrg.description.length > 20)
    )
      profileScore += 5;

    // Tier 1A: Company eligibility fields
    if (updateData.revenueRange || existingOrg.revenueRange) profileScore += 5;
    if (updateData.businessStructure || existingOrg.businessStructure)
      profileScore += 5;
    // Certifications: +2 points per certification (max +10)
    const finalCertifications =
      updateData.certifications !== undefined
        ? updateData.certifications
        : existingOrg.certifications;
    if (finalCertifications && finalCertifications.length > 0) {
      profileScore += Math.min(10, finalCertifications.length * 2);
    }

    // Tier 1B: Algorithm enhancement fields
    // collaborationCount: Stepwise scoring (1=+2pts, 2-3=+4pts, 4+=+5pts)
    const finalCollabCount =
      updateData.collaborationCount !== undefined
        ? updateData.collaborationCount
        : existingOrg.collaborationCount;
    if (finalCollabCount) {
      if (finalCollabCount === 1) profileScore += 2;
      else if (finalCollabCount >= 2 && finalCollabCount <= 3) profileScore += 4;
      else if (finalCollabCount >= 4) profileScore += 5;
    }
    if (updateData.instituteType || existingOrg.instituteType) profileScore += 5;
    const finalResearchAreas =
      updateData.researchFocusAreas !== undefined
        ? updateData.researchFocusAreas
        : existingOrg.researchFocusAreas;
    if (finalResearchAreas && finalResearchAreas.length > 0) profileScore += 5;
    const finalKeyTech =
      updateData.keyTechnologies !== undefined
        ? updateData.keyTechnologies
        : existingOrg.keyTechnologies;
    if (finalKeyTech && finalKeyTech.length > 0) profileScore += 5;

    // v5.0: Enhanced profile fields for improved matching quality
    const finalPrimaryBusinessDomain =
      updateData.primaryBusinessDomain !== undefined
        ? updateData.primaryBusinessDomain
        : existingOrg.primaryBusinessDomain;
    if (finalPrimaryBusinessDomain && finalPrimaryBusinessDomain.length > 0)
      profileScore += 5;
    const finalTechDomainsSpecific =
      updateData.technologyDomainsSpecific !== undefined
        ? updateData.technologyDomainsSpecific
        : existingOrg.technologyDomainsSpecific;
    if (finalTechDomainsSpecific && finalTechDomainsSpecific.length > 0)
      profileScore += 5;

    // Tier 2A: Consortium preference fields (optional but valuable)
    // Award small bonus points for completing consortium preferences (max +10)
    let consortiumScore = 0;
    const finalDesiredFields =
      updateData.desiredConsortiumFields !== undefined
        ? updateData.desiredConsortiumFields
        : existingOrg.desiredConsortiumFields;
    if (finalDesiredFields && finalDesiredFields.length > 0) consortiumScore += 2;

    const finalDesiredTech =
      updateData.desiredTechnologies !== undefined
        ? updateData.desiredTechnologies
        : existingOrg.desiredTechnologies;
    if (finalDesiredTech && finalDesiredTech.length > 0) consortiumScore += 2;

    const finalTargetTRL =
      updateData.targetPartnerTRL !== undefined
        ? updateData.targetPartnerTRL
        : existingOrg.targetPartnerTRL;
    if (finalTargetTRL) consortiumScore += 2;

    const finalCommercializationCap =
      updateData.commercializationCapabilities !== undefined
        ? updateData.commercializationCapabilities
        : existingOrg.commercializationCapabilities;
    if (finalCommercializationCap && finalCommercializationCap.length > 0)
      consortiumScore += 2;

    const finalExpectedTRL =
      updateData.expectedTRLLevel !== undefined
        ? updateData.expectedTRLLevel
        : existingOrg.expectedTRLLevel;
    if (finalExpectedTRL) consortiumScore += 1;

    const finalTargetScale =
      updateData.targetOrgScale !== undefined
        ? updateData.targetOrgScale
        : existingOrg.targetOrgScale;
    if (finalTargetScale) consortiumScore += 1;

    const finalTargetRevenue =
      updateData.targetOrgRevenue !== undefined
        ? updateData.targetOrgRevenue
        : existingOrg.targetOrgRevenue;
    if (finalTargetRevenue) consortiumScore += 1;

    profileScore += Math.min(10, consortiumScore); // Cap at +10 bonus points

    updateData.profileScore = Math.min(100, profileScore);
    updateData.updatedAt = new Date();

    // Update organization
    const updatedOrganization = await db.organizations.update({
      where: { id: organizationId },
      data: updateData,
      select: {
        id: true,
        type: true,
        name: true,
        primaryContactEmail: true,
        website: true,
        industrySector: true,
        employeeCount: true,
        rdExperience: true,
        technologyReadinessLevel: true,
        targetResearchTRL: true,
        description: true,
        // Tier 1A: Company eligibility fields
        revenueRange: true,
        businessStructure: true,
        certifications: true,
        patentCount: true,
        investmentHistory: true,
        governmentCertifications: true,
        // Tier 1B: Algorithm enhancement fields
        collaborationCount: true,
        instituteType: true,
        parentDepartment: true,
        researchFocusAreas: true,
        keyTechnologies: true,
        // v5.0: Enhanced profile fields for improved matching quality
        primaryBusinessDomain: true,
        technologyDomainsSpecific: true,
        // Tier 2A: Consortium preference fields
        desiredConsortiumFields: true,
        desiredTechnologies: true,
        targetPartnerTRL: true,
        commercializationCapabilities: true,
        expectedTRLLevel: true,
        targetOrgScale: true,
        targetOrgRevenue: true,
        // v3.0: Semantic sub-domain for industry-specific matching
        semanticSubDomain: true,
        // v4.1: Company scale and locations
        companyScaleType: true,
        locations: {
          select: {
            id: true,
            locationType: true,
            region: true,
          },
        },
        profileCompleted: true,
        profileScore: true,
        updatedAt: true,
      },
    });

    // v4.1: Update locations if provided (delete existing, create new)
    if (shouldUpdateLocations) {
      // Delete all existing locations
      await db.companyLocation.deleteMany({
        where: { organizationId },
      });

      // Create new locations if provided
      if (locations && locations.length > 0) {
        await db.companyLocation.createMany({
          data: locations.map((loc: { locationType: string; region: string }) => ({
            organizationId,
            locationType: loc.locationType as any,
            region: loc.region as any,
          })),
        });
      }
    }

    // Invalidate caches (profile changes affect match results)
    console.log('[PROFILE UPDATE] Invalidating caches for org:', organizationId);
    await invalidateOrgProfile(organizationId);
    await invalidateOrgMatches(organizationId);

    // Delete ALL existing matches when profile changes
    // This ensures users see only matches based on their current profile
    // User trust critical: If profile TRL 5→7 changes, old TRL 5 matches must be cleared
    console.log('[PROFILE UPDATE] Deleting all existing matches for org:', organizationId);
    const deleteResult = await db.funding_matches.deleteMany({
      where: { organizationId },
    });
    console.log('[PROFILE UPDATE] ✅ Deleted', deleteResult.count, 'matches');

    return NextResponse.json({
      success: true,
      organization: updatedOrganization,
      message: '프로필이 성공적으로 업데이트되었습니다',
    });
  } catch (error) {
    console.error('Organization update error:', error);
    return NextResponse.json(
      { error: '프로필 업데이트 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can delete organizations
    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다' },
        { status: 403 }
      );
    }

    const organizationId = params.id;

    // Soft delete by updating status
    await db.organizations.update({
      where: { id: organizationId },
      data: {
        status: 'DEACTIVATED',
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: '조직이 비활성화되었습니다',
    });
  } catch (error) {
    console.error('Organization deletion error:', error);
    return NextResponse.json(
      { error: '조직 삭제 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
