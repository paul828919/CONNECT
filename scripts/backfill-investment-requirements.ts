/**
 * Backfill Investment Requirements for Existing Programs
 *
 * Extracts investment requirements from existing program titles and descriptions
 * and populates the requiredInvestmentAmount field.
 *
 * Usage: DATABASE_URL="postgresql://connect@localhost:5432/connect?schema=public" npx tsx scripts/backfill-investment-requirements.ts
 */

import { db } from '@/lib/db';
import { extractInvestmentRequirement } from '@/lib/scraping/utils';
import { Decimal } from '@prisma/client/runtime/library';

async function backfillInvestmentRequirements() {
  console.log('Starting investment requirement backfill...\n');

  // Fetch all programs without investment requirement
  const programs = await db.funding_programs.findMany({
    where: {
      requiredInvestmentAmount: null, // Only programs without investment requirement
    },
    select: {
      id: true,
      title: true,
      description: true,
    },
    orderBy: {
      scrapedAt: 'desc',
    },
  });

  console.log(`Found ${programs.length} programs to process\n`);

  let updated = 0;
  let skipped = 0;
  let dcpUpdated = 0;
  const updates: Array<{ id: string; title: string; amount: number; source: string }> = [];

  for (const program of programs) {
    let investment: number | null = null;
    let source = 'extraction';

    // Special handling for DCP programs
    // Based on verified screenshot: "2025년 딥테크 챌린지 프로젝트(DCP) 지원계획 공고"
    // Requirement: "투자 유치 20억원 이상 기업"
    if (program.title.includes('DCP') && program.title.includes('딥테크 챌린지')) {
      investment = 2000000000; // 20억원 (2B KRW)
      source = 'DCP-verified';
      dcpUpdated++;
    } else {
      // For other programs, try to extract from title and description
      const combinedText = `${program.title || ''}\n${program.description || ''}`;
      investment = extractInvestmentRequirement(combinedText);
    }

    if (investment !== null) {
      // Update the database
      await db.funding_programs.update({
        where: { id: program.id },
        data: {
          requiredInvestmentAmount: new Decimal(investment),
        },
      });

      const titlePreview = program.title.length > 60
        ? program.title.substring(0, 60) + '...'
        : program.title;

      console.log(`✓ ${titlePreview}`);
      console.log(`  Investment: ₩${investment.toLocaleString()} (${source})\n`);

      updates.push({
        id: program.id,
        title: titlePreview,
        amount: investment,
        source
      });
      updated++;
    } else {
      skipped++;
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Backfill complete:`);
  console.log(`  ${updated} programs updated with investment requirements`);
  console.log(`  ${dcpUpdated} DCP programs (verified from announcement)`);
  console.log(`  ${updated - dcpUpdated} programs (extracted from text)`);
  console.log(`  ${skipped} programs had no investment requirements`);
  console.log(`${'='.repeat(60)}\n`);

  if (updates.length > 0 && updates.length <= 10) {
    console.log('Updated programs:');
    updates.forEach(({ title, amount, source }) => {
      console.log(`  - ${title}: ₩${amount.toLocaleString()} (${source})`);
    });
  }
}

backfillInvestmentRequirements()
  .catch((error) => {
    console.error('Error during backfill:', error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
    process.exit(0);
  });
