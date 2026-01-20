/**
 * SME24 Certificate Verification API
 *
 * POST /api/organizations/[id]/verify-certifications
 *
 * Verifies company certifications via 중소벤처24 API:
 * - InnoBiz (이노비즈확인서 - y105)
 * - Venture (벤처기업확인서 - y106)
 * - MainBiz (메인비즈확인서 - y104)
 *
 * GET /api/organizations/[id]/verify-certifications
 *
 * Returns current certification status without calling external API.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import { db } from '@/lib/db';
import {
  verifyOrganizationCertifications,
  getCertificationStatus,
  shouldVerifyCertifications,
} from '@/lib/sme24-api/certificate-service';
import { validateConfig } from '@/lib/sme24-api/config';

/**
 * GET - Get current certification status
 */
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

    // Verify user belongs to this organization
    const organization = await db.organizations.findUnique({
      where: { id: organizationId },
      include: {
        users: { select: { id: true } },
      },
    });

    if (!organization) {
      return NextResponse.json(
        { error: '조직을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    const userBelongsToOrg = organization.users.some((u) => u.id === userId);
    if (!userBelongsToOrg) {
      return NextResponse.json(
        { error: '이 조직에 접근할 권한이 없습니다' },
        { status: 403 }
      );
    }

    // Get current certification status
    const status = await getCertificationStatus(organizationId);

    return NextResponse.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error('Certification status fetch error:', error);
    return NextResponse.json(
      { error: '인증 상태를 불러올 수 없습니다' },
      { status: 500 }
    );
  }
}

/**
 * POST - Verify certifications via SME24 API
 */
export async function POST(
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
    const organization = await db.organizations.findUnique({
      where: { id: organizationId },
      include: {
        users: { select: { id: true } },
      },
    });

    if (!organization) {
      return NextResponse.json(
        { error: '조직을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    const userBelongsToOrg = organization.users.some((u) => u.id === userId);
    if (!userBelongsToOrg) {
      return NextResponse.json(
        { error: '이 조직에 접근할 권한이 없습니다' },
        { status: 403 }
      );
    }

    // Check if business number is registered
    if (!organization.businessNumberEncrypted) {
      return NextResponse.json(
        { error: '사업자등록번호가 등록되지 않았습니다. 프로필을 먼저 완성해주세요.' },
        { status: 400 }
      );
    }

    // Validate API configuration
    const configValidation = validateConfig();
    if (!configValidation.valid) {
      console.error('SME24 API keys not configured:', configValidation.missing);
      return NextResponse.json(
        { error: 'SME24 API가 구성되지 않았습니다. 관리자에게 문의해주세요.' },
        { status: 503 }
      );
    }

    // Verify certifications via SME24 API
    const result = await verifyOrganizationCertifications(organizationId, userId);

    return NextResponse.json({
      success: true,
      data: result,
      message: result.hasAnyCertification
        ? `${result.certificationSummary.join(', ')} 인증이 확인되었습니다.`
        : '확인된 인증이 없습니다.',
    });
  } catch (error: any) {
    console.error('Certification verification error:', error);

    // Handle specific errors
    if (error.message === 'Business number not registered for this organization') {
      return NextResponse.json(
        { error: '사업자등록번호가 등록되지 않았습니다. 프로필을 먼저 완성해주세요.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: '인증 확인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' },
      { status: 500 }
    );
  }
}
