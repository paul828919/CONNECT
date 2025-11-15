#!/usr/bin/env tsx
/**
 * Test the category compatibility filter
 * Verify that ICT company does NOT match DEFENSE program after fix
 */

import { PrismaClient } from '@prisma/client';
import { generateMatches } from '../lib/matching/algorithm';

const db = new PrismaClient();

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('TESTING CATEGORY COMPATIBILITY FILTER');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Get ICT organization
  const org = await db.organizations.findFirst({
    where: { name: '이노웨이브' }
  });

  if (!org) {
    console.log('❌ Organization not found');
    process.exit(1);
  }

  console.log('📋 Organization: ' + org.name);
  console.log('Industry: ' + org.industrySector);
  console.log('');

  // Get DEFENSE program
  const defenseProgram = await db.funding_programs.findFirst({
    where: { title: { contains: '글로벌 방위산업' } }
  });

  if (!defenseProgram) {
    console.log('❌ DEFENSE program not found');
    process.exit(1);
  }

  console.log('📋 Program: ' + defenseProgram.title.substring(0, 60) + '...');
  console.log('Category: ' + defenseProgram.category);
  console.log('');

  // Get all active programs
  const programs = await db.funding_programs.findMany({
    where: { status: 'ACTIVE' }
  });

  console.log('📊 Total active programs: ' + programs.length);
  console.log('Generating matches...\n');

  // Generate matches with new filter
  const matches = await generateMatches(org, programs);

  console.log('✓ Total matches generated: ' + matches.length);
  console.log('');

  // Check if DEFENSE program is in matches
  const defenseMatch = matches.find(m => m.programId === defenseProgram.id);

  console.log('🎯 CRITICAL TEST: ICT ↔ DEFENSE Match');
  console.log('───────────────────────────────────────────────────────────');
  if (defenseMatch) {
    console.log('❌ FAIL: DEFENSE program still matched!');
    console.log('Match score: ' + defenseMatch.score);
    console.log('');
    console.log('This indicates the category filter is NOT working correctly.');
    process.exit(1);
  } else {
    console.log('✅ SUCCESS: DEFENSE program correctly filtered out!');
    console.log('');
    console.log('The category compatibility filter is working correctly.');
    console.log('ICT (0.2 relevance) → DEFENSE is blocked (threshold: 0.3)');
  }
  console.log('');

  // Show sample of matched programs
  console.log('📋 Sample Matched Programs (first 5):');
  console.log('───────────────────────────────────────────────────────────');
  matches.slice(0, 5).forEach((match, idx) => {
    const program = programs.find(p => p.id === match.programId);
    console.log(`  ${idx + 1}. [${match.score}pts] ${program?.category || 'N/A'} - ${program?.title.substring(0, 50)}...`);
  });

  await db.$disconnect();
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
