/**
 * Phase 7 Test Data Seed Script
 *
 * Creates comprehensive test data for Phase 7 verification:
 * - Test organizations (QuantumEdge AI + partner organizations)
 * - Test users for each organization
 * - Test contact requests (collaboration messages)
 * - Test consortium projects with members
 * - Test funding programs for consortium targeting
 *
 * Usage: DATABASE_URL="postgresql://..." npx tsx scripts/seed-phase7-test-data.ts
 *
 * ⚠️ Warning: This creates test data for local development only.
 * Delete after verification is complete.
 */

import { PrismaClient, OrganizationType, EmployeeCountRange, RevenueRange, BusinessStructure, ContactRequestType, ContactRequestStatus, ConsortiumRole, MemberStatus, ConsortiumStatus, AgencyId } from '@prisma/client';
import { encrypt, hashBusinessNumber } from '../lib/encryption';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Test Organizations
const TEST_ORGANIZATIONS = [
  {
    name: 'QuantumEdge AI',
    businessNumber: '101-81-11111',
    type: OrganizationType.COMPANY,
    businessStructure: BusinessStructure.CORPORATION,
    industrySector: 'IT/Software/AI',
    description: '차세대 AI 기술 개발 전문 기업. 컴퓨터 비전 및 자연어 처리 분야에서 혁신적인 솔루션을 제공합니다.',
    website: 'https://quantumedge.ai',
    employeeCount: EmployeeCountRange.FROM_10_TO_50,
    revenueRange: RevenueRange.FROM_1B_TO_10B,
    rdExperience: true,
    technologyReadinessLevel: 5,
    researcherCount: 8,
    annualRdBudget: '500000000',
    researchFocusAreas: ['AI', 'Machine Learning', 'Computer Vision', 'Natural Language Processing'],
    keyTechnologies: ['Deep Learning', 'Transformer Models', 'Edge AI', 'Federated Learning'],
    desiredConsortiumFields: ['AI Research', 'Smart Manufacturing', 'Healthcare AI'],
    desiredTechnologies: ['Cloud Computing', 'IoT', 'Big Data'],
    targetPartnerTRL: 7,
    profileCompleted: true,
    profileScore: 85,
  },
  {
    name: '이노웨이브',
    businessNumber: '101-81-22222',
    type: OrganizationType.COMPANY,
    businessStructure: BusinessStructure.CORPORATION,
    industrySector: '제조/자동화',
    description: '스마트 제조 및 산업 자동화 솔루션 제공 기업',
    website: 'https://innowave.co.kr',
    employeeCount: EmployeeCountRange.FROM_100_TO_300,
    revenueRange: RevenueRange.FROM_10B_TO_50B,
    rdExperience: true,
    technologyReadinessLevel: 7,
    researcherCount: 25,
    annualRdBudget: '1200000000',
    researchFocusAreas: ['Smart Manufacturing', 'Industrial IoT', 'Predictive Maintenance'],
    keyTechnologies: ['PLC Programming', 'SCADA Systems', 'Machine Vision'],
    desiredConsortiumFields: ['AI Integration', 'Robotics', 'Digital Twin'],
    desiredTechnologies: ['AI', 'Cloud Platform', '5G'],
    targetPartnerTRL: 5,
    profileCompleted: true,
    profileScore: 90,
  },
  {
    name: 'BioMed Research Institute',
    businessNumber: '101-81-33333',
    type: OrganizationType.RESEARCH_INSTITUTE,
    industrySector: 'Biotechnology/Healthcare',
    description: '생명공학 및 의료 AI 연구 전문 기관',
    website: 'https://biomed-research.kr',
    employeeCount: EmployeeCountRange.FROM_50_TO_100,
    rdExperience: true,
    technologyReadinessLevel: 3,
    researcherCount: 40,
    annualRdBudget: '800000000',
    researchFocusAreas: ['Medical AI', 'Drug Discovery', 'Genomics', 'Clinical Trials'],
    keyTechnologies: ['Bioinformatics', 'Machine Learning', 'High-throughput Screening'],
    desiredConsortiumFields: ['Healthcare AI', 'Precision Medicine', 'Diagnostics'],
    desiredTechnologies: ['Deep Learning', 'Data Analytics', 'Cloud Computing'],
    targetPartnerTRL: 7,
    profileCompleted: true,
    profileScore: 88,
  },
  {
    name: 'GreenTech Solutions',
    businessNumber: '101-81-44444',
    type: OrganizationType.COMPANY,
    businessStructure: BusinessStructure.CORPORATION,
    industrySector: 'Energy/Environment',
    description: '신재생 에너지 및 ESG 솔루션 개발 기업',
    website: 'https://greentech.co.kr',
    employeeCount: EmployeeCountRange.OVER_300,
    revenueRange: RevenueRange.FROM_50B_TO_100B,
    rdExperience: true,
    technologyReadinessLevel: 9,
    researcherCount: 60,
    annualRdBudget: '5000000000',
    researchFocusAreas: ['Solar Energy', 'Battery Technology', 'Smart Grid', 'Carbon Reduction'],
    keyTechnologies: ['Energy Storage', 'Power Electronics', 'IoT', 'Blockchain'],
    desiredConsortiumFields: ['AI for Energy Optimization', 'Smart City', 'Climate Tech'],
    desiredTechnologies: ['AI', 'Big Data', 'Digital Twin'],
    targetPartnerTRL: 5,
    profileCompleted: true,
    profileScore: 95,
  },
];

