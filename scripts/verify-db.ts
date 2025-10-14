import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verify() {
  console.log('\n🔍 Verifying database data...\n');

  const programs = await prisma.funding_programs.findMany({
    select: { agencyId: true, title: true, deadline: true },
    orderBy: { agencyId: 'asc' },
  });

  const orgs = await prisma.organizations.findMany({
    select: { name: true, type: true },
  });

  console.log(`✅ Funding Programs: ${programs.length} total\n`);
  programs.forEach(p => {
    const daysUntil = p.deadline
      ? Math.ceil((p.deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;
    console.log(`  ${p.agencyId}: ${p.title}`);
    console.log(`     Deadline: ${p.deadline ? p.deadline.toLocaleDateString('ko-KR') : 'N/A'} ${daysUntil !== null ? `(${daysUntil} days)` : ''}\n`);
  });

  console.log(`\n✅ Organizations: ${orgs.length} total\n`);
  orgs.forEach(o => console.log(`  - ${o.name} (${o.type})`));

  await prisma.$disconnect();
  console.log('\n✨ Database verification complete!\n');
}

verify().catch(console.error);
