/**
 * Diagnose Eligibility Extraction Issues
 *
 * Investigates why extraction patterns aren't finding eligibility criteria
 */

import { db } from '@/lib/db';

async function main() {
  // Get a sample of recent programs with attachments
  const programs = await db.funding_programs.findMany({
    where: {
      scrapedAt: {
        gte: new Date('2025-10-01')
      }
    },
    take: 5,
    orderBy: { scrapedAt: 'desc' },
    include: {
      scraping_job: {
        select: {
          id: true,
          attachmentCount: true,
          status: true
        }
      },
      eligibility_verification: {
        orderBy: { extractionRun: 'desc' },
        take: 1,
        select: {
          confidence: true,
          extractionMethod: true,
          requiredCertifications: true,
          preferredCertifications: true,
          extractionNotes: true
        }
      }
    }
  });

  console.log('🔍 Diagnosing Eligibility Extraction Issues\n');
  console.log(`Found ${programs.length} recent programs\n`);

  for (const program of programs) {
    console.log('━'.repeat(80));
    console.log(`📋 Program: ${program.title.substring(0, 60)}...`);
    console.log(`   ID: ${program.id}`);
    console.log(`   Scraped: ${program.scrapedAt?.toISOString().split('T')[0]}`);
    console.log(`   Scraping Job: ${program.scraping_job?.id || 'N/A'}`);
    console.log(`   Attachment Count: ${program.scraping_job?.attachmentCount || 0}`);
    console.log(`   Job Status: ${program.scraping_job?.status || 'N/A'}`);

    console.log('\n   Current Database Fields:');
    console.log(`   • Required Certs: ${JSON.stringify(program.requiredCertifications)}`);
    console.log(`   • Preferred Certs: ${JSON.stringify(program.preferredCertifications)}`);
    console.log(`   • Allowed Structures: ${JSON.stringify(program.allowedBusinessStructures)}`);
    console.log(`   • Min TRL: ${program.minTrl || 'N/A'}`);
    console.log(`   • Max TRL: ${program.maxTrl || 'N/A'}`);
    console.log(`   • Budget: ${program.budgetAmount || 'N/A'}`);

    if (program.eligibility_verification.length > 0) {
      const verification = program.eligibility_verification[0];
      console.log('\n   Latest Verification:');
      console.log(`   • Confidence: ${verification.confidence}`);
      console.log(`   • Method: ${verification.extractionMethod}`);
      console.log(`   • Required Certs: ${JSON.stringify(verification.requiredCertifications)}`);
      console.log(`   • Preferred Certs: ${JSON.stringify(verification.preferredCertifications)}`);
      console.log(`   • Notes: ${verification.extractionNotes || 'None'}`);
    }

    // Check if we have attachment data stored
    const attachmentData = await db.scraped_attachments.findMany({
      where: {
        scrapingJobId: program.scraping_job?.id
      },
      select: {
        id: true,
        fileName: true,
        fileType: true,
        extractedText: true
      }
    });

    console.log(`\n   Attachments: ${attachmentData.length}`);
    if (attachmentData.length > 0) {
      attachmentData.forEach((att, idx) => {
        const textLength = att.extractedText?.length || 0;
        console.log(`   ${idx + 1}. ${att.fileName}`);
        console.log(`      Type: ${att.fileType} | Text length: ${textLength} chars`);

        // Show a sample of the text if available
        if (att.extractedText && textLength > 0) {
          const sample = att.extractedText.substring(0, 200).replace(/\n/g, ' ');
          console.log(`      Sample: "${sample}..."`);
        }
      });
    }

    console.log('');
  }

  await db.$disconnect();
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
