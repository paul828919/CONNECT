/**
 * Data Quality Analysis for 244 Completed NTIS Programs
 *
 * Analyzes:
 * - Field completeness rates
 * - Extraction quality (TRL, categories, metadata)
 * - Announcement type distribution
 * - Data source coverage
 * - Quality issues and patterns
 */

import { PrismaClient, AnnouncementType } from '@prisma/client';

const db = new PrismaClient({
  log: ['error', 'warn'],
});

interface QualityMetrics {
  totalPrograms: number;
  fieldCompleteness: {
    [field: string]: {
      filled: number;
      empty: number;
      rate: string;
    };
  };
  extractionQuality: {
    trlExtracted: number;
    trlMissing: number;
    industryCategory: number;
    techCategory: number;
    fieldCategory: number;
    noCategorization: number;
  };
  announcementTypes: {
    [type: string]: number;
  };
  dataSources: {
    [source: string]: number;
  };
  qualityIssues: {
    missingDeadline: number;
    missingEligibility: number;
    missingDescription: number;
    shortDescription: number; // < 100 chars
    missingMetadata: number;
  };
}

async function analyzeDataQuality() {
  console.log('🔍 Starting Data Quality Analysis for Completed NTIS Programs\n');
  console.log('='.repeat(70));

  // Fetch all completed programs from NTIS
  const programs = await db.funding_programs.findMany({
    where: {
      scrapingSource: 'ntis',
    },
    select: {
      id: true,
      title: true,
      description: true,
      eligibilityCriteria: true,
      budgetAmount: true,
      deadline: true,
      announcementType: true,
      scrapingSource: true,

      // TRL fields
      minTrl: true,
      maxTrl: true,

      // Categorization
      category: true,
      trlClassification: true,
      trlConfidence: true,
      trlInferred: true,

      // Additional metadata
      announcingAgency: true,
      ministry: true,
      keywords: true,
      targetType: true,
      allowedBusinessStructures: true,

      // Timestamps
      createdAt: true,
      updatedAt: true,
      scrapedAt: true,
      publishedAt: true,
    },
    orderBy: { scrapedAt: 'desc' },
  });

  const metrics: QualityMetrics = {
    totalPrograms: programs.length,
    fieldCompleteness: {},
    extractionQuality: {
      trlExtracted: 0,
      trlMissing: 0,
      industryCategory: 0,
      techCategory: 0,
      fieldCategory: 0,
      noCategorization: 0,
    },
    announcementTypes: {},
    dataSources: {},
    qualityIssues: {
      missingDeadline: 0,
      missingEligibility: 0,
      missingDescription: 0,
      shortDescription: 0,
      missingMetadata: 0,
    },
  };

  // Analyze each program
  for (const program of programs) {
    // Announcement type distribution
    const type = program.announcementType || 'UNKNOWN';
    metrics.announcementTypes[type] = (metrics.announcementTypes[type] || 0) + 1;

    // Data source distribution
    const source = program.scrapingSource || 'UNKNOWN';
    metrics.dataSources[source] = (metrics.dataSources[source] || 0) + 1;

    // TRL extraction
    if (program.minTrl !== null || program.maxTrl !== null) {
      metrics.extractionQuality.trlExtracted++;
    } else {
      metrics.extractionQuality.trlMissing++;
    }

    // Category extraction (using actual schema fields)
    let hasCategorization = false;
    if (program.category) {
      metrics.extractionQuality.industryCategory++;
      hasCategorization = true;
    }
    if (program.trlClassification) {
      metrics.extractionQuality.techCategory++;
      hasCategorization = true;
    }
    if (program.keywords && program.keywords.length > 0) {
      metrics.extractionQuality.fieldCategory++;
      hasCategorization = true;
    }
    if (!hasCategorization) {
      metrics.extractionQuality.noCategorization++;
    }

    // Quality issues
    if (!program.deadline) {
      metrics.qualityIssues.missingDeadline++;
    }
    if (!program.eligibilityCriteria) {
      metrics.qualityIssues.missingEligibility++;
    }
    if (!program.description) {
      metrics.qualityIssues.missingDescription++;
    } else if (program.description.length < 100) {
      metrics.qualityIssues.shortDescription++;
    }
    if (!program.trlClassification || Object.keys(program.trlClassification as object).length === 0) {
      metrics.qualityIssues.missingMetadata++;
    }
  }

  // Calculate field completeness
  const fields = [
    'title',
    'description',
    'eligibilityCriteria',
    'budgetAmount',
    'deadline',
    'announcementType',
    'scrapingSource',
    'publishedAt',
  ];

  for (const field of fields) {
    const filled = programs.filter(p => p[field as keyof typeof p] != null).length;
    const empty = programs.length - filled;
    metrics.fieldCompleteness[field] = {
      filled,
      empty,
      rate: `${((filled / programs.length) * 100).toFixed(1)}%`,
    };
  }

  // Print report
  printReport(metrics);

  // Sample quality issues
  await printSampleIssues(programs);

  await db.$disconnect();
}

