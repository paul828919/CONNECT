#!/usr/bin/env tsx
/**
 * Check TRL Success Cases
 *
 * Investigates which programs successfully extracted TRL data
 * to understand what patterns work vs what patterns fail.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTRLSuccessCases() {
  console.log('🎯 Investigating TRL Success Cases\n');
  console.log('='.repeat(80));

  const programsWithTRL = await prisma.funding_programs.findMany({
    where: {
      scrapingSource: 'ntis',
      minTrl: { not: null },
    },
    select: {
      title: true,
      minTrl: true,
      maxTrl: true,
      trlInferred: true,
      budgetAmount: true,
      attachmentUrls: true,
      announcementUrl: true,
      description: true,
    },
  });

  console.log(`\n✅ Programs WITH TRL Data: ${programsWithTRL.length}\n`);
  console.log('─'.repeat(80));

  programsWithTRL.forEach((p, i) => {
    console.log(`\n${i + 1}. ${p.title.substring(0, 80)}...`);
    console.log(`   TRL Range: ${p.minTrl}-${p.maxTrl}`);
    console.log(`   TRL Inferred: ${p.trlInferred}`);
    console.log(`   Budget: ${p.budgetAmount || 'NULL'}`);
    console.log(`   Attachments: ${p.attachmentUrls?.length || 0} files`);

    // Search for TRL keywords in description
    const description = p.description || '';
    const trlKeywords = ['TRL', '기술성숙도', '기술성', '성숙도'];
    const foundKeywords = trlKeywords.filter(kw => description.includes(kw));

    if (foundKeywords.length > 0) {
      console.log(`   ✅ Found TRL keywords in description: ${foundKeywords.join(', ')}`);

      // Extract snippet around TRL keyword
      const firstKeyword = foundKeywords[0];
      const index = description.indexOf(firstKeyword);
      const snippet = description.substring(Math.max(0, index - 50), Math.min(description.length, index + 100));
      console.log(`   Snippet: ...${snippet}...`);
    }

    console.log(`   URL: ${p.announcementUrl}`);
  });

  // Now check programs WITHOUT TRL data
  const programsWithoutTRL = await prisma.funding_programs.findMany({
    where: {
      scrapingSource: 'ntis',
      OR: [
        { minTrl: null },
        { maxTrl: null },
      ],
    },
    select: {
      title: true,
      attachmentUrls: true,
      description: true,
    },
  });

  console.log('\n\n❌ Programs WITHOUT TRL Data: ' + programsWithoutTRL.length);
  console.log('─'.repeat(80));

  programsWithoutTRL.forEach((p, i) => {
    console.log(`\n${i + 1}. ${p.title.substring(0, 80)}...`);
    console.log(`   Attachments: ${p.attachmentUrls?.length || 0} files`);

    // Check if description contains TRL keywords but extraction failed
    const description = p.description || '';
    const trlKeywords = ['TRL', '기술성숙도', '기술성', '성숙도'];
    const foundKeywords = trlKeywords.filter(kw => description.includes(kw));

    if (foundKeywords.length > 0) {
      console.log(`   ⚠️ Description HAS TRL keywords but extraction FAILED: ${foundKeywords.join(', ')}`);
    } else {
      console.log(`   ℹ️ No TRL keywords found in description (may be in attachments)`);
    }
  });

  await prisma.$disconnect();
}

checkTRLSuccessCases().catch((error) => {
  console.error('❌ Script failed:', error.message);
  process.exit(1);
});
