/**
 * Check User Matches Script
 *
 * Purpose: Retrieve all matching results for a specific user by email
 *
 * Usage:
 *   npx ts-node scripts/check-user-matches.ts [email]
 *
 * Example:
 *   npx ts-node scripts/check-user-matches.ts pranger@naver.com
 *
 * If no email is provided, defaults to: pranger@naver.com (김무상, 디지털오믹스)
 */

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

// Default email for 김무상 from 디지털오믹스
const DEFAULT_EMAIL = 'pranger@naver.com';

interface MatchExplanation {
  summary?: string;
  reasons?: string[];
  cautions?: string;
  recommendation?: string;
}

async function main() {
  const email = process.argv[2] || DEFAULT_EMAIL;

  console.log('🔍 User Match Query Tool\n');
  console.log('='.repeat(80));
  console.log(`📧 Searching for user: ${email}`);
  console.log('='.repeat(80));

  // Step 1: Find the user
  const user = await db.user.findFirst({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      organizationId: true,
      role: true,
      createdAt: true,
      lastLoginAt: true,
    },
  });

  if (!user) {
    console.error(`\n❌ User with email "${email}" not found`);
    console.log('\n📋 Available users:');
    const allUsers = await db.user.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      select: { name: true, email: true },
    });
    allUsers.forEach((u) => {
      console.log(`   - ${u.name || '(no name)'}: ${u.email}`);
    });
    await db.$disconnect();
    process.exit(1);
  }

  console.log('\n📋 USER INFORMATION');
  console.log('-'.repeat(80));
  console.log(`  이름 (Name):       ${user.name || '(not set)'}`);
  console.log(`  이메일 (Email):    ${user.email}`);
  console.log(`  역할 (Role):       ${user.role}`);
  console.log(`  가입일 (Joined):   ${user.createdAt.toLocaleDateString('ko-KR')}`);
  console.log(`  마지막 로그인:      ${user.lastLoginAt?.toLocaleDateString('ko-KR') || 'Never'}`);

  // Step 2: Find the organization
  if (!user.organizationId) {
    console.log('\n⚠️  User has no organization linked');
    console.log('   Matches are generated per organization, not per user.');
    console.log('   This user needs to complete profile setup to get matches.');
    await db.$disconnect();
    process.exit(0);
  }

  const organization = await db.organizations.findUnique({
    where: { id: user.organizationId },
    select: {
      id: true,
      name: true,
      type: true,
      industrySector: true,
      employeeCount: true,
      rdExperience: true,
      technologyReadinessLevel: true,
      profileCompleted: true,
      profileScore: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!organization) {
    console.error(`\n❌ Organization not found (ID: ${user.organizationId})`);
    await db.$disconnect();
    process.exit(1);
  }

  console.log('\n📋 ORGANIZATION INFORMATION');
  console.log('-'.repeat(80));
  console.log(`  기관명 (Name):        ${organization.name}`);
  console.log(`  유형 (Type):          ${organization.type}`);
  console.log(`  업종 (Industry):      ${organization.industrySector || '(not set)'}`);
  console.log(`  직원수 (Employees):   ${organization.employeeCount || '(not set)'}`);
  console.log(`  R&D 경험:             ${organization.rdExperience ? '있음' : '없음'}`);
  console.log(`  TRL 수준:             ${organization.technologyReadinessLevel ?? '(not set)'}`);
  console.log(`  프로필 완료:          ${organization.profileCompleted ? '✅ 완료' : '❌ 미완료'}`);
  console.log(`  프로필 점수:          ${organization.profileScore ?? 0}%`);
  console.log(`  상태 (Status):        ${organization.status}`);

  // Step 3: Get all matches for this organization
  const matches = await db.funding_matches.findMany({
    where: { organizationId: organization.id },
    orderBy: { score: 'desc' },
    include: {
      funding_programs: {
        select: {
          id: true,
          title: true,
          agencyId: true,
          category: true,
          deadline: true,
          budgetAmount: true,
          status: true,
          announcementUrl: true,
        },
      },
    },
  });

  console.log('\n📋 MATCHING RESULTS');
  console.log('-'.repeat(80));
  console.log(`  총 매칭 수:  ${matches.length}개`);

  if (matches.length === 0) {
    console.log('\n⚠️  No matches found for this organization.');
    console.log('   Possible reasons:');
    console.log('   - Profile is not complete');
    console.log('   - No matching programs currently available');
    console.log('   - Matches not yet generated (try /dashboard to trigger generation)');
    await db.$disconnect();
    process.exit(0);
  }

  // Summary statistics
  const viewedCount = matches.filter(m => m.viewed).length;
  const savedCount = matches.filter(m => m.saved).length;
  const avgScore = Math.round(matches.reduce((sum, m) => sum + m.score, 0) / matches.length);

  console.log(`  조회한 매칭:  ${viewedCount}개`);
  console.log(`  저장한 매칭:  ${savedCount}개`);
  console.log(`  평균 점수:    ${avgScore}점`);

  // Group by status
  const activeMatches = matches.filter(m => m.funding_programs.status === 'ACTIVE');
  const expiredMatches = matches.filter(m => m.funding_programs.status !== 'ACTIVE');

  console.log(`  활성 공고:    ${activeMatches.length}개`);
  console.log(`  마감/종료:    ${expiredMatches.length}개`);

  // Detail each match
  console.log('\n📋 MATCH DETAILS');
  console.log('='.repeat(80));

  matches.forEach((match, index) => {
    const program = match.funding_programs;
    const explanation = match.explanation as MatchExplanation;

    console.log(`\n[${index + 1}] ${program.title}`);
    console.log('-'.repeat(80));
    console.log(`  📊 점수: ${match.score}점`);
    console.log(`  🏛️  기관: ${program.agencyId}`);
    console.log(`  📁 분야: ${program.category || '(not set)'}`);
    console.log(`  💰 예산: ${program.budgetAmount ? `${Number(program.budgetAmount).toLocaleString()}원` : '미정'}`);
    console.log(`  📅 마감: ${program.deadline ? program.deadline.toLocaleDateString('ko-KR') : '미정'}`);
    console.log(`  📌 상태: ${program.status}`);
    console.log(`  👁️  조회: ${match.viewed ? '✅' : '❌'}  |  💾 저장: ${match.saved ? '✅' : '❌'}`);
    console.log(`  🔗 URL: ${program.announcementUrl}`);

    if (explanation) {
      console.log('\n  📝 AI 설명:');
      if (explanation.summary) {
        console.log(`     요약: ${explanation.summary}`);
      }
      if (explanation.reasons && explanation.reasons.length > 0) {
        console.log('     적합 이유:');
        explanation.reasons.forEach((reason, i) => {
          console.log(`       ${i + 1}. ${reason}`);
        });
      }
      if (explanation.cautions) {
        console.log(`     ⚠️ 주의: ${explanation.cautions}`);
      }
      if (explanation.recommendation) {
        console.log(`     💡 권장: ${explanation.recommendation}`);
      }
    }

    console.log(`  🕐 매칭 생성: ${match.createdAt.toLocaleDateString('ko-KR')}`);
  });

  console.log('\n' + '='.repeat(80));
  console.log('✅ Query completed');

  await db.$disconnect();
}

main().catch(async (error) => {
  console.error('Error:', error);
  await db.$disconnect();
  process.exit(1);
});