function printReport(metrics: QualityMetrics) {
  console.log('\n📊 DATA QUALITY REPORT');
  console.log('='.repeat(70));
  console.log(`Total Programs Analyzed: ${metrics.totalPrograms}\n`);

  // Field Completeness
  console.log('📋 FIELD COMPLETENESS');
  console.log('-'.repeat(70));
  Object.entries(metrics.fieldCompleteness).forEach(([field, data]) => {
    const indicator = data.filled === metrics.totalPrograms ? '✅' :
                     data.filled / metrics.totalPrograms > 0.9 ? '⚠️ ' : '❌';
    console.log(`${indicator} ${field.padEnd(25)} ${data.rate.padStart(6)} (${data.filled}/${metrics.totalPrograms})`);
  });

  // Extraction Quality
  console.log('\n🔬 EXTRACTION QUALITY');
  console.log('-'.repeat(70));
  const trlRate = ((metrics.extractionQuality.trlExtracted / metrics.totalPrograms) * 100).toFixed(1);
  console.log(`TRL Extraction Rate:        ${trlRate}% (${metrics.extractionQuality.trlExtracted}/${metrics.totalPrograms})`);
  console.log(`  - With TRL:               ${metrics.extractionQuality.trlExtracted}`);
  console.log(`  - Missing TRL:            ${metrics.extractionQuality.trlMissing}`);
  console.log();
  console.log('Category Extraction:');
  console.log(`  - Industry Category:      ${metrics.extractionQuality.industryCategory} programs`);
  console.log(`  - Technology Category:    ${metrics.extractionQuality.techCategory} programs`);
  console.log(`  - Research Field:         ${metrics.extractionQuality.fieldCategory} programs`);
  console.log(`  - No Categorization:      ${metrics.extractionQuality.noCategorization} programs`);

  // Announcement Types
  console.log('\n📢 ANNOUNCEMENT TYPE DISTRIBUTION');
  console.log('-'.repeat(70));
  Object.entries(metrics.announcementTypes)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      const percentage = ((count / metrics.totalPrograms) * 100).toFixed(1);
      console.log(`${type.padEnd(20)} ${count.toString().padStart(4)} (${percentage}%)`);
    });

  // Data Sources
  console.log('\n🗄️  DATA SOURCE DISTRIBUTION');
  console.log('-'.repeat(70));
  Object.entries(metrics.dataSources)
    .sort((a, b) => b[1] - a[1])
    .forEach(([source, count]) => {
      const percentage = ((count / metrics.totalPrograms) * 100).toFixed(1);
      console.log(`${source.padEnd(30)} ${count.toString().padStart(4)} (${percentage}%)`);
    });

  // Quality Issues
  console.log('\n⚠️  QUALITY ISSUES');
  console.log('-'.repeat(70));
  const issues = metrics.qualityIssues;
  console.log(`Missing Deadline:           ${issues.missingDeadline} (${((issues.missingDeadline / metrics.totalPrograms) * 100).toFixed(1)}%)`);
  console.log(`Missing Eligibility:        ${issues.missingEligibility} (${((issues.missingEligibility / metrics.totalPrograms) * 100).toFixed(1)}%)`);
  console.log(`Missing Description:        ${issues.missingDescription} (${((issues.missingDescription / metrics.totalPrograms) * 100).toFixed(1)}%)`);
  console.log(`Short Description (<100):   ${issues.shortDescription} (${((issues.shortDescription / metrics.totalPrograms) * 100).toFixed(1)}%)`);
  console.log(`Missing Metadata:           ${issues.missingMetadata} (${((issues.missingMetadata / metrics.totalPrograms) * 100).toFixed(1)}%)`);

  // Overall Quality Score
  console.log('\n⭐ OVERALL QUALITY SCORE');
  console.log('-'.repeat(70));
  const score = calculateQualityScore(metrics);
  console.log(`Quality Score: ${score}/100`);
  console.log(getQualityGrade(score));
}

