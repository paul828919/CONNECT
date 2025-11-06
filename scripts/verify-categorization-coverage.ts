/**
 * Verify Categorization Coverage Script
 *
 * Purpose: Identify ALL programs with NULL category after hierarchical categorization
 * Goal: Achieve 0% omission (unmappedPrograms.length === 0)
 *
 * Output:
 * 1. Console summary statistics
 * 2. CSV export with (ministry, agency, count, sample_titles)
 * 3. Detailed breakdown by ministry-agency pairs
 *
 * Usage:
 *   npx tsx scripts/verify-categorization-coverage.ts
 *
 * Created: October 24, 2025 (Phase 3 of 10-phase plan)
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface UnmappedProgram {
  id: string;
  title: string;
  ministry: string | null;
  announcingAgency: string | null;
  category: string | null;
}

interface MinistryAgencyPair {
  ministry: string | null;
  agency: string | null;
  count: number;
  sampleTitles: string[];
  programs: UnmappedProgram[];
}

async function main() {
  console.log('🔍 Verifying Categorization Coverage...\n');
  console.log('Goal: Achieve 0% omission (all programs must have category)\n');

  try {
    // 1. Query ALL programs with NULL category
    console.log('📊 Querying programs with NULL category...');
    const unmappedPrograms = await prisma.funding_programs.findMany({
      where: {
        category: null,
      },
      select: {
        id: true,
        title: true,
        ministry: true,
        announcingAgency: true,
        category: true,
      },
      orderBy: {
        announcingAgency: 'asc',
      },
    });

    const totalPrograms = await prisma.funding_programs.count();
    const unmappedCount = unmappedPrograms.length;
    const omissionRate = ((unmappedCount / totalPrograms) * 100).toFixed(2);

    console.log(`\n📈 Overall Statistics:`);
    console.log(`   Total programs: ${totalPrograms}`);
    console.log(`   Unmapped programs: ${unmappedCount}`);
    console.log(`   Omission rate: ${omissionRate}%`);
    console.log(`   Goal: 0% omission (${unmappedCount} programs need categorization)\n`);

    if (unmappedCount === 0) {
      console.log('✅ SUCCESS! Achieved 0% omission - all programs are categorized.');
      return;
    }

    // 2. Group by (ministry, announcingAgency) pairs
    console.log('📊 Grouping by ministry-agency pairs...\n');
    const groupedPairs = groupByMinistryAgency(unmappedPrograms);

    // 3. Sort by count (descending) - prioritize high-impact pairs
    const sortedPairs = Array.from(groupedPairs.values()).sort(
      (a, b) => b.count - a.count
    );

    // 4. Print summary breakdown
    console.log('🔍 Unmapped Programs by Ministry-Agency Pairs:\n');
    console.log('Rank | Ministry | Agency | Count | Sample Titles');
    console.log('-----|----------|--------|-------|-------------');

    sortedPairs.forEach((pair, index) => {
      const ministryDisplay = pair.ministry || 'NULL';
      const agencyDisplay = pair.agency || 'NULL';
      const sampleTitle = pair.sampleTitles[0]?.substring(0, 50) || 'N/A';

      console.log(
        `${String(index + 1).padStart(4, ' ')} | ${ministryDisplay.padEnd(25, ' ')} | ${agencyDisplay.padEnd(30, ' ')} | ${String(pair.count).padStart(5, ' ')} | ${sampleTitle}...`
      );
    });

    // 5. Identify categorization patterns
    console.log('\n\n📋 Categorization Analysis:\n');

    const case1 = sortedPairs.filter((p) => p.ministry && p.agency); // Both available
    const case2 = sortedPairs.filter((p) => !p.ministry && p.agency); // Agency only
    const case3 = sortedPairs.filter((p) => p.ministry && !p.agency); // Ministry only
    const case4 = sortedPairs.filter((p) => !p.ministry && !p.agency); // Both NULL

    console.log(`Case 1 (Both ministry & agency): ${case1.length} unique pairs (${case1.reduce((sum, p) => sum + p.count, 0)} programs)`);
    console.log(`   → Action: Add to AGENCY_MAPPINGS with parentMinistry field`);
    console.log(`Case 2 (Agency only): ${case2.length} unique pairs (${case2.reduce((sum, p) => sum + p.count, 0)} programs)`);
    console.log(`   → Action: Add to AGENCY_MAPPINGS (ministry context unavailable)`);
    console.log(`Case 3 (Ministry only): ${case3.length} unique pairs (${case3.reduce((sum, p) => sum + p.count, 0)} programs)`);
    console.log(`   → Action: Verify MINISTRY_MAPPINGS or investigate data quality`);
    console.log(`Case 4 (Both NULL): ${case4.length} unique pairs (${case4.reduce((sum, p) => sum + p.count, 0)} programs)`);
    console.log(`   → Action: Investigate scraper - ministry and agency extraction failed\n`);

    // 6. Export to CSV for manual classification
    const csvPath = path.join(process.cwd(), 'unmapped-programs.csv');
    console.log(`💾 Exporting to CSV: ${csvPath}\n`);
    exportToCSV(sortedPairs, csvPath);

    // 7. Export detailed JSON for Phase 4 manual classification
    const jsonPath = path.join(process.cwd(), 'unmapped-programs-detailed.json');
    console.log(`💾 Exporting detailed JSON: ${jsonPath}\n`);
    fs.writeFileSync(jsonPath, JSON.stringify(sortedPairs, null, 2));

    // 8. Print action items
    console.log('🎯 Next Steps (Phase 4: Manual Classification):\n');
    console.log('1. Review unmapped-programs.csv');
    console.log('2. For each ministry-agency pair:');
    console.log('   a. Research agency focus area (visit official website)');
    console.log('   b. Add to AGENCY_MAPPINGS in lib/scraping/parsers/agency-mapper.ts');
    console.log('   c. Run this script again to verify progress');
    console.log('3. Iterate until unmappedPrograms.length === 0');
    console.log('4. Proceed to Phase 5 (optional TRL enhancement) or Phase 6 (test scrape)\n');

    console.log(`❌ INCOMPLETE: ${unmappedCount} programs still need categorization (${omissionRate}% omission rate)`);
    console.log('   Goal: Continue Phase 4 manual classification until 0% omission achieved.\n');
  } catch (error) {
    console.error('❌ Error during verification:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Group programs by (ministry, announcingAgency) pairs
 */
