/**
 * Duplicate Funding Programs Diagnostic Script
 *
 * Identifies and classifies duplicate titles in the funding_programs table:
 * - Type 1: Same title, different ministry
 * - Type 2: Same title, same ministry
 * - Type 3: Same title, different subtitles (actually distinct programs)
 *
 * Usage: npx tsx scripts/find-duplicate-programs.ts
 */

import { db } from '@/lib/db';

interface ProgramInfo {
  id: string;
  title: string;
  ministry: string | null;
  agencyId: string;
  announcementUrl: string;
  deadline: Date | null;
  status: string;
  scrapedAt: Date;
}

interface DuplicateGroup {
  baseTitle: string;  // Normalized title for grouping
  programs: ProgramInfo[];
  type: 'TYPE_1' | 'TYPE_2' | 'TYPE_3' | 'UNKNOWN';
  ministries: Set<string>;
}

/**
 * Normalize title for comparison
 * Removes year prefixes, parenthetical content, and normalizes spacing
 */
function normalizeTitle(title: string): string {
  return title
    // Remove year prefix like "2026년도", "2026년"
    .replace(/^\d{4}년도?\s*/g, '')
    // Remove parenthetical content at the end (subtitles)
    .replace(/\([^)]*\)\s*$/g, '')
    // Remove trailing underscores and years
    .replace(/_?\(?20\d{2}\)?.*$/g, '')
    // Remove common suffixes
    .replace(/\s*(공고|모집|시행계획|대상과제|신규과제|신규지원|지원과제)\s*$/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract subtitle from title (parenthetical content)
 */
function extractSubtitle(title: string): string | null {
  const match = title.match(/\(([^)]+)\)\s*$/);
  return match ? match[1] : null;
}

