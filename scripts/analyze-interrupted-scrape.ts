/**
 * Analyze Interrupted NTIS Scraping Session
 *
 * Investigates why Phase 6 enhancement fields are not being populated
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function investigateFields() {
  console.log('🔍 INVESTIGATING ENHANCEMENT FIELD POPULATION\n');

  // Get all programs with full details
  const programs = await prisma.funding_programs.findMany({
    where: { scrapingSource: 'ntis' },
    select: {
      id: true,
      title: true,
      budgetAmount: true,
      minTrl: true,
      maxTrl: true,
      trlInferred: true,
      allowedBusinessStructures: true,
      attachmentUrls: true,
      announcementUrl: true,
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`Total programs: ${programs.length}\n`);

  // Check which fields are actually being saved
  let hasAnyBudget = 0;
  let hasAnyTRL = 0;
  let hasAnyBusinessStructures = 0;
  let hasAnyAttachments = 0;
  let hasTrlInferredTrue = 0;

  for (const p of programs) {
    if (p.budgetAmount !== null) hasAnyBudget++;
    if (p.minTrl !== null || p.maxTrl !== null) hasAnyTRL++;
    if (p.allowedBusinessStructures && p.allowedBusinessStructures.length > 0) hasAnyBusinessStructures++;
    if (p.attachmentUrls && p.attachmentUrls.length > 0) hasAnyAttachments++;
    if (p.trlInferred === true) hasTrlInferredTrue++;
  }

  console.log('Field Population Summary:');
  console.log('─'.repeat(60));
  console.log(`Budget amount: ${hasAnyBudget}/${programs.length}`);
  console.log(`TRL (min/max): ${hasAnyTRL}/${programs.length}`);
  console.log(`TRL inferred flag: ${hasTrlInferredTrue}/${programs.length}`);
  console.log(`Business structures: ${hasAnyBusinessStructures}/${programs.length}`);
  console.log(`Attachments: ${hasAnyAttachments}/${programs.length}`);

  // Show details of one program with attachments
  const programWithAttachments = programs.find(p => p.attachmentUrls && p.attachmentUrls.length > 0);

  if (programWithAttachments) {
    console.log(`\n📄 Sample Program With Attachments:`);
    console.log('─'.repeat(60));
    console.log(`Title: ${programWithAttachments.title.substring(0, 60)}`);
    console.log(`Attachments (${programWithAttachments.attachmentUrls?.length || 0}):`);
    programWithAttachments.attachmentUrls?.forEach((url: string, i: number) => {
      console.log(`  ${i+1}. ${url}`);
    });
    console.log(`Budget: ${programWithAttachments.budgetAmount || 'NULL'}`);
    console.log(`TRL: ${programWithAttachments.minTrl || 'NULL'}-${programWithAttachments.maxTrl || 'NULL'}`);
    console.log(`Business structures: ${JSON.stringify(programWithAttachments.allowedBusinessStructures)}`);
  }

  // Show the one program with budget
  const programWithBudget = programs.find(p => p.budgetAmount !== null);
  if (programWithBudget) {
    console.log(`\n💰 The ONE Program With Budget:`);
    console.log('─'.repeat(60));
    console.log(`Title: ${programWithBudget.title.substring(0, 60)}`);
    console.log(`Budget: ₩${programWithBudget.budgetAmount?.toLocaleString()}`);
    console.log(`URL: ${programWithBudget.announcementUrl}`);
  }
}

investigateFields()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
