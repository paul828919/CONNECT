import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeProductionMatches() {
  console.log('🔍 Analyzing Production Match Quality\n');
  console.log('=' .repeat(80));

  try {
    // Fetch all matches with related data
    const matches = await prisma.funding_matches.findMany({
      include: {
        organizations: {
          include: {
            users: {
              select: {
                email: true,
                name: true,
              },
            },
          },
        },
        funding_programs: true,
      },
      orderBy: {
        score: 'desc',
      },
    });

    console.log(`\n📊 Total Matches Found: ${matches.length}\n`);

    if (matches.length === 0) {
      console.log('⚠️  No matches found in production database.');
      return;
    }

    // Group matches by organization
    const matchesByOrg = new Map<string, typeof matches>();
    matches.forEach(match => {
      const orgId = match.organizationId;
      if (!matchesByOrg.has(orgId)) {
        matchesByOrg.set(orgId, []);
      }
      matchesByOrg.get(orgId)!.push(match);
    });

    console.log(`👥 Unique Organizations with Matches: ${matchesByOrg.size}\n`);
    console.log('=' .repeat(80));

    // Calculate quality statistics
    let highQualityCount = 0;
    let mediumQualityCount = 0;
    let lowQualityCount = 0;

    matches.forEach(match => {
      if (match.score >= 70) highQualityCount++;
      else if (match.score >= 50) mediumQualityCount++;
      else lowQualityCount++;
    });

    // Generate summary statistics
    console.log('\n📈 MATCH QUALITY SUMMARY');
    console.log('=' .repeat(80));
    console.log(`High Quality (70+ points):     ${highQualityCount} (${((highQualityCount/matches.length)*100).toFixed(1)}%)`);
    console.log(`Medium Quality (50-69 points):  ${mediumQualityCount} (${((mediumQualityCount/matches.length)*100).toFixed(1)}%)`);
    console.log(`Low Quality (<50 points):       ${lowQualityCount} (${((lowQualityCount/matches.length)*100).toFixed(1)}%)`);

    const avgScore = matches.reduce((sum, m) => sum + m.score, 0) / matches.length;
    console.log(`\nAverage Match Score: ${avgScore.toFixed(1)} points`);

    // Show detailed analysis for each organization
    console.log('\n\n🏢 DETAILED MATCH ANALYSIS BY ORGANIZATION');
    console.log('=' .repeat(80));

    let orgIndex = 1;
    for (const [orgId, orgMatches] of matchesByOrg) {
      const org = orgMatches[0].organizations;

      console.log(`\n\n${orgIndex}. Organization: ${org.name}`);
      const primaryUser = org.users?.[0];
      console.log(`   Contact: ${primaryUser?.name || 'N/A'} (${primaryUser?.email || 'N/A'})`);
      console.log(`   Type: ${org.type}`);
      console.log(`   Industry: ${org.industrySector || 'Not specified'}`);
      console.log(`   TRL: ${org.technologyReadinessLevel || 'Not specified'}`);
      console.log(`   R&D Experience: ${org.rdExperience ? 'Yes' : 'No'}`);
      console.log(`   Employee Count: ${org.employeeCount || 'Not specified'}`);
      console.log(`   Revenue Range: ${org.revenueRange || 'Not specified'}`);
      console.log(`   Research Focus Areas: ${org.researchFocusAreas.length > 0 ? org.researchFocusAreas.join(', ') : 'None'}`);
      console.log(`   Total Matches: ${orgMatches.length}`);

      // Profile completeness
      const completeness = calculateProfileCompleteness(org);
      console.log(`   Profile Completeness: ${completeness.toFixed(1)}% ${getCompletenessEmoji(completeness)}`);

      // Show top 5 matches for this organization
      console.log('\n   Top Matches:');
      const topMatches = orgMatches.slice(0, 5);

      topMatches.forEach((match, idx) => {
        const explanation = match.explanation as any;

        console.log(`\n   ${idx + 1}. ${match.funding_programs.title}`);
        console.log(`      Agency: ${match.funding_programs.agencyId}`);
        console.log(`      Score: ${match.score} points ${getScoreEmoji(match.score)}`);
        console.log(`      Viewed: ${match.viewed ? '✓' : '✗'} | Saved: ${match.saved ? '✓' : '✗'}`);

        if (match.funding_programs.deadline) {
          const daysUntil = Math.ceil((match.funding_programs.deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          console.log(`      Deadline: ${match.funding_programs.deadline.toLocaleDateString()} (${daysUntil} days)`);
        }

        // Show explanation breakdown if available
        if (explanation) {
          console.log(`      Match Explanation:`);

          if (explanation.breakdown) {
            console.log(`        Breakdown:`);
            Object.entries(explanation.breakdown).forEach(([key, value]) => {
              console.log(`          • ${formatBreakdownKey(key)}: ${value} points`);
            });
          }

          if (explanation.strengths && Array.isArray(explanation.strengths)) {
            console.log(`        ✅ Strengths:`);
            explanation.strengths.forEach((strength: string) => {
              console.log(`           - ${strength}`);
            });
          }

          if (explanation.weaknesses && Array.isArray(explanation.weaknesses)) {
            console.log(`        ⚠️  Weaknesses:`);
            explanation.weaknesses.forEach((weakness: string) => {
              console.log(`           - ${weakness}`);
            });
          }

          if (explanation.summary) {
            console.log(`        💡 Summary: ${explanation.summary}`);
          }
        }

        // Analyze potential issues
        const issues = analyzeMatchIssues(match, org);
        if (issues.length > 0) {
          console.log(`      🔍 Potential Issues:`);
          issues.forEach(issue => {
            console.log(`         - ${issue}`);
          });
        }
      });

      if (orgMatches.length > 5) {
        console.log(`\n   ... and ${orgMatches.length - 5} more matches`);
      }

      orgIndex++;
    }

    // Profile completeness analysis
    console.log('\n\n📋 ORGANIZATION PROFILE ANALYSIS');
    console.log('=' .repeat(80));

    const profileMetrics = Array.from(matchesByOrg.values()).map(orgMatches => {
      const org = orgMatches[0].organizations;
      return {
        name: org.name,
        type: org.type,
        completeness: calculateProfileCompleteness(org),
        missingFields: getMissingFields(org),
        matchCount: orgMatches.length,
        avgScore: orgMatches.reduce((sum, m) => sum + m.score, 0) / orgMatches.length,
      };
    });

    const avgCompleteness = profileMetrics.reduce((sum, m) => sum + m.completeness, 0) / profileMetrics.length;
    console.log(`\nAverage Profile Completeness: ${avgCompleteness.toFixed(1)}%`);

    // Sort by completeness
    profileMetrics.sort((a, b) => a.completeness - b.completeness);

    const incompleteProfiles = profileMetrics.filter(p => p.completeness < 70);
    if (incompleteProfiles.length > 0) {
      console.log(`\n⚠️  ${incompleteProfiles.length} organizations have incomplete profiles (<70%):\n`);
      incompleteProfiles.forEach(profile => {
        console.log(`  ${profile.name}`);
        console.log(`    Completeness: ${profile.completeness.toFixed(1)}%`);
        console.log(`    Missing: ${profile.missingFields.join(', ')}`);
        console.log(`    Matches: ${profile.matchCount} (avg score: ${profile.avgScore.toFixed(1)})`);
        console.log('');
      });

      console.log(`  💡 Recommendation: Complete profiles tend to get better quality matches.`);
      console.log(`     Consider encouraging these organizations to complete their profiles.`);
    }

    // Match engagement analysis
    console.log('\n\n👁️  MATCH ENGAGEMENT ANALYSIS');
    console.log('=' .repeat(80));

    const viewedCount = matches.filter(m => m.viewed).length;
    const savedCount = matches.filter(m => m.saved).length;
    const notifiedCount = matches.filter(m => m.notificationSent).length;

    console.log(`Viewed Matches: ${viewedCount} (${((viewedCount/matches.length)*100).toFixed(1)}%)`);
    console.log(`Saved Matches: ${savedCount} (${((savedCount/matches.length)*100).toFixed(1)}%)`);
    console.log(`Notifications Sent: ${notifiedCount} (${((notifiedCount/matches.length)*100).toFixed(1)}%)`);

    // Check if high-quality matches are being viewed
    const highQualityMatches = matches.filter(m => m.score >= 70);
    const highQualityViewed = highQualityMatches.filter(m => m.viewed).length;
    console.log(`\nHigh-quality matches viewed: ${highQualityViewed}/${highQualityMatches.length} (${highQualityMatches.length > 0 ? ((highQualityViewed/highQualityMatches.length)*100).toFixed(1) : 0}%)`);

    console.log('\n\n✅ Analysis Complete');
    console.log('=' .repeat(80));

  } catch (error) {
    console.error('❌ Error analyzing matches:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

function analyzeMatchIssues(match: any, org: any): string[] {
  const issues: string[] = [];
  const program = match.funding_programs;

  // Check TRL compatibility
  if (org.technologyReadinessLevel && program.minTrl) {
    if (org.technologyReadinessLevel < program.minTrl) {
      issues.push(`Organization TRL (${org.technologyReadinessLevel}) below program minimum (${program.minTrl})`);
    }
  }

  if (org.technologyReadinessLevel && program.maxTrl) {
    if (org.technologyReadinessLevel > program.maxTrl) {
      issues.push(`Organization TRL (${org.technologyReadinessLevel}) above program maximum (${program.maxTrl})`);
    }
  }

  // Check organization type compatibility
  if (program.targetType && program.targetType.length > 0) {
    if (!program.targetType.includes(org.type)) {
      issues.push(`Organization type (${org.type}) not in program's target types`);
    }
  }

  // Check if score is suspiciously low
  if (match.score < 40) {
    issues.push('Very low match score - review matching criteria');
  }

  // Check profile completeness
  const completeness = calculateProfileCompleteness(org);
  if (completeness < 60) {
    issues.push('Incomplete organization profile may affect match quality');
  }

  return issues;
}

function getScoreEmoji(score: number): string {
  if (score >= 80) return '🌟';
  if (score >= 70) return '✨';
  if (score >= 60) return '👍';
  if (score >= 50) return '👌';
  return '⚠️';
}

function getCompletenessEmoji(completeness: number): string {
  if (completeness >= 90) return '🌟';
  if (completeness >= 70) return '👍';
  if (completeness >= 50) return '⚠️';
  return '❌';
}

function formatBreakdownKey(key: string): string {
  const formatted = key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
  return formatted;
}

function calculateProfileCompleteness(org: any): number {
  const fields = [
    'name',
    'businessNumberEncrypted',
    'businessStructure',
    'description',
    'industrySector',
    'employeeCount',
    'revenueRange',
    'rdExperience',
    'technologyReadinessLevel',
    'researchFocusAreas',
  ];

  const filledFields = fields.filter(field => {
    const value = org[field];
    if (Array.isArray(value)) return value.length > 0;
    return value !== null && value !== undefined && value !== '';
  });

  return (filledFields.length / fields.length) * 100;
}

function getMissingFields(org: any): string[] {
  const fields = [
    { key: 'description', label: 'Description' },
    { key: 'industrySector', label: 'Industry' },
    { key: 'employeeCount', label: 'Employee Count' },
    { key: 'revenueRange', label: 'Revenue Range' },
    { key: 'technologyReadinessLevel', label: 'TRL' },
    { key: 'researchFocusAreas', label: 'Research Focus' },
  ];

  return fields
    .filter(field => {
      const value = org[field.key];
      if (Array.isArray(value)) return value.length === 0;
      return value === null || value === undefined || value === '';
    })
    .map(field => field.label);
}

analyzeProductionMatches()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
