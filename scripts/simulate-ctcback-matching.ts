/**
 * Cross-Industry Matching Quality Assessment: CTC Back (씨티씨백) - BIO_HEALTH
 *
 * This script simulates matching for a BIO_HEALTH company specializing in
 * veterinary pharmaceuticals (동물약품 GMP) to assess algorithm quality
 * compared to ICT sector matches.
 *
 * Key assessment areas:
 * 1. Industry alignment accuracy (BIO_HEALTH taxonomy coverage)
 * 2. TRL compatibility scoring (targetResearchTRL vs technologyReadinessLevel)
 * 3. Score distribution patterns
 * 4. Cross-industry false positive detection
 */

import { PrismaClient, ProgramStatus, AnnouncementType } from '@prisma/client';
import { generateMatches, calculateMatchScore, MatchScore } from '../lib/matching/algorithm';
import { findIndustrySector, INDUSTRY_RELEVANCE } from '../lib/matching/taxonomy';

const db = new PrismaClient({ log: ['error', 'warn'] });

// CTC Back organization ID
const CTC_BACK_ORG_ID = 'fc3e795b-ada8-461d-b704-049f3231a274';

interface ScoreDistribution {
  range: string;
  count: number;
  percentage: number;
}

interface CategoryBreakdown {
  category: string;
  count: number;
  avgScore: number;
  topScore: number;
}

