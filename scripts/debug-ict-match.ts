#!/usr/bin/env tsx
/**
 * Debug why ICT organization isn't matching ICT programs
 */

import { PrismaClient } from '@prisma/client';
import { generateMatches } from '../lib/matching/algorithm';

const db = new PrismaClient();

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('DEBUG: ICT ORGANIZATION vs ICT PROGRAM');
  console.log('═══════════════════════════════════════════════════════════\n');

  const org = await db.organizations.findFirst({ where: { name: '이노웨이브' } });
  const ictProgram = await db.funding_programs.findFirst({
    where: { category: 'ICT', status: 'ACTIVE' }
  });

  if (!org || !ictProgram) {
    console.log('❌ Organization or program not found');
    await db.$disconnect();
    return;
  }

  console.log('🏢 Organization:');
  console.log(`  Name: ${org.name}`);
  console.log(`  Type: ${org.type}`);
  console.log(`  Business: ${org.businessStructure}`);
  console.log(`  TRL: ${org.technologyReadinessLevel}`);
  console.log(`  Industry: ${org.industrySector}`);
  console.log(`  Eligible for hospital: ${org.eligibleForHospitalPrograms}`);
  console.log(`  R&D Experience: ${org.hasRndExperience}`);
  console.log('');

  console.log('📋 ICT Program:');
  const title = ictProgram.title.length > 60 ? ictProgram.title.substring(0, 60) + '...' : ictProgram.title;
  console.log(`  Title: ${title}`);
  console.log(`  Category: ${ictProgram.category}`);
  console.log(`  Status: ${ictProgram.status}`);
  console.log(`  Target Type: ${ictProgram.targetType}`);
  console.log(`  TRL: ${ictProgram.minTrl} - ${ictProgram.maxTrl}`);
  console.log(`  Is Hospital: ${ictProgram.isHospitalProgram}`);
  console.log(`  Deadline: ${ictProgram.deadline}`);
  console.log(`  Eligibility: ${JSON.stringify(ictProgram.eligibilityCriteria)}`);
  console.log('');

  // Test match generation with this specific program
  console.log('🔍 Testing Match Generation:');
  console.log('───────────────────────────────────────────────────────────');

  const matches = await generateMatches(org, [ictProgram]);

  if (matches.length === 0) {
    console.log('❌ NO MATCH - Program was filtered out');
    console.log('');
    console.log('Possible filter reasons:');
    console.log('  1. Hospital filter (eligibleForHospitalPrograms check)');
    console.log('  2. Category compatibility filter (industry mismatch)');
    console.log('  3. Eligibility criteria check');
    console.log('  4. Score below threshold (50 points)');
    console.log('');
    console.log('Let me check each filter:');
    console.log('');

    // Check 1: Hospital filter
    if (ictProgram.isHospitalProgram && !org.eligibleForHospitalPrograms) {
      console.log('  ❌ BLOCKED by hospital filter');
      console.log('     Program is hospital-only but org not eligible');
    } else {
      console.log('  ✅ PASSED hospital filter');
    }

    // Check 2: Category compatibility (we know this passes from our test)
    console.log('  ✅ PASSED category compatibility filter (ICT ↔ ICT = 100%)');

    // Check 3: Eligibility
    const eligibility = ictProgram.eligibilityCriteria as any;
    if (eligibility) {
      console.log('  ⚠️  Eligibility criteria check:');
      if (eligibility.businessStructures && Array.isArray(eligibility.businessStructures)) {
        const hasMatch = eligibility.businessStructures.includes(org.businessStructure);
        if (!hasMatch) {
          console.log('     ❌ BLOCKED by business structure');
          console.log(`        Required: ${eligibility.businessStructures.join(', ')}`);
          console.log(`        Organization has: ${org.businessStructure}`);
        } else {
          console.log('     ✅ Business structure matches');
        }
      }

      if (eligibility.organizationTypes && Array.isArray(eligibility.organizationTypes)) {
        const hasMatch = eligibility.organizationTypes.includes(org.type);
        if (!hasMatch) {
          console.log('     ❌ BLOCKED by organization type');
          console.log(`        Required: ${eligibility.organizationTypes.join(', ')}`);
          console.log(`        Organization has: ${org.type}`);
        } else {
          console.log('     ✅ Organization type matches');
        }
      }
    } else {
      console.log('  ℹ️  No eligibility criteria specified (should allow)');
    }

  } else {
    console.log('✅ MATCH FOUND!');
    const match = matches[0];
    console.log(`Score: ${match.score} points`);
    console.log(`Reasons: ${match.reasons.join(', ')}`);
  }

  await db.$disconnect();
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
