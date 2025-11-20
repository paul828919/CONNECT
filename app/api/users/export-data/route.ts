/**
 * Data Export API (PIPA Article 35 - Data Portability)
 *
 * Allows users to download all their personal data in CSV format.
 *
 * PIPA Article 35: Users have the right to receive their personal information
 * in a structured, commonly used, and machine-readable format.
 *
 * Rate Limit: 1 export per hour per user (prevents abuse)
 * Format: CSV (Excel-compatible, machine-readable)
 * Audit: All exports logged for PIPA Article 31 compliance
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { PrismaClient } from '@prisma/client';
import { createClient } from 'redis';
import { createAuditLog, AuditAction } from '@/lib/audit';

const prisma = new PrismaClient();

// Redis client for rate limiting
let redisClient: ReturnType<typeof createClient> | null = null;

async function getRedisClient() {
  if (!redisClient) {
    redisClient = createClient({
      url: process.env.REDIS_CACHE_URL || 'redis://localhost:6379',
    });
    redisClient.on('error', (err) => console.error('[EXPORT] Redis error:', err));
    await redisClient.connect();
  }
  return redisClient;
}

/**
 * GET /api/users/export-data
 *
 * Export all user data in CSV format
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // 2. Rate limiting: 1 export per hour per user
    const redis = await getRedisClient();
    const rateLimitKey = `export:ratelimit:${userId}`;
    const lastExport = await redis.get(rateLimitKey);

    if (lastExport) {
      const ttl = await redis.ttl(rateLimitKey);
      const resetTime = new Date(Date.now() + ttl * 1000);

      return NextResponse.json(
        {
          error: 'Rate limit exceeded. You can export your data once per hour.',
          resetTime: resetTime.toISOString(),
        },
        { status: 429 }
      );
    }

    // 3. Fetch all user data from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        organization: true,
        subscriptions: true,
        accounts: {
          select: {
            provider: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Fetch related data
    const [matches, consortiumMemberships, contactRequests, feedback] = await Promise.all([
      // Funding matches
      prisma.funding_matches.findMany({
        where: { organizationId: user.organizationId || undefined },
        include: {
          funding_programs: {
            select: {
              title: true,
              agencyId: true,
              deadline: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 100, // Limit to last 100 matches
      }),

      // Consortium memberships
      prisma.consortium_members.findMany({
        where: { organizationId: user.organizationId || undefined },
        include: {
          consortium_projects: {
            select: {
              title: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),

      // Contact requests (sent)
      prisma.contact_requests.findMany({
        where: { requesterId: userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),

      // AI feedback
      prisma.ai_feedback.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    // 4. Generate CSV content
    const csvContent = generateCSV({
      user,
      matches,
      consortiumMemberships,
      contactRequests,
      feedback,
    });

    // 5. Set rate limit (1 hour)
    await redis.set(rateLimitKey, Date.now().toString(), {
      EX: 60 * 60, // 1 hour in seconds
    });

    // 6. Create audit log
    await createAuditLog({
      userId,
      action: AuditAction.DATA_EXPORT,
      details: 'User downloaded personal data export (CSV)',
      ipAddress: request.headers.get('x-forwarded-for') || request.ip || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
      requestPath: '/api/users/export-data',
    });

    // 7. Return CSV file
    const filename = `connect-data-export-${userId.substring(0, 8)}-${new Date().toISOString().split('T')[0]}.csv`;

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error('[EXPORT] Data export error:', error instanceof Error ? error.message : error);

    return NextResponse.json(
      {
        error: 'Failed to export data. Please try again later.',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Generate CSV content from user data
 */
