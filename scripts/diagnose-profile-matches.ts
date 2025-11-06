/**
 * Diagnostic Script: Profile Update & Match Sync Investigation
 *
 * Purpose: Identify why matching results remain identical after profile updates
 *
 * This script queries the database to answer critical questions:
 * 1. Did the profile update actually save to the database?
 * 2. Are matches stale (created before the profile update)?
 * 3. How many matches exist for this organization?
 * 4. What are the match scores and which programs are matched?
 *
 * Expected profile from screenshot (user: "이노베이브"):
 * - Industry: ICT (정보통신)
 * - Employee Count: <10명
 * - R&D Experience: Yes
 * - TRL: 4 (실험실 환경 검증)
 * - Profile Completion: 100%
 */

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  console.log('🔍 Profile Update & Match Sync Diagnostic\n');
  console.log('='.repeat(80));

  // Query organization "이노웨이브" (user confirmed in screenshot)
  const organization = await db.organizations.findFirst({
    where: {
      name: {
        contains: '이노웨이',
      },
    },
    select: {
      id: true,
      name: true,
      type: true,
      industrySector: true,
      employeeCount: true,
      rdExperience: true,
      technologyReadinessLevel: true,
      description: true,
      profileCompleted: true,
      profileScore: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!organization) {
    console.error('❌ Organization "이노웨이브" not found in database');
    console.log('\n📋 Available organizations:');
    const allOrgs = await db.organizations.findMany({
      select: { id: true, name: true },
    });
    allOrgs.forEach((org) => {
      console.log(`   - ${org.name} (${org.id})`);
    });
    process.exit(1);
  }

  console.log('\n📋 Part 1: Organization Profile State');
  console.log('-'.repeat(80));
  console.log('Organization ID:', organization.id);
  console.log('Name:', organization.name);
  console.log('Type:', organization.type);
  console.log('Industry Sector:', organization.industrySector);
  console.log('Employee Count:', organization.employeeCount);
  console.log('R&D Experience:', organization.rdExperience);
  console.log('Technology Readiness Level (TRL):', organization.technologyReadinessLevel);
  console.log('Description:', organization.description || '(empty)');
  console.log('Profile Completed:', organization.profileCompleted);
  console.log('Profile Score:', organization.profileScore);
  console.log('Status:', organization.status);
  console.log('\n⏰ Timestamps:');
  console.log('   Created At:', organization.createdAt.toISOString());
  console.log('   Updated At:', organization.updatedAt.toISOString());
  console.log('   Time Since Last Update:', formatTimeDifference(organization.updatedAt));

  // Compare with expected values from screenshot
  console.log('\n🔎 Comparison with Screenshot Values:');
  console.log('-'.repeat(80));

  const expectedValues = {
    industrySector: 'ICT',
    employeeCount: '10명 미만',
    rdExperience: true,
    technologyReadinessLevel: 4,
  };

  let matchCount = 0;
  let mismatchDetails: string[] = [];

  if (organization.industrySector === expectedValues.industrySector) {
    console.log('   ✅ Industry Sector: MATCHES (ICT)');
    matchCount++;
  } else {
    console.log(`   ❌ Industry Sector: MISMATCH (Expected: ${expectedValues.industrySector}, Actual: ${organization.industrySector})`);
    mismatchDetails.push(`Industry: Expected "${expectedValues.industrySector}", got "${organization.industrySector}"`);
  }

  if (organization.employeeCount === expectedValues.employeeCount) {
    console.log('   ✅ Employee Count: MATCHES (10명 미만)');
    matchCount++;
  } else {
    console.log(`   ❌ Employee Count: MISMATCH (Expected: ${expectedValues.employeeCount}, Actual: ${organization.employeeCount})`);
    mismatchDetails.push(`Employees: Expected "${expectedValues.employeeCount}", got "${organization.employeeCount}"`);
  }

  if (organization.rdExperience === expectedValues.rdExperience) {
    console.log('   ✅ R&D Experience: MATCHES (true)');
    matchCount++;
  } else {
    console.log(`   ❌ R&D Experience: MISMATCH (Expected: ${expectedValues.rdExperience}, Actual: ${organization.rdExperience})`);
    mismatchDetails.push(`R&D: Expected ${expectedValues.rdExperience}, got ${organization.rdExperience}`);
  }

  if (organization.technologyReadinessLevel === expectedValues.technologyReadinessLevel) {
    console.log('   ✅ TRL: MATCHES (4 - 실험실 환경 검증)');
    matchCount++;
  } else {
    console.log(`   ❌ TRL: MISMATCH (Expected: ${expectedValues.technologyReadinessLevel}, Actual: ${organization.technologyReadinessLevel})`);
    mismatchDetails.push(`TRL: Expected ${expectedValues.technologyReadinessLevel}, got ${organization.technologyReadinessLevel}`);
  }

  console.log(`\n📊 Match Score: ${matchCount}/4 fields match screenshot`);

  if (matchCount === 4) {
    console.log('✅ Profile in database MATCHES screenshot - profile update saved successfully');
  } else {
    console.log('❌ Profile in database DOES NOT MATCH screenshot - possible issues:');
    console.log('   1. Profile form submission did not save to database');
    console.log('   2. You are looking at a different organization');
    console.log('   3. Profile was updated again after screenshot was taken');
    console.log('\n   Mismatches:');
    mismatchDetails.forEach((detail) => console.log(`      - ${detail}`));
  }

  // Query all matches for this organization
  console.log('\n\n📋 Part 2: Funding Matches State');
  console.log('-'.repeat(80));

  const matches = await db.funding_matches.findMany({
    where: {
      organizationId: organization.id,
    },
    include: {
      funding_programs: {
        select: {
          id: true,
          title: true,
          status: true,
          deadline: true,
          agencyId: true,
          category: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  console.log(`Total Matches: ${matches.length}`);

  if (matches.length === 0) {
    console.log('\n⚠️  NO MATCHES FOUND');
    console.log('   Possible reasons:');
    console.log('   1. ✅ Our fix worked - matches were deleted after profile update');
    console.log('   2. ❌ No matches have been generated yet');
    console.log('   3. ❌ User has not clicked "매칭 생성" button');
    console.log('\n💡 Next step: Generate matches via UI or API to verify algorithm works with current profile');
  } else {
    console.log('\n📦 Match Details:\n');

    matches.forEach((match, index) => {
      console.log(`Match #${index + 1}:`);
      console.log(`   ID: ${match.id}`);
      console.log(`   Program: ${match.funding_programs.title}`);
      console.log(`   Program Status: ${match.funding_programs.status}`);
      console.log(`   Score: ${match.score}`);
      console.log(`   Viewed: ${match.viewed}`);
      console.log(`   Saved: ${match.saved}`);
      console.log(`   Created At: ${match.createdAt.toISOString()}`);
      console.log(`   Time Since Created: ${formatTimeDifference(match.createdAt)}`);
      console.log('');
    });

    // Critical timestamp analysis
    console.log('🔍 Timestamp Analysis (Staleness Detection):');
    console.log('-'.repeat(80));

    const profileUpdatedAt = organization.updatedAt;
    const staleMatches = matches.filter((m) => m.createdAt < profileUpdatedAt);
    const freshMatches = matches.filter((m) => m.createdAt >= profileUpdatedAt);

    console.log(`Profile Last Updated: ${profileUpdatedAt.toISOString()}`);
    console.log('');

    if (staleMatches.length > 0) {
      console.log(`❌ STALE MATCHES FOUND: ${staleMatches.length} matches`);
      console.log('   These matches were created BEFORE the profile update!');
      console.log('   This means our fix DID NOT EXECUTE or FAILED SILENTLY.');
      console.log('');
      console.log('   Stale Match IDs (should have been deleted):');
      staleMatches.forEach((m) => {
        const staleness = profileUpdatedAt.getTime() - m.createdAt.getTime();
        console.log(`      - ${m.id.slice(0, 8)}... (created ${Math.floor(staleness / 60000)} minutes before profile update)`);
      });
      console.log('');
      console.log('   🔧 Root cause: PATCH handler did not delete matches');
      console.log('      Possible reasons:');
      console.log('      1. Dev server not reloaded after code changes');
      console.log('      2. PATCH handler code has syntax error');
      console.log('      3. deleteMany() failed silently');
      console.log('      4. Profile update did not trigger PATCH handler');
    }

    if (freshMatches.length > 0) {
      console.log(`✅ FRESH MATCHES: ${freshMatches.length} matches`);
      console.log('   These matches were created AFTER the profile update.');
      console.log('');
      freshMatches.forEach((m) => {
        const freshness = m.createdAt.getTime() - profileUpdatedAt.getTime();
        console.log(`      - ${m.id.slice(0, 8)}... (created ${Math.floor(freshness / 1000)} seconds after profile update)`);
      });
    }

    if (staleMatches.length === 0 && freshMatches.length > 0) {
      console.log('');
      console.log('✅ All matches are fresh (created after profile update)');
      console.log('   Our fix appears to be working correctly!');
      console.log('');
      console.log('   🤔 But if matches appear "identical" to user:');
      console.log('      - Algorithm may be producing same results despite profile changes');
      console.log('      - User may not see visible difference in match titles/programs');
      console.log('      - Need to compare match SCORES before/after to confirm algorithm sensitivity');
    }
  }

  // Summary
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 Diagnostic Summary');
  console.log('='.repeat(80));
  console.log(`Organization: ${organization.name} (${organization.id})`);
  console.log(`Profile Updated: ${organization.updatedAt.toISOString()} (${formatTimeDifference(organization.updatedAt)} ago)`);
  console.log(`Profile Matches Screenshot: ${matchCount}/4 fields ✅`);
  console.log(`Total Matches: ${matches.length}`);

  if (matches.length > 0) {
    const staleCount = matches.filter((m) => m.createdAt < organization.updatedAt).length;
    const freshCount = matches.filter((m) => m.createdAt >= organization.updatedAt).length;
    console.log(`   - Stale (pre-update): ${staleCount} ${staleCount > 0 ? '❌' : '✅'}`);
    console.log(`   - Fresh (post-update): ${freshCount} ${freshCount > 0 ? '✅' : '⚠️'}`);
  }

  console.log('\n🎯 Recommended Next Steps:');
  if (matchCount < 4) {
    console.log('   1. ⚠️  Profile in database does not match screenshot - verify form submission');
    console.log('   2. Check browser network tab for PATCH /api/organizations/[id] response');
    console.log('   3. Verify you are logged in as the correct user');
  } else if (matches.length === 0) {
    console.log('   1. ✅ Profile is up-to-date in database');
    console.log('   2. Generate new matches via UI to test algorithm');
    console.log('   3. If matches still appear identical, investigate algorithm sensitivity');
  } else {
    const staleCount = matches.filter((m) => m.createdAt < organization.updatedAt).length;
    if (staleCount > 0) {
      console.log('   1. ❌ CRITICAL: Stale matches found - our fix did not execute');
      console.log('   2. Restart dev server: npm run dev');
      console.log('   3. Check terminal for TypeScript compilation errors');
      console.log('   4. Add console.log to PATCH handler to verify execution');
      console.log('   5. Re-run this diagnostic after restarting');
    } else {
      console.log('   1. ✅ All matches are fresh - our fix is working');
      console.log('   2. If matches appear "identical", investigate algorithm sensitivity');
      console.log('   3. Compare match scores before/after profile update');
      console.log('   4. Consider if profile change should affect matching results');
    }
  }

  console.log('\n' + '='.repeat(80));
}

/**
 * Format time difference in human-readable format
 */
function formatTimeDifference(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else if (diffMinutes > 0) {
    return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
  } else {
    return 'just now';
  }
}

main()
  .catch((e) => {
    console.error('❌ Diagnostic failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