// Test Users (one per organization)
const TEST_USERS = [
  {
    email: 'kim@quantumedge.ai',
    password: 'test1234',
    name: '김현수',
    orgIndex: 0, // QuantumEdge AI
  },
  {
    email: 'lee@innowave.co.kr',
    password: 'test1234',
    name: '이영희',
    orgIndex: 1, // 이노웨이브
  },
  {
    email: 'park@biomed-research.kr',
    password: 'test1234',
    name: '박지민',
    orgIndex: 2, // BioMed Research Institute
  },
  {
    email: 'choi@greentech.co.kr',
    password: 'test1234',
    name: '최준호',
    orgIndex: 3, // GreenTech Solutions
  },
];

async function main() {
  console.log('🌱 Starting Phase 7 test data seeding...\n');

  // 1. Create Test Organizations
  console.log('📦 Creating test organizations...');
  const createdOrgs = [];

  for (const org of TEST_ORGANIZATIONS) {
    try {
      const created = await prisma.organizations.create({
        data: {
          name: org.name,
          type: org.type,
          businessNumberEncrypted: encrypt(org.businessNumber),
          businessNumberHash: hashBusinessNumber(org.businessNumber),
          businessStructure: org.businessStructure || undefined,
          industrySector: org.industrySector,
          description: org.description,
          website: org.website,
          employeeCount: org.employeeCount,
          revenueRange: org.revenueRange || undefined,
          rdExperience: org.rdExperience,
          technologyReadinessLevel: org.technologyReadinessLevel,
          researcherCount: org.researcherCount,
          annualRdBudget: org.annualRdBudget,
          researchFocusAreas: org.researchFocusAreas,
          keyTechnologies: org.keyTechnologies,
          desiredConsortiumFields: org.desiredConsortiumFields,
          desiredTechnologies: org.desiredTechnologies,
          targetPartnerTRL: org.targetPartnerTRL,
          profileCompleted: org.profileCompleted,
          profileScore: org.profileScore,
        },
      });
      createdOrgs.push(created);
      console.log(`  ✅ Created: ${created.name} (${created.type})`);
    } catch (error: any) {
      if (error.code === 'P2002') {
        console.log(`  ⚠️  Skipped: ${org.name} (already exists)`);
        // Fetch existing org
        const existing = await prisma.organizations.findUnique({
          where: { businessNumberHash: hashBusinessNumber(org.businessNumber) },
        });
        if (existing) createdOrgs.push(existing);
      } else {
        throw error;
      }
    }
  }

  // 2. Create Test Users
  console.log('\n👥 Creating test users...');
  const createdUsers = [];

  for (const user of TEST_USERS) {
    const org = createdOrgs[user.orgIndex];
    if (!org) {
      console.log(`  ⚠️  Skipped user ${user.email}: Organization not found`);
      continue;
    }

    try {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      const created = await prisma.user.create({
        data: {
          email: user.email,
          password: hashedPassword,
          name: user.name,
          organizationId: org.id,
          emailVerified: new Date(),
        },
      });
      createdUsers.push(created);
      console.log(`  ✅ Created: ${created.name} (${created.email}) → ${org.name}`);
    } catch (error: any) {
      if (error.code === 'P2002') {
        console.log(`  ⚠️  Skipped: ${user.email} (already exists)`);
        const existing = await prisma.user.findUnique({
          where: { email: user.email },
        });
        if (existing) createdUsers.push(existing);
      } else {
        throw error;
      }
    }
  }

  // 3. Create Test Contact Requests (Collaboration Messages)
  console.log('\n💬 Creating test contact requests...');

  if (createdUsers.length >= 2 && createdOrgs.length >= 2) {
    const contactRequests = [
      {
        senderId: createdUsers[1].id, // 이노웨이브
        senderOrgId: createdOrgs[1].id,
        receiverOrgId: createdOrgs[0].id, // QuantumEdge AI
        type: ContactRequestType.COLLABORATION,
        subject: 'AI 기반 스마트 제조 협업 제안',
        message: '안녕하세요. 당사는 스마트 제조 분야에서 AI 기술 통합에 관심이 있습니다. 귀사의 컴퓨터 비전 및 예측 모델 기술과 당사의 제조 현장 경험을 결합하여 시너지를 창출하고자 합니다. 협업 가능성에 대해 논의하고 싶습니다.',
        status: ContactRequestStatus.PENDING,
      },
      {
        senderId: createdUsers[2].id, // BioMed
        senderOrgId: createdOrgs[2].id,
        receiverOrgId: createdOrgs[0].id, // QuantumEdge AI
        type: ContactRequestType.RESEARCH_PARTNER,
        subject: '의료 AI 연구 파트너십 문의',
        message: '귀사의 자연어 처리 및 머신러닝 기술을 활용하여 임상 데이터 분석 및 진단 보조 시스템 개발에 협력하고 싶습니다. 정부 R&D 과제 공동 참여를 제안드립니다.',
        status: ContactRequestStatus.PENDING,
      },
      {
        senderId: createdUsers[0].id, // QuantumEdge AI
        senderOrgId: createdOrgs[0].id,
        receiverOrgId: createdOrgs[3].id, // GreenTech
        type: ContactRequestType.COLLABORATION,
        subject: 'AI 기반 에너지 최적화 협업',
        message: '당사의 AI 기술을 활용하여 귀사의 스마트 그리드 및 에너지 저장 시스템을 최적화하는 프로젝트에 관심이 있습니다. 함께 정부 과제에 지원하는 것은 어떨까요?',
        status: ContactRequestStatus.PENDING,
      },
    ];

    for (const request of contactRequests) {
      try {
        const created = await prisma.contact_requests.create({
          data: request,
        });
        console.log(`  ✅ Created contact request: ${request.subject}`);
      } catch (error: any) {
        console.log(`  ⚠️  Skipped contact request: ${request.subject} (may already exist)`);
      }
    }
  }

  // 4. Create Test Funding Programs (for consortium targeting)
  console.log('\n🎯 Creating test funding programs...');

  const testPrograms = [
    {
      agencyId: AgencyId.IITP,
      title: '2025년 인공지능 융합 혁신 프로젝트',
      description: 'AI 기술을 활용한 산업 융합 혁신 과제 지원',
      announcementUrl: 'https://www.iitp.kr/test-program-1',
      targetType: [OrganizationType.COMPANY, OrganizationType.RESEARCH_INSTITUTE],
      minTrl: 5,
      maxTrl: 7,
      budgetAmount: 500000000n,
      fundingPeriod: '24개월',
      deadline: new Date('2025-03-31'),
      category: 'AI/Machine Learning',
      keywords: ['AI', 'Machine Learning', 'Industrial Innovation', 'Digital Transformation'],
      contentHash: 'test-iitp-ai-fusion-2025',
      scrapedAt: new Date(),
    },
    {
      agencyId: AgencyId.KEIT,
      title: '스마트 제조 혁신 기술개발 사업',
      description: '스마트 공장 및 제조 혁신 기술 개발 지원',
      announcementUrl: 'https://www.keit.re.kr/test-program-2',
      targetType: [OrganizationType.COMPANY],
      minTrl: 7,
      maxTrl: 9,
      budgetAmount: 800000000n,
      fundingPeriod: '36개월',
      deadline: new Date('2025-04-15'),
      category: 'Smart Manufacturing',
      keywords: ['Smart Factory', 'IoT', 'Automation', 'Industry 4.0'],
      contentHash: 'test-keit-smart-mfg-2025',
      scrapedAt: new Date(),
    },
  ];

  const createdPrograms = [];
  for (const program of testPrograms) {
    try {
      const created = await prisma.funding_programs.create({
        data: program,
      });
      createdPrograms.push(created);
      console.log(`  ✅ Created: ${created.title}`);
    } catch (error: any) {
      if (error.code === 'P2002') {
        console.log(`  ⚠️  Skipped: ${program.title} (already exists)`);
        const existing = await prisma.funding_programs.findUnique({
          where: { contentHash: program.contentHash },
        });
        if (existing) createdPrograms.push(existing);
      } else {
        throw error;
      }
    }
  }

  // 5. Create Test Consortium Project
  console.log('\n🤝 Creating test consortium project...');

  if (createdUsers.length >= 3 && createdOrgs.length >= 3 && createdPrograms.length > 0) {
    try {
      const consortium = await prisma.consortium_projects.create({
        data: {
          name: 'AI 기반 스마트 제조 혁신 컨소시엄',
          description: 'AI와 IoT 기술을 활용한 스마트 제조 시스템 개발 및 실증',
          leadOrganizationId: createdOrgs[0].id, // QuantumEdge AI as lead
          createdById: createdUsers[0].id,
          targetProgramId: createdPrograms[0].id, // Link to IITP program
          totalBudget: 500000000n,
          projectDuration: '24개월',
          status: ConsortiumStatus.DRAFT,
          consortium_members: {
            create: [
              {
                organizationId: createdOrgs[0].id, // QuantumEdge AI (Lead)
                invitedById: createdUsers[0].id,
                role: ConsortiumRole.LEAD,
                budgetShare: 200000000n,
                budgetPercent: 40.0,
                responsibilities: 'AI 모델 개발 및 시스템 통합',
                status: MemberStatus.ACCEPTED,
                respondedAt: new Date(),
              },
              {
                organizationId: createdOrgs[1].id, // 이노웨이브 (Participant)
                invitedById: createdUsers[0].id,
                role: ConsortiumRole.PARTICIPANT,
                budgetShare: 200000000n,
                budgetPercent: 40.0,
                responsibilities: '제조 현장 적용 및 실증',
                status: MemberStatus.INVITED,
              },
              {
                organizationId: createdOrgs[2].id, // BioMed (Subcontractor)
                invitedById: createdUsers[0].id,
                role: ConsortiumRole.SUBCONTRACTOR,
                budgetShare: 100000000n,
                budgetPercent: 20.0,
                responsibilities: '데이터 분석 및 품질 검증',
                status: MemberStatus.INVITED,
              },
            ],
          },
        },
      });
      console.log(`  ✅ Created consortium: ${consortium.name}`);
      console.log(`     - Members: 3 organizations`);
      console.log(`     - Target Program: ${createdPrograms[0].title}`);
      console.log(`     - Total Budget: ₩${consortium.totalBudget?.toString()}`);
    } catch (error: any) {
      console.log(`  ⚠️  Skipped consortium creation:`, error.message);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('✅ Phase 7 Test Data Seeding Complete!');
  console.log('='.repeat(60));
  console.log(`Organizations: ${createdOrgs.length}`);
  console.log(`Users: ${createdUsers.length}`);
  console.log(`Funding Programs: ${createdPrograms.length}`);
  console.log('\n📧 Test User Credentials:');
  TEST_USERS.forEach((user, index) => {
    if (index < createdUsers.length) {
      console.log(`  - ${user.email} / ${user.password} (${user.name})`);
    }
  });
  console.log('\n🔗 Next Steps:');
  console.log('  1. Visit http://localhost:3000/auth/signin');
  console.log('  2. Login with any test user above');
  console.log('  3. Navigate to /dashboard/messages to view contact requests');
  console.log('  4. Navigate to /dashboard/consortiums to view consortium projects');
  console.log('\n⚠️  Remember to delete this test data after verification!\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
