/**
 * Export Duplicate Programs to CSV/Markdown
 *
 * Exports Type 1 and Type 2 duplicate programs for manual verification
 *
 * Usage: npx tsx scripts/export-duplicate-programs.ts
 */

import { db } from '@/lib/db';
import * as fs from 'fs';
import * as path from 'path';

interface ProgramInfo {
  id: string;
  title: string;
  ministry: string | null;
  agencyId: string;
  announcementUrl: string;
  deadline: Date | null;
  status: string;
  scrapedAt: Date;
  description: string | null;
  budgetAmount: bigint | null;
}

interface DuplicateGroup {
  baseTitle: string;
  programs: ProgramInfo[];
  type: 'TYPE_1' | 'TYPE_2';
  ministries: Set<string>;
}

function normalizeTitle(title: string): string {
  return title
    .replace(/^\d{4}년도?\s*/g, '')
    .replace(/\([^)]*\)\s*$/g, '')
    .replace(/_?\(?20\d{2}\)?.*$/g, '')
    .replace(/\s*(공고|모집|시행계획|대상과제|신규과제|신규지원|지원과제)\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractSubtitle(title: string): string | null {
  const match = title.match(/\(([^)]+)\)\s*$/);
  return match ? match[1] : null;
}

async function main() {
  console.log('🔍 Extracting duplicate programs for manual verification...\n');

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
      description: true,
      budgetAmount: true,
    },
    orderBy: { title: 'asc' }
  });

  console.log(`📊 Total programs: ${programs.length}`);

  // Group by normalized title
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
      description: program.description,
      budgetAmount: program.budgetAmount,
    });
  }

  // Find Type 1 and Type 2 duplicates
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

      // Skip Type 3 (different subtitles)
      if (subtitles.size > 1) continue;

      let type: 'TYPE_1' | 'TYPE_2';
      if (ministries.size > 1) {
        type = 'TYPE_1';
      } else {
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

  // Sort: Type 1 first, then by group size (largest first)
  duplicateGroups.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'TYPE_1' ? -1 : 1;
    return b.programs.length - a.programs.length;
  });

  // Generate Markdown file
  let markdown = `# 중복 연구과제 공고 목록 (Type 1 & Type 2)\n\n`;
  markdown += `생성일시: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}\n\n`;
  markdown += `## 요약\n\n`;

  const type1Groups = duplicateGroups.filter(g => g.type === 'TYPE_1');
  const type2Groups = duplicateGroups.filter(g => g.type === 'TYPE_2');
  const type1Programs = type1Groups.reduce((sum, g) => sum + g.programs.length, 0);
  const type2Programs = type2Groups.reduce((sum, g) => sum + g.programs.length, 0);

  markdown += `| 구분 | 그룹 수 | 프로그램 수 |\n`;
  markdown += `|------|---------|-------------|\n`;
  markdown += `| Type 1 (동일 제목, 다른 부처) | ${type1Groups.length} | ${type1Programs} |\n`;
  markdown += `| Type 2 (동일 제목, 동일 부처) | ${type2Groups.length} | ${type2Programs} |\n`;
  markdown += `| **합계** | **${duplicateGroups.length}** | **${type1Programs + type2Programs}** |\n\n`;

  markdown += `---\n\n`;
  markdown += `## Type 1: 동일 제목, 다른 부처 (병합 필요)\n\n`;
  markdown += `> 동일한 연구과제가 다른 부처명으로 중복 등록된 경우\n\n`;

  let groupIndex = 1;
  for (const group of type1Groups) {
    markdown += `### 그룹 ${groupIndex}: ${group.baseTitle || '(제목 없음)'}\n\n`;
    markdown += `- **부처**: ${Array.from(group.ministries).join(', ')}\n`;
    markdown += `- **중복 수**: ${group.programs.length}개\n\n`;

    markdown += `| # | ID | 제목 | 부처 | 마감일 | 상태 | NTIS 링크 |\n`;
    markdown += `|---|----|----- |------|--------|------|----------|\n`;

    let progIndex = 1;
    for (const prog of group.programs) {
      const deadline = prog.deadline ? prog.deadline.toISOString().split('T')[0] : 'N/A';
      const shortId = prog.id.slice(0, 8);
      const shortTitle = prog.title.length > 50 ? prog.title.slice(0, 50) + '...' : prog.title;
      markdown += `| ${progIndex} | ${shortId}... | ${shortTitle} | ${prog.ministry || 'N/A'} | ${deadline} | ${prog.status} | [NTIS](${prog.announcementUrl}) |\n`;
      progIndex++;
    }
    markdown += `\n`;
    groupIndex++;
  }

  markdown += `---\n\n`;
  markdown += `## Type 2: 동일 제목, 동일 부처 (정확한 중복)\n\n`;
  markdown += `> 동일한 부처에서 동일한 연구과제가 중복 등록된 경우\n\n`;

  for (const group of type2Groups) {
    markdown += `### 그룹 ${groupIndex}: ${group.baseTitle || '(제목 없음)'}\n\n`;
    markdown += `- **부처**: ${Array.from(group.ministries).join(', ')}\n`;
    markdown += `- **중복 수**: ${group.programs.length}개\n\n`;

    markdown += `| # | ID | 제목 | 부처 | 마감일 | 상태 | NTIS 링크 |\n`;
    markdown += `|---|----|----- |------|--------|------|----------|\n`;

    let progIndex = 1;
    for (const prog of group.programs) {
      const deadline = prog.deadline ? prog.deadline.toISOString().split('T')[0] : 'N/A';
      const shortId = prog.id.slice(0, 8);
      const shortTitle = prog.title.length > 50 ? prog.title.slice(0, 50) + '...' : prog.title;
      markdown += `| ${progIndex} | ${shortId}... | ${shortTitle} | ${prog.ministry || 'N/A'} | ${deadline} | ${prog.status} | [NTIS](${prog.announcementUrl}) |\n`;
      progIndex++;
    }
    markdown += `\n`;
    groupIndex++;
  }

  // Generate CSV file (full details)
  let csv = 'Group Index,Type,Base Title,Program ID,Full Title,Ministry,Agency ID,Deadline,Status,Scraped At,NTIS URL\n';

  groupIndex = 1;
  for (const group of duplicateGroups) {
    for (const prog of group.programs) {
      const deadline = prog.deadline ? prog.deadline.toISOString().split('T')[0] : '';
      const scrapedAt = prog.scrapedAt.toISOString().split('T')[0];
      // Escape CSV fields
      const escapeCsv = (str: string) => `"${(str || '').replace(/"/g, '""')}"`;
      csv += `${groupIndex},${group.type},${escapeCsv(group.baseTitle)},${prog.id},${escapeCsv(prog.title)},${escapeCsv(prog.ministry || '')},${prog.agencyId},${deadline},${prog.status},${scrapedAt},${prog.announcementUrl}\n`;
    }
    groupIndex++;
  }

  // Save files
  const downloadsPath = '/Users/paulkim/Downloads';
  const mdPath = path.join(downloadsPath, 'duplicate-programs-verification.md');
  const csvPath = path.join(downloadsPath, 'duplicate-programs-verification.csv');

  fs.writeFileSync(mdPath, markdown, 'utf-8');
  fs.writeFileSync(csvPath, csv, 'utf-8');

  console.log(`\n✅ Files created:`);
  console.log(`   📄 Markdown: ${mdPath}`);
  console.log(`   📊 CSV: ${csvPath}`);
  console.log(`\n📊 Summary:`);
  console.log(`   Type 1 groups: ${type1Groups.length} (${type1Programs} programs)`);
  console.log(`   Type 2 groups: ${type2Groups.length} (${type2Programs} programs)`);
  console.log(`   Total: ${duplicateGroups.length} groups (${type1Programs + type2Programs} programs)`);

  await db.$disconnect();
}

main().catch(console.error);