function groupByMinistryAgency(
  programs: UnmappedProgram[]
): Map<string, MinistryAgencyPair> {
  const groupMap = new Map<string, MinistryAgencyPair>();

  for (const program of programs) {
    const key = `${program.ministry || 'NULL'}|||${program.announcingAgency || 'NULL'}`;

    if (!groupMap.has(key)) {
      groupMap.set(key, {
        ministry: program.ministry,
        agency: program.announcingAgency,
        count: 0,
        sampleTitles: [],
        programs: [],
      });
    }

    const pair = groupMap.get(key)!;
    pair.count += 1;
    pair.programs.push(program);

    // Keep top 3 sample titles for reference
    if (pair.sampleTitles.length < 3) {
      pair.sampleTitles.push(program.title);
    }
  }

  return groupMap;
}

/**
 * Export unmapped programs to CSV
 */
function exportToCSV(pairs: MinistryAgencyPair[], filePath: string): void {
  const rows = [
    // CSV header
    'Ministry,Agency,Program Count,Sample Title 1,Sample Title 2,Sample Title 3',
  ];

  for (const pair of pairs) {
    const ministry = pair.ministry || 'NULL';
    const agency = pair.agency || 'NULL';
    const count = pair.count;
    const title1 = escapeCsv(pair.sampleTitles[0] || '');
    const title2 = escapeCsv(pair.sampleTitles[1] || '');
    const title3 = escapeCsv(pair.sampleTitles[2] || '');

    rows.push(`"${ministry}","${agency}",${count},"${title1}","${title2}","${title3}"`);
  }

  fs.writeFileSync(filePath, rows.join('\n'), 'utf-8');
  console.log(`✅ CSV exported: ${pairs.length} unique ministry-agency pairs`);
}

/**
 * Escape CSV values (handle commas, quotes, newlines)
 */
function escapeCsv(value: string): string {
  if (!value) return '';
  return value.replace(/"/g, '""').replace(/\n/g, ' ');
}

// Run the script
main()
  .then(() => {
    console.log('\n✅ Verification script completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Verification script failed:', error);
    process.exit(1);
  });
