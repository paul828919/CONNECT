/**
 * Seed Test Organizations for Beta Testing
 *
 * Creates 5-10 diverse test organizations covering various:
 * - Industries: IT, biotech, manufacturing, energy
 * - Types: startups, SMEs, large corps, research institutes
 * - R&D maturity: TRL 1-9
 *
 * Week 8: Beta Preparation - Test Data Generation
 */

import { PrismaClient, OrganizationType, EmployeeCountRange } from '@prisma/client';
import { encrypt, hashBusinessNumber } from '../lib/encryption';

const prisma = new PrismaClient();

const TEST_ORGS = [
  {
    name: 'QuantumEdge AI',
    businessNumber: '101-81-11111',
    industry: 'IT/Software',
    type: OrganizationType.COMPANY,
    employees: 25,
    rdBudget: 500000000,
    rdTeamSize: 8,
    interests: ['AI', 'Machine Learning', 'Computer Vision'],
    trlStage: 5,
  },
  {
    name: 'BioPharm Solutions',
    businessNumber: '101-81-22222',
    industry: 'Biotechnology',
    type: OrganizationType.COMPANY,
    employees: 80,
    rdBudget: 1500000000,
    rdTeamSize: 20,
    interests: ['Drug Development', 'Genomics', 'Clinical Trials'],
    trlStage: 7,
  },
  {
    name: 'GreenEnergy Systems',
    businessNumber: '101-81-33333',
    industry: 'Energy',
    type: OrganizationType.COMPANY,
    employees: 500,
    rdBudget: 5000000000,
    rdTeamSize: 50,
    interests: ['Solar Energy', 'Battery Technology', 'Grid Optimization'],
    trlStage: 9,
  },
  {
    name: 'NanoMaterials Lab',
    businessNumber: '101-81-44444',
    industry: 'Materials Science',
    type: OrganizationType.RESEARCH_INSTITUTE,
    employees: 40,
    rdBudget: 800000000,
    rdTeamSize: 25,
    interests: ['Nanomaterials', 'Graphene', 'Semiconductors'],
    trlStage: 3,
  },
  {
    name: 'SmartFactory Korea',
    businessNumber: '101-81-55555',
    industry: 'Manufacturing',
    type: OrganizationType.COMPANY,
    employees: 150,
    rdBudget: 2000000000,
    rdTeamSize: 15,
    interests: ['IoT', 'Automation', 'Predictive Maintenance'],
    trlStage: 7,
  },
];

// Helper to map employee count to EmployeeCountRange enum
function mapEmployeeCount(count: number): EmployeeCountRange {
  if (count < 10) return EmployeeCountRange.UNDER_10;
  if (count <= 50) return EmployeeCountRange.FROM_10_TO_50;
  if (count <= 100) return EmployeeCountRange.FROM_50_TO_100;
  if (count <= 300) return EmployeeCountRange.FROM_100_TO_300;
  return EmployeeCountRange.OVER_300;
}

async function main() {
  console.log('🌱 Seeding test organizations...\n');

  for (const org of TEST_ORGS) {
    const created = await prisma.organizations.create({
      data: {
        name: org.name,
        type: org.type,
        businessNumberEncrypted: encrypt(org.businessNumber),
        businessNumberHash: hashBusinessNumber(org.businessNumber),
        industrySector: org.industry,
        employeeCount: mapEmployeeCount(org.employees),
        annualRdBudget: org.rdBudget.toString(),
        researcherCount: org.rdTeamSize,
        researchFocusAreas: org.interests,
        keyTechnologies: org.interests,
        technologyReadinessLevel: org.trlStage,
        rdExperience: true,
        collaborationCount: 0,
        profileCompleted: true,
        profileScore: 80,
      },
    });
    console.log(`✅ Created: ${created.name} (${created.type})`);
  }

  console.log(`\n✅ Successfully seeded ${TEST_ORGS.length} test organizations!`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