async function printSampleIssues(programs: any[]) {
  console.log('\n🔍 SAMPLE QUALITY ISSUES');
  console.log('='.repeat(70));

  // Missing TRL examples
  const missingTRL = programs.filter(p => p.minTrl === null && p.maxTrl === null).slice(0, 3);
  if (missingTRL.length > 0) {
    console.log('\n❌ Missing TRL Examples:');
    missingTRL.forEach((p, idx) => {
      console.log(`\n${idx + 1}. ${p.title}`);
      console.log(`   Type: ${p.announcementType}`);
      console.log(`   Source: ${p.scrapingSource}`);
      console.log(`   Description length: ${p.description?.length || 0} chars`);
      console.log(`   TRL Inferred: ${p.trlInferred ? 'Yes' : 'No'}`);
    });
  }

  // Missing categorization examples
  const noCats = programs.filter(p =>
    !p.category && !p.trlClassification && (!p.keywords || p.keywords.length === 0)
  ).slice(0, 3);
  if (noCats.length > 0) {
    console.log('\n❌ Missing Categorization Examples:');
    noCats.forEach((p, idx) => {
      console.log(`\n${idx + 1}. ${p.title}`);
      console.log(`   Type: ${p.announcementType}`);
      console.log(`   Source: ${p.scrapingSource}`);
      console.log(`   Ministry: ${p.ministry || 'N/A'}`);
      console.log(`   Agency: ${p.announcingAgency || 'N/A'}`);
    });
  }

  // Missing deadline examples
  const noDeadline = programs.filter(p => !p.deadline).slice(0, 3);
  if (noDeadline.length > 0) {
    console.log('\n❌ Missing Deadline Examples:');
    noDeadline.forEach((p, idx) => {
      console.log(`\n${idx + 1}. ${p.title}`);
      console.log(`   Type: ${p.announcementType}`);
      console.log(`   Source: ${p.scrapingSource}`);
      console.log(`   Published: ${p.publishedAt ? new Date(p.publishedAt).toLocaleDateString() : 'N/A'}`);
    });
  }

  // Short description examples
  const shortDesc = programs
    .filter(p => p.description && p.description.length < 100)
    .slice(0, 3);
  if (shortDesc.length > 0) {
    console.log('\n⚠️  Short Description Examples:');
    shortDesc.forEach((p, idx) => {
      console.log(`\n${idx + 1}. ${p.title}`);
      console.log(`   Description: "${p.description}"`);
      console.log(`   Length: ${p.description.length} chars`);
    });
  }
}

function calculateQualityScore(metrics: QualityMetrics): number {
  let score = 0;
  const total = metrics.totalPrograms;

  // Field completeness (40 points)
  const completenessScore = Object.values(metrics.fieldCompleteness)
    .reduce((sum, field) => sum + (field.filled / total), 0) /
    Object.keys(metrics.fieldCompleteness).length;
  score += completenessScore * 40;

  // TRL extraction (20 points)
  score += (metrics.extractionQuality.trlExtracted / total) * 20;

  // Categorization (20 points)
  const withCategories = total - metrics.extractionQuality.noCategorization;
  score += (withCategories / total) * 20;

  // Quality issues penalty (20 points - deduct for issues)
  const issueRate = (
    metrics.qualityIssues.missingDeadline +
    metrics.qualityIssues.missingEligibility +
    metrics.qualityIssues.missingDescription +
    metrics.qualityIssues.shortDescription
  ) / (total * 4); // 4 issue types
  score += (1 - issueRate) * 20;

  return Math.round(score);
}

function getQualityGrade(score: number): string {
  if (score >= 90) return '🏆 Excellent - Production ready';
  if (score >= 80) return '✅ Good - Minor improvements needed';
  if (score >= 70) return '⚠️  Fair - Significant improvements recommended';
  if (score >= 60) return '❌ Poor - Major quality issues';
  return '🚨 Critical - Requires immediate attention';
}

// Execute analysis
analyzeDataQuality()
  .catch(error => {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  });
