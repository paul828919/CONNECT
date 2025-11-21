/**
 * Database Seed Script - Connect Platform
 * 
 * Purpose: Populate production database with test data for API testing
 * 
 * Contents:
 * - Test user: kbj20415@gmail.com (김병진)
 * - Test organization: Test Company Ltd. with encrypted business number
 * - OAuth account: Kakao provider
 * - Active subscription: PRO plan (30 days)
 * - 12 funding programs: 3 from each agency (IITP, KEIT, TIPA, KIMST)
 * - 5 sample matches: scores 70-85
 * 
 * Usage:
 *   npm run db:seed
 *   or
 *   npx tsx prisma/seed.ts
 */

import { PrismaClient, AgencyId, OrganizationType } from '@prisma/client';
import { encrypt, hashBusinessNumber } from '../lib/encryption';
import crypto from 'crypto';

// Use crypto.randomUUID() for ID generation (built into Node.js 20+)
const createId = () => crypto.randomUUID();

const prisma = new PrismaClient();

async function main() {
  // Prevent seeding in production environment
  if (process.env.NODE_ENV === 'production') {
    console.log('⚠️  Seed script skipped in production environment');
    console.log('   Test seed data should not be created in production.');
    return;
  }

  console.log('🌱 Starting database seed...\n');

  try {
    // ==========================================
    // Step 1: Create Test Organization
    // ==========================================
    console.log('📦 Step 1: Creating test organization...');
    
    const businessNumber = '123-45-67890';
    const businessNumberEncrypted = encrypt(businessNumber);
    const businessNumberHash = hashBusinessNumber(businessNumber);

    const organization = await prisma.organizations.create({
      data: {
        id: createId(),
        type: 'COMPANY',
        name: 'Test Company Ltd.',
        businessNumberEncrypted,
        businessNumberHash,
        businessStructure: 'CORPORATION',
        description: 'AI/SW 기반 플랫폼 개발 전문 기업',
        website: 'https://testcompany.example.com',
        industrySector: 'SOFTWARE',
        employeeCount: 'FROM_10_TO_50',
        revenueRange: 'FROM_1B_TO_10B',
        rdExperience: true,
        technologyReadinessLevel: 7,
        keyTechnologies: ['인공지능', '머신러닝', '클라우드 컴퓨팅', 'SaaS'],
        collaborationCount: 3,
        primaryContactName: '김병진',
        primaryContactEmail: 'kbj20415@gmail.com',
        primaryContactPhone: '010-1234-5678',
        address: '서울특별시 강남구 테헤란로 123',
        profileCompleted: true,
        profileScore: 85,
        status: 'ACTIVE',
        verifiedAt: new Date(),
      },
    });

    console.log(`✅ Organization created: ${organization.name} (ID: ${organization.id})`);
    console.log(`   Business number encrypted: ${businessNumberEncrypted.substring(0, 20)}...`);
    console.log(`   Business number hash: ${businessNumberHash.substring(0, 20)}...\n`);

    // ==========================================
    // Step 2: Create Test User
    // ==========================================
    console.log('👤 Step 2: Creating test user...');

    const user = await prisma.user.create({
      data: {
        id: createId(),
        email: 'kbj20415@gmail.com',
        name: '김병진',
        role: 'ADMIN',
        organizationId: organization.id,
        emailVerified: new Date(),
        emailNotifications: true,
        weeklyDigest: true,
        lastLoginAt: new Date(),
      },
    });

    console.log(`✅ User created: ${user.name} (${user.email})`);
    console.log(`   User ID: ${user.id}`);
    console.log(`   Role: ${user.role}\n`);

    // ==========================================
    // Step 3: Create OAuth Account (Kakao)
    // ==========================================
    console.log('🔐 Step 3: Creating OAuth account (Kakao)...');

    const account = await prisma.account.create({
      data: {
        id: createId(),
        userId: user.id,
        type: 'oauth',
        provider: 'kakao',
        providerAccountId: 'test_kakao_123456789',
        access_token: 'test_access_token_' + Math.random().toString(36).substring(7),
        token_type: 'bearer',
        scope: 'account_email profile_nickname',
      },
    });

    console.log(`✅ OAuth account created: ${account.provider}`);
    console.log(`   Provider Account ID: ${account.providerAccountId}\n`);

    // ==========================================
    // Step 4: Create Active Subscription
    // ==========================================
    console.log('💳 Step 4: Creating PRO subscription...');

    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const subscription = await prisma.subscriptions.create({
      data: {
        id: createId(),
        userId: user.id,
        plan: 'PRO',
        status: 'ACTIVE',
        billingCycle: 'MONTHLY',
        startedAt: now,
        expiresAt: thirtyDaysLater,
        amount: 49000, // ₩49,000/month (PRO plan)
        currency: 'KRW',
        paymentMethod: 'card',
        nextBillingDate: thirtyDaysLater,
        isBetaUser: true,
        betaDiscount: 50, // 50% beta discount
        betaExpiresAt: thirtyDaysLater,
      },
    });

    console.log(`✅ Subscription created: ${subscription.plan} plan`);
    console.log(`   Status: ${subscription.status}`);
    console.log(`   Amount: ₩${subscription.amount.toLocaleString()}/month`);
    console.log(`   Expires: ${subscription.expiresAt.toISOString().split('T')[0]}\n`);

    // ==========================================
    // Step 5: Create 12 Funding Programs
    // ==========================================
    console.log('📄 Step 5: Creating 12 funding programs (3 from each agency)...\n');

    const programs = [
      // IITP (정보통신기획평가원)
      {
        agencyId: AgencyId.IITP,
        title: 'AI 융합 기술개발 사업',
        description: '인공지능 기술을 활용한 산업 융합 서비스 개발 지원',
        announcementUrl: 'https://www.iitp.kr/example1',
        targetType: [OrganizationType.COMPANY, OrganizationType.RESEARCH_INSTITUTE] as OrganizationType[],
        minTrl: 5,
        maxTrl: 8,
        budgetAmount: 500000000n, // 5억원
        fundingPeriod: '12개월',
        category: 'AI/SW',
        keywords: ['인공지능', 'AI', '머신러닝', '딥러닝', '융합서비스'],
      },
      {
        agencyId: AgencyId.IITP,
        title: '정보통신방송 기술개발사업',
        description: '5G/6G, 클라우드 등 정보통신방송 기술 개발 지원',
        announcementUrl: 'https://www.iitp.kr/example2',
        targetType: [OrganizationType.COMPANY] as OrganizationType[],
        minTrl: 4,
        maxTrl: 7,
        budgetAmount: 300000000n, // 3억원
        fundingPeriod: '18개월',
        category: '정보통신',
        keywords: ['5G', '6G', '클라우드', '네트워크', '방송통신'],
      },
      {
        agencyId: AgencyId.IITP,
        title: 'SW산업 육성 지원사업',
        description: 'SW 중소기업의 글로벌 경쟁력 강화 지원',
        announcementUrl: 'https://www.iitp.kr/example3',
        targetType: [OrganizationType.COMPANY] as OrganizationType[],
        minTrl: 6,
        maxTrl: 9,
        budgetAmount: 200000000n, // 2억원
        fundingPeriod: '12개월',
        category: 'SW',
        keywords: ['소프트웨어', 'SaaS', '플랫폼', '글로벌진출'],
      },

      // KEIT (한국산업기술평가관리원)
      {
        agencyId: AgencyId.KEIT,
        title: '산업기술혁신사업',
        description: '산업 핵심기술 개발 및 사업화 지원',
        announcementUrl: 'https://www.keit.re.kr/example1',
        targetType: [OrganizationType.COMPANY, OrganizationType.RESEARCH_INSTITUTE] as OrganizationType[],
        minTrl: 5,
        maxTrl: 8,
        budgetAmount: 800000000n, // 8억원
        fundingPeriod: '24개월',
        category: '산업기술',
        keywords: ['산업기술', '혁신', '기술개발', '사업화'],
      },
      {
        agencyId: AgencyId.KEIT,
        title: '중소기업 기술혁신개발사업',
        description: '중소기업의 기술혁신 역량 강화 지원',
        announcementUrl: 'https://www.keit.re.kr/example2',
        targetType: [OrganizationType.COMPANY] as OrganizationType[],
        minTrl: 4,
        maxTrl: 7,
        budgetAmount: 400000000n, // 4억원
        fundingPeriod: '18개월',
        category: '중소기업',
        keywords: ['중소기업', '기술혁신', '경쟁력강화'],
      },
      {
        agencyId: AgencyId.KEIT,
        title: '소재부품장비 경쟁력 강화사업',
        description: '핵심 소재·부품·장비 기술개발 지원',
        announcementUrl: 'https://www.keit.re.kr/example3',
        targetType: [OrganizationType.COMPANY, OrganizationType.RESEARCH_INSTITUTE] as OrganizationType[],
        minTrl: 3,
        maxTrl: 6,
        budgetAmount: 1000000000n, // 10억원
        fundingPeriod: '36개월',
        category: '소재부품장비',
        keywords: ['소재', '부품', '장비', '국산화'],
      },

      // TIPA (한국콘텐츠진흥원)
      {
        agencyId: AgencyId.TIPA,
        title: '콘텐츠 제작지원 사업',
        description: '디지털 콘텐츠 제작 및 유통 지원',
        announcementUrl: 'https://www.kocca.kr/example1',
        targetType: [OrganizationType.COMPANY] as OrganizationType[],
        minTrl: 6,
        maxTrl: 9,
        budgetAmount: 300000000n, // 3억원
        fundingPeriod: '12개월',
        category: '콘텐츠',
        keywords: ['콘텐츠', '디지털콘텐츠', '제작지원', '플랫폼'],
      },
      {
        agencyId: AgencyId.TIPA,
        title: '방송영상 진흥사업',
        description: '방송영상 콘텐츠 제작 및 해외진출 지원',
        announcementUrl: 'https://www.kocca.kr/example2',
        targetType: [OrganizationType.COMPANY] as OrganizationType[],
        minTrl: 5,
        maxTrl: 8,
        budgetAmount: 250000000n, // 2.5억원
        fundingPeriod: '12개월',
        category: '방송영상',
        keywords: ['방송', '영상', '콘텐츠', '해외진출'],
      },
      {
        agencyId: AgencyId.TIPA,
        title: '저작권 보호 기술개발',
        description: '디지털 저작권 보호 기술 개발 지원',
        announcementUrl: 'https://www.kocca.kr/example3',
        targetType: [OrganizationType.COMPANY, OrganizationType.RESEARCH_INSTITUTE] as OrganizationType[],
        minTrl: 4,
        maxTrl: 7,
        budgetAmount: 200000000n, // 2억원
        fundingPeriod: '18개월',
        category: '기술개발',
        keywords: ['저작권', 'DRM', '보안', '블록체인'],
      },

      // KIMST (해양수산과학기술진흥원)
      {
        agencyId: AgencyId.KIMST,
        title: '해양수산 R&D 사업',
        description: '해양수산 분야 핵심기술 개발 지원',
        announcementUrl: 'https://www.kimst.re.kr/example1',
        targetType: [OrganizationType.COMPANY, OrganizationType.RESEARCH_INSTITUTE] as OrganizationType[],
        minTrl: 3,
        maxTrl: 6,
        budgetAmount: 600000000n, // 6억원
        fundingPeriod: '24개월',
        category: '해양수산',
        keywords: ['해양', '수산', '스마트양식', 'IoT'],
      },
      {
        agencyId: AgencyId.KIMST,
        title: '수산식품 산업화 지원사업',
        description: '수산식품 기술개발 및 상용화 지원',
        announcementUrl: 'https://www.kimst.re.kr/example2',
        targetType: [OrganizationType.COMPANY] as OrganizationType[],
        minTrl: 5,
        maxTrl: 8,
        budgetAmount: 350000000n, // 3.5억원
        fundingPeriod: '18개월',
        category: '수산식품',
        keywords: ['수산', '식품', '가공기술', '산업화'],
      },
      {
        agencyId: AgencyId.KIMST,
        title: '해양자원 개발사업',
        description: '해양에너지 및 자원 개발 기술 지원',
        announcementUrl: 'https://www.kimst.re.kr/example3',
        targetType: [OrganizationType.COMPANY, OrganizationType.RESEARCH_INSTITUTE] as OrganizationType[],
        minTrl: 2,
        maxTrl: 5,
        budgetAmount: 900000000n, // 9억원
        fundingPeriod: '36개월',
        category: '해양자원',
        keywords: ['해양에너지', '자원개발', '신재생에너지'],
      },
    ];

    const createdPrograms = [];
    const scrapedAt = new Date();
    const oneMonthLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    for (const programData of programs) {
      const contentHash = `${programData.agencyId}_${programData.title}_${Date.now()}_${Math.random()}`;
      
      const program = await prisma.funding_programs.create({
        data: {
          id: createId(),
          ...programData,
          eligibilityCriteria: {
            requirements: [
              '기술개발 능력 보유',
              '사업 수행 조직 및 인력 확보',
              '자부담 비율 충족 (20% 이상)',
            ],
            preferredConditions: [
              'ISO 인증 보유',
              'R&D 전담 조직 운영',
              '정부과제 수행 경험',
            ],
          },
          contentHash,
          status: 'ACTIVE',
          publishedAt: now,
          scrapedAt,
          deadline: oneMonthLater,
        },
      });

      createdPrograms.push(program);
      console.log(`   ✅ ${program.agencyId}: ${program.title}`);
      console.log(`      예산: ₩${Number(program.budgetAmount).toLocaleString()} | TRL ${program.minTrl}-${program.maxTrl}`);
    }

    console.log(`\n✅ Total ${createdPrograms.length} funding programs created\n`);

    // ==========================================
    // Step 6: Create 5 Sample Matches
    // ==========================================
    console.log('🎯 Step 6: Creating 5 sample funding matches...\n');

    // Select 5 programs that match the organization's profile (TRL 7, AI/SW sector)
    const matchablePrograms = createdPrograms.filter(p => {
      const trl = organization.technologyReadinessLevel || 0;
      return (
        (p.minTrl || 0) <= trl &&
        (p.maxTrl || 10) >= trl &&
        p.targetType.includes('COMPANY')
      );
    }).slice(0, 5);

    const matchScores = [85, 80, 78, 75, 72]; // Descending scores

    for (let i = 0; i < matchablePrograms.length; i++) {
      const program = matchablePrograms[i];
      const score = matchScores[i];

      const match = await prisma.funding_matches.create({
        data: {
          id: createId(),
          organizationId: organization.id,
          programId: program.id,
          score,
          explanation: {
            strengths: [
              'TRL 수준이 과제 요구사항과 일치합니다',
              '보유 기술이 과제 키워드와 높은 연관성을 보입니다',
              '기업 규모가 적절하며 R&D 경험이 풍부합니다',
            ],
            weaknesses: [
              '일부 우대 조건 미충족',
            ],
            recommendations: [
              '신청 전 컨소시엄 구성을 검토하세요',
              '기술개발 계획서 작성 시 차별화 전략 강조를 권장합니다',
            ],
            eligibilityScore: 90,
            technicalFitScore: score,
            strategicValueScore: 75,
          },
          viewed: i < 2, // First 2 matches are viewed
          saved: i === 0, // First match is saved
          viewedAt: i < 2 ? new Date() : null,
          savedAt: i === 0 ? new Date() : null,
          notificationSent: true,
          notifiedAt: now,
        },
      });

      console.log(`   ✅ Match created: ${program.title}`);
      console.log(`      Score: ${match.score}/100 | Viewed: ${match.viewed} | Saved: ${match.saved}`);
    }

    console.log(`\n✅ Total ${matchablePrograms.length} matches created\n`);

    // ==========================================
    // Summary
    // ==========================================
    console.log('=' .repeat(50));
    console.log('✅ DATABASE SEED COMPLETED SUCCESSFULLY!\n');
    console.log('📊 Summary:');
    console.log(`   - Organizations: 1 (${organization.name})`);
    console.log(`   - Users: 1 (${user.email})`);
    console.log(`   - OAuth Accounts: 1 (Kakao)`);
    console.log(`   - Subscriptions: 1 (PRO, Active)`);
    console.log(`   - Funding Programs: ${createdPrograms.length}`);
    console.log(`   - Matches: ${matchablePrograms.length}`);
    console.log('');
    console.log('🔑 Test Credentials:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Organization ID: ${organization.id}`);
    console.log(`   User ID: ${user.id}`);
    console.log('');
    console.log('🧪 Test API:');
    console.log(`   POST /api/matches/generate?organizationId=${organization.id}`);
    console.log(`   Expected: HTTP 200 with ${matchablePrograms.length} matches`);
    console.log('=' .repeat(50));
    console.log('');

  } catch (error) {
    console.error('\n❌ Seed failed with error:');
    console.error(error);
    throw error;
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
