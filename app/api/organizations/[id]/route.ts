/**
 * Organization Detail API
 *
 * Operations for specific organization:
 * - GET: Fetch organization details
 * - PATCH: Update organization
 * - DELETE: Delete organization (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import { PrismaClient } from '@prisma/client';
import { decrypt } from '@/lib/encryption';

const prisma = new PrismaClient();

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

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        type: true,
        name: true,
        industrySector: true,
        employeeCount: true,
        rdExperience: true,
        technologyReadinessLevel: true,
        description: true,
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
    const existingOrg = await prisma.organization.findUnique({
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
      name,
      industrySector,
      employeeCount,
      rdExperience,
      technologyReadinessLevel,
      description,
    } = body;

    // Build update data (only include fields that are provided)
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (industrySector !== undefined) updateData.industrySector = industrySector;
    if (employeeCount !== undefined) updateData.employeeCount = employeeCount;
    if (rdExperience !== undefined) updateData.rdExperience = rdExperience;
    if (technologyReadinessLevel !== undefined)
      updateData.technologyReadinessLevel = technologyReadinessLevel;
    if (description !== undefined) updateData.description = description;

    // Recalculate profile score
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

    updateData.profileScore = profileScore;
    updateData.updatedAt = new Date();

    // Update organization
    const updatedOrganization = await prisma.organization.update({
      where: { id: organizationId },
      data: updateData,
      select: {
        id: true,
        type: true,
        name: true,
        industrySector: true,
        employeeCount: true,
        rdExperience: true,
        technologyReadinessLevel: true,
        description: true,
        profileCompleted: true,
        profileScore: true,
        updatedAt: true,
      },
    });

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
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        status: 'INACTIVE',
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
