#!/usr/bin/env tsx
/**
 * Phase 6 Results Analysis
 *
 * Analyzes the budget/TRL extraction results from the NTIS scrape
 * after Phase 6 parser enhancements.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyze() {
  try {
    const programs = await prisma.funding_programs.findMany({
      where: { scrapingSource: 'ntis' },
      orderBy: { createdAt: 'desc' },
    });

    console.log('📊 NTIS Scrape Analysis Report');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log(`Total programs saved: ${programs.length}\n`);

    if (programs.length === 0) {
      console.log('⚠️  No programs found in database.\n');
      return;
    }

    const budgetCount = programs.filter(p => p.budgetAmount !== null).length;
    const trlCount = programs.filter(p => p.trlClassification !== null).length;
    const attachmentCount = programs.filter(p => p.attachmentUrls && p.attachmentUrls.length > 0).length;

    console.log('📈 Phase 6 Enhancement Field Results:');
    console.log('─────────────────────────────────────────────────────────');
    console.log(`Budget populated: ${budgetCount}/${programs.length} (${((budgetCount/programs.length)*100).toFixed(1)}%)`);
    console.log(`TRL populated: ${trlCount}/${programs.length} (${((trlCount/programs.length)*100).toFixed(1)}%)`);
    console.log(`Attachments extracted: ${attachmentCount}/${programs.length} (${((attachmentCount/programs.length)*100).toFixed(1)}%)`);
    console.log('─────────────────────────────────────────────────────────\n');

    console.log('🎯 Baseline Comparison:');
    console.log('─────────────────────────────────────────────────────────');
    const budgetNullRate = ((programs.length - budgetCount) / programs.length) * 100;
    const trlCoverage = (trlCount / programs.length) * 100;
    console.log(`Budget NULL rate: ${budgetNullRate.toFixed(1)}% (Baseline: 93.8%, Target: <20%)`);
    console.log(`TRL coverage: ${trlCoverage.toFixed(1)}% (Baseline: 33%, Target: ≥70%)`);
    console.log('─────────────────────────────────────────────────────────\n');

    console.log('📋 Individual Program Details:');
    console.log('═══════════════════════════════════════════════════════════\n');

    programs.forEach((p, i) => {
      console.log(`${i + 1}. ${p.title.substring(0, 60)}...`);
      console.log(`   Budget: ${p.budgetAmount ? '₩' + p.budgetAmount.toLocaleString() : 'NULL ❌'}`);
      console.log(`   TRL: ${p.trlClassification ? JSON.stringify(p.trlClassification) : 'NULL ❌'}`);
      console.log(`   Attachments: ${p.attachmentUrls?.length || 0} files`);
      console.log(`   Deadline: ${p.deadline ? p.deadline.toISOString().split('T')[0] : 'NULL'}\n`);
    });

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

analyze();
