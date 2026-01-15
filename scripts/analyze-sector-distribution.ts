/**
 * Sector Distribution Analysis Script
 *
 * Analyzes funding_programs to determine sector distribution.
 * Used to prioritize SEO landing pages by actual program volume.
 *
 * Usage:
 *   npx ts-node scripts/analyze-sector-distribution.ts
 *
 * Output:
 *   - Programs per sector (ranked)
 *   - Programs per agency
 *   - Top keywords across all programs
 */

import { PrismaClient } from '@prisma/client';
import { findIndustrySector, INDUSTRY_TAXONOMY } from '../lib/matching/taxonomy';

const prisma = new PrismaClient();

interface SectorCount {
  sector: string;
  name: string;
  count: number;
  percentage: number;
}

interface AgencyCount {
  agency: string;
  count: number;
  percentage: number;
}

interface KeywordCount {
  keyword: string;
  count: number;
}

async function analyzeSectorDistribution() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Funding Programs Sector Distribution Analysis');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log();

  // 1. Fetch all active funding programs
  const programs = await prisma.funding_programs.findMany({
    where: {
      status: 'ACTIVE',
    },
    select: {
      id: true,
      title: true,
      description: true,
      keywords: true,
      agencyId: true,
      category: true,
      deadline: true,
    },
  });

  console.log(`Total active programs: ${programs.length}`);
  console.log();

  // 2. Count programs by sector
  const sectorCounts: Record<string, number> = {};
  const unmatchedPrograms: string[] = [];

  for (const program of programs) {
    let matchedSector: string | null = null;

    // Try to find sector from keywords
    for (const keyword of program.keywords) {
      const sector = findIndustrySector(keyword);
      if (sector) {
        matchedSector = sector;
        break;
      }
    }

    // Try from title if no keyword match
    if (!matchedSector) {
      const titleWords = program.title.split(/[\s,.\-\/()]+/);
      for (const word of titleWords) {
        const sector = findIndustrySector(word);
        if (sector) {
          matchedSector = sector;
          break;
        }
      }
    }

    // Try from category
    if (!matchedSector && program.category) {
      matchedSector = findIndustrySector(program.category);
    }

    if (matchedSector) {
      sectorCounts[matchedSector] = (sectorCounts[matchedSector] || 0) + 1;
    } else {
      unmatchedPrograms.push(program.title);
    }
  }

  // 3. Calculate percentages and sort
  const totalMatched = Object.values(sectorCounts).reduce((a, b) => a + b, 0);
  const sectorResults: SectorCount[] = Object.entries(sectorCounts)
    .map(([sector, count]) => ({
      sector,
      name: INDUSTRY_TAXONOMY[sector as keyof typeof INDUSTRY_TAXONOMY]?.name || sector,
      count,
      percentage: (count / programs.length) * 100,
    }))
    .sort((a, b) => b.count - a.count);

  console.log('📌 Programs by Industry Sector (Ranked)');
  console.log('─────────────────────────────────────────');
  console.log('Rank | Sector          | Count | %     | Korean Name');
  console.log('─────────────────────────────────────────');
  sectorResults.forEach((result, index) => {
    const rank = String(index + 1).padStart(4);
    const sector = result.sector.padEnd(15);
    const count = String(result.count).padStart(5);
    const pct = result.percentage.toFixed(1).padStart(5);
    console.log(`${rank} | ${sector} | ${count} | ${pct}% | ${result.name}`);
  });
  console.log('─────────────────────────────────────────');
  console.log(`Matched: ${totalMatched}/${programs.length} (${((totalMatched / programs.length) * 100).toFixed(1)}%)`);
  console.log(`Unmatched: ${unmatchedPrograms.length}`);
  console.log();

  // 4. Count programs by agency
  console.log('📌 Programs by Agency');
  console.log('─────────────────────────────────────────');
  const agencyCounts: Record<string, number> = {};
  for (const program of programs) {
    agencyCounts[program.agencyId] = (agencyCounts[program.agencyId] || 0) + 1;
  }

  const agencyResults: AgencyCount[] = Object.entries(agencyCounts)
    .map(([agency, count]) => ({
      agency,
      count,
      percentage: (count / programs.length) * 100,
    }))
    .sort((a, b) => b.count - a.count);

  agencyResults.forEach(result => {
    const agency = result.agency.padEnd(10);
    const count = String(result.count).padStart(5);
    const pct = result.percentage.toFixed(1).padStart(5);
    console.log(`${agency} | ${count} | ${pct}%`);
  });
  console.log();

  // 5. Analyze top keywords
  console.log('📌 Top 20 Keywords Across All Programs');
  console.log('─────────────────────────────────────────');
  const keywordCounts: Record<string, number> = {};
  for (const program of programs) {
    for (const keyword of program.keywords) {
      const normalized = keyword.toLowerCase().trim();
      if (normalized.length > 1) {
        keywordCounts[normalized] = (keywordCounts[normalized] || 0) + 1;
      }
    }
  }

  const topKeywords: KeywordCount[] = Object.entries(keywordCounts)
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  topKeywords.forEach((result, index) => {
    const rank = String(index + 1).padStart(2);
    const keyword = result.keyword.padEnd(30);
    const count = String(result.count).padStart(4);
    console.log(`${rank}. ${keyword} | ${count} programs`);
  });
  console.log();

  // 6. Programs with active deadlines
  const now = new Date();
  const activeDeadlinePrograms = programs.filter(
    p => p.deadline && new Date(p.deadline) > now
  );
  console.log('📌 Programs with Active Deadlines');
  console.log(`Active deadline programs: ${activeDeadlinePrograms.length}/${programs.length}`);
  console.log();

  // 7. Generate SEO recommendations
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎯 SEO Landing Page Recommendations');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log();
  console.log('Priority landing pages based on program volume:');
  console.log();

  const top5Sectors = sectorResults.slice(0, 5);
  top5Sectors.forEach((result, index) => {
    const sectorSlug = result.sector.toLowerCase().replace(/_/g, '-');
    console.log(`${index + 1}. /funding/${sectorSlug}`);
    console.log(`   Title: "${result.name} 분야 정부 R&D 과제 | Connect"`);
    console.log(`   Programs: ${result.count}개`);
    console.log();
  });

  console.log('Additional priority pages:');
  console.log('- /ntis-alternative (NTIS 대안)');
  console.log('- /iris-alternative (IRIS 대안)');
  console.log();

  // 8. Sample unmatched programs for taxonomy improvement
  if (unmatchedPrograms.length > 0) {
    console.log('📋 Sample Unmatched Programs (for taxonomy improvement):');
    console.log('─────────────────────────────────────────');
    unmatchedPrograms.slice(0, 10).forEach(title => {
      console.log(`- ${title.substring(0, 60)}...`);
    });
    console.log();
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Analysis complete');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

// Run the analysis
analyzeSectorDistribution()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
