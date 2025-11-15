/**
 * Organizations API
 *
 * CRUD operations for organization profiles:
 * - GET: List organizations (admin only)
 * - POST: Create organization
 * - PATCH: Update organization (in [id]/route.ts)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import { db } from '@/lib/db';
import {
  encrypt,
  hashBusinessNumber,
  validateBusinessNumber,
} from '@/lib/encryption';
import {
  invalidateOrgProfile,
  invalidateOrgMatches,
} from '@/lib/cache/redis-cache';


export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Implement organization listing
    // - Admin: can see all organizations
    // - User: can only see their own

    return NextResponse.json(
      { error: 'Not implemented yet', endpoint: '/api/organizations GET' },
      { status: 501 }
    );
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Check if user already has an organization
    const existingUserOrg = await db.user.findUnique({
      where: { id: userId },
      select: { organizationId: true },
    });

    if (existingUserOrg?.organizationId) {
      return NextResponse.json(
        { error: '이미 조직 프로필이 존재합니다' },
        { status: 409 }
      );
    }

    const body = await request.json();
    const {
      type,
      name,
      businessNumber,
      industrySector,
      employeeCount,
      // Tier 1A: Company eligibility fields
      revenueRange,
      businessStructure,
      businessEstablishedDate,
      rdExperience,
      // Phase 2: Eligibility fields
      certifications,
      investmentHistory,
      patentCount,
      // Tier 1B: Algorithm enhancement fields
      collaborationCount,
      instituteType,
      researchFocusAreas, // comma-separated string from form
      keyTechnologies, // comma-separated string from form
      technologyReadinessLevel,
      description,
    } = body;

    // Automatically derive hasResearchInstitute from certifications array
    const hasResearchInstitute = certifications?.includes('기업부설연구소') || false;

    // 1. Validate required fields
    if (!type || !name || !businessNumber || !industrySector || !employeeCount) {
      return NextResponse.json(
        { error: '필수 항목을 모두 입력해주세요' },
        { status: 400 }
      );
    }

    // 2. Validate business number format
    if (!validateBusinessNumber(businessNumber)) {
      return NextResponse.json(
        {
          error:
            '사업자등록번호 형식이 올바르지 않습니다 (형식: 123-45-67890)',
        },
        { status: 400 }
      );
    }

    // 3. Check for duplicates using hash
    const businessNumberHash = hashBusinessNumber(businessNumber);
    const existingOrg = await db.organizations.findUnique({
      where: { businessNumberHash },
    });

    if (existingOrg) {
      return NextResponse.json(
        { error: '이미 등록된 사업자등록번호입니다' },
        { status: 409 }
      );
    }

    // 4. Encrypt sensitive data (PIPA compliance)
    const businessNumberEncrypted = encrypt(businessNumber);

    // 5. Calculate profile score (enhanced scoring with Tier 1A + 1B + Phase 2)
    let profileScore = 50; // Base score
    if (name) profileScore += 10;
    if (industrySector) profileScore += 10;
    if (employeeCount) profileScore += 10;
    if (rdExperience) profileScore += 10;
    if (technologyReadinessLevel) profileScore += 5;
    if (description && description.length > 20) profileScore += 5;

    // Tier 1A: Company eligibility fields
    if (revenueRange) profileScore += 5;
    if (businessStructure) profileScore += 5;
    if (businessEstablishedDate) profileScore += 3;

    // Phase 2: Eligibility fields (critical for matching accuracy)
    if (certifications && certifications.length > 0) profileScore += 10;
    if (investmentHistory && investmentHistory.trim().length > 0) profileScore += 8;
    if (patentCount && patentCount > 0) profileScore += 5;
    if (hasResearchInstitute) profileScore += 7;

    // Tier 1B: Algorithm enhancement fields
    // collaborationCount: Stepwise scoring (1=+2pts, 2-3=+4pts, 4+=+5pts)
    if (collaborationCount) {
      if (collaborationCount === 1) profileScore += 2;
      else if (collaborationCount >= 2 && collaborationCount <= 3) profileScore += 4;
      else if (collaborationCount >= 4) profileScore += 5;
    }
    if (instituteType) profileScore += 5;
    if (researchFocusAreas && researchFocusAreas.trim().length > 0)
      profileScore += 5;
    if (keyTechnologies && keyTechnologies.trim().length > 0) profileScore += 5;

    // 6. Create organization
    const organization = await db.organizations.create({
      data: {
        type,
        name,
        businessNumberEncrypted,
        businessNumberHash,
        industrySector,
        employeeCount,
        rdExperience: rdExperience || false,
        technologyReadinessLevel: technologyReadinessLevel || null,
        description: description || null,
        // Tier 1A: Company eligibility fields
        revenueRange: revenueRange || null,
        businessStructure: businessStructure || null,
        businessEstablishedDate: businessEstablishedDate
          ? new Date(businessEstablishedDate)
          : null,
        // Phase 2: Eligibility fields
        certifications: certifications || [],
        investmentHistory: investmentHistory
          ? { manualEntry: investmentHistory, verified: false }
          : undefined,
        patentCount: patentCount || null,
        hasResearchInstitute: hasResearchInstitute || false,
        // Tier 1B: Algorithm enhancement fields
        collaborationCount: collaborationCount || null,
        instituteType: instituteType || null,
        // Convert comma-separated strings to arrays for database storage
        researchFocusAreas: researchFocusAreas
          ? researchFocusAreas
              .split(',')
              .map((area: string) => area.trim())
              .filter((area: string) => area.length > 0)
          : [],
        keyTechnologies: keyTechnologies
          ? keyTechnologies
              .split(',')
              .map((tech: string) => tech.trim())
              .filter((tech: string) => tech.length > 0)
          : [],
        profileCompleted: true,
        profileScore,
        status: 'ACTIVE',
        users: {
          connect: { id: userId },
        },
      },
      select: {
        id: true,
        type: true,
        name: true,
        industrySector: true,
        employeeCount: true,
        profileScore: true,
        createdAt: true,
      },
    });

    // 7. Update user's organizationId
    await db.user.update({
      where: { id: userId },
      data: { organizationId: organization.id },
    });

    // 8. Invalidate caches to ensure fresh data for match generation
    await invalidateOrgProfile(organization.id);
    await invalidateOrgMatches(organization.id);

    return NextResponse.json(
      {
        success: true,
        organization,
        message: '조직 프로필이 성공적으로 생성되었습니다',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Organization creation error:', error);
    return NextResponse.json(
      { error: '조직 프로필 생성 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}