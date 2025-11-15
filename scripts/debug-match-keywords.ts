#!/usr/bin/env tsx
/**
 * Debug keyword matching for the defense program
 * This script will show exactly WHY an ICT company matches with a DEFENSE program
 */

import { PrismaClient } from '@prisma/client';
import { scoreIndustryKeywordsEnhanced } from '../lib/matching/keywords';
import { normalizeKoreanKeyword, findIndustrySector, getAllKeywordsForSector } from '../lib/matching/taxonomy';

const db = new PrismaClient();

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('KEYWORD MATCHING DEBUG - ICT vs DEFENSE');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Get the defense program
  const defenseProgram = await db.funding_programs.findFirst({
    where: { title: { contains: '글로벌 방위산업' } }
  });

  if (!defenseProgram) {
    console.log('❌ Defense program not found');
    return;
  }

  // Get the ICT organization
  const org = await db.organizations.findFirst({
    where: { name: '이노웨이브' }
  });

  if (!org) {
    console.log('❌ Organization not found');
    return;
  }

  console.log('📋 ORGANIZATION: ' + org.name);
  console.log('Industry: ' + org.industrySector);
  console.log('');

  console.log('📋 PROGRAM: ' + defenseProgram.title.substring(0, 60) + '...');
  console.log('Category: ' + defenseProgram.category);
  console.log('');

  // Extract organization keywords manually
  console.log('🔍 STEP 1: Organization Keywords Extraction');
  console.log('───────────────────────────────────────────────────────────');

  const orgKeywords = new Set<string>();

  // Industry sector
  if (org.industrySector) {
    const normalized = normalizeKoreanKeyword(org.industrySector);
    orgKeywords.add(normalized);
    console.log(`✓ Industry Sector: "${org.industrySector}" → normalized: "${normalized}"`);

    // Check if sector exists in taxonomy
    const sector = findIndustrySector(org.industrySector);
    if (sector) {
      console.log(`✓ Found in taxonomy: ${sector}`);
      const sectorKeywords = getAllKeywordsForSector(sector);
      console.log(`✓ Taxonomy keywords (${sectorKeywords.length}):`, sectorKeywords);
      sectorKeywords.forEach(k => orgKeywords.add(normalizeKoreanKeyword(k)));
    } else {
      console.log(`⚠️  NOT found in taxonomy`);
    }
  }

  // Research focus areas
  if (org.researchFocusAreas && org.researchFocusAreas.length > 0) {
    console.log(`✓ Research Focus Areas (${org.researchFocusAreas.length}):`, org.researchFocusAreas);
    org.researchFocusAreas.forEach(area => {
      orgKeywords.add(normalizeKoreanKeyword(area));
    });
  }

  // Key technologies
  if (org.keyTechnologies && org.keyTechnologies.length > 0) {
    console.log(`✓ Key Technologies (${org.keyTechnologies.length}):`, org.keyTechnologies);
    org.keyTechnologies.forEach(tech => {
      orgKeywords.add(normalizeKoreanKeyword(tech));
    });
  }

  console.log('');
  console.log(`Total Organization Keywords: ${orgKeywords.size}`);
  console.log('All keywords:', Array.from(orgKeywords).sort());
  console.log('');

  // Extract program keywords manually
  console.log('🔍 STEP 2: Program Keywords Extraction');
  console.log('───────────────────────────────────────────────────────────');

  const programKeywords = new Set<string>();

  // Title keywords
  if (defenseProgram.title) {
    const titleWords = defenseProgram.title.split(/\s+/);
    console.log(`✓ Title: "${defenseProgram.title}"`);
    console.log(`✓ Split into ${titleWords.length} words`);
    titleWords.forEach((word, idx) => {
      if (word.length >= 2) {
        const normalized = normalizeKoreanKeyword(word);
        programKeywords.add(normalized);
        if (idx < 10) {
          console.log(`  [${idx + 1}] "${word}" → "${normalized}"`);
        }
      }
    });
    if (titleWords.length > 10) {
      console.log(`  ... and ${titleWords.length - 10} more words`);
    }
  }

  // Category
  if (defenseProgram.category) {
    const normalized = normalizeKoreanKeyword(defenseProgram.category);
    programKeywords.add(normalized);
    console.log(`✓ Category: "${defenseProgram.category}" → normalized: "${normalized}"`);

    // Check if category exists in taxonomy
    const sector = findIndustrySector(defenseProgram.category);
    console.log(`  Taxonomy lookup: ${sector || '⚠️  NOT FOUND (This is the problem!)'}`);
  }

  // Explicit keywords
  if (defenseProgram.keywords && defenseProgram.keywords.length > 0) {
    console.log(`✓ Explicit Keywords (${defenseProgram.keywords.length}):`, defenseProgram.keywords);
    defenseProgram.keywords.forEach(k => programKeywords.add(normalizeKoreanKeyword(k)));
  } else {
    console.log('⚠️  No explicit keywords in database');
  }

  // Description keywords (first 200 chars)
  if (defenseProgram.description) {
    const desc = defenseProgram.description.substring(0, 200);
    const descWords = desc.split(/\s+/);
    console.log(`✓ Description (first 200 chars): ${descWords.length} words`);
    descWords.forEach(word => {
      if (word.length >= 3) {
        programKeywords.add(normalizeKoreanKeyword(word));
      }
    });
  } else {
    console.log('⚠️  No description in database');
  }

  console.log('');
  console.log(`Total Program Keywords: ${programKeywords.size}`);
  console.log('Sample (first 20):', Array.from(programKeywords).sort().slice(0, 20));
  console.log('');

  // Find matching keywords
  console.log('🎯 STEP 3: Keyword Matching Analysis');
  console.log('───────────────────────────────────────────────────────────');

  const exactMatches: Array<{ org: string; prog: string; type: string }> = [];
  const substringMatches: Array<{ org: string; prog: string; type: string }> = [];

  for (const orgKw of Array.from(orgKeywords)) {
    for (const progKw of Array.from(programKeywords)) {
      // Exact match
      if (orgKw === progKw) {
        exactMatches.push({ org: orgKw, prog: progKw, type: 'exact' });
      }
      // Substring match
      else if (orgKw.length >= 3 && progKw.length >= 3) {
        if (orgKw.includes(progKw)) {
          substringMatches.push({ org: orgKw, prog: progKw, type: 'org contains prog' });
        } else if (progKw.includes(orgKw)) {
          substringMatches.push({ org: orgKw, prog: progKw, type: 'prog contains org' });
        }
      }
    }
  }

  console.log(`✓ Exact Matches: ${exactMatches.length}`);
  if (exactMatches.length > 0) {
    console.log('');
    exactMatches.forEach((match, idx) => {
      console.log(`  ${idx + 1}. Org="${match.org}" ↔ Program="${match.prog}"`);
    });
  }
  console.log('');

  console.log(`✓ Substring Matches: ${substringMatches.length}`);
  if (substringMatches.length > 0) {
    console.log('');
    substringMatches.slice(0, 20).forEach((match, idx) => {
      console.log(`  ${idx + 1}. Org="${match.org}" ↔ Program="${match.prog}" (${match.type})`);
    });
    if (substringMatches.length > 20) {
      console.log(`  ... and ${substringMatches.length - 20} more`);
    }
  }
  console.log('');

  // Run the actual scoring function
  console.log('📊 STEP 4: Actual Scoring Function Result');
  console.log('───────────────────────────────────────────────────────────');

  const scoringResult = scoreIndustryKeywordsEnhanced(org, defenseProgram);

  console.log(`Score: ${scoringResult.score} / 30 points`);
  console.log('Reasons:', scoringResult.reasons);
  console.log('Details:', scoringResult.details);
  console.log('');

  // Root cause analysis
  console.log('🚨 STEP 5: Root Cause Analysis');
  console.log('───────────────────────────────────────────────────────────');
  console.log('');

  if (exactMatches.length > 0 || substringMatches.length > 0) {
    console.log('❌ CRITICAL BUG IDENTIFIED:');
    console.log('');
    console.log('The matching algorithm is finding keyword overlaps between:');
    console.log(`  - Organization Industry: ${org.industrySector}`);
    console.log(`  - Program Category: ${defenseProgram.category}`);
    console.log('');
    console.log('These two categories are FUNDAMENTALLY INCOMPATIBLE.');
    console.log('');
    console.log('ROOT CAUSES:');
    console.log('');
    console.log('1. Missing DEFENSE taxonomy:');
    console.log('   - The INDUSTRY_TAXONOMY does not include DEFENSE sector');
    console.log('   - Program category "DEFENSE" returns NULL from findIndustrySector()');
    console.log('   - No sector-level filtering can occur');
    console.log('');
    console.log('2. Overly permissive keyword matching:');
    console.log('   - Program title split into individual words (including generic terms)');
    console.log('   - Generic terms like "기업", "지원", "육성사업" match with taxonomy keywords');
    console.log('   - No category compatibility pre-check before keyword matching');
    console.log('');
    console.log('RECOMMENDED FIXES:');
    console.log('');
    console.log('FIX 1: Add DEFENSE sector to taxonomy (lib/matching/taxonomy.ts)');
    console.log('FIX 2: Add category compatibility pre-check (HARD FILTER before scoring)');
    console.log('FIX 3: Require program.category to exist in taxonomy before matching');
  } else {
    console.log('✅ No obvious keyword matches found.');
    console.log('The match might be due to other scoring factors:');
    console.log('  - Organization type match');
    console.log('  - TRL compatibility');
    console.log('  - R&D experience');
  }

  await db.$disconnect();
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