function generateCSV(data: {
  user: any;
  matches: any[];
  consortiumMemberships: any[];
  contactRequests: any[];
  feedback: any[];
}): string {
  const { user, matches, consortiumMemberships, contactRequests, feedback } = data;

  // CSV sections
  const sections: string[] = [];

  // BOM for UTF-8 Excel compatibility (prevents Korean character corruption)
  const BOM = '\uFEFF';

  // Section 1: User Account Information
  sections.push('===== 계정 정보 (Account Information) =====');
  sections.push('필드,값');
  sections.push(`사용자 ID,${user.id}`);
  sections.push(`이메일,${user.email || 'N/A'}`);
  sections.push(`이름,${user.name || 'N/A'}`);
  sections.push(`역할,${user.role}`);
  sections.push(`이메일 알림 수신,${user.emailNotifications ? '예' : '아니오'}`);
  sections.push(`주간 다이제스트 수신,${user.weeklyDigest ? '예' : '아니오'}`);
  sections.push(`가입일,${user.createdAt.toISOString()}`);
  sections.push(`최근 로그인,${user.lastLoginAt?.toISOString() || 'N/A'}`);
  sections.push('');

  // Section 2: OAuth Connections
  if (user.accounts && user.accounts.length > 0) {
    sections.push('===== OAuth 연동 (OAuth Connections) =====');
    sections.push('제공자,연동일');
    user.accounts.forEach((account: any) => {
      sections.push(`${account.provider},${account.createdAt.toISOString()}`);
    });
    sections.push('');
  }

  // Section 3: Organization Information
  if (user.organization) {
    const org = user.organization;
    sections.push('===== 조직 정보 (Organization Information) =====');
    sections.push('필드,값');
    sections.push(`조직 ID,${org.id}`);
    sections.push(`조직명,${org.name}`);
    sections.push(`조직 유형,${org.type}`);
    sections.push(`사업자 구조,${org.businessStructure || 'N/A'}`);
    sections.push(`산업 분야,${org.industrySector || 'N/A'}`);
    sections.push(`직원 수 범위,${org.employeeCount || 'N/A'}`);
    sections.push(`매출 범위,${org.revenueRange || 'N/A'}`);
    sections.push(`R&D 경험,${org.rdExperience ? '있음' : '없음'}`);
    sections.push(`기술 성숙도 (TRL),${org.technologyReadinessLevel || 'N/A'}`);
    sections.push(`핵심 기술,${org.keyTechnologies?.join('; ') || 'N/A'}`);
    sections.push(`보유 인증,${org.certifications?.join('; ') || 'N/A'}`);
    sections.push(`등록일,${org.createdAt.toISOString()}`);
    sections.push('');
  }

  // Section 4: Subscription Information
  if (user.subscriptions) {
    const sub = user.subscriptions;
    sections.push('===== 구독 정보 (Subscription) =====');
    sections.push('필드,값');
    sections.push(`구독 플랜,${sub.plan}`);
    sections.push(`구독 상태,${sub.status}`);
    sections.push(`결제 주기,${sub.billingCycle}`);
    sections.push(`요금,${sub.amount.toLocaleString()} ${sub.currency}`);
    sections.push(`시작일,${sub.startedAt.toISOString()}`);
    sections.push(`만료일,${sub.expiresAt.toISOString()}`);
    sections.push(`다음 결제일,${sub.nextBillingDate?.toISOString() || 'N/A'}`);
    sections.push(`베타 사용자,${sub.isBetaUser ? '예' : '아니오'}`);
    sections.push('');
  }

  // Section 5: Funding Matches
  if (matches.length > 0) {
    sections.push('===== 매칭 과제 (Funding Matches) =====');
    sections.push('과제명,기관,마감일,매칭 점수,조회 여부,저장 여부,생성일');
    matches.forEach((match) => {
      sections.push(
        `"${escapeCSV(match.funding_programs.title)}",` +
        `${match.funding_programs.agencyId},` +
        `${match.funding_programs.deadline?.toISOString().split('T')[0] || 'N/A'},` +
        `${match.score},` +
        `${match.viewed ? '예' : '아니오'},` +
        `${match.saved ? '예' : '아니오'},` +
        `${match.createdAt.toISOString()}`
      );
    });
    sections.push('');
  }

  // Section 6: Consortium Memberships
  if (consortiumMemberships.length > 0) {
    sections.push('===== 컨소시엄 참여 (Consortium Memberships) =====');
    sections.push('프로젝트명,역할,상태,참여일');
    consortiumMemberships.forEach((member) => {
      sections.push(
        `"${escapeCSV(member.consortium_projects.title)}",` +
        `${member.role},` +
        `${member.consortium_projects.status},` +
        `${member.createdAt.toISOString()}`
      );
    });
    sections.push('');
  }

  // Section 7: Contact Requests
  if (contactRequests.length > 0) {
    sections.push('===== 협업 요청 (Contact Requests) =====');
    sections.push('요청 유형,상태,생성일');
    contactRequests.forEach((request) => {
      sections.push(
        `${request.requestType},` +
        `${request.status},` +
        `${request.createdAt.toISOString()}`
      );
    });
    sections.push('');
  }

  // Section 8: AI Feedback
  if (feedback.length > 0) {
    sections.push('===== AI 서비스 피드백 (AI Feedback) =====');
    sections.push('서비스 유형,평가,의견,작성일');
    feedback.forEach((fb) => {
      sections.push(
        `${fb.serviceType},` +
        `${fb.rating},` +
        `"${escapeCSV(fb.comment || '')}",` +
        `${fb.createdAt.toISOString()}`
      );
    });
    sections.push('');
  }

  // Footer
  sections.push('===== 내보내기 정보 (Export Metadata) =====');
  sections.push('필드,값');
  sections.push(`내보내기 일시,${new Date().toISOString()}`);
  sections.push(`데이터 형식,CSV (UTF-8)`);
  sections.push(`준수 규정,개인정보 보호법(PIPA) 제35조 (데이터 이동권)`);
  sections.push(`보존 기간,사용자 재량 (Connect는 이 파일을 저장하지 않음)`);

  return BOM + sections.join('\n');
}

/**
 * Escape CSV values (handle commas, quotes, newlines)
 */
function escapeCSV(value: string): string {
  if (!value) return '';

  // Replace double quotes with escaped quotes
  let escaped = value.replace(/"/g, '""');

  // Escape newlines
  escaped = escaped.replace(/\n/g, ' ');
  escaped = escaped.replace(/\r/g, '');

  return escaped;
}
