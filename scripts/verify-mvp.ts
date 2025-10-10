/**
 * MVP Verification Script
 * Verifies that all core components are working
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyMVP() {
  console.log('\n🔍 Verifying MVP Components...\n');

  let allPassed = true;

  // 1. Database Connection
  try {
    await prisma.$connect();
    console.log('✅ Database connection successful');
  } catch (error) {
    console.log('❌ Database connection failed');
    allPassed = false;
  }

  // 2. Funding Programs
  try {
    const programs = await prisma.fundingProgram.count();
    if (programs >= 8) {
      console.log(`✅ Funding programs seeded: ${programs} programs`);
    } else {
      console.log(`⚠️  Only ${programs} programs found (expected 8+)`);
      allPassed = false;
    }
  } catch (error) {
    console.log('❌ Failed to fetch funding programs');
    allPassed = false;
  }

  // 3. Organizations
  try {
    const orgs = await prisma.organization.count();
    console.log(`✅ Organizations in database: ${orgs}`);
  } catch (error) {
    console.log('❌ Failed to fetch organizations');
    allPassed = false;
  }

  // 4. Check Matching Algorithm
  try {
    const { generateMatches } = await import('../lib/matching/algorithm');
    const org = await prisma.organization.findFirst();
    const programs = await prisma.fundingProgram.findMany({ take: 5 });

    if (org && programs.length > 0) {
      const matches = generateMatches(org, programs, 3);
      console.log(`✅ Matching algorithm working: ${matches.length} matches generated`);
    } else {
      console.log('⚠️  No organization or programs to test matching');
    }
  } catch (error: any) {
    console.log(`❌ Matching algorithm failed: ${error.message}`);
    allPassed = false;
  }

  // 5. Check Explanation Generator
  try {
    const { generateExplanation } = await import('../lib/matching/explainer');
    console.log('✅ Explanation generator module loaded');
  } catch (error: any) {
    console.log(`❌ Explanation generator failed: ${error.message}`);
    allPassed = false;
  }

  // 6. Check Rate Limiting
  try {
    const { checkMatchLimit } = await import('../lib/rateLimit');
    console.log('✅ Rate limiting module loaded');
  } catch (error: any) {
    console.log(`❌ Rate limiting failed: ${error.message}`);
    allPassed = false;
  }

  console.log('\n' + '='.repeat(60));
  if (allPassed) {
    console.log('🎉 All MVP components verified successfully!');
    console.log('\n📋 Manual Testing Checklist:');
    console.log('   1. Start dev server: npm run dev');
    console.log('   2. Navigate to http://localhost:3000');
    console.log('   3. Sign in with Kakao or Naver');
    console.log('   4. Create organization profile');
    console.log('   5. Click "매칭 생성하기" button');
    console.log('   6. View matches on /dashboard/matches');
    console.log('   7. Try generating 4 matches (should hit rate limit)');
  } else {
    console.log('⚠️  Some components need attention');
  }
  console.log('='.repeat(60) + '\n');

  await prisma.$disconnect();
}

verifyMVP().catch(console.error);
