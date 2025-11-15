import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const envType = process.env.ENV_TYPE || 'LOCAL';

  // Find Innowave organization
  const org = await prisma.organizations.findFirst({
    where: {
      name: {
        contains: 'Innowave',
        mode: 'insensitive'
      }
    },
    select: {
      id: true,
      name: true,
      type: true,
      profileCompleted: true
    }
  });

  if (!org) {
    console.log(`❌ Innowave organization not found in ${envType} database`);
    process.exit(0);
  }

  console.log(`✅ Found Innowave organization in ${envType} database:`);
  console.log(JSON.stringify(org, null, 2));

  // Find matches for this organization
  const matches = await prisma.funding_matches.findMany({
    where: {
      organizationId: org.id
    },
    include: {
      funding_programs: {
        select: {
          id: true,
          title: true,
          agencyId: true,
          deadline: true,
          status: true,
          budgetAmount: true
        }
      }
    },
    orderBy: {
      score: 'desc'
    }
  });

  console.log(`\n📊 Found ${matches.length} matches for Innowave in ${envType} database:\n`);

  matches.forEach((match, idx) => {
    console.log(`${idx + 1}. [${match.score} points] ${match.funding_programs.title}`);
    console.log(`   Agency: ${match.funding_programs.agencyId}`);
    console.log(`   Status: ${match.funding_programs.status}`);
    console.log(`   Deadline: ${match.funding_programs.deadline || 'TBD'}`);
    console.log(`   Budget: ₩${match.funding_programs.budgetAmount || 'TBD'}`);
    console.log(`   Match ID: ${match.id}`);
    console.log('');
  });

  await prisma.$disconnect();
}

main().catch(console.error);
