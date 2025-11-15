import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const envType = process.env.ENV_TYPE || 'LOCAL';

  console.log(`🔍 ${envType} Environment - Funding Programs Analysis\n`);
  console.log('═'.repeat(80));

  // Total funding programs
  const totalPrograms = await prisma.funding_programs.count();
  console.log(`📊 Total Funding Programs: ${totalPrograms}`);

  // Programs by status
  const byStatus = await prisma.funding_programs.groupBy({
    by: ['status'],
    _count: { id: true }
  });
  console.log('\n📋 Programs by Status:');
  byStatus.forEach(s => console.log(`   ${s.status}: ${s._count.id}`));

  // Most recent programs
  const recentPrograms = await prisma.funding_programs.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true,
      title: true,
      agencyId: true,
      status: true,
      createdAt: true
    }
  });

  console.log('\n📅 5 Most Recent Programs:');
  recentPrograms.forEach((p, idx) => {
    console.log(`${idx + 1}. [${p.status}] ${p.title.substring(0, 60)}...`);
    console.log(`   Agency: ${p.agencyId} | Created: ${p.createdAt.toISOString()}`);
  });

  // Check for specific production-only program
  const aiProgram = await prisma.funding_programs.findFirst({
    where: {
      title: {
        contains: '최고급 AI 해외인재 유치지원',
        mode: 'insensitive'
      }
    },
    select: {
      id: true,
      title: true,
      createdAt: true
    }
  });

  console.log('\n🔎 Check for Production-Only Program:');
  if (aiProgram) {
    console.log(`   ✅ Found: ${aiProgram.title}`);
    console.log(`   Created: ${aiProgram.createdAt.toISOString()}`);
  } else {
    console.log('   ❌ NOT FOUND: 2025년도 최고급 AI 해외인재 유치지원 사업 재공고');
  }

  await prisma.$disconnect();
}

main().catch(console.error);