async function simulateCTCBackMatching() {
  console.log('═'.repeat(80));
  console.log('🔬 Cross-Industry Matching Quality Assessment: CTC Back (씨티씨백)');
  console.log('═'.repeat(80));
  console.log(`\n📅 Assessment Date: ${new Date().toISOString()}\n`);

  try {
    // Fetch organization
    const organization = await db.organizations.findUnique({
      where: { id: CTC_BACK_ORG_ID },
    });

    if (!organization) {
      console.log('❌ Organization not found!');
      return;
    }

    // =========================================================================
    // SECTION 1: Organization Profile Analysis
    // =========================================================================
    console.log('─'.repeat(80));
    console.log('📋 SECTION 1: Organization Profile Analysis');
    console.log('─'.repeat(80));

    console.log(`\n   Company: ${organization.name}`);
    console.log(`   Type: ${organization.type}`);
    console.log(`   Industry Sector: ${organization.industrySector}`);
    console.log(`   Employee Count: ${organization.employeeCount}`);
    console.log(`   Current TRL: ${organization.technologyReadinessLevel}`);
    console.log(`   Target Research TRL: ${organization.targetResearchTRL}`);
    console.log(`   R&D Experience: ${organization.rdExperience ? 'Yes' : 'No'}`);
    console.log(`   Collaboration Count: ${organization.collaborationCount || 0}`);
    console.log(`   Key Technologies: ${organization.keyTechnologies?.join(', ') || 'Not specified'}`);
    console.log(`   Business Structure: ${organization.businessStructure || 'Not specified'}`);
    console.log(`   Profile Score: ${organization.profileScore}/150`);

    // Taxonomy mapping analysis
    const detectedSector = findIndustrySector(organization.industrySector || '');
    console.log(`\n   🔍 Taxonomy Mapping:`);
    console.log(`      Detected Sector: ${detectedSector || 'NOT FOUND'}`);
    if (organization.keyTechnologies) {
      for (const tech of organization.keyTechnologies) {
        const techSector = findIndustrySector(tech);
        console.log(`      "${tech}" → ${techSector || 'NOT MAPPED'}`);
      }
    }

    // =========================================================================
    // SECTION 2: Active Program Matching Simulation
    // =========================================================================
    console.log('\n' + '─'.repeat(80));
    console.log('📊 SECTION 2: Active Program Matching Simulation');
    console.log('─'.repeat(80));

    const activePrograms = await db.funding_programs.findMany({
      where: {
        status: ProgramStatus.ACTIVE,
        announcementType: AnnouncementType.R_D_PROJECT,
        scrapingSource: {
          not: null,
          notIn: ['NTIS_API'],
        },
      },
    });

    console.log(`\n   Total Active Programs: ${activePrograms.length}`);

    // Generate matches with extended limit for analysis
    const matches = generateMatches(
      organization,
      activePrograms,
      50, // Get more matches for distribution analysis
      { includeExpired: false, minimumScore: 45 }
    );

    console.log(`   Matches Generated: ${matches.length}`);
    console.log(`   Match Rate: ${((matches.length / Math.max(activePrograms.length, 1)) * 100).toFixed(1)}%`);

    // =========================================================================
    // SECTION 3: Score Distribution Analysis
    // =========================================================================
    console.log('\n' + '─'.repeat(80));
    console.log('📈 SECTION 3: Score Distribution Analysis');
    console.log('─'.repeat(80));

    const scoreDistribution = analyzeScoreDistribution(matches);
    console.log('\n   Score Range   | Count | Percentage | Bar');
    console.log('   ' + '─'.repeat(55));
    for (const dist of scoreDistribution) {
      const bar = '█'.repeat(Math.round(dist.percentage / 2));
      console.log(`   ${dist.range.padEnd(12)} | ${String(dist.count).padStart(5)} | ${dist.percentage.toFixed(1).padStart(9)}% | ${bar}`);
    }

    // Calculate statistics
    if (matches.length > 0) {
      const scores = matches.map(m => m.score);
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      const maxScore = Math.max(...scores);
      const minScore = Math.min(...scores);
      const medianScore = scores.sort((a, b) => a - b)[Math.floor(scores.length / 2)];

      console.log('\n   📊 Statistics:');
      console.log(`      Average Score: ${avgScore.toFixed(1)}`);
      console.log(`      Median Score: ${medianScore}`);
      console.log(`      Max Score: ${maxScore}`);
      console.log(`      Min Score: ${minScore}`);
    }

    // =========================================================================
    // SECTION 4: Category Breakdown Analysis
    // =========================================================================
    console.log('\n' + '─'.repeat(80));
    console.log('🏷️  SECTION 4: Category Breakdown Analysis');
    console.log('─'.repeat(80));

    const categoryBreakdown = analyzeCategoryBreakdown(matches);
    console.log('\n   Category         | Count | Avg Score | Top Score | Industry Relevance');
    console.log('   ' + '─'.repeat(70));

    for (const cat of categoryBreakdown) {
      const relevance = INDUSTRY_RELEVANCE['BIO_HEALTH']?.[cat.category] ?? 0;
      const relevanceIndicator = relevance >= 0.7 ? '✅ High' :
                                 relevance >= 0.4 ? '⚠️ Med' : '❌ Low';
      console.log(`   ${cat.category.padEnd(16)} | ${String(cat.count).padStart(5)} | ${cat.avgScore.toFixed(1).padStart(9)} | ${String(cat.topScore).padStart(9)} | ${relevanceIndicator} (${relevance.toFixed(1)})`);
    }

    // =========================================================================
    // SECTION 5: Top 10 Matches with Detailed Breakdown
    // =========================================================================
    console.log('\n' + '─'.repeat(80));
    console.log('🏆 SECTION 5: Top 10 Matches with Score Breakdown');
    console.log('─'.repeat(80));

    const topMatches = matches.slice(0, 10);
    for (let i = 0; i < topMatches.length; i++) {
      const match = topMatches[i];
      console.log(`\n   #${i + 1}. [Score: ${match.score}] ${match.program.title.substring(0, 65)}...`);
      console.log(`       Category: ${match.program.category || 'N/A'} | TRL: ${match.program.minTrl}-${match.program.maxTrl || '?'}`);
      console.log(`       Score Breakdown:`);
      console.log(`         ├─ Industry: ${match.breakdown.industryScore}/30 ${getScoreIndicator(match.breakdown.industryScore, 30)}`);
      console.log(`         ├─ TRL:      ${match.breakdown.trlScore}/20 ${getScoreIndicator(match.breakdown.trlScore, 20)}`);
      console.log(`         ├─ Type:     ${match.breakdown.typeScore}/20 ${getScoreIndicator(match.breakdown.typeScore, 20)}`);
      console.log(`         ├─ R&D:      ${match.breakdown.rdScore}/15 ${getScoreIndicator(match.breakdown.rdScore, 15)}`);
      console.log(`         └─ Deadline: ${match.breakdown.deadlineScore}/15 ${getScoreIndicator(match.breakdown.deadlineScore, 15)}`);
      console.log(`       Eligibility: ${match.eligibilityLevel || 'N/A'}`);
      console.log(`       Reasons: ${match.reasons.slice(0, 3).join(', ')}`);
    }

    // =========================================================================
    // SECTION 6: BIO_HEALTH Specific Analysis
    // =========================================================================
    console.log('\n' + '─'.repeat(80));
    console.log('🧬 SECTION 6: BIO_HEALTH Sector Analysis');
    console.log('─'.repeat(80));

    // Find BIO_HEALTH specific programs
    const bioHealthPrograms = activePrograms.filter(p => {
      const sector = findIndustrySector(p.category || '');
      return sector === 'BIO_HEALTH';
    });

    console.log(`\n   BIO_HEALTH Programs in Pool: ${bioHealthPrograms.length}`);

    // Calculate potential matches for BIO_HEALTH specifically
    const bioHealthMatches = matches.filter(m => {
      const sector = findIndustrySector(m.program.category || '');
      return sector === 'BIO_HEALTH';
    });

    console.log(`   BIO_HEALTH Matches: ${bioHealthMatches.length}`);
    console.log(`   BIO_HEALTH Match Rate: ${bioHealthPrograms.length > 0 ? ((bioHealthMatches.length / bioHealthPrograms.length) * 100).toFixed(1) : 0}%`);

    // Analyze why some BIO_HEALTH programs didn't match
    if (bioHealthPrograms.length > bioHealthMatches.length) {
      console.log('\n   ⚠️ Unmatched BIO_HEALTH Programs Analysis:');
      const matchedIds = new Set(bioHealthMatches.map(m => m.programId));
      const unmatchedBioHealth = bioHealthPrograms.filter(p => !matchedIds.has(p.id));

      for (const prog of unmatchedBioHealth.slice(0, 5)) {
        // Manually calculate score to see why it didn't match
        const scoreResult = calculateMatchScore(organization, prog);
        console.log(`\n   • ${prog.title.substring(0, 50)}...`);
        console.log(`     Score: ${scoreResult.score} (threshold: 45)`);
        console.log(`     TRL: ${prog.minTrl}-${prog.maxTrl} (org: ${organization.technologyReadinessLevel}, target: ${organization.targetResearchTRL})`);
        console.log(`     Breakdown: Ind=${scoreResult.breakdown.industryScore}, TRL=${scoreResult.breakdown.trlScore}, Type=${scoreResult.breakdown.typeScore}`);
      }
    }

    // =========================================================================
    // SECTION 7: Cross-Industry Match Quality Check
    // =========================================================================
    console.log('\n' + '─'.repeat(80));
    console.log('🔀 SECTION 7: Cross-Industry Match Quality Check');
    console.log('─'.repeat(80));

    // Find matches from unrelated industries
    const crossIndustryMatches = matches.filter(m => {
      const sector = findIndustrySector(m.program.category || '');
      return sector && sector !== 'BIO_HEALTH' && sector !== 'AGRICULTURE';
    });

    console.log(`\n   Cross-Industry Matches: ${crossIndustryMatches.length}`);

    if (crossIndustryMatches.length > 0) {
      console.log('\n   Potential False Positives (requires manual review):');
      for (const match of crossIndustryMatches.slice(0, 5)) {
        const sector = findIndustrySector(match.program.category || '') || 'UNKNOWN';
        const relevance = INDUSTRY_RELEVANCE['BIO_HEALTH']?.[sector] ?? 0;
        const qualityIndicator = relevance >= 0.6 ? '✅ Valid' :
                                 relevance >= 0.4 ? '⚠️ Review' : '❌ Suspicious';
        console.log(`\n   • [${match.score}] ${match.program.title.substring(0, 50)}...`);
        console.log(`     Category: ${match.program.category} → Sector: ${sector}`);
        console.log(`     BIO_HEALTH↔${sector} Relevance: ${relevance.toFixed(1)} ${qualityIndicator}`);
        console.log(`     Industry Score: ${match.breakdown.industryScore}/30`);
      }
    }

    // =========================================================================
    // SECTION 8: Algorithm Quality Summary
    // =========================================================================
    console.log('\n' + '═'.repeat(80));
    console.log('📋 ALGORITHM QUALITY SUMMARY');
    console.log('═'.repeat(80));

    const bioHealthCount = bioHealthMatches.length;
    const relatedCount = matches.filter(m => {
      const sector = findIndustrySector(m.program.category || '');
      return sector === 'BIO_HEALTH' || sector === 'AGRICULTURE';
    }).length;
    const unrelatedCount = matches.length - relatedCount;

    console.log(`\n   📊 Match Distribution:`);
    console.log(`      Total Matches: ${matches.length}`);
    console.log(`      BIO_HEALTH Sector: ${bioHealthCount} (${((bioHealthCount / Math.max(matches.length, 1)) * 100).toFixed(1)}%)`);
    console.log(`      Related Sectors (BIO_HEALTH + AGRICULTURE): ${relatedCount} (${((relatedCount / Math.max(matches.length, 1)) * 100).toFixed(1)}%)`);
    console.log(`      Cross-Industry: ${unrelatedCount} (${((unrelatedCount / Math.max(matches.length, 1)) * 100).toFixed(1)}%)`);

    console.log(`\n   🎯 Quality Indicators:`);
    const industryAccuracy = relatedCount / Math.max(matches.length, 1);
    console.log(`      Industry Alignment Accuracy: ${(industryAccuracy * 100).toFixed(1)}% ${industryAccuracy >= 0.7 ? '✅' : industryAccuracy >= 0.5 ? '⚠️' : '❌'}`);

    const avgIndustryScore = matches.length > 0
      ? matches.reduce((sum, m) => sum + m.breakdown.industryScore, 0) / matches.length
      : 0;
    console.log(`      Average Industry Score: ${avgIndustryScore.toFixed(1)}/30 ${avgIndustryScore >= 20 ? '✅' : avgIndustryScore >= 15 ? '⚠️' : '❌'}`);

    const avgTrlScore = matches.length > 0
      ? matches.reduce((sum, m) => sum + m.breakdown.trlScore, 0) / matches.length
      : 0;
    console.log(`      Average TRL Score: ${avgTrlScore.toFixed(1)}/20 ${avgTrlScore >= 15 ? '✅' : avgTrlScore >= 10 ? '⚠️' : '❌'}`);

    // Output raw data for comparison
    console.log('\n' + '─'.repeat(80));
    console.log('📄 RAW DATA EXPORT (for comparison with ICT matches)');
    console.log('─'.repeat(80));
    console.log('\n   JSON Match Summary:');
    console.log(JSON.stringify({
      organization: {
        name: organization.name,
        sector: organization.industrySector,
        trl: organization.technologyReadinessLevel,
        targetTrl: organization.targetResearchTRL,
      },
      summary: {
        totalMatches: matches.length,
        avgScore: matches.length > 0 ? matches.reduce((s, m) => s + m.score, 0) / matches.length : 0,
        avgIndustryScore,
        avgTrlScore,
        bioHealthMatchCount: bioHealthCount,
        crossIndustryCount: unrelatedCount,
        industryAccuracy: industryAccuracy * 100,
      },
      topMatches: matches.slice(0, 5).map(m => ({
        score: m.score,
        title: m.program.title.substring(0, 60),
        category: m.program.category,
        breakdown: m.breakdown,
      })),
    }, null, 2));

  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
    console.error('   Stack:', error.stack);
  } finally {
    await db.$disconnect();
  }
}

