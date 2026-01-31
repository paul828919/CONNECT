import { PrismaClient, ProgramStatus, AnnouncementType } from '@prisma/client';
import { generateMatches } from '../lib/matching/algorithm';
import { generateMatchesV6 } from '../lib/matching/v6/funnel';

const prisma = new PrismaClient();

async function main() {
  const orgId = process.env.ORG_ID || process.argv[2];
  const limit = Number(process.env.LIMIT || 5);

  if (!orgId) {
    console.error('Usage: ORG_ID=<id> tsx scripts/ab-test-v6.ts');
    process.exit(1);
  }

  const organization = await prisma.organizations.findUnique({
    where: { id: orgId },
    include: { locations: true },
  });

  if (!organization) {
    console.error('Organization not found:', orgId);
    process.exit(1);
  }

  const programs = await prisma.funding_programs.findMany({
    where: {
      status: ProgramStatus.ACTIVE,
      announcementType: AnnouncementType.R_D_PROJECT,
    },
  });

  const v4 = generateMatches(organization, programs, limit, { minimumScore: 0 });
  const v6 = generateMatchesV6(organization, programs, limit, { minimumScore: 0 });

  const v4Ids = new Set(v4.map(m => m.programId));
  const v6Ids = new Set(v6.map(m => m.programId));
  const overlap = Array.from(v4Ids).filter(id => v6Ids.has(id));

  console.log('Org:', organization.name, organization.industrySector);
  console.log('v4 top', v4.length, 'v6 top', v6.length);
  console.log('Overlap count:', overlap.length);
  console.log('v4 top titles:', v4.map(m => m.program.title));
  console.log('v6 top titles:', v6.map(m => m.program.title));
}

main()
  .catch(err => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