async function main() {
  console.log('🔍 Scanning for duplicate funding programs...\n');

  // Fetch all active funding programs
  const programs = await db.funding_programs.findMany({
    where: {
      status: { in: ['ACTIVE', 'EXPIRED'] }
    },
    select: {
      id: true,
      title: true,
      ministry: true,
      agencyId: true,
      announcementUrl: true,
      deadline: true,
      status: true,
      scrapedAt: true,
    },
    orderBy: { title: 'asc' }
  });

  console.log(`📊 Total programs in database: ${programs.length}\n`);

  // Group programs by normalized title
  const groupedByTitle = new Map<string, ProgramInfo[]>();

  for (const program of programs) {
    const normalizedTitle = normalizeTitle(program.title);

    if (!groupedByTitle.has(normalizedTitle)) {
      groupedByTitle.set(normalizedTitle, []);
    }
    groupedByTitle.get(normalizedTitle)!.push({
      id: program.id,
      title: program.title,
      ministry: program.ministry,
      agencyId: program.agencyId,
      announcementUrl: program.announcementUrl,
      deadline: program.deadline,
      status: program.status,
      scrapedAt: program.scrapedAt,
    });
  }

  // Find duplicates (groups with more than 1 program)
  const duplicateGroups: DuplicateGroup[] = [];

  for (const [baseTitle, groupPrograms] of groupedByTitle.entries()) {
    if (groupPrograms.length > 1) {
      const ministries = new Set<string>();
      const subtitles = new Set<string>();

      for (const prog of groupPrograms) {
        ministries.add(prog.ministry || 'UNKNOWN');
        const subtitle = extractSubtitle(prog.title);
        if (subtitle) subtitles.add(subtitle);
      }

      // Classify duplicate type
      let type: DuplicateGroup['type'] = 'UNKNOWN';

      if (subtitles.size > 1) {
        // Different subtitles = Type 3 (different programs)
        type = 'TYPE_3';
      } else if (ministries.size > 1) {
        // Same title, different ministries = Type 1
        type = 'TYPE_1';
      } else if (ministries.size === 1) {
        // Same title, same ministry = Type 2
        type = 'TYPE_2';
      }

      duplicateGroups.push({
        baseTitle,
        programs: groupPrograms,
        type,
        ministries,
      });
    }
  }

  // Summary statistics
  const type1Count = duplicateGroups.filter(g => g.type === 'TYPE_1').length;
  const type2Count = duplicateGroups.filter(g => g.type === 'TYPE_2').length;
  const type3Count = duplicateGroups.filter(g => g.type === 'TYPE_3').length;
  const unknownCount = duplicateGroups.filter(g => g.type === 'UNKNOWN').length;

  const totalDuplicatePrograms = duplicateGroups.reduce((sum, g) => sum + g.programs.length, 0);
  const uniqueAfterDedup = duplicateGroups.length;

  console.log('=' .repeat(80));
  console.log('📈 DUPLICATE ANALYSIS SUMMARY');
  console.log('=' .repeat(80));
  console.log(`\n📊 Statistics:`);
  console.log(`   Total duplicate groups: ${duplicateGroups.length}`);
  console.log(`   Total programs in duplicate groups: ${totalDuplicatePrograms}`);
  console.log(`   Potential reduction: ${totalDuplicatePrograms - uniqueAfterDedup} programs\n`);

  console.log(`📋 By Type:`);
  console.log(`   Type 1 (Same title, different ministry): ${type1Count} groups`);
  console.log(`   Type 2 (Same title, same ministry): ${type2Count} groups`);
  console.log(`   Type 3 (Same title, different subtitles): ${type3Count} groups`);
  console.log(`   Unknown: ${unknownCount} groups\n`);

  // Detailed output for each type
  console.log('=' .repeat(80));
  console.log('🔴 TYPE 1: Same Title, Different Ministry (Should be MERGED)');
  console.log('=' .repeat(80));

  for (const group of duplicateGroups.filter(g => g.type === 'TYPE_1')) {
    console.log(`\n📌 Base Title: "${group.baseTitle}"`);
    console.log(`   Ministries: ${Array.from(group.ministries).join(', ')}`);
    console.log(`   Programs (${group.programs.length}):`);
    for (const prog of group.programs) {
      console.log(`     - ID: ${prog.id.slice(0, 8)}...`);
      console.log(`       Title: ${prog.title}`);
      console.log(`       Ministry: ${prog.ministry || 'NULL'}`);
      console.log(`       Deadline: ${prog.deadline?.toISOString().split('T')[0] || 'NULL'}`);
      console.log(`       URL: ${prog.announcementUrl.slice(0, 80)}...`);
    }
  }

  console.log('\n' + '=' .repeat(80));
  console.log('🟡 TYPE 2: Same Title, Same Ministry (Should be MERGED - exact duplicates)');
  console.log('=' .repeat(80));

  for (const group of duplicateGroups.filter(g => g.type === 'TYPE_2')) {
    console.log(`\n📌 Base Title: "${group.baseTitle}"`);
    console.log(`   Ministry: ${Array.from(group.ministries).join(', ')}`);
    console.log(`   Programs (${group.programs.length}):`);
    for (const prog of group.programs) {
      console.log(`     - ID: ${prog.id.slice(0, 8)}...`);
      console.log(`       Title: ${prog.title}`);
      console.log(`       Deadline: ${prog.deadline?.toISOString().split('T')[0] || 'NULL'}`);
      console.log(`       URL: ${prog.announcementUrl.slice(0, 80)}...`);
    }
  }

  console.log('\n' + '=' .repeat(80));
  console.log('🟢 TYPE 3: Same Title, Different Subtitles (Keep as SEPARATE - distinct programs)');
  console.log('=' .repeat(80));

  for (const group of duplicateGroups.filter(g => g.type === 'TYPE_3').slice(0, 5)) {
    console.log(`\n📌 Base Title: "${group.baseTitle}"`);
    console.log(`   Programs (${group.programs.length}) - showing distinct subtitles:`);
    for (const prog of group.programs.slice(0, 3)) {
      const subtitle = extractSubtitle(prog.title);
      console.log(`     - Subtitle: ${subtitle || 'none'}`);
      console.log(`       Full Title: ${prog.title}`);
    }
    if (group.programs.length > 3) {
      console.log(`     ... and ${group.programs.length - 3} more`);
    }
  }

  // Generate deduplication recommendations
  console.log('\n' + '=' .repeat(80));
  console.log('💡 RECOMMENDATIONS');
  console.log('=' .repeat(80));

  const type1AndType2 = duplicateGroups.filter(g => g.type === 'TYPE_1' || g.type === 'TYPE_2');
  const programsToMerge = type1AndType2.reduce((sum, g) => sum + g.programs.length - 1, 0);

  console.log(`\n1. IMMEDIATE ACTION: Merge ${programsToMerge} duplicate programs`);
  console.log(`   - Type 1 groups: ${type1Count} (different ministry, same program)`);
  console.log(`   - Type 2 groups: ${type2Count} (exact duplicates)`);

  console.log(`\n2. KEEP SEPARATE: ${type3Count} Type 3 groups`);
  console.log(`   - These have different subtitles indicating distinct sub-programs`);

  console.log(`\n3. LONG-TERM FIX: Update deduplication hash algorithm`);
  console.log(`   - Current: SHA-256(agencyId | title | announcementUrl)`);
  console.log(`   - Proposed: SHA-256(normalizedTitle | deadline | budgetAmount)`);
  console.log(`   - This will prevent URL-based false duplicates from being created`);

  // Export data for manual review
  const exportData = {
    summary: {
      totalPrograms: programs.length,
      duplicateGroups: duplicateGroups.length,
      type1: type1Count,
      type2: type2Count,
      type3: type3Count,
      programsToMerge,
    },
    type1Groups: duplicateGroups.filter(g => g.type === 'TYPE_1').map(g => ({
      baseTitle: g.baseTitle,
      ministries: Array.from(g.ministries),
      programIds: g.programs.map(p => p.id),
      count: g.programs.length,
    })),
    type2Groups: duplicateGroups.filter(g => g.type === 'TYPE_2').map(g => ({
      baseTitle: g.baseTitle,
      ministry: Array.from(g.ministries)[0],
      programIds: g.programs.map(p => p.id),
      count: g.programs.length,
    })),
  };

  console.log('\n' + '=' .repeat(80));
  console.log('📄 EXPORT DATA (JSON)');
  console.log('=' .repeat(80));
  console.log(JSON.stringify(exportData, null, 2));

  await db.$disconnect();
}

main().catch(console.error);