function analyzeScoreDistribution(matches: MatchScore[]): ScoreDistribution[] {
  const ranges = [
    { range: '90-100', min: 90, max: 100 },
    { range: '80-89', min: 80, max: 89 },
    { range: '70-79', min: 70, max: 79 },
    { range: '60-69', min: 60, max: 69 },
    { range: '50-59', min: 50, max: 59 },
    { range: '45-49', min: 45, max: 49 },
  ];

  const total = matches.length;
  return ranges.map(r => {
    const count = matches.filter(m => m.score >= r.min && m.score <= r.max).length;
    return {
      range: r.range,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0,
    };
  });
}

function analyzeCategoryBreakdown(matches: MatchScore[]): CategoryBreakdown[] {
  const categoryMap = new Map<string, { scores: number[]; count: number }>();

  for (const match of matches) {
    const category = match.program.category || 'UNKNOWN';
    if (!categoryMap.has(category)) {
      categoryMap.set(category, { scores: [], count: 0 });
    }
    const data = categoryMap.get(category)!;
    data.scores.push(match.score);
    data.count++;
  }

  return Array.from(categoryMap.entries())
    .map(([category, data]) => ({
      category,
      count: data.count,
      avgScore: data.scores.reduce((a, b) => a + b, 0) / data.scores.length,
      topScore: Math.max(...data.scores),
    }))
    .sort((a, b) => b.count - a.count);
}

function getScoreIndicator(score: number, max: number): string {
  const ratio = score / max;
  if (ratio >= 0.8) return '✅';
  if (ratio >= 0.5) return '⚠️';
  return '❌';
}

simulateCTCBackMatching();
