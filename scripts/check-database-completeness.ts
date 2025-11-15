#!/usr/bin/env tsx
/**
 * Check database completeness after processor stopped
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('DATABASE COMPLETENESS REPORT');
  console.log('════════════════════════════════════════════════════════════════');
  console.log('');

  // 1. Scraping Jobs Status
  console.log('📊 SCRAPING_JOBS TABLE');
  console.log('─────────────────────────────────────────────────────────────────');

  const jobStats: any[] = await prisma.$queryRaw`
    SELECT
      "processingStatus",
      COUNT(*) as count
    FROM scraping_jobs
    GROUP BY "processingStatus"
    ORDER BY count DESC
  `;

  const totalJobs = jobStats.reduce((sum, stat) => sum + Number(stat.count), 0);
  console.log(`Total Jobs: ${totalJobs.toLocaleString()}`);
  console.log('');

  jobStats.forEach(stat => {
    const percentage = ((Number(stat.count) / totalJobs) * 100).toFixed(1);
    console.log(`  ${stat.processingStatus.padEnd(15)} ${String(stat.count).padStart(6)} (${percentage}%)`);
  });
  console.log('');

  // 2. Funding Programs Count
  console.log('📋 FUNDING_PROGRAMS TABLE');
  console.log('─────────────────────────────────────────────────────────────────');

  const totalPrograms = await prisma.funding_programs.count();
  console.log(`Total Programs: ${totalPrograms.toLocaleString()}`);
  console.log('');

  // 3. Data Completeness Analysis
  console.log('📈 DATA COMPLETENESS ANALYSIS');
  console.log('─────────────────────────────────────────────────────────────────');
  console.log('');

  // Key fields that should be populated from extraction
  const fieldsToCheck = [
    'description',
    'deadline',
    'budgetAmount',
    'minTrl',
    'maxTrl',
    'eligibilityCriteria',
    'category',
    'publishedAt',
    'applicationStart',
    'announcingAgency'
  ];

  const completenessStats: any = {};

  for (const field of fieldsToCheck) {
    const notNullCount = await prisma.funding_programs.count({
      where: {
        [field]: {
          not: null
        }
      }
    });

    completenessStats[field] = {
      populated: notNullCount,
      percentage: ((notNullCount / totalPrograms) * 100).toFixed(1)
    };
  }

  console.log('Field Completion Rates:');
  console.log('');
  Object.entries(completenessStats).forEach(([field, stats]: [string, any]) => {
    const bar = '█'.repeat(Math.floor(Number(stats.percentage) / 5));
    console.log(`  ${field.padEnd(20)} ${String(stats.populated).padStart(5)} / ${totalPrograms} (${stats.percentage}%) ${bar}`);
  });
  console.log('');

  // 4. Programs with ALL key fields populated
  console.log('✅ PROGRAMS WITH ALL KEY FIELDS POPULATED');
  console.log('─────────────────────────────────────────────────────────────────');

  const fullyPopulated = await prisma.funding_programs.count({
    where: {
      AND: [
        { description: { not: null } },
        { deadline: { not: null } },
        { budgetAmount: { not: null } },
        { minTrl: { not: null } },
        { maxTrl: { not: null } },
        { eligibilityCriteria: { not: null } }
      ]
    }
  });

  const fullyPercentage = ((fullyPopulated / totalPrograms) * 100).toFixed(1);
  console.log(`Programs with all critical fields: ${fullyPopulated} (${fullyPercentage}%)`);
  console.log('');

  // 5. Programs with NO extracted data (only basic fields)
  console.log('❌ PROGRAMS WITH NO EXTRACTED DATA');
  console.log('─────────────────────────────────────────────────────────────────');

  const noExtractedData = await prisma.funding_programs.count({
    where: {
      AND: [
        { description: null },
        { deadline: null },
        { budgetAmount: null },
        { minTrl: null },
        { maxTrl: null },
        { eligibilityCriteria: null }
      ]
    }
  });

  const noDataPercentage = ((noExtractedData / totalPrograms) * 100).toFixed(1);
  console.log(`Programs with no extracted data: ${noExtractedData} (${noDataPercentage}%)`);
  console.log('');

  // 6. Sample of programs with no data
  if (noExtractedData > 0) {
    console.log('Sample programs with no extracted data:');
    console.log('');

    const samples = await prisma.funding_programs.findMany({
      where: {
        AND: [
          { description: null },
          { deadline: null },
          { budgetAmount: null }
        ]
      },
      select: {
        id: true,
        title: true,
        agencyId: true,
        createdAt: true
      },
      take: 5,
      orderBy: { createdAt: 'desc' }
    });

    samples.forEach((program, idx) => {
      console.log(`  ${idx + 1}. ${program.title.substring(0, 60)}...`);
      console.log(`     Agency: ${program.agencyId}, Created: ${program.createdAt.toISOString().split('T')[0]}`);
    });
    console.log('');
  }

  // 7. Processing Status Summary
  console.log('📝 SUMMARY');
  console.log('─────────────────────────────────────────────────────────────────');
  console.log(`Total Scraping Jobs: ${totalJobs.toLocaleString()}`);
  console.log(`Total Funding Programs: ${totalPrograms.toLocaleString()}`);
  console.log(`Programs with full data: ${fullyPopulated} (${fullyPercentage}%)`);
  console.log(`Programs with no data: ${noExtractedData} (${noDataPercentage}%)`);
  console.log(`Programs with partial data: ${totalPrograms - fullyPopulated - noExtractedData} (${(((totalPrograms - fullyPopulated - noExtractedData) / totalPrograms) * 100).toFixed(1)}%)`);
  console.log('');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
