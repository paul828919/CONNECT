/**
 * Contact Request API
 *
 * GET: List contact requests (sent and received)
 * POST: Send a new contact request
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import { PrismaClient, ContactRequestType } from '@prisma/client';

const prisma = new PrismaClient();

// Message templates for different request types
const MESSAGE_TEMPLATES: Record<ContactRequestType, string> = {
  COLLABORATION: `안녕하세요, {senderOrgName}입니다.

{receiverOrgName}의 {industry} 분야 전문성에 관심이 있어 연락드립니다.

저희 조직과 협력 가능성을 논의하고 싶습니다. 편하신 시간에 미팅을 가질 수 있을까요?

감사합니다.`,

  CONSORTIUM_INVITE: `안녕하세요, {senderOrgName}입니다.

{programName} 지원을 위한 컨소시엄을 구성하고 있습니다.

{receiverOrgName}의 {industry} 분야 역량이 본 과제에 적합하다고 판단되어 참여를 제안드립니다.

자세한 내용은 미팅을 통해 논의하면 좋겠습니다.

감사합니다.`,

  RESEARCH_PARTNER: `안녕하세요, {senderOrgName}입니다.

{receiverOrgName}의 연구 역량에 관심이 있어 산학협력 가능성을 타진하고자 합니다.

저희의 {industry} 분야 연구개발 프로젝트에 공동으로 참여하실 의향이 있으신지 문의드립니다.

감사합니다.`,

  TECHNOLOGY_TRANSFER: `안녕하세요, {senderOrgName}입니다.

{receiverOrgName}의 {technology} 기술에 관심이 있습니다.

기술이전 또는 라이센싱 가능성에 대해 논의하고 싶습니다.

연락 주시면 감사하겠습니다.`,

  OTHER: `안녕하세요, {senderOrgName}입니다.

{receiverOrgName}과의 협력 기회를 모색하고자 연락드립니다.

자세한 내용은 미팅을 통해 논의하면 좋겠습니다.

감사합니다.`,
};

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Get user's organization
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true },
    });

    if (!user?.organizationId) {
      return NextResponse.json(
        { error: 'No organization associated with user' },
        { status: 400 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type'); // 'sent' or 'received'

    let sentRequests = [];
    let receivedRequests = [];

    if (!type || type === 'sent') {
      sentRequests = await prisma.contactRequest.findMany({
        where: { senderOrgId: user.organizationId },
        include: {
          receiverOrg: {
            select: {
              id: true,
              name: true,
              type: true,
              logoUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (!type || type === 'received') {
      receivedRequests = await prisma.contactRequest.findMany({
        where: { receiverOrgId: user.organizationId },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          senderOrg: {
            select: {
              id: true,
              name: true,
              type: true,
              logoUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    return NextResponse.json({
      success: true,
      sent: sentRequests,
      received: receivedRequests,
    });
  } catch (error: any) {
    console.error('Failed to fetch contact requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contact requests' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Get user's organization
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { organization: true },
    });

    if (!user?.organization) {
      return NextResponse.json(
        { error: 'No organization associated with user' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { receiverOrgId, type, subject, message, useTemplate } = body;

    // Validate input
    if (!receiverOrgId || !type || !subject) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if receiver organization exists and is active
    const receiverOrg = await prisma.organization.findUnique({
      where: { id: receiverOrgId },
      select: { id: true, name: true, status: true, industrySector: true },
    });

    if (!receiverOrg) {
      return NextResponse.json(
        { error: 'Receiver organization not found' },
        { status: 404 }
      );
    }

    if (receiverOrg.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Cannot send request to inactive organization' },
        { status: 400 }
      );
    }

    // Prevent sending request to own organization
    if (receiverOrgId === user.organization.id) {
      return NextResponse.json(
        { error: 'Cannot send request to your own organization' },
        { status: 400 }
      );
    }

    // Check for duplicate recent requests (within 30 days)
    const recentRequest = await prisma.contactRequest.findFirst({
      where: {
        senderOrgId: user.organization.id,
        receiverOrgId,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        },
        status: { in: ['PENDING', 'ACCEPTED'] },
      },
    });

    if (recentRequest) {
      return NextResponse.json(
        { error: 'You already have a pending or accepted request with this organization' },
        { status: 400 }
      );
    }

    // Use template or custom message
    let finalMessage = message;
    if (useTemplate && MESSAGE_TEMPLATES[type as ContactRequestType]) {
      finalMessage = MESSAGE_TEMPLATES[type as ContactRequestType]
        .replace('{senderOrgName}', user.organization.name)
        .replace('{receiverOrgName}', receiverOrg.name)
        .replace('{industry}', receiverOrg.industrySector || '해당 분야')
        .replace('{programName}', '관련 R&D 프로그램')
        .replace('{technology}', '핵심 기술');
    }

    // Create contact request
    const contactRequest = await prisma.contactRequest.create({
      data: {
        senderId: userId,
        senderOrgId: user.organization.id,
        receiverOrgId,
        type: type as ContactRequestType,
        subject,
        message: finalMessage,
        status: 'PENDING',
      },
      include: {
        receiverOrg: {
          select: {
            id: true,
            name: true,
            type: true,
            logoUrl: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      contactRequest,
      message: '협력 요청이 전송되었습니다',
    });
  } catch (error: any) {
    console.error('Failed to send contact request:', error);
    return NextResponse.json(
      { error: 'Failed to send contact request' },
      { status: 500 }
    );
  }
}
