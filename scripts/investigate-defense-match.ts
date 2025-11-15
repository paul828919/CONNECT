#!/usr/bin/env tsx
/**
 * Investigate the defense industry program match issue
 * User reported:
 * 1. Past deadline showing as future
 * 2. Defense program matching ICT company (industry mismatch)
 */

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('INVESTIGATING DEFENSE PROGRAM MATCH ISSUE');
  console.log('═══════════════════════════════════════════════════════════\n');

  // 1. Get the defense program details
  console.log('📋 STEP 1: Defense Program Details');
  console.log('───────────────────────────────────────────────────────────');

  const defenseProgram = await db.funding_programs.findFirst({
    where: {
      title: {
        contains: '글로벌 방위산업'
      }
    }
  });

  if (!defenseProgram) {
    console.log('❌ Defense program not found in database');
    return;
  }

  console.log(`Title: ${defenseProgram.title}`);
  console.log(`ID: ${defenseProgram.id}`);
  console.log(`Status: ${defenseProgram.status}`);
  console.log(`Category: ${defenseProgram.category}`);
  console.log(`Deadline: ${defenseProgram.deadline}`);
  console.log(`Application Start: ${defenseProgram.applicationStart}`);
  console.log(`Published At: ${defenseProgram.publishedAt}`);
  console.log(`Created At: ${defenseProgram.createdAt}`);
  console.log(`Target Type: ${defenseProgram.targetType}`);
  console.log(`TRL Range: ${defenseProgram.minTrl} - ${defenseProgram.maxTrl}`);
  console.log(`Announcement URL: ${defenseProgram.announcementUrl}`);
  console.log('');

  // Check if deadline is in the past
  if (defenseProgram.deadline) {
    const now = new Date();
    const isPast = defenseProgram.deadline < now;
    console.log(`⏰ Deadline Status: ${isPast ? '❌ PAST' : '✅ FUTURE'}`);
    console.log(`   Current Time: ${now.toISOString()}`);
    console.log(`   Deadline: ${defenseProgram.deadline.toISOString()}`);

    if (isPast) {
      const daysAgo = Math.floor((now.getTime() - defenseProgram.deadline.getTime()) / (1000 * 60 * 60 * 24));
      console.log(`   ⚠️  Deadline was ${daysAgo} days ago!`);
    }
  } else {
    console.log(`⏰ Deadline Status: ⚠️  NULL (No deadline set)`);
  }
  console.log('');

  // 2. Get the organization details
  console.log('🏢 STEP 2: Organization Details (이노웨이브)');
  console.log('───────────────────────────────────────────────────────────');

  const org = await db.organizations.findFirst({
    where: { name: '이노웨이브' }
  });

  if (!org) {
    console.log('❌ Organization not found');
    return;
  }

  console.log(`Name: ${org.name}`);
  console.log(`Type: ${org.type}`);
  console.log(`Business Structure: ${org.businessStructure}`);
  console.log(`Industry: ${org.industrySector}`);
  console.log(`TRL: ${org.technologyReadinessLevel}`);
  console.log('');

  // 3. Get the match details
  console.log('🔗 STEP 3: Match Details');
  console.log('───────────────────────────────────────────────────────────');

  const match = await db.funding_matches.findFirst({
    where: {
      organizationId: org.id,
      programId: defenseProgram.id
    }
  });

  if (!match) {
    console.log('❌ No match found between organization and program');
  } else {
    console.log(`Match ID: ${match.id}`);
    console.log(`Score: ${match.score}`);
    console.log(`Created At: ${match.createdAt}`);
    console.log(`Explanation: ${JSON.stringify(match.explanation, null, 2)}`);
  }
  console.log('');

  // 4. Industry mismatch analysis
  console.log('🚨 STEP 4: Issue Analysis');
  console.log('───────────────────────────────────────────────────────────');

  const issues: string[] = [];

  // Check deadline issue
  if (defenseProgram.deadline) {
    const isPast = defenseProgram.deadline < new Date();
    if (isPast && defenseProgram.status === 'ACTIVE') {
      issues.push('❌ CRITICAL: Program has PAST deadline but status is ACTIVE (should be EXPIRED)');
    }
  }

  // Check industry mismatch
  const orgIndustry = org.industrySector?.toLowerCase() || '';
  const programCategory = defenseProgram.category?.toLowerCase() || '';

  const isIndustryMatch = (
    orgIndustry.includes('방위') ||
    orgIndustry.includes('defense') ||
    programCategory.includes('ict') ||
    programCategory.includes('정보통신')
  );

  if (!isIndustryMatch && programCategory.includes('defense')) {
    issues.push(`❌ CRITICAL: Industry mismatch - Organization is ${org.industrySector} but program is ${defenseProgram.category}`);
  }

  // Check TRL mismatch
  if (defenseProgram.minTrl && defenseProgram.maxTrl && org.technologyReadinessLevel) {
    const orgTrl = org.technologyReadinessLevel;
    const isOutsideRange = orgTrl < defenseProgram.minTrl || orgTrl > defenseProgram.maxTrl;

    if (isOutsideRange) {
      issues.push(`⚠️  WARNING: TRL mismatch - Organization TRL ${orgTrl} is outside program range ${defenseProgram.minTrl}-${defenseProgram.maxTrl}`);
    }
  }

  if (issues.length === 0) {
    console.log('✅ No critical issues detected');
  } else {
    console.log('DETECTED ISSUES:\n');
    issues.forEach((issue, idx) => {
      console.log(`${idx + 1}. ${issue}`);
    });
  }
  console.log('');

  // 5. Check how many other ACTIVE programs have past deadlines
  console.log('📊 STEP 5: Audit All ACTIVE Programs with Past Deadlines');
  console.log('───────────────────────────────────────────────────────────');

  const activeWithPastDeadlines = await db.funding_programs.count({
    where: {
      status: 'ACTIVE',
      deadline: {
        lt: new Date()
      }
    }
  });

  const totalActive = await db.funding_programs.count({
    where: { status: 'ACTIVE' }
  });

  console.log(`Total ACTIVE programs: ${totalActive}`);
  console.log(`ACTIVE programs with PAST deadlines: ${activeWithPastDeadlines}`);

  if (activeWithPastDeadlines > 0) {
    const percentage = ((activeWithPastDeadlines / totalActive) * 100).toFixed(1);
    console.log(`❌ ${percentage}% of ACTIVE programs have expired deadlines!`);
    console.log('');
    console.log('Sample programs with past deadlines:');

    const samples = await db.funding_programs.findMany({
      where: {
        status: 'ACTIVE',
        deadline: {
          lt: new Date()
        }
      },
      select: {
        title: true,
        deadline: true,
        category: true,
        status: true
      },
      take: 5,
      orderBy: {
        deadline: 'desc'
      }
    });

    samples.forEach((program, idx) => {
      const daysAgo = Math.floor((new Date().getTime() - program.deadline!.getTime()) / (1000 * 60 * 60 * 24));
      console.log(`\n${idx + 1}. ${program.title.substring(0, 60)}...`);
      console.log(`   Deadline: ${program.deadline?.toISOString().split('T')[0]} (${daysAgo} days ago)`);
      console.log(`   Category: ${program.category}, Status: ${program.status}`);
    });
  } else {
    console.log('✅ All ACTIVE programs have future or NULL deadlines');
  }
  console.log('');

  // 6. Root cause analysis
  console.log('🔍 STEP 6: Root Cause Analysis');
  console.log('───────────────────────────────────────────────────────────');
  console.log('');
  console.log('Potential root causes:');
  console.log('');
  console.log('1. Program Status Update Mechanism:');
  console.log('   - Is there a cron job or scheduled task that marks programs as EXPIRED?');
  console.log('   - Check: lib/jobs/expire-programs.ts or similar');
  console.log('');
  console.log('2. Matching Algorithm Industry Filtering:');
  console.log('   - Check: lib/matching/algorithm.ts');
  console.log('   - Verify industry compatibility logic');
  console.log('');
  console.log('3. UI Deadline Display:');
  console.log('   - Check: app/dashboard/matches/page.tsx');
  console.log('   - Verify how deadline dates are rendered');
  console.log('');

  await db.$disconnect();
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
