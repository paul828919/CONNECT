/**
 * Test script to verify INVESTMENT_REQUIREMENT was added to ExtractionField enum
 * This validates the enum fix before deploying to production
 */

import { PrismaClient, ExtractionField, DataSource, ConfidenceLevel } from '@prisma/client';

const prisma = new PrismaClient();

async function testExtractionFieldEnum() {
  console.log('🧪 Testing ExtractionField enum with INVESTMENT_REQUIREMENT...\n');

  try {
    // Test 1: Verify enum value exists in TypeScript
    console.log('✓ Test 1: TypeScript enum check');
    const investmentField: ExtractionField = 'INVESTMENT_REQUIREMENT' as ExtractionField;
    console.log(`  - INVESTMENT_REQUIREMENT value: "${investmentField}"`);

    // Test 2: Get a real scrapingJobId for the test
    const realJob = await prisma.scraping_jobs.findFirst({ select: { id: true } });
    if (!realJob) {
      throw new Error('No scraping_jobs found in database - cannot run test');
    }
    console.log(`  - Using scrapingJobId: ${realJob.id}`);

    // Test 3: Attempt to create extraction_log with INVESTMENT_REQUIREMENT field
    console.log('\n✓ Test 3: Database insertion check');
    const testLog = await prisma.extraction_logs.create({
      data: {
        scrapingJobId: realJob.id,
        field: 'INVESTMENT_REQUIREMENT',
        dataSource: 'ANNOUNCEMENT_FILE',
        confidence: 'HIGH',
        value: '자기부담금 10% 이상',
        contextSnippet: 'Test context for INVESTMENT_REQUIREMENT extraction',
        extractionPattern: 'investment.*requirement.*pattern',
      },
    });

    console.log(`  - Created extraction_log ID: ${testLog.id}`);
    console.log(`  - Field: ${testLog.field}`);
    console.log(`  - Value: ${testLog.value}`);

    // Test 4: Query back the record
    console.log('\n✓ Test 4: Query verification');
    const retrieved = await prisma.extraction_logs.findUnique({
      where: { id: testLog.id },
    });

    if (retrieved && retrieved.field === 'INVESTMENT_REQUIREMENT') {
      console.log(`  - Successfully retrieved record with field="${retrieved.field}"`);
    } else {
      throw new Error('Retrieved record field mismatch');
    }

    // Test 5: Cleanup - Delete test record
    await prisma.extraction_logs.delete({
      where: { id: testLog.id },
    });
    console.log('\n✓ Test 5: Cleanup - Deleted test record');

    console.log('\n✅ All tests passed - INVESTMENT_REQUIREMENT enum fix verified locally\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

testExtractionFieldEnum()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
