#!/usr/bin/env tsx
/**
 * Check program categories and organization compatibility
 */

import { PrismaClient } from '@prisma/client';
import { findIndustrySector, INDUSTRY_RELEVANCE } from '../lib/matching/taxonomy';

const db = new PrismaClient();

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('PROGRAM CATEGORIES & ORGANIZATION COMPATIBILITY ANALYSIS');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Get program category distribution
  const programs = await db.funding_programs.findMany({
    where: { status: 'ACTIVE' },
    select: { category: true, title: true, id: true }
  });

  const categories = programs.reduce((acc, p) => {
    const cat = p.category || 'NULL';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {} as Record<string, typeof programs>);

  console.log('📊 Program Categories in Database:');
  console.log(`Total ACTIVE programs: ${programs.length}`);
  console.log('');

  Object.entries(categories).sort((a, b) => b[1].length - a[1].length).forEach(([cat, progs]) => {
    const sector = findIndustrySector(cat);
    console.log(`  ${cat}: ${progs.length} programs (Taxonomy: ${sector || '⚠️  NOT FOUND'})`);

    // Show first 2 programs
    progs.slice(0, 2).forEach(p => {
      console.log(`    - ${p.title.substring(0, 60)}...`);
    });
    if (progs.length > 2) {
      console.log(`    ... and ${progs.length - 2} more`);
    }
  });
  console.log('');

  // Get the ICT organization
  const org = await db.organizations.findFirst({
    where: { name: '이노웨이브' }
  });

  if (!org) {
    console.log('❌ Organization not found');
    await db.$disconnect();
    return;
  }

  console.log('🏢 Organization Details:');
  console.log(`Name: ${org.name}`);
  console.log(`Industry: ${org.industrySector}`);
  console.log(`Type: ${org.type}`);
  console.log(`TRL: ${org.technologyReadinessLevel}`);
  console.log(`Business Structure: ${org.businessStructure}`);
  console.log('');

  const orgSector = findIndustrySector(org.industrySector || '');
  console.log(`Organization Sector: ${orgSector || '⚠️  NOT FOUND'}`);
  console.log('');

  // Check compatibility with each category
  console.log('🎯 Compatibility Analysis:');
  console.log('───────────────────────────────────────────────────────────');

  const compatibilityResults: Array<{
    category: string;
    count: number;
    relevance: number | null;
    compatible: boolean;
  }> = [];

  for (const [category, progs] of Object.entries(categories)) {
    const programSector = findIndustrySector(category);

    let relevance: number | null = null;
    let compatible = false;

    if (orgSector && programSector) {
      relevance = INDUSTRY_RELEVANCE[orgSector]?.[programSector] ?? 0;
      compatible = relevance >= 0.3;
    } else {
      // If either sector not in taxonomy, allow match (graceful degradation)
      compatible = true;
    }

    compatibilityResults.push({
      category,
      count: progs.length,
      relevance,
      compatible
    });
  }

  // Sort by compatible first, then by count
  compatibilityResults.sort((a, b) => {
    if (a.compatible !== b.compatible) return b.compatible ? 1 : -1;
    return b.count - a.count;
  });

  compatibilityResults.forEach(result => {
    const icon = result.compatible ? '✅' : '❌';
    const relevanceStr = result.relevance !== null ? `${(result.relevance * 100).toFixed(0)}%` : 'N/A';
    console.log(`${icon} ${result.category} (${result.count} programs) - Relevance: ${relevanceStr}`);
  });

  console.log('');
  const compatibleCount = compatibilityResults.filter(r => r.compatible).reduce((sum, r) => sum + r.count, 0);
  const incompatibleCount = compatibilityResults.filter(r => !r.compatible).reduce((sum, r) => sum + r.count, 0);

  console.log(`✅ Compatible programs: ${compatibleCount}`);
  console.log(`❌ Incompatible programs: ${incompatibleCount}`);
  console.log('');

  if (compatibleCount === 0) {
    console.log('🚨 WARNING: Organization has 0 compatible programs!');
    console.log('This explains why no matches were generated.');
    console.log('');
    console.log('Possible causes:');
    console.log('1. Organization industry not in taxonomy');
    console.log('2. No programs match the organization\'s industry');
    console.log('3. All program categories have relevance < 0.3');
  }

  await db.$disconnect();
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
