/**
 * Analyze Unmapped Agencies
 *
 * Identifies which announcing agencies are not being mapped to categories
 * to understand the 56% categorization gap.
 */

import { db } from '../lib/db';

async function analyzeUnmappedAgencies() {
  console.log('🔍 Analyzing unmapped agencies...\n');

  // Get programs missing categories
  const unmapped = await db.funding_programs.findMany({
    where: {
      agencyId: 'NTIS',
      announcingAgency: { not: null },
      category: null,
    },
    select: {
      announcingAgency: true,
    },
  });

  // Count frequency of each unmapped agency
  const agencyCounts = new Map<string, number>();
  unmapped.forEach((program) => {
    if (program.announcingAgency) {
      const count = agencyCounts.get(program.announcingAgency) || 0;
      agencyCounts.set(program.announcingAgency, count + 1);
    }
  });

  // Sort by frequency (descending)
  const sorted = Array.from(agencyCounts.entries()).sort((a, b) => b[1] - a[1]);

  console.log(`📊 Total unmapped programs: ${unmapped.length}`);
  console.log(`📊 Unique unmapped agencies: ${sorted.length}\n`);

  console.log('Top 30 unmapped agencies (by frequency):\n');
  sorted.slice(0, 30).forEach(([agency, count], index) => {
    console.log(`${String(index + 1).padStart(2)}. [${String(count).padStart(3)}] ${agency}`);
  });

  await db.$disconnect();
}

analyzeUnmappedAgencies().catch((error) => {
  console.error('❌ Analysis failed:', error);
  process.exit(1);
});
