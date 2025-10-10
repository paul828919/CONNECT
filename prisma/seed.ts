/**
 * Database Seed Script for Connect Platform
 *
 * Populates database with initial data:
 * - Sample funding programs from 4 agencies
 * - Test organizations (company + research institute)
 * - Admin user
 *
 * Usage:
 * npm run db:seed
 */

import { PrismaClient, AgencyId, OrganizationType, ProgramStatus } from '@prisma/client';
import { hashBusinessNumber } from '../lib/encryption';
import { createHash, randomUUID } from 'crypto';

const prisma = new PrismaClient();

// Helper function to create content hash
function generateContentHash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

// Helper to create future dates
function daysFromNow(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

async function main() {
  console.log('🌱 Starting database seed...');

  // =================================================================
  // 1. Create Admin User
  // =================================================================
  console.log('Creating admin user...');

  const admin = await prisma.users.upsert({
    where: { email: 'admin@connect.kr' },
    update: {},
    create: {
      id: randomUUID(),
      email: 'admin@connect.kr',
      name: 'System Admin',
      role: 'ADMIN',
      emailVerified: new Date(),
      emailNotifications: true,
      weeklyDigest: true,
      updatedAt: new Date(),
    },
  });

  console.log(`✓ Admin user created: ${admin.email}`);

  // =================================================================
  // 2. Seed Funding Programs (4 Agencies)
  // =================================================================
  console.log('\nSeeding funding programs from 4 agencies...');

  const fundingPrograms = [
    // IITP Programs (정보통신기획평가원)
    {
      agencyId: AgencyId.IITP,
      title: '2025년 ICT R&D 혁신 바우처 지원사업',
      description: 'AI·빅데이터·클라우드 등 ICT 기술 개발을 위한 중소기업 대상 R&D 바우처 지원',
      announcementUrl: 'https://www.iitp.kr/kr/1/business/notice/view.it?ArticleIdx=5431',
      targetType: [OrganizationType.COMPANY],
      minTrl: 3,
      maxTrl: 7,
      budgetAmount: BigInt(50000000000), // 500억원
      fundingPeriod: '12 months',
      deadline: daysFromNow(45),
      category: 'ICT',
      keywords: ['AI', 'BigData', 'Cloud', 'ICT'],
      status: ProgramStatus.ACTIVE,
      publishedAt: new Date(),
      scrapedAt: new Date(),
    },
    {
      agencyId: AgencyId.IITP,
      title: '디지털 전환 촉진 지원사업 (DX Transformation)',
      description: '중소기업의 디지털 전환을 위한 SW·데이터 분석 플랫폼 구축 지원',
      announcementUrl: 'https://www.iitp.kr/kr/1/business/notice/view.it?ArticleIdx=5432',
      targetType: [OrganizationType.COMPANY, OrganizationType.RESEARCH_INSTITUTE],
      minTrl: 4,
      maxTrl: 8,
      budgetAmount: BigInt(30000000000), // 300억원
      fundingPeriod: '24 months',
      deadline: daysFromNow(60),
      category: 'Digital Transformation',
      keywords: ['DX', 'Software', 'Platform', 'Data'],
      status: ProgramStatus.ACTIVE,
      publishedAt: new Date(),
      scrapedAt: new Date(),
    },

    // KEIT Programs (한국산업기술평가관리원)
    {
      agencyId: AgencyId.KEIT,
      title: '산업기술 혁신사업 (신제품 개발)',
      description: '제조 산업 경쟁력 강화를 위한 신제품·신기술 개발 지원',
      announcementUrl: 'https://www.keit.re.kr/business/notice/view.do?idx=12345',
      targetType: [OrganizationType.COMPANY],
      minTrl: 5,
      maxTrl: 9,
      budgetAmount: BigInt(80000000000), // 800억원
      fundingPeriod: '36 months',
      deadline: daysFromNow(35),
      category: 'Manufacturing',
      keywords: ['Manufacturing', 'NewProduct', 'Innovation'],
      status: ProgramStatus.ACTIVE,
      publishedAt: new Date(),
      scrapedAt: new Date(),
    },
    {
      agencyId: AgencyId.KEIT,
      title: '탄소중립 산업 전환 기술개발',
      description: '탄소중립 목표 달성을 위한 산업공정 혁신 기술 개발 지원',
      announcementUrl: 'https://www.keit.re.kr/business/notice/view.do?idx=12346',
      targetType: [OrganizationType.COMPANY, OrganizationType.RESEARCH_INSTITUTE],
      minTrl: 3,
      maxTrl: 7,
      budgetAmount: BigInt(60000000000), // 600억원
      fundingPeriod: '48 months',
      deadline: daysFromNow(50),
      category: 'Carbon Neutral',
      keywords: ['CarbonNeutral', 'GreenTech', 'ESG'],
      status: ProgramStatus.ACTIVE,
      publishedAt: new Date(),
      scrapedAt: new Date(),
    },

    // TIPA Programs (중소기업기술정보진흥원)
    {
      agencyId: AgencyId.TIPA,
      title: '중소기업 기술혁신개발사업 (S2-3)',
      description: '기술력 우수 중소기업 대상 제품 상용화 R&D 지원',
      announcementUrl: 'https://www.tipa.or.kr/business/notice/view.do?idx=98765',
      targetType: [OrganizationType.COMPANY],
      minTrl: 6,
      maxTrl: 9,
      budgetAmount: BigInt(40000000000), // 400억원
      fundingPeriod: '24 months',
      deadline: daysFromNow(30),
      category: 'SME Support',
      keywords: ['SME', 'Commercialization', 'Product'],
      status: ProgramStatus.ACTIVE,
      publishedAt: new Date(),
      scrapedAt: new Date(),
    },
    {
      agencyId: AgencyId.TIPA,
      title: '스타트업 기술창업 지원사업',
      description: '초기 스타트업의 기술사업화 및 시장진입 지원',
      announcementUrl: 'https://www.tipa.or.kr/business/notice/view.do?idx=98766',
      targetType: [OrganizationType.COMPANY],
      minTrl: 4,
      maxTrl: 7,
      budgetAmount: BigInt(20000000000), // 200억원
      fundingPeriod: '12 months',
      deadline: daysFromNow(20),
      category: 'Startup',
      keywords: ['Startup', 'Tech', 'Commercialization'],
      status: ProgramStatus.ACTIVE,
      publishedAt: new Date(),
      scrapedAt: new Date(),
    },

    // KIMST Programs (해양수산과학기술진흥원)
    {
      agencyId: AgencyId.KIMST,
      title: '해양바이오 산업화 기술개발',
      description: '해양 바이오소재를 활용한 신산업 창출 지원',
      announcementUrl: 'https://www.kimst.re.kr/business/notice/view.do?idx=11111',
      targetType: [OrganizationType.COMPANY, OrganizationType.RESEARCH_INSTITUTE],
      minTrl: 3,
      maxTrl: 8,
      budgetAmount: BigInt(25000000000), // 250억원
      fundingPeriod: '36 months',
      deadline: daysFromNow(70),
      category: 'Marine Bio',
      keywords: ['MarineBio', 'Biotech', 'NewIndustry'],
      status: ProgramStatus.ACTIVE,
      publishedAt: new Date(),
      scrapedAt: new Date(),
    },
    {
      agencyId: AgencyId.KIMST,
      title: '스마트 수산양식 기술개발',
      description: 'ICT 기반 스마트 양식 시스템 구축 및 실증',
      announcementUrl: 'https://www.kimst.re.kr/business/notice/view.do?idx=11112',
      targetType: [OrganizationType.COMPANY],
      minTrl: 5,
      maxTrl: 9,
      budgetAmount: BigInt(15000000000), // 150억원
      fundingPeriod: '24 months',
      deadline: daysFromNow(80),
      category: 'Smart Aquaculture',
      keywords: ['SmartFarm', 'ICT', 'Aquaculture'],
      status: ProgramStatus.ACTIVE,
      publishedAt: new Date(),
      scrapedAt: new Date(),
    },
  ];

  for (const program of fundingPrograms) {
    // Generate content hash for change detection
    const content = JSON.stringify({
      title: program.title,
      description: program.description,
      deadline: program.deadline,
      budgetAmount: program.budgetAmount.toString(),
    });
    const contentHash = generateContentHash(content);

    await prisma.funding_programs.upsert({
      where: { contentHash },
      update: {},
      create: {
        id: randomUUID(),
        ...program,
        contentHash,
        updatedAt: new Date(),
      },
    });
  }

  console.log(`✓ Seeded ${fundingPrograms.length} funding programs`);

  // =================================================================
  // 3. Seed Test Organizations (Optional - for development)
  // =================================================================
  console.log('\nSeeding test organizations...');

  // Note: In production, organizations are created by users
  // This is just for development/testing

  const testCompanyBusinessNumber = '123-45-67890';
  const testInstituteBusinessNumber = '987-65-43210';

  const testCompany = await prisma.organizations.upsert({
    where: { businessNumberHash: hashBusinessNumber(testCompanyBusinessNumber) },
    update: {},
    create: {
      id: randomUUID(),
      type: OrganizationType.COMPANY,
      name: 'Test Company Ltd.',
      businessNumberEncrypted: 'encrypted_' + testCompanyBusinessNumber, // In production, use lib/encryption.ts
      businessNumberHash: hashBusinessNumber(testCompanyBusinessNumber),
      businessStructure: 'CORPORATION',
      industrySector: 'ICT',
      employeeCount: 'FROM_10_TO_50',
      revenueRange: 'FROM_1B_TO_10B',
      rdExperience: true,
      technologyReadinessLevel: 6,
      description: 'Test company for development purposes',
      profileCompleted: true,
      profileScore: 85,
      status: 'ACTIVE',
      updatedAt: new Date(),
    },
  });

  const testInstitute = await prisma.organizations.upsert({
    where: { businessNumberHash: hashBusinessNumber(testInstituteBusinessNumber) },
    update: {},
    create: {
      id: randomUUID(),
      type: OrganizationType.RESEARCH_INSTITUTE,
      name: 'Test Research Institute',
      businessNumberEncrypted: 'encrypted_' + testInstituteBusinessNumber,
      businessNumberHash: hashBusinessNumber(testInstituteBusinessNumber),
      instituteType: 'GOVERNMENT_FUNDED',
      researchFocusAreas: ['AI', 'Biotechnology', 'Clean Energy'],
      annualRdBudget: 'FROM_10B_TO_50B',
      researcherCount: 150,
      keyTechnologies: ['Machine Learning', 'Data Analytics', 'IoT', 'Blockchain', 'Quantum'],
      collaborationHistory: true,
      description: 'Test research institute for development purposes',
      profileCompleted: true,
      profileScore: 90,
      status: 'ACTIVE',
      updatedAt: new Date(),
    },
  });

  console.log(`✓ Seeded 2 test organizations`);
  console.log(`  - ${testCompany.name} (Company)`);
  console.log(`  - ${testInstitute.name} (Research Institute)`);

  console.log('\n✅ Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });