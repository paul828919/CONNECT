#!/usr/bin/env tsx
/**
 * Check Description Length
 *
 * Verifies if attachment text is actually being added to descriptions.
 * Programs with attachments should have longer descriptions if extraction works.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDescriptionLength() {
  console.log('📏 Checking Description Length vs Attachment Count\n');
  console.log('='.repeat(80));

  const programs = await prisma.funding_programs.findMany({
    where: {
      scrapingSource: 'ntis',
    },
    select: {
      title: true,
      description: true,
      attachmentUrls: true,
      budgetAmount: true,
      minTrl: true,
      maxTrl: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  console.log(`\nTotal programs: ${programs.length}\n`);

  // Sort by attachment count
  const sorted = programs.sort((a, b) => {
    const aCount = a.attachmentUrls?.length || 0;
    const bCount = b.attachmentUrls?.length || 0;
    return bCount - aCount;
  });

  sorted.forEach((p, i) => {
    const attachmentCount = p.attachmentUrls?.length || 0;
    const descLength = p.description?.length || 0;
    const hasTRL = p.minTrl !== null;
    const hasBudget = p.budgetAmount !== null;

    console.log(`${i + 1}. ${p.title.substring(0, 60)}...`);
    console.log(`   Attachments: ${attachmentCount} files`);
    console.log(`   Description length: ${descLength.toLocaleString()} chars`);
    console.log(`   Has TRL: ${hasTRL ? '✅' : '❌'}`);
    console.log(`   Has Budget: ${hasBudget ? '✅' : '❌'}`);

    // Show snippet of description to verify content type
    if (descLength > 0) {
      const snippet = p.description!.substring(0, 200);
      console.log(`   First 200 chars: "${snippet}..."`);
    }

    console.log();
  });

  // Calculate correlation
  console.log('\n📊 Analysis:\n');
  console.log('─'.repeat(80));

  const withAttachments = programs.filter(p => (p.attachmentUrls?.length || 0) > 0);
  const withoutAttachments = programs.filter(p => (p.attachmentUrls?.length || 0) === 0);

  const avgLengthWith = withAttachments.reduce((sum, p) => sum + (p.description?.length || 0), 0) / withAttachments.length;
  const avgLengthWithout = withoutAttachments.reduce((sum, p) => sum + (p.description?.length || 0), 0) / withoutAttachments.length;

  console.log(`Programs with attachments: ${withAttachments.length}`);
  console.log(`  Avg description length: ${Math.round(avgLengthWith).toLocaleString()} chars`);
  console.log();
  console.log(`Programs without attachments: ${withoutAttachments.length}`);
  console.log(`  Avg description length: ${Math.round(avgLengthWithout).toLocaleString()} chars`);
  console.log();

  if (avgLengthWith > avgLengthWithout * 1.5) {
    console.log('✅ CONCLUSION: Attachment text IS being added to descriptions');
    console.log('   (Programs with attachments have significantly longer descriptions)');
  } else if (avgLengthWith > avgLengthWithout) {
    console.log('⚠️ CONCLUSION: Attachment text may be partially added');
    console.log(`   (Only ${Math.round((avgLengthWith / avgLengthWithout) * 100)}% longer)`);
  } else {
    console.log('❌ CONCLUSION: Attachment text is NOT being added to descriptions');
    console.log('   (Similar lengths regardless of attachment count)');
  }

  await prisma.$disconnect();
}

checkDescriptionLength().catch((error) => {
  console.error('❌ Script failed:', error.message);
  process.exit(1);
});
