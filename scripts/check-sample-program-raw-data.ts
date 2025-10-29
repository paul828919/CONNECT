/**
 * Check Sample Program Raw Data
 *
 * Fetches one NTIS program that HAS budget data and one that has NULL budget
 * to verify if the parser is working correctly.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSampleProgramData() {
  try {
    console.log('🔍 Checking Sample NTIS Program Data\n');
    console.log('='.repeat(80));

    // 1. Find program WITH budget data
    const programWithBudget = await prisma.funding_programs.findFirst({
      where: {
        scrapingSource: 'ntis',
        budgetAmount: { not: null },
      },
      select: {
        id: true,
        title: true,
        budgetAmount: true,
        deadline: true,
        allowedBusinessStructures: true,
        attachmentUrls: true,
        trlInferred: true,
        minTrl: true,
        maxTrl: true,
        announcementUrl: true,
      },
    });

    if (programWithBudget) {
      console.log('✅ PROGRAM WITH BUDGET DATA:\n');
      console.log(`Title: ${programWithBudget.title}`);
      console.log(`Budget: ₩${(Number(programWithBudget.budgetAmount!) / 1000000000).toFixed(1)}B`);
      console.log(`Deadline: ${programWithBudget.deadline}`);
      console.log(`Business Structures: ${JSON.stringify(programWithBudget.allowedBusinessStructures)}`);
      console.log(`Attachments: ${programWithBudget.attachmentUrls?.length || 0} files`);
      console.log(`TRL: ${programWithBudget.minTrl}-${programWithBudget.maxTrl} (inferred: ${programWithBudget.trlInferred})`);
      console.log(`URL: ${programWithBudget.announcementUrl}\n`);
    } else {
      console.log('❌ No programs with budget found\n');
    }

    console.log('─'.repeat(80));

    // 2. Find program WITHOUT budget data (sample of NULL budget programs)
    const programsWithoutBudget = await prisma.funding_programs.findMany({
      where: {
        scrapingSource: 'ntis',
        budgetAmount: null,
      },
      select: {
        id: true,
        title: true,
        deadline: true,
        allowedBusinessStructures: true,
        attachmentUrls: true,
        trlInferred: true,
        minTrl: true,
        maxTrl: true,
        announcementUrl: true,
      },
      take: 3,
    });

    console.log('\n❌ SAMPLE PROGRAMS WITHOUT BUDGET DATA:\n');

    programsWithoutBudget.forEach((program, index) => {
      console.log(`${index + 1}. ${program.title}`);
      console.log(`   Deadline: ${program.deadline}`);
      console.log(`   Business Structures: ${JSON.stringify(program.allowedBusinessStructures)}`);
      console.log(`   Attachments: ${program.attachmentUrls?.length || 0} files`);
      console.log(`   TRL: ${program.minTrl}-${program.maxTrl} (inferred: ${program.trlInferred})`);
      console.log(`   URL: ${program.announcementUrl}\n`);
    });

    console.log('='.repeat(80));
    console.log('\n📊 ANALYSIS:\n');
    console.log('If most programs have:');
    console.log('  - NULL budget BUT valid deadline → Budget genuinely TBD (parser working)');
    console.log('  - NULL budget AND NULL deadline → Parser extraction failure');
    console.log('  - 0 business structures → Detection pattern not matching');
    console.log('  - 0 attachments → Attachment URL extraction failing');

    await prisma.$disconnect();
  } catch (error: any) {
    console.error('\n\n❌ Query failed:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

checkSampleProgramData();
