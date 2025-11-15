/**
 * Check Physician-Scientist Program Scraping Data
 *
 * This script examines the raw scraping data to understand what was extracted
 * and why the hospital/medical requirements weren't properly enforced.
 */

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  console.log('\n========================================');
  console.log('PHYSICIAN PROGRAM SCRAPING DATA CHECK');
  console.log('========================================\n');

  // Find physician-scientist programs with their scraping jobs
  const programs = await db.funding_programs.findMany({
    where: {
      title: {
        contains: '의사과학자',
      },
      status: 'ACTIVE',
    },
    include: {
      scraping_job: true,
    },
  });

  console.log(`Found ${programs.length} physician-scientist programs\n`);

  for (const program of programs) {
    console.log('\n========================================');
    console.log(`PROGRAM: ${program.title}`);
    console.log('========================================\n');

    console.log('📋 EXTRACTED FIELDS');
    console.log('------------------');
    console.log(`Target Type: ${JSON.stringify(program.targetType)}`);
    console.log(`Allowed Business Structures: ${JSON.stringify(program.allowedBusinessStructures)}`);
    console.log(`Required Certifications: ${JSON.stringify(program.requiredCertifications)}`);
    console.log(`Preferred Certifications: ${JSON.stringify(program.preferredCertifications)}`);
    console.log(`Requires Research Institute: ${program.requiresResearchInstitute}`);

    console.log('\n📊 ELIGIBILITY CRITERIA (JSONB)');
    console.log('------------------------------');
    console.log(JSON.stringify(program.eligibilityCriteria, null, 2));

    if (program.scraping_job) {
      const job = program.scraping_job;
      console.log('\n🔍 SCRAPING JOB INFO');
      console.log('-------------------');
      console.log(`Job ID: ${job.id}`);
      console.log(`Attachment Count: ${job.attachmentCount}`);
      console.log(`Attachment Folder: ${job.attachmentFolder}`);
      console.log(`Attachment Filenames: ${JSON.stringify(job.attachmentFilenames)}`);

      // Check if detail page data has eligibility info
      const detailPageData = job.detailPageData as any;
      if (detailPageData) {
        console.log('\n📄 DETAIL PAGE DATA');
        console.log('------------------');

        // Look for specific eligibility fields
        if (detailPageData.eligibilityCriteria) {
          console.log('Eligibility Criteria from Detail Page:');
          console.log(JSON.stringify(detailPageData.eligibilityCriteria, null, 2));
        }

        if (detailPageData.applicationRequirements) {
          console.log('\nApplication Requirements:');
          console.log(detailPageData.applicationRequirements);
        }

        if (detailPageData.targetOrganization) {
          console.log('\nTarget Organization:');
          console.log(detailPageData.targetOrganization);
        }

        // Show first 2000 chars of full detail page data
        console.log('\nFull Detail Page Data (first 2000 chars):');
        console.log(JSON.stringify(detailPageData, null, 2).substring(0, 2000));
      }
    } else {
      console.log('\n⚠️ No scraping job found for this program');
    }

    console.log('\n========================================');
  }

  await db.$disconnect();
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
