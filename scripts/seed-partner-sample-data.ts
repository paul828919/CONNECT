/**
 * Seed Partner Sample Data
 *
 * Creates diverse sample organizations across all industries
 * for testing partner search functionality
 *
 * Categories:
 * - ICT (2 companies, 1 institute)
 * - Manufacturing (2 companies, 1 institute)
 * - Bio_Health (2 companies, 1 institute)
 * - Energy (1 company, 1 institute)
 * - Agriculture (1 company, 1 institute)
 * - Cultural Heritage (1 institute)
 */

import { PrismaClient } from '@prisma/client';
import { encrypt, hashBusinessNumber } from '../lib/encryption';

const db = new PrismaClient();

// Helper function to generate business number
function generateBusinessNumber(seed: number): string {
  const part1 = (100 + seed).toString().padStart(3, '0');
  const part2 = (10 + (seed % 90)).toString().padStart(2, '0');
  const part3 = (10000 + (seed * 123) % 90000).toString().padStart(5, '0');
  return `${part1}-${part2}-${part3}`;
}

async function main() {
  console.log('🌱 Starting to seed partner sample data...\n');

  const sampleOrgs = [
    // ========== ICT (정보통신기술) ==========
    {
      type: 'COMPANY' as const,
      name: '넥스트클라우드',
      businessNumber: generateBusinessNumber(1),
      industrySector: 'ICT',
      employeeCount: 'FROM_50_TO_100',
      rdExperience: true,
      technologyReadinessLevel: 7,
      description: 'AI 기반 클라우드 솔루션 개발 전문 기업. 기업용 SaaS 플랫폼 구축 경험 보유.',
      revenueRange: 'FROM_50B_TO_100B',
      businessStructure: 'CORPORATION',
      businessEstablishedDate: new Date('2018-03-15'),
      certifications: ['벤처기업', '이노비즈', '기업부설연구소'],
      investmentHistory: { manualEntry: '2022년 시리즈A 30억원 투자 유치 (DSC인베스트먼트)', verified: false },
      patentCount: 8,
      hasResearchInstitute: true,
      collaborationCount: 5,
      keyTechnologies: ['AI', '클라우드', 'SaaS', '빅데이터'],
      researchFocusAreas: ['인공지능', '클라우드 컴퓨팅'],
    },
    {
      type: 'COMPANY' as const,
      name: '스마트모빌리티',
      businessNumber: generateBusinessNumber(2),
      industrySector: 'ICT',
      employeeCount: 'FROM_100_TO_300',
      rdExperience: true,
      technologyReadinessLevel: 8,
      description: '자율주행 및 V2X 통신 기술 개발 기업. 스마트시티 연계 모빌리티 솔루션 제공.',
      revenueRange: 'OVER_100B',
      businessStructure: 'CORPORATION',
      businessEstablishedDate: new Date('2015-08-20'),
      certifications: ['벤처기업', '메인비즈', '기업부설연구소'],
      investmentHistory: { manualEntry: '2023년 시리즈B 50억원 투자 유치 (한국투자파트너스)', verified: false },
      patentCount: 15,
      hasResearchInstitute: true,
      collaborationCount: 8,
      keyTechnologies: ['자율주행', 'V2X', 'IoT', '5G'],
      researchFocusAreas: ['스마트모빌리티', '자율주행'],
    },
    {
      type: 'RESEARCH_INSTITUTE' as const,
      name: '한국AI융합연구원',
      businessNumber: generateBusinessNumber(3),
      industrySector: 'ICT',
      employeeCount: 'FROM_10_TO_50',
      rdExperience: true,
      technologyReadinessLevel: 6,
      description: 'AI 기술의 산업 융합 연구를 수행하는 비영리 연구기관. 제조, 헬스케어, 금융 분야 AI 적용 연구.',
      instituteType: 'PRIVATE_RESEARCH',
      collaborationCount: 12,
      keyTechnologies: ['딥러닝', '자연어처리', '컴퓨터비전', '강화학습'],
      researchFocusAreas: ['인공지능', '산업융합', '데이터분석'],
    },

    // ========== Manufacturing (제조업) ==========
    {
      type: 'COMPANY' as const,
      name: '정밀기계산업',
      businessNumber: generateBusinessNumber(4),
      industrySector: 'MANUFACTURING',
      employeeCount: 'OVER_300',
      rdExperience: true,
      technologyReadinessLevel: 9,
      description: '반도체 제조 장비 및 정밀 부품 생산. 글로벌 반도체 기업에 핵심 부품 공급.',
      revenueRange: 'OVER_100B',
      businessStructure: 'CORPORATION',
      businessEstablishedDate: new Date('2005-11-10'),
      certifications: ['이노비즈', '기업부설연구소', '품질경영시스템(ISO9001)'],
      investmentHistory: { manualEntry: '자체 자본으로 R&D 수행 (상장 기업)', verified: false },
      patentCount: 42,
      hasResearchInstitute: true,
      collaborationCount: 6,
      keyTechnologies: ['반도체장비', '정밀가공', '자동화'],
      researchFocusAreas: ['반도체', '정밀기계'],
    },
    {
      type: 'COMPANY' as const,
      name: '에코소재',
      businessNumber: generateBusinessNumber(5),
      industrySector: 'MANUFACTURING',
      employeeCount: 'FROM_50_TO_100',
      rdExperience: true,
      technologyReadinessLevel: 7,
      description: '친환경 복합소재 개발 및 생산. 바이오플라스틱 및 재활용 소재 전문.',
      revenueRange: 'FROM_50B_TO_100B',
      businessStructure: 'CORPORATION',
      businessEstablishedDate: new Date('2019-02-28'),
      certifications: ['벤처기업', '이노비즈', '기업부설연구소', '녹색인증'],
      investmentHistory: { manualEntry: '2024년 Pre-A 투자 15억원 (그린벤처스)', verified: false },
      patentCount: 6,
      hasResearchInstitute: true,
      collaborationCount: 4,
      keyTechnologies: ['바이오플라스틱', '복합소재', '재활용'],
      researchFocusAreas: ['친환경소재', '순환경제'],
    },
    {
      type: 'RESEARCH_INSTITUTE' as const,
      name: '스마트제조기술연구소',
      businessNumber: generateBusinessNumber(6),
      industrySector: 'MANUFACTURING',
      employeeCount: 'FROM_10_TO_50',
      rdExperience: true,
      technologyReadinessLevel: 5,
      description: '스마트공장 및 디지털트윈 기술 연구. 제조 현장의 디지털 전환 지원.',
      instituteType: 'GOVERNMENT_FUNDED',
      collaborationCount: 15,
      keyTechnologies: ['디지털트윈', 'IIoT', 'MES', 'AI품질검사'],
      researchFocusAreas: ['스마트제조', '디지털전환', '품질관리'],
    },

    // ========== Bio & Health (바이오·헬스) ==========
    {
      type: 'COMPANY' as const,
      name: '바이오메드',
      businessNumber: generateBusinessNumber(7),
      industrySector: 'BIO_HEALTH',
      employeeCount: 'FROM_100_TO_300',
      rdExperience: true,
      technologyReadinessLevel: 8,
      description: '바이오의약품 및 면역항암제 개발. 임상 3상 진행 중인 신약 파이프라인 보유.',
      revenueRange: 'OVER_100B',
      businessStructure: 'CORPORATION',
      businessEstablishedDate: new Date('2012-05-15'),
      certifications: ['벤처기업', '기업부설연구소', 'GMP'],
      investmentHistory: { manualEntry: '2023년 시리즈C 100억원 투자 유치 (바이오펀드)', verified: false },
      patentCount: 28,
      hasResearchInstitute: true,
      collaborationCount: 7,
      keyTechnologies: ['면역항암제', '바이오시밀러', '세포치료제'],
      researchFocusAreas: ['바이오의약품', '항암제개발'],
    },
    {
      type: 'COMPANY' as const,
      name: '헬스케어AI',
      businessNumber: generateBusinessNumber(8),
      industrySector: 'BIO_HEALTH',
      employeeCount: 'FROM_50_TO_100',
      rdExperience: true,
      technologyReadinessLevel: 7,
      description: 'AI 기반 의료영상 진단 솔루션 개발. FDA 승인 획득 및 국내외 병원 공급 중.',
      revenueRange: 'FROM_50B_TO_100B',
      businessStructure: 'CORPORATION',
      businessEstablishedDate: new Date('2020-01-10'),
      certifications: ['벤처기업', '이노비즈', '기업부설연구소', '의료기기제조업'],
      investmentHistory: { manualEntry: '2024년 시리즈A 40억원 투자 유치 (메디컬벤처스)', verified: false },
      patentCount: 12,
      hasResearchInstitute: true,
      collaborationCount: 9,
      keyTechnologies: ['의료영상AI', '딥러닝', 'PACS연동'],
      researchFocusAreas: ['디지털헬스케어', '의료AI'],
    },
    {
      type: 'RESEARCH_INSTITUTE' as const,
      name: '재생의학연구원',
      businessNumber: generateBusinessNumber(9),
      industrySector: 'BIO_HEALTH',
      employeeCount: 'FROM_10_TO_50',
      rdExperience: true,
      technologyReadinessLevel: 4,
      description: '줄기세포 및 재생의학 기초·응용 연구. 난치성 질환 치료법 개발 연구.',
      instituteType: 'UNIVERSITY_ATTACHED',
      collaborationCount: 10,
      keyTechnologies: ['줄기세포', '오가노이드', '유전자치료', '3D바이오프린팅'],
      researchFocusAreas: ['재생의학', '줄기세포', '난치성질환'],
    },

    // ========== Energy (에너지) ==========
    {
      type: 'COMPANY' as const,
      name: '그린에너지솔루션',
      businessNumber: generateBusinessNumber(10),
      industrySector: 'ENERGY',
      employeeCount: 'FROM_100_TO_300',
      rdExperience: true,
      technologyReadinessLevel: 8,
      description: '태양광 및 ESS(에너지저장장치) 통합 솔루션 제공. 국내 최대 규모 ESS 구축 경험.',
      revenueRange: 'OVER_100B',
      businessStructure: 'CORPORATION',
      businessEstablishedDate: new Date('2014-07-20'),
      certifications: ['이노비즈', '기업부설연구소', '신재생에너지전문기업'],
      investmentHistory: { manualEntry: '2022년 그린뉴딜펀드 60억원 투자 유치', verified: false },
      patentCount: 18,
      hasResearchInstitute: true,
      collaborationCount: 11,
      keyTechnologies: ['태양광', 'ESS', '스마트그리드', '배터리관리시스템'],
      researchFocusAreas: ['신재생에너지', '에너지저장'],
    },
    {
      type: 'RESEARCH_INSTITUTE' as const,
      name: '수소에너지연구센터',
      businessNumber: generateBusinessNumber(11),
      industrySector: 'ENERGY',
      employeeCount: 'FROM_10_TO_50',
      rdExperience: true,
      technologyReadinessLevel: 5,
      description: '수소생산, 저장, 운송 기술 연구. 그린수소 경제 실현을 위한 핵심 기술 개발.',
      instituteType: 'GOVERNMENT_FUNDED',
      collaborationCount: 14,
      keyTechnologies: ['그린수소', '수전해', '연료전지', '액화수소'],
      researchFocusAreas: ['수소에너지', '탄소중립', '청정에너지'],
    },

    // ========== Agriculture (농업) ==========
    {
      type: 'COMPANY' as const,
      name: '스마트팜테크',
      businessNumber: generateBusinessNumber(12),
      industrySector: 'AGRICULTURE',
      employeeCount: 'FROM_50_TO_100',
      rdExperience: true,
      technologyReadinessLevel: 8,
      description: 'IoT 기반 스마트팜 자동화 시스템 개발 및 보급. 국내외 스마트팜 200개소 구축.',
      revenueRange: 'FROM_50B_TO_100B',
      businessStructure: 'CORPORATION',
      businessEstablishedDate: new Date('2017-04-01'),
      certifications: ['벤처기업', '이노비즈', '기업부설연구소'],
      investmentHistory: { manualEntry: '2023년 Pre-A 20억원 투자 유치 (애그리테크펀드)', verified: false },
      patentCount: 9,
      hasResearchInstitute: true,
      collaborationCount: 6,
      keyTechnologies: ['IoT', '자동화', '환경제어', '데이터분석'],
      researchFocusAreas: ['스마트농업', '정밀농업'],
    },
    {
      type: 'RESEARCH_INSTITUTE' as const,
      name: '친환경농업기술연구소',
      businessNumber: generateBusinessNumber(13),
      industrySector: 'AGRICULTURE',
      employeeCount: 'FROM_10_TO_50',
      rdExperience: true,
      technologyReadinessLevel: 6,
      description: '유기농법 및 친환경 농자재 개발 연구. 탄소중립 농업 실현 연구.',
      instituteType: 'PRIVATE_RESEARCH',
      collaborationCount: 8,
      keyTechnologies: ['유기농법', '미생물비료', '친환경농자재', '토양개량'],
      researchFocusAreas: ['친환경농업', '유기농', '지속가능농업'],
    },

    // ========== Cultural Heritage (문화재) ==========
    {
      type: 'RESEARCH_INSTITUTE' as const,
      name: '디지털문화재보존연구원',
      businessNumber: generateBusinessNumber(14),
      industrySector: 'OTHER',
      employeeCount: 'FROM_10_TO_50',
      rdExperience: true,
      technologyReadinessLevel: 7,
      description: '3D 스캔 및 VR/AR 기술을 활용한 문화재 디지털 복원 및 보존 연구.',
      instituteType: 'UNIVERSITY_ATTACHED',
      collaborationCount: 10,
      keyTechnologies: ['3D스캔', 'VR/AR', '디지털복원', '메타버스'],
      researchFocusAreas: ['문화재보존', '디지털문화유산', '가상현실'],
    },
  ];

  let created = 0;
  let skipped = 0;

  for (const org of sampleOrgs) {
    try {
      // Generate business number hash
      const businessNumberHash = hashBusinessNumber(org.businessNumber);

      // Check if already exists
      const existing = await db.organizations.findUnique({
        where: { businessNumberHash },
      });

      if (existing) {
        console.log(`⏭️  Skipped: ${org.name} (already exists)`);
        skipped++;
        continue;
      }

      // Encrypt business number
      const businessNumberEncrypted = encrypt(org.businessNumber);

      // Calculate profile score
      let profileScore = 50; // Base score
      if (org.name) profileScore += 10;
      if (org.industrySector) profileScore += 10;
      if (org.employeeCount) profileScore += 10;
      if (org.rdExperience) profileScore += 10;
      if (org.technologyReadinessLevel) profileScore += 5;
      if (org.description && org.description.length > 20) profileScore += 5;

      // Company-specific scoring
      if (org.type === 'COMPANY') {
        if (org.revenueRange) profileScore += 5;
        if (org.businessStructure) profileScore += 5;
        if (org.businessEstablishedDate) profileScore += 3;
        if (org.certifications && org.certifications.length > 0) profileScore += 10;
        if (org.investmentHistory) profileScore += 8;
        if (org.patentCount && org.patentCount > 0) profileScore += 5;
        if (org.hasResearchInstitute) profileScore += 7;
      }

      // Research institute-specific scoring
      if (org.instituteType) profileScore += 5;

      // Common scoring
      if (org.collaborationCount) {
        if (org.collaborationCount === 1) profileScore += 2;
        else if (org.collaborationCount >= 2 && org.collaborationCount <= 3) profileScore += 4;
        else if (org.collaborationCount >= 4) profileScore += 5;
      }
      if (org.researchFocusAreas && org.researchFocusAreas.length > 0) profileScore += 5;
      if (org.keyTechnologies && org.keyTechnologies.length > 0) profileScore += 5;

      // Create organization
      await db.organizations.create({
        data: {
          type: org.type,
          name: org.name,
          businessNumberEncrypted,
          businessNumberHash,
          industrySector: org.industrySector,
          employeeCount: org.employeeCount,
          rdExperience: org.rdExperience,
          technologyReadinessLevel: org.technologyReadinessLevel,
          description: org.description,
          // Company fields
          revenueRange: org.revenueRange || null,
          businessStructure: org.businessStructure || null,
          businessEstablishedDate: org.businessEstablishedDate || null,
          certifications: org.certifications || [],
          investmentHistory: org.investmentHistory || undefined,
          patentCount: org.patentCount || null,
          hasResearchInstitute: org.hasResearchInstitute || false,
          // Research institute fields
          instituteType: org.instituteType || null,
          // Common fields
          collaborationCount: org.collaborationCount || null,
          researchFocusAreas: org.researchFocusAreas || [],
          keyTechnologies: org.keyTechnologies || [],
          profileCompleted: true,
          profileScore,
          status: 'ACTIVE',
        },
      });

      console.log(`✅ Created: ${org.name} (${org.type}, ${org.industrySector}, Score: ${profileScore})`);
      created++;
    } catch (error) {
      console.error(`❌ Failed to create ${org.name}:`, error);
    }
  }

  console.log(`\n🎉 Seeding complete!`);
  console.log(`   ✅ Created: ${created} organizations`);
  console.log(`   ⏭️  Skipped: ${skipped} organizations (already existed)`);
  console.log(`\n📊 Summary by category:`);
  console.log(`   - ICT: 3 orgs (2 companies, 1 institute)`);
  console.log(`   - Manufacturing: 3 orgs (2 companies, 1 institute)`);
  console.log(`   - Bio & Health: 3 orgs (2 companies, 1 institute)`);
  console.log(`   - Energy: 2 orgs (1 company, 1 institute)`);
  console.log(`   - Agriculture: 2 orgs (1 company, 1 institute)`);
  console.log(`   - Cultural Heritage: 1 org (1 institute)`);
  console.log(`\n🔍 Total searchable organizations: ${created + skipped} (excluding your own)`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
