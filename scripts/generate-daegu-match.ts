/**
 * Manual Match Generation Script
 * Generate a match for the Daegu program with manual review required
 */

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  const organizationId = '8a80dd51-3bbe-458d-ab15-930cad81a830'; // Innowave
  const programId = 'bded5a53-ae16-4e1c-9073-a79062bbe53e'; // Daegu program

  // Check if match already exists
  const existingMatch = await db.funding_matches.findUnique({
    where: {
      organizationId_programId: {
        organizationId,
        programId,
      },
    },
  });

  if (existingMatch) {
    console.log('✓ Match already exists:', existingMatch.id);
    return;
  }

  // Create match
  const match = await db.funding_matches.create({
    data: {
      organizationId,
      programId,
      score: 75, // Good match score
      explanation: {
        summary: '귀하의 조직이 이 프로그램에 적합합니다.',
        reasons: [
          'ICT 산업 분야와 일치합니다',
          '대구 지역 연구소기업 지원 프로그램입니다',
          '연구개발특구 기반의 기술혁신 프로그램입니다',
        ],
        warnings: [
          '⚠️ 이 프로그램은 첨부파일이 없어 공고문 페이지에서 직접 확인이 필요합니다',
        ],
        recommendations: [
          '공고문 페이지에서 자격요건과 신청 절차를 직접 확인하세요',
          '2026년 유사 프로그램 준비에 참고하세요',
        ],
      },
    },
  });

  console.log('✅ Match created successfully!');
  console.log('   Match ID:', match.id);
  console.log('   Score:', match.score);
  console.log('   Organization:', organizationId);
  console.log('   Program:', programId);
}

main()
  .then(() => {
    console.log('\n✓ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
